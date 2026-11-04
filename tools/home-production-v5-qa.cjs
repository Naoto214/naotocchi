// Private review artifact only. This generator and its outputs are NOT in the
// production allowlist; normal unlock rules and source saves remain untouched.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const out=path.resolve(process.argv[2]);
cp.execFileSync(process.execPath,['tools/home-production-qa.cjs',out]);
let js=fs.readFileSync(path.join(out,'release-qa-script.js'),'utf8');
js=js.replace('window.HomeReleaseQA={',`window.HomeReleaseQA={
 noticeCase(kind){
  // Isolate a single authored sample in this disposable test surface.
  clearTimeout(storyFlashTimer);storyFlashTimer=null;homeNoticeQueue.length=0;homeStoryCurrent=null;
  el.storyFlash.classList.add('hidden');
  const forest=REGIONS.find(r=>r.id==='forest');
  const texts={forest:forest.emoji+' '+forest.label+'にやってきた!'+REGION_RUNTIME_META.forest.lines[2],
   travel:STORY_EVENT_POOLS.travel[1].message,court:STORY_EVENT_POOLS.court[1].message,
   multiline:STORY_EVENT_POOLS.travel[1].message+'\\n'+STORY_EVENT_POOLS.court[1].message,
   short:STORY_EVENT_POOLS.pet[0].message};
  if(kind==='story'){showStoryEvent(STORY_EVENT_POOLS.travel[1]);return STORY_EVENT_POOLS.travel[1].message;}
  setMessage(texts[kind]||'');render();return compactJapaneseText(texts[kind]||'');
 },
`);
js=js.replace(/\}\)\(\);\s*$/,`
const qaParams=new URLSearchParams(location.search);
const qaRegion=qaParams.get('region');
if([...REGIONS,...SPECIAL_REGIONS].some(r=>r.id===qaRegion)){
 HomeReleaseQA.scene(qaRegion,[1,6,28].includes(Number(qaParams.get('count')))?Number(qaParams.get('count')):6,qaRegion==='star_stop'?'night':'day');
 HomeReleaseQA.save();
}
})();`);
fs.writeFileSync(path.join(out,'v5-qa-script.js'),js);
fs.renameSync(path.join(out,'release-qa-diorama.js'),path.join(out,'v5-qa-diorama.js'));
// Scope every storage API used by the page, including other modules' markers.
const storage=`<script>(function(){const p=Storage.prototype,g=p.getItem,s=p.setItem,r=p.removeItem,k=p.key,n='naotocchi-home-v5-qa:';p.getItem=function(key){return g.call(this,n+key)};p.setItem=function(key,value){return s.call(this,n+key,value)};p.removeItem=function(key){return r.call(this,n+key)};p.clear=function(){const keys=[];for(let i=0;i<this.length;i++){const key=k.call(this,i);if(key.startsWith(n))keys.push(key)}keys.forEach(key=>r.call(this,key))};})();</script>`;
let html=fs.readFileSync(path.join(out,'historical-release-qa.html'),'utf8').replace('<head>','<head>'+storage).replace('release-qa-script.js','v5-qa-script.js').replace('release-qa-diorama.js','v5-qa-diorama.js');
fs.writeFileSync(path.join(out,'v5-qa.html'),html);
for(const name of ['release-qa.html','release-qa-script.js','release-qa-seed.json'])fs.unlinkSync(path.join(out,name));
(async()=>{
 const {ART_CANDIDATES,ART_SCENES}=await import(path.resolve('home-production-manifest.mjs'));
 const names={home:'おうちC',forest:'森',river_lake:'水辺G',city:'都会',countryside:'田舎',mountain:'山',snow:'雪国',sea:'海B2',jungle:'ジャングル',desert:'砂漠',deepsea:'深海',star_stop:'星空の停留所',memory_lake:'記憶の湖'};
 const section=([region,name])=>{const asset=ART_CANDIDATES.find(a=>a.id===ART_SCENES[region].candidate);return '<section><h2>'+name+'</h2><a href="../'+asset.src+'">背景画像単体</a> '+[1,6,28].map(count=>'<a href="../v5-qa.html?region='+region+'&count='+count+'">'+count+'体で試遊</a>').join(' ')+'</section>';};
 fs.mkdirSync(path.join(out,'v5-review'),{recursive:true});
 fs.writeFileSync(path.join(out,'v5-review/index.html'),'<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VERSION 5 地域QA</title><style>body{font:16px/1.7 system-ui;max-width:720px;margin:auto;padding:20px;background:#f7faf6;color:#183d32}a{display:inline-block;padding:10px;margin:4px;border:1px solid #759b8c;border-radius:8px;color:#165743}section{padding:12px;margin:16px 0;background:white;border-radius:12px}h1{font-size:23px}</style><h1>VERSION 5 地域QA</h1><p>背景・自由生活・通知の実機確認用。通常試遊とは別の保存領域です。各人数リンクはQA状態を作り直します。ブラウザーの「戻る」で一覧へ戻れます。</p><a href="../v5-qa.html">QAセーブを再開</a><a href="../">通常試遊へ</a>'+['star_stop','memory_lake'].map(r=>section([r,names[r]])).join('')+'<h2>全13地域</h2>'+Object.entries(names).filter(([r])=>!['star_stop','memory_lake'].includes(r)).map(section).join('')+'</html>');
})();
