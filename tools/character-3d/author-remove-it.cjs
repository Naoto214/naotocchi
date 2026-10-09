// Task10 candidate/presentation controls only; every mutation is scoped and restored.
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const suite='tests/character-3d-author-candidate-test.cjs',files=['character-3d/nonplayer-spec.js','character-3d/archetypes.mjs','character-3d/spec.js','tools/character-3d/nonplayer-review.cjs'],original=new Map(files.map(f=>[f,fs.readFileSync(f)]));
const scopes={source:[files[0],' const naoto=',' const authorRows='],factory:[files[1],'export function humanoid','// ================= larva'],alias:[files[2],'function specKeyFor','function referenceAsset'],rows:[files[3],'function captureRows','function capturePlan'],stage:[files[3],'function stageAuthorResident','function distanceActor']};
const cases=[
 ['author remains outside near3D range','stage'," Object.assign(actor,{x:sim.player.x+85,z:sim.player.z+15,tx:sim.player.x+85,tz:sim.player.z+15,heading:Math.PI,route:null,behavior:'idle',until:1e9});",'/* initial QA placement omitted */','legal unlock','actual author enters near3D range'],
 ['white source hoodie','source',"top:'#f8f6f0'","top:'#334252'",'naoto original','white source hoodie'],
 ['dark under-shirt','source',"color:'#252832'","color:'#f8f6f0'",'naoto original','dark source shirt'],
 ['eight source hair waves','source','for(let i=0;i<4;i++)','for(let i=0;i<3;i++)','naoto original','exactly eight waves'],
 ['detached source hair constituent','source','segments:[12,8]}]});}','segments:[12,8]}]});}naoto.hair.closedPaths[0].path=naoto.hair.closedPaths[0].path.map(([x,y,z])=>[x+1,y,z]);','naoto: resting','actual shell'],
 ['source hair occludes canonical face','source','at:[0,.13,-.025],segments:[20,14]','at:[0,.02,.23],segments:[20,14]','naoto: one','source volume covers canonical'],
 ['neck loses torso contact','source','[[0,.37,0],[0,.49,.005],[0,.55,.015]]','[[0,.62,0],[0,.70,.005],[0,.75,.015]]','naoto: resting','authorNeck/body'],
 ['detached pale shoe sole','source','at:[0,-.55,.0243]','at:[.40,-.55,.0243]','naoto: resting','authorSoleL/legL'],
 ['hair terminal inward cap','source','radius:.055,taper:.88,outwardCaps:true','radius:.055,taper:.88,outwardCaps:false','terminal indexed','hair wave 0: outward'],
 ['arm terminal inward cap','source','arms:{len:.40,r:.048,outwardCaps:true}','arms:{len:.40,r:.048,outwardCaps:false}','terminal indexed','arm L: outward'],
 ['humanoid default floor offset','factory','0.02+(Lg.floorOffset||0)','0.02+(Lg.floorOffset||.01)','frozen adult','local transform'],
 ['overbroad actual author alias','alias',"ref.id==='naoto'&&Object.hasOwn",'Object.hasOwn','exact actual author','Expected values'],
 ['legacy model key drift','rows','rows.push({key,modelKey:id,kind:', 'rows.push({key,modelKey:key,kind:','capture planner','Expected values'],
 ['legacy redundant four-view recapture','rows','reuseFourViews:true,reuse:', 'reuseFourViews:false,reuse:','capture planner','Expected values'],
 ['staged author clone loses actual identity','stage','target.residents.push(actor);','target.residents.push({...actor});','legal unlock','distanceActor'],
 ['author route bypasses legal unlock','stage',"if(!bridge.isAuthorUnlocked())throw Error('Author QA requires existing legal unlock');",'/* unlock guard omitted */','legal unlock','Missing expected exception'],
 ['author adapter omits restore','stage','run.renderer.draw=draw;run.sim.step=step;','run.sim.step=step;','legal unlock','run.renderer.draw===draw'],
 ['author pose omits restore','stage','Object.assign(actor,rest);','/* pose restore omitted */','legal unlock','same resident pose restored']
];
const args=process.argv.slice(2);assert.ok(args.length<=1&&args.every(a=>a.startsWith('--case=')||a.startsWith('--from-case=')),'optional --case= or --from-case= exact mutation name');const name=args[0]?.startsWith('--case=')?args[0].slice(7):null,from=args[0]?.startsWith('--from-case=')?args[0].slice(12):null;assert.ok(!from||cases.some(c=>c[0]===from),'known resume control');const selected=name?cases.filter(c=>c[0]===name):from?cases.slice(cases.findIndex(c=>c[0]===from)):cases;assert.ok(selected.length,'known selected mutation');
const run=pattern=>cp.spawnSync(process.execPath,['--test','--test-reporter=tap',...(pattern?['--test-name-pattern='+pattern]:[]),suite],{encoding:'utf8',timeout:180000});
const restored=()=>{for(const [f,b]of original)assert.ok(fs.readFileSync(f).equals(b),f+': exact byte restoration');};
const before=run(name?selected[0][4]:'original|terminal|frozen|identity|planner|legal');assert.equal(before.status,0,before.stdout+before.stderr);
for(const [label,scope,anchor,replacement,pattern,error]of selected){const [file,start,end]=scopes[scope],text=original.get(file).toString(),lo=text.indexOf(start),hi=text.indexOf(end,lo+start.length);assert.ok(lo>=0&&hi>lo,label+': stable bounds');const fragment=text.slice(lo,hi);assert.equal(fragment.split(anchor).length,2,label+': unique scoped anchor');try{fs.writeFileSync(file,text.slice(0,lo)+fragment.replace(anchor,replacement)+text.slice(hi));const result=run(pattern);assert.equal(result.status,1,label+': expected RED\n'+result.stdout+result.stderr);assert.ok(result.stdout.includes('AssertionError'),label+': meaningful assertion');assert.ok(result.stdout.includes(error),label+': expected failure\n'+result.stdout);console.log(label+': RED');}finally{for(const [f,b]of original)fs.writeFileSync(f,b);restored();}}
const after=run(name?selected[0][4]:undefined);assert.equal(after.status,0,after.stdout+after.stderr);restored();for(const [f,b]of original)console.log(f+': original/restored SHA256 '+crypto.createHash('sha256').update(b).digest('hex'));console.log(selected.length+'/'+selected.length+' controls detected; restored focused baseline GREEN; exact source bytes verified');
