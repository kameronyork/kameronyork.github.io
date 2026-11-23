/* Public reads; owner-only sync through a separately deployed GitHub OAuth Worker. */
(function (root) {
  'use strict';
  const GITHUB_JSON = 'https://api.github.com/repos/kameronyork/kameronyork.github.io/contents/projects/secret-santa/events.encrypted.json';
  const META = 'secret-santa.sync-status.v1';
  const PENDING = 'secret-santa.pending-owner-oauth-sync';
  const encoder=new TextEncoder(),decoder=new TextDecoder();
  let ownerSession=null;
  function apiBase(){
    const raw=String(root.SantaSyncConfig?.endpoint||'').trim().replace(/\/+$/,'');
    if(!raw)return '';
    try {const url=new URL(raw);return url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash&&url.pathname==='/'?url.origin:'';}
    catch{return '';}
  }
  function configured(){return !!apiBase();}
  function base64Decode(value){
    const decoded=atob(value.replace(/\s/g,''));
    const bytes=new Uint8Array(decoded.length);
    for(let i=0;i<decoded.length;i++)bytes[i]=decoded.charCodeAt(i);
    return bytes;
  }
  function metadata(){
    try {const data=JSON.parse(localStorage.getItem(META)||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}
    catch{return {};}
  }
  function lastSynced(id){return metadata()[id]||null;}
  function setLastSynced(id,signature){const all=metadata();all[id]=signature;localStorage.setItem(META,JSON.stringify(all));}
  async function fingerprint(record){
    if(!record)return '';
    const bytes=encoder.encode(record.id+':'+record.salt+':'+record.iterations+':'+record.iv+':'+record.data);
    const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
    return Array.from(hash,x=>x.toString(16).padStart(2,'0')).join('');
  }
  function validateStore(value){
    if(!value||value.version!==2||!Array.isArray(value.vaults)||value.vaults.length>1000)
      throw new Error('GitHub did not return a valid encrypted Secret Santa JSON file.');
    return value;
  }
  async function get(){
    const response=await fetch(GITHUB_JSON+'?ref=main',{headers:{Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},cache:'no-store'});
    if(response.status===404)return {store:{version:2,vaults:[]},sha:null};
    if(!response.ok)throw new Error('GitHub backup could not be downloaded (HTTP '+response.status+').');
    const object=await response.json();
    if(typeof object.content!=='string'||typeof object.sha!=='string')throw new Error('Unexpected GitHub backup format.');
    try {return {store:validateStore(JSON.parse(decoder.decode(base64Decode(object.content)))),sha:object.sha};}
    catch(err){throw new Error('GitHub backup could not be parsed: '+err.message);}
  }
  function hasOwnerSession(){return typeof ownerSession==='string'&&ownerSession.length>20;}
  function consumeOwnerReturn(){
    const prefix='#santa_owner_session=';
    if(!location.hash.startsWith(prefix))return false;
    const raw=location.hash.slice(prefix.length);
    history.replaceState(null,'',location.pathname+location.search);
    let session;
    try{session=decodeURIComponent(raw);}catch{throw new Error('GitHub returned an invalid owner session.');}
    if(!/^[A-Za-z0-9_.-]{80,5000}$/.test(session))throw new Error('GitHub returned an invalid owner session.');
    ownerSession=session;
    return true;
  }
  function pendingId(){return sessionStorage.getItem(PENDING);}
  function clearPending(){sessionStorage.removeItem(PENDING);}
  function beginOwnerSignIn(collectionId) {
    const api=apiBase();
    if(!api)throw new Error('The owner has not configured the secure GitHub OAuth sync service yet. See the setup guide.');
    if(!collectionId)throw new Error('No encrypted collection is selected.');
    sessionStorage.setItem(PENDING,collectionId);
    location.assign(api+'/auth/start?site_origin='+encodeURIComponent(location.origin));
  }
  function resetOwnerSession(){ownerSession=null;clearPending();}
  async function push(record,expectedFingerprint){
    const api=apiBase();
    if(!api)throw new Error('GitHub OAuth sync is not configured yet. Contact the website owner.');
    if(!hasOwnerSession())throw new Error('Owner GitHub sign-in required.');
    const localFingerprint=await fingerprint(record);
    const response=await fetch(api+'/api/sync',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+ownerSession},
      body:JSON.stringify({record,expectedFingerprint:expectedFingerprint||null}),
      cache:'no-store'
    });
    let payload;
    try{payload=await response.json();}catch{throw new Error('Sync service did not return JSON (HTTP '+response.status+').');}
    if(response.status===401)ownerSession=null;
    if(!response.ok||!payload.ok)throw new Error(payload.error||'GitHub sync failed (HTTP '+response.status+').');
    if(payload.fingerprint!==localFingerprint)throw new Error('Sync service returned an unexpected encryption fingerprint.');
    return {fingerprint:localFingerprint,unchanged:!!payload.unchanged};
  }
  root.SantaCloud={configured,get,push,fingerprint,lastSynced,setLastSynced,hasOwnerSession,consumeOwnerReturn,
    pendingId,clearPending,beginOwnerSignIn,resetOwnerSession};
})(window);
