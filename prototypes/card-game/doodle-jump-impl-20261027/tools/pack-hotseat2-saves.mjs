// Pack the generated hotseat-2 saves with the digest of the state the PRE-CHANGE engine reaches when restoring them.
// Usage: node tools/pack-hotseat2-saves.mjs <pre-change card-game dir> <saves-raw.json> > ../tests/doodle-jump-hotseat2-saves.json
import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';
const [root,raw]=process.argv.slice(2);const e=await import(root+'/engine.mjs');
const digest=s=>createHash('sha256').update(JSON.stringify({players:s.players,result:s.result,log:s.log})).digest('hex');
const d=JSON.parse(readFileSync(raw,'utf8'));const rows=[];
for(const [name,v] of Object.entries(d)){const s=e.restore(v.save);
 rows.push({case:name,seed:v.seed,seat:v.hit.seat,timeSkipRevision:v.hit.revision,timeSkipStages:v.hit.jump,finalRevision:s.revision,result:s.result,stateSha256:digest(s),save:JSON.parse(v.save)});}
console.log(JSON.stringify({note:'Generated with the pre-change engine (main 9e3929da, hotseat-2). Each save resolves ぴょんぴょんジャンプ with the OLD effect at the time-skip at timeSkipRevision. Restoring must reproduce stateSha256 exactly.',generatedFrom:'9e3929da9e53fc94edfce85c2a3fc5ff8d596fe7',rows},null,1));
