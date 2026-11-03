// Home-owned compositions for the formal thirteen IDs. Display never grants an unlock.
const habitat=(concept,layers,placements,extra={})=>({status:'pilot',concept,layers,placements,
 camera:{position:[0,1120,1500],target:[0,40,-1400],fov:52},
 seats:[[0,550],[-240,1200],[300,160],[-300,380],[220,1650],[340,820]],
 activityBounds:{minX:-1050,maxX:1050,minZ:0,maxZ:2050},
 path:[[-80,-400],[80,350],[-30,900],[100,1600],[0,2400],[100,3800]],pathHalf:85,
 observationPoints:[{id:'view',activity:'observe',x:-180,z:900,target:{x:-580,z:1900},label:'景色を眺める'}, {id:'rest',activity:'rest',x:280,z:600,target:{x:650,z:1000},label:'ひとやすみ'}],...extra});
export const HOME_SCENERY=Object.freeze({
 home:habitat('帰ってきたくなる庭',['家とのきした','菜園と小道','温かな庭'],[
 ['house',-450,1900,2.1],['bigtree',750,2100,1.5],['broadleaf',-850,1100,1.3],['broadleaf',1100,2800,1.5],
 ['hedge',-700,600,1.7],['hedge',750,1100,1.5],['fence',-850,1600,1.6],['fence',900,1750,1.6],['bench',500,800,1.3],['pot',-480,1450,1.7],['pot',-650,1400,1.5],['boxprop',-650,1700,1.3],['lamp',-680,1200,1.3],['slide',650,1600,1.2],['flower',-450,350,2],['flower',550,300,2],['smalllog',-550,850,1.5]],
 {trailPartition:true,camera:{position:[0,1060,1460],target:[0,40,-1300],fov:51},
 observationPoints:[{id:'home-relax',activity:'rest',x:-160,z:800,target:{x:-450,z:1900},label:'おうちでくつろぐ'},{id:'garden',activity:'observe',x:250,z:600,target:{x:550,z:300},label:'庭の花を眺める'}]}),
 countryside:habitat('風の通る農村',['丘と風車','農家と田畑','農道'],[
 ['lm_windmill',-400,2300,.78],['house',680,2050,1.8],['house',1000,2800,1.3],['bigtree',-800,850,1.1],['broadleaf',920,1600,1.1],
 ...[-1,1].flatMap(side=>[650,950,1250,1550].map((z,i)=>['croprow',side*(500+i*35),z,3.5])),
 ['hay',720,700,1.3],['fence',-950,600,1.4],['fence',950,1100,1.5],['flower',-450,250,1.6],['grass',550,180,1.4],['pinerow',-1100,3100,2],['pinerow',1050,3400,1.8]],
 {trailPartition:true,observationPoints:[{id:'windmill',activity:'observe',x:-180,z:1000,target:{x:-650,z:2050},label:'風車を眺める'},{id:'field',activity:'rest',x:270,z:600,target:{x:540,z:650},label:'畑のそばで休む'}]}),
 mountain:habitat('雲に近い山道',['重なる山並み','岩壁と尾根','安全な山道'],[
 ['lm_peak',-850,3300,.9],['lm_peak',650,3800,1.2],['lm_peak',1400,2900,.8],['rockwall',-1100,1700,2.1],['rockwall',1000,2200,1.7],
 ['rock',-700,450,1.7],['rock',650,1050,1.4],['rock',-620,1500,1.4],['conifer',-900,2400,1.7],['conifer',900,700,1.3],['pinerow',-1450,2800,1.4],['tent',550,1900,1.3],['telescope',-500,2200,1.2],['flower',-450,800,1.8],['pebbles',500,350,1.4]],
 {trailPartition:true,camera:{position:[0,1200,1580],target:[0,80,-1450],fov:53},activityBounds:{minX:-950,maxX:950,minZ:0,maxZ:2000},
 observationPoints:[{id:'peaks',activity:'observe',x:-140,z:1000,target:{x:650,z:3800},label:'遠くの山を眺める'},{id:'ridge',activity:'rest',x:240,z:600,target:{x:-1100,z:1700},label:'山道で休む'}]}),
 snow:habitat('静かな雪景色',['雪山','針葉樹と雪屋根','雪道'],[
 ['lm_peak',-800,3300,.9],['lm_peak',1100,3600,.75],['house',-650,1800,1.8],['dome',700,2100,1.8],
 ...[-1,1].flatMap(side=>[350,1050,1700,2400,3000].map((z,i)=>['conifer',side*(650+i*80),z,1.3+i*.2])),
 ['crystal',520,700,1.4],['logs',-650,800,1.5],['rock',750,1300,1.3],['bench',-460,1100,1.2]],
 {trailPartition:true,observationPoints:[{id:'snow',activity:'observe',x:-180,z:850,target:{x:-800,z:3300},label:'雪を見つめる'},{id:'snow-rest',activity:'rest',x:240,z:650,target:{x:700,z:2100},label:'雪道で休む'}]}),
 sea:habitat('水平線の浜辺',['水平線と島影','波打ち際と海岸岩','広い砂浜'],[
 ['lm_lighthouse',800,2600,.8],['rockwall',850,2700,1.8],['rock',-1100,2200,1.8],['rock',-800,1400,1.4],['rock',-900,450,1.1],
 ['palm',720,350,1.4],['palm',980,1800,1.6],['palm',500,2400,1.3],['parasol',650,1100,1.3],['boat',-1250,1850,1.4],['house',950,2900,1.4],['pebble',-550,200,1.5],['pebbles',-600,700,1.6],['smalllog',650,600,1.2]],
 {path:[],terrain:{kind:'coast',side:-1,pts:[[-700,-400],[-500,900],[-100,1800],[800,3000],[1800,3800]]},activityBounds:{minX:-500,maxX:1050,minZ:0,maxZ:2100},
 observationPoints:[{id:'waves',activity:'observe',x:-380,z:900,target:{x:-1100,z:1300},label:'波を眺める'},{id:'beach',activity:'rest',x:250,z:450,target:{x:-900,z:700},label:'砂浜で休む'}]}),
 deepsea:habitat('光の漂う海底',['暗い海溝','発光生物と岩礁','砂の海底'],[
 ['reef',-850,2600,2.5],['reef',800,3000,2.2],['hull',-900,2100,1.7],['pillar',700,2250,1.6],['vent',-600,1500,1.5],
 ...[-1,1].flatMap(side=>[300,950,1700,2500].map((z,i)=>['coralfan',side*(520+i*90),z,1.4+i*.15])),
 ['coral',-600,700,2],['coral',650,1300,2],['kelp',-900,1100,1.8],['kelp',850,1800,1.9],['glowdecal',-470,600,2],['glowdecal',500,900,2],['sparkle',-280,1400,2],['sparkle',350,1100,2],['pebbles',450,200,1.7]],
 {path:[],terrain:{kind:'chasm',half:180,pts:[[1350,-400],[1250,1500],[1500,3800]]},activityBounds:{minX:-1000,maxX:1000,minZ:0,maxZ:2050},
 observationPoints:[{id:'glow',activity:'observe',x:-160,z:900,target:{x:-600,z:1500},label:'海底の光を観察する'},{id:'seabed',activity:'rest',x:280,z:600,target:{x:650,z:1300},label:'海底で休む'}]}),
 jungle:habitat('葉に包まれる熱帯',['滝と樹冠','つると巨大な葉','木の根の道'],[
 ['waterfall',-700,2550,1.7],['rockwall',-1000,2800,2],['buttress',-700,600,1.5],['buttress',750,1550,1.8],['bigtree',-800,1900,1.7],['bigtree',700,2700,2.2],['palm',-500,2900,1.8],['palm',1100,2100,1.8],
 ...[-1,1].flatMap(side=>[200,850,1450,2200].map((z,i)=>['leafclump',side*(480+i*100),z,1.4+i*.25])),
 ['vine',-650,1500,1.5],['vine',850,2400,1.8],['fern',-500,400,2.2],['fern',550,680,2.2],['flower',450,1200,1.5],['log',-500,1100,.7],['broadleaf',-1300,3100,1.9]],
 {trailPartition:true,observationPoints:[{id:'leaves',activity:'observe',x:-180,z:850,target:{x:-700,z:600},label:'巨大な葉を見上げる'},{id:'waterfall',activity:'rest',x:240,z:1100,target:{x:-700,z:2550},label:'滝を眺める'}]}),
 desert:habitat('砂丘と日陰',['岩山と砂丘','オアシス','乾いた道'],[
 ['rockwall',-1100,3000,3],['rockwall',1200,3500,2.2],['sandwall',-1200,2200,2.4],['sandwall',1300,1800,2],
 ['rock',-700,700,1.9],['rock',850,1400,1.7],['cactus',550,300,1.4],['cactus',-700,1600,1.8],['cactus',1100,2400,1.4],
 ['palm',650,2300,1.7],['palm',1000,2500,1.5],['tent',-600,2100,1.5],['pot',-480,1800,1.3],['pebble',480,750,1.4],['lowmound',-1100,350,1.9]],
 {path:[],ponds:[{id:'home-oasis',kind:'water',x:850,z:2250,r:280}],observationPoints:[{id:'dunes',activity:'observe',x:-150,z:1100,target:{x:1200,z:3500},label:'砂丘を眺める'},{id:'rock-shade',activity:'rest',x:-340,z:650,target:{x:-700,z:700},label:'岩陰で休む'}]}),
 star_stop:habitat('星空の停留所',['星空と浮島','正式停留所と望遠鏡','光の足場'],[
 ['lm_bigstop',-400,2100,.95],['telescope',650,1350,1.7],['orrery',-650,1100,1.7],['bench',470,750,1.3],
 ['lamp',-520,350,1.6],['lamp',650,1900,1.5],['lamp',-850,2300,1.7],['crystal',-700,650,1.8],['crystal',800,1000,1.6],['crystal',-1000,1750,2],
 ['sandwall',-1200,2900,2],['sandwall',1200,3300,2.5],['sparkle',-300,1300,2.5],['sparkle',450,1800,2],['ruin',900,2700,1.5]],
 {sky:['#0a0c2a','#2c2560'],trailPartition:true,activityBounds:{minX:-900,maxX:900,minZ:0,maxZ:2000},
 observationPoints:[{id:'stars',activity:'observe',x:-140,z:950,target:{x:0,z:3600},label:'星を眺める'},{id:'stop-rest',activity:'rest',x:240,z:650,target:{x:-400,z:2100},label:'停留所で休む'}]}),
 memory_lake:habitat('霧の向こうの記憶',['霧と静かな湖','柔らかな光と対岸の木','静かな湖岸'],[
 ['broadleaf',-680,1700,1.8],['broadleaf',-1100,2600,2],['broadleaf',-700,3300,1.8],['broadleaf',1400,3300,1.6],['broadleaf',1700,2900,1.4],
 ['rock',-650,500,1.2],['rock',550,1450,1.2],['lamp',-450,1100,1.5],['lamp',-800,2200,1.5],['reeds',650,700,1.5],['reeds',650,1700,1.6],['fern',-550,250,1.6],['leaf',-430,600,2],['sparkle',350,1800,2],['sparkle',-200,2200,1.5]],
 {sky:['#373c60','#7e92ad'],path:[],terrain:{kind:'coast',side:1,pts:[[650,-400],[450,900],[150,1800],[-700,3200],[-1500,3800]]},activityBounds:{minX:-1050,maxX:550,minZ:0,maxZ:2050},
 observationPoints:[{id:'memory-water',activity:'observe',x:360,z:950,target:{x:1100,z:1600},label:'湖面を眺める'},{id:'quiet-bank',activity:'rest',x:-180,z:600,target:{x:850,z:2200},label:'湖畔で休む'}]}),
 forest:{status:'pilot',concept:'巨木の間を歩く林道',camera:{position:[0,1020,1390],target:[0,40,-1250],fov:48},
  seats:[[0,550],[-240,1220],[340,120],[-310,400],[190,1600],[350,800]],
  layers:['重なる樹冠','曲がる林道と巨木','木陰と落ち葉'],
  placements:[['bigtree',-590,160,1.15],['broadleaf',600,420,1.1],['bigtree',-470,1180,1.65],['bigtree',620,1500,1.85],['broadleaf',-680,1580,1.7],['conifer',630,1790,1.8],['bigtree',-220,2380,2.3],['broadleaf',390,2350,1.8],['broadleaf',-980,2200,2],['conifer',950,2580,2.2],['log',-370,680,.8],['mushrooms',-430,850,1.6],['mushrooms',470,1080,1.4],['leaf',-280,950,2],['leaf',320,400,1.8],['flower',-370,520,1.4],['fern',430,730,1.7]],
  trailPartition:true,path:[[-130,-300],[120,150],[-40,600],[-170,1000],[180,1500],[70,2100],[-150,3000]],pathHalf:90,
  observationPoints:[{id:'canopy',activity:'observe',x:-180,z:900,target:{x:-470,z:1180},label:'木を見上げる'},{id:'shade',activity:'rest',x:300,z:720,target:{x:620,z:1500},label:'木陰で休む'}]},
 river_lake:{status:'pilot',concept:'川のほとり',camera:{position:[0,1210,1510],target:[0,0,-1250],fov:49},
  seats:[[80,550],[360,1320],[-250,90],[410,300],[660,1700],[-130,550]],
  river:{center:1450,slope:1.1,half:500},
  layers:['川の続く丘','木橋と水車','石と葦の岸辺'],
  placements:[['broadleaf',-1080,2480,1.6],['broadleaf',1150,2520,1.7],['broadleaf',-620,2780,1.5],['house',-780,1600,1.6],['wheel',-250,1862,2.4],['bridge',-480,922,1],['rock',-180,610,.8],['rock',-600,180,.7],['rock',650,1550,.7],['reeds',-680,130,1.3],['reeds',-280,450,1.2],['reeds',500,1350,1.1],['grass',-650,1000,1.3],['flower',690,850,1.4]],
  path:[[-900,-240],[-450,120],[0,610],[500,1150],[1000,1700],[1600,2300]],pathHalf:85,
  observationPoints:[{id:'fish',activity:'observe',x:260,z:900,target:{x:100,z:1560},label:'魚を眺める'},{id:'bridge-bank',activity:'rest',x:-50,z:530,target:{x:-480,z:922},label:'橋の近くで休む'}]},
 city:{status:'pilot',concept:'高層ビルに囲まれた街角',camera:{position:[0,1500,1780],target:[0,80,-1400],fov:61},
  seats:[[0,550],[260,1050],[-220,140],[340,400],[-220,1100],[100,100]],
  layers:['奥行きのある高層ビル群','商店と交差点','歩行者広場と小公園'],
  // Last item selects a semantic variant from the official Meguru catalogue.
  placements:[['tower',-1080,2200,2.7,'mid'],['tower',-450,2570,3.25,'high'],['tower',60,3100,3.8,'high'],['tower',620,2680,3.1,'high'],['tower',1050,3300,3.6,'high'],['tower',-1030,3500,3.8,'high'],['tower',-300,3800,3.4,'high'],['tower',420,4000,3.6,'high'],
   ['tower',-1440,2300,2.5,'mid'],['tower',-1400,3200,3.2,'high'],['tower',-760,2880,2.7,'mid'],['tower',-100,2540,2.3,'mid'],['tower',380,2950,2.6,'mid'],['tower',860,2350,2.3,'mid'],['tower',1380,2720,3,'high'],['tower',1440,3600,3.3,'high'],['tower',-680,4100,3.5,'high'],['tower',120,4300,3.1,'high'],['tower',780,4180,3.3,'high'],['tower',1250,1900,1.8,'shop'],['house',-350,1710,1],['house',660,1670,.95],['tower',-350,1900,1.8,'shop'],['tower',220,2070,2.1,'mid'],['tower',660,1850,1.8,'shop'],['tower',-1120,650,2,'mid'],['tower',920,980,1.65,'shop'],
   ['broadleaf',-430,750,.9],['broadleaf',610,720,1],['broadleaf',600,1030,.8],['broadleaf',-430,1750,.65],['broadleaf',460,1740,.65],
   ['bench',400,550,1.1],['bench',-360,1000,1.1],['lamp',-420,160,1.1],['lamp',420,1130,1.2],['lamp',-300,1650,1],['signal',-260,1550,1.3],['flower',600,370,1.2],['bush',650,560,1.1],['bush',-470,800,.9],['car',0,1400,1]],
  path:[],pathHalf:0,
  observationPoints:[{id:'traffic',activity:'observe',x:260,z:1110,target:{x:0,z:1400},label:'車を眺める'},{id:'street-tree',activity:'rest',x:300,z:650,target:{x:610,z:720},label:'公園で休む'},{id:'shop',activity:'observe',x:-180,z:1050,target:{x:-350,z:1900},label:'建物を見上げる'}]},
});
// Same lens/pose for visible terrain and pointer/pathfinding projection.
export function configureHomeCamera(camera,width,height,config){
 const c=config||{position:[0,1100,1350],target:[0,0,-1000],fov:46};
 camera.clearViewOffset();camera.fov=c.fov;camera.aspect=width/height;
 camera.position.set(...c.position);camera.lookAt(...c.target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
}

export function rotateWheelPoint(point,pivot,angle){
 const y=point.y-pivot.y,z=point.z-pivot.z,c=Math.cos(angle),s=Math.sin(angle);
 return {y:pivot.y+y*c-z*s,z:pivot.z+y*s+z*c};
}

// One partition of the city floor. All parcel interiors are disjoint; roads,
// crossings and paving are cut at shared boundaries instead of stacked boxes.
export function cityGroundParcels(){
 const baseXs=[-2200,-1500,-1100,-810,-590,-420,-210,0,210,420,630,840,1100,1500,2200];
 const zs=[-400,-200,0,200,400,600,800,1000,1070,1230,1290,1510,1570,1730,1950,2200,2500,2800,3200,3800,4400];
 const out=[];
 for(let j=0;j<zs.length-1;j++){
 const xs=zs[j]===1290?[...baseXs,...[-150,-120,-90,-60,-30,30,60,90,120,150]].sort((a,b)=>a-b):baseXs;
 for(let i=0;i<xs.length-1;i++){
  const x0=xs[i],x1=xs[i+1],z0=zs[j],z1=zs[j+1],x=(x0+x1)/2,z=(z0+z1)/2;
  const road=z>=1290&&z<1510||x>=-810&&x<-590&&(z<1070||z>=1510);
  const crossing=road&&z>=1290&&z<1510&&x>=-150&&x<150&&Math.floor((x+150)/30)%2===0;
  const lawn=!road&&x>=420&&x<840&&z>=400&&z<1000;
  const curb=!road&&(z>=1230&&z<1290||z>=1510&&z<1570);
  const pavement=!road&&!lawn&&!curb;
  // Fine joints are gaps down to the continuous ground, never overlaid polygons.
  const inset=pavement?1:0;
  out.push({a:{x:x0+inset,z},b:{x:x1-inset,z},kind:'wide',half:(z1-z0)/2-inset,len:x1-x0-2*inset,height:1.2,
   surface:road?'road':lawn?'park-lawn':curb?'curb':'sidewalk',
   color:crossing?'#f1eedf':road?'#697780':lawn?'#89a878':curb?'#deded2':(i+j)%3?'#cdd0c5':'#c9cdc3'});
 }
 }
 return out;
}

// One connected floor: the trail and both shoulders share positions, not depth bias.
// Cross sections follow the sampled original curve; no grass triangle crosses it.
export function homeTrailPartition(world,sample){
 const points=world.homeTrail,half=world.homeTrailHalf,left=[],path=[],right=[];
 const xAt=z=>{let i=1;while(i<points.length-1&&points[i][1]<z)i++;const a=points[i-1],b=points[i],t=Math.max(0,Math.min(1,(z-a[1])/(b[1]-a[1])));return a[0]+(b[0]-a[0])*t;};
 for(let z=-400;z<=-400+Math.ceil((world.len+800)/80)*80;z+=40){
  const x=xAt(z),edgeL=x-half,edgeR=x+half;
  const vertex=x=>[x,(x===edgeL||x===edgeR)?0:sample(x,z),-z];
  const l=[],r=[];for(let i=0;i<=16;i++){l.push(...vertex(world.minX-400+(edgeL-world.minX+400)*i/16));r.push(...vertex(edgeR+(world.maxX+400-edgeR)*i/16));}
  // Assign exactly, avoiding floating-point endpoint drift at the join.
  l.splice(-3,3,edgeL,0,-z);r.splice(0,3,edgeR,0,-z);
  left.push(l);path.push([edgeL,0,-z,edgeR,0,-z]);right.push(r);
 }
 return {left,path,right};
}

// Barycentric sampling of precisely the triangles emitted by the shared floor.
export function homePartitionHeight(partition,x,z){
 const j=Math.max(0,Math.min(partition.path.length-2,Math.floor((z+partition.path[0][2])/40))),v=(z+partition.path[j][2])/40;
 for(const name of ['left','path','right']){
  const a=partition[name][j],b=partition[name][j+1],last=a.length-3,lo=a[0]+(b[0]-a[0])*v,hi=a[last]+(b[last]-a[last])*v;
  if(x<lo-1e-7||x>hi+1e-7)continue;
  const k=Math.max(0,Math.min(last/3-1,Math.floor((x-lo)/(hi-lo)*(last/3))))*3;
  // The emitted diagonal joins top-right to bottom-left. Horizontal rows
  // reduce barycentrics to v and a linear horizontal distance per triangle.
  const left=a[k]+(b[k]-a[k])*v,diagonal=a[k+3]+(b[k]-a[k+3])*v;
  if(x<=diagonal){const u=(x-left)/(a[k+3]-a[k]);return (1-u-v)*a[k+1]+u*a[k+4]+v*b[k+1];}
  const right=a[k+3]+(b[k+3]-a[k+3])*v,u=(right-x)/(b[k+3]-b[k]);
  return (1-v)*a[k+4]+(v-u)*b[k+4]+u*b[k+1];
 }
 return -.2;
}
