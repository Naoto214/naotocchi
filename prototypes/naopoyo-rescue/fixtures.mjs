import { drawSprite, spriteSpec, fitSprite } from './sprites.mjs';
import { conditionLabel } from './conditions.mjs';

function inCell(c, fixture, draw) {
  c.save();
  c.translate(fixture.x, fixture.y);
  c.beginPath();
  c.rect(.025, .025, .95, .95);
  c.clip();
  draw();
  c.restore();
}
function rounded(c, x, y, w, h, radius, color) {
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(x, y, w, h, radius);
  c.fill();
}
// Measure glyph ink and cropped sprite, then center their combined visible bounds.
export function conditionLayout(c, fixture) {
 const label=conditionLabel(fixture),fontSize=label==='ALL'?.245:.29,cy=.835;
 // Measuring subpixel fonts quantizes ink bounds in browsers. Measure at real cell size.
 c.font=`bold ${fontSize*42}px ui-monospace, monospace`;
 c.textAlign='left';c.textBaseline='alphabetic';
 const m=c.measureText(label)||{},ascent=(m.actualBoundingBoxAscent??fontSize*42*.78)/42,descent=(m.actualBoundingBoxDescent??fontSize*42*.2)/42;
 const inkLeft=(m.actualBoundingBoxLeft??0)/42,inkRight=(m.actualBoundingBoxRight??m.width??fontSize*42*label.length*.62)/42;
 const textWidth=inkLeft+inkRight;
 const icon=fixture.species?fitSprite(spriteSpec(fixture.species,6).crop,{x:0,y:cy-.15,w:.30,h:.30}):null;
 const width=textWidth+(icon?icon.w+.045:0),left=(1-width)/2;
 if(icon)icon.x=left;
 return {label,fontSize,cy,left,right:left+width,icon,textX:left+(icon?icon.w+.045:0)+inkLeft,baseline:cy+(ascent-descent)/2};
}
export function drawCondition(c, fixture) {
 inCell(c,fixture,()=>{
  const v=conditionLayout(c,fixture);
  if(v.icon)drawSprite(c,fixture.species,6,v.icon);
  c.fillStyle='#20333f';c.strokeStyle='#fff4d5';c.lineWidth=.035;c.lineJoin='round';
  c.save();c.translate(v.textX,v.baseline);c.scale(1/42,1/42);c.lineWidth=.035*42;
  c.font=`bold ${v.fontSize*42}px ui-monospace, monospace`;
  c.strokeText(v.label,0,0);c.fillText(v.label,0,0);c.restore();
 });
}
export function drawExit(c, fixture) {
  inCell(c, fixture, () => {
    // Rounded star arch, separate from the rectangular guardian gate.
    rounded(c,.06,.025,.88,.65,[.36,.36,.035,.035],'#a2d5b6');
    rounded(c,.17,.12,.66,.55,[.27,.27,.02,.02],'#315e62');
    const glow=c.createRadialGradient(.5,.37,.02,.5,.37,.25);
    glow.addColorStop(0,'#fff6abbb');glow.addColorStop(1,'#fff6ab00');
    c.fillStyle=glow;c.fillRect(.24,.12,.52,.53);
    c.fillStyle='#ffe398';c.beginPath();
    for(let i=0;i<10;i++){
      const a=-Math.PI/2+i*Math.PI/5,r=i%2?.105:.245;
      const x=.5+Math.cos(a)*r,y=.36+Math.sin(a)*r;
      if(i)c.lineTo(x,y);else c.moveTo(x,y);
    }
    c.closePath();c.fill();
    rounded(c,.06,.61,.88,.055,.02,'#e9ecc4');
  });
}
export function drawGate(c, fixture, opening = 1, occupied = false) {
 inCell(c,fixture,()=>{
  const openness=fixture.open?Math.max(0,Math.min(1,opening)):0;
  // Deep arched passage on the right; owl watches from a separate left pedestal.
  rounded(c,.25,.045,.70,.69,[.24,.24,.02,.02],'#1b2735');
  rounded(c,.31,.13,.57,.60,[.20,.20,.02,.02],'#0e1e2a');
  c.fillStyle=openness?'#ddc78d55':'#71909a22';c.beginPath();
  c.moveTo(.38,.40);c.lineTo(.82,.40);c.lineTo(.91,.72);c.lineTo(.28,.72);c.fill();
  rounded(c,.22,.25,.12,.48,.02,'#aab0ac');rounded(c,.85,.25,.12,.48,.02,'#aab0ac');
  c.strokeStyle='#d1cbb7';c.lineWidth=.105;c.beginPath();c.arc(.595,.29,.31,Math.PI,2*Math.PI);c.stroke();
  c.strokeStyle='#526475';c.lineWidth=.025;
  for(const y of [.39,.55]){c.beginPath();c.moveTo(.22,y);c.lineTo(.34,y);c.moveTo(.85,y);c.lineTo(.97,y);c.stroke();}
  rounded(c,.23,.70,.73,.045,.01,'#c9b88c');
  c.save();c.beginPath();c.rect(.34,.26,.51,.44);c.clip();
  c.strokeStyle='#b8c9cd';c.lineWidth=.037;
  for(const side of [-1,1]){const shift=side*openness*.28;c.beginPath();
   for(const x of (side<0?[.37,.47,.57]:[.62,.72,.82])){c.moveTo(x+shift,.20);c.lineTo(x+shift,.70);}
   for(const y of [.40,.61]){c.moveTo((side<0?.34:.595)+shift,y);c.lineTo((side<0?.595:.85)+shift,y);}c.stroke();
  }c.restore();
  rounded(c,.035,.46,.25,.25,.025,'#657e8c');rounded(c,.025,.45,.28,.055,.015,'#b6c1bb');
  if(!occupied)drawGuardian(c,fixture);
 });
}
function drawGuardian(c,fixture){
 const expression=fixture.expression||'normal',key=expression==='normal'?'owl':`owl-${expression}`;
 const response=fixture.response||0;
 const dx=expression==='sulky'?Math.sin(response*Math.PI*4)*.025:0;
 const dy=expression==='positive'?Math.sin(response*Math.PI)*.035:0;
 drawSprite(c,key,1,{x:.005+dx,y:.015+dy,w:.44,h:.52});
}
export function drawOccupiedGuardian(c,fixture){inCell(c,fixture,()=>drawGuardian(c,fixture));}
