import{ellipse,gradient,wallPath,floorClip,grid,edges}from './six-geometry.mjs';
function forest(c,cells){
 c.fillStyle=gradient(c,'#bdcf89','#8fb475');c.fillRect(0,0,8,8);
 // Soil ribbons follow the open meadow; canopy covers their blocked portions.
 c.strokeStyle='#d6c598';c.lineWidth=1.1;c.beginPath();c.moveTo(-1,2.5);c.bezierCurveTo(2,3.5,4,2.6,9,3.5);c.stroke();
 c.save();floorClip(c,cells);for(const[x,y,rx,ry]of [[1.5,2.4,1.2,.45],[5.8,3.4,1.7,.5]])ellipse(c,x,y,rx,ry,'#eef1b740');grid(c,'#45674050');c.restore();
 wallPath(c,cells,.23);c.fillStyle='#274d39';c.fill();c.save();wallPath(c,cells,.23);c.clip();
 c.fillStyle=gradient(c,'#467747','#244d3f');c.fillRect(0,0,8,8);
 // Trunks and roots sit under several overlapping crowns, never on walkable cells.
 for(const[x,y,angle]of [[1,.5,.3],[5.9,.8,-.4],[.6,5.9,.4],[5.6,6.4,-.6]]){c.save();c.translate(x,y);c.rotate(angle);c.strokeStyle='#6c6345';c.lineWidth=.25;c.beginPath();c.moveTo(0,-.5);c.lineTo(.2,1.2);c.stroke();c.lineWidth=.07;c.beginPath();c.moveTo(.2,1.2);c.quadraticCurveTo(.6,1.3,.8,1.8);c.moveTo(.2,1.2);c.lineTo(-.35,1.65);c.stroke();c.restore()}
 for(const[x,y,rx,ry,seed]of [[.5,.55,1.25,.7,0],[3.3,.4,1.65,.85,1],[6.5,1,1.45,1,2],[.5,4.9,1.15,.8,3],[2.9,6.1,1.8,1,4],[6.7,7.1,1.55,.75,5]]){
  ellipse(c,x+.08,y+.14,rx,ry,'#193f3366');
  for(let i=0;i<5;i++){const a=i*1.37+seed*.7,xx=x+Math.cos(a)*rx*.55,yy=y+Math.sin(a)*ry*.55;ellipse(c,xx,yy,rx*(.38+i%2*.07),ry*.58,['#54874c','#66974f','#3e7547','#7ba052','#487e48'][(i+seed)%5])}
  c.strokeStyle='#a5ba6955';c.lineWidth=.045;c.beginPath();c.moveTo(x-rx*.5,y-.12);c.quadraticCurveTo(x,y-ry*.55,x+rx*.4,y-.25);c.stroke();
 }
 // A single fallen log and a few leaf litter flecks, clipped into the undergrowth.
 c.save();c.translate(5.6,5.3);c.rotate(-.3);c.fillStyle='#807151';c.beginPath();c.roundRect(-.7,-.12,1.4,.25,.1);c.fill();c.strokeStyle='#b3a279';c.lineWidth=.035;c.beginPath();c.moveTo(-.55,-.03);c.lineTo(.55,-.03);c.stroke();c.restore();
 for(let i=0;i<15;i++){const x=((i*37)%75)/10,y=((i*19+8)%77)/10;ellipse(c,x,y,.055,.025,i%3?'#a5b56a99':'#c5a16c99')}
 grid(c,'#193c3020');c.restore();edges(c,cells,'#8da766','#1e4537',.23,.07);
}
function sky(c,cells){
 c.fillStyle=gradient(c,'#73b8dd','#c8e6ec');c.fillRect(0,0,8,8);
 // Cloud sea and cloud walls are blocked; all playable floor is an edged platform.
 c.save();wallPath(c,cells,.26);c.clip();
 for(const[x,y,rx,ry]of [[.4,.4,2,.75],[4.3,.4,2.7,.85],[7.4,1.8,1.5,.9],[1.1,5.6,2.5,.7],[5.4,6.7,3,.8],[2,8,2.8,.9]]){
  ellipse(c,x,y+.23,rx*1.05,ry,'#6ca5c066');
  for(let k=0;k<4;k++)ellipse(c,x+(k-1.5)*rx*.37,y-Math.sin(k*1.4)*.15,rx*.43,ry*(.7+k%2*.2),k%2?'#eef6f2':'#dbeef0');
 }
 c.strokeStyle='#f3fbf5aa';c.lineWidth=.035;for(const[y,a,b]of [[2.3,1.6,2.8],[4.9,5.4,4.5],[7.5,7.8,7]]){c.beginPath();c.moveTo(-.5,y);c.bezierCurveTo(2,a,5,b,8.5,y-.2);c.stroke()}
 grid(c,'#306e9423');c.restore();
 const platforms=cells.map(t=>({...t,wall:!t.wall,n:!t.n,e:!t.e,s:!t.s,w:!t.w}));
 // One connected floating shelf, with a visible side face inside each exposed edge.
 wallPath(c,platforms,.12);c.fillStyle='#577a9c';c.fill();c.save();wallPath(c,platforms,.12);c.clip();
 c.fillStyle=gradient(c,'#eee0b5','#d4c399');c.fillRect(0,0,8,8);grid(c,'#927d5955');
 for(const t of platforms.filter(t=>t.wall)){if(!t.s){c.fillStyle='#789498';c.fillRect(t.x,t.y+.84,1,.16);c.fillStyle='#9db6a6';c.fillRect(t.x,t.y+.8,1,.055)}if(!t.e){c.fillStyle='#a5ab93';c.fillRect(t.x+.9,t.y,.1,1)}}
 c.restore();edges(c,platforms,'#fff3ce','#4c718d',.12,.055);
}
export const regionPainters={forest,sky};
