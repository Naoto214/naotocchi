import {writeFileSync} from 'node:fs';
import {render,renderBack} from './clock-v23.mjs';
import {render as v24} from '../v24/clock-v24.mjs';
import {sample} from '../clock.mjs';
const save=(name,s)=>writeFileSync(new URL(name,import.meta.url),s);
save('front.svg',render(sample));save('back.svg',renderBack());
const panel=(svg,x)=>svg.replace('<svg ',`<svg x="${x}" y="65" width="576" height="576" `);
save('comparison.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="1152" height="650" viewBox="0 0 1152 650"><rect width="1152" height="650" fill="#0e1b26"/><g fill="#e7edf1" font-family="sans-serif" font-size="24"><text x="32" y="40">V23 — ADOPTED</text><text x="608" y="40">V24 — NOT ADOPTED</text></g>${panel(render(sample),0)}${panel(v24(sample),576)}</svg>`);
