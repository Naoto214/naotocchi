// Legal pointers derived only from rendered canvas and public trial start time.
// No formal score, RNG, timing, physics, or hidden state is modified.
export const QUICK_ADDITIONS_V7=Object.freeze(['knock','wait','spin','sneak','rhythm']);
export function createQuickCpuV7(gameId,difficulty,random){
 const easy=difficulty==='easy';
 let trial=null,next=0,held=false,angle=0,point=null,rate=0,previous=new Map(),fired=new Set(),delay=0;
 return ({frame,current,visible=[],send})=>{
  if(!current)return;
  const emit=(type,x,y)=>send({type,x,y});
  const tap=(x,y)=>{emit('pointerdown',x,y);emit('pointerup',x,y);};
  if(trial!==current.startedAt){
   trial=current.startedAt;next=frame+(easy?28:15)+Math.floor(random()*(easy?24:12));
   held=false;angle=0;point=null;previous=new Map();fired=new Set();
   rate=gameId==='spin'?(easy?.022+random()*.035:.045+random()*.035):(.38+random()*(easy?.85:.55));
   delay=easy?7+Math.floor(random()*10):2+Math.floor(random()*5);
  }
  // Abstention is the official objective. All100 and tied first are valid.
  if(gameId==='wait')return;
  const text=visible.filter(p=>p.kind==='text');
  if(gameId==='rhythm'){
   const line=visible.find(p=>p.kind==='stroke'&&p.stroke==='#ffffff'&&p.width===3&&p.path.length===2);
   const y=line?.path[0]?.y;
   if(!Number.isFinite(y))return;
   const notes=text.filter(p=>p.text==='🎵'&&p.y>=0);
   for(const note of notes){
    const last=previous.get(note.x),entry={y:note.y,frame,due:last?.due};
    previous.set(note.x,entry);
    if(frame<next||!last||fired.has(note.x))continue;
    const speed=(note.y-last.y)/(frame-last.frame);
    const anticipate=y-speed*(easy?8:4);
    // A reaction window can open while the CPU is still thinking. Do not
    // require a one-frame crossing that was invisible during that delay.
    if(!entry.due&&speed>0&&note.y>=anticipate)entry.due=frame+delay;
    if(entry.due&&frame>=entry.due){tap(note.x,y);next=frame+12;fired.add(note.x);}
   }
   return;
  }
  if(frame<next)return;
  if(gameId==='knock'){
   const counter=text.find(p=>/^\d+／\d+$/.test(p.text));
   if(!counter)return;
   const [count,needed]=counter.text.split('／').map(Number);
   if(count<needed){tap(counter.x,150);next=frame+(easy?32:18)+Math.floor(random()*12);}
  }else if(gameId==='spin'){
   const ring=visible.flatMap(p=>p.kind==='stroke'&&p.width===10?p.path:[]).find(p=>p.kind==='arc'&&p.r===90);
   if(!ring)return;
   angle+=rate;
   point={x:ring.x+70*Math.cos(angle),y:ring.y+70*Math.sin(angle)};
   emit(held?'pointermove':'pointerdown',point.x,point.y);held=true;
  }else if(gameId==='sneak'){
   const bed=text.find(p=>p.text==='🛏️'),sleeper=text.find(p=>p.text==='💤');
   if(!bed||!sleeper)return;
   // The sleeper marker is drawn 26px right and 30px above the character.
   const me={x:sleeper.x-26,y:sleeper.y+30};
   if(!held){point=me;emit('pointerdown',point.x,point.y);held=true;return;}
   const dx=bed.x-me.x,dy=bed.y-me.y,distance=Math.hypot(dx,dy);
   if(distance<24){emit('pointerup',point.x,point.y);held=false;next=Infinity;return;}
   const step=Math.min(distance,rate*1000/60);
   point={x:point.x+dx/distance*step,y:point.y+dy/distance*step};
   emit('pointermove',point.x,point.y);
  }
 };
}
