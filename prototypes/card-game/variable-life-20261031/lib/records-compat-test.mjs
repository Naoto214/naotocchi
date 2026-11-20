// Compatibility checks for the records prototype (RECORDS-COMPAT.md). Uses the OFFICIAL records.mjs (read-only) to write real
// version-1 journals, then reads them with the prototype. Usage: node lib/records-compat-test.mjs > evidence/records-compat.txt
import {RecordsStore,parseJournal} from '../../records.mjs';
import {CPU_DECKS} from '../../cpu-decks.mjs';
import {REGISTRY_V1,NEW_CARD_IDS,parseAny,serializeV2} from './records-compat-proto.mjs';
let fails=0;const ok=(name,cond,info='')=>{console.log(`${cond?'PASS':'FAIL'} ${name}${info?' — '+info:''}`);if(!cond)fails++;};
const mem=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const rec=(i,a,b,round=10)=>({id:'match-'+i,startedAt:1000+i,endedAt:2000+i,mode:'hotseat',human:null,difficulty:null,cpuDeck:null,winner:'A',growth:{A:60,B:40},round,
 decks:{A:{id:null,name:'A',cards:[...a]},B:{id:null,name:'B',cards:[...b]}},uses:{A:[[a[0],1]],B:[]}});
const D=id=>CPU_DECKS.find(d=>d.id===id).cards;
// 1) An official version-1 journal written by records.mjs itself.
const st=mem(),store=new RecordsStore(st);store.write([rec(1,D('item'),D('growth')),rec(2,D('balance'),D('main'),9)]);
const raw=st.getItem('naotocchi-card-records-v1'),official=parseJournal(raw);
ok('正式の records.mjs が version 1 を書ける（2件）',official.length===2&&JSON.parse(raw).version===1);
ok('version 1 のカタログは正式452枚（試作の番号台帳 v1 と同一）',JSON.stringify(JSON.parse(raw).catalog)===JSON.stringify(REGISTRY_V1)&&REGISTRY_V1.length===452);
const proto=parseAny(raw);
ok('試作は version 1 をそのまま読める（デッキ・使用・結果が正式の読み込みと一致）',JSON.stringify(proto.map(r=>[r.id,r.decks,r.uses,r.round,r.growth]))===JSON.stringify(official.map(r=>[r.id,r.decks,r.uses,r.round,r.growth])));
// 2) New cards: their proposed IDs do not collide; with sorted numbering, some would shift existing numbers (why v2 uses strings).
ok('新カードの提案IDは452枚と重ならない',Object.keys(NEW_CARD_IDS).every(id=>!REGISTRY_V1.includes(id)));
const sorted=[...REGISTRY_V1,...Object.keys(NEW_CARD_IDS)].sort(),shifted=REGISTRY_V1.filter((id,i)=>sorted.indexOf(id)!==i).length;
ok('並べ替え番号のまま足すと既存の番号がずれる（だから番号でなく文字列で保存する）',shifted>0,`ずれる既存カード ${shifted}枚`);
// 3) Version 2 round trip with new cards and round 12.
const withNew=[...D('balance')];['W-time-ix','W-time-xii','E-hayajimai','E-nagaiki','E-omoide-photo'].forEach((id,k)=>{withNew[39-k]=id;});
const v2=serializeV2([...proto,rec(3,withNew,D('item'),12)]);const back=parseAny(v2);
ok('version 2：新カード入りのデッキと R12 の対戦を保存して読み直せる',back.length===3&&back[2].round===12&&back[2].decks.A.cards.includes('E-nagaiki'));
ok('version 2：既存の2件は version 1 の内容のまま',JSON.stringify(back.slice(0,2).map(r=>[r.decks,r.uses]))===JSON.stringify(proto.map(r=>[r.decks,r.uses])));
// 4) Rejections stay strict.
let threw=false;try{parseAny(serializeV2([rec(4,[...D('item').slice(0,39),'X-unknown'],D('item'))]));}catch{threw=true;}ok('知らないカードIDは拒否する',threw);
threw=false;try{const bad=JSON.parse(raw);bad.catalog=[...bad.catalog,'W-time-ix'];parseAny(JSON.stringify(bad));}catch{threw=true;}ok('version 1 でカタログが違うものは拒否する（番号の取り違えを防ぐ）',threw);
threw=false;try{serializeV2([rec(5,D('item'),D('main'),13)]);}catch{threw=true;}ok('ラウンドは12まで',threw);
// 5) The official reader rejects version 2 (so an old app never misreads a new journal) — the format change needs a migration step.
threw=false;try{parseJournal(v2);}catch{threw=true;}ok('正式の records.mjs（version 1）は version 2 を読まずに拒否する（誤読しない）',threw);
console.log(fails?`FAILED ${fails}`:'ALL PASS');if(fails)process.exit(1);
