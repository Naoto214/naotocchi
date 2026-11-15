import {renderCard} from './render.mjs';import {layout} from './fit.mjs';
const d=await(await fetch('data.json')).json(),cards=[...d.cards,null],map=Object.fromEntries(d.cards.map(c=>[c.id,c]));
const frame=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
document.getElementById('run').onclick=async()=>{const result={widths:[320,375,390,430],cards:459,egg:1,checks:0,issues:[],detailMinPx:999,normalMinTitlePx:999};await document.fonts.ready;
 for(const width of result.widths)for(const surface of ['collection','hand','board','detail','detail-small']){
  const size=surface==='collection'?(width-64)/3:surface==='hand'?48:surface==='board'?64:surface==='detail-small'?(width-52)/3:320;
  const batch=document.getElementById('batch');batch.innerHTML=cards.map(c=>`<div class="fixture" style="width:${size}px;height:${size*1.5}px">${renderCard(c,{detail:surface.startsWith('detail'),catalog:map,egg:!c,eggData:d.egg})}</div>`).join('');await frame();layout(batch);await frame();
  for(const el of batch.querySelectorAll('.v10-card')){const id=el.dataset.key,rect=el.getBoundingClientRect(),title=el.querySelector('.v8-title'),t=title.getBoundingClientRect(),span=title.querySelector('span').getBoundingClientRect(),art=el.querySelector('.v8-art').getBoundingClientRect(),cost=el.querySelector('.v8-cost')?.getBoundingClientRect(),aux=el.querySelector('.v8-aux')?.getBoundingClientRect();const errors=[];
   if(span.right>t.right+.6||span.left<t.left-.6)errors.push('name-overflow');if(getComputedStyle(title).whiteSpace!=='nowrap')errors.push('name-wrap');if(t.bottom>art.top+.6||(aux&&aux.bottom>art.top+.6))errors.push('name-art-overlap');if(cost&&(cost.right>rect.right+1||cost.top<rect.top-1||cost.bottom>t.top+.6))errors.push('cost-overlap');
   const copy=el.querySelector('.v10-copy');if(surface.startsWith('detail')){if(!copy)errors.push('missing-copy');else{if(copy.scrollHeight>copy.clientHeight+1)errors.push('copy-overflow');result.detailMinPx=Math.min(result.detailMinPx,Number.parseFloat(getComputedStyle(copy).fontSize));const text=copy.innerText;if(id!=='egg'&&!text.includes(map[id].text))errors.push('changed-effect');}}else{if(copy)errors.push('normal-copy');result.normalMinTitlePx=Math.min(result.normalMinTitlePx,Number.parseFloat(getComputedStyle(title).fontSize));}
   if(errors.length)result.issues.push({width,surface,id,errors});result.checks++;
  }
  document.getElementById('result').textContent=JSON.stringify({...result,status:'running'},null,2);
 }
 document.getElementById('result').textContent=JSON.stringify({...result,status:'complete'},null,2);
};
