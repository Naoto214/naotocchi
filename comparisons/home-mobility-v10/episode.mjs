const get=id=>document.getElementById(id);
function draw(canvas, ticks, current, scale) {
  const {width:w,height:h}=canvas, ctx=canvas.getContext('2d');
  const points=ticks.flatMap(t=>[t.goal,...t.feet]);
  const xs=points.map(p=>p[0]*scale[0]),ys=points.map(p=>p[1]*scale[1]);
  const minX=Math.min(...xs),minY=Math.min(...ys);
  const spanX=Math.max(...xs)-minX,spanY=Math.max(...ys)-minY;
  const zoom=Math.min((w-48)/spanX,(h-48)/spanY);
  const locate=([x,y])=>[(w-spanX*zoom)/2+(x*scale[0]-minX)*zoom,(h-spanY*zoom)/2+(y*scale[1]-minY)*zoom];
  ctx.clearRect(0,0,w,h);
  const [dx,dy]=locate(current.dog),[gx,gy]=locate(current.goal);
  ctx.setLineDash([6,5]);ctx.strokeStyle='#a37168';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(dx,dy);ctx.lineTo(gx,gy);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#967341';
  for(const p of current.feet){const [x,y]=locate(p);ctx.beginPath();ctx.arc(x,y,3.7,0,Math.PI*2);ctx.fill();}
  ctx.strokeStyle='#963e35';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(gx-6,gy-6);ctx.lineTo(gx+6,gy+6);ctx.moveTo(gx+6,gy-6);ctx.lineTo(gx-6,gy+6);ctx.stroke();
  ctx.fillStyle='#214c40';ctx.beginPath();ctx.arc(dx,dy,6.5,0,Math.PI*2);ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.stroke();
}
try {
  const response=await fetch('./episode-data.json');
  if(!response.ok)throw Error('episode unavailable');
  const data=await response.json();
  const range=get('event');
  range.disabled=false;range.max=data.ticks.length-1;
  function select(index){
    const t=data.ticks[index];
    range.value=index;get('back').disabled=index===0;get('next').disabled=index===data.ticks.length-1;
    get('clock').textContent=(index+1)+' / '+data.ticks.length+'　ゲーム内 '+t.seconds.toFixed(2)+' 秒';
    const foot='犬の足元（'+t.dog.map(v=>v.toFixed(2)).join('、')+'）。';
    get('facts').textContent=t.accepted
      ? foot+'経路が成立し、犬は '+data.recoveryCss.toFixed(2)+' CSS px 歩きました。'
      : foot+'経路不成立。単独で8 CSS px進める方向は48方向中'+t.rays8+'。'+(t.ground?'元の目的地は歩行地形内です。':'元の目的地は歩行地形の外です。');
    draw(get('map'),data.ticks,t,data.scale);
  }
  range.addEventListener('input',()=>select(Number(range.value)));
  get('back').addEventListener('click',()=>select(Number(range.value)-1));
  get('next').addEventListener('click',()=>select(Number(range.value)+1));select(0);
} catch {
  get('facts').textContent='観測記録を読み込めませんでした。ページを開き直してください。';
}
