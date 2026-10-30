// CPU B1（中級の能力値選択）試遊版を、このブランチの正式 CARD GAME から組み立てる（正式ファイルは読むだけ、書き換えもしない）。
// 方式は detail-stage-20261029/build-trial.mjs と同じ。違いは、本体の描画を書き換えないことと、試遊版の追加UIだけ。
// 使い方: node prototypes/card-game/cpu-b1-adoption-20261030/trial/build-trial.mjs <出力dir> [--large-only] [--artifact]
//   要: esbuild（`npm i esbuild` を作業用ディレクトリに入れ、ESBUILD=<esbuildの実行ファイル> で指定可）。
// 出力: index.html / trial-bundle.js（app.mjs と trial.mjs を1つにまとめたもの）/ CSS / 画像。
// --artifact: 本人限定の公開先（claude.ai Artifact）向け。CSS と JS を HTML に埋め込み、文書の外枠タグを外す（公開時に付与されるため）。
// --large-only: 公開先のファイル数上限（511）に収めるため、盤面用の small 画像も large 画像で代用する。
//   カード詳細は元々 large を使うので、比較対象の見た目は変わらない。
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url)),CG=path.resolve(HERE,'../..'),REPO=path.resolve(CG,'../..');
const OUT=path.resolve(process.argv[2]??'');if(!process.argv[2]||OUT.startsWith(REPO+path.sep))throw Error('出力先はリポジトリの外を指定してください');
const largeOnly=process.argv.includes('--large-only'),artifact=process.argv.includes('--artifact');
const ESBUILD=process.env.ESBUILD??'esbuild';
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});

// 1) JS: trial.mjs を先に評価し、その後に正式の app.mjs。
const entry=path.join(OUT,'.entry.mjs');
fs.writeFileSync(entry,`import ${JSON.stringify(path.join(HERE,'trial.mjs'))};\nimport ${JSON.stringify(path.join(CG,'app.mjs'))};\n`);
execFileSync(ESBUILD,[entry,'--bundle','--format=esm','--target=safari16','--charset=utf8','--legal-comments=none',`--outfile=${path.join(OUT,'trial-bundle.js')}`],{stdio:'inherit'});
fs.rmSync(entry);
let bundle=fs.readFileSync(path.join(OUT,'trial-bundle.js'),'utf8');

// 2) 画像: 正式の公開許可リストに載っている CARD GAME の画像だけを使う。
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
fs.copyFileSync(path.join(HERE,'trial.css'),path.join(OUT,'trial.css'));
let html=fs.readFileSync(path.join(CG,'index.html'),'utf8');
const swap=(from,to)=>{if(!html.includes(from))throw Error('index.html の想定箇所がありません: '+from);html=html.replace(from,to);};
swap('<title>なおとっち CARD GAME</title>','<title>CARD GAME CPU試遊</title>');
swap('<link rel="stylesheet" href="records.css">','<link rel="stylesheet" href="records.css"><link rel="stylesheet" href="trial.css"><script>'+fs.readFileSync(path.join(HERE,'trial-storage.js'),'utf8').trim()+'</script>');
swap('<h1>なおとっち CARD GAME</h1>','<h1>なおとっち CARD GAME <small style="font-size:.6em;color:#e4c780">CPU 能力値選択 試遊版</small></h1>');
swap('<script type="module" src="app.mjs"></script>','<script type="module" src="trial-bundle.js"></script>');
if(artifact){
 // 外部ファイルの読み込みを埋め込みに置き換える（画像だけは同梱ファイルを相対パスで読む）。
 html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,f)=>{const css=fs.readFileSync(path.join(OUT,f),'utf8');fs.rmSync(path.join(OUT,f));return `<style>${css}</style>`;});
 const js=fs.readFileSync(path.join(OUT,'trial-bundle.js'),'utf8');if(/<\/script/i.test(js))throw Error('bundle に </script が含まれます');
 fs.rmSync(path.join(OUT,'trial-bundle.js'));
 swap('<script type="module" src="trial-bundle.js"></script>',()=>`<script type="module">${js}</script>`);
 html=html.replace(/^<!doctype html>\s*<html lang="ja"><head><meta charset="utf-8"><meta name="viewport"[^>]*>/,'').replace('</head>\n<body>','').replace('</body></html>','');
 if(/<\/?(html|head|body)[ >]/.test(html))throw Error('外枠タグが残っています');
}
fs.writeFileSync(path.join(OUT,'index.html'),html);
const files=[];(function walk(d){for(const n of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,n.name);if(n.isDirectory())walk(p);else files.push(path.relative(OUT,p));}})(OUT);
console.log(JSON.stringify({out:OUT,files:files.length,bytes:files.reduce((s,f)=>s+fs.statSync(path.join(OUT,f)).size,0),largeOnly}));
