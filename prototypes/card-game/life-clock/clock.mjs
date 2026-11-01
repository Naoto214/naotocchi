export const baseMain='aec03c20ae8b064c6c2f8aca5537f1938df6439f';
export const sourceV3='a4b873688aa2468e2d4c24e3bbca7bc6c130d8e1';
export const sample={round:7,firstTime:4,secondTime:9,firstGrowth:65,secondGrowth:40,end:10};
export const centers=[[512,500],[512,500],[512,500],[326,500],[698,500],[512,688]];
export const colors={gold:'#BE9650',red:'#91394B',green:'#25765B',ink:'#234154',silver:'#DDE4E7'};
export const handProfiles={classic:{name:'基準 90 / 80 / 70%',ratios:[.9,.8,.7],widths:[5,16,32]},light:{name:'軽やか 90 / 78 / 68%',ratios:[.9,.78,.68],widths:[4,12,28]}};
export function values(s=sample){return[s.round,s.firstTime,s.secondTime,s.firstGrowth,s.secondGrowth,s.end];}
export function angles(s=sample){return[s.round*30,s.firstTime*30,s.secondTime*30,s.firstGrowth*3.6,s.secondGrowth*3.6,{10:120,11:240,12:0}[s.end]];}
export function validate(s){for(const k of ['round','firstTime','secondTime'])if(!Number.isInteger(s[k])||s[k]<0||s[k]>12)throw Error(k);for(const k of ['firstGrowth','secondGrowth'])if(!Number.isInteger(s[k])||s[k]<0||s[k]>100||s[k]%5)throw Error(k);if(![10,11,12].includes(s.end))throw Error('end');return s;}
const pt=(x,y,r,a)=>[x+r*Math.sin(a*Math.PI/180),y-r*Math.cos(a*Math.PI/180)];
const txt=(x,y,v,size=18,color=colors.ink)=>`<text x="${x}" y="${y}" fill="${color}" font-family="Georgia,serif" font-size="${size}" text-anchor="middle" dominant-baseline="central">${v}</text>`;
function ticks(x,y,r,count,major,light=false){return Array.from({length:count},(_,i)=>{const a=pt(x,y,r,i*360/count),b=pt(x,y,r-(i%major?5:10),i*360/count);return `<line data-tick="${i}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${light?'#E4ECF0':'#537082'}" stroke-width="${i%major?1:1.8}"/>`;}).join('');}
export function face({palette='C1',markers=false,art='assets/dial-art-v4.png',edition='game'}={}){
 let s=`<image href="${art}" width="1024" height="1024"/>`;
 s+=`<g data-main-ticks="60">${ticks(512,500,432,60,5,true)}</g>`;
 for(let n=1;n<=12;n++){const q=pt(512,500,382,n*30),v=n<10?n:['X','XI','XII'][n-10];s+=`<g data-main-number="${n}">${txt(...q,v,n<10?40:36,'#EDF1F2')}</g>`;}
 if(markers)[10,11,12].forEach((n,i)=>{const q=pt(512,500,453,n*30);s+=`<circle data-marker="${n}" cx="${q[0]}" cy="${q[1]}" r="9" fill="${['#AD555B','#4F9078','#477EB9'][i]}" stroke="#E0E7EA" stroke-width="2"/>`;});
 const bg=palette==='C1'?['#CCDDE6','#CCDDE6','#CCDDE6']:['#E8D2D9','#CDE3D7','#E8DFC9'];
 [centers[3],centers[4],centers[5]].forEach(([x,y],j)=>{const ring=[colors.red,colors.green,'#AEBFC9'][j];
 s+=`<g data-subdial="${j}"><circle cx="${x}" cy="${y}" r="94" fill="${bg[j]}" stroke="#E3E9EC" stroke-width="4"/><circle data-color-ring="${j}" cx="${x}" cy="${y}" r="89" fill="none" stroke="${ring}" stroke-width="3"/>`;
 if(edition==='clock'){
 s+=`<circle cx="${x}" cy="${y}" r="72" fill="none" stroke="#9BAEB8" stroke-width=".8"/>`;for(let k=0;k<8;k++){const q=pt(x,y,61,k*45);s+=`<path d="M ${q[0]-4} ${q[1]} q 4 -7 8 0 q -4 7 -8 0" fill="${ring}" opacity=".5"/>`;}s+=txt(x,y,j===0?'✦':j===1?'✦':'✧',24,'#7B909A');
 }else if(j<2){s+=`<g data-growth-ticks="20">${ticks(x,y,82,20,2)}</g>`;for(let n=0;n<100;n+=10){const q=pt(x,y,62,n*3.6);s+=`<g data-growth-number="${n}">${txt(...q,n,15)}</g>`;}}
 else{for(const [v,a]of[['X',120],['XI',240],['XII',0]]){const q=pt(x,y,59,a),t=pt(x,y,79,a),u=pt(x,y,72,a);s+=`<g data-end-number="${v}" data-angle="${a}"><line x1="${t[0]}" y1="${t[1]}" x2="${u[0]}" y2="${u[1]}" stroke="${colors.gold}" stroke-width="2"/>${txt(...q,v,22)}</g>`;}}
 s+='</g>';});s+=txt(512,278,'NAOTOCCHI',15,'#EDF1F2');return `<g data-static-face="true">${s}</g>`;
}
export function hands(a,{profile='classic',edition='game'}={}){
 const p=handProfiles[profile];let out='';const order=edition==='game'?[3,4,5,2,1,0]:[2,1,0];
 for(const i of order){const[x,y]=centers[i],len=i<3?p.ratios[i]*432:72,w=i<3?p.widths[i]:5.5,c=[colors.gold,colors.red,colors.green,colors.red,colors.green,colors.gold][i];
 const shape=i===0?`M ${x-w/2} ${y+32} L ${x-w/2} ${y-len+10} L ${x} ${y-len} L ${x+w/2} ${y-len+10} L ${x+w/2} ${y+32} Z`:`M ${x-w*.35} ${y+19} L ${x-w/2} ${y-len+30} L ${x} ${y-len} L ${x+w/2} ${y-len+30} L ${x+w*.35} ${y+19} Z`;
 out+=`<g data-hand="${i}" data-angle="${a[i]}" data-length="${len}" data-width="${w}" transform="rotate(${a[i]} ${x} ${y})"><path d="${shape}" fill="${c}" stroke="#EFF1EA" stroke-width="${i<3?1.5:1}"/>${i===0?`<circle cx="${x}" cy="${y+25}" r="7" fill="${c}" stroke="#EFF1EA" stroke-width="1"/>`:''}</g>`;
 }
 if(edition==='game')for(const[x,y]of centers.slice(3))out+=`<circle cx="${x}" cy="${y}" r="5" fill="#DDE4E7" stroke="#869DAC" stroke-width="1"/>`;
 return out+'<circle cx="512" cy="500" r="17" fill="#DBE3E8" stroke="#FCFDFD" stroke-width="3"/>';
}
export function ordinaryAngles(h=10,m=10,s=30){return[s*6,(m+s/60)*6,(h%12+m/60+s/3600)*30];}
export function render(state=sample,opts={}){validate(state);const{edition='game',profile='classic',crop='full',time=[10,10,30]}=opts;let s=face(opts)+hands(edition==='game'?angles(state):ordinaryAngles(...time),{edition,profile});
 if(edition==='game')for(const[i,k]of[[3,'firstGrowth'],[4,'secondGrowth']])if(state[k]===100){const[x,y]=centers[i];s+=`<g data-complete="${i}" aria-label="そだち100到達"><rect x="${x-17}" y="${y+20}" width="34" height="16" rx="4" fill="#EAF0EF" stroke="${i===3?colors.red:colors.green}" stroke-width="1"/>${txt(x,y+28,'100',11)}</g>`;}
 const box={full:'0 0 1024 1024',growth:'215 390 595 220',end:'402 578 220 220',hands:'100 60 824 870'}[crop];
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" role="img" aria-label="${edition==='game'?'GAME EDITION B配置':'CLOCK EDITION 中央3針・小文字盤は装飾'}">${s}</svg>`;
}

export const overlapCases=[
{id:'all',label:'3本とも同方向',state:{round:10,firstTime:10,secondTime:10}},
{id:'red-green',label:'赤と緑が同方向',state:{round:2,firstTime:10,secondTime:10}},
{id:'gold-red',label:'金と赤が同方向',state:{round:10,firstTime:10,secondTime:3}},
{id:'gold-green',label:'金と緑が同方向',state:{round:10,firstTime:3,secondTime:10}},
{id:'separate',label:'3本が別方向',state:{round:7,firstTime:4,secondTime:9}},
{id:'crossing',label:'双葉・小文字盤を横切る',state:{round:12,firstTime:3,secondTime:6}}
];
