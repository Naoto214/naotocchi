// Comparison contact sheets only; finished artwork is not painted or altered here.
const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'sharp'):'sharp');
(async()=>{
 const sources=['A.png','B.png','../original.png'];
 const main=await sharp(path.join(__dirname,'../../design-adoption/normal-320.png')).extract({left:368,top:204,width:316,height:474}).png().toBuffer();
 for(const w of [80,110,320]){
  const gap=20,top=44,h=w*1.5,images=[];
  for(let i=0;i<4;i++)images.push({input:await sharp(i===3?main:path.join(__dirname,sources[i])).resize(w,h).png().toBuffer(),left:gap+i*(w+gap),top});
  const width=4*(w+gap)+gap,height=h+top+20;
  const labels=['A','B','C - SELECTED','MAIN'];
  images.push({input:Buffer.from(`<svg width="${width}" height="${height}"><g fill="#dfeaf0" font-family="sans-serif" font-size="12">${labels.map((t,i)=>`<text x="${gap+i*(w+gap)}" y="26">${t}</text>`).join('')}</g></svg>`),left:0,top:0});
  await sharp({create:{width,height,channels:3,background:'#18332f'}}).composite(images).png().toFile(path.join(__dirname,`comparison-${w}.png`));
 }
 fs.writeFileSync(path.join(__dirname,'index.html'),`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>たまごカード A/B/C 比較</title><style>body{margin:20px;background:#18332f;color:#eef4ee;font-family:system-ui;line-height:1.7}a{color:#cce3f1}figure{margin:20px 0;overflow-x:auto}img{display:block;max-width:none}article{max-width:720px}.final{width:min(100%,512px);height:auto}</style><h1>たまごカード — C案採用</h1><article><p>A：改訂前 ／ B：メインカード準拠 ／ C：準拠＋控えめ装飾。右端は正式採用済みメインカードの保存画像です。</p><p>丸い外枠、タイトル帯、独立したイラスト・効果欄へ統一。Cは銀葉を四隅へ整理し、たまごを主役にしました。時コスト・ちから・ちえは付けません。</p><p>本文：自分のターン開始時、通常ドローの後にさらに1枚引き、手札1枚を山札の一番下に戻す。</p><p><a href="../../">試遊へ</a> · <a href="../egg-card-print.png">完成カードPNG</a> · <a href="../comparison.html">重ね置きUI比較</a></p></article>${[80,110,320].map(w=>`<h2>カード幅 ${w}px</h2><figure><img src="comparison-${w}.png" width="${4*(w+20)+20}" height="${w*1.5+64}" alt="A/B/Cと正式メインカードの${w}px比較"></figure>`).join('')}<h2>完成カード</h2><img class="final" src="../egg-card-print.png" alt="C案の完成たまごカード"><p>縮小比較は画像検査用です。iPhone Safari実機QAは別途必要です。</p></html>`);
})();
