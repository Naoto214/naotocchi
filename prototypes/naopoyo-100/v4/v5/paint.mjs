import{tile}from '../../render.mjs';
import{byId}from './catalog.mjs';import{topology,cellPath,seedValue}from './autotile.mjs';import{describeTiles}from '../../engine.mjs';
const palette={sand:['#ade0ce','#75b7b4'],seaWater:['#69c3c5','#38939f'],reef:['#50867a','#285764'],snowfield:['#c5e5ef','#8cb6d0'],snowwall:['#fffdf3','#d9e7ef'],grass:['#c8d38b','#93b578'],path:['#ddc79a','#bda477'],grove:['#57814c','#294c3b'],platform:['#eee0b5','#cbb98e'],air:['#bee0ec','#82b6d2'],earthpath:['#d8b885','#b2956a'],soil:['#a37048','#694932'],bedrock:['#879085','#515c59'],cavefloor:['#a2b0b9','#738796'],caverock:['#596375','#303f53']};
const oval=(c,x,y,rx,ry,fill)=>{c.fillStyle=fill;c.beginPath();c.ellipse(x,y,rx,ry,0,0,7);c.fill()};
function texture(c,e,seed){const key=e.key,world=e.worlds[0],solid=e.physicsId==='terrain.wall';
 if(world==='sea'||world==='snow'){c.strokeStyle=world==='sea'?'#e7f4d657':'#ffffff80';c.lineWidth=solid?.09:.035;for(const[y,a,b]of [[.6,.2,1.6],[3.3,4.2,2.1],[6.8,5.9,7.7]]){c.beginPath();c.moveTo(-1,y);c.bezierCurveTo(2,a,5,b,9,y+.2);c.stroke()}}
 if(key==='grove'||key==='air'){for(let i=0;i<9;i++){const x=seedValue(seed,key,i,1)*8,y=seedValue(seed,key,i,2)*8,r=.5+seedValue(seed,key,i,3);oval(c,x+.1,y+.1,r,r*.65,key==='grove'?'#193d3266':'#558ba733');oval(c,x,y,r,r*.58,key==='grove'?['#759849','#4c814b','#65924e'][i%3]:'#f3f7efb0')}}
 if(key==='soil'){for(const[y,a,b]of [[1,.4,2],[3.9,4.6,3.3],[6.3,5.9,7]]){c.strokeStyle='#d0a16c77';c.lineWidth=.18;c.beginPath();c.moveTo(-1,y);c.bezierCurveTo(2,a,5,b,9,y);c.stroke()}}
 if(['reef','bedrock','caverock'].includes(key)){for(let i=0;i<7;i++){const x=seedValue(seed,key,i,4)*8,y=seedValue(seed,key,i,5)*8,w=.7+seedValue(seed,key,i,6);c.fillStyle=key==='reef'?'#92b3a05c':'#c1ccd12b';c.beginPath();c.moveTo(x,y+.25);c.lineTo(x+w*.3,y);c.lineTo(x+w,y+.2);c.lineTo(x+w*.85,y+.65);c.lineTo(x+.1,y+.8);c.closePath();c.fill()}}
 if(['grass','path','earthpath'].includes(key)){c.strokeStyle='#f3e3a73b';c.lineWidth=.38;c.beginPath();c.moveTo(-1,2.5);c.bezierCurveTo(2,3.5,5,2.3,9,4);c.stroke()}
}
export function paintMaterials(c,d,{background=true,terrain=true,edges=true}={}){c.save();if(background){c.fillStyle='#c0ced0';c.fillRect(0,0,8,8)}if(!terrain){c.restore();return}const cells=topology(d);for(const id of new Set(cells.map(t=>t.id))){const e=byId.get(id),group=cells.filter(t=>t.id===id),colors=palette[e.key]||palette.grass;c.save();c.beginPath();group.forEach(t=>cellPath(c,t,e.physicsId==='terrain.wall'?.2:.08));c.clip('evenodd');const g=c.createLinearGradient(0,0,3,8);g.addColorStop(0,colors[0]);g.addColorStop(1,colors[1]);c.fillStyle=g;c.fillRect(0,0,8,8);texture(c,e,d.appearance.seed);c.restore()}
 if(edges)for(const t of cells){
  const solid=byId.get(t.id).physicsId==='terrain.wall',r=solid?.2:.08;
  // Interior seams stay faint and thin; the collision perimeter joins across cells.
  for(const[bit,horizontal,pos,before,after,light]of [[1,true,.025,8,2,true],[4,true,.975,8,2,false],[8,false,.025,1,4,true],[2,false,.975,1,4,false]]){
   const joined=!!(t.mask&bit),start=joined?0:t.mask&before?0:r,end=joined?1:t.mask&after?1:1-r;
   c.lineWidth=joined?.012:solid?.055:.022;c.strokeStyle=joined?'#24475120':light?'#e5f3dfb0':'#203f4b88';c.lineCap='butt';c.beginPath();
   c.moveTo(t.x+(horizontal?start:pos),t.y+(horizontal?pos:start));c.lineTo(t.x+(horizontal?end:pos),t.y+(horizontal?pos:end));c.stroke();
  }
  for(const[i,[ox,oy,a]]of [[0,0,0],[1,0,Math.PI/2],[1,1,Math.PI],[0,1,Math.PI*1.5]].entries())if(t.corners[i]==='inner'){c.strokeStyle='#28465177';c.lineWidth=.025;c.beginPath();c.arc(t.x+ox,t.y+oy,.085,a,a+Math.PI/2);c.stroke()}
 }
 c.restore()}
