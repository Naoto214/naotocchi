// G-AC 検証用: games.js の定数をそのまま写した下限見積り（コードは変更しない）
const SEG=200, PLAYER_Z=1000/Math.tan(50*Math.PI/180);
const lerp=(a,b,t)=>a+(b-a)*t;
const mg=(ms,mode,len)=>Math.round(ms*(mode==='easy'?1.2:1)*(len==='short'&&ms>=20000?0.7:1));
const modes=[['easy',0.3],['normal',0.55],['hard',1]];
function minTime(distSeg,maxSegPerS,accelTime){ // 一定加速で MAX まで、以後一定
  const accDist=maxSegPerS*accelTime/2; if(distSeg<=accDist) return Math.sqrt(2*distSeg*accelTime/maxSegPerS);
  return accelTime+(distSeg-accDist)/maxSegPerS;}
function pct(a,p){a=a.slice().sort((x,y)=>x-y);return a[Math.floor(p*(a.length-1))];}
const N=20000;
// downhill-snow
function downhillLen(){let n=40;for(let i=0;i<6;i++){n+=10+Math.floor(Math.random()*8)+12+Math.floor(Math.random()*12)+10+Math.floor(Math.random()*8);if(Math.random()<0.5)n+=12+6+Math.floor(Math.random()*10);}n+=40;return n;}
function raceLen(){let n=45;for(let i=0;i<4;i++){n+=12+Math.floor(Math.random()*10)+14+Math.floor(Math.random()*14)+12+Math.floor(Math.random()*10);if(Math.random()<0.6)n+=16+8+Math.floor(Math.random()*12);}n+=48;return n;}
function gpLen(){let n=40;for(let i=0;i<6;i++){n+=20+14+Math.floor(Math.random()*8);if(i%2)n+=20;}n+=36;return n;}
const out=[];
for(const [name,lenFn,maxS,accT,limFn] of [
 ['downhill-snow',downhillLen,40,2.6,d=>lerp(24000,20000,d)],
 ['race-3d',raceLen,36,3.0,d=>lerp(26000,22000,d)]]){
  const ts=[];for(let i=0;i<N;i++){const L=lenFn();const fin=L-12;ts.push(minTime(fin-PLAYER_Z/SEG,maxS,accT));}
  out.push(`${name}: 最短完走(衝突・減速ゼロ) p50=${pct(ts,.5).toFixed(1)}s p90=${pct(ts,.9).toFixed(1)}s max=${pct(ts,1).toFixed(1)}s`);
  for(const [m,dmax] of modes) for(const len of ['normal','short']){
    const lim=mg(Math.round(limFn(dmax)),m,len)/1000; const limLo=mg(Math.round(limFn(0)),m,len)/1000;
    const fail=ts.filter(t=>t>lim).length/N;
    out.push(`  ${m}/${len}: 制限 ${limLo.toFixed(1)}〜${lim.toFixed(1)}s（年齢最大で${lim.toFixed(1)}s）→ 最短でも間に合わないコース ${(fail*100).toFixed(1)}%`);
  }
}
// grand-prix: 2周
{const ts=[],tb=[];for(let i=0;i<N;i++){const L=gpLen();ts.push(minTime(2*L,34,2.6));
 // ブースト8回すべて理想取得: 1.5s 間 cap 1.28倍。1回あたり最大 ~ (1.28-1)*34*1.5*0.8 seg 得
 const gain=8*(0.28*34*1.5*0.8); tb.push(minTime(2*L-gain,34,2.6));}
 out.push(`grand-prix-3d: 2周 最短(ブースト無し) min=${pct(ts,0).toFixed(1)} p50=${pct(ts,.5).toFixed(1)} max=${pct(ts,1).toFixed(1)}s ／ 8回理想ブースト min=${pct(tb,0).toFixed(1)} p50=${pct(tb,.5).toFixed(1)} max=${pct(tb,1).toFixed(1)}s`);
 for(const [m] of modes) for(const len of ['normal','short']){const lim=mg(30000,m,len)/1000;out.push(`  ${m}/${len}: 制限 ${lim}s → ブースト無し完走不能 ${(ts.filter(t=>t>lim).length/N*100).toFixed(1)}%、理想ブーストでも不能 ${(tb.filter(t=>t>lim).length/N*100).toFixed(1)}%`);}
 // ライバル: 目標速度 MAX*lerp(.78,.9,d)*(0.94+i*0.02+rand*0.04), 1/1.2s で追従
 for(const [m,d] of modes){const L=340;const v=34*lerp(.78,.9,d)*(0.94+4*0.02+0.04);out.push(`  rival最速(${m},d=${d}) 2周所要 ≈ ${(2*L/v+1.2).toFixed(1)}s (L=340最短)`);}
}
// sky-shooter
{for(const [m,d] of modes) for(const len of ['normal','short']){const dur=mg(27000,m,len)/1000;const boss=dur-15;const hp=70+d*40;
 out.push(`sky-shooter ${m}/${len}: 全体${dur}s ボス戦${boss.toFixed(1)}s HP${hp.toFixed(0)}  必要DPS(ボム2発込み)=${((hp-24)/Math.max(0.1,boss)).toFixed(1)} / パワー1の理論DPS=${(1/0.17).toFixed(1)}`);}}
// rhythm: 空打ち連打
{const res={};for(const period of [100,150,200,250]){let tot=0;for(let r=0;r<300;r++){const d=0.55,BEAT=60000/lerp(96,126,d);const notes=[];let k=0;for(let t=2200;t<22000-1200;t+=BEAT/2,k++){const on=k%2===0;const p=on?lerp(.55,.78,d):lerp(.18,.45,d);if(Math.random()>=p)continue;notes.push({t,lane:Math.floor(Math.random()*3)});}
 let perfect=0,good=0;const phase=[Math.random()*period,Math.random()*period,Math.random()*period];
 for(let lane=0;lane<3;lane++){const ln=notes.filter(n=>n.lane===lane).map(n=>({...n,hit:false}));for(let t=phase[lane];t<22000;t+=period){let best=null;for(const n of ln){if(n.hit)continue;const dd=Math.abs(n.t-t);if(dd<=170&&(!best||dd<best.d))best={n,d:dd};}
 // 既に170ms超過したものは missed 扱い
 if(best&&best.n.t+170>=t){best.n.hit=true;if(best.d<=60)perfect++;else good++;}}}
 tot+=Math.min(100,Math.max(8,Math.round((perfect*3+good*2)/(notes.length*3)*100)));}
 res[period]=(tot/300).toFixed(1);}
 out.push('rhythm-highway-3d 3レーン同時連打(各レーン周期ms→平均スコア): '+JSON.stringify(res));}
console.log(out.join('\n'));
