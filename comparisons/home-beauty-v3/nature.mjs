// Coordinates are fractions of the complete 1024 × 1536 painting, before cover cropping.
// Masks sit slightly inside all four painted shorelines to keep moving crests off the bank.
const masks = {
  sea: [[.01,.244],[.99,.244],[.99,.33],[.89,.35],[.88,.39],[.97,.41],[.97,.49],[.87,.50],[.82,.56],[.61,.585],[.4,.582],[.21,.57],[.12,.55],[.02,.56],[.02,.48],[.18,.46],[.22,.41],[.17,.39],[.06,.39],[.07,.34],[.22,.33],[.22,.306],[.01,.304]],
  memory_lake: [[.095,.333],[.24,.327],[.43,.315],[.59,.313],[.70,.325],[.82,.33],[.89,.348],[.86,.427],[.79,.477],[.57,.474],[.38,.456],[.20,.446],[.096,.429]]
};
export const waterMask = region => masks[region] || [];
// The tide line is lower on the right. The rocky margins are deliberately excluded.
export function inContactWater(region,x,y) {
  if(region!=='sea'||!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1)return false;
  const bank = .588 + .026*x + .008*Math.sin(9*x);
  return y>=.46 && y<=bank && (x>.18||y>.525) && (x<.87||y>.535);
}
const TAU = Math.PI*2;
const modes = {A:{count:5,gain:.6},B:{count:11,gain:1},C:{count:13,gain:1.08}};
const fract=x=>x-Math.floor(x);
const seed=i=>fract(Math.sin((i+1)*37.137)*43758.5453);
const beat=(s)=>.5-.5*Math.cos(s);
function masked(ctx,vertices,paint) {
  ctx.save();ctx.beginPath();
  vertices.forEach(([x,y],i)=> i ? ctx.lineTo(x*1000,y*1500):ctx.moveTo(x*1000,y*1500));
  ctx.closePath();ctx.clip();paint();ctx.restore();
}
function oval(ctx,x,y,rx,ry,rgba,alpha,rotation=0) {
  ctx.globalAlpha=alpha;ctx.fillStyle=rgba;ctx.beginPath();
  ctx.ellipse(x,y,rx,ry,rotation,0,TAU);ctx.fill();
}
function halo(ctx,x,y,rx,ry,color,alpha) {
  ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
  const g=ctx.createRadialGradient(0,0,0,0,0,1);
  g.addColorStop(0,'rgba('+color+',1)');g.addColorStop(.42,'rgba('+color+',.45)');g.addColorStop(1,'rgba('+color+',0)');
  oval(ctx,0,0,1,1,g,alpha);ctx.restore();
}
function star(ctx,x,y,r,color,alpha) {
  ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();
  ctx.moveTo(x,y-r);ctx.quadraticCurveTo(x+1,y-1,x+r*.7,y);
  ctx.quadraticCurveTo(x+1,y+1,x,y+r);ctx.quadraticCurveTo(x-1,y+1,x-r*.7,y);
  ctx.quadraticCurveTo(x-1,y-1,x,y-r);ctx.fill();
}
function ripple(ctx,x,y,rx,ry,color,alpha) {
  ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=1.8;ctx.beginPath();
  ctx.ellipse(x,y,rx,ry,0,.12,Math.PI*.86);ctx.stroke();
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,Math.PI*1.12,Math.PI*1.84);ctx.stroke();
}
function water(ctx,s) {
  const sea=s.region==='sea',lake=!sea;
  const hue=s.time==='evening'?'#ffe6a4':s.time==='night'?'#d8dfff':'#efffff';
  const shadowed= !lake && ['rain','snow','cloudy'].includes(s.weather);
  masked(ctx,masks[s.region],()=>{
    for(let i=0;i<s.count*2;i++){
      const phase=fract(s.seconds*(sea?.105:.048)+seed(i+29));
      const x=120+750*seed(i)+(phase-.5)*(sea?34:8);
      const z=lake?.337+.122*seed(i+51):.252+.315*seed(i+51);
      const y=1500*z+Math.sin(s.seconds*.52+i)*2;
      const strength=Math.sin(phase*Math.PI)**2*s.gain;
      if(lake || (s.weather==='rain'&&i%2===0)){
        ripple(ctx,x,y,3+phase*(lake?20:13),1+phase*4,hue,strength*.53);
      }else{
        ctx.strokeStyle=hue;ctx.globalAlpha=strength*(shadowed?.30:.72);ctx.lineWidth=2.2;
        const breadth=11+seed(i+90)*42;
        ctx.beginPath();ctx.moveTo(x-breadth,y);ctx.quadraticCurveTo(x-breadth*.3,y+4,x,y+1);
        ctx.quadraticCurveTo(x+breadth*.5,y-2,x+breadth,y);ctx.stroke();
      }
    }
    if(shadowed)return;
    // Existing sun/moon paths: sea at right in evening/night, lake near the middle.
    const axis=lake?(s.time==='evening'?.59:.61):({morning:.15,day:.68,evening:.76,night:.65}[s.time]??.62);
    for(let i=0;i<s.count;i++){
      const phase=beat(s.seconds*.95+i*2.4);
      const x=axis*1000+Math.sin(i*13.25)*(15+2*i),y=(lake?.332:.245)*1500+i*(lake?12:18);
      oval(ctx,x,y,3+phase*(4+i*.65),1.1,hue,phase*.62*s.gain);
      if(i%3===0 && phase>.74){
        const flare=(phase-.74)/.26;
        halo(ctx,x,y,12+8*s.special,6+5*s.special,lake?'191,224,255':'255,226,159',flare*.32*s.gain);
        star(ctx,x,y,2+flare*(5+7*s.special),hue,flare*.85*s.gain);
      }
    }
  });
}
const lamps={
  snow:[[.919,.319],[.92,.378],[.739,.422]],
  city:[[.122,.147],[.185,.396],[.325,.49],[.568,.507],[.7,.508],[.963,.403]]
};
function lamplight(ctx,s){
  if(!['evening','night'].includes(s.time))return;
  const city=s.region==='city';
  lamps[s.region].forEach(([u,v],i)=>{
    // Breathing is deliberately slow enough to read as steady warm glass.
    const a=(.19+.09*beat(s.seconds*.46+i)+.09*s.special)*s.gain;
    halo(ctx,u*1000,v*1500,city?26:17,city?34:14,'255,190,92',a);
  });
  if(city){
    const wet=s.weather==='rain';
    [[.36,.587],[.56,.672],[.76,.627],[.91,.714]].forEach(([x,y],i)=>{
      halo(ctx,1000*x,1500*y,wet?17:10,wet?65:38,'255,181,89',(.16+.13*beat(s.seconds*.6+i)+.13*s.special)*s.gain);
    });
  }
}
function woodland(ctx,s) {
  if(s.time==='night'||s.weather!=='sunny')return;
  const evening=s.time==='evening',color=evening?'255,196,84':'255,247,175';
  const patches=[[.195,.573],[.285,.597],[.435,.635],[.59,.665],[.702,.705],[.82,.739]];
  if(s.time==='day')patches.splice(0,2);
  patches.forEach(([x,y],i)=>{
    ctx.save();ctx.translate(x*1000+Math.sin(.62*s.seconds+i)*4,y*1500);
    ctx.rotate(.15+Math.sin(i)*.04);
    halo(ctx,0,0,33+i*3,10,color,(.21+.30*beat(s.seconds*.76+i)+.12*s.special) * s.gain);ctx.restore();
  });
  // Small changing highlights within the painted canopy, away from the central gap.
  [[.18,.12],[.12,.34],[.81,.17],[.87,.25],[.71,.13]].forEach(([x,y],i)=>{
    const wave=beat(s.seconds*.69+i);
    oval(ctx,x*1000+wave*2,y*1500,5,1.7,'#cde99d',wave*.28*s.gain,-.7+wave*.24);
  });
}
function fireflies(ctx,s,lake){
  for(let i=0;i<s.count;i++){
    const x=(lake?140:75)+seed(i)*740+12*Math.sin(s.seconds*.24+i),
          y=(lake?520:690)+seed(i+7)*(lake?110:220)+11*Math.cos(s.seconds*.31+i*5);
    const a=Math.pow(beat(s.seconds*.86+i*3.7),1.8)*s.gain;
    halo(ctx,x,y,15+4*s.special,15+4*s.special,lake?'178,209,255':'215,245,115',a*.68);
    if(i%3===0)halo(ctx,x-4,y+2,8,3,lake?'198,232,255':'233,255,168',a*.34);
    oval(ctx,x,y,2.9,2.9,lake?'#f3e5ff':'#fff3a7',a*.9);
    if(s.special>.05&&i%3===0)star(ctx,x,y,8,'#fff4d8',s.special*a);
  }
}
function falling(ctx,s,kind) {
  const rain=kind==='rain',snow=kind==='snow';
  const color=rain?'#deedfa':snow?'#fffdff':kind==='spring'?'#ffcfdb':'#eeb65c';
  for(let i=0;i<s.count*(rain?2:1);i++){
    const phase=fract(s.seconds*(rain?.42:snow?.060:.046)+seed(i+12));
    const x=seed(i+22)*1000+(rain?phase*38:Math.sin(phase*TAU+i)*24);
    const y=phase*(rain?1300:snow?1240:690)+(rain||snow?0:130);
    const a=Math.min(1,phase*8,(1-phase)*7)*s.gain;
    if(rain){
      ctx.strokeStyle=color;ctx.globalAlpha=a*.48;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+3,y+19);ctx.stroke();
    }else{
      const r=2+seed(i+18)*2.6;
      oval(ctx,x,y,snow?r:r*1.7,snow?r:1.2+r*.55*Math.abs(Math.sin(phase*TAU)),color,a*.85,phase*TAU+i);
    }
  }
}
export function drawNature(ctx,state) {
  const mode=modes[state.variant], fx=state.effects||{};
  if(!mode||(!fx.water&&!fx.light&&!fx.particles)||!(state.width>0&&state.height>0))return;
  const seconds=state.reduced?1.2:state.seconds;
  const moment=fract((seconds+7)/37);
  const special=state.variant==='C'&&!state.reduced&&moment<.20?Math.sin(Math.PI*moment/.20)**2:0;
  const opacity=Math.max(0,Math.min(1,state.opacity ?? 1));
  if(!opacity)return;
  const s={...state,...mode,gain:mode.gain*opacity,seconds,special};
  ctx.save();ctx.scale(s.width/1000,s.height/1500);
  if(fx.water&&masks[s.region])water(ctx,s);
  if(fx.light){
    if(s.region==='forest')woodland(ctx,s);
    if(lamps[s.region])lamplight(ctx,s);
    if(s.region==='snow'&&s.weather==='sunny'){
      for(let i=0;i<s.count;i++){
        const a=Math.pow(beat(seconds*.94+i*3.8),5);
        star(ctx,120+seed(i)*790,830+seed(i+11)*510,2+a*(4+special*5),'#ffffff',s.gain*a*.8);
      }
    }
  }
  if(fx.particles&&!state.reduced){
    if(s.region==='memory_lake')fireflies(ctx,s,true);
    else if(s.weather==='rain'||s.weather==='snow')falling(ctx,s,s.weather);
    else if(s.region==='forest'){
      if(['night','evening'].includes(s.time)&&s.season==='summer')fireflies(ctx,s,false);
      else if(s.season==='spring'||s.season==='autumn')falling(ctx,s,s.season);
    }
  }
  ctx.restore();
}
