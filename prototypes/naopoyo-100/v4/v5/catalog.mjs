import{atlasSource}from './atlas-source.mjs';import{materialRules}from '../../engine.mjs';
export const categories={terrain:'基本地形',gimmick:'ギミック',decoration:'装飾',world:'世界テンプレート'};
export const worldIds=['sea','snow','forest','sky','earth','cave'];
export const worldNames={sea:'海',snow:'雪山',forest:'森',sky:'空',earth:'地中',cave:'洞窟'};
const specs=[
 ['sand','砂底の浅い水路','sea','terrain.floor'],['seaWater','海水（正式水域）','sea','terrain.water'],['reef','岩礁','sea','terrain.wall'],
 ['snowfield','雪原・凍結した地面','snow','terrain.floor'],['snowwall','雪壁','snow','terrain.wall'],
 ['grass','草地','forest','terrain.floor'],['path','土の小道','forest','terrain.floor'],['grove','木立・密集した茂み','forest','terrain.wall'],
 ['platform','浮遊足場','sky','terrain.floor'],['air','空間（進入不可の候補）','sky','terrain.wall'],
 ['earthpath','地下の空洞','earth','terrain.floor'],['soil','土壁（掘削なし）','earth','terrain.wall'],['bedrock','岩盤','earth','terrain.wall'],
 ['cavefloor','洞窟の床','cave','terrain.floor'],['caverock','洞窟の岩壁','cave','terrain.wall']
];
export const terrainEntries=specs.map(([key,name,world,physicsId])=>({id:'v5.terrain.'+key,key,name,category:'terrain',worlds:[world],physicsId,physical:true,autotile:true,status:'試作中',placeable:true,rule:materialRules[physicsId]}));
const decoSpecs=[['kelp','昆布','sea'],['coral','珊瑚','sea'],['bubbles','装飾の泡（浮力なし）','sea'],['leaves','落ち葉','forest'],['moss','苔','forest'],['snowflakes','雪片','snow'],['icicles','氷柱','snow'],['crystals','結晶','cave'],['pebbles','小石','earth'],['light','光の粒子','sky']];
export const decorationEntries=decoSpecs.map(([key,name,world])=>({id:'v5.deco.'+key,key,name,category:'decoration',worlds:[world],physicsId:null,physical:false,autotile:false,status:'試作中',placeable:true,rule:'装飾のみ。能力・通行・入力を変えない。障害物にする場合は地形を配置。'}));
export const templates={sea:['sand','reef'],snow:['snowfield','snowwall'],forest:['grass','grove'],sky:['platform','air'],earth:['earthpath','soil'],cave:['cavefloor','caverock']};
const adopted=new Set(['terrain.floor','terrain.wall','fixture.spike','fixture.gate','fixture.exit','scenery.lamp','scenery.tree','scenery.grass','sign.gravity']);
export const existingEntries=atlasSource.map(e=>({id:e.id,name:e.name,category:e.id==='terrain.floor'||e.id==='terrain.wall'||e.id==='terrain.water'?'terrain':e.id.startsWith('scenery.')?'decoration':'gimmick',worlds:worldIds,physicsId:e.id,physical:!e.id.startsWith('scenery.'),autotile:e.id.startsWith('terrain.'),status:adopted.has(e.id)?'採用済み':Object.hasOwn(materialRules,e.id)?'試作中':'未承認',placeable:Object.hasOwn(materialRules,e.id),rule:materialRules[e.id]||'図鑑候補。現在の正式エンジンには未実装。',sourceStatus:e.implementation}));
export const worldEntries=worldIds.map(w=>({id:'v5.world.'+w,key:w,name:worldNames[w]+'の世界',category:'world',worlds:[w],physicsId:null,physical:false,autotile:false,status:'試作中',placeable:true,rule:'背景・既定素材・固定シードの初期表示。物理・能力・盤面署名を変えない。'}));
export const catalog=[...existingEntries,...terrainEntries,...decorationEntries,...worldEntries];
export const byId=new Map(catalog.map(e=>[e.id,e]));
export const defaults={
 'fixture.spike':{power:1},'fixture.exit':{exact:1},'fixture.gate':{min:1},'object.crate':{weight:2,min:2},
 'fixture.warp':{pairId:'A'},'fixture.burrow':{pairId:'A',role:'entrance',orientation:'E'},'terrain.tunnel':{max:2},
 'fixture.phase':{period:2,phase:0},'field.wave':{period:2,phase:0,orientation:'E'},'field.wind':{orientation:'E'},'field.current':{orientation:'E'},
 'fixture.sequence':{groupId:'order',step:1},'npc.owl':{exact:1,partner:'frog'}
};
export function physicsId(id){const e=byId.get(id);if(!e||!e.placeable)throw Error('配置できない素材: '+id);return e.physicsId}
