#!/usr/bin/env node
// Fresh, scoped QA renderer. Reads production PNG/SVG/placement on every run.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..'),e=require('../pet-expression.js'),bounds=require('../cast-bounds.js');
const inline=require('./inline-expression-images.cjs');
const css=fs.readFileSync(path.join(root,'pet-expression.css'),'utf8');
const sourceHash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'pet-expression.js'))).digest('hex');
const sourceHead=process.env.STARFISH_SOURCE_HEAD;
if(!/^[a-f0-9]{40}$/.test(sourceHead||''))throw new Error('STARFISH_SOURCE_HEAD must identify the verified GitHub source commit');
const states=['hungry','sick','tired','sulky','weak','critical','wantsPlay','sleeping','happy','strained'];
const labels=['空腹','病気','疲労','不機嫌','いのち低下','危険','かまって','睡眠','喜び','いやだ'];
const names={'02':'後期浮遊幼生','03':'着底・変態期'};
let defs=[],ids=new Map();
const text=(x,y,t,n=15)=>`<text x="${x}" y="${y}" font-size="${n}">${t}</text>`;
function png(p){if(!ids.has(p)){const id='p'+ids.size;ids.set(p,id);defs.push(`<symbol id="${id}" viewBox="0 0 128 128"><image width="128" height="128" href="data:image/png;base64,${fs.readFileSync(path.join(root,p)).toString('base64')}"/></symbol>`);}return ids.get(p);}
function comp(base,state,n,x,y,sweat=false,offset=null,phase=.5){
 const floor=n*(128-bounds[base].box[3])/128,d=e.sweatFor(base,n,n,floor);
 let s=`<g transform="translate(${x} ${y})"><use href="#${png(e.assetFor(base,state))}" width="${n}" height="${n}" y="${floor}"/>`;
 if(sweat){const w=Math.max(6,Math.min(11,n*.1)),h=Math.max(9,Math.min(16,n*.15));for(const xx of [d.left,n-d.right-w]){const yy=d.top+d.travel*phase;s+=`<g transform="translate(${xx} ${yy}) rotate(18 ${w/2} ${h/2})"><path d="M${w*.65} 0 C${w*.94} ${h*.15} ${w} ${h*.55} ${w*.8} ${h*.84} C${w*.5} ${h*1.08} ${w*.08} ${h*.92} 0 ${h*.62} C${-w*.04} ${h*.3} ${w*.23} 0 ${w*.65} 0Z" fill="#a5d934" stroke="#689d15" stroke-width="1"/></g>`;}}
 let mark=e.accentFor(base,state).match(/<svg[^>]*>([\s\S]*)<\/svg>/)[1];if(offset)mark=mark.replace(/translate\([^)]*\)/,`translate(${offset.join(' ')})`);
 s+=`<g class="pet-expression-accent" transform="scale(${n/104})">${inline(mark)}</g></g>`;return s;
}
function save(file,w,h,content){const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" font-family="Rounded Mplus 1c,sans-serif"><defs>${defs.join('')}</defs><style>${css}</style><rect width="100%" height="100%" fill="#faf7ef"/>${content}</svg>`;fs.writeFileSync(path.join(root,'docs/qa',file),svg);defs=[];ids=new Map();}
for(const st of ['02','03']){
 const base=`assets/characters/starfish/${st}.png`,off=e.accentFor(base,'strained').match(/translate\(([^)]+)\)/)[1];let s='';
 for(const [section,sweat] of [[0,false],[1,true]]){let yy=section*780;s+=text(20,yy+30,`ヒトデ${st} ${names[st]}｜${sweat?'病気併存＋汗':'最終10表情'}・候補C反映済み`,24)+text(20,yy+54,`source HEAD ${sourceHead}／銀offset [${off}]`)+text(20,yy+76,'上：104px　下：64・80・104px。静的合成・汗は近似。最終承認待ち。');
 for(let i=0;i<10;i++){const x=(i%5)*350,y=yy+96+Math.floor(i/5)*330;s+=`<rect x="${x+5}" y="${y}" width="340" height="320" rx="8" fill="white" stroke="#ddd"/>`+text(x+16,y+25,labels[i],20)+comp(base,states[i],104,x+120,y+48,sweat||states[i]==='sick');for(const [n,dx] of [[64,18],[80,120],[104,224]])s+=text(x+dx,y+191,n+'px',12)+comp(base,states[i],n,x+dx,y+204,sweat||states[i]==='sick');}}
 save(`starfish-expressions-step3-20260927-${st}-C-verified.svg`,1750,1560,s);
}
let s=text(20,30,'ヒトデ02・03｜銀マーク A／B／C比較',24)+text(20,55,'銀だけを比較。左汗は全列で補修後Bを固定。本体→汗→銀。64/80/104px。')+text(20,77,`source HEAD ${sourceHead}／候補C反映済み・本番設定変更なし`);
for(const [j,st] of ['02','03'].entries()){
 const y=110+j*450,base=`assets/characters/starfish/${st}.png`;s+=text(20,y,`ヒトデ${st} ${names[st]}`,21);
 for(let col=0;col<3;col++){const x=col*360;const off=col===0?(st==='02'?[-3.5,18.5]:[-1,14.5]):col===1?(st==='02'?[-16.5,32]:[-15,28]):null;s+=`<rect x="${x+5}" y="${y+18}" width="345" height="403" rx="8" fill="white" stroke="#ddd"/>`+text(x+18,y+47,['A 補修前の銀','B 前回補修後の銀','C 今回の最終候補'][col],18);
 for(const [i,n] of [64,80,104].entries())s+=text(x+20,y+90+i*110,n+'px')+comp(base,'strained',n,x+140,y+62+i*110,true,off);}}
save('starfish-silver-reevaluation-20260927-C-verified.svg',1080,1020,s);
s=text(20,30,'既存例｜いやだ＋汗・銀が前面',24)+text(20,55,'各行64/80/104px、各列は汗の下降位相0／0.5／1の静的近似。既存配置・画像は変更なし。');
for(const [j,[line,st,label]] of [['starfish','01','ヒトデ01'],['turtle','02','カメ02'],['cicada','03','セミ03'],['god','05','かみさま05']].entries()){
 const y=85+j*350,base=`assets/characters/${line}/${st}.png`;s+=text(20,y,label,21);
 for(const [i,n] of [64,80,104].entries())for(const [col,phase] of [0,.5,1].entries()){s+=text(80+col*300,y+23+i*102,`${n}px／位相${phase}`,12)+comp(base,'strained',n,140+col*300,y+24+i*102,true,null,phase);}}
save('starfish-silver-existing-examples-20260927.svg',1000,1510,s);
console.log(JSON.stringify({sourceHash,generated:4,svgFrom:'fresh accentFor',sweatFrom:'fresh sweatFor',pngChanges:0}));
