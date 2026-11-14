// Explicit development export. The normal production packager is unchanged.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const target=process.argv[2];
if(!target||!path.isAbsolute(target))throw Error('Pass an absolute empty development output directory');
execFileSync(process.execPath,['tools/life-sugoroku/package.mjs',target],{stdio:'inherit'});
const qa=['tools/life-sugoroku/qa-v7-games.html','tools/life-sugoroku/qa-v7-games.mjs'];
for(const file of qa){const dest=path.join(target,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(file,dest);}
fs.writeFileSync(path.join(target,'index.html'),'<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>なおころ。ミニゲーム試遊</title><meta http-equiv="refresh" content="0;url=tools/life-sugoroku/qa-v7-games.html"><a href="tools/life-sugoroku/qa-v7-games.html">本人限定ミニゲーム試遊を開く</a></html>\n');
const manifest=JSON.parse(fs.readFileSync(path.join(target,'build-manifest.json')));
manifest.developmentOnly=true;manifest.productionAllowlistChanged=false;
manifest.files=[...new Set([...manifest.files,...qa,'index.html'])].sort();manifest.fileCount=manifest.files.length;
manifest.sha256=Object.fromEntries(manifest.files.map(file=>[file,createHash('sha256').update(fs.readFileSync(path.join(target,file))).digest('hex')]));
fs.writeFileSync(path.join(target,'build-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({developmentOnly:true,files:manifest.fileCount,githubCommit:manifest.githubCommit}));
