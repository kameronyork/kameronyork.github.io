const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
class Element {
  constructor(id=''){
    this.id=id; this.value=''; this.hidden=false; this.open=false;
    this.children=[]; this.dataset={}; this.listeners={}; this.textContent='';
    this.classList={toggle:()=>{}}; this.disabled=false;
  }
  replaceChildren(...items){this.children=items;}
  append(...items){this.children.push(...items);}
  addEventListener(name,handler){this.listeners[name]=handler;}
  querySelector(){return new Element();}
  focus(){}
  scrollIntoView(){}
  showModal(){this.open=true;}
  close(){this.open=false;}
  setAttribute(){}
}
const elements=new Map();
const get=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
const document={
  getElementById:get,createElement:tag=>new Element(tag),
  createTextNode:text=>({textContent:text}),
  querySelectorAll:()=>[],addEventListener:()=>{},body:new Element('body')
};
const storage=new Map(),localStorage={
  getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),
  removeItem:key=>storage.delete(key)
};
let ids=0;
const crypto={randomUUID:()=>'test-event-'+(++ids),getRandomValues:arr=>arr.fill(42)};
const privateData={events:[
  {id:'previous',name:'Family 2025',budget:'',names:[],exclusions:[],noSelf:true,mutual:true,draw:null,sent:{}},
  {id:'current',name:'Family 2026',budget:'',names:[],exclusions:[],noSelf:true,mutual:true,draw:null,sent:{}}
],active:'current',endpoint:''};
const vault={
  legacy:()=>null,list:()=>({vaults:[{id:'private-vault'}]}),
  unlock:async secret=>{if(secret!=='TestPassphrase123')throw Error('Wrong password');return {session:{id:'private-vault'},data:privateData};},
  recordFor:()=>({id:'private-vault',salt:'s',iv:'i',data:'ciphertext',iterations:600000}),
  save:async()=>{},importRemote:()=>({added:[],updated:[],skipped:[]})
};
const cloud={
  fingerprint:async()=> 'encrypted-fingerprint',lastSynced:()=>null,
  get:async()=>({store:{vaults:[]}}),push:async()=>({fingerprint:'encrypted-fingerprint',unchanged:false})
};
const app=readFileSync(path.join(__dirname,'app.js'),'utf8');
new Function('document','localStorage','crypto','SantaVault','SantaCloud','navigator','location','URL','Blob','confirm','alert','setTimeout',app)(
  document,localStorage,crypto,vault,cloud,{}, {href:''},class{},class{},()=>true,()=>{},()=>{}
);
async function main(){
  assert.equal(get('guestNotice').hidden,false);
  assert.equal(get('syncNow').hidden,true);
  assert.equal(get('ownerEventPicker').hidden,true);
  assert.equal(get('menuSignIn').hidden,false);
  get('eventName').value='Guest Christmas';get('eventName').listeners.input();
  get('newNames').value='Alice\nBob';get('addForm').listeners.submit({preventDefault(){}});
  const guest=JSON.parse(localStorage.getItem('secret-santa.guest.v1'));
  assert.equal(guest.event.name,'Guest Christmas');
  assert.deepEqual(guest.event.names,['Alice','Bob']);
  assert.equal(get('syncNow').hidden,true);
  get('menuSignIn').onclick();
  assert.equal(get('vaultGate').open,true);
  get('unlockPin').value='TestPassphrase123';
  await get('unlockForm').listeners.submit({preventDefault(){}});
  assert.equal(get('vaultGate').open,false);
  assert.equal(get('syncNow').hidden,false);
  assert.equal(get('guestNotice').hidden,true);
  assert.equal(get('ownerEventPicker').hidden,false);
  assert.equal(get('historyRule').hidden,false);
  await get('menuSignOut').onclick();
  assert.equal(get('syncNow').hidden,true);
  assert.equal(get('guestNotice').hidden,false);
  assert.equal(get('historyRule').hidden,true);
  assert.deepEqual(JSON.parse(localStorage.getItem('secret-santa.guest.v1')).event.names,['Alice','Bob']);
  console.log('Guest-first UI, one-device persistence, private PIN sign-in and sign-out passed.');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
