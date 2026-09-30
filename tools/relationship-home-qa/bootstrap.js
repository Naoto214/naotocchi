(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 else document.addEventListener('DOMContentLoaded',()=>api.boot(root,document),{once:true});
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 function memoryStorage(initial={}){
  const data=new Map(Object.entries(initial));
  return {getItem(k){return data.get(String(k))??null;},setItem(k,v){data.set(String(k),String(v));},removeItem(k){data.delete(String(k));},clear(){data.clear();},key(i){return [...data.keys()][i]??null;},get length(){return data.size;}};
 }
 function installStorage(w,save){
  const local=memoryStorage({'naotocchi-save-v1':JSON.stringify(save)}),session=memoryStorage();
  try {
   for(const [name,value] of [['localStorage',local],['sessionStorage',session]])Object.defineProperty(w,name,{value,configurable:false,writable:false});
   if(w.localStorage!==local||w.sessionStorage!==session)throw Error('replacement mismatch');
  }catch(e){throw Error('Storage isolation failed: '+e.message);}
 }
 async function start(w,config,activate){
  installStorage(w,config.save);
  return activate();
 }
 async function preloadImages(w,config){
  const actors=config.save.companions.map(c=>({id:c.id,folder:'companions'}));
  if(config.save.partner)actors.push({id:config.save.partner.id,folder:'partners'});
  await Promise.all(actors.flatMap(({id,folder})=>[
   `assets/characters/${folder}/${id}.png`,
   `assets/characters/relationship/${id}/positive.png`,
   `assets/characters/relationship/${id}/lonely.png`,
  ]).map(async src=>{const img=new w.Image();img.src=src;try{await img.decode();}catch{throw Error('画像の読み込み失敗: '+src);}}));
 }
 async function activateScripts(doc){
  for(const old of doc.querySelectorAll('script[type="application/x-relationship-qa"]')){
   const script=doc.createElement('script');
   for(const a of old.attributes)if(a.name!=='type')script.setAttribute(a.name,a.value);
   if(old.hasAttribute('src')){
    script.async=false;
    await new Promise((resolve,reject)=>{script.onload=resolve;script.onerror=()=>reject(Error('読み込み失敗: '+old.getAttribute('src')));doc.body.appendChild(script);});
   }else {script.textContent=old.textContent;doc.body.appendChild(script);}
  }
 }
 async function boot(w,doc){
  try{
   const cases=JSON.parse(doc.getElementById('qa-cases').textContent),requested=new URLSearchParams(w.location.search).get('case');
   const config=cases.find(c=>c.id===requested)||cases[0];config.save.savedAt=0;
   await start(w,config,async()=>{
    // Freeze only autonomous growth. Preserve Home animation, timeouts and the
    // production Reaction duration. No production source file is edited.
    const interval=w.setInterval.bind(w);w.setInterval=(fn,ms,...args)=>fn.name==='loop'&&ms===3000?0:interval(fn,ms,...args);
    await preloadImages(w,config);
    await activateScripts(doc);
    if(!w.__relationshipQaBridge||!w.__naotocchiBooted)throw Error('Home起動を確認できません');
    w.relationshipQa=w.installRelationshipQa(w.__relationshipQaBridge,config,w);
    // Direct Home play uses the same controlled QA draw as the outside button.
    // Only transition cases are intercepted; normal Home remains interactive.
    if(config.mode==='play'){
     const button=doc.getElementById('playWithBtn');
     button.addEventListener('click',e=>{if(w.relationshipQa.running)return;e.stopImmediatePropagation();e.preventDefault();w.relationshipQa.run();},true);
    }
    w.addEventListener('pagehide',()=>w.relationshipQa.stop(),{once:true});
    await Promise.all([...doc.querySelectorAll('#castStage img.character-asset')].map(img=>img.decode()));
    w.parent.postMessage({type:'relationship-qa-ready',id:config.id},w.location.origin);
   });
  }catch(e){
   w.relationshipQa?.stop();
   doc.body.replaceChildren();const p=doc.createElement('p');p.textContent='QAを停止しました。'+e.message+' 通常saveは使用しません。';doc.body.appendChild(p);
   w.parent.postMessage({type:'relationship-qa-error',message:e.message},w.location.origin);
  }
 }
 return {memoryStorage,installStorage,start,preloadImages,activateScripts,boot};
});
