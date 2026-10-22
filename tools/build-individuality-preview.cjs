// Build only from the reviewed Pages runtime package. QA never enters production source.
const fs=require('node:fs'),path=require('node:path');
const [source,out]=process.argv.slice(2);if(!source||!out)throw Error('Usage: node tools/build-individuality-preview.cjs PACKAGE OUTPUT');
fs.mkdirSync(out,{recursive:true});fs.cpSync(source,out,{recursive:true});
const p=path.join(out,'script.js');let code=fs.readFileSync(p,'utf8').replaceAll('naotocchi-save-v1','naotocchi-individuality-trial-v1');
const hook=`
  // Owner-private preview only. All operations use isolated origin AND isolated save keys.
  window.individualityQA={
    birth(){closeAllMenuOverlays();state=freshState();hatchEgg();saveState();render();},
    event(age){if(state.stage!==STAGE.GROWING)this.birth();closeAllMenuOverlays();state.ageTicks=age*AGE_TICKS_PER_YEAR;onAgeChanged(age-1);el.storyFlash.classList.add('hidden');state.transformOptions=null;saveState();render();showIndividualityEvent(true);},
    profile(){closeAllMenuOverlays();renderProfile();el.profileOverlay.classList.remove('hidden');scheduleHistoryLayerSync();},
    companions(){state.companions=['owl','cat_friend','rabbit_friend','squirrel','shiba','penguin_friend'].map(id=>({...COMPANIONS.find(c=>c.id===id),bond:100}));state.individuality.lastExchangeAge=-1;saveState();render();maybeIndividualExchange();},
    inspect(){return {life:state.individuality?.lifeId,hearts:Object.fromEntries(Object.keys(INDIVIDUALITY.data.hearts).map(h=>[h,INDIVIDUALITY.points(state.individuality,h)])),events:state.individuality?.events,preferences:state.individuality?.preferences};}
  };
`;
const end=code.lastIndexOf('})();');if(end<0)throw Error('IIFE boundary missing');code=code.slice(0,end)+hook+code.slice(end);fs.writeFileSync(p,code);
const panel=`<details id="trialQA" style="position:fixed;bottom:8px;left:8px;z-index:100000;background:#fff9e8;color:#352a21;padding:8px;border:2px solid #cc9b48;border-radius:12px;max-width:calc(100vw - 16px);max-height:70vh;overflow:auto;font-size:14px"><summary>本人用・個性QA</summary><a href="mobile-qa.html">390px画面QA</a><p>試遊専用セーブです。本編には反映されません。年齢移動・仲間配置はQA用の直接設定です。</p><button onclick="individualityQA.birth()">新しい子</button><button onclick="individualityQA.profile()">個性を見る</button><button onclick="individualityQA.companions()">交流を試す</button><p>人生イベント（選択済みは再加点しません）</p>${[3,7,12,16,22,44,50,56,62,66,70,90].map(a=>`<button style="min-width:48px;min-height:44px" onclick="individualityQA.event(${a})">${a}歳</button>`).join('')}<button onclick="document.getElementById('trialState').textContent=JSON.stringify(individualityQA.inspect(),null,2)">記録を確認</button><pre id="trialState" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre></details>`;
const index=path.join(out,'index.html');fs.writeFileSync(index,fs.readFileSync(index,'utf8').replaceAll('naotocchi-save-v1','naotocchi-individuality-trial-v1').replace('</body>',panel+'</body>'));
console.log('Built isolated individuality preview');

fs.writeFileSync(path.join(out,'mobile-qa.html'),'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>390px QA</title><p>390×844のiframe確認（Safari実機ではありません）</p><iframe title="390px試遊" src="index.html" style="width:390px;height:844px;border:1px solid #aaa"></iframe>');
