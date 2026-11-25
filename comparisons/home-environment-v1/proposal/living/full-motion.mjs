// Repaint only feathered fragments sampled from the currently decoded artwork.
// No asset export, geometry mutation or whole-painting displacement.
import {drawFullRegion} from './other-regions.mjs';

const TAU=Math.PI*2;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const positivePhase=(t,period)=>((t%period)+period)%period;
const softPulse=(t,centre,half)=>{
  const d=Math.abs(t-centre)/half;
  return d>=1?0:Math.cos(d*Math.PI/2)**2;
};
const profiles={D1:[1.15,.22],D2:[.86,1.24],D3:[1.07,.83]};
export function fullProfile(variant,strength=1){
  const p=profiles[variant]||[0,0],gain=clamp(Number.isFinite(strength)?strength:1,0,2);
  return {physical:p[0]*gain,magic:p[1]*gain};
}
const fronts=[[13,4.6,.72],[57,7.5,1],[108,6.7,.83],[173,8.4,1],[213,5.8,.72]];
export function forestWind(seconds){
  const t=positivePhase(seconds,239);
  const gust=fronts.reduce((sum,[c,w,a])=>sum+softPulse(t,c,w)*a,0);
  // A slow wind front bends the branches, followed by a short spring-back.
  const breath=.25*Math.sin(seconds*.67)+.19*Math.sin(seconds*1.23+.7);
  return {gust,bend:breath+gust*(1.2+.35*Math.sin(seconds*2.1)),light:.55+.19*Math.sin(seconds*.47)+gust*.24};
}
const specs=[
  // u, v, crop width/height, pivot (local fraction), flexibility
  [.38,.100,.20,.14,.15,.21,.95], [.65,.077,.17,.13,.85,.12,1.12],
  [.75,.182,.19,.13,.94,.23,.93], [.48,.224,.12,.096,.12,.7,1.18],
  [.23,.323,.16,.13,.13,.79,.89], [.55,.338,.17,.12,.64,.87,.58],
  [.83,.382,.17,.12,.97,.7,.81], [.39,.438,.13,.115,.28,.93,.49],
  [.68,.416,.12,.10,.81,.93,.42], [.111,.656,.16,.08,.5,.94,.48],
  [.84,.776,.17,.072,.55,.95,.57], [.35,.88,.14,.095,.38,.95,.48]
];
export const forestMasks=specs.map(([u,v,w,h,px,py,flex])=>({u,v,w,h,px,py,flex}));
const fragmentCache=new WeakMap();
function fragments(image){
  if(fragmentCache.has(image))return fragmentCache.get(image);
  if(!image.naturalWidth&&!image.width)return [];
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
  const list=forestMasks.map(m=>{
    const el=document.createElement('canvas');
    el.width=Math.ceil(iw*m.w);el.height=Math.ceil(ih*m.h);
    const p=el.getContext('2d');
    p.drawImage(image,(m.u-m.w/2)*iw,(m.v-m.h/2)*ih,m.w*iw,m.h*ih,0,0,el.width,el.height);
    p.globalCompositeOperation='destination-in';
    p.scale(el.width/2,el.height/2);
    const g=p.createRadialGradient(1,1,.05,1,1,1);
    g.addColorStop(0,'#fff');g.addColorStop(.46,'#fff');g.addColorStop(.77,'rgba(255,255,255,.65)');g.addColorStop(1,'transparent');
    p.fillStyle=g;p.fillRect(0,0,2,2);
    return el;
  });
  fragmentCache.set(image,list);return list;
}
function sway(ctx,s,wind){
  if(!s.image||!s.effects.motion||s.reduced)return;
  fragments(s.image).forEach((fragment,i)=>{
    const m=forestMasks[i],w=m.w*1000,h=m.h*1500;
    // Propagation delay and independent resonances prevent synchronized billboarding.
    const breeze=wind.bend+.24*Math.sin(s.seconds*(1.1+.018*i)-m.u*3.3+i*.29);
    const a=breeze*.038*s.physical*m.flex;
    ctx.save();
    ctx.translate(1000*(m.u-m.w/2)+w*m.px,1500*(m.v-m.h/2)+h*m.py);
    ctx.rotate(a);
    ctx.transform(1,0,Math.sin(a)*.23,1,0,0);
    ctx.globalAlpha=s.opacity;
    ctx.drawImage(fragment,-w*m.px,-h*m.py,w,h);
    ctx.restore();
  });
}
function softEllipse(ctx,x,y,w,h,rgb,alpha,angle=0){
  if(alpha<.001)return;
  ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(w,h);
  const g=ctx.createRadialGradient(0,0,0,0,0,1);
  g.addColorStop(0,'rgba('+rgb+',1)');g.addColorStop(.48,'rgba('+rgb+',.67)');g.addColorStop(1,'rgba('+rgb+',0)');
  ctx.globalAlpha=Math.min(alpha,1);ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
}
function lightThroughTrees(ctx,s,wind){
  const night=s.time==='night',evening=s.time==='evening',morning=s.time==='morning';
  const direct=s.weather==='sunny',silver=night||s.season==='winter';
  const sun=silver?'190,219,250':evening?'255,189,76':morning?'255,225,150':'247,250,178';
  const cloud=direct?1:s.weather==='cloudy'?.29:.14;
  const a=s.opacity*s.physical*cloud*(night?.35:1);
  const front=wind.bend;
  // Shafts rotate about openings in the left crown; the lawn patches follow the same front.
  const shafts=[[.19,.13,.39,.57,15],[.245,.16,.57,.62,24],[.332,.09,.66,.575,12],[.28,.235,.70,.675,19]];
  if(s.effects.shafts!==false)for(let i=0;i<shafts.length;i++){
    const [u,v,endU,endV,w]=shafts[i],dx=(endU-u)*1000+front*(7+i*2),dy=(endV-v)*1500;
    const spread=1+.1*Math.sin(s.seconds*.61+i);
    softEllipse(ctx,u*1000+dx*.55,v*1500+dy*.55,Math.hypot(dx,dy)*.51,w*spread,sun,
      a*(.115+s.magic*.11)*(.74+.26*Math.sin(s.seconds*.61+i)),Math.atan2(dy,dx));
  }
  // Dust catches a shaft in a travelling band when the crown opens in a gust.
  // At the D2 peak, pale gold and mint alternate along a shaft; D1 stays neutral.
  if(s.effects.magic!==false && s.effects.shafts!==false && direct && !night && !s.reduced){
    const bloom=wind.gust*wind.gust*s.magic;
    // A few bright seeds travel down the sunbeam even between fronts. Their
    // cores stay small at handset scale while nearby leaves retain contrast.
    const fairy=clamp((s.magic-.26)/.98,0,1.3);
    if(fairy>.05 && s.effects.particles){
      const n=Math.ceil(4+fairy*7);
      for(let i=0;i<n;i++){
        const z=positivePhase(s.seconds*(.052+.016*hash(i))+hash(i+125),1);
        const life=Math.sin(z*Math.PI)**1.4;
        const x=228+375*z+Math.sin(s.seconds*.77+i*3.73)*15+(hash(i+19)-.5)*108;
        const y=220+600*z+26*Math.sin(z*TAU+i);
        const alpha=s.opacity*life*fairy*(.55+.28*wind.gust);
        softEllipse(ctx,x,y,11+5*bloom,7+3*bloom,'255,208,97',alpha,-.53);
        ctx.save();ctx.translate(x,y);ctx.rotate(-.7+.32*Math.sin(s.seconds+i));
        ctx.globalAlpha=Math.min(1,alpha);ctx.fillStyle='#fff5c0';
        ctx.beginPath();ctx.ellipse(0,0,4.1,1.65,0,0,TAU);ctx.fill();
        ctx.restore();
      }
    }
    if(bloom>.07){
      const flow=positivePhase(s.seconds*.18,1);
      for(let i=0;i<13;i++){
        const z=(i+flow)/13, arch=Math.sin(z*Math.PI);
        const x=320+350*z+15*Math.sin(z*TAU+s.seconds*.85);
        const y=265+565*z+6*Math.sin(z*TAU*1.5+s.seconds*.5);
        const alpha=s.opacity*Math.min(.64,bloom*.42)*arch;
        softEllipse(ctx,x,y,49,11+7*arch,i%3===0?'220,249,198':sun,alpha*.86,1.02);
        if(i%3!==0)softEllipse(ctx,x+8*Math.sin(i+s.seconds),y+4,2.2,5.5,'255,247,200',alpha,1.02);
      }
    }
  }
  if(s.effects.ground===false)return;
  for(let i=0;i<10;i++){
    const col=i%5,row=i<5?0:1;
    const x=85+col*166+row*55+front*(8+col*3),y=858+col*23+row*128;
    const angle=evening?.26:morning?.21:.08;
    softEllipse(ctx,x,y,36+col*5,7+row*4,sun,a*(.25+.20*wind.light),angle);
    softEllipse(ctx,x+9,y+16,46+col*5,7+row*5,'39,58,59',a*.20,angle);
  }
}
const hash=i=>{const n=Math.sin((i+11)*45.269)*37122.531;return n-Math.floor(n)};
function forestAir(ctx,s,wind){
  if(s.reduced||!s.effects.particles)return;
  const wet=s.weather==='rain',snow=s.weather==='snow';
  const seasonal=s.season==='spring'||s.season==='autumn';
  const firefly=!wet&&!snow&&s.season==='summer'&&['evening','night'].includes(s.time);
  const pollen=!wet&&!snow&&!seasonal&&!firefly;
  const magicMoment=softPulse(positivePhase(s.seconds,113),29,4.5)+softPulse(positivePhase(s.seconds,113),87,7);
  const magic=s.magic*(s.effects.magic===false?0:1);
  const physical=s.physical;
  const count=firefly?Math.ceil(4+magic*10):wet?Math.ceil(12+physical*10):snow?Math.ceil(10+physical*8):pollen?Math.ceil(3+magic*5):Math.ceil(7+physical*4);
  for(let i=0;i<count;i++){
    const depth=s.effects.depth===false?.58:.28+.72*hash(i+81);
    const flight=positivePhase(s.seconds*(wet?.46+.34*depth:snow?.054+.039*depth:.032+.032*depth)+hash(i),1);
    const drift=Math.sin(s.seconds*(.35+.31*depth)+i*1.7);
    // During a front, neighbouring leaves gather briefly in the same moving current.
    const lane=wind.gust*(wet||snow?.05:.22);
    let x=(75+hash(i+5)*800)*(1-lane)+lane*(390+150*Math.sin(s.seconds*.34))
       +drift*(wet?6:18)*depth+wind.bend*(22+38*wind.gust)*depth,y;
    if(firefly||pollen){
      x+=Math.sin(s.seconds*.23+i*2.8)*16*depth;
      y=(firefly?638:358)+hash(i+4)*(firefly?320:530)+14*Math.cos(s.seconds*.39+i);
      const pulse=(.5-.5*Math.cos(s.seconds*(.62+depth*.77)+i*3.01))**1.7;
      const alpha=s.opacity*pulse*(firefly?.62+.14*magic:.19)*depth;
      if(firefly){
        softEllipse(ctx,x,y,6+depth*(6+magic*4),7+depth*(5+magic*4),'221,249,137',alpha);
        if(magicMoment*magic>.20){
          softEllipse(ctx,x,y,2.8,7+magicMoment*6,'255,239,155',alpha*magicMoment*.58);
          softEllipse(ctx,x,y,8,1.8,'255,239,155',alpha*magicMoment*.58);
        }
      }
      ctx.fillStyle=firefly?'#fff8b2':'#fff5ba';ctx.globalAlpha=Math.min(alpha*.97,1);ctx.beginPath();ctx.arc(x,y,.8+depth*2.2,0,TAU);ctx.fill();
    }else{
      y=(wet||snow?45:165)+flight*(wet||snow?1370:815);
      const alpha=Math.min(1,flight*9,(1-flight)*7)*s.opacity*(.30+depth*.54);
      ctx.save();ctx.translate(x,y);ctx.globalAlpha=alpha;
      if(wet){
        ctx.strokeStyle='#e3f2ff';ctx.lineWidth=.8+depth;
        ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(3+wind.bend*3,10+depth*13);ctx.stroke();
      }else if(snow){
        ctx.fillStyle='#f9fcff';ctx.beginPath();ctx.arc(0,0,1.2+depth*3,0,TAU);ctx.fill();
      }else{
        ctx.rotate(flight*TAU*(1+depth)+i+wind.bend*.42);
        ctx.scale(.62+depth,Math.max(.25,Math.abs(Math.sin(flight*TAU+i)))*(.62+depth));
        ctx.fillStyle=s.season==='spring'?(i%2?'#ffd4d8':'#ffebde'):(i%2?'#c67834':'#eaa64c');
        ctx.beginPath();ctx.moveTo(-4,0);ctx.quadraticCurveTo(-1,-6,5,-2);ctx.quadraticCurveTo(3,5,-4,0);ctx.fill();
      }
      ctx.restore();
    }
  }
}
export function drawFullMotion(ctx,state){
  const {width,height,variant}=state;
  if(!profiles[variant]||!(width>0&&height>0))return;
  const opacity=clamp(state.opacity??1,0,1),strength=clamp(state.strength??1,0,2);
  if(!opacity||!strength)return;
  const effects={water:true,light:true,particles:true,contact:true,motion:true,...state.effects};
  const seconds=state.reduced?0:(Number.isFinite(state.seconds)?state.seconds:0);
  const wind=forestWind(seconds);
  if(state.reduced||effects.gusts===false){wind.gust=0;wind.bend=state.reduced?0:.25*Math.sin(seconds*.67);}
  const s={...state,effects,seconds,opacity:opacity*Math.min(strength,1),strength,...fullProfile(variant,strength),gust:wind.gust};
  if(effects.magic===false)s.magic=0;
  ctx.save();ctx.scale(width/1000,height/1500);
  try{
    if(s.region==='forest'){
      if(effects.canopy!==false)sway(ctx,s,wind);
      if(effects.light)lightThroughTrees(ctx,s,wind);
      forestAir(ctx,s,wind);
    }else drawFullRegion(ctx,s);
  }finally{ctx.restore();}
}
