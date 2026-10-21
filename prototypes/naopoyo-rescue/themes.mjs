// Theme selection is presentation-only: collision always uses s.walls.
export const stageThemes={'01':'prison'};
export function drawTerrain(c,s){
 const prison=stageThemes[s.id]==='prison';
 const bg=c.createLinearGradient(0,0,0,s.h);bg.addColorStop(0,prison?'#c9d4d5':'#e5efe5');bg.addColorStop(1,prison?'#e5dbbc':'#f3f3df');c.fillStyle=bg;c.fillRect(0,0,s.w,s.h);
 for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){
  c.fillStyle=prison?((x+y)%2?'#d9d8c8':'#e4e0cf'):((x+y)%2?'#ffffff12':'#ffffff40');
  c.beginPath();c.roundRect(x+.035,y+.035,.93,.93,.045);c.fill();
  if(prison){c.strokeStyle='#9aada533';c.lineWidth=.018;c.beginPath();c.moveTo(x+.16,y+.89);c.lineTo(x+.8,y+.89);c.stroke();}
 }
 if(prison){
  const glow=c.createRadialGradient(5.6,1.1,.1,5.6,1.1,4);glow.addColorStop(0,'#fff5c270');glow.addColorStop(1,'#fff5c200');c.fillStyle=glow;c.fillRect(0,0,s.w,s.h);
 }
 for(const[x,y]of s.walls){
  c.fillStyle=prison?'#657881':'#8b9b88';c.beginPath();c.roundRect(x+.025,y+.13,.95,.85,.09);c.fill();
  c.fillStyle=prison?'#9bafb5':'#bfccb1';c.beginPath();c.roundRect(x+.025,y+.025,.95,.84,.09);c.fill();
  c.fillStyle=prison?'#c7d5d3':'#dce4c9';c.fillRect(x+.11,y+.10,.78,.045);
  if(prison){
   c.strokeStyle='#6e8790';c.lineWidth=.025;c.beginPath();c.moveTo(x+.04,y+.46);c.lineTo(x+.96,y+.46);c.moveTo(x+.52,y+.05);c.lineTo(x+.52,y+.44);c.stroke();
   if(y===0&&(x===2||x===5)){
    c.fillStyle='#526b79';c.beginPath();c.roundRect(x+.19,y+.17,.62,.61,[.25,.25,.03,.03]);c.fill();
    c.fillStyle='#ffe9ad';c.fillRect(x+.25,y+.29,.50,.42);
    c.strokeStyle='#71898d';c.lineWidth=.065;c.beginPath();for(const dx of [.39,.61]){c.moveTo(x+dx,y+.25);c.lineTo(x+dx,y+.74)}c.stroke();
   }
   if(x===0&&y>0&&y<5){c.strokeStyle='#526a76';c.lineWidth=.07;c.beginPath();for(const dx of [.30,.68]){c.moveTo(x+dx,y+.09);c.lineTo(x+dx,y+.84)}c.stroke();}
  }
 }
}
