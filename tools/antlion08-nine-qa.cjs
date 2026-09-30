// QA-only candidates and reproducible sheets. Never writes production assets.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sharp=require(require.resolve('sharp',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]}));
process.chdir(path.resolve(__dirname,'..'));
const out='docs/qa/antlion08-method-d-nine-20260928';
const states=['happy','strained','hungry','sick','sulky','weak','critical','wantsPlay','sleeping'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex'),read=p=>fs.readFileSync(p),json=p=>JSON.parse(read(p));
const assert=(v,m)=>{if(!v)throw Error(m)};
function components(data){const labels=new Int32Array(16384),sizes=[0];let n=0;for(let i=0;i<16384;i++)if(data[4*i+3]&&!labels[i]){const q=[i];labels[i]=++n;for(let k=0;k<q.length;k++){const x=q[k]%128,y=q[k]>>7;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,j=yy*128+xx;if(xx>=0&&xx<128&&yy>=0&&yy<128&&data[j*4+3]&&!labels[j]){labels[j]=n;q.push(j)}}}sizes[n]=q.length}return{labels,sizes,count:n}}
const rgb=(a,i)=>Array.from(a.subarray(i*4,i*4+3));
const lum=c=>c.reduce((s,v,k)=>s+[.2126,.7152,.0722][k]*(v/255<=.04045?v/255/12.92:((v/255+.055)/1.055)**2.4),0);
const mean=cs=>[0,1,2].map(k=>cs.reduce((s,c)=>s+c[k],0)/cs.length);
const uri=b=>'data:image/png;base64,'+b.toString('base64');
const normalPath='assets/characters/antlion/08.png',d4Path='docs/qa/antlion08-method-d4-20260928/tired-d4-candidate.png';
(async()=>{
 assert(hash(read(normalPath))==='2f6879f36f91bf27b7f4be12a74ca5684d969a067977ec552787ea70d2e23dbe','normal changed');
 assert(hash(read(d4Path))==='ec6466cc95cd475282449d6a7f666e369976e97f58e8686cbf75d3f2bf499161','D4 changed');
 fs.mkdirSync(out+'/candidates',{recursive:true});const normal=await sharp(normalPath).ensureAlpha().raw().toBuffer(),nc=components(normal);
 const refs={particles:[],trail:[]};for(let i=0;i<16384;i++)if(nc.labels[i]>1)refs[nc.labels[i]===17?'trail':'particles'].push(i);
 const cfg=json(out+'/color-masks.json'),audit={},maskImages=[];
 for(const state of states){
  const input=read(out+'/sources/'+state+'.png');assert(hash(input)===cfg[state].source_sha256,'source changed');
  const source=await sharp(input).ensureAlpha().raw().toBuffer(),cc=components(source),result=Buffer.from(source),groups={particles:[],trail:[]};
  const ids=new Set(cfg[state].particle_component_ids),[x0,y0,x1,y1]=cfg[state].trail_main_component_clip;
  for(let i=0;i<16384;i++){const x=i%128,y=i>>7;if(ids.has(cc.labels[i]))groups.particles.push(i);else if(cc.labels[i]===1&&x>=x0&&x<x1&&y>=y0&&y<y1)groups.trail.push(i)}
  const mappings=[],metrics={};
  for(const group of ['particles','trail']){
   const sort=(is,a)=>is.slice().sort((i,j)=>lum(rgb(a,i))-lum(rgb(a,j))||i-j);
   const rr=sort(refs[group],normal),tt=sort(groups[group],source);assert(tt.length>0,'empty mask');
   tt.forEach((i,k)=>{const j=rr[Math.min(rr.length-1,Math.floor((k+.5)*rr.length/tt.length))],color=rgb(normal,j);color.forEach((v,c)=>result[i*4+c]=v);mappings.push([i%128,i>>7,j%128,j>>7,...rgb(source,i),...color])});
   const rc=refs[group].map(i=>rgb(normal,i)),sc=groups[group].map(i=>rgb(source,i)),oc=groups[group].map(i=>rgb(result,i));const palette=new Set(rc.map(c=>c.join(',')));
   assert(oc.every(c=>palette.has(c.join(','))),'palette failure');
   metrics[group]={pixels:oc.length,reference_pixels:rc.length,normal_mean_RGB:mean(rc),source_mean_RGB:mean(sc),candidate_mean_RGB:mean(oc),mean_RGB_difference:mean(oc).map((v,k)=>v-mean(rc)[k]),nearest_reference_RGB_max_distance:0,reference_RGB_exact_match_count:oc.length,normal_mean_luminance:rc.reduce((s,c)=>s+lum(c),0)/rc.length,candidate_mean_luminance:oc.reduce((s,c)=>s+lum(c),0)/oc.length};
  }
  const set=new Set([...groups.particles,...groups.trail]);let outside=0,alpha=0,changes=0;
  for(let i=0;i<16384;i++){const d=!source.subarray(i*4,i*4+4).equals(result.subarray(i*4,i*4+4));if(d)changes++;if(d&&!set.has(i))outside++;if(source[i*4+3]!==result[i*4+3])alpha++}
  assert(!outside&&!alpha,'color transfer changed protected geometry');
  const dest=out+'/candidates/'+state+'.png';await sharp(result,{raw:{width:128,height:128,channels:4}}).png({palette:false}).toFile(dest);
  const mb=Buffer.from(source);for(let i=0;i<16384;i++){const color=set.has(i)?(groups.trail.includes(i)?[0,147,190]:[227,66,138]):[130,140,150];color.forEach((v,k)=>mb[i*4+k]=v)}
  maskImages.push(await sharp(mb,{raw:{width:128,height:128,channels:4}}).png().toBuffer());
  audit[state]={source_sha256:hash(input),candidate_sha256:hash(read(dest)),metrics,mappings_xy_referencexy_beforeRGB_afterRGB:mappings,color_changed_pixels:changes,protected_RGBA_changes:outside,alpha_changes:alpha,components_before:cc.count,components_after:components(result).count,particle_component_ids:cfg[state].particle_component_ids,protected_detached_ids:cfg[state].protected_detached_ids,human_approved:false,production_adopted:false};
 }
 fs.writeFileSync(out+'/color-audit.json',JSON.stringify({method:'D4 same per-group normal08 empirical RGB palette quantiles; linear-sRGB luminance rank; no state-dependent multipliers; no geometry edits',normal_sha256:hash(read(normalPath)),reference_samples:refs,states:audit,limitations:['Protected ambiguous near-body pixels are not recolored; palette claim is limited to documented masks.','Different counts/shapes mean perceived total brightness need not be identical.','Generation is not deterministic; color transfer and sheets from stored sources are deterministic.']},null,2)+'\n');
 const images=[read(normalPath),read(d4Path),...states.map(s=>read(out+'/candidates/'+s+'.png'))],names=['通常基準08','D4 tired・正式採用',...states];
 async function grid(file,title,imgs,labels,n,crop){const cols=3,w=Math.max(170,n+30);let elems=[];const h=crop?Math.round(n*(crop[3]-crop[1])/(crop[2]-crop[0])):n;
  for(let j=0;j<imgs.length;j++){const x=15+(j%cols)*w,y=75+Math.floor(j/cols)*(h+50);let s=sharp(imgs[j]);if(crop)s=s.extract({left:crop[0],top:crop[1],width:crop[2]-crop[0],height:crop[3]-crop[1]});const b=await s.resize(n,h,{kernel:'nearest'}).flatten({background:'#e6eaed'}).png().toBuffer();elems.push(`<text x="${x}" y="${y}" font-size="14">${labels[j]}</text><image x="${x}" y="${y+12}" width="${n}" height="${h}" href="${uri(b)}"/>`)}
  fs.writeFileSync(out+'/'+file,`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(500,cols*w+15)}" height="${100+Math.ceil(imgs.length/cols)*(h+50)}"><rect width="100%" height="100%" fill="white"/><g font-family="sans-serif" fill="#172638"><text x="15" y="28" font-size="21">${title}</text><text x="15" y="50" font-size="14">通常とD4は固定。残り9枚は本番未採用・人間確認待ち。</text>${elems.join('')}</g></svg>\n`);
 }
 for(const n of [128,104,80,64])await grid('contact-'+n+'.svg','通常＋D4＋9候補：'+n+'px',images,names,n);
 for(const [key,title,crop]of [['face','顔：感情の読み分け',[85,51,112,72]],['legs','脚・腹部：連続性と太線',[57,63,112,119]],['antennae','触角：2本・先端・湾曲',[75,20,122,58]],['wings','翅：輪郭・切れ込み・模様',[5,8,91,118]],['particles','粒子・軌跡：軽さと色',[7,59,62,118]]])await grid('detail-'+key+'.svg',title,images,names,256,crop);
 await grid('detail-sick-leg-evidence.svg','sick：脚の離れた成分を確認',[read(normalPath),read(out+'/sources/sick.png'),read(out+'/candidates/sick.png')],['通常基準','sick色合わせ前','sick色合わせ後'],256,[69,88,88,108]);
 await grid('color-masks.svg','桃＝粒子、青＝軌跡、灰＝保護',maskImages,states,256);
 const panels=['contact-128.svg','contact-104.svg','contact-80.svg','contact-64.svg','detail-face.svg','detail-legs.svg','detail-antennae.svg','detail-wings.svg','detail-particles.svg','color-masks.svg','detail-sick-leg-evidence.svg'];
 fs.writeFileSync(out+'/comparison.html',`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;padding:12px}.scroll{overflow:auto}img{display:block}p{max-width:700px}</style><h1>通常基準＋正式D4＋残り9候補</h1><p>D4 tiredは正式採用済み。候補9枚は未採用。形態・顔・64pxの読みやすさ・粒子の軽さを確認してください。画像は自動縮小せず横スクロール。同倍率比較です。</p>${panels.map(f=>'<div class="scroll"><img alt="'+f+'" src="data:image/svg+xml;base64,'+read(out+'/'+f).toString('base64')+'"></div>').join('')}</html>\n`);
 console.log(JSON.stringify(Object.fromEntries(states.map(s=>[s,{changed:audit[s].color_changed_pixels,particles:audit[s].metrics.particles.pixels,trail:audit[s].metrics.trail.pixels,alpha:audit[s].alpha_changes,outside:audit[s].protected_RGBA_changes}]))));
})();
