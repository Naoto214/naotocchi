const vm=require('node:vm');
// Consume the same development fixture provider as the saved browser runner.
module.exports=function createCases(){
 let html;require('../../tests/visual-qa.cjs')().configureServer({middlewares:{use(_p,h){h({},{setHeader(){},end(v){html=v;}});}}});
 const source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 const fixtures=vm.runInNewContext(source.slice(0,source.indexOf('const mount='))+'\nfixtures');
 const copy=(id='forest_bear',value=50,density='pair')=>JSON.parse(JSON.stringify(fixtures[`relationship_${id}_${value}_${density}`]));
 const cases=[];
 for(const [id,name] of [['forest_bear','クマ'],['rock_octopus','タコ']])for(const [face,label] of [['normal','ふつう'],['positive','うれしい'],['lonely','さみしい']]){
  cases.push({id:id+'-'+face,label:name+'：'+label,mode:face==='positive'?'held':'static',save:copy(id,face==='lonely'?20:50),hint:name==='クマ'?'顔全体の表情差と、恋人の位置を確認してください。':'顔と腕の主要な形、恋人の位置を確認してください。微細な吸盤の読め方は判定対象外です。'});
 }
 const dense=copy('forest_bear',50,'dense');dense.companions.forEach((c,i)=>c.bond=i%3===0?20:60);
 cases.push({id:'dense',label:'なかま：たくさん',mode:'static',save:dense,hint:'26体中9体がさみしい状態です。混在時の配置・重なり・情報量を確認してください。'});
 cases.push({id:'ordinary',label:'じゃれる：通常',mode:'play',save:copy('forest_bear',50,'dense'),hint:'実Homeの「じゃれる」を1回押すと代表1体だけ喜び、2.5秒後にふつうへ戻ります。'});
 const single=copy();single.companions=[{id:'otter',bond:20},{id:'clock',bond:60},{id:'cat_friend',bond:60}];
 cases.push({id:'single-rescue',label:'じゃれる：ひとり救済',mode:'play',save:single,hint:'カワウソ20→50。じゃれる1回で、さみしい→うれしい→ふつう。他の2体はふつうです。'});
 const multi=copy();multi.companions=[{id:'otter',bond:20},{id:'clock',bond:25},{id:'cat_friend',bond:60}];
 cases.push({id:'multi-rescue',label:'じゃれる：複数救済',mode:'play',save:multi,hint:'カワウソ20→50・とけい25→55の両方が喜びます。ねこ60→90は救済対象外。2.5秒後は全員ふつうです。'});
 cases.push({id:'return-lonely',label:'うれしい後：さみしいへ',mode:'return',save:copy('forest_bear',20),hint:'関係値20のクマへQA用Reactionだけを与えます。喜んだ後、2.5秒で現在値からさみしい表情へ戻ります。'});
 cases.push({id:'home',label:'通常Home',mode:'static',save:copy('forest_bear',50,'dense'),hint:'メイン・恋人・26体のなかま・会話・ボタンを確認してください。通常操作は、このページ内の使い捨てデータだけに作用します。'});
 const rescueAll=copy('forest_bear',50,'dense');rescueAll.companions.forEach(c=>c.bond=20);
 cases.push({id:'dense-rescue',label:'じゃれる：26体救済比較',mode:'play',save:rescueAll,hint:'26体全員が救済されます。ハート「各対象／代表のみ」を切り替え、動きと情報密度を比較してください。'});
 for(const c of cases){c.save.savedAt=0;Object.assign(c.save.lifetime,{timeMode:'day',weatherMode:'sunny',seasonMode:'summer'});}
 return cases;
};
