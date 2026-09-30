// QA only. D1 geometry; reference-palette RGB transfer, no fatigue correction.
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cp = require('child_process');
const sharp = require(require.resolve('sharp', {paths: [process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]}));
const root = path.resolve(__dirname, '..'); process.chdir(root);
const out = 'docs/qa/antlion08-method-d4-20260928';
const sourceHead = '5f1f9a9b4c60b94b70a8758c108e62dda9b0ae82';
const paths = ['assets/characters/antlion/08.png', 'docs/qa/antlion08-method-d-20260928/tired-candidate.png', 'docs/qa/antlion08-method-d3-20260928/tired-d3-candidate.png'];
const expected = ['2f6879f36f91bf27b7f4be12a74ca5684d969a067977ec552787ea70d2e23dbe', '68332a0a42fcd2cc2af179577512a2bf88e1421ff6877517f4bcfc6a9e8e2a26', 'c1a6bee7ddb394d17b1ff46fce68785004eec4960db084efefacb5194fb5acb2'];
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const sha = p => hash(fs.readFileSync(p));
const assert = (v, message) => {if (!v) throw Error(message)};
function components(data) {
 const labels = new Int32Array(16384); let id = 0;
 for (let i = 0; i < labels.length; i++) if (data[i*4+3] && !labels[i]) {
  const queue = [i]; labels[i] = ++id;
  for (let q = 0; q < queue.length; q++) {
   const x = queue[q]%128, y = queue[q]>>7;
   for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) {
    const nx=x+dx,ny=y+dy,j=ny*128+nx;
    if(nx>=0&&nx<128&&ny>=0&&ny<128&&data[j*4+3]&&!labels[j]) {labels[j]=id;queue.push(j)}
   }
  }
 }
 return {labels,count:id};
}
const rgb = (data,i) => Array.from(data.subarray(i*4,i*4+3));
const luminance = c => c.reduce((s,v,k) => s+[.2126,.7152,.0722][k]*(v/255<=.04045?v/255/12.92:((v/255+.055)/1.055)**2.4),0);
function lab(c) {
 const lin=c.map(v=>v/255<=.04045?v/255/12.92:((v/255+.055)/1.055)**2.4);
 const xyz=[[.4124564,.3575761,.1804375],[.2126729,.7151522,.0721750],[.0193339,.1191920,.9503041]].map((row,k)=>row.reduce((s,v,j)=>s+v*lin[j],0)/[.95047,1,1.08883][k]);
 const f=xyz.map(v=>v>216/24389?Math.cbrt(v):(24389/27*v+16)/116);
 return [116*f[1]-16,500*(f[0]-f[1]),200*(f[1]-f[2])];
}
const mean = values => values[0].map((_,k)=>values.reduce((s,v)=>s+v[k],0)/values.length);
const stats = colors => ({pixels:colors.length,mean_rgb:mean(colors),mean_Lab:mean(colors.map(lab)),mean_relative_luminance:colors.reduce((s,c)=>s+luminance(c),0)/colors.length});
function preservation() {
 const prior=JSON.parse(fs.readFileSync('docs/qa/antlion08-method-d2-20260928/audit.json'));
 assert(Object.entries(prior.assets_before).every(([p,h])=>sha(p)===h),'asset SHA mismatch');
 const lock=JSON.parse(fs.readFileSync('docs/qa/starfish-bubble-final-approval-20260928.json'));
 assert(Object.entries(lock.locked16).every(([p,h])=>sha(p)===h),'approved16 mismatch');
 const entries=cp.execFileSync('git',['ls-tree','-r','-z',sourceHead]).toString().split('\0').filter(Boolean).map(e=>{const[a,p]=e.split('\t');return[p,a.split(' ')[2]]});
 const actual=cp.execFileSync('git',['hash-object','--stdin-paths'],{input:entries.map(e=>e[0]).join('\n')+'\n'}).toString().trim().split('\n');
 assert(entries.every((e,i)=>e[1]===actual[i]),'existing tracked file changed');
 return {assets:Object.keys(prior.assets_before).length,approved16:16,existing_tracked_files:entries.length};
}
(async()=>{
 const before=preservation();fs.mkdirSync(out,{recursive:true});
 const inputs=paths.map(p=>fs.readFileSync(p));inputs.forEach((b,i)=>assert(hash(b)===expected[i],'source SHA'));
 const raws=await Promise.all(inputs.map(b=>sharp(b).ensureAlpha().raw().toBuffer()));
 const [normal,d1]=raws, result=Buffer.from(d1), nc=components(normal), dc=components(d1);
 assert(nc.count===26&&dc.count===49,'source component identities changed');
 const prior=JSON.parse(fs.readFileSync('docs/qa/antlion08-method-d2-20260928/audit.json'));
 const selected=prior.changes_xy_before_after_rgba.map(p=>p[1]*128+p[0]), selectedSet=new Set(selected);
 // Manually reviewed normal: all detached gold/brown particles (2..26),
 // with the independent exterior trail component17 treated separately.
 // D1 mask: prior-reviewed233 pixels; attached wing junction stays protected.
 const groups={particles:{reference:[],target:[]},trail:{reference:[],target:[]}};
 for(let i=0;i<16384;i++) if(nc.labels[i]>1) groups[nc.labels[i]===17?'trail':'particles'].reference.push(i);
 for(const i of selected) groups[dc.labels[i]===1?'trail':'particles'].target.push(i);
 const mappings=[],metrics={};
 for(const [name,g] of Object.entries(groups)) {
  const sorted=(indices,data)=>indices.slice().sort((a,b)=>luminance(rgb(data,a))-luminance(rgb(data,b))||a-b);
  const ref=sorted(g.reference,normal),target=sorted(g.target,d1);
  target.forEach((i,k)=>{
   const j=ref[Math.min(ref.length-1,Math.floor((k+.5)*ref.length/target.length))];
   const c=rgb(normal,j);c.forEach((v,q)=>result[i*4+q]=v);
   mappings.push({group:name,xy:[i%128,i>>7],reference_xy:[j%128,j>>7],before:rgb(d1,i),after:c});
  });
  const rc=g.reference.map(i=>rgb(normal,i)),oc=g.target.map(i=>rgb(result,i));
  const rstats=stats(rc),ostats=stats(oc),palette=new Set(rc.map(c=>c.join(',')));
  assert(oc.every(c=>palette.has(c.join(','))),'not reference RGB');
  const dl=ostats.mean_Lab.map((v,k)=>v-rstats.mean_Lab[k]);
  metrics[name]={normal:rstats,D1:stats(g.target.map(i=>rgb(d1,i))),D3:stats(g.target.map(i=>rgb(raws[2],i))),D4:ostats,mean_rgb_difference:ostats.mean_rgb.map((v,k)=>v-rstats.mean_rgb[k]),distance_between_mean_Lab:Math.hypot(...dl),nearest_reference_RGB_max_distance:0,nearest_reference_deltaE76_max:0,target_pixels_using_reference_palette_fraction:1};
 }
 let outside=0,alpha=0,changed=0;
 for(let i=0;i<16384;i++) {
  const different=!d1.subarray(i*4,i*4+4).equals(result.subarray(i*4,i*4+4));
  if(different)changed++;if(different&&!selectedSet.has(i))outside++;if(d1[i*4+3]!==result[i*4+3])alpha++;
 }
 assert(!outside&&!alpha&&changed===233,'invariant violation');
 await sharp(result,{raw:{width:128,height:128,channels:4}}).png({palette:false}).toFile(out+'/tired-d4-candidate.png');
 const candidate=fs.readFileSync(out+'/tired-d4-candidate.png'),images=[...inputs,candidate],names=['通常基準08','D1','D3','D4'];
 const uri=b=>'data:image/png;base64,'+b.toString('base64');
 async function sheet(file,title,sizes,crop) {
  let y=70;const elements=[];const max=Math.max(...sizes),width=4*(max+24)+24;
  for(const n of sizes) {
   for(let j=0;j<4;j++) {
    let s=sharp(images[j]);if(crop)s=s.extract({left:crop[0],top:crop[1],width:crop[2]-crop[0],height:crop[3]-crop[1]});
    const h=crop?Math.round(n*(crop[3]-crop[1])/(crop[2]-crop[0])):n;
    const b=await s.resize(n,h,{kernel:'nearest'}).flatten({background:'#e6eaed'}).png().toBuffer();const x=12+j*(max+24);
    elements.push(`<text x="${x}" y="${y}" font-size="15">${names[j]}${crop?'':' '+n+'px'}</text><image x="${x}" y="${y+12}" width="${n}" height="${h}" href="${uri(b)}"/>`);
   }
   y+=(crop?Math.round(n*(crop[3]-crop[1])/(crop[2]-crop[0])):n)+48;
  }
  fs.writeFileSync(out+'/'+file,`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${y+70}"><rect width="100%" height="100%" fill="white"/><g font-family="sans-serif" fill="#172638"><text x="12" y="28" font-size="22">${title}</text><text x="12" y="49" font-size="14">D4：通常基準の色を参照。疲労用の追加補正なし。</text>${elements.join('')}<text x="12" y="${y+12}" font-size="14">確認：同じ種類の金茶色の光・粒子に見えるか。</text><text x="12" y="${y+36}" font-size="14">形・位置・個数・alpha・身体・顔はD1のまま。本番未採用。</text></g></svg>\n`);
 }
 await sheet('01-sizes.svg','通常基準08／D1／D3／D4：同倍率',[128,104,80,64]);
 await sheet('02-particles-trail.svg','粒子・軌跡：色調の拡大比較',[288],[8,60,80,117]);
 // Reference and target sample masks are evidence, not extra candidate PNGs.
 let panels=[];
 for(const [j,raw]of [normal,d1].entries()) {
  const b=Buffer.from(raw);
  for(let i=0;i<16384;i++) {
   const group=j===0?(nc.labels[i]>1?(nc.labels[i]===17?'trail':'particles'):null):(selectedSet.has(i)?(dc.labels[i]===1?'trail':'particles'):null);
   const color=group==='particles'?[227,66,138]:group==='trail'?[0,147,190]:[130,140,150];
   for(let k=0;k<3;k++)b[i*4+k]=color[k];
  }
  const png=await sharp(b,{raw:{width:128,height:128,channels:4}}).png().toBuffer();
  panels.push(`<text x="${12+j*400}" y="62" font-size="18">${j?'D1：変更対象233画素':'通常基準：参照色189画素'}</text><image x="${12+j*400}" y="80" width="384" height="384" href="${uri(png)}" style="image-rendering:pixelated"/>`);
 }
 fs.writeFileSync(out+'/03-masks.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="815" height="525"><rect width="100%" height="100%" fill="#e6eaed"/><g font-family="sans-serif"><text x="12" y="28" font-size="22">参照maskと変更mask</text>${panels.join('')}<text x="12" y="493" font-size="17">桃：独立した粒子／青：外側の細い軌跡／灰：保護・参照外</text></g></svg>\n`);
 const figures=['01-sizes.svg','02-particles-trail.svg','03-masks.svg'];
 fs.writeFileSync(out+'/comparison.html',`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;max-width:1300px;margin:auto;padding:12px}.scroll{overflow:auto}img{display:block}p{max-width:700px}</style><h1>D4：通常基準と同じ種類の光・粒子へ</h1><p>疲労表現は顔と疲労マークが担う、という人間判断に従います。D4はD1原本から色のみ変更。横にスクロールして4列を同倍率で確認してください。画像は自動縮小していません。</p>${figures.map(f=>'<div class="scroll"><img alt="'+f+'" src="data:image/svg+xml;base64,'+fs.readFileSync(out+'/'+f).toString('base64')+'"></div>').join('')}<p>定量値と限界はreport.md／audit.json。本番未採用・人間確認待ち。</p></html>\n`);
 const after=preservation();assert(JSON.stringify(before)===JSON.stringify(after),'preservation mismatch');
 const audit={source_head:sourceHead,date:'2026-09-28',method:'D1 direct source; per-group empirical palette quantile transfer ordered by linear-sRGB luminance; RGB tuples sampled from official normal08 only; no darkening/desaturation coefficient',sources:paths.map((p,i)=>({path:p,sha256:expected[i]})),candidate_sha256:hash(candidate),reference_groups:{particles:'normal connected components2..26 excluding17;116pixels',trail:'normal component17;73pixels'},target_groups:{particles:168,trail:65},mask_source:'docs/qa/antlion08-method-d2-20260928/audit.json',mask_sha256:sha('docs/qa/antlion08-method-d2-20260928/audit.json'),metrics,mappings,changed_pixels:changed,change_bbox:[8,33,84,116],protected_complement_changed:outside,alpha_changed:alpha,body_face_legs_wings_antennae_abdomen_changed:0,components_before:dc.count,components_after:components(result).count,preservation_before:before,preservation_after:after,production_changes:0,runtime_changes:0,candidate_count:1,human_approved:false,production_adopted:false,limits:['Same reference RGB palette; distributions are not identical because source and target sample counts/shapes differ.','Palette matching is color correspondence, not a claim of identical appearance, brightness perception, or spatial pixel identity.','Protected ambiguous junction and near-body pixels remain D1. No whole-image color matching.']};
 fs.writeFileSync(out+'/audit.json',JSON.stringify(audit,null,2)+'\n');
 cp.execFileSync('git',['diff','--check']);console.log(JSON.stringify({sha:audit.candidate_sha256,metrics,changed,alpha,outside,preservation:after}));
})();