export function paintDecorationGlyph(c,id,seed=214,x=0,y=0){if(id.startsWith('scenery.')){tile(c,id,{});return}const key=byId.get(id)?.key,r=seedValue(seed,id,x,y);c.save();c.translate(.1,.65);c.scale(.7,.7);c.lineCap='round';
 if(key==='kelp'){for(let i=0;i<3;i++){c.strokeStyle=['#719f69','#92bd7d','#518a70'][i];c.lineWidth=.06;c.beginPath();c.moveTo(.05+i*.1,.3);c.bezierCurveTo(-.05+i*.1,.1,.2+i*.1,-.1,.08+i*.1,-.35-r*.15);c.stroke()}}
 else if(key==='coral'){c.strokeStyle='#dca18c';c.lineWidth=.055;for(let i=0;i<3;i++){c.beginPath();c.moveTo(.18,.3);c.quadraticCurveTo(i*.12,.1,i*.14,-.15);c.stroke()}}
 else if(key==='crystals'||key==='icicles'){c.fillStyle=key==='crystals'?'#b7b9d6':'#c8e7ed';c.beginPath();c.moveTo(0,.28);c.lineTo(.03,-.12);c.lineTo(.14,-.28);c.lineTo(.2,.12);c.lineTo(.32,-.1);c.lineTo(.37,.28);c.closePath();c.fill();c.strokeStyle='#ecf5ed';c.lineWidth=.02;c.stroke()}
 else if(key==='bubbles'){c.strokeStyle='#edfff3bb';c.lineWidth=.025;for(let i=0;i<3;i++){c.beginPath();c.arc(.1+i*.11,.2-i*.2,.035+i*.008,0,7);c.stroke()}}
 else if(key==='snowflakes'||key==='light'){c.fillStyle=key==='light'?'#fff0bca0':'#fffefa';for(let i=0;i<3;i++){c.fillRect(.03+i*.12,.2-i*.15,.035,.035)}}
 else{for(let i=0;i<3;i++)oval(c,.04+i*.1,.18-(i%2)*.08,.05,.025,key==='pebbles'?'#9b9f8c':key==='leaves'?'#c3a665':'#93ac68')}
 c.restore()}
export function paintDecorations(c,d,s){const reserved=new Set([...describeTiles(s).filter(t=>!['terrain.floor','terrain.wall'].includes(t.catalogId)).map(t=>`${t.x},${t.y}`),...s.actors.map(a=>`${Math.floor(a.x)},${Math.floor(a.y)}`),...(s.gravity?['0,7']:[])]);for(const t of d.appearance.decorations)if(!reserved.has(`${t.x},${t.y}`)){c.save();c.translate(t.x,t.y);paintDecorationGlyph(c,t.id,d.appearance.seed,t.x,t.y);c.restore()}}
