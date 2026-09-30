// Static comparison only; canonical mark source and offsets stay read-only.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sharp=require(require.resolve('sharp',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES]}));
const R=path.resolve(__dirname,'..');process.chdir(R);
const O='docs/qa/antlion08-limited-candidates-20260928',OLD='docs/qa/antlion08-method-d-nine-20260928/candidates';
const e=require('../pet-expression.js'),bounds=require('../cast-bounds.js');
const base='assets/characters/antlion/08.png',css=fs.readFileSync('pet-expression.css','utf8');
// SVG groups are positioned by transforms; retain canonical paint rules only.
const svgCss=css.slice(css.indexOf('/* Saturated'));
const uri=(p,type='image/png')=>'data:'+type+';base64,'+fs.readFileSync(p).toString('base64');
const embed=s=>s.replace(/href="(assets\/[^\"]+)"/g,(_,p)=>'href="'+uri(p,'image/svg+xml')+'"');
const groups={strained:[['Current strained',OLD+'/strained.png'],['New face candidate',O+'/candidates/strained-face.png']],critical:[['Current critical',OLD+'/critical.png'],['Particle candidate',O+'/candidates/critical-particles.png']]};
const panels=[],records=[];
function sheet(name,title,images,sizes,box,mark=false){
 const cw=box?Math.max(250,(box[2]-box[0])*6+24):210;
 let y=70,els=[];
 for(const n of sizes){
  const w=box?(box[2]-box[0])*n:n,h=box?(box[3]-box[1])*n:n;
  for(let j=0;j<images.length;j++){
   const [label,p]=images[j],x=18+j*cw;
   let art;
   if(box)art=`<svg x="0" y="0" width="${w}" height="${h}" viewBox="${box[0]} ${box[1]} ${box[2]-box[0]} ${box[3]-box[1]}"><image href="${uri(p)}" width="128" height="128" style="image-rendering:pixelated"/></svg>`;
   else {
    const floor=mark?n*(128-bounds[base].box[3])/128:0;
    art=`<image href="${uri(p)}" y="${floor}" width="${n}" height="${n}" style="image-rendering:pixelated"/>`;
    if(mark){
     const resolved=e.resolve({state:'normal'},{reaction:'strained'});if(resolved!=='strained')throw Error('resolver');
     const raw=e.accentFor(base,resolved),inner=embed(raw).match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];
     art+=`<g class="pet-expression-accent" transform="scale(${n/104})">${inner}</g>`;
     records.push({size:n,path:p,resolved,art_offset_y:floor,canonical_accent_sha256:crypto.createHash('sha256').update(raw).digest('hex')});
    }
   }
   els.push(`<text x="${x}" y="${y}" font-size="14">${label}${box?'':': '+n+'px'}</text><g transform="translate(${x+15} ${y+25})">${art}</g>`);
  }
  y+=h+80;
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${cw*images.length+40}" height="${y+15}"><style>${svgCss}</style><rect width="100%" height="100%" fill="#e6eaed"/><g font-family="sans-serif" fill="#172638"><text x="18" y="28" font-size="20">${title}</text><text x="18" y="48" font-size="12">A/B QA only / no production adoption / nearest-neighbour</text>${els.join('')}</g></svg>\n`;
 fs.writeFileSync(O+'/'+name,svg);panels.push(name);
}
(async()=>{
 sheet('strained-body.svg','Strained: body only',groups.strained,[128,104,80,64]);
 sheet('strained-mark.svg','Strained: canonical silver mark',groups.strained,[128,104,80,64],null,true);
 sheet('strained-face.svg','Strained: same face ROI / 8x',groups.strained,[8],[88,52,108,70]);
 sheet('critical-body.svg','Critical: particle cleanup only',groups.critical,[128,104,80,64]);
 sheet('critical-rear.svg','Critical: same rear ROI / 6x',groups.critical,[6],[8,59,62,118]);
 sheet('critical-references.svg','Normal / D4 / current / candidate',[['Normal08',base],['Approved D4','assets/characters/expressions/antlion/08-tired.png'],...groups.critical],[4],[8,59,62,118]);
 const audit=JSON.parse(fs.readFileSync(O+'/pixel-audit.json'));
 let masks=[];
 for(const [j,key] of ['strained','critical'].entries()){
  const points=audit[key].changes.map(p=>`<rect x="${p.xy[0]}" y="${p.xy[1]}" width="1" height="1" fill="#d21e79"/>`).join('');
  masks.push(`<text x="${18+j*400}" y="60" font-size="16">${key}: changed pixels</text><g transform="translate(${18+j*400} 75) scale(3)"><image href="${uri(groups[key][0][1])}" width="128" height="128" style="image-rendering:pixelated"/>${points}</g>`);
 }
 fs.writeFileSync(O+'/change-masks.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="820" height="475"><rect width="100%" height="100%" fill="#e6eaed"/><g font-family="sans-serif"><text x="18" y="28" font-size="20">Pink: exact changed pixels; all other pixels retained</text>${masks.join('')}</g></svg>\n`);panels.push('change-masks.svg');
 fs.writeFileSync(O+'/state-audit.json',JSON.stringify({records,canonical_css_sha256:crypto.createHash('sha256').update(css).digest('hex'),sweat:false,mark_position_changed:false,actual_home_checked:false},null,2)+'\n');
 fs.writeFileSync(O+'/comparison.html','<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:system-ui;margin:16px}.scroll{overflow:auto}img{display:block;max-width:none}</style><h1>限定2候補の比較</h1><p>本番未採用。倍率100%で原寸確認。横スクロールでA/Bを同倍率比較。</p>'+panels.map(f=>`<h2>${f}</h2><div class="scroll"><img src="${f}" alt="${f}"></div>`).join('')+'</html>\n');
 // Raster previews are temporary QA renders, not candidate assets.
 for(const f of panels)await sharp(Buffer.from(fs.readFileSync(O+'/'+f))).png().toFile('/tmp/limited-'+f.replace('.svg','.png'));
 console.log('7 comparisons; canonical mark records '+records.length);
})();
