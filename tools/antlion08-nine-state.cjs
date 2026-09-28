// QA-only: canonical resolver, accents, offsets and sweat placement. No runtime writes.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sharp=require(require.resolve('sharp',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]}));
process.chdir(path.resolve(__dirname,'..'));
const out='docs/qa/antlion08-method-d-nine-20260928',e=require('../pet-expression.js'),bounds=require('../cast-bounds.js');
const base='assets/characters/antlion/08.png',states=['tired','happy','strained','hungry','sick','sulky','weak','critical','wantsPlay','sleeping'];
const css=fs.readFileSync('pet-expression.css','utf8'),care=fs.readFileSync('care-attention.css','utf8');
const uri=(b,m='image/png')=>'data:'+m+';base64,'+b.toString('base64');
const esc=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const inputs={happy:[{state:'normal'},{reaction:'happy'}],strained:[{state:'normal'},{reaction:'strained'}],sulky:[{state:'unhappy'},{}],critical:[{state:'weak',severity:'critical'},{}],sleeping:[{state:'normal'},{sleeping:true}]};
const embed=s=>s.replace(/href="(assets\/[^\"]+)"/g,(_,p)=>'href="'+uri(fs.readFileSync(p),'image/svg+xml')+'"');
const records=[],frames=[];
(async()=>{
 for(const n of [104,80,64]){
  const floor=n*(128-bounds[base].box[3])/128,s=e.sweatFor(base,n,n,floor),w=Math.max(6,Math.min(11,n*.1)),h=Math.max(9,Math.min(16,n*.15));
  const dropPath=`M${w*.65} 0 C${w} 0 ${w} ${h*.4} ${w} ${h*.65} C${w} ${h} ${w*.4} ${h} ${w*.4} ${h} C0 ${h} 0 ${h*.6} 0 ${h*.6} C0 0 ${w*.65} 0 ${w*.65} 0Z`;
  const sweat=[s.left,n-s.right-w].map(x=>`<path transform="translate(${x} ${s.top})" d="${dropPath}" fill="#a5d934" stroke="#689d15" stroke-width="1" opacity=".85"/>`).join('');
  const sheets={mark:[],sweat:[]};
  for(let i=0;i<states.length;i++){
   const state=states[i],[profile,options]=inputs[state]||[{state},{}],resolved=e.resolve(profile,options);if(resolved!==state)throw Error('resolver '+state+' => '+resolved);
   const p=state==='tired'?'assets/characters/expressions/antlion/08-tired.png':out+'/candidates/'+state+'.png';
   const source=fs.readFileSync(p),img=uri(source),accent=embed(e.accentFor(base,resolved)),inner=accent.match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];
   const mark=`<g class="pet-expression-accent" transform="scale(${n/104})">${inner}</g>`;
   const body=`<image href="${img}" y="${floor}" width="${n}" height="${n}" style="image-rendering:pixelated"/>`;
   const layerSvg=content=>`<svg xmlns="http://www.w3.org/2000/svg" width="${n+40}" height="${n+40}" viewBox="-20 -20 ${n+40} ${n+40}"><style>${css}</style>${content}</svg>`;
   const raw=async content=>sharp(Buffer.from(layerSvg(content))).ensureAlpha().raw().toBuffer();
   const [a,b,c]=await Promise.all([raw(body),raw(mark),raw(sweat)]);let artMark=0,faceMark=0,sweatMarkBox=0,sweatArtBox=0,staticSweatMark=0,staticSweatArt=0;
   for(let y=0;y<n+40;y++)for(let x=0;x<n+40;x++){
    const k=(y*(n+40)+x)*4,xx=x-20+.5,yy=y-20+.5;
    const face=xx>=86*n/128&&xx<110*n/128&&yy>=52*n/128+floor&&yy<71*n/128+floor;
    const box=yy>=s.top-2&&yy<=s.top+h+s.travel+2&&[s.left,n-s.right-w].some(z=>xx>=z-2&&xx<=z+w+2);
    if(c[k+3]&&b[k+3])staticSweatMark++;if(c[k+3]&&a[k+3])staticSweatArt++;if(a[k+3]&&b[k+3])artMark++;if(face&&b[k+3])faceMark++;if(box&&b[k+3])sweatMarkBox++;if(box&&a[k+3])sweatArtBox++;
   }
   records.push({state,size:n,profile,options,resolved,art_offset_y:floor,sweat:s,canonical_accent:accent,static_approx_sweat_mark_overlap:staticSweatMark,static_approx_sweat_art_overlap:staticSweatArt,asset_mark_alpha_overlap:artMark,face_ROI_mark_overlap:faceMark,conservative_sweat_motion_box_mark_overlap:sweatMarkBox,conservative_sweat_motion_box_art_overlap:sweatArtBox});
   for(const ill of [false,true]){
    const type=ill?'sweat':'mark',x=15+(i%3)*175,y=80+Math.floor(i/3)*(n+95);
    sheets[type].push(`<text x="${x}" y="${y}" font-size="15">${state}</text><g transform="translate(${x+20} ${y+35})">${body}${ill?sweat:''}${mark}</g>`);
    const props=`--care-sweat-left:${s.left}px;--care-sweat-right:${s.right}px;--care-sweat-top:${s.top}px;--care-sweat-travel:${s.travel}px;`;
    const doc=`<!doctype html><meta charset="utf-8"><style>${css}\n${care}\nbody{margin:0;background:#e6eaed}#pet{position:relative;margin:25px;width:${n}px;height:${n}px}#petSprite{position:relative;display:block;width:${n}px;height:${n}px}#petSprite img{position:absolute;left:0;top:${floor}px;width:100%;height:100%;image-rendering:pixelated}</style><div class="device" data-care-illness="${ill}" data-care-motion="still"><div id="pet"><div id="petSprite" style="${props}"><img src="${img}" alt="${state}">${accent}</div></div></div>`;
    frames.push(`<article><p>${state} ${n}px ${ill?'＋状態マーク＋汗':'＋状態マーク'}</p><iframe sandbox title="${state}" width="${n+55}" height="${n+55}" srcdoc="${esc(doc)}"></iframe></article>`);
   }
  }
  for(const type of ['mark','sweat'])fs.writeFileSync(out+'/'+type+'-'+n+'.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="545" height="${110+4*(n+95)}"><style>${css}</style><rect width="100%" height="100%" fill="#e6eaed"/><g font-family="sans-serif"><text x="15" y="28" font-size="22">${n}px：正式マーク${type==='sweat'?'＋汗併存':''}</text><text x="15" y="50" font-size="13">${type==='sweat'?'汗の配置は正式、輪郭・影はSVG近似。正式CSSはHTML。':'既存resolver／SVG／offsetをそのまま使用。'}</text>${sheets[type].join('')}</g></svg>\n`);
 }
 fs.writeFileSync(out+'/state-composite.html',`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;padding:12px}main{display:flex;flex-wrap:wrap;gap:12px}iframe{border:0}</style><h1>正式CSS：状態マーク・汗併存</h1><p>本体→汗z3→状態マークz4。既存のstillモードで静止。病気併存は衝突確認用で、resolverの優先順位を変更しません。実Homeブラウザー動作確認は未実施。</p><main>${frames.join('')}</main></html>\n`);
 const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 fs.writeFileSync(out+'/state-audit.json',JSON.stringify({records,layer_order:['body','sweat z3','mark z4'],runtime_hashes:Object.fromEntries(['pet-expression.js','pet-expression.css','care-attention.css','cast-bounds.js'].map(p=>[p,sha(p)])),limitations:['SVG sweat outline is approximate; canonical HTML retains exact CSS.','Conservative motion boxes include travel and2px padding, not exact animated silhouette.','Actual Home browser was not rendered; static SVG and source-based geometry checked.','Face box overlap is a warning proxy, not exact face-pixel occlusion.']},null,2)+'\n');
 console.log(JSON.stringify(records.map(r=>({s:r.state,n:r.size,artMark:r.asset_mark_alpha_overlap,faceMark:r.face_ROI_mark_overlap,sweatMark:r.conservative_sweat_motion_box_mark_overlap,sweatArt:r.conservative_sweat_motion_box_art_overlap}))));
})();
