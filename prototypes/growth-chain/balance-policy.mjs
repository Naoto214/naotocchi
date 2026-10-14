// Measurement only. No imports from the game UI. Only visible board/NEXT/resources.
import {evaluate,itemActions,publicView,chooseAction} from './policy.mjs';
import {createBag} from './random.mjs';import {applyAction,placements,spawnPose} from './session.mjs';import {toolTransaction} from './live-tools.mjs';
export const BALANCE_POLICY_VERSION='life-cycle-beam3-v1';
export function featureValue(s,policy){
 if(s.over)return -1e9;
 let v=evaluate({...s,last:undefined}),high=[];
 for(let y=2;y<s.board.length;y++)for(let x=0;x<s.rules.width;x++){const c=s.board[y][x];if(!c)continue;v+=[0,0,1,3,8,20,45,90,180][c.s];if(c.s>=5)high.push({...c,x,y});}
 for(let i=0;i<high.length;i++)for(let j=i+1;j<high.length;j++){const a=high[i],b=high[j];if(Math.abs(a.s-b.s)<=1)v+=Math.min(a.s,b.s)*8*(a.k===b.k?1:.7)/(1+Math.abs(a.x-b.x)+Math.abs(a.y-b.y));}
 v+=s.gauge*.8+s.eggs.reduce((n,e,i)=>n+e*(policy==='cycle'?4:8)*2**i,0);
 return v;
}
function reward(z){return z.last.eggs.reduce((a,b)=>a+b,0)*800+z.last.created08*60+z.last.waves.length*16;}
function candidates(s,policy,allowItems){
 const rows=[];const baseline=featureValue(s,policy);
 for(const a of [...placements(s),...(allowItems?itemActions(s,'both'):[])]){
  let z;try{z=a.type==='drop'?applyAction(s,a,false):toolTransaction(s,spawnPose(s.rules),a).state;}catch{continue;}
  const event=reward(z),value=featureValue(z,policy)+event;
  if(a.type!=='drop'){
   if(policy==='life'&&a.type==='transform'&&s.gauge<3*s.rules.gaugeUnit&&!z.last.deaths&&!z.last.created08)continue;
   if(value<=baseline+4||z.over)continue;
  }
  rows.push({a,z,event,value});
 }
 return rows.sort((a,b)=>b.value-a.value);
}
export function chooseBalance(input,policy,{allowItems=true}={}){
 const s={...publicView(input),bag:createBag(0,input.rules)};
 if(policy==='ordinary')return chooseAction(s,'strategic',{state:0},{items:'none'});
 if(policy==='chain'){
  return placements(s).map(a=>{const z=applyAction(s,a,false);return {a,v:evaluate(z)+z.last.waves.length*32+z.last.gauge*5};}).sort((a,b)=>b.v-a.v)[0]?.a??null;
 }
 if(!['life','active','cycle'].includes(policy))throw Error('Unknown balance policy');
 const rows=candidates(s,policy,allowItems);if(!rows.length)return null;
 if(policy==='cycle'&&s.board.flat().some(c=>c?.s>=6)){
  const beam=rows.slice(0,3);
  for(const row of beam){const follows=candidates(row.z,policy,allowItems);row.value=follows.length?.25*row.value+.75*(row.event+follows[0].value):row.value;}
  beam.sort((a,b)=>b.value-a.value);return beam[0].a;
 }
 return rows[0].a;
}
