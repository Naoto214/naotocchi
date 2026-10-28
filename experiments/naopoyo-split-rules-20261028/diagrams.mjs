import fs from 'node:fs';
const root=new URL('./',import.meta.url),read=p=>JSON.parse(fs.readFileSync(new URL('evidence/'+p,root)));
fs.mkdirSync(new URL('figures/',root),{recursive:true});
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const txt=(x,y,t,size=16,color='#233e33')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" font-family="sans-serif">${esc(t)}</text>`;
function svg(w,h,content){return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#f5f7f0"/>${content}</svg>`;}
export function boardSvg(s,{size=34,offsetX=0,offsetY=0,priorities=null,range=null}={}){
 const [sx,sy,w,h]=range||[0,0,s.w,s.h];let out='';
 for(let y=sy;y<sy+h;y++)for(let x=sx;x<sx+w;x++){
  const px=offsetX+(x-sx)*size,py=offsetY+(y-sy)*size,wall=s.walls.some(p=>p[0]===x&&p[1]===y),gate=s.gates.find(p=>p.x===x&&p.y===y),spike=s.spikes.find(p=>p.x===x&&p.y===y),exit=s.exits.find(p=>p.x===x&&p.y===y);
  out+=`<rect x="${px}" y="${py}" width="${size}" height="${size}" fill="${wall?'#738477':gate?'#dfc9ed':'#fffdf6'}" stroke="#d7dfd1"/>`;
  if(gate)out+=txt(px+4,py+size*.8,'G'+gate.exact,size*.33,'#764798');
  if(spike)out+=txt(px+3,py+size*.87,'▲'+spike.power,size*.36,'#ad5f3f');
  if(exit)out+=txt(px+3,py+size*.8,'☆'+exit.exact,size*.4,'#987718');
  const a=s.actors.find(a=>a.x===x&&a.y===y);if(a){out+=`<circle cx="${px+size/2}" cy="${py+size/2}" r="${size*.36}" fill="${a.id.startsWith('child')?'#e5b35c':'#79ad88'}" stroke="#304e3c"/>`+txt(px+size*.37,py+size*.66,a.level,size*.46);}
  const p=priorities?.findIndex(p=>p.x===x&&p.y===y);if(p!==undefined&&p>=0)out+=txt(px+size*.25,py+size*.64,p+1,size*.43,p<7?'#b04e29':'#5a7566');
 }return out;
}
const probes=read('probes.json'),rep=read('reproduction.json');
const names=['上','右上','右','右下','下','左下','左','左上'];
let out=txt(24,36,'A：8方向の進入と生成順位（同じ空き盤面・段階8・分裂数7）',24);
out+=txt(24,65,'中心＝本体。1〜24＝生成候補の順位、最初の7個に段階1。右図は重力が止まった後。',16);
for(const [i,d] of probes.directions.entries()){
 const x=24+(i%4)*292,y=105+Math.floor(i/4)*412;
 out+=txt(x,y,`${names[i]}へ進入`,20);
 out+=boardSvg(d.initial,{offsetX:x,offsetY:y+20,size:48,range:[2,2,5,5],priorities:d.positions});
 out+=txt(x,y+284,'重力後（全9×9）',15);
 out+=boardSvg(d.after,{offsetX:x+132,offsetY:y+274,size:12});
 out+=txt(x,y+310,'親・子の同時合体は',12);out+=txt(x,y+328,'Aでは抑制される',12);
}
fs.writeFileSync(new URL('figures/eight-directions.svg',root),svg(1192,940,out));
out=txt(24,34,'ステージ20：保存解答7手目で同等条件を再現',25)+txt(24,64,'本人の操作列を直接再現したものではありません。座標は左上(0,0)。',16);
const a=rep.modes.A,born=a.trace.find(t=>t.kind==='split-born');
const boards=[['① 進入前：8と8',a.before],['② 8 → 5＋1＋1＋1',{...a.before,actors:born.actors}],['③ A：1が5に支持',a.after],['④ B：1＋5 → 6',rep.modes.B.after]];
for(const [i,[title,state]] of boards.entries()){const x=24+(i%2)*370,y=110+Math.floor(i/2)*380;out+=txt(x,y,title,21)+boardSvg(state,{offsetX:x,offsetY:y+18,size:40});}
out+=txt(24,864,'A：5の下の8は通常支持。1→5の落下だけが split-family で止まる。',18);
fs.writeFileSync(new URL('figures/stage20.svg',root),svg(760,900,out));
out=txt(24,34,'同じ進入直前の盤面に A / B / C を適用',25);
for(const [i,mode] of ['A','B','C'].entries()){const x=24+i*292,y=90;out+=txt(x,y,mode+'：'+({A:'親子を保留',B:'通常合体',C:'真上を後回し'}[mode]),20)+boardSvg(rep.modes[mode].after,{offsetX:x,offsetY:y+20,size:32});}
out+=txt(24,410,'Cは今回、2マス先の左右候補へ分散。狭い縦穴では真上が残る。',18);
fs.writeFileSync(new URL('figures/abc.svg',root),svg(900,450,out));
console.log('Generated exact SVG figures from recorded real-engine outputs.');
