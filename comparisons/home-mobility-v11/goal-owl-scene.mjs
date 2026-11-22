// The recorded 320px game supplied the opening feet, sizes, artwork, camera
// and legal bounds. Collision, visibility, route selection and steps run live.
import {createRecoveredNavigation} from '../game/home-recovered-navigation-finish.mjs';
import {extendVisibleGroundNavigation} from '../game/home-visible-ground-navigation-finish.mjs';
import {insidePolygon} from '../game/home-art-navigation-finish.mjs';
import {selectRecoveredScene} from '../game/home-production-manifest.mjs';

function forest(config){
  const art=selectRecoveredScene('forest');
  const {stage,rect,p,host,cover,stableGrid,addVisible}=config.nav;
  const ground=createRecoveredNavigation(art,host,stage,{stableGrid,expandCity:stableGrid});
  const nav=addVisible?extendVisibleGroundNavigation(ground,{spec:art,stage:rect,presentation:p,cover}):ground;
  const {x:sx,y:sy}=nav.intentScale;
  const shapes=art.foreground.map(poly=>poly.map(([u,v])=>[
    p.x+(cover.left+cover.width*u-p.x)/sx-rect.left,
    p.y+(cover.top+cover.height*v-p.y)/sy-rect.top,
  ]));
  const roster=new Map(config.actors.map(a=>[a.key,a]));
  let seating=true;
  const sees=(actor,point)=>[-.3,0,.3].every(x=>[.22,.5,.8].every(y=>
    shapes.every(poly=>!insidePolygon(point.x+x*actor.w,point.y-y*actor.h,poly))));
  const scene={...config.scene,region:'forest',time:'day',weather:'sunny',
    navigation:{...nav,initialPoint:i=>config.actors[i]},
    actorBounds:a=>roster.get(a.key).bounds,referenceBounds:a=>roster.get(a.key).reference,
    planVisibility:a=>point=>sees(a,point),
    visible:(q,a)=>seating?Math.hypot(q.x-roster.get(a.key).x,q.y-roster.get(a.key).y)<1e-7:sees(a,q)};
  return {scene,placed(){seating=false;}};
}
export function matchesForestCamera(view,config){
  if(!view)return false;
  const {p,rect}=config.nav;
  const expected=[p.x+(rect.left-p.x)*p.scaleX,p.y+(rect.top-p.y)*p.scaleY];
  return Math.abs(view.scale[0]-p.scaleX)<.005 && Math.abs(view.scale[1]-p.scaleY)<.005 &&
    Math.hypot(...view.stage.map((v,i)=>v-expected[i]))<.09;
}
export function restoreOwl(win,config,witness) {
  let seed=214;
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  const cast='companion:owl';
  let arrival=null;
  const model=win.NaotocchiHomeDioramaModel.createModel({random,onEvent:event=>{
    if(event.type==='arrive'&&event.actor?.key===cast&&event.source==='ambient')arrival=event;
  }});
  const {scene,placed}=forest(config);
  model.sync(config.actors,scene);
  placed();
  let before=null,accepted=null;
  win.OwlReplayCapture={
    before(p,clock){
      if(before || Math.hypot(p.x-witness.before.request[0],p.y-witness.before.request[1])>1e-6)throw Error('Recorded request mismatch');
      before=model.snapshot();
      const table=new Map(witness.before.cast.map(([key,x,y,w,h])=>[key,[x,y,w,h]]));
      if(before.length!==28 || before.some(a=>!table.get(a.key)?.every((v,i)=>Math.abs(v-[a.x,a.y,a.w,a.h][i])<1e-6)))
        throw Error('Different feet in native movement model at '+clock);
    },
    result(value){accepted=value;}
  };
  try{for(let i=0;i<40;i++)model.step(.05);}
  finally{delete win.OwlReplayCapture;}
  if(!before||accepted===null)throw Error('The recorded request did not occur');
  const poses=new Map(before.map(a=>[a.key,a]));
  const displayStart={snapshot:()=>before,selected:()=>null};
  const initial=win.OwlReplayPaint.show(displayStart);
  const error=Math.max(...initial.feet.map(([key,x,y])=>poses.has(key)?Math.hypot(x-poses.get(key).x,y-poses.get(key).y):Infinity));
  if(initial.feet.length!==28 || !(error<.001))throw Error('森の描画が記録と一致しません。('+initial.feet.length+'体、誤差'+error+'px)');
  if(!matchesForestCamera(initial,config))throw Error('森のカメラが記録位置と一致しません。');
  let ticks=0;
  return {initial,accepted,
    next(){
      if(ticks>0)model.step(.05);
      ticks++;
      const painted=win.OwlReplayPaint.show(model);
      const current=model.snapshot().find(a=>a.key===cast);
      const origin=poses.get(cast);
      const distance=Math.hypot((current.x-origin.x)*initial.scale[0],(current.y-origin.y)*initial.scale[1]);
      return {painted,foot:[current.x,current.y],arrived:arrival!==null,distance};
    }
  };
}
