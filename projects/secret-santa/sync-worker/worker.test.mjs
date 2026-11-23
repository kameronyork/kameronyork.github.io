import assert from 'node:assert/strict';
import {test} from 'node:test';
import {webcrypto} from 'node:crypto';
import worker from './worker.mjs';

if(!globalThis.crypto)globalThis.crypto=webcrypto;
const secret=Buffer.alloc(32,17).toString('hex');
const env={GITHUB_CLIENT_ID:'Iv1.test-client',GITHUB_CLIENT_SECRET:'test-client-secret',SESSION_KEY:secret};
const origin='https://www.kameronyork.com';
const workerOrigin='https://secret-santa-owner-sync.example.workers.dev';
let ownerId=122046751, file={version:2,vaults:[]},sha='initial-sha', puts=0;
const originalFetch=globalThis.fetch;
globalThis.fetch=async(input,options={})=>{
  const url=String(input);
  if(url==='https://github.com/login/oauth/access_token'){
    return new Response(JSON.stringify({access_token:'test-github-oauth-access-token',scope:'public_repo'}),{status:200,headers:{'Content-Type':'application/json'}});
  }
  if(url==='https://api.github.com/user'){
    return new Response(JSON.stringify({id:ownerId,login:ownerId===122046751?'kameronyork':'someone-else'}),{status:200,headers:{'Content-Type':'application/json'}});
  }
  if(url.includes('/contents/projects/secret-santa/events.encrypted.json')){
    if(options.method==='PUT'){
      const body=JSON.parse(options.body);
      if(body.sha!==sha)return new Response(JSON.stringify({message:'SHA changed'}),{status:409});
      file=JSON.parse(Buffer.from(body.content,'base64').toString('utf8'));
      puts++;sha='commit-'+puts;
      return new Response('{}',{status:200,headers:{'Content-Type':'application/json'}});
    }
    return new Response(JSON.stringify({sha,content:Buffer.from(JSON.stringify(file)).toString('base64')}),{status:200,headers:{'Content-Type':'application/json'}});
  }
  throw new Error('Unexpected network call '+url);
};
const get=(url,headers={})=>worker.fetch(new Request(workerOrigin+url,{headers}),env);
const post=(ticket,payload,siteOrigin=origin)=>worker.fetch(new Request(workerOrigin+'/api/sync',{method:'POST',headers:{Origin:siteOrigin,Authorization:'Bearer '+ticket,'Content-Type':'application/json'},body:JSON.stringify(payload)}),env);
const validRecord=(id='11111111-2222-3333-4444-555555555555',data='AQID')=>({
  id,salt:'AAECAwQFBgcICQoLDA0ODw==',iv:'AAECAwQFBgcICQoL',data,iterations:600000
});
async function signIn(){
  const start=await get('/auth/start?site_origin='+encodeURIComponent(origin));
  assert.equal(start.status,302);
  const destination=new URL(start.headers.get('Location'));
  assert.equal(destination.hostname,'github.com');
  assert.equal(destination.searchParams.get('scope'),'public_repo');
  assert.equal(destination.searchParams.get('code_challenge_method'),'S256');
  const cookie=start.headers.get('Set-Cookie').split(';')[0];
  const state=destination.searchParams.get('state');
  const callback=await get('/auth/callback?code=example&state='+encodeURIComponent(state),{Cookie:cookie});
  return callback;
}
test('health and CORS allowlisted origins',async()=>{
  assert.equal((await (await get('/health')).json()).configured,true);
  const options=await worker.fetch(new Request(workerOrigin+'/api/sync',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST'}}),env);
  assert.equal(options.status,204);
  assert.equal(options.headers.get('Access-Control-Allow-Origin'),origin);
  const denied=await worker.fetch(new Request(workerOrigin+'/api/sync',{method:'OPTIONS',headers:{Origin:'https://evil.example'}}),env);
  assert.equal(denied.status,403);
});
test('only verified GitHub owner receives upload session',async()=>{
  ownerId=999;
  const denied=await signIn();
  assert.equal(denied.status,403);
  ownerId=122046751;
});
test('OAuth owner session adds multiple collections without leaking plaintext',async()=>{
  const response=await signIn();
  assert.equal(response.status,302);
  assert.equal(response.headers.get('Set-Cookie').includes('Max-Age=0'),true);
  const redirected=new URL(response.headers.get('Location'));
  assert.equal(redirected.origin,origin);
  const ticket=decodeURIComponent(redirected.hash.slice('#santa_owner_session='.length));
  assert.ok(ticket.includes('.'));
  const first=validRecord();
  const a=await post(ticket,{record:first,expectedFingerprint:null});
  assert.equal(a.status,200);
  const dataA=await a.json();
  assert.equal(dataA.ok,true);
  assert.equal(file.vaults.length,1);
  assert.equal(JSON.stringify(file).includes('Test Family'),false);
  const b=await post(ticket,{record:validRecord('66666666-7777-8888-9999-000000000000','AQIDBA=='),expectedFingerprint:null});
  assert.equal(b.status,200);
  assert.equal(file.vaults.length,2);
  const noChange=await post(ticket,{record:first,expectedFingerprint:dataA.fingerprint});
  assert.equal((await noChange.json()).unchanged,true);
  const next=await post(ticket,{record:{...first,data:'AQIDBA=='},expectedFingerprint:dataA.fingerprint});
  assert.equal(next.status,200);
  const stale=await post(ticket,{record:{...first,data:'AQIDBAUG'},expectedFingerprint:dataA.fingerprint});
  assert.equal(stale.status,409);
  assert.equal(file.vaults[0].data,'AQIDBA==');
  assert.equal(file.vaults[1].data,'AQIDBA==');
  const withoutBearer=await worker.fetch(new Request(workerOrigin+'/api/sync',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({record:first})}),env);
  assert.equal(withoutBearer.status,401);
  const forged=await post('bad.session',{record:first});
  assert.equal(forged.status,401);
  const wrongOrigin=await post(ticket,{record:first},'https://evil.example');
  assert.equal(wrongOrigin.status,403);
  assert.equal(puts,3);
});
