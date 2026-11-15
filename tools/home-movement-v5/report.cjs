// Render the measured report for phones; no gameplay or save access.
const fs=require('node:fs'),path=require('node:path');
const dir=path.resolve(process.argv[2]);
const data=JSON.parse(fs.readFileSync(path.join(dir,'summary.json')));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const number=n=>!Number.isFinite(n)?'未測定':Math.abs(n)<.005?'0.00':(n>0?'+':'')+n.toFixed(2);
const rows=data.primary.map(a=>`<tr><th scope="row">${esc(a.label)}</th>${['left','right','top','bottom'].map(k=>`<td class="${a.gains[k]>.8?'gain':''}">${number(a.gains[k])}</td>`).join('')}</tr>`).join('');
fs.writeFileSync(path.join(dir,'index.html'),`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>なおとっち V5 実到達の検証結果</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f6f4ec;color:#23433d;font:15px/1.75 system-ui,sans-serif}main{max-width:850px;margin:auto;padding:16px 8px 40px}h1{font-size:23px;line-height:1.4}h2{font-size:19px;margin-top:30px}a{color:#146453;text-underline-offset:3px}table{border-collapse:collapse;width:100%;font-size:12px;font-variant-numeric:tabular-nums}td,th{padding:8px 3px;border-bottom:1px solid #d9ded5;text-align:right}th:first-child{text-align:left;max-width:130px;overflow-wrap:anywhere}thead{background:#e6ece2}.gain{color:#096b46;font-weight:700}figure{margin:16px 0}img{max-width:100%;height:auto}nav{display:flex;flex-wrap:wrap;gap:8px 18px}.note{padding:12px;background:white;border-radius:10px}code{overflow-wrap:anywhere}</style>
<main><nav><a href="../">ドラッグ比較へ戻る</a><a href="https://github.com/Naoto214/naotocchi/pull/558">Draft PR #558</a><a href="https://github.com/Naoto214/naotocchi/blob/codex/home-movement-v5/docs/qa/home-movement-v5/README.md">詳細報告</a><a href="limits.csv">実測CSV</a></nav>
<h1>全28体・上下左右の実到達</h1><p>VERSION 4からの改善量（CSS px）。390×844、とかい・夜。28体表示のカメラを固定し、接触だけを分離して1体ずつ実際にドラッグしました。通常の1体表示の結果ではありません。</p>
<p class="note">左は全28体で11.18〜27.30px拡張。右は26体で拡張。上下は多くの個体で維持しています。0は改善なしです。主人公はヤドカリ第6段階・紙の装備、恋人はやさしいゴリラです。</p>
<table><thead><tr><th>個体</th><th>左</th><th>右</th><th>上</th><th>下</th></tr></thead><tbody>${rows}</tbody></table>
<h2>4体配置の代表結果</h2><p>同じ390×844でも、人数による既存のカメラ設定が異なるため上の28体表とは別条件です。ヤドカリは左65.42px・上3.71px、アザラシは上4.73px改善。ヤドカリの右と下は維持しました。過去のゴリラ斜め下入力ではV4より32.59px下へ到達します。</p>
<nav><a href="screenshots/case2-pet_hermit_crab-left-a.png">従来版・ヤドカリ左</a><a href="screenshots/case2-pet_hermit_crab-left-d.png">V4・ヤドカリ左</a><a href="screenshots/case2-pet_hermit_crab-left-e.png">V5・ヤドカリ左</a><a href="screenshots/case2-companion_seal-top-e.png">V5・アザラシ上</a></nav>
<p>28体を同時に置いた検証では112方向操作のうち74件が移動し、38件は安全に停止。旧版の逆行抑止による差を除き、23方向で実到達が改善しました。<a href="dense-residents.md">28体同時配置の一覧</a></p>
<h2>検証範囲と例外</h2><p>実ポインター入力${data.totals.dispatchedPointers.toLocaleString('ja-JP')}件。画面幅320・375・390・430px、52背景、装備変更64条件を確認。21件は旧版が操作と逆方向へ進んでいた応答を抑止した例外で、生の比較記録を残しています。その他の未解決後退は今回の入力群では0件（許容差0.8px）。</p>
<p>320pxの固定配置でアザラシ本体を直接掴めなかった80試行は成功扱いにせず、個体選択後の地面ドラッグで別に確認しました。全31主人公種×8段階×装備×全配置の総当たりではありません。実機iPhone Safariは未検証です。</p>
<h2>これ以上広げなかった部分</h2><p>上端は地形や前景、下端は76pxのセリフ領域と揺れの描画余裕が主な制約です。表情・動きを含む横幅の予約も維持しています。地面の追加は既存の2.5D投影を置き換えるものではなく、以前から建物の前に浮いて見える位置をすべて直す変更ではありません。</p>
<nav><a href="unchanged-constraints.md">個体別の局所制約</a><a href="regions-compare.md">13地域の比較</a><a href="summary.json">集計データ</a><a href="regressions.json">例外の記録</a><a href="matrix-evidence.json.gz">全試行データ</a></nav></main></html>`);
