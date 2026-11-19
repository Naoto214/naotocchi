import {render as v8,sample} from '../v8/clock-v8.mjs';
export * from '../clock.mjs';
export const romans=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
export const variants={A:{name:'A · V8 C現行',scale:1},B:{name:'B · 新数字配置・現行径',scale:1},C:{name:'C · 新数字配置・直径＋12%',scale:1.12}};
function replaceGroup(s,attribute,fn){const start=s.indexOf('<g '+attribute);if(start<0)throw Error('Missing group '+attribute);const re=/<g\b[^>]*>|<\/g>/g;re.lastIndex=start;let depth=0,m;while(m=re.exec(s)){depth+=m[0].startsWith('</')?-1:1;if(depth===0)return s.slice(0,start)+fn(s.slice(start,re.lastIndex))+s.slice(re.lastIndex);}throw Error('Unclosed group');}
const point=(r,a)=>[512+r*Math.sin(a*Math.PI/180),688-r*Math.cos(a*Math.PI/180)];
export function render(state=sample,{variant='B',crop='full'}={}){
 if(!variants[variant])throw Error('Unknown variant');
 if(variant==='A')return v8(state,{variant:'C',crop});
 if(!Number.isInteger(state.end)||state.end<1||state.end>12)throw Error('end');
 let s=v8({...state,end:10},{variant:'C',crop});
 for(let n=1;n<=12;n++)s=replaceGroup(s,`data-main-number="${n}"`,g=>g.replace(/font-size="[^"]+"/,'font-size="40"').replace(/>[^<>]+<\/text>/,`>${n}</text>`));
 s=replaceGroup(s,'data-subdial="2"',g=>{
  g=g.replace(/<g data-end-number="[\s\S]*?<\/g>/g,'');
  const font=variant==='C'?18:17;
  const nums=romans.map((roman,i)=>{const a=(i+1)*30%360,[x,y]=point(variant==='C'?74:70,a),[tx,ty]=point(87,a),[ux,uy]=point(84,a);return `<g data-end-number="${roman}" data-angle="${a}"><line x1="${tx}" y1="${ty}" x2="${ux}" y2="${uy}" stroke="#E3D3AC" stroke-width="1.5"/><text x="${x}" y="${y}" fill="#F0EBE1" font-family="Georgia,serif" font-size="${font}" font-weight="400" text-anchor="middle" dominant-baseline="central">${roman}</text></g>`;}).join('');
  g=g.slice(0,-4)+nums+'</g>';
  // Only the lower dial face is enlarged. The original background and all hands remain intact.
  return variant==='C'?`<g data-end-scale="1.12" transform="translate(512 688) scale(1.12) translate(-512 -688)">${g}</g>`:g;
 });
 const a=state.end*30%360;
 s=replaceGroup(s,'data-hand="5"',g=>g.replace(/data-angle="[^"]+"/,`data-angle="${a}"`).replace(/transform="rotate\([^"]+"/,`transform="rotate(${a} 512 688)"`));
 // The same enlarged crop in B/C makes the diameter difference directly comparable.
 if(crop==='end')s=s.replace(/viewBox="[^"]+"/,'viewBox="392 568 240 240"');
 return s;
}
