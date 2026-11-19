import {layout} from './fit.mjs';
let pending=false;
const schedule=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;layout();});};
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
new ResizeObserver(schedule).observe(document.documentElement);
window.addEventListener('resize',schedule);document.fonts.ready.then(schedule);schedule();
