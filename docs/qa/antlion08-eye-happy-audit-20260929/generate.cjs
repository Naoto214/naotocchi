// Read-only QA: original PNG bytes embedded, no source image writes.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const sharp=require(require.resolve('sharp',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]}));
const R=path.resolve(__dirname,'../../..'),O=__dirname;process.chdir(R);
const HEAD='b85f2940361983083d23c51711bc21c2eb881750';
const inputs=JSON.parse(fs.readFileSync('docs/qa/antlion08-human-review-20260928/sources.json')).inputs;
const states=['normal08','happy','hungry','wantsPlay'],bytes={},hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const uri=b=>'data:image/png;base64,'+b.toString('base64');
const assert=(v,m)=>{if(!v)throw Error(m)};
for(const s of Object.keys(inputs)){const b=fs.readFileSync(inputs[s].path);assert(hash(b)===inputs[s].sha256,'input mismatch '+s);if(states.includes(s))bytes[s]=b;}
function preserve(){
 const rows=cp.execFileSync('git',['ls-tree','-r','-z',HEAD],{maxBuffer:5e6}).toString().split('\0').filter(Boolean).map(l=>{const[m,p]=l.split('\t');return {path:p,sha:m.split(' ')[2]}});
 const got=cp.execFileSync('git',['hash-object','--stdin-paths'],{input:rows.map(r=>r.path).join('\n')+'\n',maxBuffer:5e6}).toString().trim().split('\n');
 assert(rows.length===3963&&rows.every((r,i)=>r.sha===got[i]),'tracked file changed');return rows.length;
}
const count=preserve(),sheets=[],markRecords=[];
const e=require(path.join(R,'pet-expression.js')),bounds=require(path.join(R,'cast-bounds.js')),base='assets/characters/antlion/08.png';
const css=fs.readFileSync('pet-expression.css','utf8').split('/* Saturated')[1];
function mark(n){const resolved=e.resolve({state:'normal'},{reaction:'happy'});assert(resolved==='happy','resolver');const a=e.accentFor(base,'happy');markRecords.push({size:n,accent_sha256:hash(Buffer.from(a)),art_offset_y:n*(128-bounds[base].box[3])/128});return `<g class="pet-expression-accent" transform="scale(${n/104})">${a.match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1]}</g>`;}
async function sheet(id,title,list,sizes,roi=null,marked=false){
 const cw=roi?Math.max(240,(roi[2]-roi[0])*sizes[0]+28):185;
 let y=112;const pieces=[];
 for(const n of sizes){
  const w=roi?(roi[2]-roi[0])*n:n,h=roi?(roi[3]-roi[1])*n:n;
  for(let j=0;j<list.length;j++){
   const s=list[j],x=14+j*cw,offset=marked?n*(128-bounds[base].box[3])/128:0;
   const art=roi?`<svg width="${w}" height="${h}" viewBox="${roi[0]} ${roi[1]} ${roi[2]-roi[0]} ${roi[3]-roi[1]}"><image href="${uri(bytes[s])}" width="128" height="128" style="image-rendering:pixelated"/></svg>`:`<image href="${uri(bytes[s])}" y="${offset}" width="${n}" height="${n}" style="image-rendering:pixelated"/>`;
   pieces.push(`<g transform="translate(${x+10} ${y})">${art}${marked&&s==='happy'?mark(n):''}</g><text x="${x+10}" y="${y+h+32}" font-size="14">${s} ${roi?'':n+'px'}</text>`);
  }
  y+=h+80;
 }
 const width=Math.max(640,cw*list.length+28),height=y+12;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><style>/* Saturated${css}</style><rect width="100%" height="100%" fill="#e6eaed"/><g font-family="sans-serif" fill="#172638"><text x="16" y="26" font-size="20">${title}</text><text x="16" y="49" font-size="12">Source HEAD: ${HEAD}</text><text x="16" y="70" font-size="12">${roi?'Shared ROI ['+roi.join(',')+'), '+sizes[0]+'x nearest-neighbour.':'Same canvas scale; nearest-neighbour.'}</text><text x="16" y="90" font-size="12">${marked?'Canonical happy mark; normal has no mark; no sweat.':'No marks or sweat. Left eye means viewer-left.'}</text>${pieces.join('')}</g></svg>\n`;
 fs.writeFileSync(path.join(O,id+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(O,id+'.png'));sheets.push({id,list,sizes,roi,marked,width,height});
}
(async()=>{
 await sheet('four-faces','Normal / happy / hungry / wantsPlay: faces',states,[12],[88,52,108,70]);
 await sheet('left-eye-detail','Viewer-left eye and surrounding shading',states,[20],[91,56,100,65]);
 await sheet('four-sizes','Four expressions: full canvas at each size',states,[128,104,80,64]);
 await sheet('normal-happy-face','Normal / happy: same face region',['normal08','happy'],[12],[88,52,108,70]);
 await sheet('normal-happy-sizes','Normal / happy: body only',['normal08','happy'],[128,104,80,64]);
 await sheet('normal-happy-mark','Normal / happy: canonical joy mark',['normal08','happy'],[128,104,80,64],null,true);
 const raw={};for(const s of states)raw[s]=await sharp(bytes[s]).ensureAlpha().raw().toBuffer();
 const at=(s,x,y)=>[...raw[s].subarray((y*128+x)*4,(y*128+x)*4+4)];
 let different=0;for(let y=52;y<70;y++)for(let x=88;x<108;x++){const i=(y*128+x)*4;if(!raw.normal08.subarray(i,i+4).equals(raw.happy.subarray(i,i+4)))different++;}
 const manifest={source_head:HEAD,inputs:Object.fromEntries(states.map(s=>[s,inputs[s]])),all11_input_hashes_preserved:true,left_definition:'viewer-left; not anatomical left',sheets,markRecords,observed_bright_pixels:{hungry:{xy:[97,60],rgba:at('hungry',97,60)},wantsPlay:{xy:[95,60],rgba:at('wantsPlay',95,60)}},normal_happy_face_roi_different_pixels:different,diff_count_limit:'Includes outline/shading/position variations; not a score of emotional distinctness.'};
 fs.writeFileSync(path.join(O,'sources.json'),JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(O,'comparison.html'),`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;margin:16px}.scroll{overflow:auto}img{display:block;max-width:none}</style><h1>左目とnormal／happyの追加確認</h1><p>画像変更なし。左目は画面向かって左。原寸はブラウザー倍率100%で確認。拡大で見える差を小表示の識別性と同一視しません。</p>${sheets.map(s=>`<h2>${s.id}</h2><p><a href="${s.id}.png">PNG</a> / <a href="${s.id}.svg">SVG</a></p><div class="scroll"><img src="${s.id}.png" width="${s.width}" height="${s.height}"></div>`).join('')}</html>\n`);
 for(const s of sheets){const v=fs.readFileSync(path.join(O,s.id+'.svg'),'utf8'),embedded=[...v.matchAll(/href="data:image\/png;base64,([^\"]+)"/g)].map(m=>Buffer.from(m[1],'base64'));assert(embedded.length===s.list.length*s.sizes.length,'embedded count');embedded.forEach((b,i)=>assert(b.equals(bytes[s.list[i%s.list.length]]),'wrong input'));}
 assert(preserve()===count,'post preservation');
 const files=sheets.flatMap(s=>[s.id+'.svg',s.id+'.png']).concat(['sources.json','comparison.html']);
 fs.writeFileSync(path.join(O,'verification.json'),JSON.stringify({source_head:HEAD,existing_tracked_files_hash_preserved:count,source_image_changes:0,regeneration:0,production_replacement:0,all11_input_hashes_preserved:true,embedded_sources_byte_identical:true,canonical_happy_marks:markRecords.length,full_runtime_tests:'not rerun: read-only QA artifacts only',human_approval:false,artifact_sha256:Object.fromEntries(files.map(p=>[p,hash(fs.readFileSync(path.join(O,p)))]))},null,2)+'\n');
 console.log(JSON.stringify({count,face_roi_different_pixels:different,bright_pixels:manifest.observed_bright_pixels,sheets:sheets.length}));
})();
