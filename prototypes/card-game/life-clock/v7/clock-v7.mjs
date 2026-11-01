import {render as v6,sample} from '../v6/clock-v6.mjs';
export * from '../clock.mjs';
export const variants={reference:{name:'V6 · 濃いB（比較基準）'},light:{name:'V6の濃いB＋細い光＋2倍ベゼル',light:.55},soft:{name:'修正版 · 細い光・標準',light:.38,refined:true},candidate:{name:'修正版 · 細い光・強調',light:.55,refined:true}};
export function render(state=sample,{variant='candidate',crop='full'}={}){
 const opt=variants[variant];if(!opt)throw Error('Unknown variant');
 let s=v6(state,{variant:'metalB',crop,sameScale:true});if(variant==='reference')return s;
 const id=s.match(/id="(v6-\d+)-light"/)[1];
 s=s.replace(new RegExp(`<linearGradient id="${id}-light">[\\s\\S]*?<\\/linearGradient>`),`<linearGradient data-narrow-light="true" id="${id}-light"><stop stop-color="#DDEBF0" stop-opacity="0"/><stop offset=".43" stop-color="#DDEBF0" stop-opacity="0"/><stop offset=".475" stop-color="#DDEBF0" stop-opacity=".07"/><stop offset=".491" stop-color="#DDEBF0" stop-opacity="${opt.light*.58}"/><stop offset=".5" stop-color="#DDEBF0" stop-opacity="${opt.light}"/><stop offset=".509" stop-color="#DDEBF0" stop-opacity="${opt.light*.58}"/><stop offset=".525" stop-color="#DDEBF0" stop-opacity=".07"/><stop offset=".57" stop-color="#DDEBF0" stop-opacity="0"/><stop offset="1" stop-color="#DDEBF0" stop-opacity="0"/></linearGradient>`);
 // Preserve the inner radius and common viewBox; grow the silver band outward.
 s=s.replace('data-bezel-width="30"','data-bezel-width="40"').replace('r="488" fill="none"','r="493" fill="none"').replace('stroke-width="30"','stroke-width="40"').replace('r="503" fill="none"','r="513" fill="none"').replace('r="500.5" fill="none"','r="510.5" fill="none"');
 if(opt.refined){
  const colors=[['#A88994','#D6C2C9','#715963'],['#819E91','#C4D2C9','#536F65'],['#B3A48A','#DDD5C5','#82745F']];
  colors.forEach(([base,hi,shade],j)=>{s=s.replace(new RegExp(`<linearGradient id="${id}-sub${j}"[\\s\\S]*?<\\/linearGradient>`),`<linearGradient id="${id}-sub${j}" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="${shade}"/><stop offset=".15" stop-color="${base}"/><stop offset=".38" stop-color="${base}"/><stop offset=".53" stop-color="${hi}"/><stop offset=".65" stop-color="${base}"/><stop offset=".87" stop-color="${base}"/><stop offset="1" stop-color="${shade}"/></linearGradient>`);});
  [[326,500],[698,500],[512,688]].forEach(([x,y],j)=>{
   const fine=Array.from({length:104},(_,k)=>`<circle cx="${x}" cy="${y}" r="${(7+k*.76).toFixed(2)}" fill="none" stroke="${k%2?'#FFFFFF':'#25313A'}" stroke-opacity="${k%2?.065:.05}" stroke-width=".3"/>`).join('');
   s=s.replace(new RegExp(`(<g data-circular-finish="${j}">)[\\s\\S]*?(<circle cx="${x}" cy="${y}" r="94")`),`$1<g data-fine-metal="true">${fine}</g><circle cx="${x}" cy="${y}" r="87" fill="none" stroke="${colors[j][2]}" stroke-opacity=".48" stroke-width="2.5"/>$2`);
  });
 }
 return s;
}
