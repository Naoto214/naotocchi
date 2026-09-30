// Preservation gates do not imply visual adoption of the nine candidates.
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const sharp=require(require.resolve('sharp',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]}));
process.chdir(path.resolve(__dirname,'..'));
const out='docs/qa/antlion08-method-d-nine-20260928',head='7fda30732e39e365b486a746e0a731558a351f9a';
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'),json=p=>JSON.parse(fs.readFileSync(p));
const assert=(v,m)=>{if(!v)throw Error(m)};
(async()=>{
 const adoption=json(out+'/tired-adoption.json'),assets=json(out+'/start-assets.json'),production=adoption.production;
 const changed=Object.keys(assets).filter(p=>sha(p)!==assets[p]);assert(changed.length===1&&changed[0]===production,'unexpected asset changes');
 assert(sha(production)===adoption.approved_sha256&&sha(adoption.candidate)===adoption.approved_sha256,'D4 adoption mismatch');
 assert(Object.entries(adoption.locked_approved17).every(([p,h])=>sha(p)===h),'approved17 mismatch');
 const allowed=[production,'docs/qa/growth-hunger-expression-implementation-checklist-20260926.md','docs/qa/step4-local-repair-20260927.md','docs/superpowers/specs/2026-09-15-cat-expression-pilot-design.md'];
 const entries=cp.execFileSync('git',['ls-tree','-r','-z',head]).toString().split('\0').filter(Boolean).map(x=>{const[a,p]=x.split('\t');return[p,a.split(' ')[2]]});
 const hashes=cp.execFileSync('git',['hash-object','--stdin-paths'],{input:entries.map(e=>e[0]).join('\n')+'\n'}).toString().trim().split('\n');
 assert(entries.every(([p,h],i)=>allowed.includes(p)||h===hashes[i]),'old file changed outside scope');
 const gen=json(out+'/generation.json');assert(Object.keys(gen.states).length===9,'generation count');
 for(const r of Object.values(gen.states))assert(sha(out+'/'+r.normalized_source)===r.normalized_sha256,'normalized source changed');
 const run=()=>{cp.execFileSync(process.execPath,['tools/antlion08-nine-qa.cjs']);cp.execFileSync('python',['tools/antlion08-nine-structure.py']);cp.execFileSync(process.execPath,['tools/antlion08-nine-state.cjs'])};run();
 const files=[...fs.readdirSync(out).filter(f=>f.endsWith('.svg')||f.endsWith('.html')||['color-audit.json','structure-audit.json','state-audit.json'].includes(f)),...fs.readdirSync(out+'/candidates').map(p=>'candidates/'+p)].sort();
 const before=Object.fromEntries(files.map(p=>[p,sha(out+'/'+p)]));run();assert(files.every(p=>sha(out+'/'+p)===before[p]),'reproduction mismatch');
 const audit=json(out+'/color-audit.json'),normal=await sharp('assets/characters/antlion/08.png').ensureAlpha().raw().toBuffer();let pixels=0;
 for(const [s,r]of Object.entries(audit.states)){
  const src=await sharp(out+'/sources/'+s+'.png').ensureAlpha().raw().toBuffer(),dst=await sharp(out+'/candidates/'+s+'.png').ensureAlpha().raw().toBuffer();
  const mask=new Set(r.mappings_xy_referencexy_beforeRGB_afterRGB.map(m=>m[1]*128+m[0]));
  for(let i=0;i<16384;i++){assert(src[4*i+3]===dst[4*i+3],'alpha changed');if(!mask.has(i))assert(src.subarray(4*i,4*i+4).equals(dst.subarray(4*i,4*i+4)),'protected pixel changed')}
  for(const m of r.mappings_xy_referencexy_beforeRGB_afterRGB){const i=(m[1]*128+m[0])*4,j=(m[3]*128+m[2])*4;assert(dst.subarray(i,i+3).equals(normal.subarray(j,j+3)),'reference color mismatch');pixels++}
 }
 const log=fs.readFileSync(out+'/focused-test.log','utf8');assert(/(?:#|ℹ) tests 852\b/.test(log)&&/(?:#|ℹ) pass 852\b/.test(log)&&/(?:#|ℹ) fail 0\b/.test(log),'focused test incomplete');
 const state=json(out+'/state-audit.json');assert(state.records.length===30,'state composite coverage');assert(state.records.every(r=>r.state===r.resolved&&r.asset_mark_alpha_overlap===0),'resolver/body mark collision');
 assert(Object.entries(state.runtime_hashes).every(([p,h])=>sha(p)===h),'runtime changed');
 cp.execFileSync('git',['diff','--check']);
 const result={source_head:head,mechanical_verification:'PASS; not a visual/adoption verdict',production_changed:[production],production_sha256:sha(production),unchanged_assets:Object.keys(assets).length-1,approved17_preserved:true,unchanged_old_tracked_files:entries.filter(e=>!allowed.includes(e[0])).length,remaining9_production_preserved:true,normal_preserved:true,runtime_changed:0,final_candidate_count:9,normalized_intermediate_count:9,color_anchor_exact_matches:pixels,alpha_and_color_mask_complement_changes:0,reproducible_files:before,focused:{tests:852,pass:852,fail:0},full_test:'今回未実行',quick_mode:'今回未実行。既知初回FAIL原因未特定の追跡維持',git_diff_check:'PASS',visual_warnings:['sick detached gold components beside continuous main leg path: attribution and visual quality require human review','strained fixed leg probe1 differs; visual review required','critical particle density higher; review required','tired existing mark/sweat static overlap; unchanged runtime, actual Home browser unverified'],step4_complete:false};
 fs.writeFileSync(out+'/verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,reproducible_files:files.length}));
})();
