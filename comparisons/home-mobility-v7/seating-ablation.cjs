// Independent startup-scoring arms for the V6 seating ablation.
// This process writes candidate model bytes to stdout. The game never imports it.
function localSeats(source){
  const state='const manualGoals=new Map();', hook='      if(!actor(selected))selected=null;';
  if(![state,hook].every(key=>source.split(key).length===2))throw Error('Unrecognized V6 model');
  return source.replace(state,'let initialSeatsSettled=false;'+state).replace(hook,`
      // Only the first stable projection in the unopened home may score seats.
      // The incumbent cast was placed by the standard native V6 solver.
      if(!initialSeatsSettled&&scene.navigation?.intentScale&&!changed&&arrange===false){
        initialSeatsSettled=true;
        if(clock===0&&!selected&&actors.length>=20){
          const nav=scene.navigation,sc=nav.intentScale;
          const count=mask=>{let n=0;for(;mask;mask&=mask-1)n++;return n;};
          const canMove=(who,start,end,other,at)=>contactSegmentSafe(start,end,at,(who.w+other.w)*.5+10,(who.h+other.h)*.38+10);
          const cast=actors.map(a=>({x:a.x,y:a.y})),boxes=actors.map(a=>bounds(a,scene));
          function sectors(i,from,positions){
            const a=actors[i],box=boxes[i];let mask=0;
            for(let j=0;j<16;j++){
              const angle=j*Math.PI/8,end={x:from.x+8*Math.cos(angle)/sc.x,y:from.y+8*Math.sin(angle)/sc.y};
              if(end.x<box.left||end.x>box.right||end.y<box.top||end.y>box.bottom)continue;
              if(!actors.every((b,k)=>k===i||canMove(a,from,end,b,positions[k])))continue;
              if(nav.segmentSafe(from,end,p=>visible(a,p)))mask|=1<<j;
            }
            return mask;
          }
          const sectorsBefore=cast.map((p,i)=>sectors(i,p,cast));
          let winner=null;
          for(let i=0;i<actors.length;i++){
            const a=actors[i],box=boxes[i],start=cast[i];if(a.kind!=='companion')continue;
            // This is a window on the same eight-unit lattice, anchored at the
            // same actor bounds as the original candidate generation above.
            const fromX=Math.max(0,Math.floor((start.x-16/sc.x-box.left)/8)),fromY=Math.max(0,Math.floor((start.y-16/sc.y-box.top)/8));
            for(let gy=fromY;box.top+8*gy<=Math.min(box.bottom+7,start.y+16/sc.y+7);gy++){
              for(let gx=fromX;box.left+8*gx<=Math.min(box.right+7,start.x+16/sc.x+7);gx++){
                const to=limit(a,{x:box.left+8*gx,y:box.top+8*gy},scene),dist=Math.hypot((start.x-to.x)*sc.x,(start.y-to.y)*sc.y);
                if(dist<.01||dist>16||!actors.every((b,k)=>k===i||canMove(a,start,to,b,cast[k])))continue;
                if(!nav.segmentSafe(start,to,p=>visible(a,p)))continue;
                const positions=cast.slice();positions[i]=to;let opened=0,gain=0,preserve=true;
                for(let k=0;k<actors.length;k++){
                  const b=actors[k];
                  if(k!==i&&(Math.abs(b.x-to.x)>(a.w+b.w)*.5+10+24/sc.x||Math.abs(b.y-to.y)>(a.h+b.h)*.38+10+24/sc.y))continue;
                  const previous=sectorsBefore[k],next=sectors(k,positions[k],positions);
                  if(previous&~next){preserve=false;break;}
                  if(!previous&&next)opened++;gain+=count(next&~previous);
                }
                if(preserve&&opened&&(!winner||opened>winner.opened||opened===winner.opened&&(gain>winner.gain||gain===winner.gain&&dist<winner.dist)))winner={a,to,opened,gain,dist};
              }
            }
          }
          if(winner)Object.assign(winner.a,winner.to);
        }
      }
`+hook);
}

// Standalone experiment. Returns a new source string; only the first native opening
// and original V6 legal candidates participate. Later syncs execute original code.
function fallbackSeats(source,options={}){
 const budget=options.budget??.015,radius=options.radius??14,network=options.network??true;
 const anchor='allowed.sort((p,q)=>overlap(p)-overlap(q)||p.d-q.d);best=allowed[0];';
 if(source.split(anchor).length!==2)throw Error('unexpected native seating source');
 const initial='const manualGoals=new Map();'; const phase='const previousScene=scene,previousActors=actors;';
 if(!options.initialOnly)source=source.replace(initial,'let openingFit=true;'+initial).replace(phase, phase+'if(scene.navigation&&next.navigation&&!changed)openingFit=false;');
 return source.replace(anchor,anchor+`
            // Among close, nearly equivalent crowded fallback seats, check the
            // short exits for the new resident and its nearest already seated peers.
            if(best&&${options.initialOnly?'!previousScene.navigation':'openingFit'}&&actors.length>=20){
              const initial=best,base=overlap(initial);
              const near=allowed.filter(p=>Math.hypot(p.x-initial.x,p.y-initial.y)<=${radius} && overlap(p)<=base+${budget});
              const scale=scene.navigation.intentScale||{x:1,y:1};
              function exits(resident,at,others){
                const box=bounds(resident,scene);
                let count=0;
                for(let j=0;j<12;j++){
                  const t=j*Math.PI/6,to={x:at.x+8*Math.cos(t)/(scale.x||1),y:at.y+8*Math.sin(t)/(scale.y||1)};
                  if(to.x<box.left||to.x>box.right||to.y<box.top||to.y>box.bottom)continue;
                  if(!others.every(o=>contactSegmentSafe(at,to,o,(resident.w+o.w)*.5+10,(resident.h+o.h)*.38+10)))continue;
                  if(scene.navigation.segmentSafe(at,to,p=>visible(resident,p)))count++;
                }
                return count;
              }
              function exitScore(p){
                const moving={...a,x:p.x,y:p.y},count=exits(a,p,seated);
                let result=2*Math.min(count,4)+count;
                if(${network})for(const resident of seated){
                  if(Math.hypot(resident.x-${options.initialOnly?'p':'initial'}.x,resident.y-${options.initialOnly?'p':'initial'}.y)>Math.max(resident.w+a.w,resident.h+a.h)+12)continue;
                  const own=exits(resident,resident,[moving,...seated.filter(o=>o!==resident)]);
                  result+=2*Math.min(own,4)+own;
                }
                return result;
              }
              let high=exitScore(initial);
              for(const p of near){const v=exitScore(p);if(v>high){high=v;best=p;}}
            }`);
}

const {readNative}=require('../home-drag-v6/native-source.cjs');
const variants={
  original:null,
  local:localSeats,
  conservative:s=>fallbackSeats(s,{budget:.015,radius:14,network:true,initialOnly:true}),
  network035:s=>fallbackSeats(s,{budget:.035,radius:13,network:true}),
  network065:s=>fallbackSeats(s,{budget:.065,radius:13,network:true}),
  individual035:s=>fallbackSeats(s,{budget:.035,radius:13,network:false}),
};
if(require.main===module){
  const label=process.argv[2],model=readNative('home-production-model.js');
  if(!(label in variants))throw Error('Expected one of '+Object.keys(variants).join(', '));
  process.stdout.write(variants[label]?variants[label](model):model);
}
module.exports={variants};
