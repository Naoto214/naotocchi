// Board-space textures: deterministic world coordinates, not a repeated tile stamp.
export function landscape(c,s,theme){
 const solid=(x,y)=>(s.baseWalls||s.walls).some(p=>p[0]===x&&p[1]===y);
 const sea=theme==='sea',noise=(x,y)=>Math.sin(x*91.7+y*37.1)*.5+.5;
 c.save();const bg=c.createLinearGradient(0,0,2,8);bg.addColorStop(0,sea?'#a8dbca':'#dbe8eb');bg.addColorStop(1,sea?'#559caa':'#93b3c7');c.fillStyle=bg;c.fillRect(0,0,8,8);
 if(sea){c.fillStyle='#e2d9aa55';for(const [x,y,rx,ry]of [[1.2,3.2,2.8,.9],[5.6,5.1,3.4,1.2],[6.4,1.1,2.2,.7]]){c.beginPath();c.ellipse(x,y,rx,ry,-.2,0,7);c.fill()}}
 // Continuous ripples / wind-swept snow run across cell boundaries.
 for(let n=0;n<21;n++){c.strokeStyle=sea?'#eaffdd40':'#ffffff55';c.lineWidth=.018+(n%3)*.008;c.beginPath();for(let x=0;x<=8;x+=.1){const y=n*.43+Math.sin(x*.95+n*.8)*.13;x?c.lineTo(x,y):c.moveTo(x,y)}c.stroke()}
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){
  if(!solid(x,y)){
   c.strokeStyle=sea?'#315e6938':'#57768d50';c.lineWidth=.015;c.strokeRect(x+.025,y+.025,.95,.95);
   if(sea){if(noise(x,y)>.73){c.fillStyle='#668f8e66';c.beginPath();c.ellipse(x+.16,y+.84,.07,.035,0,0,7);c.fill()}}
   else{c.strokeStyle='#688fa357';c.lineWidth=.018;if(noise(x,y)>.5){c.beginPath();c.moveTo(x+.05,y+.8);c.lineTo(x+.26,y+.66);c.lineTo(x+.36,y+.7);c.moveTo(x+.26,y+.66);c.lineTo(x+.28,y+.52);c.stroke()}}
   continue;
  }
  const exposed=!solid(x,y-1),r=noise(x,y);
  const rock=c.createLinearGradient(0,0,3,8);rock.addColorStop(0,sea?'#668a80':'#90a9b5');rock.addColorStop(1,sea?'#315b66':'#4f6c83');c.fillStyle=rock;c.fillRect(x,y,1,1);
  // Connected rock masses have outlines only along actual passage edges.
  c.strokeStyle=sea?'#244e59':'#3c566b';c.lineWidth=.09;
  for(const [dx,dy,ax,ay,bx,by]of [[0,-1,.02,.04,.98,.04],[0,1,.02,.96,.98,.96],[-1,0,.04,.02,.04,.98],[1,0,.96,.02,.96,.98]])if(!solid(x+dx,y+dy)){c.beginPath();c.moveTo(x+ax,y+ay);c.lineTo(x+bx,y+by);c.stroke()}
  if(r>.65){c.strokeStyle=sea?'#214d5a70':'#344d6570';c.lineWidth=.025;c.beginPath();c.moveTo(x+.08,y+.3+r*.3);c.lineTo(x+.38,y+.55+r*.1);c.lineTo(x+.68,y+.66);c.lineTo(x+.95,y+.5);c.stroke()}
  if(sea){
   // Sparse colonies only, with differing silhouettes and locations.
   if((x*3+y*5)%11===0){c.strokeStyle=r>.5?'#e8b6a0':'#abd0a5';c.lineWidth=.04;for(let k=0;k<3;k++){const a=x+.3+k*.16;c.beginPath();c.moveTo(x+.5,y+.85);c.quadraticCurveTo(a,y+.65,a+(r-.5)*.2,y+.38+k*.06);c.stroke()}}
   if(exposed){c.strokeStyle='#abc4a283';c.lineWidth=.05;c.beginPath();c.moveTo(x+.18,y+.1);c.lineTo(x+.8,y+.12);c.stroke()}
  }else{
   // Snow accumulates along exposed ledges; sheltered rock remains visible.
   if(exposed||r>.8){c.fillStyle='#f1f4e8';c.beginPath();c.moveTo(x+.03,y+.12);c.bezierCurveTo(x+.25,y-.01,x+.67,y+.02,x+.96,y+.13);c.lineTo(x+.92,y+.26+r*.08);c.quadraticCurveTo(x+.45,y+.18,x+.07,y+.29);c.closePath();c.fill()}
   if(!solid(x+1,y)){c.fillStyle='#c1e5ec8c';c.beginPath();c.moveTo(x+.83,y+.26);c.lineTo(x+.96,y+.2);c.lineTo(x+.9,y+.67);c.closePath();c.fill()}
  }
 }
 c.restore();
}
