// Owner-private trial package: only runtime code and optimized presentation assets.
import {mkdir,readdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const game=fileURLToPath(new URL('../',import.meta.url)),repo=path.resolve(game,'../..'),dist=path.resolve(process.argv[2]??'dist');
const target=path.join(dist,'prototypes/card-game');
await mkdir(target,{recursive:true});
async function copy(rel){const to=path.join(target,rel);await mkdir(path.dirname(to),{recursive:true});await copyFile(path.join(game,rel),to);}
for(const file of await readdir(game))if(/\.mjs$|^style\.css$|^index\.html$|^UI-IMPLEMENTATION\.md$/.test(file))await copy(file);
for(const rel of ['art-pilot/approved-colors.mjs','art-pilot/symbols/attributes.mjs','ui-assets/card-back-approved.png','art-delivery/manifest.json'])await copy(rel);
for(const size of ['small','large'])for(const file of await readdir(path.join(game,'art-delivery',size)))await copy(`art-delivery/${size}/${file}`);
await mkdir(path.join(dist,'assets/characters/egg'),{recursive:true});
await copyFile(path.join(repo,'assets/characters/egg/intact.png'),path.join(dist,'assets/characters/egg/intact.png'));
let html=await readFile(path.join(target,'index.html'),'utf8');
html=html.replace('<title>なおとっち CARD GAME · ふたり対戦</title>','<title>なおとっち CARD GAME · 全452枚アート試遊</title>').replace('同じ端末で2人対戦</span>','全452枚アート試遊</span>');
await writeFile(path.join(target,'index.html'),html);
await writeFile(path.join(dist,'index.html'),'<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=./prototypes/card-game/"><title>なおとっち CARD GAME · 全452枚アート試遊</title><a href="./prototypes/card-game/">全452枚アートのカードゲームを開く</a></html>\n');
// Content-hashed derivatives can be cached without retaining any session/hand state.
await writeFile(path.join(dist,'_headers'),'/prototypes/card-game/art-delivery/small/*\n  Cache-Control: private, max-age=31536000, immutable\n/prototypes/card-game/art-delivery/large/*\n  Cache-Control: private, max-age=31536000, immutable\n');
console.log(JSON.stringify({dist,game:'prototypes/card-game/index.html',art:904}));
