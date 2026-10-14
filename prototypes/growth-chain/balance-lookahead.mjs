// Follow-up policy, separate from the immutable first edition.
import {chooseBalance,featureValue} from './balance-policy.mjs';import {publicView} from './policy.mjs';import {createBag} from './random.mjs';import {applyAction,placements,spawnPose} from './session.mjs';import {toolTransaction} from './live-tools.mjs';
const reward=z=>800*z.last.eggs.reduce((a,b)=>a+b,0)+60*z.last.created08+16*z.last.waves.length;
export function chooseLife2(input,options={}){
 const s={...publicView(input),bag:createBag(0,input.rules)},first=chooseBalance(s,'life',options);if(!first||!s.board.flat().some(c=>c?.s>=6))return first;
 const rows=placements(s).map(a=>{const z=applyAction(s,a,false);return {a,z,v:featureValue(z,'life')+reward(z)};}).sort((a,b)=>b.v-a.v).slice(0,3);
 if(first.type!=='drop'){const z=toolTransaction(s,spawnPose(s.rules),first).state;rows.push({a:first,z,v:featureValue(z,'life')+reward(z)});}
 for(const r of rows){const a=chooseBalance(r.z,'life',options);if(!a)continue;const z=a.type==='drop'?applyAction(r.z,a,false):toolTransaction(r.z,spawnPose(r.z.rules),a).state;r.v=.25*r.v+.75*(featureValue(z,'life')+reward(r.z)+reward(z));}
 return rows.sort((a,b)=>b.v-a.v)[0]?.a??first;
}
