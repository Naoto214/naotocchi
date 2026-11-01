import {render,alignNumerals} from './life-clock/v17/clock-v17.mjs';
// Preserve the adopted renderer; resolve only its page-relative image URLs.
const plate=new URL('./life-clock/v16/plate.webp',import.meta.url).href;
const occlusion=new URL('./life-clock/v16/occlusion.png',import.meta.url).href;
export function renderClock(state){return render(state,{variant:'A'}).replaceAll('../v16/plate.webp',plate).replaceAll('../v16/occlusion.png',occlusion);}
export {alignNumerals};
