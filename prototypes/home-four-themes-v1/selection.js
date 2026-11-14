(function(root){
 'use strict';
 const F=typeof module==='object'&&module.exports?require('../main-theme-favorites-20261108/favorites.js'):root.NAOTOCCHI_FAVORITES;
 const entry=(id,title,slot,label,hours)=>Object.freeze({id,title,slot,label,hours,song:F.FAVORITES.find(f=>f.id===id).song});
 const THEMES=Object.freeze([
  entry('soyokaze','そよかぜのまど','morning','朝','05:00–09:59'),
  entry('current','いつものにわ','day','昼','10:00–15:59'),
  entry('starlake','ほしふるみずうみ','evening','夕','16:00–18:59'),
  entry('hoshizora','ほしぞらのやくそく','night','夜','19:00–04:59')
 ]);
 const DEFERRED=Object.freeze([entry('kisetsu','きせつのきおく'),entry('ohayo','おはようのひかり')]);
 function slotAt(minutes){minutes=((minutes%1440)+1440)%1440;return minutes<300||minutes>=1140?'night':minutes<600?'morning':minutes<960?'day':'evening';}
 function nextSlot(slot,sequence,loop){if(!sequence)return loop?slot:null;const i=THEMES.findIndex(t=>t.slot===slot);return THEMES[i+1]?.slot||(loop?'morning':null);}
 const api={THEMES,DEFERRED,slotAt,nextSlot};if(typeof module==='object'&&module.exports)module.exports=api;root.HomeThemes=api;
})(globalThis);
