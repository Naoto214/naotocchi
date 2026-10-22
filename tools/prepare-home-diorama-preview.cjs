// Run after tools/pages/package.py; preview-only source transformations are explicit.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const out=path.resolve(process.argv[2]);assert.ok(fs.existsSync(path.join(out,'script.js')));
const {harness}=require('../tests/helpers/runtime-harness.cjs');
const h=harness({deterministic:true}),s=h.api.state();
Object.assign(s,{stage:'growing',speciesLine:'dog',stageIndex:3,regionId:'forest',hunger:85,happiness:85,energy:95,health:100,isSleeping:false,isSick:false,dying:false});
s.lifetime.timeMode='day';s.lifetime.weatherMode='sunny';s.lifetime.seasonMode='summer';
s.lifetime.money=3000;s.lifetime.regionsVisited=['home','forest','river_lake','city'];
s.companions=[{id:'shiba',bond:100},{id:'cat_friend',bond:100}];s.lifetime.companionsRecruited=['shiba','cat_friend'];
s.partner=null;
fs.writeFileSync(path.join(out,'pilot-seed.json'),JSON.stringify(s));
fs.writeFileSync(path.join(out,'pilot-profiles.json'),JSON.stringify(Object.fromEntries(['forest','river_lake','city'].map(r=>[r,{profile:h.api.meguruMod.REGION3D[r],world:h.api.meguruMod.WORLDS[r]}]))));
fs.copyFileSync('tools/home-diorama-cast-qa.html',path.join(out,'cast-qa.html'));
// Separate origin AND distinct save family; no production key can be written.
let js=fs.readFileSync('script.js','utf8').replaceAll('naotocchi-save-v1','naotocchi-home-diorama-preview-v1');
fs.writeFileSync(path.join(out,'script.js'),js);
fs.writeFileSync(path.join(out,'game.html'),fs.readFileSync('index.html'));
const landing=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>なおとっち — 生きているホーム</title><style>
*{box-sizing:border-box}body{margin:0;background:#eef3ee;color:#244a45;font:16px/1.8 system-ui,sans-serif}main{max-width:580px;margin:auto;padding:48px 24px}small{letter-spacing:.15em;color:#6d8f88}h1{font-size:30px;line-height:1.5;font-weight:650;margin:20px 0}p{font-size:14px}nav{display:grid;gap:12px;margin:30px 0}button,a{font:inherit}button{border:1px solid #b1c7bf;background:#fffdf5;border-radius:18px;padding:17px 20px;color:#244a45;text-align:left;cursor:pointer}button b{font-size:19px}button span{display:block;font-size:12px;color:#6c837a}a{color:#416b80}aside{border-top:1px solid #cad8d2;padding-top:20px;font-size:13px}iframe{display:block;border:0;background:#eef3ee;width:390px;height:844px;margin:auto;max-width:100%}.qa{max-width:100%;padding:12px}.qa nav{display:flex;margin:0 0 10px;justify-content:center;flex-wrap:wrap}.qa button{padding:5px 12px;border-radius:8px}</style>
<main id="intro"><small>NAOTOCCHI / HOME PILOT</small><h1>旅先で、<br>いっしょに暮らそう。</h1><p>木々がゆれ、生き物が動き、キャラも自分の時間を過ごします。キャラをタップして選択。地面をタップするか、キャラからドラッグして指を離すと、その場所まで歩きます。</p><nav>
<button data-region="forest"><b>もり</b><span>木の下でひとやすみ。葉と光がゆれる場所。</span></button>
<button data-region="river_lake"><b>みずべ</b><span>水面をながめる、静かな岸辺。</span></button>
<button data-region="city"><b>とかい</b><span>街路樹と小さなお店のそばで。</span></button></nav>
<p><a href="game.html">前回の試遊をつづける</a>　·　<a href="cast-qa.html">複数キャラの操作見本</a></p>
<aside>地域ボタンは試遊用の人生を新しく始めます。本番とは保存を分けています。通常の育成画面では、仲間・恋人は来訪したときに登場します。じゃれる・きゅうあい・そうじは、これまでのボタンから。</aside></main>
<script>
const q=new URLSearchParams(location.search),phone=q.get('phone');
async function start(region){const s=await (await fetch('pilot-seed.json')).json();s.regionId=region;if(q.get('qapoop')==='2')s.poopCount=2;s.lastSavedAt=Date.now();s.savedAt=Date.now();s.lastTickAt=Date.now();s.lifetime.saveRevision=1;for(const k of ['naotocchi-home-diorama-preview-v1','naotocchi-home-diorama-preview-v1-backup','naotocchi-home-diorama-preview-v1-snaps'])localStorage.removeItem(k);localStorage.setItem('naotocchi-home-diorama-preview-v1',JSON.stringify(s));if(phone){document.getElementById('intro').className='qa';document.getElementById('intro').innerHTML='<nav><button onclick="location.reload()">地域へもどる</button><button id="small">320px</button><button id="large">390px</button></nav><iframe title="育成画面" src="game.html"></iframe>';const f=document.querySelector('iframe');document.getElementById('small').onclick=()=>f.style.width='320px';document.getElementById('large').onclick=()=>f.style.width='390px';}else location.href='game.html';}
document.querySelectorAll('[data-region]').forEach(b=>b.onclick=()=>start(b.dataset.region));
</script></html>`;
fs.writeFileSync(path.join(out,'index.html'),landing);
console.log('Prepared preview-only launcher, separate save keys and real Home game.');
