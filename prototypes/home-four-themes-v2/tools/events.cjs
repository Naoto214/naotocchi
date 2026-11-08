const fs=require('node:fs'),path=require('node:path');
const {THEMES}=require('../../home-four-themes-v1/selection.js');
const songs=require('../../main-theme-20261108/songs.js');
require('../../main-theme-v2-20261108/engine-v2.js');
const engine=global.NAOTOCCHI_THEME_ENGINE_V2;
function arrange(theme,version){
 const s=theme.song, original=engine.buildEvents(s,'piano'), flat=songs.flatten(s), period=original.duration-1.2;
 const events=original.events.filter(e=>e.mel).map(e=>({...e,t:e.t+.05,instrument:version==='B'&&theme.slot==='morning'?'flute':'piano',pan:0,role:'melody',vel:e.vel*.83}));
 const spb=60/s.bpm;
 if(version==='A')for(const e of original.events.filter(e=>!e.mel))events.push({...e,t:e.t+.05,instrument:'piano',pan:-.14,role:'accompaniment',vel:e.vel*.8});
 for(let r=0;r<s.repeats;r++){
  let prev=null;
  for(const c of flat.chords){
   const off=r*flat.beats+c.beat,v=engine.voicing(c.chord,prev);prev=v;
   const bass=40+((c.chord.bass-40)%12+12)%12;
   const add=(beat,midi,dur,vel,instrument,pan,role='accompaniment')=>events.push({t:(off+beat)*spb+.05,midi,dur:dur*spb,vel,instrument,pan,role,mel:false});
   if(version==='A'){
    // One quiet answering note per harmony; no new foreground tune.
    if(c.dur>=3)add(c.dur-1,v[v.length-1]+12,.65,.025,theme.slot==='day'?'marimba':'harp',.25);
    continue;
   }
   add(0,bass,Math.min(c.dur,2)*.9,.105,theme.slot==='day'?'cello':'piano',-.08);
   const inst=theme.slot==='day'?'marimba':'harp';
   const step=theme.slot==='night'?1:0.5;
   const pat=[v[0],v[1],v[2]||v[0]+12,v[1]];
   for(let b=0,k=0;b<c.dur;b+=step,k++)add(b,pat[k%4],step*.88,theme.slot==='night'?.035:.05,inst,.28);
   if(theme.slot==='evening'||theme.slot==='night')for(const n of v)add(0,n,c.dur*.96,theme.slot==='night'?.014:.023,'strings',-.3);
   if(theme.slot==='morning')for(const n of v)add(0,n,c.dur*.9,.016,'piano',-.25);
   // Chord-tone answer in a genuine gap in the lead, at alternate phrase endings.
   const end=c.beat+c.dur, sounding=flat.notes.some(n=>n.beat<end&&n.beat+n.dur>end-1);
   if(!sounding&&Math.floor(c.beat/s.meter)%2===1)add(c.dur-1,v.at(-1)+12,.8,.045,theme.slot==='day'?'piano':'flute',-.25,'answer');
   if(theme.slot==='night'&&Math.floor(c.beat/s.meter)%2===0)add(0,v.at(-1)+12,1.8,.027,'bell',.2);
  }
 }
 return {id:theme.id,slot:theme.slot,title:theme.title,version,bpm:s.bpm,meter:s.meter,period,duration:period+1.2,events:events.sort((a,b)=>a.t-b.t),originalMelody:original.events.filter(e=>e.mel).map(e=>({midi:e.midi,t:e.t+.05,dur:e.dur}))};
}
if(require.main===module){const out=path.resolve(__dirname,'../scores.json');fs.writeFileSync(out,JSON.stringify(THEMES.flatMap(t=>['A','B'].map(v=>arrange(t,v))),null,2));console.log(out);}
module.exports={arrange};
