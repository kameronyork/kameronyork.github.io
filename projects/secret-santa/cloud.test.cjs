const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {webcrypto}=require('node:crypto');
const {TextEncoder,TextDecoder}=require('node:util');
const values=new Map(),temporary=new Map();
const localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v))};
const sessionStorage={getItem:k=>temporary.get(k)||null,setItem:(k,v)=>temporary.set(k,String(v)),removeItem:k=>temporary.delete(k)};
const location={hash:'',origin:'https://www.kameronyork.com',pathname:'/projects/secret-santa/',search:'',assign:url=>{location.next=url;}};
const history={replaceState:(_,__,url)=>{location.cleaned=url;}};
const record={id:'11111111-2222-3333-4444-555555555555',salt:'AAAA',iv:'BBBB',iterations:600000,data:'encrypted-data'};
const window={SantaSyncConfig:{endpoint:'https://secret-santa-owner-sync.example.workers.dev'}};
let posts=0;
const fetch=async(url,opts={})=>{
  if(url.includes('api.github.com')){
    return {ok:true,status:200,json:async()=>({sha:'sha1',content:Buffer.from(JSON.stringify({version:2,vaults:[record]})).toString('base64')})};
  }
  if(url.endsWith('/api/sync')){
    posts++;
    const raw=JSON.parse(opts.body);
    assert.deepEqual(raw.record,record);
    assert.equal(opts.headers.Authorization.startsWith('Bearer '),true);
    assert.equal(raw.expectedFingerprint,null);
    const fp=await cloud.fingerprint(record);
    return {ok:true,status:200,json:async()=>({ok:true,fingerprint:fp,unchanged:false})};
  }
  throw Error('Unexpected URL '+url);
};
const scope={window,localStorage,sessionStorage,location,history,fetch,crypto:webcrypto,TextEncoder,TextDecoder,Uint8Array,
  btoa:s=>Buffer.from(s,'binary').toString('base64'),
  atob:s=>Buffer.from(s,'base64').toString('binary')};
vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(__dirname,'cloud.js'),'utf8'),scope);
const cloud=window.SantaCloud;
async function main(){
  assert.equal(cloud.configured(),true);
  assert.equal(cloud.hasOwnerSession(),false);
  assert.equal((await cloud.get()).store.vaults.length,1);
  cloud.beginOwnerSignIn(record.id);
  assert.match(location.next,/\/auth\/start\?site_origin=/);
  assert.equal(cloud.pendingId(),record.id);
  location.hash='#santa_owner_session='+encodeURIComponent('A'.repeat(90)+'.'+'B'.repeat(90));
  assert.equal(cloud.consumeOwnerReturn(),true);
  assert.equal(cloud.hasOwnerSession(),true);
  assert.equal(location.cleaned,'/projects/secret-santa/');
  const synced=await cloud.push(record,null);
  assert.equal(synced.unchanged,false);
  assert.equal(posts,1);
  cloud.setLastSynced(record.id,synced.fingerprint);
  assert.equal(cloud.lastSynced(record.id),synced.fingerprint);
  assert.equal([...values.values()].some(x=>x.includes('AAAAA.AAAAA')),false);
  cloud.resetOwnerSession();
  assert.equal(cloud.hasOwnerSession(),false);
  assert.equal(cloud.pendingId(),null);
  await assert.rejects(cloud.push(record,null),/Owner GitHub sign-in required/);
  console.log('OAuth redirect, encrypted public load, owner-only POST and in-memory session tests passed');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
