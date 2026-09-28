// QA only: canonical accentFor/sweatFor, static approximation of CSS sweat shape.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/qa/antlion08-structure-20260928');
const e=require(path.join(root,'pet-expression.js')),bounds=require(path.join(root,'cast-bounds.js'));
const sharp=require(require.resolve('sharp',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||root]}));
const base='assets/characters/antlion/08.png',asset=e.assetFor(base,'tired'),source=fs.readFileSync(path.join(root,asset));
const css=fs.readFileSync(path.join(root,'pet-expression.css'),'utf8'),care=fs.readFileSync(path.join(root,'care-attention.css'),'utf8');
const accent=e.accentFor(base,'tired').match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];
let svg=[],records=[];const text=(x,y,s)=>`<text x="${x}" y="${y}" fill="#172a37" font-size="17">${s}</text>`;
svg.push(text(16,26,'Current tired ONLY: canonical state mark; sweat shape is a static CSS approximation.'));
svg.push(text(16,50,'No candidate. This is NOT before/after repair validation; no runtime files changed.'));
for(const [row,n]of [64,80,104].entries()){
 const floor=n*(128-bounds[base].box[3])/128,s=e.sweatFor(base,n,n,floor),w=Math.max(6,Math.min(11,n*.1)),h=Math.max(9,Math.min(16,n*.15));
 const mark=`<g class="pet-expression-accent" transform="scale(${n/104})">${accent}</g>`;
 for(const [col,ill]of [false,true].entries()){
  const x=70+col*350,y=115+row*170;
  svg.push(text(x-35,y-25,`${n}px: tired ${ill?'+ illness sweat':''}`));svg.push(`<g transform="translate(${x} ${y})">`);
  svg.push(`<image href="data:image/png;base64,${source.toString('base64')}" x="0" y="${floor}" width="${n}" height="${n}" style="image-rendering:pixelated"/>`);
  if(ill)for(const xx of [s.left,n-s.right-w]){
   const yy=s.top+s.travel*.5;
   svg.push(`<g transform="translate(${xx} ${yy}) rotate(18 ${w/2} ${h/2})" opacity=".85"><path d="M${w*.65} 0 C${w*.94} ${h*.15} ${w} ${h*.55} ${w*.8} ${h*.84} C${w*.5} ${h*1.08} ${w*.08} ${h*.92} 0 ${h*.62} C${-w*.04} ${h*.3} ${w*.23} 0 ${w*.65} 0Z" fill="#a5d934" stroke="#689d15" stroke-width="1"/></g>`);
  }
  svg.push(mark+'</g>');
 }
 records.push({size:n,artOffsetY:floor,sweat:s,accent_sha256:crypto.createHash('sha256').update(e.accentFor(base,'tired')).digest('hex')});
}
const final=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="690" font-family="DejaVu Sans,sans-serif"><style>${css}</style><rect width="100%" height="100%" fill="#e6eaed"/>${svg.join('')}</svg>`;
fs.writeFileSync(path.join(out,'state-composite.svg'),final);
fs.writeFileSync(path.join(out,'state-composite.json'),JSON.stringify({asset,asset_sha256:crypto.createHash('sha256').update(source).digest('hex'),records,layer_order:['body','sweat','selected_mark'],limitations:['offline static composite; not Home browser screenshot','sweat outline approximated from CSS; shadow and temporal phase differences not guaranteed','no candidate exists; assesses original only'],css_sha256:crypto.createHash('sha256').update(css).digest('hex'),care_css_sha256:crypto.createHash('sha256').update(care).digest('hex')},null,2)+'\n');
sharp(Buffer.from(final)).png().toFile(path.join(out,'state-composite.png')).then(()=>console.log('Canonical tired composite: 3 sizes x 2 illness states; candidate 0'));
