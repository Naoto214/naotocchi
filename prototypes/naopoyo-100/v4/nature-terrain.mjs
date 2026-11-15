// Independent visual study. Terrain never changes the engine's collision map.
export const natureWorlds={sea:{name:'海',subtitle:'昆布の森と、砂底の水路'},snow:{name:'雪山',subtitle:'吹きだまりの間を、氷の道がつなぐ'}};
export function terrainTopology(s){
 const walls=new Set((s.baseWalls||s.walls).map(([x,y])=>`${x},${y}`));
 const solid=(x,y)=>walls.has(`${x},${y}`);
 return Array.from({length:64},(_,i)=>{const x=i%8,y=Math.floor(i/8);return{x,y,wall:solid(x,y),n:solid(x,y-1),e:solid(x+1,y),s:solid(x,y+1),w:solid(x-1,y)}});
}
function patch(c,t){
 const{x,y,n,e,s,w}=t,r=t.radius??.19;
 c.moveTo(x+(n||w?0:r),y);c.lineTo(x+1-(n||e?0:r),y);if(!n&&!e)c.quadraticCurveTo(x+1,y,x+1,y+r);
 c.lineTo(x+1,y+1-(s||e?0:r));if(!s&&!e)c.quadraticCurveTo(x+1,y+1,x+1-r,y+1);
 c.lineTo(x+(s||w?0:r),y+1);if(!s&&!w)c.quadraticCurveTo(x,y+1,x,y+1-r);
 c.lineTo(x,y+(n||w?0:r));if(!n&&!w)c.quadraticCurveTo(x,y,x+r,y);c.closePath();
}
const oval=(c,x,y,rx,ry,color)=>{c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()};
function gradient(c,sea){const g=c.createLinearGradient(0,0,3,8);g.addColorStop(0,sea?'#b9eee0':'#b9deeb');g.addColorStop(.5,sea?'#6cc7bf':'#8cbcd5');g.addColorStop(1,sea?'#3e9eae':'#6894b8');return g}
export function natureTerrain(c,s,world){
 if(!natureWorlds[world])throw Error('Natural study is limited to sea and snow');
 const sea=world==='sea',cells=terrainTopology(s).map(t=>({...t,radius:sea?.12:.27})),walls=cells.filter(t=>t.wall);
 c.save();c.fillStyle=gradient(c,sea);c.fillRect(0,0,8,8);
 // Broad sand shoals / polished ice ribbons are continuous in board coordinates.
 for(let i=0;i<3;i++){c.fillStyle=sea?['#e5dcb58c','#f1e7bd70','#d7e7ce60'][i]:['#e2f6fa88','#ecf9fc66','#bce4f066'][i];c.beginPath();c.moveTo(-1,1.5+i*2);c.bezierCurveTo(2,3+i,4,-1+i*3,9,1.4+i*2);c.lineTo(9,2.2+i*2);c.bezierCurveTo(4,i*3,2,4+i,-1,2.6+i*2);c.closePath();c.fill()}
 // A faint complete grid preserves targeting without tiled decorative stamps.
 c.lineWidth=.015;c.strokeStyle=sea?'#226f7738':'#416c9138';for(let i=1;i<8;i++){c.beginPath();c.moveTo(i,0);c.lineTo(i,8);c.moveTo(0,i);c.lineTo(8,i);c.stroke()}
 c.strokeStyle=sea?'#eeffeb55':'#f4ffff88';c.lineWidth=.025;
 for(let i=0;i<6;i++){c.beginPath();c.moveTo(-1,i*1.45+.3);c.bezierCurveTo(2,i*1.45+.7,5,i*1.45-.8,9,i*1.45+.2);c.stroke()}
 // One joined silhouette: no internal block borders. The dark lip marks collision edges.
 c.save();c.translate(0,.07);c.beginPath();walls.forEach(t=>patch(c,t));c.fillStyle=sea?'#235f68':'#4d789e';c.fill();c.restore();
 c.beginPath();walls.forEach(t=>patch(c,t));c.save();c.clip();
 const g=c.createLinearGradient(0,0,5,8);g.addColorStop(0,sea?'#508c83':'#fffdf2');g.addColorStop(.5,sea?'#36726e':'#e6f1f3');g.addColorStop(1,sea?'#245864':'#c6dce9');c.fillStyle=g;c.fillRect(0,0,8,8);
 if(sea){
  // Irregular reef outcrops at a handful of board-space sites, clipped to solid terrain.
  for(const[x,y,scale,turn]of [[.25,.2,1.5,-.3],[4.5,.1,1.9,.2],[6.3,3.8,1.4,-.6],[.5,5.2,1.8,.15],[4.4,6.7,1.6,-.2]]){
   c.save();c.translate(x,y);c.rotate(turn);c.scale(scale,scale);c.fillStyle='#244f5966';c.beginPath();c.moveTo(0,.5);c.bezierCurveTo(-.12,.15,.4,-.08,.8,.1);c.bezierCurveTo(1.4,.08,1.6,.5,1.28,.82);c.bezierCurveTo(.9,1,.22,.93,0,.5);c.fill();c.fillStyle='#729b8c';c.beginPath();c.moveTo(.02,.4);c.bezierCurveTo(.05,.03,.44,-.04,.8,.1);c.lineTo(1.22,.22);c.quadraticCurveTo(1.55,.4,1.2,.62);c.lineTo(.45,.7);c.closePath();c.fill();c.strokeStyle='#b4caaa88';c.lineWidth=.035;c.beginPath();c.moveTo(.12,.3);c.quadraticCurveTo(.3,.06,.7,.15);c.lineTo(1.12,.25);c.stroke();c.restore()
  }
 }else{
  // Wind-packed snow contours vary in height and curvature across the whole mountain.
  for(const[y,a,b,end]of [[.6,-.5,1.9,.9],[3.6,4.8,1.7,3],[6.9,5.3,8,6.5]]){
   c.beginPath();c.moveTo(-1,y);c.bezierCurveTo(1.3,a,4.6,b,9,end);c.strokeStyle='#9fbcd566';c.lineWidth=.19;c.stroke();c.translate(0,-.09);c.strokeStyle='#ffffffcc';c.lineWidth=.15;c.stroke();c.translate(0,.09)
  }
 }
 // Quiet grain and occasional stone fractures, scaled to stay subordinate at 36px.
 for(let k=0;k<80;k++){const x=((k*47)%79)/10,y=((k*31)%77)/10;c.fillStyle=sea?'#bbcfad38':'#ffffff66';c.fillRect(x,y,.018+(k%3)*.012,.018)}
 c.strokeStyle=sea?'#123f4a35':'#769bb526';c.lineWidth=.012;
 for(let i=1;i<8;i++){c.beginPath();c.moveTo(i,0);c.lineTo(i,8);c.moveTo(0,i);c.lineTo(8,i);c.stroke()}
 c.restore();
 // Continuous exposed edges; adjacent wall cells do not produce dashed borders.
 for(const t of walls){const{x,y,n,e,s,w}=t,r=t.radius??.19;c.lineCap='butt';
  for(const[adj,ax,ay,bx,by,light]of [[n,w?r:0,.025,e?1-r:1,.025,true],[s,w?r:0,.955,e?1-r:1,.955,false],[w,.025,n?r:0,.025,s?1-r:1,true],[e,.955,n?r:0,.955,s?1-r:1,false]])if(!adj){
   // Edge endpoints follow the rounded silhouette's convex corners.
   let aa=ax,ab=ay,ba=bx,bb=by;
   if(ay===by){aa=w?0:r;ba=e?1:1-r}else{ab=n?0:r;bb=s?1:1-r}
   c.strokeStyle=sea?(light?'#8ec9b5':'#174d60'):(light?'#ffffff':'#7fa8c8');c.lineWidth=sea?.055:(light?.10:.10);c.beginPath();c.moveTo(x+aa,y+ab);c.lineTo(x+ba,y+bb);c.stroke()
  }
  c.strokeStyle=sea?'#7aafa2':'#eaf8fa';c.lineWidth=.04;
  for(const[visible,ax,ay,bx,by,cx,cy]of [[!n&&!w,r,0,0,0,0,r],[!n&&!e,1-r,0,1,0,1,r],[!s&&!e,1,1-r,1,1,1-r,1],[!s&&!w,r,1,0,1,0,1-r]])if(visible){c.beginPath();c.moveTo(x+ax,y+ay);c.quadraticCurveTo(x+bx,y+by,x+cx,y+cy);c.stroke()}
 }
 // Decorations stay inside blocked cells; mechanics and actors are drawn afterwards.
 const reserved=new Set([...(s.layout?.tiles||[]).map(t=>`${t.x},${t.y}`),...(s.actors||[]).map(a=>`${a.x},${a.y}`),'0,7']);
 const sites=walls.filter(t=>!reserved.has(`${t.x},${t.y}`)&&(t.x*7+t.y*11)%9===0).slice(0,7);
 for(const{x,y}of sites){c.save();c.beginPath();patch(c,cells[y*8+x]);c.clip();
  if(sea){
   if((x+y)%3){for(let k=0;k<3;k++){const a=x+.25+k*.19;c.fillStyle=['#92c984','#64aa83','#377f72'][k];c.beginPath();c.moveTo(a,y+.88);c.bezierCurveTo(a-.22,y+.6,a+.22,y+.35,a+.04,y+.12+k*.08);c.bezierCurveTo(a+.34,y+.36,a-.03,y+.66,a+.08,y+.88);c.fill()}}
   else{c.strokeStyle='#ecaa91';c.lineWidth=.065;c.lineCap='round';for(let k=0;k<3;k++){c.beginPath();c.moveTo(x+.5,y+.84);c.quadraticCurveTo(x+.2+k*.2,y+.63,x+.2+k*.23,y+.39+k*.06);c.stroke()}oval(c,x+.5,y+.84,.22,.06,'#d39180')}
   for(let k=0;k<2;k++){c.strokeStyle='#d5f8e6aa';c.lineWidth=.018;c.beginPath();c.arc(x+.79-k*.09,y+.28-k*.13,.035+k*.012,0,7);c.stroke()}
  }else{
   // Sparse embedded ice seams, with soft snow curling over the exposed edge.
   c.strokeStyle='#81b2ce88';c.lineWidth=.025;c.beginPath();c.moveTo(x+.16,y+.54);c.lineTo(x+.37,y+.62);c.lineTo(x+.59,y+.39);c.lineTo(x+.82,y+.43);c.moveTo(x+.37,y+.62);c.lineTo(x+.48,y+.81);c.stroke();c.strokeStyle='#ffffff';c.lineWidth=.075;c.beginPath();c.moveTo(x+.14,y+.3);c.bezierCurveTo(x+.4,y+.14,x+.64,y+.37,x+.85,y+.25);c.stroke();
  }c.restore();
 }
 c.restore();
}
