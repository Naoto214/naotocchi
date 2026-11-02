import {render,alignNumerals} from './life-clock/v24/clock-v24.mjs';
export {renderBack} from './life-clock/v24/clock-v24.mjs';
// V24 candidate: V23 stacking and dimensions; tapered central blades and refined metal.
const plate=new URL('./life-clock/v16/plate.webp',import.meta.url).href;
const occlusion=new URL('./life-clock/v16/occlusion.png',import.meta.url).href;
export function renderClock(state){return render(state).replaceAll('../v16/plate.webp',plate).replaceAll('../v16/occlusion.png',occlusion);}
export {alignNumerals};
