import {render as v7,sample,centers} from '../v7/clock-v7.mjs';
export * from '../clock.mjs';
export const variants={reference:{name:'V7 · 修正版・細い光・標準'},A:{name:'V8 A · 深色メタリック・控えめ',strength:.55},B:{name:'V8 B · 深色メタリック・標準',strength:.8},C:{name:'V8 C · 深色メタリック・高級仕上げ',strength:1}};
const metals=[['#4B2138','#75354C','#A76E7C'],['#103D35','#1D695B','#579788'],['#705029','#A48243','#D2B87B']];
const handMetals=[2,0,1,0,1,2];
const mix=(a,b,t)=>'#'+[1,3,5].map(i=>Math.round(parseInt(a.slice(i,i+2),16)*(1-t)+parseInt(b.slice(i,i+2),16)*t).toString(16).padStart(2,'0')).join('');
export function render(state=sample,{variant='B',crop='full'}={}){
 const opt=variants[variant];if(!opt)throw Error('Unknown finish');
 let s=v7(state,{variant:'soft',crop});if(variant==='reference')return s;
 const id=s.match(/id="(v6-\d+)-light"/)[1],k=opt.strength;
 metals.forEach(([dark,base,hi],j)=>{
  // A broad color-bearing reflection, never a white band. Geometry remains V7.
  s=s.replace(new RegExp(`<linearGradient id="${id}-sub${j}"[\\s\\S]*?<\\/linearGradient>`),`<linearGradient id="${id}-sub${j}" x1=".1" y1="0" x2=".9" y2="1"><stop stop-color="${mix(base,dark,k*.7)}"/><stop offset=".22" stop-color="${base}"/><stop offset=".46" stop-color="${mix(base,hi,k*.8)}"/><stop offset=".64" stop-color="${base}"/><stop offset="1" stop-color="${mix(base,dark,k*.8)}"/></linearGradient>`);
  const [x,y]=centers[j+3];
  const rays=Array.from({length:180},(_,i)=>{const a=i*Math.PI/90,r=86;return `<path d="M ${x+10*Math.cos(a)} ${y+10*Math.sin(a)} L ${x+r*Math.cos(a)} ${y+r*Math.sin(a)}" stroke="${i%2?hi:dark}" stroke-opacity="${(.035+k*.025).toFixed(3)}" stroke-width=".28"/>`;}).join('');
  const depth=`<defs><radialGradient id="${id}-depth${j}"><stop stop-color="${hi}" stop-opacity="${k*.13}"/><stop offset=".68" stop-color="${base}" stop-opacity="0"/><stop offset="1" stop-color="${dark}" stop-opacity="${k*.5}"/></radialGradient></defs><g data-sunray="${j}">${rays}<circle cx="${x}" cy="${y}" r="87" fill="url(#${id}-depth${j})"/><circle cx="${x}" cy="${y}" r="87" fill="none" stroke="${dark}" stroke-opacity="${.4+k*.25}" stroke-width="2.5"/></g>`;
  s=s.replace(new RegExp(`<g data-fine-metal="true">[\\s\\S]*?<\\/g><circle cx="${x}" cy="${y}" r="87"[^>]*\/>`),depth);
  s=s.replace(new RegExp(`(<circle data-color-ring="${j}"[^>]*stroke=")[^"]+`),`$1${mix(base,hi,.65)}`);
 });
 // Dial inscriptions keep all characters and coordinates. Warm silver maintains contrast.
 const start=s.indexOf('<g data-subdial="0">'),end=s.indexOf('<g data-hand=');
 s=s.slice(0,start)+s.slice(start,end).replaceAll('fill="#234154"','fill="#F0EBE1"').replaceAll('stroke="#537082"','stroke="#D9DCD7"').replaceAll('stroke="#BE9650"','stroke="#E3D3AC"')+s.slice(end);
 let defs='';
 s=s.replace(/<g data-hand="(\d)"[\s\S]*?<\/g>/g,(group,n)=>{
  const i=+n,[x,y]=centers[i],[dark,base,hi]=metals[handMetals[i]],w=+group.match(/data-width="([^"]+)/)[1];
  // Gradient uses the same local coordinate frame as the rotated hand: edge/facet/ridge.
  const grad=`${id}-hand${i}`;
  defs+=`<linearGradient id="${grad}" gradientUnits="userSpaceOnUse" x1="${x-w/2}" y1="${y}" x2="${x+w/2}" y2="${y}"><stop stop-color="${dark}"/><stop offset=".2" stop-color="${base}"/><stop offset=".46" stop-color="${base}"/><stop offset=".50" stop-color="${mix(base,hi,k)}"/><stop offset=".56" stop-color="${mix(base,hi,k*.7)}"/><stop offset=".64" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/></linearGradient>`;
  return group.replace(/<path /,`<path data-metal-hand="${i}" `).replaceAll(/fill="#[A-Fa-f0-9]+"/g,`fill="url(#${grad})"`).replaceAll('stroke="#EFF1EA"',`stroke="${mix(hi,'#E0E4DE',.4)}"`);
 });
 return s.replace('</svg>',`<defs>${defs}</defs></svg>`);
}
