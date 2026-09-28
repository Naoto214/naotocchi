// QA gate: only candidate/docs/tools are new; every pre-existing source is immutable.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/qa/antlion08-method-d-20260928');process.chdir(root);
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),r=JSON.parse(fs.readFileSync(path.join(out,'audit.json'))),checks=[];
function ck(n,v){if(!v)throw Error(n);checks.push(n)}
const before=JSON.parse(fs.readFileSync(path.join(out,'start-hashes.json'))),locks=JSON.parse(fs.readFileSync('docs/qa/starfish-bubble-final-approval-20260928.json'));
ck('all2862 production assets start/end/current identical',Object.keys(before).length===2862&&JSON.stringify(before)===JSON.stringify(r.asset_hashes_after)&&Object.entries(before).every(([p,h])=>sha(p)===h));
ck('approved16 preserved',Object.keys(locks.locked16).length===16&&Object.entries(locks.locked16).every(([p,h])=>sha(p)===h));
ck('starfish final approval and step4 incomplete',locks.status==='human_approved_complete'&&!locks.step4_complete);
ck('sole generation reference official normal',JSON.stringify(r.generation_reference_paths)==='["assets/characters/antlion/08.png"]'&&r.old_tired_pixels_used===false);
ck('one generation no retries no adoption',r.generation_calls===1&&r.retries===0&&!r.human_approved&&!r.production_adopted);
ck('one QA candidate PNG',fs.readdirSync(out).filter(p=>p.endsWith('.png')).join()==='tired-candidate.png');
ck('candidate hash fixed',sha(path.join(out,'tired-candidate.png'))===r.candidate_sha256);
ck('eight observed leg-route connectivity probes',r.leg_route_checks.length===8&&r.leg_route_checks.every(x=>x.connected_8_neighbour));
ck('same approved bounds, binary alpha',r.components.every(x=>JSON.stringify(x.bounds)==='[8,12,120,116]'&&JSON.stringify(x.alpha_values)==='[0,255]'));
const entries=cp.execFileSync('git',['ls-tree','-r','-z',r.source_head]).toString().split('\0').filter(Boolean).map(e=>{const [meta,p]=e.split('\t');return [p,meta.split(' ')[2]]});
const actual=cp.execFileSync('git',['hash-object','--stdin-paths'],{input:entries.map(e=>e[0]).join('\n')+'\n'}).toString().trim().split('\n');ck('every pre-existing tracked blob unchanged',entries.length===actual.length&&entries.every(([p,h],i)=>actual[i]===h));
const state=JSON.parse(fs.readFileSync(path.join(out,'state-composite.json')));ck('canonical resolver tired and four sizes',state.resolved==='tired'&&state.records.map(x=>x.size).join()==='128,104,80,64');
ck('runtime CSS/resolver hashes unchanged',Object.entries(state.runtime_hashes).every(([p,h])=>sha(p)===h));
const e=require(path.join(root,'pet-expression.js'));ck('canonical accent exact',state.canonical_accent===e.accentFor('assets/characters/antlion/08.png','tired'));
const log=fs.readFileSync(path.join(out,'focused-test.log'),'utf8');ck('focused852pass0fail',/ℹ pass 852\b/.test(log)&&/ℹ fail 0\b/.test(log));ck('z-order regression executed',log.includes('✔ the selected expression mark paints above illness sweat and character art'));
const files=fs.readdirSync(out).filter(p=>p.endsWith('.svg')||p.endsWith('.html')||['audit.json','state-composite.json'].includes(p));const hashes=Object.fromEntries(files.map(p=>[p,sha(path.join(out,p))]));
cp.execFileSync('python',['tools/antlion08-method-d-qa.py']);cp.execFileSync('node',['tools/antlion08-method-d-state.cjs']);ck('QA outputs byte reproducible from committed candidate',files.every(p=>sha(path.join(out,p))===hashes[p]));
ck('production assets unchanged after QA repeat',Object.entries(before).every(([p,h])=>sha(p)===h));cp.execFileSync('git',['diff','--check']);ck('git diff --check',true);
const result={source_head:r.source_head,checks_passed:checks.length,checks,existing_tracked_files_verified:entries.length,assets_verified:2862,approved16_preserved:true,production_png_changes:0,normal_png_changes:0,runtime_changes:0,candidate_png_count:1,candidate_sha256:r.candidate_sha256,reproducible_outputs:hashes,focused:{pass:852,fail:0},full_test:'not run',quick_mode:'not run; known initial failure cause unresolved',actual_home_browser:'not checked',human_approved:false,production_adopted:false};
fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({checks:checks.length,existing_files:entries.length,assets:2862,candidate_png:1,production_changes:0,reproduced:files.length}));
