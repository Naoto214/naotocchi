// QA-only independent RGB/alpha verification and deterministic artifact rerun.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const sharp=require(require.resolve('sharp',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]}));
process.chdir(path.resolve(__dirname,'..'));
const out='docs/qa/antlion08-method-d4-20260928',hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const assert=(v,m)=>{if(!v)throw Error(m)};
(async()=>{
 cp.execFileSync(process.execPath,['tools/antlion08-method-d4.cjs']);
 const files=['tired-d4-candidate.png','audit.json','01-sizes.svg','02-particles-trail.svg','03-masks.svg','comparison.html'];
 const before=Object.fromEntries(files.map(p=>[p,hash(fs.readFileSync(out+'/'+p))]));
 cp.execFileSync(process.execPath,['tools/antlion08-method-d4.cjs']);
 assert(files.every(p=>hash(fs.readFileSync(out+'/'+p))===before[p]),'reproduction mismatch');
 const audit=JSON.parse(fs.readFileSync(out+'/audit.json'));
 const images=await Promise.all([audit.sources[0].path,audit.sources[1].path,out+'/tired-d4-candidate.png'].map(p=>sharp(p).ensureAlpha().raw().toBuffer()));
 const [normal,d1,d4]=images,mask=new Set(audit.mappings.map(m=>m.xy[1]*128+m.xy[0]));
 let changed=0,alphaChanged=0,outside=0;
 for(let i=0;i<16384;i++) {
  if(d1[i*4+3]!==d4[i*4+3])alphaChanged++;
  if(!d1.subarray(i*4,i*4+4).equals(d4.subarray(i*4,i*4+4))){changed++;if(!mask.has(i))outside++}
 }
 assert(changed===233&&alphaChanged===0&&outside===0,'pixel preservation');
 for(const m of audit.mappings) {
  const i=(m.xy[1]*128+m.xy[0])*4,j=(m.reference_xy[1]*128+m.reference_xy[0])*4;
  assert(d4.subarray(i,i+3).equals(normal.subarray(j,j+3)),'not actual reference RGB');
 }
 const log=fs.readFileSync(out+'/focused-test.log','utf8');
 assert(/(?:#|ℹ) tests 852\b/.test(log)&&/(?:#|ℹ) pass 852\b/.test(log)&&/(?:#|ℹ) fail 0\b/.test(log),'focused test not complete');
 cp.execFileSync('git',['diff','--check']);
 const v={source_head:audit.source_head,passed:true,changed_pixels:changed,alpha_changes:alphaChanged,protected_changes:outside,reference_RGB_exact_matches:audit.mappings.length,reproduced_files:before,preservation:audit.preservation_after,focused:{tests:852,pass:852,fail:0,command:'node --test tests/pet-expression-assets-test.cjs tests/pet-expression-test.cjs'},full_npm_test:'今回未実行',quick_mode:'今回未実行。既知初回FAIL原因未特定の追跡を維持',git_diff_check:'PASS',production_and_runtime_changed:0};
 fs.writeFileSync(out+'/verification.json',JSON.stringify(v,null,2)+'\n');console.log(JSON.stringify(v));
})();
