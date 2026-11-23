/* Public encrypted JSON in GitHub; write access only through a user-supplied token. */
(function (root) {
  'use strict';
  const URL = 'https://api.github.com/repos/kameronyork/kameronyork.github.io/contents/projects/secret-santa/events.encrypted.json';
  const META = 'secret-santa.sync-status.v1';
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  function base64(bytes) {
    let out = '';
    for (let i=0; i<bytes.length; i+=8192) out += String.fromCharCode(...bytes.slice(i,i+8192));
    return btoa(out);
  }
  function unbase64(b64) {
    const raw = atob(b64.replace(/\s+/g,''));
    const out = new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);
    return out;
  }
  function validateStore(data) {
    if (!data || data.version !== 2 || !Array.isArray(data.vaults) || data.vaults.length>1000) {
      throw new Error('The GitHub JSON is not a valid encrypted Secret Santa data file.');
    }
    return data;
  }
  function metadata() {
    try {
      const data = JSON.parse(localStorage.getItem(META) || '{}');
      return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    } catch { return {}; }
  }
  function lastSynced(id) { return metadata()[id] || null; }
  function setLastSynced(id, fingerprint) {
    const meta = metadata(); meta[id] = fingerprint;
    localStorage.setItem(META, JSON.stringify(meta));
  }
  async function fingerprint(record) {
    if (!record) return '';
    const raw = encoder.encode(record.id+':'+record.salt+':'+record.iterations+':'+record.iv+':'+record.data);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', raw));
    return Array.from(digest, b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function get(token) {
    const headers = {'Accept':'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28'};
    if(token)headers.Authorization='Bearer '+token;
    const response = await fetch(URL+'?ref=main',{headers,cache:'no-store'});
    if(response.status === 404) {
      if(token) throw new Error('Repository data file not found or token cannot access it.');
      return {store:{version:2,vaults:[]},sha:null};
    }
    if(!response.ok)throw new Error('GitHub read failed (HTTP '+response.status+').');
    const obj = await response.json();
    if(typeof obj.sha!=='string'||typeof obj.content!=='string')throw new Error('GitHub did not return the expected JSON file.');
    let store;
    try{store=validateStore(JSON.parse(decoder.decode(unbase64(obj.content))));}
    catch(err){throw new Error('Could not read GitHub encrypted JSON: '+err.message);}
    return {store,sha:obj.sha};
  }
  async function push(record, token, expectedFingerprint) {
    if(!/^([a-zA-Z0-9_-]{12,})$/.test(token||'')) throw new Error('Enter a valid GitHub fine-grained access token.');
    const {store,sha} = await get(token);
    const index = store.vaults.findIndex(x=>x.id===record.id);
    const localFingerprint = await fingerprint(record);
    if(index !== -1) {
      const remoteFingerprint = await fingerprint(store.vaults[index]);
      if(remoteFingerprint === localFingerprint)return {fingerprint:localFingerprint,unchanged:true};
      if(!expectedFingerprint || expectedFingerprint !== remoteFingerprint) {
        throw new Error('This collection was changed on GitHub since your last download/sync. No data was overwritten. Load GitHub data in another browser or resolve the conflict before syncing.');
      }
      store.vaults[index]=record;
    } else {
      store.vaults.push(record);
    }
    const body = {message:'Sync encrypted Secret Santa event histories',content:base64(encoder.encode(JSON.stringify(store,null,2))),branch:'main'};
    if(sha)body.sha=sha;
    const response=await fetch(URL,{method:'PUT',headers:{'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify(body),cache:'no-store'});
    if(response.status===409||response.status===422)throw new Error('GitHub rejected a concurrent update. Retry after reloading the latest encrypted file.');
    if(!response.ok)throw new Error('GitHub could not save the file (HTTP '+response.status+'). Verify the token has Contents: Read and write access to this repository.');
    return {fingerprint:localFingerprint,unchanged:false};
  }
  root.SantaCloud = {get,push,fingerprint,lastSynced,setLastSynced};
})(window);
