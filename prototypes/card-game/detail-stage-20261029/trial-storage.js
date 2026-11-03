// 比較試遊版の保存領域を本番と分ける。全ての localStorage の鍵に接頭辞を付ける（本番の保存は読まない・書かない）。
(()=>{const P='naotocchi-detail-stage-trial:',S=Storage.prototype,{getItem:g,setItem:s,removeItem:r}=S;
 S.getItem=function(k){return g.call(this,P+k);};S.setItem=function(k,v){return s.call(this,P+k,v);};S.removeItem=function(k){return r.call(this,P+k);};})();
