export const sample={round:7,growthA:65,growthB:40,timeA:4,timeB:9,end:10};
export const centers=[[512,500],[512,500],[512,500],[326,500],[698,500],[512,688]];
export const palettes=['#AD555B','#4F9078','#477EB9'];
export function angle(kind,value,scale='full'){return value*(kind==='growth'?(scale==='legacy'?3:3.6):30);}
export function onTick(degrees,count){return Math.abs(degrees*count/360-Math.round(degrees*count/360))<1e-8;}
export function readings(layout,state=sample,scale='full',profile='fine'){
 const c=layout==='A'?'growth':'time',sub=layout==='A'?'time':'growth';
 const values=[state.round,state[c+'A'],state[c+'B'],state[sub+'A'],state[sub+'B'],state.end];
 const kinds=['round',c,c,sub,sub,'end'],ticks=[60,60,60,60,profile==='fine'?60:30,24];
 const roles=['共通ラウンド',`Aの${c==='growth'?'そだち':'残り時'}`,`Bの${c==='growth'?'そだち':'残り時'}`,`Aの${sub==='growth'?'そだち':'残り時'}`,`Bの${sub==='growth'?'そだち':'残り時'}`,'終了ラウンド'];
 return values.map((value,i)=>{const deg=scale==='ticks'&&i>=3&&i<=4?value*(kinds[i]==='growth'?2.4:24):angle(kinds[i],value,scale);return {value,kind:kinds[i],role:roles[i],angle:deg,ticks:ticks[i],tick:deg*ticks[i]/360,exact:onTick(deg,ticks[i]),endpoint:value===0?'0':(kinds[i]==='growth'&&(scale==='full'||(scale==='ticks'&&i<3))&&value===100?'100 / 満了':kinds[i]==='time'&&value===12?'12 / 最大':'')};});
}
const point=(cx,cy,r,deg)=>[cx+r*Math.sin(deg*Math.PI/180),cy-r*Math.cos(deg*Math.PI/180)];
const line=(x1,y1,x2,y2,width=1,color='#E9E2D3')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"/>`;
function ticks(cx,cy,r,count,majorEvery){return Array.from({length:count},(_,i)=>{const a=point(cx,cy,r,i*360/count),b=point(cx,cy,r-(i%majorEvery?5:10),i*360/count);return line(...a,...b,i%majorEvery?.8:1.7);}).join('');}
function text(x,y,s,size=18){return `<text x="${x}" y="${y}" fill="#F4EDDE" font-family="Georgia,serif" font-size="${size}" text-anchor="middle" dominant-baseline="central">${s}</text>`;}
export function face(profile='fine',art='../assets/chrono-art-v3.png'){
 let s=`<image href="${art}" x="0" y="0" width="1024" height="1024"/>`;
 s+=ticks(512,500,432,60,5);
 for(let n=1;n<=12;n++){const [x,y]=point(512,500,377,n*30);s+=`<g data-hour="${n}">${text(x,y,n,42)}</g>`;}
 [10,11,12].forEach((n,i)=>{const [x,y]=point(512,500,453,n*30);s+=`<circle data-marker="${n}" cx="${x}" cy="${y}" r="10" fill="${palettes[i]}" stroke="#E1D6C0" stroke-width="2.5"/>`;});
 [[326,500,60,60],[698,500,profile==='fine'?60:30,30],[512,688,24,12]].forEach(([x,y,count,max],j)=>{
  s+=`<g data-subdial="${j}" data-ticks="${count}"><circle cx="${x}" cy="${y}" r="93" fill="#245572" stroke="#C0C9CD" stroke-width="2"/><circle cx="${x}" cy="${y}" r="88" fill="none" stroke="#6C8A9A" stroke-width="1"/>${ticks(x,y,83,count,count/6)}`;
  for(let k=1;k<=6;k++){const q=point(x,y,61,k*60);s+=text(...q,k*max/6,16);}s+='</g>';
 });
 s+=text(512,282,'NAOTOCCHI',15);return `<g data-static-face="true">${s}</g>`;
}
export function hand(i,deg,mode='game'){
 const [cx,cy]=centers[i];
 const lengths=mode==='clock'?[345,190,302,71,71,71]:[345,205,265,71,71,71];
 const widths=mode==='clock'?[4,22,12,4,4,4]:[8,24,15,6,6,6];
 const colors=['#F0D7A0','#102C45','#B7D4E3','#ADC5D2','#ADC5D2','#DCC397'];
 const l=lengths[i],w=widths[i],label=mode==='game'?['R','A','B','','',''][i]:'';
 return `<g data-hand="${i}" data-angle="${deg}" transform="rotate(${deg} ${cx} ${cy})"><path d="M ${cx-w/2} ${cy+17} L ${cx-w/2} ${cy-l+22} L ${cx} ${cy-l} L ${cx+w/2} ${cy-l+22} L ${cx+w/2} ${cy+17} Z" fill="${colors[i]}" stroke="#E9DDC5" stroke-width="${i<3?2:1}"/>${label?text(cx,cy-l+40,label,i===1?14:11).replace('fill="#F4EDDE"',i===1?'fill="#F4EDDE"':'fill="#102C45"'):''}</g>`;
}
export function clockAngles(h=10,m=10,s=30,elapsed=0){return [(elapsed%60)*6,(h%12+m/60+s/3600)*30,(m+s/60)*6,s*6,(elapsed%1800)/1800*360,(elapsed%43200)/43200*360];}
export function render(layout='A',state=sample,{scale='full',profile='fine',mode='game',art='../assets/chrono-art-v3.png',time=[10,10,30],elapsed=0}={}){
 const a=mode==='clock'?clockAngles(...time,elapsed):readings(layout,state,scale,profile).map(r=>r.angle);
 let s=face(profile,art);for(const i of [3,4,5,1,2,0])s+=hand(i,a[i],mode);
 for(const [x,y]of [centers[3],centers[4],centers[5]])s+=`<circle cx="${x}" cy="${y}" r="5" fill="#E2D0AD"/>`;
 s+='<circle cx="512" cy="500" r="18" fill="#DBCCAD" stroke="#F0E5CC" stroke-width="3"/>';
 return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1024 1024" role="img" aria-label="${mode==='clock'?'通常時計イメージ':layout+'配置の6本針'}">${s}</svg>`;
}
