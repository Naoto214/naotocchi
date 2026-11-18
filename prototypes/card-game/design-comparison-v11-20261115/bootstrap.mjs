import {layout} from './fit.mjs';
if(new URLSearchParams(location.search).get('design')!=='official'){
 document.documentElement.setAttribute('data-candidate','');let pending=false;
 const schedule=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;layout();});};
 new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
 new ResizeObserver(schedule).observe(document.documentElement);window.addEventListener('resize',schedule);document.fonts.ready.then(schedule);schedule();
}
