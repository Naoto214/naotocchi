import {render as previous,sample} from '../v11/clock-v11.mjs';
import {layout} from './layout.mjs';
export * from '../v11/clock-v11.mjs';
export const fonts={A:{family:'Georgia,serif',weight:400,name:'現行 Georgia'},B:{family:'Georgia,serif',weight:600,name:'Georgia やや太め'},C:{family:'V12Nimbus,"Nimbus Roman",serif',weight:400,name:'Nimbus Roman'}};
export const studies={
 main:[25,30,35,40].map((p,i)=>({id:'M'+i,label:`${'ABCD'[i]} · ＋${p}%`,main:40*(1+p/100)})),
 growth:[1,1.1,1.2].map((growth,i)=>({id:'G'+i,label:`${'ABC'[i]} · ${i?'＋'+i*10+'%':'現行'}`,growth})),
 roman:[1,1.1,1.15].map((roman,i)=>({id:'R'+i,label:`${'ABC'[i]} · ${[0,10,15][i]?'＋'+[0,10,15][i]+'%':'現行'}`,roman})),
 font:['A','B','C'].map(font=>({id:'F'+font,label:font+' · '+fonts[font].name,font})),
 combined:[{id:'S1',label:'S1 · ＋30 / ＋10 / ＋10 / 現行',main:52,growth:1.1,roman:1.1},{id:'S2',label:'S2 · ＋35 / ＋20 / ＋15 / 現行',main:54,growth:1.2,roman:1.15},{id:'S3',label:'S3 · ＋30 / ＋10 / ＋10 / 太め',main:52,growth:1.1,roman:1.1,font:'B'}]
};
export function render(state=sample,{main=52,growth=1,roman=1,font='A',crop='full',reference=false}={}){
 if(reference)return previous(state,{variant:'E',crop});
 if(![50,52,54,56].includes(main)||![1,1.1,1.2].includes(growth)||![1,1.1,1.15].includes(roman)||!fonts[font])throw Error('Invalid V12 option');
 const f=fonts[font];let s=previous(state,{variant:'E'});
 s=s.replace(/<g data-main-number="(\d+)">[\s\S]*?<\/g>/g,(_,n)=>{
  const o=layout[main][n],a=+n*Math.PI/6,x=512+o.radius*Math.sin(a),y=500-o.radius*Math.cos(a);
  return `<g data-main-number="${n}"><text x="${x}" y="${y}" dx="${o.dx}" dy="${o.dy}" fill="#EDF1F2" font-family='${f.family}' font-size="${main}" font-weight="${f.weight}" text-anchor="middle" dominant-baseline="central" style="font-variant-numeric:lining-nums">${n}</text></g>`;
 });
 s=s.replace(/<g data-growth-number="\d+">[\s\S]*?<\/g>/g,g=>{const x=+g.match(/x="([^"]+)/)[1],y=+g.match(/y="([^"]+)/)[1],cx=x<512?326:698,r=growth===1?62:growth===1.1?60:58;return g.replace(/font-size="[^"]+"/,`font-size="${15*growth}"`).replace(/x="[^"]+"/,`x="${cx+(x-cx)*r/62}"`).replace(/y="[^"]+"/,`y="${500+(y-500)*r/62}"`);});
 s=s.replace(/<g data-end-number="[^"]+"[\s\S]*?<\/g>/g,g=>g.replace(/font-size="[^"]+"/,`font-size="${17*roman}"`).replace(/font-family="[^"]+"/,`font-family='${f.family}'`).replace(/font-weight="[^"]+"/,`font-weight="${f.weight}"`));
 const box={full:'-24 -24 1072 1072',upper:'105 65 500 320',ten:'125 245 155 140',growth:'215 390 595 220',end:'392 568 240 240'}[crop];if(!box)throw Error('crop');
 return s.replace(/viewBox="[^"]+"/,`viewBox="${box}"`);
}
