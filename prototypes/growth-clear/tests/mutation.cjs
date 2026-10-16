const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const src=path.resolve(__dirname,'..'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'growth-clear-mutation-'));
fs.cpSync(src,path.join(tmp,'growth-clear'),{recursive:true,filter:p=>!p.includes('/results')});fs.symlinkSync(path.resolve(src,'../growth-chain'),path.join(tmp,'growth-chain'),'dir');
const mutations=[
 ['mixed precedence','engine.mjs','new Set(g.map(c=>c.k)).size>1','false'],
 ['mixed no reward','engine.mjs','stats.gauge+=mixed||death?0:stage-old','stats.gauge+=mixed||death?1:stage-old'],
 ['mixed 08 not clear','engine.mjs','death=!mixed&&old===8','death=old===8'],
 ['pure08 clear','engine.mjs','death=!mixed&&old===8','death=false'],
 ['full group consume','engine.mjs','for(const c of g)next[c.y][c.x]=null','for(const c of g.slice(0,2))next[c.y][c.x]=null'],
 ['growth max4','engine.mjs','Math.min(4,g.length-1)','Math.min(3,g.length-1)'],
 ['stage cap08','engine.mjs','Math.min(8,old+delta)','Math.min(7,old+delta)'],
 ['gravity cascade','engine.mjs','chain<=input.length*input[0].length','chain<=1'],
 ['anchor B','engine.mjs',"if(context.anchor==='B')anchor=priority", "if(false)anchor=priority"],
 ['anchor C','engine.mjs',"if(context.anchor==='C'){","if(false){"],
 ['egg rewards','engine.mjs','if(eggRank>=0)stats.eggs[eggRank]++','if(false)stats.eggs[eggRank]++'],
 ['species count','bag.mjs','[3,3,2,2,2].forEach','[4,3,2,2,2].forEach'],
 ['category count','bag.mjs','equal:i<7','equal:i<6'],
 ['stage marginal','bag.mjs','[.4,.3,.2,.1]','[.7,.1,.1,.1]'],
 ['bag reproducibility','bag.mjs','const rng={state:seed}','const rng={state:Math.floor(Math.random()*4294967296)}'],
 ['drop stages','session.mjs','{ id, ...pair[i] }','{ id, ...pair[i], s:1 }'],
 ['bulk price','session.mjs',"a.type === \"bulk\" ? 3 : 1","a.type === \"bulk\" ? 2 : 1"],
 ['egg consumption','session.mjs','z.eggs[a.rank]--;','z.eggs[a.rank] += 0;'],
 ['transient08 metrics','metrics.mjs','[w.before,w.merged,w.after]','[]'],
 ['mixed success','metrics.mjs','if(e.mixed){m.mixedGroups++','if(e.mixed){m.success=true;m.mixedGroups++'],
];
const results=[];
for(const [name,file,from,to] of mutations){const target=path.join(tmp,'growth-clear',file),original=fs.readFileSync(target,'utf8');if(!original.includes(from))throw Error('missing mutation '+name);fs.writeFileSync(target,original.replace(from,to));const r=cp.spawnSync(process.execPath,['--test',...['core','session','measurement'].map(n=>path.join(tmp,'growth-clear/tests',n+'.test.mjs'))],{encoding:'utf8',timeout:30000});fs.writeFileSync(target,original);const killed=r.status!==0;results.push({name,killed,status:r.status,timeout:r.error?.code==='ETIMEDOUT'});console.log(name,killed?'KILLED':'SURVIVED');}
fs.writeFileSync(path.join(src,'mutation-results.json'),JSON.stringify(results,null,2));fs.rmSync(tmp,{recursive:true,force:true});if(results.some(r=>!r.killed||r.timeout))process.exitCode=1;
