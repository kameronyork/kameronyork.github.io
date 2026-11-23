/* Per-passphrase encrypted local vaults. Only ciphertext is persisted; plaintext lives in memory while unlocked. */
(function (root) {
  'use strict';
  const STORAGE = 'secret-santa.vaults.v2';
  const LEGACY = 'secret-santa.v1';
  const ROUNDS = 600000;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  function requireCrypto() {
    if (!globalThis.crypto || !crypto.subtle || !globalThis.isSecureContext) {
      throw new Error('Encryption needs a secure HTTPS or localhost connection and a modern browser.');
    }
  }
  function bytes(count) { return crypto.getRandomValues(new Uint8Array(count)); }
  function toBase64(buffer) {
    const a = new Uint8Array(buffer);
    let result = '';
    for (let i = 0; i < a.length; i += 8192) result += String.fromCharCode(...a.slice(i, i + 8192));
    return btoa(result);
  }
  function fromBase64(value) {
    const raw = atob(value);
    const a = new Uint8Array(raw.length);
    for (let i = 0; i < a.length; i++) a[i] = raw.charCodeAt(i);
    return a;
  }
  function list() {
    const saved = localStorage.getItem(STORAGE);
    if (!saved) return {version: 2, vaults: []};
    const item = JSON.parse(saved);
    if (!item || item.version !== 2 || !Array.isArray(item.vaults)) throw new Error('Encrypted vault storage is damaged. Do not clear browser data; recover it from a backup.');
    return item;
  }
  function legacy() {
    try {
      const raw = localStorage.getItem(LEGACY);
      const data = raw && JSON.parse(raw);
      return data && Array.isArray(data.events) ? data : null;
    } catch { return null; }
  }
  async function derive(pin, salt, iterations) {
    const material = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({name: 'PBKDF2', salt: fromBase64(salt), iterations, hash: 'SHA-256'}, material, {name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
  }
  async function decrypt(record, key) {
    const plain = await crypto.subtle.decrypt({name: 'AES-GCM', iv: fromBase64(record.iv)}, key, fromBase64(record.data));
    const data = JSON.parse(decoder.decode(plain));
    if (!data || !Array.isArray(data.events)) throw new Error('Invalid vault contents.');
    return data;
  }
  async function encrypt(data, key) {
    const iv = bytes(12);
    const ciphertext = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, key, encoder.encode(JSON.stringify(data)));
    return {iv: toBase64(iv), data: toBase64(ciphertext)};
  }
  function validatePassphrase(passphrase, creating = false) {
    const legacyPin = !creating && typeof passphrase === 'string' && /^[0-9]{6,12}$/.test(passphrase);
    if (!legacyPin && (typeof passphrase !== 'string' || !/^[\x21-\x7e]{8,128}$/.test(passphrase))) {
      throw new Error(creating
        ? 'Use 8–128 characters, including letters, numbers or symbols (no spaces).'
        : 'Enter an 8–128 character passphrase or your existing 6–12 digit PIN.');
    }
  }
  async function alreadyUsed(passphrase, exceptId) {
    for (const record of list().vaults) {
      if (record.id === exceptId) continue;
      try {
        const key = await derive(passphrase, record.salt, record.iterations || ROUNDS);
        await decrypt(record, key);
        return true;
      } catch (error) {
        if (!(error instanceof DOMException) || error.name !== 'OperationError') throw error;
      }
    }
    return false;
  }
  async function unlock(pin) {
    requireCrypto(); validatePassphrase(pin);
    for (const record of list().vaults) {
      try {
        const key = await derive(pin, record.salt, record.iterations || ROUNDS);
        const data = await decrypt(record, key);
        return {session: {id: record.id, key}, data};
      } catch (error) {
        if (!(error instanceof DOMException) || error.name !== 'OperationError') {
          // A corrupt vault should not silently masquerade as a wrong PIN.
          throw error;
        }
      }
    }
    throw new Error('No event collection matched that passphrase on this browser.');
  }
  async function create(pin, data) {
    requireCrypto(); validatePassphrase(pin, true);
    const store = list();
    // Do not create two indistinguishable collections for the same PIN.
    if (await alreadyUsed(pin)) throw new Error('That passphrase already opens a collection. Unlock it instead.');
    const salt = toBase64(bytes(16)), key = await derive(pin, salt, ROUNDS);
    const encrypted = await encrypt(data, key);
    const record = {id: crypto.randomUUID(), salt, iterations: ROUNDS, ...encrypted};
    store.vaults.push(record);
    localStorage.setItem(STORAGE, JSON.stringify(store));
    // Verify newly written ciphertext before deleting previously unencrypted data.
    await decrypt(record, key);
    if (legacy()) localStorage.removeItem(LEGACY);
    return {session: {id: record.id, key}, data};
  }
  async function save(session, data) {
    requireCrypto();
    const store = list();
    const index = store.vaults.findIndex(x => x.id === session.id);
    if (index === -1) throw new Error('Your encrypted event collection was removed from browser storage.');
    const blob = await encrypt(data, session.key);
    store.vaults[index] = {...store.vaults[index], ...blob};
    localStorage.setItem(STORAGE, JSON.stringify(store));
  }

  async function changePassphrase(session, oldPassphrase, newPassphrase) {
    requireCrypto(); validatePassphrase(oldPassphrase); validatePassphrase(newPassphrase, true);
    const store = list();
    const index = store.vaults.findIndex(x => x.id === session.id);
    if (index < 0) throw new Error('This event collection no longer exists on this browser.');
    const record = store.vaults[index];
    const oldKey = await derive(oldPassphrase, record.salt, record.iterations || ROUNDS);
    let data;
    try { data = await decrypt(record, oldKey); }
    catch (err) {
      if (err instanceof DOMException && err.name === 'OperationError') throw new Error('Current passphrase is incorrect.');
      throw err;
    }
    if (await alreadyUsed(newPassphrase, session.id)) throw new Error('That passphrase already belongs to another collection.');
    const salt = toBase64(bytes(16));
    const key = await derive(newPassphrase, salt, ROUNDS);
    const blob = await encrypt(data, key);
    const next = {...record, salt, iterations: ROUNDS, ...blob};
    await decrypt(next, key);
    store.vaults[index] = next;
    localStorage.setItem(STORAGE, JSON.stringify(store));
    return {session: {id: record.id, key}, data};
  }
  function recordFor(session) {
    return list().vaults.find(x => x.id === session.id) || null;
  }
  function encryptedBackup(session) {
    const record = recordFor(session);
    if (!record) throw new Error('This collection was not found.');
    return JSON.stringify({format: 'secret-santa-encrypted-backup-v1', vault: record}, null, 2);
  }
  function importRemote(records, replaceIds = []) {
    requireCrypto();
    if (!Array.isArray(records) || records.length > 1000) throw new Error('Invalid remote event collections.');
    const store = list(), added = [], updated = [], skipped = [];
    for (const record of records) {
      if (!record || typeof record.id !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(record.id) ||
          typeof record.salt !== 'string' || typeof record.iv !== 'string' || typeof record.data !== 'string' ||
          !Number.isInteger(record.iterations) || record.iterations < 100000 || record.iterations > 1500000 ||
          record.data.length > 2500000 || record.iv.length > 128 || record.salt.length > 128) {
        throw new Error('Remote data contains an invalid encrypted collection.');
      }
      const existingIndex = store.vaults.findIndex(x => x.id === record.id);
      if (existingIndex !== -1) {
        if (!replaceIds.includes(record.id)) { skipped.push(record.id); continue; }
        store.vaults[existingIndex] = record;
        updated.push(record.id);
        continue;
      }
      added.push(record.id);
      store.vaults.push(record);
    }
    if (added.length || updated.length) localStorage.setItem(STORAGE, JSON.stringify(store));
    return {added, updated, skipped};
  }
  root.SantaVault = {list, legacy, unlock, create, save, changePassphrase, recordFor, encryptedBackup, importRemote};
})(window);
