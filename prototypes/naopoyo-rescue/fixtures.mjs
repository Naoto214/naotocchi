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
    rounded(c, .07, .69, .86, .27, .055, '#fffdf1');
    c.strokeStyle = '#6b7e78'; c.lineWidth = .018;
    c.strokeRect(.075, .695, .85, .26);
    if (fixture.species) drawSprite(c, fixture.species, 6, {x:.09,y:.70,w:.26,h:.25});
    c.fillStyle = '#243d4a'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold .265px ui-monospace, monospace';
    c.fillText(conditionLabel(fixture), fixture.species ? .62 : .5, .835, fixture.species ? .54 : .78);
  });
}
export function drawExit(c, fixture) {
  inCell(c, fixture, () => {
    // Rounded star arch, separate from the rectangular guardian gate.
    rounded(c,.13,.05,.74,.63,[.36,.36,.035,.035],'#a2d5b6');
    rounded(c,.23,.14,.54,.53,[.27,.27,.02,.02],'#315e62');
    const glow=c.createRadialGradient(.5,.37,.02,.5,.37,.25);
    glow.addColorStop(0,'#fff6abbb');glow.addColorStop(1,'#fff6ab00');
    c.fillStyle=glow;c.fillRect(.24,.12,.52,.53);
    c.fillStyle='#ffe398';c.beginPath();
    for(let i=0;i<10;i++){
      const a=-Math.PI/2+i*Math.PI/5,r=i%2?.09:.20;
      const x=.5+Math.cos(a)*r,y=.36+Math.sin(a)*r;
      if(i)c.lineTo(x,y);else c.moveTo(x,y);
    }
    c.closePath();c.fill();
    rounded(c,.13,.61,.74,.055,.02,'#e9ecc4');
  });
}
export function drawGate(c, fixture, opening = 1, occupied = false) {
  inCell(c, fixture, () => {
    const openness=fixture.open?opening:0;
    rounded(c,.08,.40,.84,.06,.025,'#9b805d');
    rounded(c,.08,.43,.09,.24,.02,'#806b53');
    rounded(c,.83,.43,.09,.24,.02,'#806b53');
    if(fixture.open){
      rounded(c,.19,.40,.62,.26,.04,'#c8e4bd');
      c.strokeStyle='#4e8062';c.lineWidth=.045;
      c.beginPath();c.moveTo(.4,.59);c.lineTo(.5,.46);c.lineTo(.6,.59);c.stroke();
    }
    for(const side of [-1,1]){
      const w=.32*(1-openness)+.025,x=side<0?.18:.82-w;
      rounded(c,x,.46,w,.20,.025,'#b99c70');
      c.strokeStyle='#806b53';c.lineWidth=.02;c.strokeRect(x,.46,w,.20);
    }
    drawSprite(c,'owl',1,occupied?{x:.04,y:.04,w:.28,h:.27}:{x:.24,y:.01,w:.52,h:.43});
  });
}
