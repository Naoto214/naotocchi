import {NPCS,PLAYER_SPECIES} from './canonical.mjs';
import {TILE_SCHEMA} from './tiles-v4.mjs';

export const FRIENDS=Object.freeze(NPCS.filter(n=>n.kind==='companion'));
export const PARTNERS=Object.freeze(NPCS.filter(n=>n.kind==='partner'));
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const need=(condition)=>{if(!condition)throw Error('VERSION 4の操作・保存状態が不正です');};
const name=id=>NPCS.find(n=>n.id===id)?.label||'';
export function initialRelations(){return {friends:[],partner:null,married:false,partnerShield:0,rerolls:0,rerollGranted:[],rerollLedger:[]};}
function log(p,round,type,text,extra={}){p.history.push({round,type,text,stage:p.stage,sodachi:p.sodachi,money:p.money,...extra});}
const result=(title,text,delta={sodachi:0,money:0},extra={})=>({kind:'result',title,text,delta,...extra});
function drawIndex(draw,n){const v=draw(n);need(Number.isInteger(v)&&v>=0&&v<n);return v;}
function sample(ids,draw){const pool=[...ids],out=[];while(out.length<3&&pool.length)out.push(pool.splice(drawIndex(draw,pool.length),1)[0]);return out;}
function delta(p,sd,m){const before=[p.sodachi,p.money];p.sodachi=clamp(p.sodachi+sd,0,100);p.money=Math.max(0,p.money+m);return {sodachi:p.sodachi-before[0],money:p.money-before[1]};}

// Called once by the landing transaction. The returned offer is stored verbatim
// in pending before rendering. Rendering and save loading never call this.
export function offer(p,type,draw,round){
 need(validate(p)&&Number.isInteger(round)&&round>=1);
 if(type==='friend'){
  if(p.friends.length===3)return result('みんなでひと休み','「この道、みんなで歩くとにぎやかだね！」');
  return {kind:'choice',type,candidates:sample(FRIENDS.filter(n=>!p.friends.includes(n.id)).map(n=>n.id),draw),applied:false};
 }
 if(type==='partner'){
  if(p.married)return result('ふたりの寄り道','「今日の景色も、いっしょに覚えていようね」');
  if(p.partner){p.married=true;p.partnerShield=0;const text=`${name(p.partner)}と結婚した。「これからも、いっしょに歩こうね」。`;log(p,round,'marriage',text,{npc:p.partner});return result('これからも、いっしょに',text);}
  return {kind:'choice',type,candidates:sample(PARTNERS.map(n=>n.id),draw),applied:false};
 }
 if(type==='friend-farewell'){
  if(!p.friends.length)return result('旅立ちの道','「今はひとり旅。またどこかで、だれかに会えるかな」');
  const id=p.friends.splice(drawIndex(draw,p.friends.length),1)[0],lost=Math.min(1,p.rerolls);p.rerolls-=lost;
  p.rerollLedger.push({kind:'loss',npc:id,amount:lost,round});
  const text=`${name(id)}は別の道へ。「いっしょに歩けて、よかったよ！」`;log(p,round,type,text,{npc:id,rerollsLost:lost});return result('また、どこかで',text);
 }
 if(type==='partner-farewell'){
  if(!p.partner)return result('潮風のひと休み','「今日は景色をひとりじめ。次はだれかと来たいな」');
  const id=p.partner,married=p.married;p.partner=null;p.married=false;p.partnerShield=0;
  // Relationship loss is unconditional, including when an item charm is ready.
  const change=delta(p,married?-10:-5,0),text=`${name(id)}と、それぞれの道を歩くことにした。いっしょに見た景色は、思い出の中に。`;
  log(p,round,type,text,{npc:id,wasMarried:married,delta:change});return result('ふたりの道の、その先へ',text,change);
 }
 if(type==='transform')return {kind:'choice',type,candidates:sample(PLAYER_SPECIES.filter(c=>c.id!==p.character.id).map(c=>c.id),draw),applied:false};
 if(type==='time'){
  const before=p.stage,weighted=[1,1,1,1,-1,-1,-1,-1,2,-2].filter(d=>clamp(before+d,1,8)!==before),amount=weighted[drawIndex(draw,weighted.length)];p.stage=clamp(before+amount,1,8);
  if(p.stage<before){p.suppressUntil=round+1;}else p.evolvedRound=round;
  const text=`時間の扉をくぐると、第${before}段階から第${p.stage}段階へ。姿が変わっても、旅の続きはここから。`;
  log(p,round,p.stage>before?'evolve':'rewind',text,{source:'time',before,after:p.stage,draw:amount});return result('ときの向こうへ',text,undefined,{before,after:p.stage,draw:amount});
 }
 throw Error(`Not a relationship/time tile: ${type}`);
}

