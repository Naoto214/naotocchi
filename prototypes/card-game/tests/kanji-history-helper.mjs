// Test-only canonicalization of approved display spelling; never migrates stored data.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const names=JSON.parse(fs.readFileSync(new URL('../../../tools/kanji-display-names-v17-20261119.json',import.meta.url))).cards;
export function beforeKanji(card){
 const c={...card},d=names[c.id];if(!d)return c;
 assert.equal(c.name,d.displayName,c.id);assert.equal(c.reading,d.reading,c.id);assert.deepEqual(c.searchAliases,d.searchAliases,c.id);assert.equal(c.displayNameVersion,'kanji-v17');
 c.name=d.legacyNames[0];delete c.reading;delete c.searchAliases;delete c.displayNameVersion;
 if(c.id==='E-special-trip-memory')for(const id of ['W-memory_lake','W-star_stop'])c.text=c.text.replace(names[id].displayName,names[id].legacyNames[0]);
 return c;
}
export function beforeKanjiLog(log){
 return log.map(entry=>typeof entry==='string'?Object.values(names).reduce((text,d)=>text.replaceAll(d.displayName,d.legacyNames[0]),entry):entry);
}

// The frozen hotseat-2 doodle-jump fixtures used the former E-mirror title in these five messages.
const mirrorLogTemplates = ['A：%を発動', 'A：%を解決', 'B：%を発動', 'B：%を解決', '公開：%'];
const historicalMirrorMessages = new Map(mirrorLogTemplates.map(template => [
 template.replace('%', '年をとった自分'), template.replace('%', 'としをとったじぶん')
]));
export function beforeMirrorTitle(log) {
 return log.map(line => historicalMirrorMessages.get(line) ?? line);
}
