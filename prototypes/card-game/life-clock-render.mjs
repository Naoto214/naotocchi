import {render,alignNumerals} from './life-clock/v23/clock-v23.mjs';
export {renderBack} from './life-clock/v23/clock-v23.mjs';
// V23 candidate: V22 artwork preserved, physical central-hand stacking and bearing.
const plate=new URL('./life-clock/v16/plate.webp',import.meta.url).href;
const occlusion=new URL('./life-clock/v16/occlusion.png',import.meta.url).href;
export function renderClock(state) {
 return render(state)
  .replace('aria-label="GAME EDITION B配置"', 'aria-label="人生の時計の表面"')
  .replaceAll('../v16/plate.webp',plate)
  .replaceAll('../v16/occlusion.png',occlusion);
}
export {alignNumerals};
