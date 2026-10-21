/** Explicit multistage inspection programs. Inspected cards remain in their zone until moved. */
import {CATALOG} from './full-catalog.mjs';
const rule=(mode,n,extra={})=>({mode:'quick',steps:[{op:'inspect',mode,n}],...extra});
export const INSPECTION_RULES={
 'G-blackjack-21':rule('blackjack',3),
 'G-voxel-mine':rule('voxel',5),
 'G-yacht-dice':rule('yacht',3),
 'G-fp-dungeon':rule('fp',2),
 'G-match-3':rule('match',3),
 'G-road-themed':rule('road',3),
 'G-roguelike-dungeon':rule('rogue',4),
 'G-fruit-slice':rule('fruit',4),
 'G-minesweeper-8':rule('mines',3,{target:'opponentFaceUpAction'}),
 'G-snake-classic':rule('snake',3)
};
const other=a=>a==='A'?'B':'A';
const info=(s,id)=>CATALOG[s.cards[id]?.cardId];
const action=c=>['play','item','event'].includes(c?.type);
export function validMinesweeperTarget(s,l){return s.cards[l.target]?.owner===other(l.actor)&&s.cards[l.target]?.generation===l.targetGeneration&&s.players[other(l.actor)].board.prepared.some(e=>e.id===l.target&&!e.faceDown)&&action(info(s,l.target));}
function move(s,l,q,id,destination){const p=s.players[l.actor],zone=q.mode==='snake'?'hand':'deck',i=p[zone].indexOf(id);if(i<0||s.cards[id].generation!==q.generations[id])return false;p[zone].splice(i,1);p[destination].push(id);q.ids=q.ids.filter(x=>x!==id);l.applied=true;return true;}
function choose(s,l,q,stage,ids,actor=l.actor,extra=[]){s.choice={actor,kind:'inspect_'+stage,resume:'program',link:l,peek:[...q.ids],inspection:q,options:[...ids.map(id=>({id,label:info(s,id).name})),...extra.map(id=>({id,label:({done:'終了',continue:'続ける',stop:'止める',take:'手札に加える',skip:'捨て札に置く',redraw:'全部戻して引く',self:'自分が1枚選ぶ',opponent:'相手が2枚選ぶ'})[id]}))]};s.phase='choice';return true;}
function reveal(s,l,ids,h){if(ids.length){l.applied=true;h.log(s,'公開：'+ids.map(id=>info(s,id).name).join(' / '));}}
function order(s,l,q,h){if(q.ids.length)return choose(s,l,q,'order',q.ids);if(q.redraw)s.program.steps.unshift({op:'draw',n:1});return false;}
function take(s,l,q,h){const eligible=q.ids.filter(id=>id!==q.blocked&&(q.mode!=='mines'||action(info(s,id))&&info(s,id).cost<=q.maxCost));if(q.taken<q.max&&eligible.length)return choose(s,l,q,'take',eligible,q.actor??l.actor,q.taken>=q.min?['done']:[]);return order(s,l,q,h);}
function voxelNext(s,l,q,h){const p=s.players[l.actor];if(q.seen>=q.n||!p.deck.length)return false;const id=p.deck[0];q.ids=[id];q.generations[id]=s.cards[id].generation;q.seen++;reveal(s,l,[id],h);if(info(s,id).type==='item')return choose(s,l,q,'voxel_item',[],l.actor,['take','skip']);move(s,l,q,id,'discard');return voxelContinue(s,l,q,h);}
function voxelContinue(s,l,q,h){if(q.seen>=q.n||!s.players[l.actor].deck.length)return false;return choose(s,l,q,'voxel_continue',[],l.actor,['continue','stop']);}
function blackjackNext(s,l,q,h){const id=s.players[l.actor].deck.find(x=>!q.ids.includes(x));if(!id){for(const x of [...q.ids])move(s,l,q,x,'hand');return false;}q.ids.push(id);q.generations[id]=s.cards[id].generation;reveal(s,l,[id],h);if(new Set(q.ids.map(x=>info(s,x).type)).size<q.ids.length)return order(s,l,q,h);if(q.ids.length>=q.n||q.ids.length===s.players[l.actor].deck.length){for(const x of [...q.ids])move(s,l,q,x,'hand');return false;}return choose(s,l,q,'blackjack',[],l.actor,['continue','stop']);}
function yacht(s,l,q,h){const fresh=s.players[l.actor].deck.filter(id=>!q.ids.includes(id));if(q.swaps<2&&q.ids.length&&fresh.length)return choose(s,l,q,'swap',q.ids,l.actor,['done']);return take(s,l,q,h);}
export function handle(s,l,e,h){if(e.op==='inspectOrder')return {waiting:order(s,l,e.inspection,h)};if(e.op==='inspectSnakeKeep'){const q=e.inspection;q.ids=q.ids.filter(id=>s.players[l.actor].hand.includes(id)&&s.cards[id].generation===q.generations[id]);return {waiting:q.ids.length?choose(s,l,q,'snake_keep',q.ids,other(l.actor)):false};}if(e.op!=='inspect')return null;if(e.mode==='mines'&&!validMinesweeperTarget(s,l))return {waiting:false};const p=s.players[l.actor],q={mode:e.mode,n:e.n,ids:[],generations:{},seen:0,swaps:0,taken:0,min:0,max:1};
 if(e.mode==='snake'){q.max=3;q.selected=[];return {waiting:p.hand.length?choose(s,l,q,'snake_select',p.hand,l.actor,['done']):false};}
 if(e.mode==='blackjack')return {waiting:blackjackNext(s,l,q,h)};
 if(e.mode==='voxel')return {waiting:voxelNext(s,l,q,h)};
 q.ids=p.deck.slice(0,e.n);for(const id of q.ids)q.generations[id]=s.cards[id].generation;if(!q.ids.length)return {waiting:false};
 if(['fp','yacht'].includes(e.mode))l.applied=true;else reveal(s,l,q.ids,h);
 let waiting=false;
 switch(e.mode){
 case 'fp':waiting=choose(s,l,q,'fp',[],l.actor,['take','redraw']);break;
 case 'yacht':waiting=yacht(s,l,q,h);break;
 case 'match':if(q.ids.length===3&&new Set(q.ids.map(id=>info(s,id).type)).size===1){for(const id of [...q.ids])move(s,l,q,id,'hand');}else waiting=take(s,l,q,h);break;
 case 'road':waiting=choose(s,l,q,'road',q.ids,other(l.actor));break;
 case 'rogue':waiting=choose(s,l,q,'rogue',[],l.actor,['self','opponent']);break;
 case 'fruit':q.max=2;waiting=fruit(s,l,q,h);break;
 case 'mines':q.maxCost=info(s,l.target).cost;waiting=take(s,l,q,h);break;
 default:throw Error('Unknown inspection '+e.mode);
 }return {waiting};}
