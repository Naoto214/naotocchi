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
export const regionPainters={forest};
