import {render as original,sample} from '../clock.mjs';
import {render as v5} from '../v5/clock-v5.mjs';
export * from '../clock.mjs';
export const variants={v5:{name:'C · VERSION 5 現行',legacy:true},weak:{name:'青銀＋縦の光・弱',light:.06,metal:'C',bezel:1},medium:{name:'青銀＋縦の光・中',light:.18,metal:'C',bezel:1},metalA:{name:'A · 淡いメタリック3色',light:.18,metal:'A',bezel:1.5},metalB:{name:'B · やや濃いメタリック3色',light:.18,metal:'B',bezel:1.5},bezel1:{name:'銀ベゼル・現行相当幅',light:.18,metal:'A',bezel:1},bezel15:{name:'銀ベゼル・1.5倍',light:.18,metal:'A',bezel:1.5},bezel2:{name:'銀ベゼル・2倍',light:.18,metal:'A',bezel:2},candidate:{name:'VERSION 6 · 第一候補',light:.18,metal:'A',bezel:1.5}};
export const finishes={A:['#D9BDC5','#B9CFC3','#DCD1B9'],B:['#BC929F','#8EB2A0','#C4B18D'],C:['#E7D9DF','#D5E3DD','#E8E1D1']};
let serial=0;
export function render(state=sample,{variant='candidate',crop='full',sameScale=false}={}){
 const opt=variants[variant];if(!opt)throw Error('Unknown finish');
 if(opt.legacy){const legacy=v5(state,{variant:'A',crop});return sameScale&&crop==='full'?legacy.replace(/viewBox="[^"]*"/,'viewBox="-24 -24 1072 1072"'):legacy;}
 const art='../assets/dial-art-v4.png',id='v6-'+(++serial),p=finishes[opt.metal];
 let s=original(state,{art,palette:'C1',profile:'classic',crop:crop==='first'||crop==='second'?'growth':crop});
 const material=`<defs>
 <filter id="${id}-maskfilter" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -4 0 4 0 -.25"/></filter>
 <filter id="${id}-tone" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values=".65 .12 .05 0 .21 .05 .75 .05 0 .20 0 .07 .70 0 .17 0 0 0 1 0"/></filter>
 <mask id="${id}-mask" style="mask-type:alpha"><image href="${art}" width="1024" height="1024" filter="url(#${id}-maskfilter)"/></mask>
 <linearGradient id="${id}-light"><stop stop-color="#D5E5E9" stop-opacity="0"/><stop offset=".28" stop-color="#D5E5E9" stop-opacity="0"/><stop offset=".43" stop-color="#D5E5E9" stop-opacity="${opt.light*.5}"/><stop offset=".50" stop-color="#D5E5E9" stop-opacity="${opt.light}"/><stop offset=".57" stop-color="#D5E5E9" stop-opacity="${opt.light*.5}"/><stop offset=".72" stop-color="#D5E5E9" stop-opacity="0"/><stop offset="1" stop-color="#D5E5E9" stop-opacity="0"/></linearGradient>
 <linearGradient id="${id}-silver" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#929DA9"/><stop offset=".2" stop-color="#F6F7F8"/><stop offset=".42" stop-color="#A6B0BA"/><stop offset=".58" stop-color="#E7EBEE"/><stop offset=".78" stop-color="#919EAC"/><stop offset="1" stop-color="#E9ECEF"/></linearGradient>
 ${p.map((c,j)=>`<linearGradient id="${id}-sub${j}" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#F3F2EF"/><stop offset=".24" stop-color="${c}"/><stop offset=".48" stop-color="${c}"/><stop offset=".61" stop-color="#F0EEE8"/><stop offset=".8" stop-color="${c}"/><stop offset="1" stop-color="${c}"/></linearGradient>`).join('')}
 </defs><g data-v6-blue="true" mask="url(#${id}-mask)"><image href="${art}" width="1024" height="1024" filter="url(#${id}-tone)"/><rect data-reflection="vertical-soft" width="1024" height="1024" fill="url(#${id}-light)"/></g>`;
 const img=`<image href="${art}" width="1024" height="1024"/>`;s=s.replace(img,img+material);
 const coords=[[326,500],[698,500],[512,688]];let j=0;
 s=s.replaceAll('fill="#CCDDE6"',()=>`fill="url(#${id}-sub${j++})"`);
 if(opt.metal!=='C')coords.forEach(([x,y],i)=>{
  const start=`<circle data-color-ring="${i}"`;
  const rings=Array.from({length:39},(_,k)=>`<circle cx="${x}" cy="${y}" r="${8+k*2}" fill="none" stroke="${k%2?'#FFFFFF':'#364450'}" stroke-opacity="${k%2?.17:.12}" stroke-width=".65"/>`).join('');
  s=s.replace(start,`<g data-circular-finish="${i}">${rings}<circle cx="${x}" cy="${y}" r="94" fill="none" stroke="url(#${id}-silver)" stroke-width="5"/><circle cx="${x}" cy="${y}" r="91" fill="none" stroke="#53616B" stroke-opacity=".65" stroke-width="1"/></g>`+start);
 });
 // Inner edge stays at radius 473; expand outward only. Original art has a ~20-unit silver rim.
 const width=20*opt.bezel,outer=473+width;
 const bezel=`<g data-bezel-width="${width}"><circle cx="512" cy="495" r="${473+width/2}" fill="none" stroke="url(#${id}-silver)" stroke-width="${width}"/><circle cx="512" cy="495" r="${outer}" fill="none" stroke="#657380" stroke-width="1.5"/><circle cx="512" cy="495" r="${outer-2.5}" fill="none" stroke="#F8FAFB" stroke-width="1"/><circle cx="512" cy="495" r="474" fill="none" stroke="#F5F7F8" stroke-width="2"/><circle cx="512" cy="495" r="472" fill="none" stroke="#263D4A" stroke-width="1"/></g>`;
 s=s.replace('<g data-main-ticks=',bezel+'<g data-main-ticks=');
 if(crop==='first'||crop==='second')s=s.replace(/viewBox="[^"]*"/,`viewBox="${crop==='first'?'216 390 220 220':'588 390 220 220'}"`);
 if(crop==='full'){const pad=sameScale?24:Math.max(0,outer-495+4);s=s.replace(/viewBox="[^"]*"/,`viewBox="${-pad} ${-pad} ${1024+2*pad} ${1024+2*pad}"`);}
 return s;
}
