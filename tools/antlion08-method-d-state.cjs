// QA-only: production resolver/offset/accent/sweat calls, original CSS retained.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/qa/antlion08-method-d-20260928');
const e=require(path.join(root,'pet-expression.js')),bounds=require(path.join(root,'cast-bounds.js'));
const base='assets/characters/antlion/08.png',state=e.resolve({state:'tired'});if(state!=='tired')throw Error('resolver');
const css=fs.readFileSync(path.join(root,'pet-expression.css'),'utf8'),care=fs.readFileSync(path.join(root,'care-attention.css'),'utf8');
const paths=[e.assetFor(base,state),'docs/qa/antlion08-method-d-20260928/tired-candidate.png'];
const names=['既存tired','方式D候補'];const imgs=paths.map(p=>'data:image/png;base64,'+fs.readFileSync(path.join(root,p)).toString('base64'));
const accent=e.accentFor(base,state),inner=accent.match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];
const esc=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
let frames=[],records=[],panels=[[],[]];let y=[80,80];
for(const n of [128,104,80,64]){
 const floor=n*(128-bounds[base].box[3])/128,s=e.sweatFor(base,n,n,floor);
 records.push({size:n,artOffsetY:floor,sweat:s});
 for(const ill of [false,true]){
  let row=[];let idx=ill?1:0;
  for(let j=0;j<2;j++){
   const props=`--care-sweat-left:${s.left}px;--care-sweat-right:${s.right}px;--care-sweat-top:${s.top}px;--care-sweat-travel:${s.travel}px;`;
   const doc=`<!doctype html><meta charset="utf-8"><style>${css}\n${care}\nbody{margin:0;background:#e6eaed}#pet{position:relative;margin:30px;width:${n}px;height:${n}px}#petSprite{position:relative;display:block;width:${n}px;height:${n}px}#petSprite img{position:absolute;left:0;top:${floor}px;width:100%;height:100%;image-rendering:pixelated}</style><div class="device" data-care-illness="${ill}" data-care-motion="still"><div id="pet"><div id="petSprite" style="${props}"><img alt="${names[j]}" src="${imgs[j]}">${accent}</div></div></div>`;
   row.push(`<div><p>${names[j]} ${n}px ${ill?'＋汗（正式CSS静止）':'＋疲労マーク'}</p><iframe sandbox title="${names[j]}" width="${n+70}" height="${n+70}" srcdoc="${esc(doc)}"></iframe></div>`);
   const x=40+j*310,yy=y[idx];let body=`<text x="${x}" y="${yy}" font-size="18">${names[j]} ${n}px</text><g transform="translate(${x+30} ${yy+24})"><image href="${imgs[j]}" y="${floor}" width="${n}" height="${n}" style="image-rendering:pixelated"/>`;
   if(ill){const w=Math.max(6,Math.min(11,n*.1)),h=Math.max(9,Math.min(16,n*.15));for(const xx of [s.left,n-s.right-w])body+=`<g transform="translate(${xx} ${s.top})" opacity=".85"><path d="M${w*.65} 0 C${w} 0 ${w} ${h*.4} ${w} ${h*.65} C${w} ${h} ${w*.4} ${h} ${w*.4} ${h} C0 ${h} 0 ${h*.6} 0 ${h*.6} C0 0 ${w*.65} 0 ${w*.65} 0Z" fill="#a5d934" stroke="#689d15" stroke-width="1"/></g>`;}
   body+=`<g class="pet-expression-accent" transform="scale(${n/104})">${inner}</g></g>`;panels[idx].push(body);
  }
  y[idx]+=n+110;frames.push('<section>'+row.join('')+'</section>');
 }
}
fs.writeFileSync(path.join(out,'state-composite.html'),`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;padding:16px}section{display:flex;flex-wrap:wrap;gap:16px}iframe{border:0}</style><h1>正式resolver／offset／CSSによる静的合成</h1><p>通常の疲労状態に既存の汗を補助併存。感情選択の優先順位を変更するものではありません。data-care-motion=stillによる正式な静止表示。実Home画面の動作確認は未実施。</p>${frames.join('')}</html>\n`);
for(let i=0;i<2;i++)fs.writeFileSync(path.join(out,i?'10-sweat.svg':'09-state-mark.svg'),`<svg xmlns="http://www.w3.org/2000/svg" width="680" height="${y[i]+50}" font-family="sans-serif"><style>${css}</style><rect width="100%" height="100%" fill="#e6eaed"/><text x="20" y="30" fill="#172638" font-size="21">${i?'⑩ 汗併存：配置は正式・輪郭はSVG近似':'⑨ 疲労マーク：正式SVGとoffset'}</text><text x="20" y="55" fill="#172638" font-size="15">${i?'正式CSS表示はstate-composite.html。影・輪郭の完全再現ではない。':'マーク位置・色・形を変更せず候補本体だけQA表示。'}</text>${panels[i].join('')}</svg>\n`);
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
fs.writeFileSync(path.join(out,'state-composite.json'),JSON.stringify({resolver_input:{state:'tired'},resolved:state,production_asset:paths[0],qa_candidate:paths[1],records,canonical_accent:accent,layer_order:['body','sweat z3','mark z4'],runtime_hashes:Object.fromEntries(['pet-expression.js','pet-expression.css','care-attention.css','cast-bounds.js'].map(p=>[p,sha(p)])),html:'actual CSS, frozen using existing still mode, sandboxed local frames',svg_sweat:'approximate outline, no CSS box shadow; canonical placement only',browser:'not rendered in actual Home; browser executable unavailable'},null,2)+'\n');
console.log('two assets x four sizes x mark/mark+sweat; canonical HTML and annotated SVG');
