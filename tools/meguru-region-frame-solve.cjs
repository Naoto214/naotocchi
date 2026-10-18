// Phase 4B: meguru.js の REGION_FRAME の かずを **みちびきなおす** ための どうぐ。
//
//   node tools/meguru-region-frame-solve.cjs
//
// この 出力を meguru.js の REGION_FRAME へ そのまま うつす。
// **かずを 魔法の 数に しない ため**に のこして ある(Phase 4B §28)。
// らんすうを つかって いない ので、なんど はしらせても おなじ 値が 出る。
//
// といて いる もの(ゆうせんじゅんい は Phase 4B §27):
//   1. **geography canon**(§12)  — CANON_AT が その 正本。home を 原点に、+Z = 北 / +X = 東
//   2. **connection closure**     — walk 10 本の 両はしの mouth が global で かさなるように 最小二乗
//   3. world map の 見ため        — **つかって いない**(mapX / mapY へ あてはめない)
//
// 2 段で とく:
//   第1段 closure だけ(かたちが きまる) → 第2段 canon の おもみ WC=3e5 を 足して
//   closure の ぬるくうかん(自由度 5)の 中で canon に いちばん 近い 解へ 動かす。
//   さいごに ぜんたいを θ だけ まわす(剛体回転なので closure は 1 ミリも 変わらない)。
//
// special region(closure で しばらない):
//   star_stop = いなかの「やまろくの のりば」の 真上 / deepsea = うみの「かいしょくどうくつ」の 真下 /
//   jungle    = ぼうはていから 外洋を ひとわたり(= うみの おくゆき)した さきの 南西
//   memory_lake = **frame を あたえない**(地上の ざひょうを もたない)
const fs=require('fs');
const { harness } = require('../tests/helpers/runtime-harness.cjs');
const M = harness({ fullDisplay: true }).api.meguruMod, G = M.WORLD_GEOGRAPHY, W = M.WORLDS;
const sp=(r,s)=>W[r].spots.find(q=>q.id===s);
const CANON_AT={home:[0,0],river_lake:[2400,2400],forest:[-1700,-4700],countryside:[-4200,-6000],
  mountain:[-7000,500],snow:[-1500,9000],desert:[-8500,7000],city:[-9500,-6500],sea:[-8000,-12000]};
const WALK=[];
for(const c of G.connections){if(!c.b||!c.gate||c.gate.kind!=='walk'||!c.mouths)continue;
  WALK.push({id:c.id,a:c.a,b:c.b,A:sp(c.a,c.mouths[c.a]),B:sp(c.b,c.mouths[c.b])});}
const ids=[...new Set(WALK.flatMap(e=>[e.a,e.b]))];
const rot=(p,y)=>({x:p.x*Math.cos(y)+p.z*Math.sin(y),z:-p.x*Math.sin(y)+p.z*Math.cos(y)});
let par={}; ids.forEach(id=>par[id]={x:0,z:0,yaw:0});
const gp=(id,s)=>{const q=rot({x:s.x,z:s.z},par[id].yaw);return{x:par[id].x+q.x,z:par[id].z+q.z};};
const cen=id=>gp(id,{x:0,z:W[id].len/2});
const closure=()=>{let c=0;for(const e of WALK){const a=gp(e.a,e.A),b=gp(e.b,e.B);c+=(a.x-b.x)**2+(a.z-b.z)**2;}return c;};
const closeGrad=()=>{const g={};ids.forEach(id=>g[id]={x:0,z:0,yaw:0});
  for(const e of WALK){const a=gp(e.a,e.A),b=gp(e.b,e.B);const dx=2*(a.x-b.x),dz=2*(a.z-b.z);
    g[e.a].x+=dx;g[e.a].z+=dz;g[e.b].x-=dx;g[e.b].z-=dz;
    for(const [rid,s,sg] of [[e.a,e.A,1],[e.b,e.B,-1]]){const y=par[rid].yaw,q={x:s.x,z:s.z};
      const dq={x:-q.x*Math.sin(y)+q.z*Math.cos(y),z:-q.x*Math.cos(y)-q.z*Math.sin(y)};
      g[rid].yaw+=sg*(dx*dq.x+dz*dq.z);}}return g;};
const CU={};for(const id in CANON_AT){if(id==='home')continue;const L=Math.hypot(...CANON_AT[id]);CU[id]={x:CANON_AT[id][0]/L,z:CANON_AT[id][1]/L};}
const canonCost=()=>{const h=cen('home');let c=0;for(const id in CU){if(!par[id])continue;
  const p=cen(id),dx=p.x-h.x,dz=p.z-h.z,L=Math.hypot(dx,dz)||1;c+=2-2*((dx/L)*CU[id].x+(dz/L)*CU[id].z);}return c;};
const H={x:2,z:2,yaw:2e-4};
const canonGrad=()=>{const g={};ids.forEach(id=>g[id]={x:0,z:0,yaw:0});const c0=canonCost();
  for(const id of ids)for(const k of ['x','z','yaw']){const o=par[id][k];par[id][k]=o+H[k];g[id][k]=(canonCost()-c0)/H[k];par[id][k]=o;}return g;};
for(const [lr,n] of [[0.02,400],[0.005,3000],[0.001,8000]])for(let i=0;i<n;i++){const g=closeGrad();
  ids.forEach(id=>{if(id==='home')return;par[id].x-=lr*g[id].x;par[id].z-=lr*g[id].z;par[id].yaw-=lr*1e-7*g[id].yaw;});}
