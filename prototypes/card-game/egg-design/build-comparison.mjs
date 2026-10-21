import {writeFileSync,unlinkSync,readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';
import {createGame,view,CARDS} from '../engine.mjs';import {gameMarkup} from '../ui-presentation.mjs';
const base='0130bb2ba4deb7e4a174f48d56dbb3edfc76afb9';
const oldPath=new URL('../egg-before-temporary.mjs',import.meta.url);
writeFileSync(oldPath,execFileSync('git',['show',base+':prototypes/card-game/ui-presentation.mjs']));
const old=await import(oldPath.href);unlinkSync(oldPath);
const cssOld=execFileSync('git',['show',base+':prototypes/card-game/style.css'],{encoding:'utf8'}),cssNew=readFileSync(new URL('../style.css',import.meta.url),'utf8');
const views=[];
for(const born of [false,true]){
 const v=view(createGame(4),'A');if(born)for(const seat of ['A','B'])v.players[seat].board.main={...CARDS['M-beetle-01'],id:seat+':fixture',cardId:'M-beetle-01'};
 views.push([old.gameMarkup(v,'A'),gameMarkup(v,'A')]);
}
const doc=(html,css)=>'<!doctype html><html lang="ja"><head><base href="../"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body class="playing"><main id="game">'+html+'</main></body></html>';
const frames=views.map(pair=>pair.map((html,i)=>doc(html,i?cssNew:cssOld)));
writeFileSync(new URL('comparison.html',import.meta.url),'<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>たまご配置・変更前後</title><style>body{margin:20px;background:#eff4f5;color:#1a3544;font-family:system-ui}header{max-width:900px;margin:auto}button,a{padding:10px;display:inline-block}section{display:flex;flex-wrap:wrap;justify-content:center;gap:18px}iframe{width:390px;max-width:90vw;height:844px;border:1px solid #9aadb4;border-radius:12px}h2{text-align:center;font-size:18px}</style><header><h1>たまご配置・変更前後</h1><p>同じ公開状態を旧・新の実際のUI関数で描画した比較です。対戦操作はできません。実機QA済みのスクリーンショットではありません。</p><button id="egg">たまご状態</button><button id="born">たんじょう後</button><a href="../">試遊へ</a><p>変更後は独立置き場がなく、メイン枠の最上層だけが見えます。</p></header><section><article><h2>変更前</h2><iframe title="変更前"></iframe></article><article><h2>変更後</h2><iframe title="変更後"></iframe></article></section><script>const frames='+JSON.stringify(frames).replaceAll('<','\\u003c')+';function show(n){document.querySelectorAll("iframe").forEach((f,i)=>f.srcdoc=frames[n][i])}document.getElementById("egg").onclick=()=>show(0);document.getElementById("born").onclick=()=>show(1);show(0);</script></html>');
