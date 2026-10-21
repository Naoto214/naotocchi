const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const src=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'growth-clear-phone-mutation-'));
fs.cpSync(src,path.join(tmp,'growth-clear'),{recursive:true,filter:p=>!p.includes('/results')&&!p.includes('/qa/')});fs.symlinkSync(path.resolve(src,'../growth-chain'),path.join(tmp,'growth-chain'),'dir');
const mutations=[
['stop auto fall','player-model.mjs','this.elapsed += dt;','return;'],
['wrong saved pose','player-model.mjs','pose: { ...this.pose },','pose: spawnPose(this.state.rules),'],
['lost fall timer','player-model.mjs','fallMs: this.fallMs,','fallMs: 0,'],
['stale target accepted','live-tools.mjs','s.board[a.y]?.[a.x]?.id !== expectedId','false'],
['animation accepts drop','player-model.mjs','if (!this.active) return false;\n    const s = applyAction','if (false) return false;\n    const s = applyAction'],
['no mixed empty frame','effects.mjs','phase: f.phase === "evolve" ? "pop" : f.phase','phase: f.phase'],
['hidden lock delay','player-model.mjs','this.lockMs = 0;\n          throw error;','throw error;'],
['wrong tool cost','session.mjs','z.gauge -= cost;','z.gauge -= cost * 2;'],
];
const result=[];for(const [name,file,from,to] of mutations){const target=path.join(tmp,'growth-clear',file),original=fs.readFileSync(target,'utf8');if(!original.includes(from))throw Error('Missing '+name);fs.writeFileSync(target,original.replace(from,to));const r=cp.spawnSync(process.execPath,['--test',...['player','effects'].map(n=>path.join(tmp,'growth-clear/tests',n+'.test.mjs'))],{encoding:'utf8',timeout:10000});fs.writeFileSync(target,original);const killed=r.status!==0&&!r.error;result.push({name,killed,status:r.status});console.log(name,killed?'KILLED':'SURVIVED');}fs.rmSync(tmp,{recursive:true,force:true});fs.writeFileSync(path.join(src,'phone-mutation-results.json'),JSON.stringify(result,null,2));if(result.some(r=>!r.killed))process.exitCode=1;
