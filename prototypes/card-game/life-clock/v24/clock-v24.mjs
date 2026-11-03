import {render as v23} from '../v23/clock-v23.mjs';
export {alignNumerals,renderBack} from '../v23/clock-v23.mjs';

// Same V23 mechanical/semantic contract; only central blade finish and bearing.
const metals=[['#705029','#A48243','#D2B87B'],['#4B2138','#75354C','#A76E7C'],['#103D35','#1D695B','#579788']];
export function render(state){
 let svg=v23(state),defs='';
 const id=svg.match(/id="(v6-\d+)-light"/)[1]+'-v24';
 svg=svg.replace(/<g data-hand="([012])"[^]*?<\/g>/g,(group,n)=>{
  const i=+n,w=Number(group.match(/data-width="([^"]+)"/)[1]),len=Number(group.match(/data-length="([^"]+)"/)[1]);
  const [dark,base,light]=metals[i],tip=500-len;
  // Preserve maximum width/length. Broad shoulders near the root replace the
  // former nearly parallel sides. Long tapered facets meet at the original tip.
  const shape=i===0
   ?`M ${512-w/2} 532 L ${512-w/2} 484 L 510.2 ${tip+28} L 512 ${tip} L 513.8 ${tip+28} L ${512+w/2} 484 L ${512+w/2} 532 Z`
   :`M ${512-w*.24} 519 L ${512-w/2} ${500-(i===2?55:42)} L ${512-w*.29} ${500-len*.62} L 512 ${tip} L ${512+w*.29} ${500-len*.62} L ${512+w/2} ${500-(i===2?55:42)} L ${512+w*.24} 519 Z`;
  defs+=`<linearGradient id="${id}-blade${i}" gradientUnits="userSpaceOnUse" x1="${512-w/2}" y1="500" x2="${512+w/2}" y2="500"><stop stop-color="${dark}"/><stop offset=".12" stop-color="${base}"/><stop offset=".46" stop-color="${light}"/><stop offset=".5" stop-color="${base}"/><stop offset=".88" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/></linearGradient>`;
  const blade=`<path data-v24-blade="true" d="${shape}" fill="url(#${id}-blade${i})" stroke="${dark}" stroke-width="${i===0?.65:.8}" stroke-linejoin="round"/>`;
  const ridge=`<path data-v24-ridge="true" d="M 512 ${tip+12} L 512 483" fill="none" stroke="${light}" stroke-width="${i===0?.45:.65}" stroke-opacity=".55" stroke-linecap="round"/>`;
  return group.replace(/<path[^>]*\/>/,blade+ridge);
 });
 // Keep all bearing dimensions and the same shared center; soften the broad
 // white band into a fine polished bevel, with a restrained steel pin highlight.
 defs+=`<linearGradient id="${id}-bearing" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#EDF3F6"/><stop offset=".22" stop-color="#B8C7D0"/><stop offset=".46" stop-color="#E5EDF2"/><stop offset=".54" stop-color="#B4C3CE"/><stop offset=".82" stop-color="#8195A3"/><stop offset="1" stop-color="#CAD7DF"/></linearGradient><radialGradient id="${id}-pin" cx=".32" cy=".25"><stop stop-color="#F0F5F7"/><stop offset=".4" stop-color="#CBD9E2"/><stop offset="1" stop-color="#718796"/></radialGradient>`;
 svg=svg.replace(/<g data-v23-bearing="true">[^]*?<\/g>/,g=>g.replace(/v6-\d+-v23-steel/g,id+'-bearing').replace(/v6-\d+-v23-pin/g,id+'-pin').replace('stroke-width=".9"','stroke-width=".65"'));
 return svg.replace('</svg>',`<defs data-v24-defs="true">${defs}</defs></svg>`);
}
