import {BOARD as LEGACY_BOARD} from './data.mjs';

// Versioned: V2/V3 save files retain their original tiles and effects.
const tile=(label,icon,fill,shape,description,effect)=>Object.freeze({label,icon,fill,shape,description,effect:Object.freeze(effect)});
export const TILE_SCHEMA=Object.freeze({
 'growth-plus':tile('そだち＋5','🌱','#c5dda2','round','そだち＋5',{sodachi:5,money:0}),
 'growth-minus':tile('そだち−5','🍂','#dbbf9e','cut','そだち−5。恋人は1回、結婚中は何度でも守る',{sodachi:-5,money:0}),
 'money-plus':tile('お金＋5','💰','#f5d180','round','お金＋5',{sodachi:0,money:5}),
 'money-minus':tile('お金−5','💸','#d4c3ba','cut','お金−5',{sodachi:0,money:-5}),
 friend:tile('なかま','🤝','#b8d4a4','round','3候補から1人。最大3人。初めての加入で振り直し＋1',{kind:'friend'}),
 'friend-farewell':tile('なかまとわかれ','🍃','#acbea0','cut','仲間1人が旅立ち、未使用の振り直し−1',{kind:'friend-farewell'}),
 partner:tile('こいびと','💗','#efb8ca','round','3候補から恋人を選ぶ。恋人がいれば結婚',{kind:'partner'}),
 'partner-farewell':tile('こいびととわかれ','💔','#c69fb5','cut','恋人との別れはそだち−5、結婚後は−10',{kind:'partner-farewell'}),
 quick:tile('クイック','⚡','#f5df88','cut','全員参加。順位でお金＋15／10／5／0',{kind:'quick'}),
 game:tile('ゲーム','🎮','#b3c7e4','round','全員参加。順位でそだち＋15／10／5／0',{kind:'game'}),
 event:tile('できごと','💬','#fff3d5','round','選んだ道が、今日の思い出になる',{kind:'event'}),
 item:tile('アイテム','🎁','#d8c7e4','cut','アイテム1個。満杯ならお金＋5',{kind:'item',overflowMoney:5}),
 shop:tile('お店','🏠','#dfc59a','gable','止まったときだけ買い物。買わずに進める',{kind:'shop'}),
 time:tile('とき','⏳','#a7d5d4','arch','同じ育成系列のまま、必ず1〜2段階進化・若返り',{kind:'time'}),
 transform:tile('へんしん','🌀','#baaeda','arch','段階はそのまま。別の育成系列3候補から選ぶ',{kind:'transform'}),
});
export const TYPES=Object.freeze([
 'shop','growth-plus','event','money-minus','item','quick','money-plus','friend','time','game','growth-plus','growth-minus',
 'shop','money-plus','event','friend','item','quick','growth-plus','growth-minus','transform','event','money-plus','partner',
 'shop','growth-plus','event','money-minus','item','event','quick','partner','time','event','game','growth-minus',
 'shop','money-plus','event','partner','transform','partner-farewell','quick','money-minus','time','friend-farewell','growth-plus','friend',
]);
export const BOARD=Object.freeze(LEGACY_BOARD.map(n=>Object.freeze({...n,next:Object.freeze([...n.next]),type:TYPES[n.id]})));
export function tileDefinition(type){const def=TILE_SCHEMA[type];if(!def)throw new RangeError(`Unknown V4 tile: ${type}`);return def;}

// The board camera translates and positively scales this coordinate space; it
// never rotates/mirrors the map. IDs/order do not describe screen directions.
export function branchChoices(id){
 const from=BOARD[id];if(!from)throw new RangeError('Unknown branch');
 const destinations=from.next.map(to=>BOARD[to]);
 const straddles=destinations.some(n=>n.x<from.x)&&destinations.some(n=>n.x>from.x);
 return destinations.slice().sort((a,b)=>a.x-b.x||a.y-b.y).map(n=>{
  const horizontal=n.x<from.x?'left':n.x>from.x?'right':'';
  const vertical=n.y<from.y?'up':n.y>from.y?'down':'';
  const direction=straddles?horizontal:[vertical,horizontal].filter(Boolean).join('-');
  const words={left:'ひだり',right:'みぎ',up:'上',down:'下','up-right':'右上','down-right':'右下','up-left':'左上','down-left':'左下'};
  return {to:n.id,direction,label:`${words[direction]||'先'}の道 · ${n.label}へ`};
 });
}
