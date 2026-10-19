import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';import {cardMarkup} from '../../ui-presentation.mjs';import {CATALOG} from '../../full-catalog.mjs';
const require=createRequire(import.meta.url),sharp=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp'),dir=path.dirname(fileURLToPath(import.meta.url));
const canonical=cardMarkup(CATALOG['M-beetle-01']);
const ornament=canonical.match(/<svg class="botanical"[\s\S]*?<\/svg>/)[0];
fs.writeFileSync(path.join(dir,'shared-botanical.svg'),ornament);
const art=await sharp(path.join(dir,'previous-C.png')).extract({left:65,top:355,width:890,height:680}).png().toBuffer();
await sharp(art).toFile(path.join(dir,'preserved-art.png'));
const data=b=>'data:image/png;base64,'+b.toString('base64');
// Retain C lettering exactly as pixels; remove only its pale panel background.
async function ink(box){const {data:raw,info}=await sharp(path.join(dir,'previous-C.png')).extract(box).ensureAlpha().raw().toBuffer({resolveWithObject:true});for(let i=0;i<raw.length;i+=4){const light=Math.max(raw[i],raw[i+1],raw[i+2]);raw[i+3]=light<130?255:light<200?Math.round((200-light)/70*255):0;}return sharp(raw,{raw:info}).png().toBuffer();}
const title=await ink({left:350,top:175,width:330,height:105}),copy=await ink({left:110,top:1135,width:760,height:210});
// Static export of the common 600x900 card shell. Coordinates follow style.css
// (4% inset, 20% heading, 25% copy, 3% footer). Missing stats extend only the art.
const orn=ornament.replace('<svg ','<svg x="0" y="0" width="600" height="900" ').replace('class="botanical"','class="botanical" style="color:#8c9da8"');
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536" viewBox="0 0 600 900"><defs><linearGradient id="paper" x2="1" y2="1"><stop stop-color="#dbe8f0"/><stop offset="1" stop-color="#84a8c1"/></linearGradient><linearGradient id="copy"><stop stop-color="#edf2f3"/><stop offset=".5" stop-color="#fffef3"/><stop offset="1" stop-color="#dfe9ec"/></linearGradient><clipPath id="shell"><rect width="600" height="900" rx="30" ry="45"/></clipPath><clipPath id="art"><rect x="25" y="205" width="550" height="415" rx="71.5" ry="53.95"/></clipPath></defs><g clip-path="url(#shell)"><rect x=".5" y=".5" width="599" height="899" rx="30" ry="45" fill="url(#paper)" stroke="#8a9da9"/><rect x="2" y="2" width="596" height="896" rx="28" ry="43" fill="none" stroke="#f3f7fa" stroke-width="2"/><rect x="4" y="4" width="592" height="892" rx="26" ry="41" fill="none" stroke="#9eafb9" stroke-width="2"/>
<style>.leaf-filagree{fill:#b7c6d1;opacity:.5}</style><rect x="15.6" y="23.4" width="568.8" height="853.2" rx="22.75" ry="34.13" fill="none" stroke="#638da9" stroke-width="7.73"/>${orn}
<path d="M91 25H509Q575 25 575 45.4V181.4Q575 195 531 195H69Q25 195 25 181.4V45.4Q25 25 91 25Z" fill="#b9cfde" stroke="#91a3ae"/><image href="${data(title)}" x="205" y="80" width="190" height="60.45"/>
<rect x="25" y="205" width="550" height="415" rx="71.5" ry="53.95" fill="#f5ead5" stroke="#8e9fab"/><image href="${data(art)}" x="25" y="205" width="550" height="415" preserveAspectRatio="xMidYMid meet" clip-path="url(#art)"/>
<rect x="25" y="630" width="550" height="210" rx="44" ry="16.8" fill="url(#copy)" stroke="#91a3ae"/><rect x="26.5" y="631.5" width="547" height="207" rx="43" ry="16" fill="none" stroke="#f5f8fa"/><path d="M43 681H557" stroke="#91a3ae"/>
<image href="${data(copy)}" x="43" y="700" width="400" height="110.53"/>
<ellipse cx="300" cy="861.3" rx="252" ry="9" fill="#638da9" stroke="#91a3ae"/>
<text x="300" y="865" text-anchor="middle" font-family="Arial,sans-serif" font-size="14.904" letter-spacing="2.68272" fill="#637c8d">NAOTOCCHI</text></g></svg>`;
fs.writeFileSync(path.join(dir,'egg-template.svg'),svg);
await sharp(Buffer.from(svg)).png().toFile(path.join(dir,'../original.png'));
// A true common-template HTML source retained for maintainers, never runtime replacement.
const eggHTML=canonical.replace(/<div class="card-heading">[\s\S]*?<div class="card-art">/, '<div class="card-heading"><strong class="card-title">たまご</strong></div><div class="card-art">').replace(/<div class="card-art">[\s\S]*?<div class="card-stats">/,'<div class="card-art"><img class="dedicated-art" src="preserved-art.png"></div><div class="card-stats">').replace(/<div class="card-stats">[\s\S]*?<div class="card-copy"/,'<div class="card-copy"').replace(/<div class="card-copy"[\s\S]*?<small class="card-footer">/,'<div class="card-copy"><p>自分のターン開始時、通常ドローの後にさらに1枚引き、手札1枚を山札の一番下に戻す。</p></div><small class="card-footer">');
const paletteCSS=fs.readFileSync(path.join(dir,'../../style.css'),'utf8').replace(/#([0-9a-f]{6})([0-9a-f]{2})?\b/gi,(whole,hex,alpha='')=>{const r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);if(!(r>g&&g>b))return whole;const l=Math.round(.2126*r+.7152*g+.0722*b);return '#'+[Math.max(0,l-9),l,Math.min(255,l+7)].map(v=>v.toString(16).padStart(2,'0')).join('')+alpha;});
fs.writeFileSync(path.join(dir,'common-template.html'),`<!doctype html><meta charset="utf-8"><style>${paletteCSS}.card-face{width:600px;height:900px;--card-color:#638da9!important;grid-template-rows:20% minmax(0,1fr) 25% 3%}.botanical{color:#8c9da8}.leaf-filagree{fill:#b7c6d1}.card-footer{color:#637c8d}</style>${eggHTML.replace('aria-label="カブトムシ①"','aria-label="たまご"')}`);