const WC=3e5;
for(const [lr,n] of [[0.001,4000],[0.0004,8000],[0.00015,12000]])for(let i=0;i<n;i++){
  const gc=closeGrad(),gk=canonGrad();
  ids.forEach(id=>{if(id==='home')return;par[id].x-=lr*(gc[id].x+WC*gk[id].x);par[id].z-=lr*(gc[id].z+WC*gk[id].z);
    par[id].yaw-=lr*1e-7*(gc[id].yaw+WC*gk[id].yaw);});}
// ぜんたいを まわして canon の 方角に あわせる(closure ふへん)
const base={};for(const id of ids)base[id]=cen(id);
const err=th=>{const h=rot(base.home,th);let c=0;for(const id in CU){if(!base[id])continue;
  const p=rot(base[id],th),dx=p.x-h.x,dz=p.z-h.z,L=Math.hypot(dx,dz)||1;c+=2-2*((dx/L)*CU[id].x+(dz/L)*CU[id].z);}return c;};
let th=0,bv=Infinity;for(let d=0;d<7200;d++){const t=d/20*Math.PI/180,v=err(t);if(v<bv){bv=v;th=t;}}
for(const id of ids){const o=rot({x:par[id].x,z:par[id].z},th);par[id].x=o.x;par[id].z=o.z;par[id].yaw+=th;}

// --- special region を おく ---
const norm=a=>((a%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
// star_stop: ゴンドラは たてに のぼる → stop を countryside.skyland の 真上に。
//            yaw は のりばへの しんこう(mountpath→skyland)を そのまま ひきつぐ
{ const land=gp('countryside',sp('countryside','skyland'));
  const mp=sp('countryside','mountpath'), sk=sp('countryside','skyland');
  const dir=rot({x:sk.x-mp.x,z:sk.z-mp.z},par.countryside.yaw);
  const yaw=Math.atan2(dir.x,dir.z);
  const stop=sp('star_stop','stop'); const q=rot({x:stop.x,z:stop.z},yaw);
  par.star_stop={x:land.x-q.x, z:land.z-q.z, yaw}; }
// deepsea: もぐるのは たて → reef を sea.seacave の 真下に。yaw は うみの yaw を ひきつぐ
{ const cave=gp('sea',sp('sea','seacave')); const yaw=par.sea.yaw;
  const reef=sp('deepsea','reef'); const q=rot({x:reef.x,z:reef.z},yaw);
  par.deepsea={x:cave.x-q.x, z:cave.z-q.z, yaw}; }
// jungle: 外洋を ひとわたり(= sea の おくゆき 8000)こえた さき。むきは canon の 南西
{ const bw=gp('sea',sp('sea','breakwater'));
  const SW=225*Math.PI/180, CROSS=W.sea.len;         // ひとわたり = うみの おくゆき
  const to={x:bw.x+Math.sin(SW)*CROSS, z:bw.z+Math.cos(SW)*CROSS};
  const yaw=SW;                                       // しまへ むかう むきが そのまま しまの +z
  const en=sp('jungle','entry'); const q=rot({x:en.x,z:en.z},yaw);
  par.jungle={x:to.x-q.x, z:to.z-q.z, yaw}; }

// --- まるめ ---
const R10=v=>Math.round(v/10)*10, R4=v=>Math.round(norm(v)*1e4)/1e4;
const FRAME={};
const LAYER={home:'ground',city:'ground',countryside:'ground',forest:'ground',mountain:'ground',snow:'ground',
  sea:'ground',river_lake:'ground',jungle:'ground',desert:'ground',star_stop:'sky',deepsea:'below'};
const Y={ground:0, sky:4800, below:-1600};
for(const id of Object.keys(LAYER)) FRAME[id]={x:R10(par[id].x), y:Y[LAYER[id]], z:R10(par[id].z), yaw:R4(par[id].yaw), layer:LAYER[id]};
par=FRAME;   // まるめた 値で けんさん
console.log('=== まるめた あとの closure (walk 10 本) ===');
let mx=0,ss=0;for(const e of WALK){const a=gp(e.a,e.A),b=gp(e.b,e.B);const d=Math.hypot(a.x-b.x,a.z-b.z);
  mx=Math.max(mx,d);ss+=d*d;console.log('  ',e.id.padEnd(22),d.toFixed(1).padStart(6));}
console.log('  さいだい =',mx.toFixed(1),'/ RMS =',Math.sqrt(ss/WALK.length).toFixed(1),'  (目標 < 400)');
console.log('\n=== special connection の X/Z ずれ(しばらない。さんこう) ===');
for(const c of G.connections){ if(!c.b||!c.gate||c.gate.kind==='walk'||!c.mouths)continue;
  const a=gp(c.a,sp(c.a,c.mouths[c.a])),b=gp(c.b,sp(c.b,c.mouths[c.b]));
  console.log('  ',c.id.padEnd(22),c.gate.kind.padEnd(9),Math.round(Math.hypot(a.x-b.x,a.z-b.z)),
    ' 高さの さ =',FRAME[c.b].y-FRAME[c.a].y);}
console.log('\n=== REGION_FRAME ===');
for(const id of Object.keys(FRAME)){const f=FRAME[id];
  console.log('  '+(id+':').padEnd(14)+'{ x: '+String(f.x).padStart(7)+', y: '+String(f.y).padStart(6)+', z: '+String(f.z).padStart(7)+', yaw: '+f.yaw.toFixed(4).padStart(6)+", layer: '"+f.layer+"' },  // "+(f.yaw*180/Math.PI).toFixed(1)+'°');}
fs.writeFileSync('/tmp/claude-0/-home-user-naotocchi/076d594d-954c-5699-a858-f367b5ded6a4/scratchpad/FRAME.json',JSON.stringify(FRAME,null,1));
