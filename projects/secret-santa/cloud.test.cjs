const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {webcrypto}=require('node:crypto');
const {TextEncoder,TextDecoder}=require('node:util');
const values=new Map();
const localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v))};
let remote={version:2,vaults:[]},sha='rev1',putCount=0;
const b64=bytes=>Buffer.from(bytes).toString('base64');
const request=async (url,opts={})=>{
  if(!url.includes('/contents/projects/secret-santa/events.encrypted.json'))throw Error('Wrong GitHub URL');
  if(!opts.method||opts.method==='GET'){
    return {ok:true,status:200,json:async()=>({sha,content:b64(Buffer.from(JSON.stringify(remote)))})};
  }
  assert.equal(opts.method,'PUT');
  const payload=JSON.parse(opts.body);
  assert.equal(payload.sha,sha);
  assert.ok(opts.headers.Authorization.startsWith('Bearer '));
  assert.ok(!opts.body.includes('github_pat'));
  remote=JSON.parse(Buffer.from(payload.content,'base64').toString('utf8'));
  sha='rev'+(++putCount+1);
  return {ok:true,status:200,json:async()=>({})};
};
const scope={window:{},localStorage,crypto:webcrypto,globalThis:{crypto:webcrypto},fetch:request,
  TextEncoder,TextDecoder,Uint8Array,
  btoa:s=>Buffer.from(s,'binary').toString('base64'),
  atob:s=>Buffer.from(s,'base64').toString('binary')};
vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(__dirname,'cloud.js'),'utf8'),scope);
const cloud=scope.window.SantaCloud;
async function main(){
  const first={id:'11111111-1111-1111-1111-111111111111',salt:'abcd',iterations:600000,iv:'iv',data:'ciphertext1'};
  assert.equal((await cloud.get()).store.vaults.length,0);
  const firstSig=await cloud.fingerprint(first);
  assert.equal(cloud.lastSynced(first.id),null);
  const saved=await cloud.push(first,'github_pat_TEST_TOKEN_123456',null);
  assert.equal(saved.fingerprint,firstSig);assert.equal(remote.vaults.length,1);
  cloud.setLastSynced(first.id,firstSig);
  assert.equal(cloud.lastSynced(first.id),firstSig);
  assert.equal((await cloud.push(first,'github_pat_TEST_TOKEN_123456',firstSig)).unchanged,true);
  const changed={...first,data:'ciphertext2'};
  assert.equal((await cloud.push(changed,'github_pat_TEST_TOKEN_123456',firstSig)).unchanged,false);
  assert.equal(remote.vaults[0].data,'ciphertext2');
  await assert.rejects(cloud.push({...first,data:'ciphertext3'},'github_pat_TEST_TOKEN_123456',firstSig),/changed on GitHub/);
  assert.equal(remote.vaults[0].data,'ciphertext2');
  assert.equal(putCount,2);
  console.log('Manual GitHub sync writes encrypted records, detects no-op and blocks stale overwrites');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
