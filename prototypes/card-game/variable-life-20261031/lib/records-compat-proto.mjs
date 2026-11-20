// Prototype (VERSION 6, RECORDS-COMPAT.md): how the official match records could accept new cards without breaking existing data.
// Design-only — the official records.mjs and its storage format are NOT changed. This module reads the official version-1 journal
// (catalog of the 452 official IDs + numeric indices) and writes a version-2 journal that stores card IDs as strings, so adding
// cards (or IDs that sort between existing ones) never renumbers anything. Round may be up to 12 (IX–XII).
import {CARDS as OFFICIAL} from '../../engine.mjs';
export const REGISTRY_V1=Object.freeze(Object.keys(OFFICIAL).sort()); // exactly what records.mjs v1 writes as `catalog`
// Proposed official IDs for the 7 new cards (no collision with the 452; the time cards are worlds, the others events).
export const NEW_CARD_IDS=Object.freeze({'W-time-ix':'IX','W-time-x':'X','W-time-xi':'XI','W-time-xii':'XII','E-hayajimai':'はやじまい','E-nagaiki':'ながいきのひけつ','E-omoide-photo':'おもいでのしゃしん'});
const fail=m=>{throw Error(m);},num=(x,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
export function knownCards(extra=NEW_CARD_IDS){return new Set([...REGISTRY_V1,...Object.keys(extra)]);}
function checkDeck(cards,known){if(!Array.isArray(cards)||cards.length!==40)fail('デッキは40枚');const n={};for(const id of cards){if(!known.has(id))fail('未知のカード：'+id);n[id]=(n[id]??0)+1;if(n[id]>3)fail('同名は3枚まで：'+id);}}
// Read a journal of format version 1 (official) or 2 (prototype). Returns records in the same shape as records.mjs parseJournal.
export function parseAny(raw,known=knownCards()){
 const d=JSON.parse(raw);if(d?.format!=='naotocchi-records')fail('形式が不正です');
 let decks;
 if(d.version===1){ // official: numeric indices into the 452-card catalog stored in the file
  if(JSON.stringify(d.catalog)!==JSON.stringify(REGISTRY_V1))fail('version 1 のカタログが正式452枚と一致しません');
  decks=d.decks.map(x=>{if(!Array.isArray(x)||x.length!==3||x[2].some(i=>!num(i,REGISTRY_V1.length-1)))fail('デッキ辞書が不正です');return {id:x[0],name:x[1],cards:x[2].map(i=>REGISTRY_V1[i])};});
 }else if(d.version===2){ // prototype: card IDs as strings
  decks=d.decks.map(x=>{if(!Array.isArray(x)||x.length!==3)fail('デッキ辞書が不正です');checkDeck(x[2],known);return {id:x[0],name:x[1],cards:[...x[2]]};});
 }else fail('未対応の版です');
 return d.rows.map(x=>{const cardOf=i=>d.version===1?REGISTRY_V1[i]:i;const uses={};for(const [s,k] of [['A',13],['B',14]])uses[s]=x[k].map(([c,n])=>{const id=cardOf(c);if(!known.has(id))fail('未知のカード（使用）：'+id);return [id,n];});
  if(!num(x[10],12)||x[10]<1)fail('ラウンドが不正です');
  return {id:x[0],startedAt:x[1],endedAt:x[2],mode:x[3],human:x[4],difficulty:x[5],cpuDeck:x[6],winner:x[7],growth:{A:x[8],B:x[9]},round:x[10],decks:{A:decks[x[11]],B:decks[x[12]]},uses};});
}
export function serializeV2(records,known=knownCards()){
 const decks=[],keys=new Map(),deck=dk=>{checkDeck(dk.cards,known);const k=JSON.stringify(dk);if(!keys.has(k)){keys.set(k,decks.length);decks.push([dk.id,dk.name,[...dk.cards]]);}return keys.get(k);};
 const rows=records.map(r=>{if(!num(r.round,12)||r.round<1)fail('ラウンドが不正です');return [r.id,r.startedAt,r.endedAt,r.mode,r.human,r.difficulty,r.cpuDeck,r.winner,r.growth.A,r.growth.B,r.round,deck(r.decks.A),deck(r.decks.B),r.uses.A,r.uses.B];});
 return JSON.stringify({format:'naotocchi-records',version:2,decks,rows});
}
