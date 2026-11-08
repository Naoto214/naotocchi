/* Generated home document only. The production entry point never loads this. */
(function(){
 'use strict';
 // No reading or writing of either production or preview persisted game saves.
 const memory=new Map();const storage={getItem:k=>memory.has(String(k))?memory.get(String(k)):null,setItem:(k,v)=>memory.set(String(k),String(v)),removeItem:k=>memory.delete(String(k)),clear:()=>memory.clear(),key:i=>[...memory.keys()][i]??null,get length(){return memory.size}};
 Object.defineProperty(window,'localStorage',{configurable:true,value:storage});
 Object.defineProperty(window,'sessionStorage',{configurable:true,value:storage});
 window.NaotocchiDaypartsQA={region:'home',time:'morning',weather:'sunny',season:'spring'};
})();
