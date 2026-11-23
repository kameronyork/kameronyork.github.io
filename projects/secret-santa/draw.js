function drawAssignments(names, exclusions, noSelf, random=Math.random) {
  const n=names.length;
  if(n<2) return null;
  function shuffle(a) { for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a; }
  const indices=Array.from({length:n},(_,i)=>i);
  const allowed=indices.map(i=>indices.filter(j=>(!noSelf||i!==j)&&!(exclusions[i]||[]).includes(j)));
  if(allowed.some(a=>!a.length)) return null;
  // Rejection sampling gives a uniform valid permutation when it succeeds.
  for(let t=0;t<400;t++){const p=shuffle(indices.slice());if(p.every((j,i)=>allowed[i].includes(j)))return p;}
  // Augmenting paths find a valid perfect matching whenever one exists.
  const owner=Array(n).fill(-1), edges=allowed.map(a=>shuffle(a.slice()));
  function augment(i,seen){for(const j of edges[i]){if(seen.has(j))continue;seen.add(j);if(owner[j]===-1||augment(owner[j],seen)){owner[j]=i;return true;}}return false;}
  for(const i of shuffle(indices.slice()))if(!augment(i,new Set()))return null;
  const result=Array(n);owner.forEach((i,j)=>{result[i]=j;});return result;
}
if(typeof module!=='undefined')module.exports={drawAssignments};