export function select(p,pending,index,round){
 need(validate(p)&&validateOffer(p,pending)&&Number.isInteger(index)&&index>=0&&index<pending.candidates.length);
 const id=pending.candidates[index];let text;
 if(pending.type==='friend'){
  p.friends.push(id);const grant=!p.rerollGranted.includes(id);
  if(grant){p.rerollGranted.push(id);p.rerolls=Math.min(3,p.rerolls+1);p.rerollLedger.push({kind:'grant',npc:id,amount:1,round});}
  text=`${name(id)}が旅の仲間になった。${grant?'「迷ったら、もう一度サイコロを振ってみよう！」':'「またいっしょに歩けるね！」'}`;
  log(p,round,'friend',text,{npc:id,rerollGranted:grant});
 }else if(pending.type==='partner'){
  p.partner=id;p.married=false;p.partnerShield=1;text=`${name(id)}と恋人になった。「だいじょうぶ。いっしょにいこう！」`;log(p,round,'partner',text,{npc:id});
 }else{
  const before=p.character.id,next=PLAYER_SPECIES.find(c=>c.id===id);
  // Retain imported personality metadata but replace all canonical visual fields.
  p.character={...p.character,...structuredClone(next)};
  text=`ふしぎな光に包まれて、${next.label}にへんしん！ 第${p.stage}段階のまま、新しい姿で旅を続ける。`;log(p,round,'transform',text,{before,after:id});
 }
 pending.applied=true;return result(pending.type==='transform'?'新しい姿で':pending.type==='partner'?'ふたりで歩こう':'旅の仲間',text);
}

export function spendReroll(p,round=1){need(validate(p)&&p.rerolls>0);p.rerolls--;p.rerollLedger.push({kind:'use',amount:1,round});}

export function numeric(p,type,round,text=TILE_SCHEMA[type]?.description){
 need(validate(p)&&['growth-plus','growth-minus','money-plus','money-minus'].includes(type));
 const effect=TILE_SCHEMA[type].effect;let sd=effect.sodachi,m=effect.money,protectedBy=null;
 if(type==='growth-minus'&&p.partner&&(p.married||p.partnerShield>0)){sd=0;protectedBy=p.partner;if(!p.married)p.partnerShield--;text=`${name(p.partner)}「だいじょうぶ。いっしょにいこう！」 ${text}`;}
 else if((sd<0||m<0)&&p.charm){p.charm=false;sd=0;m=0;protectedBy='charm';text=`おまもりが守ってくれた。${text}`;}
 const change=delta(p,sd,m);log(p,round,'tile',text,{tileType:type,delta:change,protectedBy});return result(TILE_SCHEMA[type].label,text,change,{protectedBy});
}

export function validateOffer(p,q){
 if(!q||q.kind!=='choice'||q.applied!==false||!Array.isArray(q.candidates)||q.candidates.length!==3||new Set(q.candidates).size!==3)return false;
 if(q.type==='friend')return p.friends.length<3&&q.candidates.every(id=>FRIENDS.some(n=>n.id===id)&&!p.friends.includes(id));
 if(q.type==='partner')return p.partner===null&&q.candidates.every(id=>PARTNERS.some(n=>n.id===id));
 return q.type==='transform'&&q.candidates.every(id=>id!==p.character.id&&PLAYER_SPECIES.some(c=>c.id===id));
}
export function validate(p){
 if(!p||!Array.isArray(p.friends)||p.friends.length>3||new Set(p.friends).size!==p.friends.length||!p.friends.every(id=>FRIENDS.some(n=>n.id===id)))return false;
 if(p.partner!==null&&!PARTNERS.some(n=>n.id===p.partner))return false;
 if(typeof p.married!=='boolean'||!Number.isInteger(p.partnerShield)||p.partnerShield<0||p.partnerShield>1||(!p.partner&&(p.married||p.partnerShield!==0))||(p.married&&p.partnerShield!==0))return false;
 if(!Number.isInteger(p.rerolls)||p.rerolls<0||p.rerolls>3||!Array.isArray(p.rerollGranted)||new Set(p.rerollGranted).size!==p.rerollGranted.length||!p.rerollGranted.every(id=>FRIENDS.some(n=>n.id===id)))return false;
 if(!Array.isArray(p.rerollLedger)||p.rerollLedger.length>300)return false;
 let balance=0,lastRound=0;const granted=new Set();
 for(const h of p.rerollLedger){
  if(!h||!['grant','use','loss'].includes(h.kind)||!Number.isInteger(h.round)||h.round<1||h.round>20||h.round<lastRound)return false;
  lastRound=h.round;
  if(h.kind!=='use'&&!FRIENDS.some(n=>n.id===h.npc))return false;
  if(h.kind==='grant'){if(h.amount!==1||granted.has(h.npc)||balance>=3)return false;granted.add(h.npc);balance++;}
  else if(h.kind==='use'){if(h.amount!==1||balance<1)return false;balance--;}
  else {if(h.amount!==Math.min(1,balance)||!granted.has(h.npc))return false;balance-=h.amount;}
 }
 return balance===p.rerolls&&p.rerolls<=p.friends.length&&granted.size===p.rerollGranted.length&&p.rerollGranted.every(id=>granted.has(id))&&p.friends.every(id=>granted.has(id));
}
