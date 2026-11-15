// Design-review record only. Never imported by the game engine or save system.
export const CHOICE_KEY='naopoyo.gate-design-review.v1';
export const DEFAULT_DESIGN='A';
const revision='gate-comparison-20261110';
const validItem=x=>x&&['A','B'].includes(x.choice)&&typeof x.at==='string'&&Number.isFinite(Date.parse(x.at));
function validate(r){
 if(!r||r.schema!==1||r.revision!==revision||!validItem(r)||!Array.isArray(r.history)||!r.history.length||r.history.length>1000||!r.history.every(validItem))throw Error('対応していない選択記録です');
 const last=r.history.at(-1);if(last.choice!==r.choice||last.at!==r.at)throw Error('選択履歴が一致しません');
 return {schema:1,revision,choice:r.choice,at:r.at,history:r.history.map(({choice,at})=>({choice,at}))};
}
export function readChoice(storage){try{const raw=storage.getItem(CHOICE_KEY);return {record:raw?validate(JSON.parse(raw)):null,error:null}}catch{return {record:null,error:'保存記録を読み込めません。ゲームは従来のAを維持します。'}}}
export function saveChoice(storage,choice,at=new Date().toISOString()){
 try{if(!validItem({choice,at}))throw Error();const previous=readChoice(storage);if(previous.error) return previous;const history=[...(previous.record?.history||[]),{choice,at}].slice(-1000);const record=validate({schema:1,revision,choice,at,history});storage.setItem(CHOICE_KEY,JSON.stringify(record));return {record,error:null}}
 catch{return {record:null,error:'保存できませんでした。ブラウザの保存設定・空き容量をご確認ください。'}}
}
export function importChoice(storage,json){try{if(json.length>200000)throw Error();const record=validate(JSON.parse(json));storage.setItem(CHOICE_KEY,JSON.stringify(record));return {record,error:null}}catch{return {record:null,error:'読み込めませんでした。対応する選択記録JSONをご確認ください。'}}}
