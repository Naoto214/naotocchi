import {render,alignNumerals} from './life-clock/v18/clock-v18.mjs';
export {renderBack} from './life-clock/v18/clock-v18.mjs';
// V18 wraps the immutable adopted renderer and resolves its image URLs.
const plate=new URL('./life-clock/v16/plate.webp',import.meta.url).href;
const occlusion=new URL('./life-clock/v16/occlusion.png',import.meta.url).href;
export function renderClock(state){return render(state).replaceAll('../v16/plate.webp',plate).replaceAll('../v16/occlusion.png',occlusion);}
export {alignNumerals};
