// Structured motif/number variations; no random obstacle filling.
const a=(id,x,y,level)=>({id,x,y,level,species:'dog'});
const motifs=[
 ['crown',[[2,7],[4,6],[5,5],[5,6],[7,5],[7,6]],[{x:2,y:6,power:3},{x:6,y:5,power:2}],[{x:3,y:7,exact:8}]],
 ['bridge',[[2,6],[4,6],[5,5],[5,6],[7,5],[7,6]],[{x:3,y:6,power:3},{x:6,y:5,power:2}],[{x:2,y:7,exact:8}]],
 ['steps',[[2,7],[4,5],[4,6],[6,4],[6,5],[6,6]],[{x:2,y:6,power:2},{x:5,y:5,power:1}],[{x:3,y:7,exact:8}]],
 ['chamber',[[3,0],[3,1],[3,2],[3,3],[3,4],[3,5],[3,6],[5,6],[6,5],[6,6]],[{x:4,y:6,power:3},{x:7,y:6,power:2}],[{x:3,y:7,exact:8}]],
];
export function generateFinalCandidates(){const out=[];for(const [name,walls,spikes,gates]of motifs)for(const n of [4,5,6,7,8]){
 const s={w:8,h:8,gravity:true,water:[],guests:[],events:[],id:name+'-'+n,walls,spikes,gates,actors:[a('a',0,7,8),a('b',1,7,n)],exits:[{x:7,y:7,exact:8},{x:name==='steps'?6:5,y:name==='steps'?3:4,exact:n}]};
 if(name==='chamber')s.actors=[a('a',0,7,6),a('b',1,7,6),a('c',2,7,4)],s.exits=[{x:6,y:4,exact:n},{x:7,y:7,exact:16-n>8?3:16-n}];
 out.push(s);
}
const base=out.find(s=>s.id==='chamber-7');
for(const [name,gates] of [['five',[{x:5,y:5,exact:5}]],['one',[{x:7,y:5,exact:1}]],['two',[{x:5,y:5,exact:5},{x:7,y:5,exact:1}]],['three',[{x:5,y:5,exact:3},{x:7,y:5,exact:1}]],['seven',[{x:5,y:5,exact:7},{x:7,y:5,exact:1}]],['four',[{x:5,y:5,exact:4}]],['three-alone',[{x:5,y:5,exact:3}]]])out.push({...structuredClone(base),id:'final-'+name,gates:[...base.gates,...gates]});return out;}
// Auditing revealed a legal outside route around the first upper gates.
// Sealed variants failed because the 7 exit left no assembly cell; these
// variants add a landing cell below the exit and a rock below the right gate.
export function generateAssemblyCandidates(){
 const base=generateFinalCandidates().find(s=>s.id==='final-three');
 return [[3,4],[1,3],[2,5],[3,1],[1,6]].map(([l,r])=>{
  const s=structuredClone(base);s.id=`assembly-${l}-${r}`;s.walls=s.walls.filter(([x,y])=>!(x===3&&y<4));s.walls.push([4,5],[4,4],[7,6]);s.spikes[1]={x:6,y:7,power:2};s.exits[0].y=3;s.gates[1].exact=l;s.gates[2].exact=r;return s;
 });
}
export function generateLedgeCandidates(){
 const base=generateAssemblyCandidates().find(s=>s.id==='assembly-1-3');
 return [[3,1],[3,4],[2,5]].map(([l,r])=>{const s=structuredClone(base);s.id=`ledge-lift-${l}-${r}`;s.walls=s.walls.filter(([x,y])=>!(x===6&&y===6));s.spikes[1].y=6;s.gates[1].exact=l;s.gates[2].exact=r;return s});
}
