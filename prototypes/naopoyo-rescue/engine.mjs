export const clone=v=>JSON.parse(JSON.stringify(v));
export const mass=s=>s.rescued+s.actors.reduce((n,a)=>n+2**(a.level-1),0);
export const complete=s=>s.actors.length===0&&s.gates.every(g=>!g.required||g.open);
export function createState(stage){return {...clone(stage),rescued:0,nextId:1,moves:0};}
const at=(list,x,y)=>list.find(a=>a.x===x&&a.y===y);
const matches=(a,t)=>(!t.species||t.species===a.species)&&(!t.exact||t.exact===a.level)&&(!t.min||a.level>=t.min)&&(!t.max||a.level<=t.max);
const wall=(s,x,y)=>x<0||x>=s.w||y<0||y>=s.h||s.walls.some(p=>p[0]===x&&p[1]===y);
const support=(s,x,y)=>wall(s,x,y)||!!at(s.actors,x,y)||s.gates.some(g=>g.x===x&&g.y===y&&!g.open);
export function move(s,id,dx,dy,fall=false){
 const a=s.actors.find(a=>a.id===id); if(!a||Math.abs(dx)+Math.abs(dy)!==1)return false;
 const x=a.x+dx,y=a.y+dy;
 if(wall(s,x,y))return false;
 if(s.gravity&&!fall&&dy<0&&(!support(s,a.x,a.y+1)||!(support(s,a.x-1,a.y)||support(s,a.x+1,a.y))))return false;
 const target=at(s.actors,x,y),gate=at(s.gates,x,y),exit=at(s.exits,x,y);
 if(target&&(target.species!==a.species||target.level!==a.level||a.level>=8))return false;
 const prospective={...a,level:a.level+(target?1:0)};
 if(gate&&!gate.open&&!matches(prospective,gate)||exit&&!matches(prospective,exit))return false;
 const prev={x:a.x,y:a.y};
 if(target){s.actors=s.actors.filter(v=>v.id!==target.id);a.level++;}
 a.x=x;a.y=y; if(gate)gate.open=true;
 if(exit){s.rescued+=2**(a.level-1);s.actors=s.actors.filter(v=>v.id!==id);}
 else if(s.spikes.some(p=>p[0]===x&&p[1]===y)&&a.level>1){
  a.level--;let childId;do{childId=`child${s.nextId++}`}while(s.actors.some(v=>v.id===childId));
  s.actors.push({...a,...prev,id:childId});
 }
 s.moves++;return true;
}
export function release(s){
 if(!s.gravity)return true; const backup=clone(s); const seen=new Set();
 for(let i=0;i<2048;i++){
  const key=JSON.stringify(s.actors.map(a=>[a.species,a.level,a.x,a.y]).sort());
  if(seen.has(key)){Object.assign(s,backup);return false}seen.add(key);
  let changed=false;
  for(const a of [...s.actors].sort((a,b)=>b.y-a.y||a.x-b.x)) if(move(s,a.id,0,1,true))changed=true;
  if(!changed)return true;
 }
 Object.assign(s,backup);return false;
}
export function validState(stage,s){
 try{
 if(s.id!==stage.id||s.w!==stage.w||s.h!==stage.h||!Number.isSafeInteger(s.rescued)||s.rescued<0||!Number.isSafeInteger(s.nextId)||s.nextId<1||!Number.isSafeInteger(s.moves)||s.moves<0)return false;
 for(const k of ['walls','exits','spikes','gravity'])if(JSON.stringify(s[k])!==JSON.stringify(stage[k]))return false;
 if(s.gates.length!==stage.gates.length||s.gates.some((g,i)=>(g.open!==undefined&&typeof g.open!=='boolean')||JSON.stringify({...g,open:false})!==JSON.stringify({...stage.gates[i],open:false})))return false;
 const ids=new Set(),cells=new Set();
 for(const a of s.actors){const cell=`${a.x},${a.y}`;if(typeof a.id!=='string'||ids.has(a.id)||cells.has(cell)||!['dog','fish'].includes(a.species)||!Number.isInteger(a.level)||a.level<1||a.level>8||!Number.isInteger(a.x)||!Number.isInteger(a.y)||wall(s,a.x,a.y)||at(s.exits,a.x,a.y)||s.gates.some(g=>g.x===a.x&&g.y===a.y&&!g.open))return false;ids.add(a.id);cells.add(cell)}
 return mass(s)===mass(createState(stage));
 }catch{return false}
}
