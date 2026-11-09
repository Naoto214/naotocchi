export const STORAGE_KEY='naopoyo.hundred.owner-prototype.v1';
const validId=id=>typeof id==='string'&&/^(0[1-9]|[1-9][0-9]|100)$/.test(id);
const object=v=>v&&typeof v==='object'&&!Array.isArray(v)?v:{};
const action=a=>a&&[a.x,a.y,a.dx,a.dy].every(Number.isInteger)&&a.x>=0&&a.x<8&&a.y>=0&&a.y<8&&Math.max(Math.abs(a.dx),Math.abs(a.dy))===1;
export function cleanProgress(raw){
 const p=object(raw),reviews={};
 for(const [id,value] of Object.entries(object(p.reviews))){if(!validId(id))continue;const r=object(value);reviews[id]={rating:['good','ok','review'].includes(r.rating)?r.rating:'',difficulty:['easy','right','hard'].includes(r.difficulty)?r.difficulty:'',star:r.star===true,note:typeof r.note==='string'?r.note.slice(0,2000):''};}
 const last=object(p.last),actions=Array.isArray(last.actions)&&last.actions.length<=3000&&last.actions.every(action)?last.actions.map(({x,y,dx,dy})=>({x,y,dx,dy})):[];
 return {version:1,cleared:[...new Set((Array.isArray(p.cleared)?p.cleared:[]).filter(validId))],discovered:[...new Set((Array.isArray(p.discovered)?p.discovered:[]).filter(x=>typeof x==='string'&&/^[a-zA-Z]+\.[a-zA-Z.]+$/.test(x)))].slice(0,80),reviews,last:{id:validId(last.id)?last.id:'01',actions},bookSeen:p.bookSeen===true};
}
export function readProgress(storage){try{return cleanProgress(JSON.parse(storage.getItem(STORAGE_KEY)||'null'))}catch{return cleanProgress(null)}}
export function writeProgress(storage,p){try{storage.setItem(STORAGE_KEY,JSON.stringify(cleanProgress(p)));return true}catch{return false}}
export const exportProgress=p=>JSON.stringify(cleanProgress(p),null,2);
export function importProgress(text){if(typeof text!=='string'||text.length>1000000)throw Error('記録ファイルが大きすぎます');const p=JSON.parse(text);if(p?.version!==1)throw Error('この試遊版の記録ではありません');return cleanProgress(p)}
export function replayActions(board,actions,create,move){
 if(!Array.isArray(actions)||actions.length>3000||!actions.every(action))return null;
 const state=create(board),history=[];
 for(const a of actions){const actor=state.actors.find(v=>v.x===a.x&&v.y===a.y);if(!actor)return null;const before=structuredClone(state);if(!move(state,actor.id,a.dx,a.dy).ok)return null;history.push(before)}
 return {state,history};
}
