const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {webcrypto} = require('node:crypto');
const {TextEncoder,TextDecoder} = require('node:util');
const vm = require('node:vm');

const values = new Map();
const storage = {
  getItem:k=>values.has(k)?values.get(k):null,
  setItem:(k,v)=>values.set(k,String(v)),
  removeItem:k=>values.delete(k)
};
const scope = {
  window:{},localStorage:storage,crypto:webcrypto,
  globalThis:{crypto:webcrypto,isSecureContext:true},
  TextEncoder,TextDecoder,DOMException,Uint8Array,
  btoa:s=>Buffer.from(s,'binary').toString('base64'),
  atob:s=>Buffer.from(s,'base64').toString('binary'),
};
vm.createContext(scope);
vm.runInContext(readFileSync(require('node:path').join(__dirname,'vault.js'),'utf8'),scope);
const v = scope.window.SantaVault;
const event = {id:'event1',name:'Secret Family Test',names:['Alice','Bob'],exclusions:[[],[]],draw:[1,0],sent:{}};
const firstState={events:[event],active:'event1',endpoint:''};
async function main(){
  storage.setItem('secret-santa.v1',JSON.stringify(firstState));
  assert.ok(v.legacy());
  const first = await v.create('12345678',firstState);
  assert.equal(v.legacy(),null);
  const raw = storage.getItem('secret-santa.vaults.v2');
  assert.ok(raw);
  assert.ok(!raw.includes('Alice')&&!raw.includes('Secret Family Test')&&!raw.includes('event1'));
  assert.equal(v.list().vaults.length,1);
  const opened = await v.unlock('12345678');
  assert.equal(opened.data.events[0].names[1],'Bob');
  await assert.rejects(v.unlock('87654321'),/PIN not found/);
  await assert.rejects(v.create('12345678',firstState),/already has a collection/);
  firstState.events[0].name='Updated Test';
  await v.save(first.session,firstState);
  assert.equal((await v.unlock('12345678')).data.events[0].name,'Updated Test');
  const separate = {events:[{id:'other',name:'Another person',names:['C'],draw:null,exclusions:[[]]}],active:'other'};
  await v.create('98765432',separate);
  assert.equal((await v.unlock('98765432')).data.events[0].name,'Another person');
  assert.equal((await v.unlock('12345678')).data.events[0].name,'Updated Test');
  assert.ok(!storage.getItem('secret-santa.vaults.v2').includes('Another person'));
  console.log('Encrypted PIN vault, migration, wrong PIN, updates and account separation passed');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
