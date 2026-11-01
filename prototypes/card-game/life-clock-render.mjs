import {render,alignNumerals} from './life-clock/v19/clock-v19.mjs';
export {renderBack} from './life-clock/v19/clock-v19.mjs';
// Canonical adopted design: V18 + V19 hand stacking; provenance.json records approval.
const plate=new URL('./life-clock/v16/plate.webp',import.meta.url).href;
const occlusion=new URL('./life-clock/v16/occlusion.png',import.meta.url).href;
export function renderClock(state){return render(state).replaceAll('../v16/plate.webp',plate).replaceAll('../v16/occlusion.png',occlusion);}
export {alignNumerals};
