import {render as v22} from '../v19/clock-v19.mjs';
export {alignNumerals,renderBack} from '../v19/clock-v19.mjs';

// Visual equivalents only: gold=round, red=first-seat time, green=second-seat time.
// Keep every angle, silhouette, material and non-central element from V22.
export function render(state){
 let svg=v22(state);
 const id=svg.match(/id="(v6-\d+)-light"/)[1]+'-v23';
 const pattern=/<g data-hand="([012])"[^]*?<\/g>/g;
 const hands=new Map([...svg.matchAll(pattern)].map(m=>[+m[1],m[0]]));
 if(hands.size!==3)throw Error('Expected three central clock hands');
 let defs='';
 for(const [i,group] of hands){
  const angle=Number(group.match(/data-angle="([^"]+)"/)[1])*Math.PI/180;
  const height=[3.2,2.2,1.2][i],dx=height*.6,dy=height;
  // Inverse rotation keeps light top-left in screen coordinates at every angle.
  const x=dx*Math.cos(angle)+dy*Math.sin(angle),y=-dx*Math.sin(angle)+dy*Math.cos(angle);
  defs+=`<filter id="${id}-shadow${i}" x="-100%" y="-20%" width="300%" height="140%" color-interpolation-filters="sRGB"><feDropShadow dx="${x}" dy="${y}" stdDeviation="${height*.35}" flood-color="#0C1922" flood-opacity=".38"/></filter>`;
  hands.set(i,group.replace(' transform=',` data-visual-role="${['second','minute','hour'][i]}" filter="url(#${id}-shadow${i})" transform=`));
 }
 let index=0;svg=svg.replace(pattern,()=>hands.get([2,1,0][index++]));
 defs+=`<linearGradient id="${id}-steel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#F8FAFC"/><stop offset=".35" stop-color="#DDE6EC"/><stop offset=".62" stop-color="#8C9EAC"/><stop offset="1" stop-color="#DCE5EB"/></linearGradient><radialGradient id="${id}-pin" cx=".32" cy=".25"><stop stop-color="#FFFFFF"/><stop offset=".48" stop-color="#DFE8EE"/><stop offset="1" stop-color="#718796"/></radialGradient>`;
 const cap=`<g data-v23-bearing="true"><circle cx="513" cy="501.5" r="17" fill="#102331" opacity=".3"/><circle cx="512" cy="500" r="17" fill="url(#${id}-steel)" stroke="#637987" stroke-width="1"/><circle cx="512" cy="500" r="13" fill="url(#${id}-steel)" stroke="#EDF3F7" stroke-width=".9"/><circle cx="512" cy="500" r="6" fill="url(#${id}-pin)" stroke="#708695" stroke-width=".8"/></g>`;
 const old='<circle cx="512" cy="500" r="17" fill="#DBE3E8" stroke="#FCFDFD" stroke-width="3"/>';
 if(!svg.includes(old))throw Error('Expected V22 central bearing');
 return svg.replace(old,cap).replace('</svg>',`<defs data-v23-defs="true">${defs}</defs></svg>`);
}
