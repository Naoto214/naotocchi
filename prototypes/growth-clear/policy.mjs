import {placements,applyAction} from './session.mjs';
import {itemActions} from '../growth-chain/policy.mjs';
import {createBag} from './bag.mjs';
import {random} from '../growth-chain/random.mjs';
const life=[0,1,3,7,16,36,80,180,400];
export function targetX(s,position='adaptive'){
 if(position==='left')return 0;if(position==='right')return 5;if(position==='center')return 2.5;
 let best=null;for(let y=2;y<14;y++)for(let x=0;x<6;x++){const c=s.board[y][x];if(c?.k===0&&(!best||c.s>best.s))best={x,s:c.s};}return best?.x??2.5;
}
export function anchorChooser(s,position){const target=targetX(s,position);return g=>[...g].sort((a,b)=>Math.abs(a.x-target)-Math.abs(b.x-target)||b.y-a.y||a.id-b.id)[0].id;}
export function evaluate(s,{policy='focus',position='adaptive'}={}){
 if(s.over)return -1e8;let v=0,count=0,heights=Array(6).fill(0);const target=targetX(s,position);
 for(let y=2;y<14;y++)for(let x=0;x<6;x++){const c=s.board[y][x];if(!c)continue;count++;heights[x]=Math.max(heights[x],14-y);
  const focus=policy==='focus'||policy==='beam'||policy==='active'||policy==='reserve';
  const weight=focus?(c.k===0?1.6:.7):1;
  v+=life[c.s]*weight;
  if(c.k===0)v-=life[c.s]*.09*Math.abs(x-target);
  if(policy==='protect'&&c.s>=5)v+=life[c.s]*.5;
  for(const [dx,dy] of [[1,0],[0,-1]]){const n=s.board[y+dy]?.[x+dx];if(n&&n.k===c.k&&Math.abs(n.s-c.s)===1)v+=Math.min(life[c.s],life[n.s])*.25;}
 }
 v-=count*(policy==='clear'?12:3)+Math.max(...heights)*4+heights.reduce((a,h)=>a+h*h,0)*.5;
 v+=Math.min(64,s.gauge)*.7+s.eggs.reduce((a,n,i)=>a+Math.min(n,8)*2**(i+1),0);
 return v;
}
function eventValue(z,p){return (z.last.deaths?100000:0)+z.last.created08*100+z.last.waves.length*(p==='chain'?100:8)+(p==='clear'?z.last.mixedRemoved*15:0)-(p==='protect'?z.last.mixedHigh*70:0);}
function rank(s,o,allowItems){
 const chooser=anchorChooser(s,o.position),baseline=evaluate(s,o),out=[];
 const actions=[...placements(s),...(allowItems?itemActions(s,'both'):[])];
 for(const a of actions){
  if(o.policy==='reserve'&&a.type!=='drop'&&s.board.flat().filter(Boolean).length<36&&s.gauge<6*s.rules.gaugeUnit&&!s.board.flat().some(c=>c?.s===8))continue;
  let z;try{z=applyAction(s,a,false,{choose:chooser});}catch{continue;}
  const ev=eventValue(z,o.policy),value=evaluate(z,o)+ev-(a.type==='drop'?0:3);
  if(a.type!=='drop'&&(z.over||value<=baseline+(o.policy==='active'?0:6)))continue;
  out.push({a:{...a,...(Object.keys(z.last.choices).length?{choices:z.last.choices}:{})},z,value,event:ev});
 }
 return out.sort((a,b)=>b.value-a.value);
}
export function chooseAction(input,options={}){
 const o={policy:'focus',position:'adaptive',items:true,...options};
 // Hidden bag/seed never inform ranking; <=3 drops uses only current + NEXT3.
 const s={...input,seed:0,bag:createBag(0)};
 if(o.policy==='random'){const moves=placements(s),rng={state:(input.drops*1664525+1013904223)>>>0};return moves[Math.floor(random(rng)*moves.length)]??null;}
 const rows=rank(s,o,o.items);if(!rows.length)return null;
 if(o.policy!=='beam')return rows[0].a;
 const beam=rows.slice(0,3);
 for(const row of beam){const next=rank(row.z,o,false).slice(0,2);let best=-1e8;for(const n of next){const last=rank(n.z,o,false)[0];best=Math.max(best,row.event+n.event+(last?last.value:n.value));}row.value=best;}
 return beam.sort((a,b)=>b.value-a.value)[0].a;
}
