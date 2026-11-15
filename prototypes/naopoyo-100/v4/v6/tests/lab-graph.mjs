import {createHash} from 'node:crypto';
export function graphDigest(initial, step) {
 const key=s=>JSON.stringify({...s,moves:0}), queue=[initial],seen=new Set([key(initial)]),lines=[];
 for(let i=0;i<queue.length;i++){
  if(queue.length>20000)throw Error('Graph cap: no equivalence claim');
  const s=queue[i];for(const actor of s.actors)for(const[dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]])for(const type of s.variant==='D2'?['move','dig']:['move']){
   const a={type,id:actor.id,dx,dy},r=step(s,a);lines.push(key(s)+'|'+JSON.stringify(a)+'|'+(r.ok?key(r.state):'blocked'));
   if(r.ok&&!seen.has(key(r.state))){seen.add(key(r.state));queue.push(r.state)}
  }
 }
 return{states:seen.size,transitions:lines.length,sha256:createHash('sha256').update(lines.sort().join('\n')).digest('hex')};
}
