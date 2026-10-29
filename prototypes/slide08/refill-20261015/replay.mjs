import {createHash} from 'node:crypto';import fs from 'node:fs';import {fileURLToPath} from 'node:url';import {create,step,validate} from './engine.mjs';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function verify(d){
 validate(d.initial);let s=create(d.seed,d.profile,d.gauge);
 if(hash(s)!==hash(d.initial)||d.hashes.length!==d.actions.length+1||d.spawns.length!==d.actions.length)throw Error('initial/envelope mismatch');
 if(hash(s)!==d.hashes[0])throw Error('initial hash');
 for(let i=0;i<d.actions.length;i++){
  const r=step(s,d.actions[i]);if(!r.valid||hash(r.state)!==d.hashes[i+1]||hash(r.spawns)!==hash(d.spawns[i]))throw Error(`transition ${i}`);
  s=r.state;validate(s);
 }
 if(hash(s)!==hash(d.final)||(d.status==='solved')!==s.won)throw Error('terminal mismatch');
 return s;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const root=fileURLToPath(new URL('./results/',import.meta.url));let traces=0,won=0;
 for(const f of fs.readdirSync(root).filter(f=>f.endsWith('.json')&&!f.endsWith('-plan.json'))){const d=JSON.parse(fs.readFileSync(root+f));if(!d.actions)continue;won+=Number(verify(d).won);traces++;}
 console.log(JSON.stringify({traces,verifiedWins:won,passed:true}));
}
