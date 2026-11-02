import{render as old,sample}from'../v12/clock-v12.mjs';
import{layout}from'./layout.mjs';import{artwork}from'./decoration.mjs';
export * from '../v12/clock-v12.mjs';
let serial=0;
export function render(state=sample,{variant='B',crop='full',baked=true}={}){
 if(!['A','B'].includes(variant))throw Error('variant');
 if(variant==='A')return old(state,{main:52,growth:1.1,roman:1.1,crop});
 let s=old(state,{main:52,growth:1,roman:1,crop});
 const start=s.indexOf('<image href="../assets/dial-art-v4.png"'),end=s.indexOf('<g data-bezel-width=');
 const face=s.slice(start,end);const transformed=baked?[...face.matchAll(/<defs>[\s\S]*?<\/defs>/g)].map(m=>m[0]).join('')+'<image data-v13-baked="true" href="face-v13.webp" width="1024" height="1024"/>':artwork(face,'contour13-'+serial++);s=s.slice(0,start)+transformed+s.slice(end);
 s=s.replace(/<g data-main-number="(\d+)">[\s\S]*?<\/g>/g,(_,n)=>{const o=layout[52][n],a=+n*Math.PI/6;return `<g data-main-number="${n}"><text x="${512+o.radius*Math.sin(a)}" y="${500-o.radius*Math.cos(a)}" dx="${o.dx}" dy="${o.dy}" fill="#EDF1F2" font-family='Georgia,serif' font-size="52" font-weight="400" text-anchor="middle" dominant-baseline="central" style="font-variant-numeric:lining-nums">${n}</text></g>`;});return s;
}
