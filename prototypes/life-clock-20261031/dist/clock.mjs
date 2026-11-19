export const variants = {
 AB:{name:'丸型A＋Bマーカー',shape:'round',luxury:false,copy:'Aの豊かな銀の葉と中央の双葉を維持。Bを参考に、同径の赤・緑・青を数字の外側へ。本人の選択方針に基づく追加比較案。'},
 A:{name:'丸型・忠実継承',shape:'round',luxury:false,copy:'青銀の植物紋章を、円の中へ。葉飾りと双葉の存在感を最も豊かに残す。'},
 B:{name:'丸型・高級時計風',shape:'round',luxury:true,copy:'植物装飾を中央に集め、数字の周りに静かな余白を。日常の時計としての第一候補。'},
 C:{name:'角型・忠実継承',shape:'rect',luxury:false,copy:'カードの縦長の輪郭、二重の枠、四隅の葉飾りを引き継ぐ。原作とのつながりが最も明快。'},
 D:{name:'角型・高級時計風',shape:'rect',luxury:true,copy:'額装のような金属枠と整理した文字盤。卓上のインテリアとして楽しむ案。'}
};
export const palettes={soft:['#AD555B','#4F9078','#477EB9'],jewel:['#9E2649','#24795E','#245CB0'],bright:['#E04444','#27974C','#286BE7']};
export function gameAngles(round,a,b){return [round*30,a*3,b*3];}
export function timeAngles(h,m,s){return [(m+s/60)*6,(h%12+m/60+s/3600)*30,s*6];}
const p=(r,n)=>[400+Math.sin(n*Math.PI/6)*r,400-Math.cos(n*Math.PI/6)*r];
export function dial(id='B',{palette='soft',angles=[210,120,60],mode='game',uid='dial'}={}){
 const v=variants[id],round=v.shape==='round',col=palettes[palette],edge=round?'<circle cx="400" cy="400" r="372"/>':'<rect x="83" y="20" width="634" height="760" rx="34"/>';
 // Shared 500-unit chapter ring keeps all four variants comparable at identical scale.
 let ticks='',nums='',markers='';
 for(let i=0;i<60;i++){const q=p(281,i/5),z=p(i%5?274:267,i/5);ticks+=`<line x1="${q[0]}" y1="${q[1]}" x2="${z[0]}" y2="${z[1]}" stroke="#E8DBC0" stroke-width="${i%5?1.3:2.6}" opacity="${i%5?.65:1}"/>`;}
 for(let n=1;n<=12;n++){const q=p(245,n);nums+=`<text data-hour="${n}" x="${q[0]}" y="${q[1]+1}" text-anchor="middle" dominant-baseline="central" fill="#FFF3D9" font-family="Georgia,serif" font-size="38">${n}</text>`;}
 [10,11,12].forEach((n,i)=>{const q=p(id==='AB'?291:205,n);markers+=`<circle data-marker="${n}" cx="${q[0]}" cy="${q[1]}" r="10" fill="${col[i]}" stroke="#F4E6CB" stroke-width="2.5"/>`;});
 const image=round?`<image href="assets/official-card-back.png" x="18" y="-110" width="764" height="1019" preserveAspectRatio="xMidYMid slice" opacity="${v.luxury?.5:1}"/>`:`<image href="assets/official-card-back.png" x="83" y="20" width="634" height="760" preserveAspectRatio="xMidYMid slice" opacity="${v.luxury?.6:1}"/>`;
 const sizes=mode==='game'?[{l:265,w:10,c:'#F4DFAB'},{l:174,w:25,c:'#132E49'},{l:218,w:17,c:'#A8C8DB'}]:[{l:265,w:9,c:'#F4DFAB'},{l:174,w:20,c:'#132E49'},{l:277,w:3,c:'#D5E5EF'}];
 // Shortest broad hand is drawn first so its shoulders remain visible at coincidence.
 const hands=[1,2,0].map(i=>{const s=sizes[i],label=mode==='game'?['R','A','B'][i]:['分','時','秒'][i];return `<g data-hand="${i}" transform="rotate(${angles[i]} 400 400)"><path d="M ${400-s.w/2} 421 L ${400-s.w/2} ${400-s.l+28} L 400 ${400-s.l} L ${400+s.w/2} ${400-s.l+28} L ${400+s.w/2} 421 Z" fill="${s.c}" stroke="#F2DFC1" stroke-width="${mode==='clock'&&i===2?1:2}"/><text x="400" y="${400-s.l+45}" text-anchor="middle" font-size="${i===1?14:11}" font-family="Arial,sans-serif" fill="${i===1?'#fff3d9':'#132e49'}" font-weight="bold">${mode==='game'?label:''}</text></g>`;}).join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="${id} ${v.name} ${mode==='game'?'独立3本針':'通常時計'}" data-variant="${id}"><defs><linearGradient id="${uid}-metal" x2="1" y2="1"><stop stop-color="#B39C76"/><stop offset=".28" stop-color="#FFF3DE"/><stop offset=".55" stop-color="#AA9272"/><stop offset=".8" stop-color="#F0E5D3"/><stop offset="1" stop-color="#8B775B"/></linearGradient><clipPath id="${uid}-clip">${edge}</clipPath></defs><g fill="url(#${uid}-metal)" stroke="#C4AE8D" stroke-width="18">${edge}</g><g clip-path="url(#${uid}-clip)"><rect width="800" height="800" fill="#315F7C"/>${image}<circle cx="400" cy="400" r="285" fill="none" stroke="${v.luxury?'#244A65':'#315F7C'}" stroke-width="90" opacity="${v.luxury?.99:.94}"/><circle cx="400" cy="400" r="304" fill="none" stroke="#E9D8B6" stroke-width="1.3"/><circle cx="400" cy="400" r="187" fill="#1B425B" opacity="${v.luxury?.15:0}"/>${ticks}${nums}${markers}<text x="400" y="566" fill="#FFF3D9" text-anchor="middle" font-family="Georgia,serif" font-size="12" letter-spacing="4">NAOTOCCHI</text>${hands}<circle cx="400" cy="400" r="16" fill="url(#${uid}-metal)" stroke="#FFF3D9" stroke-width="2"/></g><g fill="none" stroke="url(#${uid}-metal)" stroke-width="9">${edge}</g></svg>`;
}
