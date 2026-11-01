// Disposable private QA using the exact runtime renderer; never shipped to Pages.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const out=path.resolve(process.argv[2]);
cp.execFileSync(process.execPath,['tools/home-production-v5-qa.cjs',out]);
let js=fs.readFileSync(path.join(out,'v5-qa-script.js'),'utf8');
js=js.replace('window.HomeReleaseQA={',`window.HomeReleaseQA={
 commentCase(kind='pet',text='うれしいな',name='',story=false){
  clearConversationTimers();clearTimeout(storyFlashTimer);storyFlashTimer=null;homeNoticeQueue.length=0;homeStoryCurrent=null;el.storyFlash.classList.add('hidden');
  hideSpeechBubble();state.hunger=5;state.health=100;state.isSleeping=false;render();
  const def=kind==='partner'?WORLD_MASTER.partners.find(p=>p.id==='snow_spirit'):kind==='companion'?allCompanionsById(state.companions[0]?.id):null;
  if(kind==='partner')state.partner={...def,label:def.name||def.label,affection:80,married:true};
  const speaker=kind==='pet'?petSpeaker():{kind,id:def.id,label:def.name||def.label,emoji:def.emoji};
  if(name)speaker.label=name;
  setMessage('じっせきをたっせいした！');
  if(story)showStoryEvent({message:text,characterComment:true,...(kind==='pet'?{petReaction:true}:{character:def})});
  else setSpeechBubble(text,speaker,{holdMs:60000});
  clearTimeout(storyFlashTimer);storyFlashTimer=null;
  return {text,name:speaker.label,kind};
 },
 courtFriend(){
  clearConversationTimers();hideSpeechBubble();clearTimeout(storyFlashTimer);storyFlashTimer=null;homeNoticeQueue.length=0;el.storyFlash.classList.add('hidden');
  state.regionId='snow';state.partner=null;state.orientationId='aro';state.attractedTo=[];state.energy=100;state.hunger=100;state.health=100;
  state.lifetime.partnerEncounters=findRegion('snow').candidates.map(c=>c.id);render();el.courtBtn.click();
 },
 exchange(){
  clearConversationTimers();hideSpeechBubble();clearTimeout(storyFlashTimer);storyFlashTimer=null;homeNoticeQueue.length=0;el.storyFlash.classList.add('hidden');message='';
  // The disposable adult scene skips hatching, where this is normally created.
  state.individuality ||= INDIVIDUALITY.create(state.speciesLine,REGIONS.map(r=>r.id));
  state.individuality.lastExchangeAge=-1;state.isSick=false;state.isSleeping=false;
  return maybeIndividualExchange();
 },
 clearComment(){hideSpeechBubble();el.storyFlash.classList.add('hidden');},
`);
js=js.replace(/\}\)\(\);\s*$/,`
const p7=new URLSearchParams(location.search);
if(p7.has('comment'))setTimeout(()=>HomeReleaseQA.commentCase(p7.get('kind')||'pet',p7.get('comment'),p7.get('name')||'',p7.get('story')==='1'),500);
})();`);
fs.writeFileSync(path.join(out,'v7-qa-script.js'),js);
fs.copyFileSync(path.join(out,'v5-qa-diorama.js'),path.join(out,'v7-qa-diorama.js'));
fs.writeFileSync(path.join(out,'v7-qa.html'),fs.readFileSync(path.join(out,'v5-qa.html'),'utf8').replaceAll('v5-qa','v7-qa'));
fs.mkdirSync(path.join(out,'v7-review'),{recursive:true});
fs.writeFileSync(path.join(out,'v7-review/index.html'),fs.readFileSync(path.join(out,'v5-review/index.html'),'utf8').replaceAll('VERSION 5','VERSION 7').replaceAll('v5-qa','v7-qa'));
const texts=['うれしいな','今日はいい日だった','遊びの途中で、ふと何かを思い出したような顔をした','きれいな景色を見て、しばらく立ちどまっていた。となりの仲間と目が合って、小さく笑った。','遊びの途中で、ふと何かを思い出したような顔をした。きれいな景色を見て、しばらく立ちどまっていた。となりの仲間と目が合って、小さく笑った。今日のことを、明日もおぼえていられたらいいなと思った。'];
fs.writeFileSync(path.join(out,'v7-comment-review.html'),'<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VERSION 7 会話確認</title><style>body{font:16px/1.7 system-ui;padding:18px;background:#f7faf6}a{display:block;padding:12px;margin:8px;border:1px solid #759b8c;border-radius:8px}</style><h1>VERSION 7 会話確認</h1><p>一画面ずつ開きます。テスト用セーブは通常試遊と独立しています。</p>'+['pet','companion','partner'].map((kind,i)=>'<h2>'+['主役','仲間','ゆきのせいれい'][i]+'</h2>'+texts.map((t,n)=>'<a href="v7-qa.html?region=forest&count=28&kind='+kind+'&comment='+encodeURIComponent(t)+'">'+(n+1)+'：'+t.length+'文字</a>').join('')).join('')+'<a href="v7-review/">13地域の操作確認</a><a href="./">通常試遊</a></html>');
