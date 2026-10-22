(function(root,factory){const d=typeof module==='object'&&module.exports?require('./individuality-data.js'):root.NaotocchiIndividualityData;const api=factory(d);if(typeof module==='object'&&module.exports)module.exports=api;else root.NaotocchiIndividuality=api;})(globalThis,(data)=>{
 'use strict';
 const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const ids=(a,max=6)=>Array.isArray(a)?[...new Set(a.filter(x=>typeof x==='string'&&x.length>0&&x.length<=120))].slice(0,max):[];
 const validId=x=>typeof x==='string'&&x.length>0&&x.length<=120;
 const heartKeys=Object.keys(data.hearts);
 const emptyPref=seed=>({scores:seed?{[seed]:2}:{},counts:{},seen:[],current:null,challenger:null,confirmations:0,history:[]});
 function draw(bias,rng){let n=Math.min(.999999,Math.max(0,rng()))*100;const p=data.distributions[bias]||data.distributions[0];for(let i=0;i<5;i++){n-=p[i];if(n<0)return i+1;}return 5;}
 function create(species,regions,rng=Math.random,lifeId){
  const temperament={};for(const key of Object.keys(data.temperaments))temperament[key]=draw(data.biases[species]?.[key]||0,rng);
  const pick=a=>a.length?a[Math.min(a.length-1,Math.floor(rng()*a.length))]:null;
  return {v:1,lifeId:lifeId||`life-${Date.now().toString(36)}-${Math.floor(rng()*0xffffffff).toString(36)}`,temperament,natural:Object.fromEntries(heartKeys.map(h=>[h,[[],[],[]]])),events:{},introducedAge:0,preferences:{place:emptyPref(pick(regions)),game:emptyPref(pick(Object.keys(data.games)))},lastCompanion:null,lastExchangeAge:-1};
 }
 function normalize(raw,{species,regions,age=0}={}){
  // Deterministic repair: loading never draws a new temperament. Legacy lives start at center.
  const fresh=create(species,regions||[],()=>.5,`legacy-${species||'egg'}-${Math.floor(age)}`);
  fresh.temperament=Object.fromEntries(Object.keys(data.temperaments).map(k=>[k,3]));
  fresh.preferences={place:emptyPref(null),game:emptyPref(null)};
  if(!object(raw)){fresh.introducedAge=Math.max(0,Math.floor(age));return fresh;}
  const s=fresh;s.lifeId=validId(raw.lifeId)?raw.lifeId:fresh.lifeId;
  s.introducedAge=Number.isFinite(raw.introducedAge)?Math.max(0,Math.min(100,Math.floor(raw.introducedAge))):Math.floor(age);
  for(const k of Object.keys(data.temperaments))if(Number.isInteger(raw.temperament?.[k])&&raw.temperament[k]>=1&&raw.temperament[k]<=5)s.temperament[k]=raw.temperament[k];
  for(const h of heartKeys)s.natural[h]=[0,1,2].map(c=>ids(raw.natural?.[h]?.[c]));
  for(const e of data.events){const r=raw.events?.[e.age];if(r?.status==='pending')s.events[e.age]={status:'pending'};else if(r?.status==='chosen'&&e.choices.some(c=>c.heart===r.heart))s.events[e.age]={status:'chosen',heart:r.heart};}
  for(const kind of ['place','game']){
   const r=raw.preferences?.[kind];if(!object(r))continue;const p=s.preferences[kind];
   const allowed=k=>validId(k)&&(kind==='place'?(regions||[]).includes(k)||['star_stop','memory_lake'].includes(k):Object.hasOwn(data.games,k));
   for(const [k,v] of Object.entries(object(r.scores)?r.scores:{}))if(allowed(k)&&Number.isFinite(v)&&v>=0)p.scores[k]=Math.min(30,v);
   for(const [k,v] of Object.entries(object(r.counts)?r.counts:{}))if(allowed(k)&&Number.isFinite(v)&&v>=0)p.counts[k]=Math.min(1000,Math.floor(v));
   p.seen=ids(r.seen,3000);
   p.current=allowed(r.current)&&(p.counts[r.current]||0)>=3?r.current:null;
   p.challenger=allowed(r.challenger)?r.challenger:null;p.confirmations=p.challenger&&r.confirmations===1?1:0;
   p.history=Array.isArray(r.history)?r.history.filter(x=>object(x)&&allowed(x.to)&&validId(x.experience)).slice(-8).map(x=>({to:x.to,experience:x.experience})):[];
  }
  s.lastCompanion=validId(raw.lastCompanion)?raw.lastCompanion:null;s.lastExchangeAge=Number.isFinite(raw.lastExchangeAge)?raw.lastExchangeAge:-1;
  return s;
 }
 function points(s,h){if(!heartKeys.includes(h))return 0;const natural=[0,1,2].reduce((n,c)=>n+ids(s?.natural?.[h]?.[c]).length*4,0);const chosen=data.events.filter(e=>s?.events?.[e.age]?.status==='chosen'&&s.events[e.age].heart===h).length;return natural+Math.min(20,chosen*4);}
 function stars(n){return n>=60?5:n>=36?4:n>=20?3:n>=8?2:1;}
 function experience(s,{lifeId,heart,category,id,ended=false,quick=false}){
  if(!s||ended||quick||lifeId!==s.lifeId||!heartKeys.includes(heart)||![0,1,2].includes(category)||!validId(id))return false;
  const a=s.natural[heart][category];if(a.includes(id)||a.length>=6)return false;a.push(id);return true;
 }
 function queue(s,previous,age){if(!s)return;for(const e of data.events)if(e.age>Math.max(previous,s.introducedAge)&&e.age<=age&&!s.events[e.age])s.events[e.age]={status:'pending'};}
 function pending(s){return data.events.filter(e=>s?.events?.[e.age]?.status==='pending');}
 function choose(s,age,heart,lifeId){const e=data.events.find(e=>e.age===age);if(!s||lifeId!==s.lifeId||s.events[age]?.status!=='pending'||!e?.choices.some(c=>c.heart===heart))return false;s.events[age]={status:'chosen',heart};return true;}
 function prefer(s,kind,target,id,impressive=false){
  const p=s?.preferences?.[kind];if(!p||!validId(id)||!validId(target)||p.seen.includes(id)||p.seen.length>=3000||(kind==='game'&&!Object.hasOwn(data.games,target)))return false;
  p.seen.push(id);for(const k of Object.keys(p.scores))p.scores[k]=Math.round(p.scores[k]*.9*1e6)/1e6;
  p.scores[target]=(p.scores[target]||0)+2+(impressive?1:0);p.counts[target]=Math.min(1000,(p.counts[target]||0)+1);
  const candidates=Object.keys(p.scores).filter(k=>p.counts[k]>=3&&p.scores[k]>=6).sort((a,b)=>p.scores[b]-p.scores[a]||a.localeCompare(b));
  const best=candidates[0];let change=false;
  if(!p.current&&best){p.current=best;change=true;}
  else if(best&&best!==p.current&&p.scores[best]>=(p.scores[p.current]||0)+3){
   p.confirmations=p.challenger===best?p.confirmations+1:1;p.challenger=best;if(p.confirmations>=2){p.current=best;change=true;}
  }else{p.challenger=null;p.confirmations=0;}
  if(change){p.history.push({to:p.current,experience:id});p.history=p.history.slice(-8);p.challenger=null;p.confirmations=0;}
  return change;
 }
 function summary(s){return {temperament:{...s?.temperament},hearts:Object.fromEntries(heartKeys.map(h=>[h,stars(points(s,h))])),place:s?.preferences?.place?.current||null,game:s?.preferences?.game?.current||null};}
 return {data,draw,create,normalize,experience,points,stars,queue,pending,choose,prefer,summary};
});
