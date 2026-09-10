#!/usr/bin/env node
// index.html の ?v= キャッシュばん を、ファイルの なかみの ハッシュから つけなおす。
// つかいかた: npm run bump   (かわった ファイルだけ トークンが かわる)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
let changed = 0;
html = html.replace(/((?:href|src)=")([^"?]+)\?v=([^"]+)(")/g, (all, pre, file, token, post) => {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) return all;
  const hash = crypto.createHash('sha1').update(fs.readFileSync(full)).digest('hex').slice(0, 8);
  const next = `${stamp}-${hash}`;
  if (token === next) return all;
  changed++;
  return `${pre}${file}?v=${next}${post}`;
});
fs.writeFileSync(htmlPath, html);
console.log(changed ? `${changed} asset token(s) updated in index.html` : 'asset tokens already up to date');
