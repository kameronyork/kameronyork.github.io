const assert=require('node:assert/strict');
const {drawAssignments}=require('./draw.js');
function check(ex,noSelf,possible){const n=ex.length,names=Array.from({length:n},(_,i)=>String(i));const p=drawAssignments(names,ex,noSelf);assert.equal(Boolean(p),possible);if(p){assert.equal(new Set(p).size,n);p.forEach((j,i)=>{assert.ok(j>=0&&j<n);assert.ok(!ex[i].includes(j));if(noSelf)assert.notEqual(i,j);});}}
for(let i=0;i<300;i++){check([[1],[0],[3],[2],[],[]],true,true);check([[1],[0]],true,false);check([[1],[0]],false,true);check([[2],[2],[0]],true,false);check(Array.from({length:12},(_,i)=>Array.from({length:12},(_,j)=>j).filter(j=>j!==(i+1)%12)),true,true);}
console.log('1500 drawing checks passed');
