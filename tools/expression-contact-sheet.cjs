#!/usr/bin/env node
// Static QA sheet: uses production PNGs, accent SVG/CSS and painted-floor offset.
// This is not a device screenshot; viewport, animation and background are omitted.
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const expression=require('../pet-expression.js'),bounds=require('../cast-bounds.js');
const rows=[['happy','うれしい'],['strained','いやだ・つらい'],['hungry','おなかがすいた'],['sick','びょうき'],['tired','つかれた'],['sulky','すねる'],['weak','いのちが少ない'],['critical','いのちが危険'],['wantsPlay','かまって'],['sleeping','ねむる']];
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
function buildSheet(species,stage,title){
 const base=`assets/characters/${species}/${stage}.png`,b=bounds[base]?.box;
 if(!b)throw new Error('Missing original bounds');
 const style=fs.readFileSync(path.join(ROOT,'pet-expression.css'),'utf8');
 const shift=104*(128-b[3])/128;
 const cells=rows.map(([name,label],i)=>{
  const asset=expression.assetFor(base,name);if(asset===base)throw new Error('Unsupported expression stage');
  const png=fs.readFileSync(path.join(ROOT,asset)).toString('base64');
  const accent=expression.accentFor(base,name).match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];
  const x=24+(i%2)*356,y=120+Math.floor(i/2)*328;
  // 104px logical canvas, uniformly magnified 2x. Retain production floor shift.
  const drops=expression.sweatFor(base,104,104,shift);
  const sweat=name==='sick'?[drops.left,104-drops.right-10.4].map(sx=>`<rect x="${sx}" y="${drops.top+drops.travel/2}" width="10.4" height="15.6" rx="5.2" transform="rotate(18 ${sx+5.2} ${drops.top+drops.travel/2+7.8})" fill="#a5d934" stroke="#689d15" stroke-width="1" opacity=".85"/>`).join(''):'';
  return `<g transform="translate(${x} ${y})"><rect width="340" height="312" rx="16" fill="#fff" stroke="#d6dedb"/><text x="18" y="30" font-size="19" fill="#304341">${i+1}. ${label}</text><g transform="translate(66 80) scale(2)"><image x="0" y="${shift}" width="104" height="104" image-rendering="optimizeSpeed" href="data:image/png;base64,${png}"/><g class="pet-expression-accent">${accent}</g>${sweat}</g></g>`;
 }).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="736" height="1850" viewBox="0 0 736 1850"><style>${style}text{font-family:'M PLUS Rounded 1c',sans-serif}</style><rect width="736" height="1850" fill="#edf3ef"/><text x="24" y="46" font-size="28" fill="#263d38">${escape(title)}｜10表情とマーク</text><text x="24" y="81" font-size="16" fill="#536c63">ゲームの画像・色・マーク座標を使用 ／ 2倍表示</text>${cells}<text x="24" y="1800" font-size="15" fill="#536c63">実機のスクリーンショットではなく、位置関係の確認用です。</text><text x="24" y="1828" font-size="15" fill="#536c63">背景・動き・画面幅は省略。病気の汗は静止した近似表示です。</text></svg>`;
}
if(require.main===module){const [species,stage,title,out]=process.argv.slice(2);fs.writeFileSync(out,buildSheet(species,stage,title));}
module.exports={buildSheet};
