import {render as originalRender, sample} from '../clock.mjs';
export * from '../clock.mjs';
export const finishes={A:['#E7D9DF','#D5E3DD','#E8E1D1'],B:['#D5E2E8','#D5E2E8','#D5E2E8']};
let serial=0;
export function render(state=sample,{variant='A',...opts}={}){
  if(!['A','B','C'].includes(variant))throw Error('Unknown finish');
  const art='../assets/dial-art-v4.png';
  const detail={first:'216 390 220 220',second:'588 390 220 220'}[opts.crop];
  let svg=originalRender(state,{...opts,crop:detail?'growth':opts.crop,palette:'C1',profile:'classic',art});
  if(detail)svg=svg.replace(/viewBox="[^"]*"/,`viewBox="${detail}"`);
  if(variant==='C')return svg;
  const id='finish-'+(++serial), p=finishes[variant];
  // Saturation-derived mask: blue enamel receives the material treatment;
  // neutral silver leaves, sprouts and bezel retain their original artwork.
  const material=`<defs>
  <filter id="${id}-blue" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -2.4 0 2.4 0 0"/></filter>
  <mask id="${id}-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024" style="mask-type:alpha"><image href="${art}" width="1024" height="1024" filter="url(#${id}-blue)"/></mask>
  <linearGradient id="${id}-light"><stop offset="0" stop-color="#E3EDF1" stop-opacity="0"/><stop offset=".33" stop-color="#E3EDF1" stop-opacity="0"/><stop offset=".45" stop-color="#E3EDF1" stop-opacity=".04"/><stop offset=".49" stop-color="#E3EDF1" stop-opacity=".14"/><stop offset=".53" stop-color="#E3EDF1" stop-opacity=".07"/><stop offset=".64" stop-color="#E3EDF1" stop-opacity="0"/><stop offset="1" stop-color="#E3EDF1" stop-opacity="0"/></linearGradient>
  ${p.map((c,j)=>`<linearGradient id="${id}-sub${j}" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#F0F2F1"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${c}"/></linearGradient>`).join('')}
  </defs><g data-v5-material="blue-silver" mask="url(#${id}-mask)"><rect width="1024" height="1024" fill="#9BB6C8" opacity=".38"/><rect data-reflection="vertical-soft" width="1024" height="1024" fill="url(#${id}-light)"/></g>`;
  const img=`<image href="${art}" width="1024" height="1024"/>`;
  svg=svg.replace(img,img+material);
  let j=0;
  svg=svg.replaceAll('fill="#CCDDE6"',()=>`fill="url(#${id}-sub${j++})"`);
  return svg;
}
