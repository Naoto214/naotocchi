// Rebuild transparent SVG snapshots without copying or recoloring the raster assets.
import {writeFileSync} from 'node:fs';
import {render,renderBack} from './clock-v19.mjs';
export const snapshotState={round:10,firstTime:10,secondTime:10,firstGrowth:65,secondGrowth:40,end:10};
writeFileSync(new URL('front.svg',import.meta.url),render(snapshotState));
writeFileSync(new URL('back.svg',import.meta.url),renderBack());
