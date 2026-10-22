// World styling is presentation-only: solid geometry is drawn ONLY on s.walls.
export const stageThemes=Object.fromEntries(Array.from({length:12},(_,i)=>[String(i+1).padStart(2,'0'),i<4?'prison':i<8?'cavern':'castle']));
export const worldNames={prison:'洞窟牢屋',cavern:'地下洞窟',castle:'古城の地下通路'};
const palettes={
 prison:{top:'#293d50',bottom:'#485967',floor:['#697f8b','#647986'],rock:'#465d70',edge:'#223747',light:'#91a3ae'},
 cavern:{top:'#193e43',bottom:'#355354',floor:['#486a6c','#4d6e6d'],rock:'#3e555c',edge:'#182e36',light:'#879e99'},
 castle:{top:'#343b51',bottom:'#58596b',floor:['#767b8d','#70778a'],rock:'#555c75',edge:'#293449',light:'#a1a4b6'}
};
function block(c,x,y,p){
 c.fillStyle=p.edge;c.beginPath();c.roundRect(x+.025,y+.055,.95,.92,.06);c.fill();
 c.fillStyle=p.rock;c.beginPath();c.moveTo(x+.04,y+.20);c.lineTo(x+.16,y+.035);c.lineTo(x+.82,y+.025);c.lineTo(x+.96,y+.16);c.lineTo(x+.93,y+.79);c.lineTo(x+.78,y+.88);c.lineTo(x+.12,y+.85);c.closePath();c.fill();
 c.strokeStyle=p.light;c.lineWidth=.025;c.beginPath();c.moveTo(x+.10,y+.20);c.lineTo(x+.20,y+.10);c.lineTo(x+.79,y+.09);c.stroke();
 c.strokeStyle=p.edge;c.beginPath();c.moveTo(x+.04,y+.48);c.lineTo(x+.94,y+.45);c.moveTo(x+.64,y+.09);c.lineTo(x+.60,y+.46);c.stroke();
}
function lantern(c,x,y){
 const glow=c.createRadialGradient(x+.5,y+.4,.02,x+.5,y+.4,.8);glow.addColorStop(0,'#ffce7866');glow.addColorStop(1,'#ffce7800');c.fillStyle=glow;c.fillRect(x-.3,y-.3,1.6,1.6);
 c.strokeStyle='#1a2b37';c.lineWidth=.04;c.beginPath();c.moveTo(x+.5,y+.12);c.lineTo(x+.5,y+.30);c.stroke();
 c.fillStyle='#293940';c.fillRect(x+.34,y+.28,.32,.36);c.fillStyle='#ffe3a0';c.fillRect(x+.40,y+.33,.20,.24);
 c.fillStyle='#b69f6d';c.fillRect(x+.32,y+.28,.36,.04);c.fillRect(x+.32,y+.61,.36,.04);
}
function barred(c,x,y){
 c.fillStyle='#1a3043';c.beginPath();c.roundRect(x+.20,y+.16,.60,.62,[.25,.25,.02,.02]);c.fill();
 c.fillStyle='#99b8c1';c.fillRect(x+.28,y+.30,.44,.31);
 c.strokeStyle='#263d50';c.lineWidth=.055;c.beginPath();for(const dx of [.36,.51,.66]){c.moveTo(x+dx,y+.27);c.lineTo(x+dx,y+.75)}c.moveTo(x+.22,y+.49);c.lineTo(x+.78,y+.49);c.stroke();
}
function crystal(c,x,y){
 for(const [dx,dy,h]of [[.30,.55,.28],[.50,.66,.46],[.70,.56,.23]]){
 c.fillStyle=dx===.5?'#85e3d7':'#8ebacf';c.beginPath();c.moveTo(x+dx-.08,y+dy);c.lineTo(x+dx-.07,y+dy-h);c.lineTo(x+dx,y+dy-h-.09);c.lineTo(x+dx+.09,y+dy-h);c.lineTo(x+dx+.07,y+dy);c.closePath();c.fill();
 c.strokeStyle='#d9fff04d';c.lineWidth=.02;c.beginPath();c.moveTo(x+dx,y+dy-h);c.lineTo(x+dx,y+dy);c.stroke();
 }
}
export function drawTerrain(c,s){
 const theme=stageThemes[s.id]||'prison',p=palettes[theme];
 const bg=c.createLinearGradient(0,0,0,s.h);bg.addColorStop(0,p.top);bg.addColorStop(1,p.bottom);c.fillStyle=bg;c.fillRect(0,0,s.w,s.h);
 for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){
  // Every walkable tile remains a complete, flat flagstone; no fake solid scenery.
  c.fillStyle=p.floor[(x+y)%2];c.beginPath();c.roundRect(x+.035,y+.035,.93,.93,.045);c.fill();
  c.strokeStyle=theme==='cavern'?'#94d2c52b':'#d1d7dd30';c.lineWidth=.018;c.beginPath();c.moveTo(x+.12,y+.10);c.lineTo(x+.88,y+.10);c.moveTo(x+.88,y+.11);c.lineTo(x+.88,y+.26);c.stroke();
  c.strokeStyle='#1c344729';c.beginPath();c.moveTo(x+.14,y+.89);c.lineTo(x+.83,y+.89);c.stroke();
  if((x*7+y*3)%9===0){c.beginPath();c.moveTo(x+.73,y+.90);c.lineTo(x+.68,y+.76);c.lineTo(x+.80,y+.70);c.stroke();}
  if(theme==='cavern'&&(x+y*3)%7===0){c.fillStyle='#afdcd615';c.beginPath();c.ellipse(x+.55,y+.62,.23,.055,0,0,Math.PI*2);c.fill();}
  if(theme==='castle'&&(x+y)%3===0){c.strokeStyle='#c4b69633';c.strokeRect(x+.40,y+.40,.20,.20);}
 }
 // Light changes mood without changing traversability.
 for(const e of s.exits){const glow=c.createRadialGradient(e.x+.5,e.y+.35,.1,e.x+.5,e.y+.35,2.6);glow.addColorStop(0,'#ffe3a45c');glow.addColorStop(1,'#ffe3a400');c.fillStyle=glow;c.fillRect(0,0,s.w,s.h);}
 drawGravity(c,s);
 for(const[x,y]of s.walls){
  block(c,x,y,p);
  if(theme==='prison'){
   if((x+y)%3===0)barred(c,x,y);
   else if((x+y)%4===2)lantern(c,x,y);
  }else if(theme==='cavern'){
   c.fillStyle='#6b967460';c.beginPath();c.ellipse(x+.47,y+.16,.30,.09,-.12,0,Math.PI*2);c.fill();
   c.strokeStyle='#213c46';c.lineWidth=.045;c.beginPath();c.moveTo(x+.13,y+.65);c.lineTo(x+.37,y+.30);c.lineTo(x+.62,y+.59);c.lineTo(x+.84,y+.23);c.stroke();
   if((x+y)%3===0)crystal(c,x,y);
  }else{
   c.fillStyle='#7e869c';c.fillRect(x+.27,y+.16,.46,.64);c.fillStyle='#a1a4b5';c.fillRect(x+.23,y+.12,.54,.10);c.fillRect(x+.23,y+.74,.54,.10);
   c.strokeStyle='#4b5572';c.lineWidth=.028;for(const dx of [.38,.52,.64]){c.beginPath();c.moveTo(x+dx,y+.25);c.lineTo(x+dx,y+.69);c.stroke();}
   if((x+y)%4===1)lantern(c,x,y);
  }
 }
}

// Presentation only, beneath solid terrain and every interactive fixture.
export function drawGravity(c,s){
 if(!s.gravity)return;
 c.save();c.globalAlpha=.22;c.fillStyle='#fff5d9';
 c.textAlign='center';c.textBaseline='middle';c.font='bold 1.7px sans-serif';
 // Stage 09: a fixed clear patch right of the staircase, never actor-dependent.
 c.fillText('↓',6.5,3.5,.85);c.restore();
}
