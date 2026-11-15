(async()=>{
 const seed=await fetch('release-qa-seed.json').then(r=>r.json());const key='naotocchi-movement-v1-'+MOVEMENT_VARIANT;
 // Seed only this comparison. No production save keys are read or overwritten.
 if(!localStorage.getItem(key)){localStorage.setItem(key,JSON.stringify(seed));location.reload();return;}
 const params=new URLSearchParams(location.search),setup={count:Number(params.get('count')||4),stage:Number(params.get('stage')||5),item:params.get('item')!=='0',region:params.get('region')||'city',speech:params.get('speech')==='1',notice:params.get('notice')==='1'};
 const wait=()=>{if(!window.MovementQA||!window.HomeReleaseQA)return setTimeout(wait,100);document.fonts.ready.then(()=>MovementQA.setup(setup));};wait();
 const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:1400';document.body.appendChild(canvas);let debug=params.get('debug')==='1',last=0;
 window.addEventListener('message',e=>{if(e.origin!==location.origin)return;if(e.data?.type==='debug')debug=!!e.data.value;});
 function draw(t){requestAnimationFrame(draw);if(t-last<200)return;last=t;canvas.width=innerWidth;canvas.height=innerHeight;if(!debug||!window.MovementQA)return;const c=canvas.getContext('2d'),d=MovementQA.detail();if(!d.presentation)return;const p=d.presentation,s=d.stage;const project=q=>({x:p.x+(s.left+q.x-p.x)*p.scaleX,y:p.y+(s.top+q.y-p.y)*p.scaleY});
 c.font='11px sans-serif';for(const a of d.actors){const b=a.bounds,tl=project({x:b.left,y:b.top}),br=project({x:b.right,y:b.bottom});c.strokeStyle=a.kind==='pet'?'#00ffff':'#ffff00';c.lineWidth=1;c.strokeRect(tl.x,tl.y,br.x-tl.x,br.y-tl.y);c.fillStyle=c.strokeStyle;c.fillText(a.key,tl.x+2,tl.y+12);const k=a.depth*p.bodyScale,ink=a.ink;if(ink){c.strokeStyle='#ff55bb';c.strokeRect(a.foot.x-(ink.left??ink.side)*k,a.foot.y-ink.up*k,((ink.left??ink.side)+(ink.right??ink.side))*k,(ink.up+ink.down)*k);}c.fillRect(a.foot.x-2,a.foot.y-2,4,4);}
 }requestAnimationFrame(draw);
})();
