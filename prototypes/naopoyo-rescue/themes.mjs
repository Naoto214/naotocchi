// Theme selection is presentation-only. Solid scenery is drawn ONLY on s.walls.
export const stageThemes={'01':'prison'};
const palettes={
 meadow:{top:'#e5efe5',bottom:'#f3f3df',floor:['#ffffff40','#ffffff12'],rock:'#afbf9f',edge:'#687d70',light:'#dce6cc'},
 prison:{top:'#293d50',bottom:'#485967',floor:['#687b88','#607482'],rock:'#465d70',edge:'#223747',light:'#8296a4'}
};
function stone(c,x,y,p,variant){
 c.fillStyle=p.edge;c.beginPath();c.roundRect(x+.025,y+.055,.95,.92,.06);c.fill();
 c.fillStyle=p.rock;c.beginPath();
 c.moveTo(x+.04,y+.20);c.lineTo(x+.16,y+.035);c.lineTo(x+.82,y+.025);c.lineTo(x+.96,y+.16);
 c.lineTo(x+.93,y+.79);c.lineTo(x+.78,y+.88);c.lineTo(x+.12,y+.85);c.closePath();c.fill();
 c.strokeStyle=p.light;c.lineWidth=.025;c.beginPath();c.moveTo(x+.10,y+.20);c.lineTo(x+.20,y+.10);c.lineTo(x+.79,y+.09);c.stroke();
 c.strokeStyle=p.edge;c.lineWidth=.025;c.beginPath();
 c.moveTo(x+.04,y+.48);c.lineTo(x+.94,y+.45);c.moveTo(x+(variant?.34:.64),y+.09);c.lineTo(x+(variant?.39:.60),y+.46);c.stroke();
}
export function drawTerrain(c,s){
 const prison=stageThemes[s.id]==='prison',p=palettes[prison?'prison':'meadow'];
 const bg=c.createLinearGradient(0,0,0,s.h);bg.addColorStop(0,p.top);bg.addColorStop(1,p.bottom);c.fillStyle=bg;c.fillRect(0,0,s.w,s.h);
 for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){
  c.fillStyle=p.floor[(x+y)%2];c.beginPath();c.roundRect(x+.035,y+.035,.93,.93,.045);c.fill();
  if(prison){c.strokeStyle='#adc1cb26';c.lineWidth=.018;c.beginPath();c.moveTo(x+.16,y+.89);c.lineTo(x+.8,y+.89);c.stroke();}
 }
 if(prison){
  // Warm pools on the walkable floor are light, never fake collision geometry.
  for(const e of s.exits){const glow=c.createRadialGradient(e.x+.5,e.y+.35,.1,e.x+.5,e.y+.35,3.1);glow.addColorStop(0,'#ffe4a46b');glow.addColorStop(1,'#ffe4a400');c.fillStyle=glow;c.fillRect(0,0,s.w,s.h);}
  const shade=c.createRadialGradient(s.w/2,s.h/2,1.2,s.w/2,s.h/2,5);shade.addColorStop(0,'#12263800');shade.addColorStop(1,'#1226388c');c.fillStyle=shade;c.fillRect(0,0,s.w,s.h);
 }
 for(const[x,y]of s.walls){
  stone(c,x,y,p,(x+y)%2);
  if(!prison)continue;
  if(y===0&&(x===2||x===5)){
   c.fillStyle='#142c40';c.beginPath();c.roundRect(x+.20,y+.18,.60,.57,[.22,.22,.02,.02]);c.fill();
   c.fillStyle='#aac4cc';c.fillRect(x+.29,y+.32,.42,.33);
   c.strokeStyle='#304858';c.lineWidth=.07;c.beginPath();for(const dx of [.40,.60]){c.moveTo(x+dx,y+.26);c.lineTo(x+dx,y+.72)}c.moveTo(x+.23,y+.50);c.lineTo(x+.77,y+.50);c.stroke();
  }
  if(x===0&&y>0&&y<5){
   c.fillStyle='#1e3344';c.fillRect(x+.18,y+.12,.64,.66);
   c.strokeStyle='#8295a2';c.lineWidth=.055;c.beginPath();for(const dx of [.30,.50,.70]){c.moveTo(x+dx,y+.10);c.lineTo(x+dx,y+.83)}c.moveTo(x+.15,y+.30);c.lineTo(x+.85,y+.30);c.moveTo(x+.15,y+.68);c.lineTo(x+.85,y+.68);c.stroke();
  }
  if((x===0||x===7)&&y===2){
   const glow=c.createRadialGradient(x+.5,y+.4,.02,x+.5,y+.4,.65);glow.addColorStop(0,'#ffce7877');glow.addColorStop(1,'#ffce7800');c.fillStyle=glow;c.fillRect(x,y,1,1);
   c.strokeStyle='#192f41';c.lineWidth=.045;c.beginPath();c.moveTo(x+.5,y+.12);c.lineTo(x+.5,y+.27);c.stroke();
   c.fillStyle='#263848';c.fillRect(x+.33,y+.27,.34,.38);c.fillStyle='#ffe5a0';c.fillRect(x+.39,y+.32,.22,.26);
   c.fillStyle='#bfa06d';c.fillRect(x+.31,y+.27,.38,.04);c.fillRect(x+.31,y+.62,.38,.04);
  }
 }
}
