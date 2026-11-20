import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as R from '../records.mjs';
import {DEFAULT_DECK,CARDS} from '../engine.mjs';
const V1='naotocchi-card-records-v1',V2='naotocchi-card-records-v2',LEGACY=V1+'-legacy';
const memory=(init={})=>{const m=new Map(Object.entries(init));return {m,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
const rec=(id='one')=>({id,startedAt:1,endedAt:3,mode:'hotseat',human:null,difficulty:null,cpuDeck:null,decks:{A:{id:'old-deck',name:'昔のデッキ',cards:[...DEFAULT_DECK]},B:{id:null,name:'B',cards:[...DEFAULT_DECK]}},winner:'A',growth:{A:5,B:4},round:10,uses:{A:[],B:[]}});
const v2=(rs)=>{const decks=[],rows=rs.map(r=>{const a=decks.push([r.decks.A.id,r.decks.A.name,r.decks.A.cards])-1,b=decks.push([r.decks.B.id,r.decks.B.name,r.decks.B.cards])-1;return [r.id,r.startedAt,r.endedAt,r.mode,r.human,r.difficulty,r.cpuDeck,r.winner,r.growth.A,r.growth.B,r.round,a,b,r.uses.A,r.uses.B];});return {format:'naotocchi-records',version:2,decks,rows,held:[]};};
const unknown=(id='future')=>{const d=v2([rec(id)]);d.rows[0][13]=[['future-card',1]];return d;};
const text=JSON.stringify;
// Frozen output from the pre-V18 production RecordsStore (452-card catalog).
const v1=()=>fs.readFileSync(new URL('./fixtures/records-v1-452.json',import.meta.url),'utf8');
test('production writes independent V2 with 459 cards and twelve rounds',()=>{assert.equal(R.RECORDS_KEY,V2);const a=new R.RecordsStore(memory());const r=rec();r.round=12;r.uses.A=[['E-hayajimai',1]];a.add(r);assert.equal(JSON.parse(a.exportJSON()).version,2);assert.deepEqual(R.parseJournal(a.exportJSON()),[r]);assert.equal(Object.keys(R.summarize(a.records).cards).length,Object.keys(CARDS).length);assert.throws(()=>a.add({...r,id:'bad',round:13}));});
test('unknown rows survive import, repeated import, export and later known-ID restoration',()=>{const d=unknown(),a=new R.RecordsStore(memory());a.importJSON(text(d));assert.equal(a.held.length,1);assert.equal(a.records.length,0);const first=a.exportJSON();a.importJSON(first);a.importJSON(text(d));assert.equal(a.exportJSON(),first);assert.deepEqual(R.parseJournalData(first).held[0].row,d.rows[0]);const back=JSON.parse(first);back.held[0].row[13]=[['E-hayajimai',1]];assert.equal(R.parseJournalData(text(back)).records.length,1);});
test('known and held duplicate IDs reject atomically, including held conflicts',()=>{const st=memory({[V2]:text(unknown())}),a=new R.RecordsStore(st),raw=st.getItem(V2);assert.throws(()=>a.add(rec('future')),/一致/);assert.equal(st.getItem(V2),raw);assert.equal(a.pending.length,0);const changed=unknown();changed.rows[0][7]='B';assert.throws(()=>a.importJSON(text(changed)),/一致/);assert.equal(st.getItem(V2),raw);});
test('combined known and held capacity keeps rejected completion exportable',()=>{const st=memory(),a=new R.RecordsStore(st);a.importJSON(text(unknown()));a.write(Array.from({length:4999},(_,i)=>rec('r'+i)));const raw=st.getItem(V2);assert.throws(()=>a.add(rec('overflow')),/5000/);assert.equal(st.getItem(V2),raw);assert.equal(a.pending.length,1);assert.equal(R.parseJournal(a.exportPendingJSON())[0].id,'overflow');assert.equal(new R.RecordsStore(st).error,null);});
test('earliest completed time wins in either import order and deleted key clears records',()=>{for(const ends of [[3,2],[2,3]]){const st=memory(),a=new R.RecordsStore(st);for(const endedAt of ends)a.add({...rec(),endedAt});assert.equal(a.records[0].endedAt,2);st.removeItem(V2);a.refresh();assert.deepEqual(a.records,[]);assert.deepEqual(a.held,[]);}});
test('held rows validate envelope and restore explicit seat snapshots even with equal indices',()=>{const d=unknown();const h={row:d.rows[0],decks:d.decks};d.rows=[];d.held=[h];h.row[12]=h.row[11];h.decks[1][1]='distinct B';h.row[13]=[['E-hayajimai',1]];assert.equal(R.parseJournalData(text(d)).records[0].decks.B.name,'distinct B');h.row[13]=[['future-card',1]];h.row[7]='invalid';assert.throws(()=>R.parseJournalData(text(d)));});
test('frozen V1 migration preserves all legacy keys and repeated migration bytes',()=>{const raw=v1(),st=memory({[V1]:raw,[V1+'-backup']:'old backup'}),a=new R.RecordsStore(st);assert.equal(a.records[0].decks.A.id,'old-deck');assert.equal(st.getItem(V2),null);a.migrate();const first=st.getItem(V2);for(let i=0;i<3;i++){const b=new R.RecordsStore(st);b.migrate();b.importJSON(raw);}assert.equal(st.getItem(V2),first);assert.equal(st.getItem(V1),raw);assert.equal(st.getItem(V1+'-backup'),'old backup');assert.equal(st.getItem(LEGACY),raw);});
test('quota failures at legacy backup and V2 writes preserve original and pending',()=>{for(const failKey of [LEGACY,V2]){const raw=v1(),st=memory({[V1]:raw}),set=st.setItem;st.setItem=(k,v)=>{if(k===failKey)throw Error('quota');set(k,v);};const a=new R.RecordsStore(st);assert.throws(()=>a.add(rec('new')),/quota/);assert.equal(st.getItem(V1),raw);assert.equal(st.getItem(V2),null);assert.equal(R.parseJournal(a.exportPendingJSON())[0].id,'new');}});
test('V2 backup failure, corrupt journals and explicit recovery preserve data',()=>{const st=memory(),a=new R.RecordsStore(st);a.add(rec());const first=st.getItem(V2);a.add(rec('two'));assert.equal(st.getItem(R.BACKUP_KEY),first);st.setItem(V2,'broken');const b=new R.RecordsStore(st);assert.ok(b.error);assert.throws(()=>b.add(rec('three')));assert.equal(st.getItem(V2),'broken');b.recover();assert.equal(b.records.length,1);const set=st.setItem;st.setItem=(k,v)=>{if(k===R.BACKUP_KEY)throw Error('quota');set(k,v);};assert.throws(()=>b.add(rec('four')),/quota/);assert.equal(st.getItem(V2),first);assert.equal(b.pending.length,2);});
test('bad V1 catalog and future formats never overwrite original',()=>{const d=JSON.parse(v1());d.catalog.reverse();const raw=text(d),st=memory({[V1]:raw}),a=new R.RecordsStore(st);assert.ok(a.error);assert.throws(()=>a.migrate());assert.equal(st.getItem(V1),raw);assert.equal(st.getItem(V2),null);assert.throws(()=>R.parseJournalData(text({format:'naotocchi-records',version:3})));});
test('held duplicate finish times merge earliest non-null in either order without rejecting other imported rows',()=>{
 for(const times of [[3,2],[2,3],[null,2],[2,null],[null,null]]){
  const first=unknown(),second=unknown();first.rows[0][2]=times[0];second.rows[0][2]=times[1];
  const st=memory(),a=new R.RecordsStore(st);a.importJSON(text(first));
  const extra=v2([rec('unrelated')]);const offset=second.decks.length;second.decks.push(...extra.decks);second.rows.push(...extra.rows.map(row=>row.map((v,i)=>i===11||i===12?v+offset:v)));
  a.importJSON(text(second));assert.equal(a.held.length,1);assert.deepEqual(a.records.map(r=>r.id),['unrelated']);
  const expected=times.filter(t=>t!==null).length?Math.min(...times.filter(t=>t!==null)):null;
  assert.equal(a.held[0].row[2],expected);assert.equal(new R.RecordsStore(st).held[0].row[2],expected);
  const before=JSON.parse(text(first));before.rows[0][2]=expected;assert.deepEqual(a.held[0].row,before.rows[0],'only completion time changes');
 }
});
test('held timestamp merge remains atomic when a later imported row conflicts',()=>{
 const st=memory(),a=new R.RecordsStore(st);a.importJSON(text(unknown()));a.importJSON(text(unknown('conflict')));const raw=st.getItem(V2),before=a.exportJSON();
 const d=unknown();d.rows[0][2]=2;const conflict=unknown('conflict');conflict.rows[0][7]='B';const offset=d.decks.length;d.decks.push(...conflict.decks);d.rows.push(...conflict.rows.map(row=>row.map((v,i)=>i===11||i===12?v+offset:v)));
 assert.throws(()=>a.importJSON(text(d)),/一致/);assert.equal(st.getItem(V2),raw);assert.equal(a.exportJSON(),before);assert.equal(a.held[0].row[2],3);
});
