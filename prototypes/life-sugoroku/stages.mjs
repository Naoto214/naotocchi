export const WORLD_GEOGRAPHY_SOURCE=Object.freeze({path:'meguru.js',symbol:'WORLD_GEOGRAPHY',version:2,canon:'v1',plan:'D2',master:'character-world-master.v1.js'});
export const WORLD_REGION_NAMES=Object.freeze({home:'おうち',river_lake:'かわ・みずうみ',mountain:'やま',forest:'もり',countryside:'いなか',city:'とかい',sea:'うみ'});
export const JAPAN_STAGE=Object.freeze({
 id:'meguru-japan',version:3,name:'なおとっちの日本めぐり',shortName:'日本',country:{code:'JP',name:'日本'},status:'playable',
 description:'ふたつの山地のあいだのおうちから、森と里山を越え、町と海をめぐる。',
 geography:{source:WORLD_GEOGRAPHY_SOURCE,orientation:'north-up',projection:'compressed-board-illustration',worldRegions:Object.keys(WORLD_REGION_NAMES),features:['west-range','east-range','source-lake','tenryu','divide','shonai','bay','coast'],watersheds:{tenryu:{source:'source-lake',via:['river_lake','home'],mouth:'open-sea',separateFrom:'shonai'},shonai:{source:'city-side-of-divide',via:['city'],mouth:'bay',separateFrom:'tenryu'}},abstractions:['48-node cyclic board; not a replacement for main-world travel connections','coast-to-home compresses the southern valley/canyon return','legacy region is an event pool; worldRegion is the actual landscape']},
 board:{module:'./data.mjs',export:'BOARD',nodeCount:48,startNode:0,forks:[1,13,25,37],branchArmLength:4,rounds:[10,15,20],tileSchema:'./tiles.mjs',coordinateSpace:{width:900,height:800}},
 events:{module:'./events.mjs',export:'EVENTS',poolKeys:['forest','sea','city','square'],selection:'worldRegion for V3; legacy region for migrated V2',regionPools:{home:'square',river_lake:'forest',mountain:'forest',forest:'forest',countryside:'square',city:'city',sea:'sea'},categories:['friend','fate'],regionalRewriteStatus:'canonical-geography-mapping'},
 gimmicks:[{id:'equal-forks',status:'implemented',description:'4か所の等距離分岐'},{id:'valley-bridges',status:'visual',description:'水系を越える木橋。移動ボーナスなし'},{id:'watershed-pass',status:'visual',description:'いなかととかいを分ける峠。追加判定なし'}],
 sounds:{mode:'existing-procedural-sfx',requiredAssets:[],ambientTracks:[],notes:'地域別環境音は未実装。地図から音源を読み込まない'},
 assets:{terrain:{kind:'native-svg',module:'./board-art.mjs',source:'original prototype illustration based on canonical geography'},tiles:{kind:'native-svg',module:'./tiles.mjs'},characters:{source:'official existing character assets via adapter.mjs'},external:[],draftAssets:[],overseasAssets:[]},
 playtime:{unit:'minutes',estimates:{10:[10,20],15:[15,30],20:[20,40]},basis:'design estimate for one human and CPU players; not measured playtest data'},
 extensionContract:{required:['id','version','name','status','geography','board','events','gimmicks','sounds','assets','playtime'],futureStages:'Register separate metadata, coordinate board, event pools and asset manifest; no future stage art is loaded by this stage.'},
});
export const STAGES=Object.freeze([JAPAN_STAGE]);
export function getStage(id='meguru-japan'){const stage=STAGES.find(s=>s.id===id);if(!stage)throw new RangeError(`Unknown stage: ${id}`);return stage;}
