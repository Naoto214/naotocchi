const $=id=>document.getElementById(id),data=await(await fetch('home-c-comparison-data.json')).json();
const images=new Map();async function image(src){if(!images.has(src)){const i=new Image();i.src=src;images.set(src,i.decode().then(()=>i));}return images.get(src);}
for(const c of data.candidates){const f=document.createElement('figure');f.dataset.candidate=c.id;const h=document.createElement('h2');h.textContent=c.name;const canvas=document.createElement('canvas');canvas.id='canvas-'+c.id;const cap=document.createElement('figcaption');cap.textContent=c.note+' ';const link=document.createElement('a');link.id='save-'+c.id;link.textContent='画像を保存';cap.append(link);f.append(h,canvas,cap);$('gallery').append(f);}
let serial=0;
async function render(){const ticket=++serial,mode=$('mode').value,w=Number($('width').value);$('status').textContent='画像を準備中…';
try{for(const c of data.candidates){const bg=await image(c.src);const cast=mode==='background'?[]:c.casts[mode];await Promise.all(cast.map(a=>image(a.src)));if(ticket!==serial)return;
const canvas=$('canvas-'+c.id);canvas.width=w;canvas.height=w*1.5;const ctx=canvas.getContext('2d');ctx.drawImage(bg,0,0,w,canvas.height);
for(const a of [...cast].sort((a,b)=>a.y-b.y)){const img=await image(a.src),box=window.NaotocchiCastBounds?.[a.src]?.box||[0,0,128,128],size=w*a.size,fx=a.x*w,fy=a.y*canvas.height;ctx.save();ctx.fillStyle='rgba(32,25,16,.22)';ctx.filter='blur(1px)';ctx.beginPath();ctx.ellipse(fx,fy,size*.27,size*.055,0,0,Math.PI*2);ctx.fill();ctx.restore();ctx.drawImage(img,fx-size*(box[0]+box[2])/256,fy-size*box[3]/128,size,size);}
canvas.dataset.mode=mode;canvas.dataset.count=String(cast.length);const link=$('save-'+c.id);link.href=canvas.toDataURL('image/png');link.download='home-'+c.id+'-'+mode+'-'+w+'.png';}
$('status').textContent=`4案 · ${w}px · ${$('mode').selectedOptions[0].textContent} · 静止合成（Cの移動は未実装）`;
}catch(e){$('status').textContent='画像を読み込めませんでした: '+e.message;}}
$('mode').onchange=render;$('width').onchange=render;$('all').onclick=()=>document.body.classList.remove('pair');$('bc').onclick=()=>document.body.classList.add('pair');
const q=new URLSearchParams(location.search);if(['background','egg','six','twentyeight'].includes(q.get('mode')))$('mode').value=q.get('mode');if(['320','375','390','430'].includes(q.get('width')))$('width').value=q.get('width');if(q.has('sheet'))document.body.classList.add('sheet');if(q.has('bc'))document.body.classList.add('pair');await render();
