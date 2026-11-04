// Private QA packaging; never included in production runtime. Uses real display functions.
const fs=require('fs'),path=require('path'),cp=require('child_process');
const out=path.resolve(process.argv[2]);
for(const file of ['home-diorama.css','home-diorama.js','pet-expression.js','care-status.js','script.js']){
 const dest=path.join(out,'baseline-v13-'+file);if(!fs.existsSync(dest))fs.copyFileSync(path.join(out,file),dest);
}
cp.execFileSync(process.execPath,['tools/home-v13-qa.cjs',out],{stdio:'inherit'});
for(const f of ['pet-expression.js','care-status.js'])fs.copyFileSync(f,path.join(out,f));
let js=fs.readFileSync(path.join(out,'qa-v13-script.js'),'utf8').replaceAll('home-v13-qa-v1','home-v14-qa-v1');
const extra=`
  const v14Texts={short:'Hey!',medium:'おやすみ。あしたからほんきだす',long:'ここからながめる景色が好き。風が通るたびに、葉っぱの色も少しずつ変わって見えるね。明日もいっしょに歩いてみよう。',english:'I like watching the leaves move in the wind. Shall we walk together tomorrow?'};
  let v14Role='pet';
  const prepareV14=HomeV13QA.prepare;HomeV13QA.prepare=function(){if(careAfterglowTimer)clearTimeout(careAfterglowTimer);careAfterglowTimer=null;hideHomeChoiceResult();state.poopCount=0;prepareV14.call(this);};
  function v14Say(key){HomeV13QA.prepare();state.isSleeping=false;render();const a=homeCastActors().find(a=>a.kind===v14Role)||homeCastActors()[0];setSpeechBubble(v14Texts[key],{kind:a.kind,id:a.id,label:a.kind==='pet'?currentVisualStage().label:a.kind==='partner'?state.partner.label:allCompanionsById(a.id)?.label||a.id,emoji:'🐶'},{holdMs:600000});pointHomeSpeech();}
  Object.assign(HomeV13QA,{
    short(){v14Say('short')},medium(){v14Say('medium')},long(){v14Say('long')},english(){v14Say('english')},
    pet(){v14Role='pet';v14Say('short')},companion(){v14Role='companion';v14Say('short')},partner(){v14Role='partner';v14Say('short')},
    growth(){this.prepare();showCareFeedback({icon:'growth',text:'せいちょう ↑ 49%'});renderCareNotice();},
    energy(){this.prepare();showCareFeedback({icon:'sleep',text:'げんき +2'});renderCareNotice();},
    reward(){this.prepare();showStoryEvent({emoji:'🏆',message:'実績10こ達成！ コイン +50'});},
    ambient(){this.prepare();showStoryEvent({emoji:'🌞',message:'ひなたぼっこでぽかぽか。げんき+5',environmentMoment:true});},
    both(){this.short();showStoryEvent({emoji:'🏆',message:'実績10こ達成！ コイン +50'});},
    font0(){el.speechBubble.style.fontSize='13px';pointHomeSpeech()},font5(){el.speechBubble.style.fontSize='13.65px';pointHomeSpeech()},font10(){el.speechBubble.style.fontSize='14.3px';pointHomeSpeech()},fontFinal(){el.speechBubble.style.fontSize='';pointHomeSpeech()},
    hidden(){hideSpeechBubble();pointHomeSpeech();},result(){hideSpeechBubble();pointHomeSpeech();showHomeChoiceResult('しばは、うれしそうにうなずいた。');},resultShort(){this.short();showHomeChoiceResult('しばは、うれしそうにうなずいた。');},resultBoth(){this.long();showHomeChoiceResult('しばは、うれしそうにうなずいた。');},
    sleepBefore12(){this.sleepRight();document.getElementById('v14-sleep-compare')?.remove();const css=document.createElement('style');css.id='v14-sleep-compare';css.textContent='#castStage[data-diorama] [data-diorama-actor] .character-visual{scale:var(--diorama-facing,1) 1!important;transform-origin:50% 100%!important} #castStage[data-diorama] [data-diorama-actor] .character-visual>.character-asset{scale:1!important} #castStage[data-diorama] [data-diorama-actor] .pet-expression-accent--sleeping{translate:0 0}';document.head.appendChild(css);},
    sleepBefore13(){this.sleepRight();document.getElementById('v14-sleep-compare')?.remove();const css=document.createElement('style');css.id='v14-sleep-compare';css.textContent='#castStage[data-diorama] [data-diorama-actor] .pet-expression-accent--sleeping{translate:0 0}';document.head.appendChild(css);},
    sleepAfter(){document.getElementById('v14-sleep-compare')?.remove();this.sleepRight();},
    measure(){const rect=e=>e.getBoundingClientRect().toJSON(),css=getComputedStyle(el.speechBubble),a=el.petSprite.querySelector('.pet-expression-accent--sleeping');return {viewport:{width:innerWidth,height:innerHeight},cast:homeDiorama.model.snapshot().length,stage:rect(el.castStage),speech:rect(el.speechBubble),text:rect(el.speechText),actualText:el.speechText.textContent,result:rect(document.getElementById('homeChoiceResult')),resultText:document.getElementById('homeChoiceResult').textContent,textScroll:el.speechText.scrollHeight,font:css.fontSize,slot:rect(el.speechSlot),choices:rect(el.speechChoices),sleep:a?{rect:rect(a),translate:getComputedStyle(a).translate,anchor:a.style.getPropertyValue('--sleep-anchor-x'),facing:el.petSprite.style.getPropertyValue('--diorama-facing'),origin:el.petSprite.style.getPropertyValue('--diorama-origin'),shift:el.petSprite.style.getPropertyValue('--diorama-sleep-shift')}:null,message:el.message.textContent};}
  });
  window.HomeV14QA=HomeV13QA;
`;
js=js.replace('setInterval(loop, TICK_MS);','/* QA fixture: clock paused; motion RAF remains live. */');
js=js.replace(/\}\)\(\);\s*$/,extra+'\n})();');fs.writeFileSync(path.join(out,'qa-v14-script.js'),js);
fs.copyFileSync(path.join(out,'qa-v13-model.js'),path.join(out,'qa-v14-model.js'));
fs.copyFileSync(path.join(out,'qa-v13-diorama.js'),path.join(out,'qa-v14-diorama.js'));
let html=fs.readFileSync(path.join(out,'qa-v13-game.html'),'utf8').replaceAll('qa-v13-','qa-v14-');fs.writeFileSync(path.join(out,'qa-v14-game.html'),html);
const baselineScript=fs.readFileSync(path.join(out,'baseline-v13-script.js'),'utf8').replaceAll('naotocchi-home-diorama-preview-v1','naotocchi-home-v14-qa-v1').replace(/\}\)\(\);\s*$/,js.slice(js.indexOf('  const qp=new URLSearchParams')));
fs.writeFileSync(path.join(out,'qa-v14-baseline-script.js'),baselineScript.replace('setInterval(loop, TICK_MS);','/* QA fixture: clock paused. */'));
fs.writeFileSync(path.join(out,'qa-v14-baseline-diorama.js'),fs.readFileSync(path.join(out,'baseline-v13-home-diorama.js'),'utf8').replace('return {model,update,sync,interrupt,','return {inspectScene:()=>scene,model,update,sync,interrupt,'));
fs.writeFileSync(path.join(out,'qa-v14-baseline.html'),html.replace('qa-v14-script.js','qa-v14-baseline-script.js').replace('qa-v14-diorama.js','qa-v14-baseline-diorama.js').replaceAll('home-diorama.css?','baseline-v13-home-diorama.css?').replaceAll('care-status.js?','baseline-v13-care-status.js?'));
let page=fs.readFileSync(path.join(out,'v13-qa.html'),'utf8').replaceAll('home-v13-qa-v1','home-v14-qa-v1').replaceAll('qa-v13-game.html','qa-v14-game.html').replaceAll('V13比較','V14確認').replaceAll('HomeV13QA','HomeV14QA');
page=page.replace('<option value="qa-v14-game.html">V14確認</option>','<option value="qa-v14-game.html">V14確認</option><option value="qa-v14-baseline.html">V13修正前</option>');
const controls=[['short','短文 Hey!'],['medium','中程度'],['long','長文'],['english','英語'],['pet','主役の会話'],['companion','仲間の会話'],['partner','恋人の会話'],['growth','成長49%'],['energy','げんき+2'],['ambient','環境イベント'],['reward','重要報酬'],['both','会話と通知'],['font0','文字13px'],['font5','文字+5%'],['font10','文字+10%'],['fontFinal','採用14px'],['sleepBefore12','v12頭部位置再構成'],['sleepBefore13','v13頭部位置再構成'],['sleepAfter','v14頭部位置'],['hidden','会話を隠す'],['result','返答のみ'],['resultBoth','返答と長文'],['resultShort','返答と短文'],['measure','寸法計測']];
page=page.replace('<pre id="qaMetrics"','<nav>'+controls.map(([action,label])=>'<button data-action="'+action+'">'+label+'</button>').join('')+'<button id="matrix">表示マトリクス検証</button></nav><pre id="qaMetrics"');
page=page.replace("b.dataset.action==='metrics'","['metrics','measure'].includes(b.dataset.action)");
const matrix=`
 document.getElementById('matrix').onclick=async()=>{
 const frame=document.getElementById('game'),rows=[],errors=[],next=()=>new Promise(r=>setTimeout(r,100));
 for(const [w,h]of [[320,844],[375,844],[390,844],[430,844],[320,568]]){frame.style.width=w+'px';frame.style.height=h+'px';await next();
 for(const role of ['pet','companion','partner'])for(const text of ['short','medium','long','english']){const api=frame.contentWindow.HomeV14QA;api[role]();await next();api[text]();const m=api.measure();rows.push({role,sampleText:text,...m});const s=m.speech,a=m.stage;
 if(s.x<a.x-1||s.right>a.right+1||s.y<a.y-1||s.bottom>a.bottom+1)errors.push({w,h,role,text,reason:'stage overflow'});
 if(text==='short'&&m.text.height>25)errors.push({w,h,role,text,reason:'short wraps'});
 if(m.cast!==28)errors.push({w,h,role,text,reason:'cast missing'});
 }}
 const report={rows,errors};document.getElementById('qaMetrics').textContent=JSON.stringify(report,null,2);const link=document.createElement('a');link.textContent='検証JSONを保存';link.download='v14-layout-matrix.json';link.href=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));document.getElementById('matrix').after(link);
 };
`;
page=page.replace('start();\n</script>',matrix+'start();\n</script>');fs.writeFileSync(path.join(out,'v14-qa.html'),page);
let landing=fs.readFileSync(path.join(out,'index.html'),'utf8').replace('HOME PILOT V13','HOME PILOT V14').replace('href="v13-qa.html"','href="v14-qa.html"').replace('主役を中心とした配置と、画面下側まで使う活動領域を整えたversion 13です。睡眠中のZzzは本体の向きに合わせて反転しません。','頭から浮かぶZzz、簡潔なお知らせ、文章に合う吹き出しへ整えたversion 14です。');fs.writeFileSync(path.join(out,'index.html'),landing);
console.log('V14 private QA ready; production and normal trial save families unchanged.');