function finishFruit(s,l,q,h){if(q.taken){s.program.steps.unshift({op:'growth',n:q.taken*5},{op:'inspectOrder',inspection:q});return false;}return order(s,l,q,h);}
function fruit(s,l,q,h){const ids=q.ids.filter(id=>info(s,id).type==='play');if(q.taken<2&&ids.length)return choose(s,l,q,'fruit',ids,l.actor,['done']);return finishFruit(s,l,q,h);}
export function resume(s,value,h){const c=s.choice;if(!c?.kind.startsWith('inspect_'))return false;if(!c.options.some(o=>o.id===value))throw Error('Invalid inspection choice');const l=c.link,q=c.inspection;s.choice=null;const stage=c.kind.slice(8);
 switch(stage){
 case 'order':move(s,l,q,value,'deck');return order(s,l,q,h);
 case 'take':if(value==='done')q.max=q.taken;else if(move(s,l,q,value,'hand'))q.taken++;return take(s,l,q,h);
 case 'blackjack':if(value==='continue')return blackjackNext(s,l,q,h);for(const id of [...q.ids])move(s,l,q,id,'hand');return false;
 case 'voxel_item':move(s,l,q,q.ids[0],value==='take'?'hand':'discard');return value==='take'?false:voxelContinue(s,l,q,h);
 case 'voxel_continue':return value==='continue'?voxelNext(s,l,q,h):false;
 case 'swap':if(value==='done')return take(s,l,q,h);move(s,l,q,value,'deck');q.swaps++;{const id=s.players[l.actor].deck.find(x=>!q.ids.includes(x));if(id){q.ids.push(id);q.generations[id]=s.cards[id].generation;l.applied=true;}}return yacht(s,l,q,h);
 case 'fp':if(value==='redraw'){q.redraw=true;return order(s,l,q,h);}q.min=1;return take(s,l,q,h);
 case 'road':q.blocked=value;return take(s,l,q,h);
 case 'rogue':q.min=value==='self'?1:Math.min(2,q.ids.length);q.max=q.min;q.actor=value==='self'?l.actor:other(l.actor);return take(s,l,q,h);
 case 'fruit':if(value==='done'){q.max=0;return finishFruit(s,l,q,h);}if(move(s,l,q,value,'discard'))q.taken++;return fruit(s,l,q,h);
 case 'snake_select':if(value!=='done')q.selected.push(value);if(value!=='done'&&q.selected.length<3&&s.players[l.actor].hand.some(id=>!q.selected.includes(id)))return choose(s,l,q,'snake_select',s.players[l.actor].hand.filter(id=>!q.selected.includes(id)),l.actor,['done']);q.ids=[...q.selected];for(const id of q.ids)q.generations[id]=s.cards[id].generation;reveal(s,l,q.ids,h);if(!q.ids.length)return false;s.program.steps.unshift({op:'growth',n:q.ids.length*5},{op:'inspectSnakeKeep',inspection:q});return false;
 case 'snake_keep':for(const id of [...q.ids])if(id!==value)move(s,l,q,id,'discard');return false;
 default:throw Error('Unknown inspection choice '+stage);
 }
}
