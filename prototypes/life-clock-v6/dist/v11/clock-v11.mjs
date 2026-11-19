import {render as v10,sample} from '../v10/clock-v10.mjs';
import {layout} from './layout.mjs';
export * from '../v10/clock-v10.mjs';
export {layout};
export const variants={A:{name:'A · ＋15% 修正前',size:46},B:{name:'B · ＋15% 余白調整',size:46},C:{name:'C · ＋20% 余白調整',size:48},D:{name:'D · ＋25% 余白調整',size:50},E:{name:'E · ＋30% 余白調整',size:52}};
export function render(state=sample,{variant='B',crop='full'}={}){
 if(!variants[variant])throw Error('Unknown variant');
 const custom={upper:'105 65 500 320',leaves:'90 225 280 260'}[crop];
 let s=v10(state,{variant:'C',crop:custom?'full':crop});
 if(variant!=='A')s=s.replace(/<g data-main-number="(\d+)">[\s\S]*?<\/g>/g,(_,value)=>{
  const n=+value,o=layout[variant][n],a=n*Math.PI/6,x=512+o.radius*Math.sin(a),y=500-o.radius*Math.cos(a);
  return `<g data-main-number="${n}"><text x="${x}" y="${y}" dx="${o.dx}" dy="${o.dy}" fill="#EDF1F2" font-family="Georgia,serif" font-size="${o.size}" font-weight="400" text-anchor="middle" dominant-baseline="central" style="font-variant-numeric:lining-nums">${n}</text></g>`;
 });
 if(custom)s=s.replace(/viewBox="[^"]+"/,`viewBox="${custom}"`);
 return s;
}
