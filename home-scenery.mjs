// Home-owned art direction. IDs refer to the formal world master; planned entries
// do not unlock destinations or enable the Home adapter before owner device QA.
const planned=(concept,layers)=>({status:'planned',concept,layers});
export const HOME_SCENERY=Object.freeze({
 home:planned('帰ってきたくなる庭',['家とのきした','菜園と小道','温かな庭']),
 countryside:planned('風の通る農村',['丘と風車','農家と田畑','農道']),
 mountain:planned('雲に近い山道',['山並み','岩壁と尾根','安全な山道']),
 snow:planned('静かな雪景色',['雪山','針葉樹と雪屋根','雪道']),
 sea:planned('水平線の浜辺',['海と島','岩と波打ち際','砂浜']),
 deepsea:planned('光の漂う海底',['海溝','発光生物と岩','海底']),
 jungle:planned('葉に包まれる熱帯',['滝と樹冠','つると巨大な葉','木の根の道']),
 desert:planned('砂丘と日陰',['岩山と砂丘','オアシス','乾いた道']),
 star_stop:planned('星空の停留所',['星空','正式停留所と浮島','安全な島の足場']),
 memory_lake:planned('霧の向こうの記憶',['霧と湖','柔らかな光','静かな岸']),
 forest:{status:'pilot',concept:'巨木の間を歩く林道',camera:{position:[0,1020,1390],target:[0,40,-1250],fov:48},
  seats:[[0,550],[-240,1220],[340,120],[-310,400],[190,1600],[350,800]],
  layers:['重なる樹冠','曲がる林道と巨木','木陰と落ち葉'],
  placements:[['bigtree',-590,160,1.15],['broadleaf',600,420,1.1],['bigtree',-470,1180,1.65],['bigtree',620,1500,1.85],['broadleaf',-680,1580,1.7],['conifer',630,1790,1.8],['bigtree',-220,2380,2.3],['broadleaf',390,2350,1.8],['broadleaf',-980,2200,2],['conifer',950,2580,2.2],['log',-370,680,.8],['mushrooms',-430,850,1.6],['mushrooms',470,1080,1.4],['leaf',-280,950,2],['leaf',320,400,1.8],['flower',-370,520,1.4],['fern',430,730,1.7]],
  path:[[-130,-300],[120,150],[-40,600],[-170,1000],[180,1500],[70,2100],[-150,3000]],pathHalf:90,
  observationPoints:[{id:'canopy',activity:'observe',x:-180,z:900,target:{x:-470,z:1180},label:'木を見上げる'},{id:'shade',activity:'rest',x:300,z:720,target:{x:620,z:1500},label:'木陰で休む'}]},
 river_lake:{status:'pilot',concept:'川のほとり',camera:{position:[0,1210,1510],target:[0,0,-1250],fov:49},
  seats:[[80,550],[360,1320],[-250,90],[410,300],[660,1700],[-130,550]],
  river:{center:1450,slope:1.1,half:500},
  layers:['川の続く丘','木橋と水車','石と葦の岸辺'],
  placements:[['broadleaf',-1080,2480,1.6],['broadleaf',1150,2520,1.7],['broadleaf',-620,2780,1.5],['house',-650,1550,1.6],['wheel',-420,1430,2.4],['bridge',-480,922,1],['rock',-180,610,.8],['rock',-600,180,.7],['rock',650,1550,.7],['reeds',-680,130,1.3],['reeds',-280,450,1.2],['reeds',500,1350,1.1],['grass',-650,1000,1.3],['flower',690,850,1.4]],
  path:[[-900,-240],[-450,120],[0,610],[500,1150],[1000,1700],[1600,2300]],pathHalf:85,
  observationPoints:[{id:'fish',activity:'observe',x:260,z:900,target:{x:100,z:1560},label:'魚を眺める'},{id:'bridge-bank',activity:'rest',x:-50,z:530,target:{x:-480,z:922},label:'橋の近くで休む'}]},
 city:{status:'pilot',concept:'にぎやかな街角',camera:{position:[0,1170,1420],target:[0,0,-1100],fov:47},
  seats:[[40,550],[330,1050],[-130,100],[380,370],[-70,1170],[200,30]],
  layers:['高低差のある街並み','商店と交差点','歩道と小さな公園'],
  placements:[['house',-940,250,1.55],['house',780,780,1.55],['lamp',-350,100,1.1],['broadleaf',620,80,.8],['house',-430,1860,2.25],['house',30,1900,1.9],['house',540,1840,2],['tower',-850,2300,2.6],['tower',850,2550,3],['tower',180,2950,2.1],['house',-470,2690,1.8],['house',580,2820,2],['broadleaf',-770,800,1.1],['broadleaf',640,930,1.2],['lamp',-400,1190,1.5],['lamp',430,1190,1.5],['signal',-280,1530,1.5],['flower',540,650,1.4],['bush',-550,330,1.2],['bush',550,380,1.2],['car',0,1400,1]],
  path:[],pathHalf:0,
  observationPoints:[{id:'traffic',activity:'observe',x:380,z:1100,target:{x:0,z:1400},label:'車を眺める'},{id:'street-tree',activity:'rest',x:-350,z:650,target:{x:-770,z:800},label:'街路樹のそばで休む'},{id:'shop',activity:'observe',x:-160,z:1050,target:{x:-430,z:1860},label:'建物を見上げる'}]},
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
