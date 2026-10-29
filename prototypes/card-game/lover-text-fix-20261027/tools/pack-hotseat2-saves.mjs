import {createHash} from 'node:crypto';import {readFileSync} from 'node:fs';
const root=process.argv[2],dir=process.argv[3];const e=await import(root+'/engine.mjs');
const digest=s=>createHash('sha256').update(JSON.stringify({players:s.players,result:s.result,log:s.log})).digest('hex');
const rows=[];for(const w of ['spider','scorpion']){const d=JSON.parse(readFileSync(dir+'/'+w+'.json'));const s=e.restore(d.save);
 rows.push({case:w==='spider'?'knitting-spider-marriage-trigger':'desert-scorpion-face-down-item',seed:d.seed,triggerRevision:d.hit.revision,finalRevision:s.revision,result:s.result,stateSha256:digest(s),save:JSON.parse(d.save)});}
console.log(JSON.stringify({note:'Generated with the pre-fix engine (main 9e3929da, hotseat-2). Each save uses the old behaviour once at triggerRevision. Restoring must reproduce stateSha256 exactly.',generatedFrom:'9e3929da9e53fc94edfce85c2a3fc5ff8d596fe7',rows},null,1));
