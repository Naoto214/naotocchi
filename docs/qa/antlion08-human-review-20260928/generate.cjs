// Human-review sheets only. Reads original PNG bytes; never writes source images.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
const sharp=require(require.resolve('sharp',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]}));
const R=path.resolve(__dirname,'../../..'),O=__dirname;process.chdir(R);
const HEAD='7ec4bf05d4fe6693bf8dd5c80822544db531d649';
const BASE='assets/characters/antlion/08.png',OLD='docs/qa/antlion08-method-d-nine-20260928/candidates';
const LIMITED='docs/qa/antlion08-limited-candidates-20260928';
const e=require(path.join(R,'pet-expression.js')),bounds=require(path.join(R,'cast-bounds.js'));
const css=fs.readFileSync('pet-expression.css','utf8'),paint=css.slice(css.indexOf('/* Saturated'));
const states=['normal08','happy','strained','hungry','sick','tired','sulky','weak','critical','wantsPlay','sleeping'];
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const uri=(b,type='image/png')=>'data:'+type+';base64,'+b.toString('base64');
const assert=(v,m)=>{if(!v)throw Error(m)};
const prior=JSON.parse(fs.readFileSync('docs/qa/antlion08-size-density-20260928/density.json'));
const limited=JSON.parse(fs.readFileSync(LIMITED+'/pixel-audit.json'));
const inputs={};
for(const s of states){
 const p=s==='normal08'?BASE:s==='tired'?'assets/characters/expressions/antlion/08-tired.png':s==='strained'?LIMITED+'/candidates/strained-face.png':s==='critical'?LIMITED+'/candidates/critical-particles.png':OLD+'/'+s+'.png';
 const bytes=fs.readFileSync(p),hash=sha(bytes);
 const expected=s==='strained'||s==='critical'?limited[s].candidate_sha256:prior.assets[s==='normal08'?'normal':s].sha256;
 assert(hash===expected,'source SHA mismatch '+s);
 inputs[s]={path:p,sha256:hash,candidate_id:s==='strained'?'strained-face.png':s==='critical'?'critical-particles.png':s==='tired'?'D4 tired (approved)':s==='normal08'?'normal08':s+'.png',bytes};
}
function preserved(){
 const entries=cp.execFileSync('git',['ls-tree','-r','-z',HEAD],{maxBuffer:5e6}).toString().split('\0').filter(Boolean).map(l=>{const [meta,p]=l.split('\t');return {path:p,sha:meta.split(' ')[2]}});
 const hashes=cp.execFileSync('git',['hash-object','--stdin-paths'],{input:entries.map(v=>v.path).join('\n')+'\n',maxBuffer:5e6}).toString().trim().split('\n');
 assert(entries.length===3942&&entries.every((v,i)=>v.sha===hashes[i]),'existing file changed');return entries.length;
}
const before=preserved(),records=[],sheets=[];
const resolveInputs={happy:[{state:'normal'},{reaction:'happy'}],strained:[{state:'normal'},{reaction:'strained'}],sulky:[{state:'unhappy'},{}],critical:[{state:'weak',severity:'critical'},{}],sleeping:[{state:'normal'},{sleeping:true}]};
function canonicalMark(state,n){
 const [profile,options]=resolveInputs[state]||[{state},{}],resolved=e.resolve(profile,options);assert(resolved===state,'resolver '+state);
 const original=e.accentFor(BASE,resolved),embedded=original.replace(/href="(assets\/[^\"]+)"/g,(_,p)=>'href="'+uri(fs.readFileSync(p),'image/svg+xml')+'"');
 const inner=embedded.match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];
 records.push({state,size:n,resolved,source_path:inputs[state].path,canonical_accent_sha256:sha(Buffer.from(original)),art_offset_y:n*(128-bounds[BASE].box[3])/128});
 return `<g class="pet-expression-accent" transform="scale(${n/104})">${inner}</g>`;
}
async function sheet(name,title,n,{mark=false,face=false}={}){
 const list=mark?states.slice(1):states,cols=face?11:4;
 const cellW=180,cellH=face?196:188,header=122,rows=Math.ceil(list.length/cols),width=cols*cellW+24,height=header+rows*cellH+20;
 const pieces=[];
 for(let i=0;i<list.length;i++){
  const s=list[i],x=12+(i%cols)*cellW,y=header+Math.floor(i/cols)*cellH;
  // Labels under art; one identical background and fixed-size cell per source.
  pieces.push(`<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="#e6eaed"/>`);
  if(face){
   pieces.push(`<svg x="${x+10}" y="${y+10}" width="160" height="144" viewBox="88 52 20 18"><image href="${uri(inputs[s].bytes)}" width="128" height="128" style="image-rendering:pixelated"/></svg>`);
  }else{
   const offset=mark?n*(128-bounds[BASE].box[3])/128:0;
   const art=`<image href="${uri(inputs[s].bytes)}" y="${offset}" width="${n}" height="${n}" style="image-rendering:pixelated"/>`;
   pieces.push(`<g transform="translate(${x+(cellW-n)/2} ${y+12+(128-n)/2})">${art}${mark?canonicalMark(s,n):''}</g>`);
  }
  pieces.push(`<text x="${x+cellW/2}" y="${y+(face?179:170)}" text-anchor="middle" font-size="15">${s}</text>`);
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><style>${paint}</style><rect width="100%" height="100%" fill="#e6eaed"/><g font-family="sans-serif" fill="#172638"><text x="16" y="25" font-size="20">${title}</text><text x="16" y="47" font-size="12">Source HEAD: ${HEAD}</text><text x="16" y="66" font-size="12">strained ID: strained-face.png | critical ID: critical-particles.png</text><text x="16" y="85" font-size="12">Source directory: antlion08-limited-candidates-20260928/candidates/ | tired: approved D4</text><text x="16" y="104" font-size="12">${face?'Shared face ROI [88,52,108,70), 8x nearest-neighbour; scroll horizontally.':mark?'Canonical state marks; no illness sweat.':'Body only; no state marks, hunger marks or sweat.'}</text>${pieces.join('')}</g></svg>\n`;
 fs.writeFileSync(path.join(O,name+'.svg'),svg);
 await sharp(Buffer.from(svg)).png().toFile(path.join(O,name+'.png'));
 sheets.push({id:name,svg:name+'.svg',png:name+'.png',states:list,size:face?null:n,face_roi:face?[88,52,108,70]:null,face_scale:face?8:null,cell_size:[cellW,cellH],background:'#e6eaed',width,height,marks:mark,sweat:false});
}
(async()=>{
 for(const n of [128,104,80,64])await sheet('body-'+n,`Normal08 + 10 expressions / body only / ${n}px`,n);
 await sheet('faces','Normal08 + 10 expressions / face comparison',null,{face:true});
 for(const n of [104,80,64])await sheet('marks-'+n,`10 expressions / canonical state marks / ${n}px`,n,{mark:true});
 const manifest={source_head:HEAD,inputs:Object.fromEntries(Object.entries(inputs).map(([s,{bytes,...v}])=>[s,v])),sheets,mark_records:records,canonical_css_sha256:sha(Buffer.from(css)),body_sampling:'nearest-neighbour; entire original 128px canvas; no registration, warp, crop or palette edits',face_sampling:'shared ROI only; same magnification and orientation; original source PNG embedded',rating_labels:false,human_approval:false,actual_home_checked:false};
 fs.writeFileSync(path.join(O,'sources.json'),JSON.stringify(manifest,null,2)+'\n');
 const sections=sheets.map(s=>`<section id="${s.id}"><h2>${s.id}</h2><p><a href="${s.png}">PNGで開く</a> · <a href="${s.svg}">SVGで開く</a></p><div class="scroll"><img src="${s.png}" width="${s.width}" height="${s.height}" alt="${s.id}"></div></section>`).join('');
 fs.writeFileSync(path.join(O,'comparison.html'),`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ウスバカゲロウ08 人間目視確認</title><style>body{font-family:system-ui;margin:16px;color:#172638}.scroll{overflow-x:auto}img{display:block;max-width:none}p{max-width:850px}nav{display:flex;flex-wrap:wrap;gap:12px}section{margin-top:32px}</style><h1>通常基準08＋10表情：人間目視確認</h1><p>本体128pxから確認し、他サイズ、顔拡大、正式マーク付きへ順に見比べてください。画像下の表記は表情名のみです。64px単独の完全識別を合格条件にはしません。</p><p>画像の自然さ・同じ個体と画風・相互の違い・顔や身体の変化・粒子と表情のバランスを直接判断する資料です。今回、機械的な最終判定は行いません。</p><p>Source HEAD: <code>${HEAD}</code><br>strained: <code>strained-face.png</code><br>critical: <code>critical-particles.png</code><br>限定候補の保存場所と全11画像のSHA-256は<a href="sources.json">sources.json</a>に記載。D4 tiredは正式採用済み画像です。</p><p>HTMLは画像を自動縮小せず横スクロールします。ブラウザー倍率100%で各サイズを比較してください。単独PNGは端末が画面幅へ縮小する場合があります。</p><nav>${sheets.map(s=>`<a href="#${s.id}">${s.id}</a>`).join('')}</nav>${sections}<p>画像変更・本番置換・追加承認なし。人間目視確認待ち。</p></html>\n`);
 const after=preserved();assert(after===before,'preservation count');
 // Verify each source embedded in the expected order, exact original bytes.
 for(const s of sheets){
  const svg=fs.readFileSync(path.join(O,s.svg),'utf8');
  const embedded=[...svg.matchAll(/href="data:image\/png;base64,([^\"]+)"/g)].map(m=>Buffer.from(m[1],'base64'));
  assert(embedded.length===s.states.length,'source count '+s.id);
  embedded.forEach((b,i)=>assert(b.equals(inputs[s.states[i]].bytes),'source mismatch '+s.id));
  const meta=await sharp(path.join(O,s.png)).metadata();assert(meta.width===s.width&&meta.height===s.height,'sheet dimensions');
 }
 const files=sheets.flatMap(s=>[s.svg,s.png]).concat(['sources.json','comparison.html']);
 fs.writeFileSync(path.join(O,'verification.json'),JSON.stringify({source_head:HEAD,existing_tracked_files_unchanged:after,source_count:11,latest_strained_and_critical_sha_match:true,embedded_pngs_byte_identical:true,body_sheets:4,face_sheets:1,canonical_mark_sheets:3,canonical_mark_records:records.length,sheet_dimensions_checked:true,image_source_changes:0,runtime_changes:0,human_approval:false,final_visual_judgment:'not performed; awaiting human review',full_tests:'not rerun: QA-only comparison assets',artifact_sha256:Object.fromEntries(files.map(p=>[p,sha(fs.readFileSync(path.join(O,p)))]))},null,2)+'\n');
 console.log(JSON.stringify({source_head:HEAD,existing_files_preserved:after,sheets:sheets.length,mark_records:records.length,latest_strained:inputs.strained.sha256,latest_critical:inputs.critical.sha256}));
})();
