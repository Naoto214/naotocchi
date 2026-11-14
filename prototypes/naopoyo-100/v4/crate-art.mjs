// Unadopted art studies. No changes to the canonical crate painter.
export const designs={a:{name:'A · 重りと矢印',note:'箱の中央は重りの形＋重量。上の矢印札は押せる最小段階。床の輪は床条件。'},b:{name:'B · 重さの粒',note:'下の黒い粒が重量。上の丸札は押せる最小段階。重量8でも粒が数えられるかを比較。'},c:{name:'C · 箱には重さだけ',note:'箱の中央は重量だけ。押す条件は盤面外の一覧で確認。小さな表示を減らす代わりに目線移動が増えます。'}};
function text(c,s,x,y,size=.2){c.save();c.translate(x,y);c.scale(.01,.01);c.font=`700 ${size*100}px system-ui`;c.textAlign='center';c.textBaseline='middle';c.fillText(s,0,0);c.restore()}
export function crateArt(c,p={},design='a'){
 const weight=p.weight??2,min=p.min??1;c.save();c.fillStyle='#4f392b';c.beginPath();c.roundRect(.1,.2,.8,.71,.075);c.fill();c.fillStyle='#b8844b';c.beginPath();c.roundRect(.14,.23,.72,.62,.05);c.fill();c.strokeStyle='#deb579';c.lineWidth=.035;c.strokeRect(.2,.29,.6,.5);c.strokeStyle='#704e35';c.lineWidth=.045;c.beginPath();c.moveTo(.19,.32);c.lineTo(.8,.76);c.stroke();
 if(design==='b'){c.fillStyle='#332f28';for(let i=0;i<weight;i++){c.beginPath();c.arc(.5+(i%4-(Math.min(4,weight)-1)/2)*.13,.68+Math.floor(i/4)*.11,.045,0,7);c.fill()}}
 else{c.fillStyle='#f6e8c5';c.beginPath();c.moveTo(.31,.74);c.lineTo(.36,.45);c.lineTo(.64,.45);c.lineTo(.69,.74);c.closePath();c.fill();c.strokeStyle='#f6e8c5';c.lineWidth=.035;c.beginPath();c.arc(.5,.43,.07,Math.PI,0);c.stroke();c.fillStyle='#493b2c';text(c,String(weight),.5,.61,.23)}
 if(design!=='c'){c.fillStyle='#e5f0df';c.strokeStyle='#30564f';c.lineWidth=.025;c.beginPath();c.roundRect(.18,.02,.64,.25,.08);c.fill();c.stroke();c.fillStyle='#254c46';text(c,design==='a'?'→ '+min:min+'+',.5,.15,.19)}c.restore();}
