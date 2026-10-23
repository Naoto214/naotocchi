import {drawSprite} from '../naopoyo-rescue/sprites.mjs';
import {conditionLabel} from '../naopoyo-rescue/conditions.mjs';
import {clone,move} from './engine.mjs';
export function actorLayout(x,y,cell,drag,w,h){
 const size=cell*(drag?.56:.34),margin=size*.6+2;
 const label={x:Math.max(margin,Math.min(w-margin,(x+.5)*cell)),y:Math.max(margin,(y+(drag?.3:.15))*cell),size};
 const scale=drag?1.4:1,bw=.7*cell*scale,bh=.62*cell*scale;
 const box={x:Math.max(1,Math.min(w-bw-1,(x+.5)*cell-bw/2)),y:Math.max(label.y+size*.6+2,(y+(drag?.18:.38))*cell),w:bw,h:bh};
 if(box.y+bh>h-1){box.y=h-bh-1;label.y=Math.min(label.y,box.y-size*.6-2)}
 return {box,label};
}
export function labelLayout(x,y,cell,drag,w,h){return actorLayout(x,y,cell,drag,w,h).label}
const palettes={grove:['#d8e6cd','#bdd4b6','#526657'],shore:['#d5e7e6','#bbd9da','#3f6875'],snow:['#e6edf0','#cddce4','#577185'],cave:['#b9becb','#969fae','#4a5369']};
function rounded(c,x,y,w,h,r,fill){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill()}
function text(c,value,x,y,size,color='#fff',stroke='#3b514e'){c.font=`800 ${size}px system-ui,sans-serif`;c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineWidth=Math.max(3,size*.17);c.strokeStyle=stroke;c.strokeText(value,x,y);c.fillStyle=color;c.fillText(value,x,y)}
function star(c,x,y,r){c.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.46:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}c.closePath();c.fillStyle='#ffe7a5';c.fill();c.strokeStyle='#b27a41';c.lineWidth=2;c.stroke()}
export function render(canvas,s,activeId,{dpr=1,pulse=false}={}){
 const r=canvas.getBoundingClientRect(),size=r.width||350,cell=size/s.w;cResize(canvas,size,dpr);const c=canvas.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,size,size);
 const [light,dark,ink]=palettes[s.theme]||palettes.grove;rounded(c,0,0,size,size,18,dark);
 for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++){rounded(c,x*cell+1.5,y*cell+1.5,cell-3,cell-3,cell*.12,(x+y)%2?light:dark);if((x*7+y*11)%9===0){c.fillStyle=ink+'30';c.fillRect((x+.16)*cell,(y+.78)*cell,2,5);c.fillRect((x+.2)*cell,(y+.75)*cell,2,6)}}
 for(const [x,y] of s.walls){rounded(c,(x+.06)*cell,(y+.14)*cell,cell*.88,cell*.81,cell*.2,ink);rounded(c,(x+.1)*cell,(y+.07)*cell,cell*.8,cell*.65,cell*.18,'#87948a');c.fillStyle='#b3bfb2';c.fillRect((x+.23)*cell,(y+.18)*cell,cell*.3,cell*.06)}
 for(const e of s.exits){const x=(e.x+.5)*cell,y=(e.y+.52)*cell;c.beginPath();c.arc(x,y,cell*.4,0,Math.PI*2);c.fillStyle='#fff3bc55';c.fill();star(c,x,y,cell*.28);if(e.exact||e.min||e.max)text(c,conditionLabel(e),x,(e.y+.92)*cell,cell*.2)}
 for(const g of s.gates){rounded(c,(g.x+.1)*cell,(g.y+.13)*cell,cell*.8,cell*.8,cell*.2,'#758396');rounded(c,(g.x+.24)*cell,(g.y+.3)*cell,cell*.52,cell*.65,cell*.17,'#d8e5eb');text(c,conditionLabel(g),(g.x+.5)*cell,(g.y+.18)*cell,cell*.25,'#fff','#4a5b76')}
 for(const spt of s.spikes){const x=(spt.x+.5)*cell,y=(spt.y+.62)*cell;rounded(c,x-cell*.4,y,cell*.8,cell*.16,cell*.08,'#876d77');for(let n=0;n<Math.min(spt.power,4);n++){const px=x+(n-(Math.min(spt.power,4)-1)/2)*cell*.2;c.beginPath();c.moveTo(px-cell*.12,y+cell*.05);c.lineTo(px,y-cell*.34);c.lineTo(px+cell*.12,y+cell*.05);c.fillStyle='#b9758c';c.fill();c.strokeStyle='#7d4d68';c.lineWidth=1.5;c.stroke()}}
 const active=s.actors.find(a=>a.id===activeId);
 if(active){
  for(const spike of s.spikes){const dx=spike.x-active.x,dy=spike.y-active.y;if(Math.max(Math.abs(dx),Math.abs(dy))!==1)continue;
   const projected=clone(s),result=move(projected,active.id,dx,dy);if(!result.ok)continue;
   result.children.forEach((p,i)=>{c.beginPath();c.setLineDash([3,3]);c.arc((p.x+.5)*cell,(p.y+.5)*cell,cell*.29,0,Math.PI*2);c.strokeStyle='#fffbe2bb';c.lineWidth=2;c.stroke();c.setLineDash([]);text(c,String(i+1),(p.x+.5)*cell,(p.y+.5)*cell,cell*.2,'#fff7d8','#56654f')});
  }
 }
 const ordered=[...s.actors].sort((a,b)=>Number(a.id===activeId)-Number(b.id===activeId));
 for(const a of ordered){const dragging=a.id===activeId,{box}=actorLayout(a.x,a.y,cell,dragging,size,size);
  c.beginPath();c.ellipse((a.x+.5)*cell,(a.y+.9)*cell,cell*.26,cell*.06,0,0,Math.PI*2);c.fillStyle='#29483b30';c.fill();
  if(dragging){c.beginPath();c.ellipse((a.x+.5)*cell,(a.y+.55)*cell,cell*.45,cell*.42,0,0,Math.PI*2);c.strokeStyle=pulse?'#f1bb75':'#fff9d5';c.lineWidth=3;c.stroke()}
  if(!drawSprite(c,a.species,a.level,box)){c.beginPath();c.arc((a.x+.5)*cell,(a.y+.65)*cell,cell*.2,0,Math.PI*2);c.fillStyle='#fff4d9';c.fill();text(c,{dog:'犬',fish:'魚',frog:'蛙',penguin:'ペ'}[a.species],(a.x+.5)*cell,(a.y+.65)*cell,cell*.22,'#fff',ink)}
 }
 // Labels are drawn after all sprites so growing a character never covers its number.
 for(const a of ordered){const p=labelLayout(a.x,a.y,cell,a.id===activeId,size,size);text(c,a.level,p.x,p.y,p.size,a.id===activeId?'#fff1b7':'#fff',ink)}
}
function cResize(canvas,size,dpr){const target=Math.round(size*dpr);if(canvas.width!==target||canvas.height!==target){canvas.width=target;canvas.height=target}}
