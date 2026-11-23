/* Per-PIN encrypted local vaults. Only ciphertext is persisted; plaintext lives in memory while unlocked. */
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
  function validatePin(pin) {
    if (!/^\d{6,12}$/.test(pin)) throw new Error('Use a PIN containing 6–12 digits (8 or more recommended).');
  }
  async function unlock(pin) {
    requireCrypto(); validatePin(pin);
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
    throw new Error('PIN not found for an event collection on this browser.');
  }
  async function create(pin, data) {
    requireCrypto(); validatePin(pin);
    const store = list();
    // Do not create two indistinguishable collections for the same PIN.
    if (store.vaults.length) {
      try { await unlock(pin); throw new Error('That PIN already has a collection. Unlock it instead.'); }
      catch (err) { if (!String(err.message).startsWith('PIN not found')) throw err; }
    }
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
  root.SantaVault = {list, legacy, unlock, create, save};
})(window);
