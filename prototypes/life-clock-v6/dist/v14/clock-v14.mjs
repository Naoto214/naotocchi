import{render as old,sample}from'../v12/clock-v12.mjs';
import{layout}from'./layout.mjs';import{render as v13}from'../v13/clock-v13.mjs';
export * from '../v12/clock-v12.mjs';
let serial=0;
export function render(state=sample,{variant='C',crop='full'}={}){
 if(variant==='A') return old(state,{main:52,growth:1.1,roman:1.1,crop});
 if(variant==='B') return v13(state,{variant:'B',crop}).replaceAll('face-v13.webp','../v13/face-v13.webp');
 if(variant!=='C') throw Error('variant');
 let s=old(state,{main:52,growth:1,roman:1,crop});
 s=s.replace(/<g data-main-number="(\d+)">[\s\S]*?<\/g>/g,(_,n)=>{
 const o=layout[52][n],a=+n*Math.PI/6;
 return `<g data-main-number="${n}"><text x="${512+o.radius*Math.sin(a)}" y="${500-o.radius*Math.cos(a)}" dx="${o.dx}" dy="${o.dy}" fill="#EDF1F2" font-family='Georgia,serif' font-size="52" font-weight="400" text-anchor="middle" dominant-baseline="central" style="font-variant-numeric:lining-nums">${n}</text></g>`;
 });return s;
}
