// Historical V8 opt-in fixture; current production has its own browser gate.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const out=path.resolve(process.argv[2]);
cp.execFileSync(process.execPath,['tools/home-production-v7-qa.cjs',out]);
for(const kind of ['script.js','diorama.js'])fs.copyFileSync(path.join(out,'v7-qa-'+kind),path.join(out,'v8-qa-'+kind));
let html=require('./home-production-qa-version.cjs')(fs.readFileSync(path.join(out,'v7-qa.html'),'utf8').replaceAll('v7-qa','v8-qa'),8);
fs.writeFileSync(path.join(out,'v8-qa.html'),html);
fs.writeFileSync(path.join(out,'v8-review.html'),'<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V8 表示構造の確認</title><style>body{max-width:700px;margin:auto;padding:20px;font:16px/1.7 system-ui;background:#faf8ee}a{display:block;padding:12px;margin:8px 0;border:1px solid #879a81;border-radius:8px}</style><h1>VERSION 8 表示構造</h1><p>縦は固定42px通知・76pxコメント・5＋4ボタン。横は右側の簡易操作欄です。「前の住民／次の住民」は表示窓だけを移動します。</p><p>今回は表示構造の修正です。コメントキュー・表示名・誕生装飾の修正は含みません。QAの保存は通常試遊と分離しています。</p><a href="./">通常試遊</a>'+[1,6,28].map(n=>'<a href="v8-qa.html?region=home&count='+n+'">おうち・'+n+'体</a>').join('')+'<a href="v8-qa.html?region=home&count=6&comment='+encodeURIComponent('きれいな景色を見て、しばらく立ちどまっていた。となりの仲間と目が合って、小さく笑った。'.repeat(3))+'">長文コメントの固定枠</a><a href="v8-qa.html">QA保存から再開</a></html>');
