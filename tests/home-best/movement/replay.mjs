import {createTerrainNavigation} from '../../../home-route-navigation.mjs';

export const cases = {
  open: {points:[[40,36]], goal:[70,36]},
  corner: {points:[[42,65]], goal:[61,47.8], cell:8,
    box:{left:4,right:104,top:4,bottom:90},
    walkable:({x,y})=>!(x>50&&x<67&&y<49)&&!(x>52&&x<66&&y>51&&y<90)},
  partial16: {points:[[32,36]], goal:[112,36], walkable:p=>p.x<=49},
  partial28: {points:[[32,36]], goal:[112,36], walkable:p=>p.x<=61},
  idlePeer: {points:[[40,36],[60,36],[120,36]], goal:[52,36]},
  manualPeer: {points:[[40,36],[60,36],[120,36]], goal:[52,36], protectedPeer:true},
  deadEnd: {points:[[40,36],[60,36]], goal:[52,36], box:{left:30,right:60,top:36,bottom:36}},
  island: {points:[[40,36]], goal:[50,36], walkable:p=>p.x<=40||p.x>=49},
  movingPeer: {points:[[40,36],[60,36],[120,36]], goal:[52,36], movePeer:true}
};

export function replay(createModel, scenario, pointerDrop=true) {
  const {points,goal,walkable=()=>true,box={left:0,right:150,top:36,bottom:36},cell=4}=scenario;
  // The same terrain oracle and grid are supplied to every archived model.
  const navigation=createTerrainNavigation({width:160,height:100,cell,gridOrigin:{x:0,y:0},
    project:p=>p,unproject:p=>({...p,z:p.y}),walkable,
    segmentWalkable:(a,b)=>{
      const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*4));
      for(let i=0;i<=n;i++)if(!walkable({x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n}))return false;
      return true;
    }});
  navigation.intentAware=true;
  navigation.intentScale={x:1,y:1};
  const model=createModel({random:()=>.5}),people=points.map(([x,y],i)=>({key:String(i),kind:i?'companion':'pet',x,y,w:10,h:10}));
  let seating=true;
  model.sync(people,{region:'forest',width:160,height:100,navigation,actorBounds:()=>box,
    visible:(p,a)=>!seating||(p.x===people[a.key].x&&p.y===people[a.key].y)});
  seating=false;
  if(scenario.protectedPeer)model.select('1');
  model.select('0');
  const accepted=model.move('0',{x:goal[0],y:goal[1]},'drag',{pointerDrop});
  let prior=model.snapshot(),terrain=0,contact=0;
  for(let tick=0;tick<260;tick++){
    if(tick===30&&scenario.movePeer)model.move('1',{x:96,y:36},'keyboard');
    model.step(.05,{autonomy:false});
    const next=model.snapshot();
    next.forEach((end,i)=>{
      const start=prior[i];
      if(start.x===end.x&&start.y===end.y)return;
      if(!navigation.segmentSafe(start,end))terrain++;
      next.forEach((_,j)=>{
        if(i===j)return;
        const peer=j<i?next[j]:prior[j],x=(start.x-peer.x)/20,y=(start.y-peer.y)/17.6;
        const dx=(end.x-start.x)/20,dy=(end.y-start.y)/17.6,dot=x*dx+y*dy;
        const t=Math.min(1,Math.max(0,-dot/(dx*dx+dy*dy)));
        if(Math.hypot(x,y)<1-1e-8?dot<0:Math.hypot(x+t*dx,y+t*dy)<1-1e-8)contact++;
      });
    });
    prior=next;
  }
  return {accepted,feet:prior.map(a=>[a.x,a.y].map(v=>+v.toFixed(4))),terrain,contact};
}
