/**
 * Owner-only GitHub OAuth sync for Secret Santa.
 *
 * Setup: create a GitHub OAuth App for /auth/callback and set Wrangler secrets:
 * GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_KEY (64 hex chars).
 * Only the verified GitHub account ID below can write encrypted data to the repo.
 * No credentials or plaintext event data are published to GitHub Pages.
 */
const OWNER_GITHUB_ID = 122046751;
const REPO_API = 'https://api.github.com/repos/kameronyork/kameronyork.github.io/contents/projects/secret-santa/events.encrypted.json';
const ALLOWED_ORIGINS = ['https://www.kameronyork.com', 'https://kameronyork.com', 'https://kameronyork.github.io'];
const STATE_COOKIE = '__Host-santa_oauth_state';
const SESSION_LIFETIME_MS = 10 * 60 * 1000;
const MAX_BODY_BYTES = 2600000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function json(status, value, extra = {}) {
  return new Response(JSON.stringify(value), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
}
function base64Bytes(bytes){
  let chars='';
  for(let i=0;i<bytes.length;i+=8192)chars+=String.fromCharCode(...bytes.slice(i,i+8192));
  return btoa(chars);
}
function b64url(bytes) {
  let chars='';
  for(let i=0;i<bytes.length;i+=8192)chars+=String.fromCharCode(...bytes.slice(i,i+8192));
  return btoa(chars).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function fromB64url(value){
  if(typeof value!=='string'||!(/^[A-Za-z0-9_-]+$/.test(value)))throw new HttpError(401,'Invalid owner session.');
  const s=atob(value.replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((value.length+3)%4));
  const out=new Uint8Array(s.length);for(let i=0;i<s.length;i++)out[i]=s.charCodeAt(i);
  return out;
}
function randomToken(n=32){return b64url(crypto.getRandomValues(new Uint8Array(n)));}
function keyBytes(secret) {
  if(typeof secret!=='string'||!(/^[0-9a-fA-F]{64}$/.test(secret)))throw new HttpError(503,'The sync service session key is not configured.');
  return Uint8Array.from(secret.match(/.{2}/g),x=>parseInt(x,16));
}
async function sessionKey(env){return crypto.subtle.importKey('raw',keyBytes(env.SESSION_KEY),{name:'AES-GCM'},false,['encrypt','decrypt']);}
async function seal(payload,env){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},await sessionKey(env),encoder.encode(JSON.stringify(payload)));
  return b64url(iv)+'.'+b64url(new Uint8Array(data));
}
async function unseal(ticket,env) {
  if(typeof ticket!=='string'||ticket.length>5000||!ticket.includes('.'))throw new HttpError(401,'Please sign in to GitHub again.');
  try{
    const [iv,data]=ticket.split('.');
    const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64url(iv)},await sessionKey(env),fromB64url(data));
    const decoded=JSON.parse(decoder.decode(plaintext));
    if(decoded.uid!==OWNER_GITHUB_ID||decoded.exp<Date.now()||decoded.iat>Date.now()+30000||typeof decoded.token!=='string')throw new Error('Expired or invalid');
    return decoded;
  }catch(e){if(e instanceof HttpError&&e.status===503)throw e;throw new HttpError(401,'Owner sign-in expired. Please sign in to GitHub again.');}
}
function cookieValue(request,name){
  const cookie=request.headers.get('Cookie')||'';
  const entry=cookie.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));
  return entry?entry.slice(name.length+1):null;
}
function headersForGithub(token){
  return {'Accept':'application/vnd.github+json','Authorization':'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'Secret-Santa-Owner-Sync'};
}
function ensureConfig(env){
  if(!env.GITHUB_CLIENT_ID||!env.GITHUB_CLIENT_SECRET||!env.SESSION_KEY)throw new HttpError(503,'Sync service needs GitHub OAuth setup and Cloudflare secrets.');
  keyBytes(env.SESSION_KEY);
}
function corsHeaders(request){
  const origin=request.headers.get('Origin');
  if(!ALLOWED_ORIGINS.includes(origin))return {'Vary':'Origin'};
  return {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Vary':'Origin'};
}
async function ownerFromGithub(accessToken){
  const response=await fetch('https://api.github.com/user',{headers:headersForGithub(accessToken),cache:'no-store'});
  if(!response.ok)throw new HttpError(401,'GitHub authorization expired or was revoked.');
  const profile=await response.json();
  if(profile.id!==OWNER_GITHUB_ID||profile.login!=='kameronyork')throw new HttpError(403,'Only the repository owner can sync Secret Santa events.');
  return profile;
}
async function startOAuth(request,env){
  ensureConfig(env);
  const url=new URL(request.url);
  const siteOrigin=url.searchParams.get('site_origin');
  if(!ALLOWED_ORIGINS.includes(siteOrigin))throw new HttpError(400,'Unrecognized Secret Santa website origin.');
  const state=randomToken(),verifier=randomToken();
  const originIndex=ALLOWED_ORIGINS.indexOf(siteOrigin);
  const cookie=[state,verifier,originIndex].join('.');
  const hashed=new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(verifier)));
  const authorize=new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id',env.GITHUB_CLIENT_ID);
  authorize.searchParams.set('redirect_uri',url.origin+'/auth/callback');
  authorize.searchParams.set('scope','public_repo');
  authorize.searchParams.set('state',state);
  authorize.searchParams.set('code_challenge',b64url(hashed));
  authorize.searchParams.set('code_challenge_method','S256');
  authorize.searchParams.set('allow_signup','false');
  return new Response(null,{status:302,headers:{
    Location:authorize.toString(),
    'Set-Cookie':STATE_COOKIE+'='+cookie+'; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax',
    'Cache-Control':'no-store','Referrer-Policy':'no-referrer'
  }});
}
async function callback(request,env){
  ensureConfig(env);
  const url=new URL(request.url);
  const raw=cookieValue(request,STATE_COOKIE);
  const pieces=raw&&raw.split('.');
  const cleared=STATE_COOKIE+'=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax';
  if(!pieces||pieces.length!==3||url.searchParams.get('state')!==pieces[0]||!/^[012]$/.test(pieces[2]))
    throw new HttpError(400,'GitHub sign-in could not be verified. Please start Sync again.');
  if(url.searchParams.has('error'))throw new HttpError(400,'GitHub sign-in was canceled or denied.');
  const code=url.searchParams.get('code');
  if(!code||code.length>500)throw new HttpError(400,'GitHub did not return an authorization code.');
  const result=await fetch('https://github.com/login/oauth/access_token',{
    method:'POST',headers:{'Accept':'application/json','Content-Type':'application/x-www-form-urlencoded','User-Agent':'Secret-Santa-Owner-Sync'},
    body:new URLSearchParams({client_id:env.GITHUB_CLIENT_ID,client_secret:env.GITHUB_CLIENT_SECRET,code,code_verifier:pieces[1],redirect_uri:url.origin+'/auth/callback'}),
    cache:'no-store'
  });
  if(!result.ok)throw new HttpError(502,'GitHub sign-in service is temporarily unavailable.');
  const access=await result.json();
  if(!access.access_token)throw new HttpError(401,'GitHub authorization failed. Try signing in again.');
  const scopes=typeof access.scope==='string'?access.scope.split(',').map(s=>s.trim()):[];
  if(!scopes.includes('public_repo')&&!scopes.includes('repo'))throw new HttpError(403,'GitHub did not grant public repository write access.');
  await ownerFromGithub(access.access_token);
  const ticket=await seal({uid:OWNER_GITHUB_ID,token:access.access_token,iat:Date.now(),exp:Date.now()+SESSION_LIFETIME_MS},env);
  const destination=new URL(ALLOWED_ORIGINS[Number(pieces[2])]+'/projects/secret-santa/');
  destination.hash='santa_owner_session='+encodeURIComponent(ticket);
  return new Response(null,{status:302,headers:{
    'Location':destination.toString(),'Set-Cookie':cleared,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'
  }});
}
async function fingerprint(record){
  const data=encoder.encode(record.id+':'+record.salt+':'+record.iterations+':'+record.iv+':'+record.data);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',data));
  return Array.from(digest,x=>x.toString(16).padStart(2,'0')).join('');
}
function checkRecord(record){
  if(!record||typeof record!=='object'||typeof record.id!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(record.id)||
    typeof record.salt!=='string'||typeof record.iv!=='string'||typeof record.data!=='string'||
    !/^[a-zA-Z0-9+/=]+$/.test(record.salt)||!/^[a-zA-Z0-9+/=]+$/.test(record.iv)||!/^[a-zA-Z0-9+/=]+$/.test(record.data)||
    record.salt.length>128||record.iv.length>128||record.data.length>2500000||
    !Number.isInteger(record.iterations)||record.iterations<100000||record.iterations>1500000) {
    throw new HttpError(400,'Encrypted event data failed validation.');
  }
}
async function readGitHub(token){
  const result=await fetch(REPO_API+'?ref=main',{headers:headersForGithub(token),cache:'no-store'});
  if(!result.ok)throw new HttpError(502,'GitHub could not read the encrypted event file (HTTP '+result.status+').');
  const payload=await result.json();
  if(typeof payload.content!=='string'||typeof payload.sha!=='string')throw new HttpError(502,'Unexpected GitHub file response.');
  let store;
  try {
    const text=atob(payload.content.replace(/\s+/g,''));
    const bytes=Uint8Array.from(text,c=>c.charCodeAt(0));
    store=JSON.parse(decoder.decode(bytes));
  }catch {throw new HttpError(502,'Encrypted GitHub JSON could not be parsed.');}
  if(!store||store.version!==2||!Array.isArray(store.vaults)||store.vaults.length>1000)throw new HttpError(502,'Encrypted GitHub JSON has an unexpected format.');
  return {store,sha:payload.sha};
}
async function updateEncryptedJSON(request,env){
  ensureConfig(env);
  const cors=corsHeaders(request);
  if(!('Access-Control-Allow-Origin' in cors))throw new HttpError(403,'This website is not allowed to sync.');
  const authorization=request.headers.get('Authorization')||'';
  if(!authorization.startsWith('Bearer '))throw new HttpError(401,'Sign in to GitHub before syncing.');
  const current=await unseal(authorization.slice(7),env);
  await ownerFromGithub(current.token);
  if(Number(request.headers.get('Content-Length'))>MAX_BODY_BYTES)throw new HttpError(413,'Encrypted sync request is too large.');
  const body=await request.text();
  if(body.length>MAX_BODY_BYTES)throw new HttpError(413,'Encrypted sync request is too large.');
  let payload;
  try{payload=JSON.parse(body);}catch{throw new HttpError(400,'Sync request is not valid JSON.');}
  if(!payload||!payload.record)throw new HttpError(400,'Encrypted collection missing.');
  checkRecord(payload.record);
  const localFingerprint=await fingerprint(payload.record);
  const {store,sha}=await readGitHub(current.token);
  const index=store.vaults.findIndex(x=>x.id===payload.record.id);
  if(index>=0){
    const oldFingerprint=await fingerprint(store.vaults[index]);
    if(oldFingerprint===localFingerprint)return json(200,{ok:true,fingerprint:localFingerprint,unchanged:true},cors);
    if(!payload.expectedFingerprint||payload.expectedFingerprint!==oldFingerprint) {
      throw new HttpError(409,'The GitHub version changed since the last sync. No events were overwritten. Load the latest data and resolve the conflict.');
    }
    store.vaults[index]=payload.record;
  }else{
    if(store.vaults.length>=1000)throw new HttpError(413,'Maximum encrypted collections reached.');
    store.vaults.push(payload.record);
  }
  const serialized=JSON.stringify(store,null,2);
  if(serialized.length>7000000)throw new HttpError(413,'Shared encrypted file is too large.');
  const change=await fetch(REPO_API,{
    method:'PUT',headers:{...headersForGithub(current.token),'Content-Type':'application/json'},
    body:JSON.stringify({message:'Sync encrypted Secret Santa event collection',branch:'main',sha,content:base64Bytes(encoder.encode(serialized))}),
    cache:'no-store'
  });
  if(change.status===409||change.status===422)throw new HttpError(409,'GitHub detected another update. Please retry after refreshing your data.');
  if(!change.ok)throw new HttpError(502,'GitHub rejected the encrypted sync (HTTP '+change.status+').');
  return json(200,{ok:true,fingerprint:localFingerprint,unchanged:false},cors);
}
function textResponse(status,msg){
  return new Response(msg,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
}
export default {
  async fetch(request,env){
    const url=new URL(request.url),cors=corsHeaders(request);
    if(request.method==='OPTIONS'&&url.pathname==='/api/sync'){
      if(!('Access-Control-Allow-Origin' in cors))return json(403,{error:'Origin denied.'});
      return new Response(null,{status:204,headers:{...cors,'Cache-Control':'no-store'}});
    }
    try{
      if(url.pathname==='/health'&&request.method==='GET')
        return json(200,{ok:true,configured:!!(env.GITHUB_CLIENT_ID&&env.GITHUB_CLIENT_SECRET&&env.SESSION_KEY)});
      if(url.pathname==='/auth/start'&&request.method==='GET')return await startOAuth(request,env);
      if(url.pathname==='/auth/callback'&&request.method==='GET')return await callback(request,env);
      if(url.pathname==='/api/sync'&&request.method==='POST')return await updateEncryptedJSON(request,env);
      return textResponse(404,'Not found');
    }catch(err){
      const status=err instanceof HttpError?err.status:500;
      const message=err instanceof HttpError?err.message:'Sync service encountered an error.';
      if(url.pathname==='/api/sync')return json(status,{ok:false,error:message},cors);
      return textResponse(status,message);
    }
  }
};
