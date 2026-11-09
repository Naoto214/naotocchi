// Source pitches, onsets and durations are read directly from the owner-approved catalog.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..'),REPO=path.resolve(ROOT,'../..');
const D=require('../../bgm-complete-v3-20261109/design.js');
require('../../main-theme-v2-20261108/engine-v2.js');
const E=global.NAOTOCCHI_THEME_ENGINE_V2;
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const write=(name,v)=>fs.writeFileSync(path.join(ROOT,name),JSON.stringify(v,null,2)+'\n');
// Family: lead, broken-chord instrument, bass, pad, pulse, sparkle, mastering target.
const profiles={
 poyo:['marimba','harp','piano',.012,'none',.014,-26],
 koro:['piano','marimba','pizz',.012,'light',.012,-23],
 card:['piano','marimba','pizz',.021,'pulse',.008,-24],
 action:['marimba','piano','pizz',.009,'light',.006,-24],
 explore:['flute','marimba','pizz',.017,'none',.015,-25],
 love:['piano','harp','cello',.018,'none',.009,-24],
 celebrate:['piano','harp','pizz',.025,'light',.022,-23],
 memory:['piano','harp','cello',.019,'none',.012,-24],
 quick:['marimba','piano','pizz',.008,'pulse',.005,-24],
 race:['piano','marimba','pizz',.019,'race',.008,-24],
 farewell:['piano','harp','cello',.010,'none',0,-25],
 puzzle:['flute','harp','pizz',.010,'none',.006,-27],
 sports:['marimba','piano','pizz',.008,'light',.010,-24],
 flight:['flute','harp','cello',.022,'none',.032,-24],
 board:['piano','marimba','pizz',.008,'none',.004,-27],
 fishing:['piano','harp','cello',.012,'none',.015,-27],
 sleep:['harp','piano','cello',.006,'none',.007,-31],
 hatch:['trumpet','piano','pizz',.018,'fanfare',.025,-19]
};
const families={'poyo-1':'poyo','var-poyo-clear':'poyo','var-poyo-chapter':'poyo','koro-1':'koro','var-koro-goal':'koro','var-koro-album':'koro','card-2':'card','var-card-late':'card','var-card-win':'card','game-1':'action','explore-1':'explore','event-2':'love','event-1':'celebrate',kisetsu:'memory',ohayo:'celebrate','bgm-game':'quick','bgm-race':'race','bgm-farewell':'farewell','poyo-2':'puzzle','game-2':'sports','explore-2':'flight','var-flight':'flight','board-b':'board','fishing-a':'fishing','lullaby-a':'sleep','jingle-achieve':'celebrate','jingle-card-lose':'card','var-ohayo-hatch2':'hatch'};
function arrange(id){
 const song=D.SONGS[id].song,flat=D.flatten(song),family=families[id],p=[...profiles[family]],spb=60/song.bpm;
 const loop=song.kind!=='jingle',leadIn=family==='hatch'?.35:0,period=flat.beats*spb*song.repeats;
 if(id==='var-koro-album'){p[1]='harp';p[4]='none';p[6]=-25;}
 if(id==='var-poyo-chapter'){p[0]='piano';p[3]=.022;p[6]=-25;}
 if(id==='jingle-card-lose'){p[4]='none';p[3]=.008;p[6]=-24;}
 const events=[];
 const add=(beat,midi,dur,vel,instrument,pan=0,role='accompaniment')=>events.push({t:leadIn+beat*spb,midi,dur:dur*spb,vel,instrument,pan,role});
 for(let r=0;r<song.repeats;r++){
  const off=r*flat.beats;
  for(const n of flat.notes){
   const bar=Math.floor(n.beat/song.meter),phrase=1+.055*Math.sin((bar%8)/7*Math.PI),accent=n.beat%song.meter===0?1:n.beat%1===0?.91:.85;
   add(off+n.beat,n.midi,n.dur*.96,.28*accent*phrase,p[0],0,'melody');
   if(family==='hatch')add(off+n.beat,n.midi+12,n.dur*.96,.065,'bell',.16,'doubling');
  }
  let prev=null;
  for(const c of flat.chords){
   const v=E.voicing(c.chord,prev);prev=v;const b=off+c.beat,bar=Math.floor(c.beat/song.meter),bass=40+((c.chord.bass-40)%12+12)%12;
   const sparse=['sleep','farewell','fishing'].includes(family),step=sparse?2:family==='flight'?1:family==='hatch'?.5:1;
   add(b,bass,Math.min(c.dur,2)*.90,sparse?.055:.095,p[2],-.07);
   if(!sparse&&c.dur>=4)add(b+2,bass,1.7,.065,p[2],-.07);
   const pattern=[v[0],v[1],v.at(-1),v[1]];
   for(let k=0;k*step<c.dur;k++){
    const at=k*step;
    add(b+at,pattern[k%4],Math.min(step*.86,c.dur-at),sparse?.027:.045,p[1],.22);
    if(['card','race','celebrate','hatch'].includes(family)&&at%2===0)
     for(const m of v)add(b+at,m,Math.min(.75,c.dur-at),family==='hatch'?.044:.024,'piano',-.20);
   }
   // Quiet sustained chord tones leave the foreground tune untouched.
   for(const m of v.slice(-3))add(b,m,c.dur*.94,p[3]*(r%2?.88:1),'strings',-.24);
   if(p[5]&&bar%2===0){const m=v.at(-1)+12;add(b+(sparse?0:.5),m,Math.min(1.4,c.dur*.7),p[5],'bell',.25);}
   if(family==='flight'&&bar%4===3){
    for(let k=0;k<4;k++)add(b+c.dur-1+k*.25,v[k%v.length]+12,.7,.023,'harp',-.24+k*.14,'sparkle');
   }
   if(family==='hatch')for(let k=0;k<c.dur*2;k++){for(const m of v)add(b+k*.5,m,.32,.035,'trumpet',-.15);add(b+k*.5,v[k%v.length]+24,.32,.018,'bell',.3);}
  }
  if(p[4]!=='none')for(let beat=0;beat<flat.beats;beat++){
   const inbar=beat%song.meter,offbeat=p[4]==='race';
   if(inbar===0||(inbar===2&&song.meter===4))add(off+beat,36,.15,p[4]==='light'?.04:.055,'kick',0,'percussion');
   if(inbar===1||(inbar===3&&song.meter===4))add(off+beat,38,.12,.022,'snare',.1,'percussion');
   if(offbeat||inbar%2===1)add(off+beat+.5,42,.07,.010,'shaker',-.2,'percussion');
  }
 }
 if(family==='hatch'){
  events.push({t:0,midi:0,dur:.20,vel:.09,instrument:'shell',pan:0,role:'percussion'});
  for(const m of [51,58,63,67,70,75])add(flat.beats,m,3.5,.065,'trumpet',-.08,'cadence');
  add(flat.beats,39,2,.12,'timpani',0,'percussion');add(0,39,1.5,.10,'timpani',0,'percussion');
  add(flat.beats,49,4,.035,'cymbal',.05,'percussion');
  [63,67,70,75,79,82,87].forEach((m,k)=>add(flat.beats+.3+k*.10,m,.8,.024,'harp',-.2+k*.06,'cadence'));
 }
 return {id,title:D.SONGS[id].title,family,bpm:song.bpm,meter:song.meter,repeats:song.repeats,bars:song.bars.length,loop,leadIn,period,duration:period+leadIn+(loop?0:family==='hatch'?2.4:1.2),targetLUFS:p[6],events:events.sort((a,b)=>a.t-b.t),note:'主旋律の音高・開始時刻・音価を固定。自然な離鍵は譜面音価の96%。'};
}
if(require.main===module){
 const source=D.ADOPTED.map(id=>({id,title:D.SONGS[id].title,song:D.SONGS[id].song,flat:D.flatten(D.SONGS[id].song),status:D.STATUS[id],uses:D.TABLE.filter(r=>r.songs.includes(id)).map(r=>({game:r.game,scene:r.scene})),source:D.SONGS[id].source}));
 write('source.json',source);write('placement.json',D.TABLE.map((r,i)=>({rowId:`scene-${String(i+1).padStart(2,'0')}`,...r})));
 write('scores.json',D.ADOPTED.filter(id=>!id.startsWith('home-')).map(arrange));
 const paths=Object.keys(require.cache).filter(p=>p.startsWith(REPO)&&!p.startsWith(ROOT));
 for(const dir of ['bgm-complete-v3-20261109','bgm-survey-20261108','main-theme-favorites-20261108']){const p=path.join(REPO,'prototypes',dir,'midi');if(fs.existsSync(p))for(const n of fs.readdirSync(p))paths.push(path.join(p,n));}
 paths.push(path.join(REPO,'docs/bgm-complete-v3-20261109/README.md'));
 write('source-lock.json',{pr534:'3060388f624deb7787d0f23006595493caecbfdc',pr530:'12411ea5df21d357678749335773571c13252688',files:[...new Set(paths)].sort().map(p=>({path:path.relative(REPO,p),sha256:hash(fs.readFileSync(p))}))});
 console.log('32 sources, 50 placements, 28 new arrangements exported.');
}
module.exports={arrange};
