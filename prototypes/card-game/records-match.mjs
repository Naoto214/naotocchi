import {restoreMatch} from './cpu-session.mjs';
import {validateMetadata} from './records.mjs';
export function newMetadata({mode,human=null,difficulty=null,cpuDeck=null,decks}){return {...validateMetadata({id:crypto.randomUUID(),startedAt:Date.now(),mode,human,difficulty,cpuDeck,decks}),completedAt:null};}
function metadata(m){const v=validateMetadata(m),t=m.completedAt??null;if(!(t===null||Number.isSafeInteger(t)&&t>=0&&(v.startedAt===null||t>=v.startedAt)))throw Error('終了日時が不正です');return {...v,completedAt:t};}
export function encodeMatch(raw,m){return JSON.stringify({...JSON.parse(raw),recordsMeta:metadata(m)});}
// Stable 128-bit identity for pre-feature saves; not a security signature.
function legacyId(text){return 'legacy-'+[2166136261,2246822519,3266489917,668265263].map(seed=>{let h=seed;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);h^=h>>>13;}return (h>>>0).toString(16).padStart(8,'0');}).join('');}
export function decodeMatch(raw){
 const d=JSON.parse(raw),{recordsMeta,...saved}=d,session=restoreMatch(JSON.stringify(saved)),g=saved.game??saved;
 const mode=session.mode==='cpu'?'cpu':'hotseat',human=mode==='cpu'?session.humanSeat:null,difficulty=mode==='cpu'?session.difficulty:null,cpuDeck=session.cpuDeck?.id??null;
 const m=recordsMeta?metadata(recordsMeta):{...validateMetadata({id:legacyId(JSON.stringify([g.version,g.seed,g.decks,mode,human,difficulty,saved.policySeed??null])),startedAt:null,mode,human,difficulty,cpuDeck,decks:Object.fromEntries(['A','B'].map(s=>[s,{id:null,name:'旧セーブ・デッキ不明 '+s,cards:g.decks[s]}]))}),completedAt:null};
 if(m.mode!==mode||m.human!==human||m.difficulty!==difficulty||m.cpuDeck!==cpuDeck||['A','B'].some(s=>JSON.stringify(m.decks[s].cards)!==JSON.stringify(g.decks[s])))throw Error('戦績情報と対戦が一致しません');
 if(!session.finished&&m.completedAt!==null)throw Error('未決着の終了日時が不正です');return {session,metadata:m};
}
