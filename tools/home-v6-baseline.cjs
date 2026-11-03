const {scopeConversation}=require('./home-ab-storage.cjs');
exports.baselineFiles=read=>{
 const files={},stem='qa-home-v6-baseline';
 let html=read('qa-v22-game.html').replaceAll('naotocchi-art25d-baseline-v1','naotocchi-home-v6-baseline-v1').replaceAll('qa-v22-script.js',stem+'-script.js');
 files[stem+'-script.js']=read('qa-v22-script.js').replaceAll('naotocchi-art25d-baseline-v1','naotocchi-home-v6-baseline-v1');
 for(const n of ['conversation-director','conversation-away']){const name='home-v6-baseline-'+n+'.js';files[name]=scopeConversation(read(n+'.js'),'play').replaceAll('naotocchi-home-ab-play:','naotocchi-home-v6-baseline:');html=html.replaceAll(n+'.js',name);}
 files[stem+'-game.html']=html;
 return files;
};
