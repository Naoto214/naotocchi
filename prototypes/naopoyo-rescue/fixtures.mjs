import { drawSprite } from './sprites.mjs';
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
export function drawCondition(c, fixture) {
  inCell(c, fixture, () => {
    const label=conditionLabel(fixture), all=label==='ALL';
    // Fit cropped art and text around one shared visual centre (not PNG padding).
    const iconWidth=.30, gap=.04, textWidth=all?.51:.47;
    const groupWidth=fixture.species?iconWidth+gap+textWidth:textWidth;
    const left=(1-groupWidth)/2, cy=.835;
    if(fixture.species)drawSprite(c,fixture.species,6,{x:left,y:cy-.145,w:iconWidth,h:.29});
    c.fillStyle='#243d4a';c.textAlign='center';c.textBaseline='middle';
    c.font=`bold ${all?.245:.29}px ui-monospace, monospace`;
    const tx=fixture.species?left+iconWidth+gap+textWidth/2:.5;
    c.strokeStyle='#ffffed';c.lineWidth=.045;c.lineJoin='round';
    c.strokeText(label,tx,cy,textWidth);c.fillText(label,tx,cy,textWidth);
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
  inCell(c, fixture, () => {
    const openness=fixture.open?Math.max(0,Math.min(1,opening)):0;
    // A dark, full-height passage with stone jambs and two sliding iron leaves.
    rounded(c,.10,.20,.80,.48,[.13,.13,.025,.025],'#334854');
    rounded(c,.07,.21,.12,.47,.025,'#8b9caa');
    rounded(c,.81,.21,.12,.47,.025,'#8b9caa');
    rounded(c,.07,.17,.86,.10,.03,'#bdc8c7');
    rounded(c,.07,.63,.86,.045,.012,'#d4c7a2');
    c.save();c.beginPath();c.rect(.19,.27,.62,.36);c.clip();
    for(const side of [-1,1]){
      const shift=side*openness*.31;
      c.strokeStyle='#b1c5ca';c.lineWidth=.043;
      c.beginPath();
      for(const x of (side<0?[.23,.35,.47]:[.53,.65,.77])){
        c.moveTo(x+shift,.27);c.lineTo(x+shift,.63);
      }
      c.moveTo((side<0?.19:.5)+shift,.39);c.lineTo((side<0?.5:.81)+shift,.39);
      c.moveTo((side<0?.19:.5)+shift,.56);c.lineTo((side<0?.5:.81)+shift,.56);c.stroke();
    }
    c.restore();
    // The familiar owl sits on the lintel, with a readable face, even when occupied.
    if(!occupied)drawSprite(c,'owl',1,{x:.20,y:.025,w:.60,h:.52});
  });
}

export function drawOccupiedGuardian(c,fixture){
 inCell(c,fixture,()=>drawSprite(c,'owl',1,{x:.035,y:.025,w:.40,h:.48}));
}
