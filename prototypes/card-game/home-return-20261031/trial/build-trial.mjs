// 「なおとっちへもどる」試遊版を、このブランチの正式 CARD GAME から組み立てる（正式ファイルは読むだけ、書き換えない）。
// 方式は cpu-b1-adoption-20261030/trial/build-trial.mjs と同じ。違いは、追加UIが無いことと、戻り先を試遊用の仮画面 home.html にすること。
// 使い方: node prototypes/card-game/home-return-20261031/trial/build-trial.mjs <出力dir> [--large-only] [--artifact]
//   要: esbuild（ESBUILD=<esbuildの実行ファイル> で指定可）。
// 保存の鍵はすべて `naotocchi-home-return-trial:` 付き（正式版の対戦・戦績・マイデッキには触れない）。
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url)),CG=path.resolve(HERE,'../..'),REPO=path.resolve(CG,'../..');
const OUT=path.resolve(process.argv[2]??'');if(!process.argv[2]||OUT.startsWith(REPO+path.sep))throw Error('出力先はリポジトリの外を指定してください');
const largeOnly=process.argv.includes('--large-only'),artifact=process.argv.includes('--artifact');
const ESBUILD=process.env.ESBUILD??'esbuild',PREFIX='naotocchi-home-return-trial:';
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});

// 1) JS: 正式の app.mjs をそのまま1つにまとめる。
execFileSync(ESBUILD,[path.join(CG,'app.mjs'),'--bundle','--format=esm','--target=safari16','--charset=utf8','--legal-comments=none',`--outfile=${path.join(OUT,'trial-bundle.js')}`],{stdio:'inherit'});
let bundle=fs.readFileSync(path.join(OUT,'trial-bundle.js'),'utf8');

// 2) 画像: 正式の公開許可リストに載っている CARD GAME の画像だけ。
const allow=JSON.parse(fs.readFileSync(path.join(REPO,'tools/pages/allowlist.json'),'utf8')).files.filter(f=>f.startsWith('prototypes/card-game/'));
const {CARD_ART}=await import(path.join(CG,'ui-art.mjs'));
const images=allow.filter(f=>/\.(webp|png)$/.test(f)).map(f=>path.relative(CG,path.join(REPO,f)));
let copied=images;
if(largeOnly){
 for(const a of Object.values(CARD_ART)){if(!bundle.includes(a.small))throw Error('画像パスが見つかりません: '+a.small);bundle=bundle.split(JSON.stringify(a.small)).join(JSON.stringify(a.large));}
 copied=images.filter(f=>!f.startsWith('art-delivery/small/'));
}
fs.writeFileSync(path.join(OUT,'trial-bundle.js'),bundle);
for(const f of copied){const to=path.join(OUT,f);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(CG,f),to);}

// 3) CSS と HTML。
for(const f of ['style.css','collection.css','learning.css','records.css'])fs.copyFileSync(path.join(CG,f),path.join(OUT,f));
let html=fs.readFileSync(path.join(CG,'index.html'),'utf8');
const swap=(from,to)=>{if(!html.includes(from))throw Error('index.html の想定箇所がありません: '+from);html=html.replace(from,to);};
const storage=`(()=>{const P=${JSON.stringify(PREFIX)},S=Storage.prototype,{getItem:g,setItem:s,removeItem:r}=S;S.getItem=function(k){return g.call(this,P+k);};S.setItem=function(k,v){return s.call(this,P+k,v);};S.removeItem=function(k){return r.call(this,P+k);};})();`;
swap('<title>なおとっち CARD GAME</title>','<title>CARD GAME もどる試遊</title>');
swap('<link rel="stylesheet" href="records.css">','<link rel="stylesheet" href="records.css"><script>'+storage+'</script>');
swap('<a id="home-return" class="home-return" href="../../">','<a id="home-return" class="home-return" href="home.html">');
swap('<script type="module" src="app.mjs"></script>','<script type="module" src="trial-bundle.js"></script>');
if(artifact){
 html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,f)=>{const css=fs.readFileSync(path.join(OUT,f),'utf8');fs.rmSync(path.join(OUT,f));return `<style>${css}</style>`;});
 const js=fs.readFileSync(path.join(OUT,'trial-bundle.js'),'utf8');if(/<\/script/i.test(js))throw Error('bundle に </script が含まれます');
 fs.rmSync(path.join(OUT,'trial-bundle.js'));
 swap('<script type="module" src="trial-bundle.js"></script>',()=>`<script type="module">${js}</script>`);
 html=html.replace(/^<!doctype html>\s*<html lang="ja"><head><meta charset="utf-8"><meta name="viewport"[^>]*>/,'').replace('</head>\n<body>','').replace('</body></html>','');
 if(/<\/?(html|head|body)[ >]/.test(html))throw Error('外枠タグが残っています');
}
fs.writeFileSync(path.join(OUT,'index.html'),html);
// 試遊用の仮のメイン画面（本番ではここが通常のなおとっち育成画面）。
fs.writeFileSync(path.join(OUT,'home.html'),`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>なおとっち（試遊用の仮画面）</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff8e7;color:#3d3326;font-family:system-ui,sans-serif;padding:16px;box-sizing:border-box}main{max-width:420px;text-align:center}h1{font-size:1.4rem}p{line-height:1.7}a{display:inline-flex;align-items:center;min-height:44px;padding:10px 18px;border-radius:12px;background:#315e62;color:#fff;text-decoration:none;font-weight:700}</style></head><body><main><h1>なおとっち</h1><p>（試遊用の仮画面）<br>本番では、ここが通常のなおとっち育成画面です。<br>「なおとっちへもどる」でここに来られたら成功です。</p><p><a id="open-card-game" href="./">CARD GAME をひらく</a></p></main></body></html>\n`);
const files=[];(function walk(d){for(const n of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,n.name);if(n.isDirectory())walk(p);else files.push(path.relative(OUT,p));}})(OUT);
console.log(JSON.stringify({out:OUT,files:files.length,bytes:files.reduce((s,f)=>s+fs.statSync(path.join(OUT,f)).size,0),largeOnly}));
