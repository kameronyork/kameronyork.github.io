'use strict';
const $=id=>document.getElementById(id);
const GUEST_KEY='secret-santa.guest.v1';
const makeEvent=()=>({id:crypto.randomUUID(),name:'',budget:'',noSelf:true,mutual:true,names:[],exclusions:[],avoidPrevious:false,previousEventId:'',draw:null,sent:{}});
const newState=()=>{const event=makeEvent();return {events:[event],active:event.id,endpoint:''};};
let state=null,session=null,writes=Promise.resolve(),savingFailed=false,vaultBusy=false;
let githubToken='',syncing=false,accessKey='',sending=false,textIndex=-1,revealed=new Set();
let active=()=>state.events.find(e=>e.id===state.active)||state.events[0];
const signedIn=()=>!!session;
function sanitizeGuestEvent(source){
  if(!source||typeof source!=='object'||!Array.isArray(source.names)||source.names.length>100)
    throw new Error('The guest event backup is not valid.');
  const names=source.names;
  if(names.some(x=>typeof x!=='string'||!x.trim()||x.length>80)||new Set(names.map(x=>x.toLowerCase())).size!==names.length)
    throw new Error('Guest event has duplicate or invalid participant names.');
  const exclusions=Array.isArray(source.exclusions)&&source.exclusions.length===names.length?
    source.exclusions.map((list,i)=>{
      if(!Array.isArray(list))throw new Error('Invalid exclusions in the guest event.');
      return [...new Set(list.filter(n=>Number.isInteger(n)&&n>=0&&n<names.length&&n!==i))];
    }):names.map(()=>[]);
  let draw=null;
  if(source.draw!==null&&source.draw!==undefined){
    if(!Array.isArray(source.draw)||source.draw.length!==names.length||
      source.draw.some(n=>!Number.isInteger(n)||n<0||n>=names.length)||new Set(source.draw).size!==names.length)
      throw new Error('Guest backup has an invalid drawing.');
    draw=source.draw.slice();
  }
  const budget=source.budget===''?'':String(source.budget??'');
  if(budget!==''&&(!Number.isFinite(Number(budget))||Number(budget)<0||Number(budget)>100000))
    throw new Error('Guest backup has an invalid spending limit.');
  const sent={};
  if(source.sent&&typeof source.sent==='object'){
    for(const [k,v] of Object.entries(source.sent)){
      if(/^\d{1,3}$/.test(k)&&Number(k)<names.length&&(v==='manual'||v==='direct'))sent[k]=v;
    }
  }
  return {id:crypto.randomUUID(),name:typeof source.name==='string'?source.name.slice(0,100):'',
    budget,noSelf:source.noSelf!==false,mutual:source.mutual!==false,names:names.slice(),
    exclusions,avoidPrevious:false,previousEventId:'',draw,sent};
}
function loadGuest(){
  try{
    const stored=JSON.parse(localStorage.getItem(GUEST_KEY)||'null');
    if(stored?.event){
      const event=sanitizeGuestEvent(stored.event);
      return {events:[event],active:event.id,endpoint:typeof stored.endpoint==='string'?stored.endpoint:''};
    }
  }catch(err){console.warn('Could not read the previous guest event.',err);}
  return newState();
}
function updateViewMode(){
  const owner=signedIn();
  for(const id of ['ownerEventPicker','duplicateEvent','deleteEvent','changePin','syncNow','lockVault','ownerSyncStrip','menuSignOut'])
    $(id).hidden=!owner;
  for(const id of ['guestNotice','menuSignIn','menuGuestDownload','menuGuestImport','guestDownload'])
    $(id).hidden=owner;
  $('historyRule').hidden=!owner;
  $('menuMode').textContent=owner?'Kameron · encrypted events':'Guest · local event only';
  $('footerMode').textContent=owner?
    'Your event history is PIN-encrypted locally; click Sync to back it up to GitHub. ':
    'Guest events are saved on this browser only. Download a backup if you want to keep a copy. ';
}
function syncIndicator(message,good=false){
  if(!signedIn())return;
  $('syncStatus').className=good?'sync-saved':'sync-unsaved';
  $('syncStatus').textContent=message;
}
async function refreshSyncStatus(){
  if(!session)return;
  const expected=session;
  try{
    const record=SantaVault.recordFor(session);
    const latest=await SantaCloud.fingerprint(record);
    if(session!==expected)return;
    if(latest&&latest===SantaCloud.lastSynced(session.id)){
      syncIndicator('✓ Synced to GitHub',true);
      $('syncInfo').textContent='Your encrypted event history is backed up.';
    }else{
      syncIndicator('● Not synced — changes are only on this device');
      $('syncInfo').textContent='Click Sync to back up your encrypted events to GitHub.';
    }
  }catch(err){if(session===expected)syncIndicator('● Not synced — could not check backup status');}
}
function save(){
  if(!state)return Promise.resolve();
  if(!signedIn()){
    try {
      localStorage.setItem(GUEST_KEY,JSON.stringify({event:active(),endpoint:state.endpoint||''}));
      $('storageWarning').hidden=true;
    }catch(err){
      $('storageWarning').textContent='Unable to save this guest event on this device. Download a backup before leaving or reloading.';
      $('storageWarning').hidden=false;
    }
    return Promise.resolve();
  }
  syncIndicator('● Not synced — saving locally…');
  const snapshot=JSON.parse(JSON.stringify(state)),currentSession=session;
  writes=writes.catch(()=>{}).then(()=>SantaVault.save(currentSession,snapshot)).then(()=>{
    if(currentSession===session){savingFailed=false;$('storageWarning').hidden=true;refreshSyncStatus();}
  }).catch(err=>{
    if(currentSession===session){savingFailed=true;$('storageWarning').textContent='Encrypted save failed: '+err.message+'. Changes may be lost if you reload or sign out.';$('storageWarning').hidden=false;}
  });
  return writes;
}
function normalizeState(data){
  if(!data||!Array.isArray(data.events)||!data.events.length)return newState();
  data.events.forEach(e=>{if(!Array.isArray(e.names))e.names=[];if(!Array.isArray(e.exclusions))e.exclusions=e.names.map(()=>[]);if(!e.sent)e.sent={};if(typeof e.avoidPrevious!=='boolean')e.avoidPrevious=false;if(typeof e.previousEventId!=='string')e.previousEventId='';if(!e.exclusions.length&&e.names.length)e.exclusions=e.names.map(()=>[]);});
  return data;
}
function gateMessage(msg){$('vaultError').textContent=msg||'';}
function gateRefresh(){
  try{
    const count=SantaVault.list().vaults.length;
    $('legacyHint').hidden=!SantaVault.legacy();
    $('unlockForm').hidden=false;
    $('createForm').hidden=count>0;
    gateMessage('');
  }catch(err){gateMessage(err.message);}
}
function openKameronSignIn(){
  if(signedIn()||sending||syncing)return;
  $('siteMenu').open=false;
  gateRefresh();
  $('cloudGateStatus').textContent='On a new phone? Load your encrypted GitHub backup before unlocking.';
  $('vaultGate').showModal();
}
function activate(result){
  session=result.session;
  state=normalizeState(result.data);
  revealed.clear();accessKey='';textIndex=-1;
  $('unlockPin').value='';$('createPin').value='';$('confirmPin').value='';
  if($('vaultGate').open)$('vaultGate').close();
  $('storageWarning').hidden=true;
  gateMessage('');
  updateViewMode();render();refreshSyncStatus();
}
$('menuSignIn').onclick=openKameronSignIn;
$('unlockForm').addEventListener('submit',async ev=>{
  ev.preventDefault();if(vaultBusy)return;
  vaultBusy=true;gateMessage('');const b=$('unlockForm').querySelector('button');b.disabled=true;
  try{
    const pin=$('unlockPin').value;
    try{activate(await SantaVault.unlock(pin));}
    catch(err){
      if(!err.message.includes('No event collection matched'))throw err;
      await loadFromGitHub();
      activate(await SantaVault.unlock(pin));
    }
  }catch(err){gateMessage(err.message);}
  finally{vaultBusy=false;b.disabled=false;$('unlockPin').value='';}
});
$('createForm').addEventListener('submit',async ev=>{
  ev.preventDefault();if(vaultBusy)return;
  const pin=$('createPin').value;
  if(pin!==$('confirmPin').value){gateMessage('Passphrases do not match.');return;}
  vaultBusy=true;gateMessage('');const b=$('createForm').querySelector('button');b.disabled=true;
  try{
    const data=SantaVault.legacy()||newState();
    activate(await SantaVault.create(pin,data));
  }catch(err){gateMessage(err.message);}
  finally{vaultBusy=false;b.disabled=false;$('createPin').value='';$('confirmPin').value='';}
});
function purgePrivateView(){
  for(const id of ['resultRows','people','exclusions','previousSummary','eventSelect','previousEvent'])$(id).replaceChildren();
  for(const id of ['eventName','budget','newNames','phone','smsKey','endpoint','githubToken','unlockPin','createPin','confirmPin','oldPin','newPin','newPinConfirm'])$(id).value='';
  for(const id of ['resultTitle','resultMeta','sentProgress','textStatus','textTitle'])$(id).textContent='';
  $('storageWarning').hidden=true;
}
async function signOut(){
  if(!signedIn()||sending||syncing||vaultBusy)return;
  $('lockVault').disabled=true;
  try{await writes;}catch{}
  if(savingFailed&&!confirm('Encrypted save failed. Signing out may discard unsaved changes. Sign out anyway?')){
    $('lockVault').disabled=false;return;
  }
  session=null;state=null;accessKey='';githubToken='';revealed.clear();textIndex=-1;
  for(const id of ['textDialog','settingsDialog','syncDialog','changeDialog','vaultGate'])if($(id).open)$(id).close();
  purgePrivateView();
  state=loadGuest();
  $('siteMenu').open=false;
  updateViewMode();render();
  $('lockVault').disabled=false;
}
$('lockVault').onclick=signOut;
$('menuSignOut').onclick=signOut;
async function loadFromGitHub(){
  $('cloudGateStatus').textContent='Loading encrypted collections from GitHub…';
  const remote=await SantaCloud.get();
  const existing=new Map(SantaVault.list().vaults.map(record=>[record.id,record]));
  const replacements=[];
  for(const record of remote.store.vaults){
    const local=existing.get(record.id);
    if(!local)continue;
    const oldFingerprint=await SantaCloud.fingerprint(local);
    const newFingerprint=await SantaCloud.fingerprint(record);
    if(oldFingerprint!==newFingerprint&&oldFingerprint===SantaCloud.lastSynced(record.id))replacements.push(record.id);
  }
  const result=SantaVault.importRemote(remote.store.vaults,replacements);
  for(const record of remote.store.vaults){
    if(result.added.includes(record.id)||result.updated.includes(record.id)||
       (existing.has(record.id)&&(await SantaCloud.fingerprint(existing.get(record.id)))===(await SantaCloud.fingerprint(record)))){
      SantaCloud.setLastSynced(record.id,await SantaCloud.fingerprint(record));
    }
  }
  $('cloudGateStatus').textContent=result.added.length+' encrypted collection(s) downloaded; '+result.updated.length+
    ' refreshed. '+(result.skipped.length?result.skipped.length+' existing local collection(s) left unchanged. ':'')+
    'Unlock using your original passphrase.';
  return result;
}
$('loadCloud').onclick=async()=>{
  if(vaultBusy)return;
  vaultBusy=true;const b=$('loadCloud');b.disabled=true;gateMessage('');
  try{await loadFromGitHub();}
  catch(err){gateMessage('Could not load from GitHub: '+err.message);$('cloudGateStatus').textContent='Download failed. Your local events were not changed.';}
  finally{vaultBusy=false;b.disabled=false;}
};
function showSyncDialog(error){
  if(!signedIn())return;
  $('githubToken').value=githubToken;
  $('syncDialogError').textContent=error||'';
  if(!$('syncDialog').open)$('syncDialog').showModal();
}
async function performSync(){
  if(syncing||!signedIn())return;
  syncing=true;$('syncNow').disabled=true;
  syncIndicator('● Syncing encrypted events to GitHub…');
  try{
    await writes;
    if(savingFailed)throw new Error('Local encrypted save failed. Fix local storage before syncing.');
    const localSession=session,record=SantaVault.recordFor(localSession);
    if(!record)throw new Error('Encrypted event collection is missing.');
    const outcome=await SantaCloud.push(record,githubToken,SantaCloud.lastSynced(localSession.id));
    SantaCloud.setLastSynced(localSession.id,outcome.fingerprint);
    if(localSession===session){
      await refreshSyncStatus();
      $('syncInfo').textContent=outcome.unchanged?'GitHub already contains this version.':'GitHub accepted your encrypted backup.';
    }
    if($('syncDialog').open)$('syncDialog').close();
  }catch(err){
    if(signedIn()){
      syncIndicator('● Not synced — GitHub upload failed');
      $('syncInfo').textContent=err.message;
      showSyncDialog(err.message);
    }
  }finally{syncing=false;$('syncNow').disabled=false;$('githubToken').value='';}
}
$('syncNow').onclick=()=>{if(!signedIn())return;if(!githubToken)showSyncDialog();else performSync();};
$('syncForm').addEventListener('submit',ev=>{
  ev.preventDefault();if(syncing||!signedIn())return;
  githubToken=$('githubToken').value.trim();
  if(!githubToken){$('syncDialogError').textContent='Enter a GitHub access token.';return;}
  performSync();
});
$('changePin').onclick=()=>{
  if(!signedIn())return;
  $('changeError').textContent='';
  for(const id of ['oldPin','newPin','newPinConfirm'])$(id).value='';
  $('changeDialog').showModal();
};
$('changeForm').addEventListener('submit',async ev=>{
  ev.preventDefault();if(!signedIn()||syncing||sending||vaultBusy)return;
  if($('newPin').value!==$('newPinConfirm').value){$('changeError').textContent='New passphrases do not match.';return;}
  vaultBusy=true;$('changeError').textContent='';
  const b=$('changeForm').querySelector('[type="submit"]');b.disabled=true;
  try{
    await writes;
    if(savingFailed)throw new Error('Encrypted local changes have not been saved.');
    const result=await SantaVault.changePassphrase(session,$('oldPin').value,$('newPin').value);
    session=result.session;state=normalizeState(result.data);
    $('changeDialog').close();render();
    await refreshSyncStatus();
    $('syncInfo').textContent='Passphrase changed locally. Sync now to update your GitHub backup.';
  }catch(err){$('changeError').textContent=err.message;}
  finally{vaultBusy=false;b.disabled=false;for(const id of ['oldPin','newPin','newPinConfirm'])$(id).value='';}
});
function downloadGuestBackup(){
  if(signedIn())return;
  const event=active();
  const serialized=JSON.stringify({format:'secret-santa-guest-v1',event},null,2);
  const file=new Blob([serialized],{type:'application/json'});
  const url=URL.createObjectURL(file);
  const a=document.createElement('a');a.href=url;
  const safeName=(event.name.trim()||'secret-santa').replace(/[^a-z0-9-]+/gi,'-').slice(0,45);
  a.download=(safeName||'secret-santa')+'-backup.json';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('guestDownload').onclick=downloadGuestBackup;
$('menuGuestDownload').onclick=()=>{$('siteMenu').open=false;downloadGuestBackup();};
$('menuGuestImport').onclick=()=>{if(signedIn())return;$('siteMenu').open=false;$('guestBackupFile').click();};
$('guestBackupFile').addEventListener('change',async()=>{
  if(signedIn())return;
  const file=$('guestBackupFile').files?.[0];$('guestBackupFile').value='';
  if(!file)return;
  try {
    if(file.size>1024*1024)throw new Error('The backup file is too large (maximum 1 MB).');
    const data=JSON.parse(await file.text());
    if(data?.format!=='secret-santa-guest-v1')throw new Error('Select a Secret Santa guest backup JSON file.');
    const event=sanitizeGuestEvent(data.event);
    if(!confirm('Replace the current guest event with the event from this backup? Any unsaved guest edits will be lost.'))return;
    state={events:[event],active:event.id,endpoint:state.endpoint||''};
    revealed.clear();save();render();
  }catch(err){alert('Could not restore guest backup: '+err.message);}
});
$('menuSmsSettings').onclick=()=>{$('siteMenu').open=false;settings();};
document.addEventListener('click',event=>{const menu=$('siteMenu');if(menu.open&&!menu.contains(event.target))menu.open=false;});
document.addEventListener('keydown',event=>{if(event.key==='Escape')$('siteMenu').open=false;});
state=loadGuest();
updateViewMode();
render();
function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
function button(text,cls,fn){const b=node('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;}
function money(b){return b===''?'No spending limit':Number(b).toLocaleString('en-US',{style:'currency',currency:'USD'});}
function picker(){const s=$('eventSelect');s.replaceChildren();for(const e of state.events){const o=node('option','',(e.name.trim()||'Untitled event')+(e.draw?' • Drawn':''));o.value=e.id;s.append(o);}s.value=active().id;}
function render(){const e=active();picker();$('setup').hidden=!!e.draw;$('results').hidden=!e.draw;$('drawError').textContent='';$('addError').textContent='';if(e.draw){renderResults();return;}$('eventName').value=e.name;$('budget').value=e.budget;$('noSelf').checked=e.noSelf;$('mutual').checked=e.mutual;renderPeople();renderExclusions();}
function renderPeople(){const e=active(), p=$('people');p.replaceChildren();$('count').textContent=e.names.length+' people';if(!e.names.length)p.append(node('p','empty','No participants yet. Add your family above.'));
e.names.forEach((name,i)=>{const row=node('div','person');const remove=button('×','danger',()=>{e.names.splice(i,1);e.exclusions.splice(i,1);e.exclusions=e.exclusions.map(a=>a.filter(j=>j!==i).map(j=>j>i?j-1:j));save();renderPeople();renderExclusions();});remove.setAttribute('aria-label','Remove '+name);const edit=button('Edit','',()=>{const next=prompt('Edit participant name',name);if(next===null)return;const v=next.trim();if(!v||v.length>80||e.names.some((x,j)=>i!==j&&x.toLowerCase()===v.toLowerCase())){alert('Use a unique name from 1 to 80 characters.');return;}e.names[i]=v;save();renderPeople();renderExclusions();});const controls=node('div','actions');controls.append(edit,remove);row.append(node('span','',name),controls);p.append(row);});}
function renderExclusions(){const e=active(), root=$('exclusions');root.replaceChildren();renderHistory();if(e.names.length<2){root.append(node('p','empty','Add at least two people to set exclusions.'));return;}
e.names.forEach((name,i)=>{const d=node('details','ex-row'), title=node('summary',''), body=node('div','ex-options');const refresh=()=>{title.textContent=name+' — '+e.exclusions[i].length+' excluded';};refresh();d.append(title,body);e.names.forEach((other,j)=>{if(i===j)return;const label=node('label','check'), c=node('input');c.type='checkbox';c.checked=e.exclusions[i].includes(j);c.dataset.from=i;c.dataset.to=j;c.addEventListener('change',()=>{function set(a,b,on){e.exclusions[a]=e.exclusions[a].filter(x=>x!==b);if(on)e.exclusions[a].push(b);}set(i,j,c.checked);if(e.mutual){set(j,i,c.checked);const reverse=root.querySelector('input[data-from="'+j+'"][data-to="'+i+'"]');if(reverse){reverse.checked=c.checked;reverse.closest('details').querySelector('summary').textContent=e.names[j]+' — '+e.exclusions[j].length+' excluded';}}refresh();save();});label.append(c,document.createTextNode(other));body.append(label);});root.append(d);});}
function renderHistory(){
  const e=active(), checkbox=$('avoidPrevious'), controls=$('previousControls'), dropdown=$('previousEvent'), summary=$('previousSummary');
  checkbox.checked=!!e.avoidPrevious;
  controls.hidden=!e.avoidPrevious;
  dropdown.replaceChildren();
  const empty=node('option','','Select a previous event');empty.value='';dropdown.append(empty);
  const completed=state.events.filter(x=>x.id!==e.id&&Array.isArray(x.draw)&&x.draw.length===x.names.length);
  completed.forEach(x=>{const option=node('option','',x.name.trim()||'Untitled event');option.value=x.id;dropdown.append(option);});
  dropdown.value=completed.some(x=>x.id===e.previousEventId)?e.previousEventId:'';
  dropdown.disabled=!completed.length;
  summary.replaceChildren();
  if(!e.avoidPrevious)return;
  if(!completed.length){summary.append(node('p','error','No other completed events under this PIN. Draw another event first.'));return;}
  const old=completed.find(x=>x.id===e.previousEventId);
  if(!old){summary.append(node('p','help','Choose an event above to check name matches.'));return;}
  const matched=previousMatches(e,old);
  summary.append(node('p','help',matched.matched.length+' matches will be excluded from the new drawing. '+matched.unmatched.length+' names were not matched.'));
  if(matched.matched.length){const details=node('details','history-details'),heading=node('summary','','Matched previous recipients'),list=node('ul','history-list');matched.matched.forEach(m=>list.append(node('li','',m.giver+' → '+m.recipient)));details.append(heading,list);summary.append(details);}
  if(matched.unmatched.length){const details=node('details','history-details'),heading=node('summary','','Unmatched names — check spelling'),list=node('ul','history-list');details.open=true;matched.unmatched.forEach(m=>list.append(node('li','',m.giver+': '+m.reason+(m.recipient?' ('+m.recipient+')':''))));details.append(heading,list);summary.append(details);}
}
$('avoidPrevious').addEventListener('change',()=>{if(!signedIn())return;active().avoidPrevious=$('avoidPrevious').checked;save();renderHistory();});
$('previousEvent').addEventListener('change',()=>{if(!signedIn())return;active().previousEventId=$('previousEvent').value;save();renderHistory();});
function effectiveExclusions(e){
  const combined=e.exclusions.map(ex=>ex.slice());
  if(!signedIn()||!e.avoidPrevious)return combined;
  const old=state.events.find(x=>x.id===e.previousEventId&&x.id!==e.id&&Array.isArray(x.draw));
  if(!old)return null;
  const matches=previousMatches(e,old);
  matches.exclusions.forEach((ex,i)=>ex.forEach(j=>{if(!combined[i].includes(j))combined[i].push(j);}));
  return combined;
}
$('addForm').addEventListener('submit',ev=>{ev.preventDefault();const e=active(), names=$('newNames').value.split(/\r?\n/).map(n=>n.trim()).filter(Boolean), skipped=[];for(const n of names){if(n.length>80||e.names.length>=100||e.names.some(x=>x.toLowerCase()===n.toLowerCase())){skipped.push(n);continue;}e.names.push(n);e.exclusions.push([]);}$('addError').textContent=skipped.length?'Skipped duplicate, overlong or excess names: '+skipped.join(', '):'';$('newNames').value='';save();renderPeople();renderExclusions();});
$('eventName').addEventListener('input',()=>{active().name=$('eventName').value;save();picker();});
$('budget').addEventListener('input',()=>{active().budget=$('budget').value;save();});
$('noSelf').addEventListener('change',()=>{active().noSelf=$('noSelf').checked;save();});
$('mutual').addEventListener('change',()=>{active().mutual=$('mutual').checked;save();});
$('eventSelect').addEventListener('change',()=>{if(!signedIn())return;state.active=$('eventSelect').value;revealed.clear();save();render();});
$('newEvent').onclick=()=>{
  if(!signedIn()){
    const old=active();
    if((old.names.length||old.name.trim()||old.draw)&&!confirm('Start a new guest event? This replaces the current one on this device. Download a backup first if you want to keep it.'))return;
    const e=makeEvent();state={events:[e],active:e.id,endpoint:state.endpoint||''};
    revealed.clear();save();render();$('eventName').focus();return;
  }
  const e=makeEvent();state.events.push(e);state.active=e.id;revealed.clear();save();render();$('eventName').focus();
};
$('duplicateEvent').onclick=()=>{if(!signedIn())return;const old=active(), next=makeEvent();const year=old.name.match(/\b(20\d{2})\s*$/);next.name=old.name.replace(/\s+\d{4}\s*$/, '')+' '+(year?Number(year[1])+1:new Date().getFullYear()+1);next.name=next.name.trim();next.budget=old.budget;next.noSelf=old.noSelf;next.mutual=old.mutual;next.names=old.names.slice();next.exclusions=old.exclusions.map(a=>a.slice());next.avoidPrevious=!!old.draw;next.previousEventId=old.draw?old.id:'';state.events.push(next);state.active=next.id;revealed.clear();save();render();$('eventName').focus();};
$('deleteEvent').onclick=()=>{if(!signedIn())return;if(!confirm('Delete this event and all its saved assignments?'))return;state.events=state.events.filter(e=>e.id!==active().id);if(!state.events.length)state.events.push(makeEvent());state.active=state.events[0].id;revealed.clear();save();render();};
$('draw').onclick=()=>{const e=active(), err=$('drawError');err.textContent='';if(!e.name.trim()){err.textContent='Enter an event name first.';$('eventName').focus();return;}if(!$('budget').checkValidity()){err.textContent='Enter a valid nonnegative spending limit, or leave blank.';$('budget').reportValidity();return;}if(e.names.length<2){err.textContent='Add at least two participants.';return;}const exclusions=effectiveExclusions(e);if(!exclusions){err.textContent='Choose a completed previous event or turn off previous-event exclusions.';return;}const p=drawAssignments(e.names,exclusions,e.noSelf,()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296);if(!p){err.textContent='No valid drawing is possible with these exclusions. Remove an exclusion or add participants and try again.';return;}e.draw=p;e.sent={};revealed.clear();save();render();$('results').scrollIntoView({behavior:'smooth'});};
function eyeIcon(open){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'+(open?'<path d="m3 3 18 18"/>':'')+'</svg>';}
function renderResults(){const e=active();$('resultTitle').textContent=e.name;$('resultMeta').textContent=e.names.length+' participants · '+money(e.budget)+(e.budget!==''?' limit':'');const root=$('resultRows');root.replaceChildren();e.names.forEach((name,i)=>{const row=node('div','result-row'), giver=node('div','giver');giver.append(node('span','row-label','Participant'),document.createTextNode(name));const as=node('div','assignment'), value=node('span','recipient'), eye=button('','eye',()=>{if(revealed.has(i))revealed.delete(i);else revealed.add(i);refresh();});function refresh(){const open=revealed.has(i);value.classList.toggle('blurred',!open);value.textContent=open?e.names[e.draw[i]]:'Secret name';value.setAttribute('aria-label',open?value.textContent:'Hidden assignment');eye.innerHTML=eyeIcon(open);eye.setAttribute('aria-label',(open?'Hide':'Reveal')+' assignment for '+name);eye.setAttribute('aria-pressed',String(open));}refresh();as.append(value,eye);const actions=node('div','text-actions');const sent=e.sent[i];actions.append(button(sent?'Text again':'Send text','',()=>openText(i)));if(sent)actions.append(node('span','status',sent==='manual'?'Marked sent':'SMS accepted'));row.append(giver,as,actions);root.append(row);});$('sentProgress').textContent=Object.keys(e.sent).length+' of '+e.names.length+' notifications sent or marked sent.';}
$('hideAll').onclick=()=>{revealed.clear();renderResults();};
$('resetDraw').onclick=()=>{if(!confirm('Discard all current assignments? Any previously sent texts will not be recalled.'))return;active().draw=null;active().sent={};revealed.clear();save();render();};
function message(e,i){return 'Merry Christmas, '+e.names[i]+'! For '+e.name+', you are Secret Santa for '+e.names[e.draw[i]]+'. '+(e.budget===''?'':'Gift spending limit: '+money(e.budget)+'. ')+'Keep it a secret!';}
function normalizePhone(s){s=s.trim();if(!/^[+\d\s().-]+$/.test(s))return null;const digits=s.replace(/\D/g,'');if(s.startsWith('+'))return /^[1-9]\d{7,14}$/.test(digits)?'+'+digits:null;if(digits.length===10)return '+1'+digits;if(digits.length===11&&digits.startsWith('1'))return '+'+digits;return null;}
function updateMode(){const direct=!!state.endpoint;$('textMode').textContent=direct?'Direct SMS from your configured sender. Your personal Messages app will not open.':'Device SMS mode: opens your Messages app with the assignment filled in. You must send it manually; it may appear in your conversation history.';$('keyLabel').hidden=!direct;$('smsKey').required=direct;$('smsKey').value=accessKey;$('send').textContent=direct?'Send text':'Open Messages';$('markManual').hidden=true;}
function openText(i){textIndex=i;$('textTitle').textContent='Text '+active().names[i];$('phone').value='';$('textStatus').textContent='';updateMode();$('textDialog').showModal();}
function markSent(kind){active().sent[textIndex]=kind;save();$('textDialog').close();renderResults();}
$('textForm').addEventListener('submit',async ev=>{ev.preventDefault();if(sending)return;const phone=normalizePhone($('phone').value), status=$('textStatus');if(!phone){status.textContent='Enter a valid US number or international number with country code.';return;}const e=active(), body=message(e,textIndex);if(e.sent[textIndex]&&!confirm('This participant already has a notification recorded. Send another?'))return;if(!state.endpoint){const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);location.href='sms:'+phone+(ios?'&':'?')+'body='+encodeURIComponent(body);$('markManual').hidden=false;status.textContent='After sending in Messages, return here and select “I sent it”.';return;}accessKey=$('smsKey').value.trim();if(!accessKey){status.textContent='Enter your SMS access key.';return;}sending=true;$('send').disabled=true;$('markManual').hidden=true;status.textContent='Sending…';try{const res=await fetch(state.endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+accessKey},body:JSON.stringify({to:phone,body}),signal:AbortSignal.timeout(20000)});const result=await res.json();if(!res.ok||!result.ok)throw new Error(result.error||'SMS request failed.');markSent('direct');}catch(err){status.textContent='Could not confirm the send: '+err.message+' Check your provider before retrying.';}finally{sending=false;$('send').disabled=false;}});
$('markManual').onclick=()=>markSent('manual');
function settings(){if(sending)return;if($('textDialog').open)$('textDialog').close();$('endpoint').value=state.endpoint||'';$('settingsError').textContent='';$('settingsDialog').showModal();}
$('smsSettings').onclick=settings;$('openSmsSettings').onclick=settings;
$('settingsForm').addEventListener('submit',ev=>{ev.preventDefault();const v=$('endpoint').value.trim();if(v){try{const u=new URL(v);if(u.protocol!=='https:'||u.username||u.password||u.hash||u.search)throw Error();}catch{$('settingsError').textContent='Enter an HTTPS endpoint URL without credentials, query or fragment.';return;}}if(v!==state.endpoint)accessKey='';state.endpoint=v;save();$('settingsDialog').close();});
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{if(!sending&&!syncing)$(b.dataset.close).close();});
$('textDialog').addEventListener('cancel',e=>{if(sending)e.preventDefault();});
