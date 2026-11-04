export {EVENTS} from './events.mjs';
export const REGIONS=['forest','sea','city','square'];
export const REGION_NAMES={forest:'こもれびの森',sea:'きらめきの海',city:'はじまりの都会',square:'めぐりあい広場'};
export const TILE_NAMES={plus:'おこづかい',event:'人生のできごと',minus:'あれれ…',social:'ふれあい',item:'贈りもの',fate:'時の扉',facility:'よりみち商店'};
// Event pools are compatibility keys; worldRegion describes the actual landscape.
const places=[
 [690,380,'home','おうちの商店'],[680,320,'home','庭先の分かれ道'],
 [735,270,'river_lake','川の木橋'],[755,205,'river_lake','東の川岸'],[725,145,'river_lake','湖のほとり'],[650,110,'river_lake','みなもとの湖'],
 [605,285,'home','木陰の庭'],[560,240,'forest','森の入口'],[555,180,'forest','こけの石段'],[570,120,'mountain','山の見晴らし'],[605,60,'mountain','北の小さな峠'],[510,80,'mountain','西の尾根道'],
 [440,150,'forest','森の小さな店'],[410,215,'forest','こもれびの分かれ道'],
 [340,210,'forest','木の実の森'],[290,250,'forest','小鳥の木立'],[250,300,'countryside','里山の贈りもの'],[250,355,'countryside','田畑の小道'],
 [455,270,'forest','深い森'],[425,330,'forest','石の森'],[375,370,'countryside','鎮守の森'],[315,390,'countryside','集落の縁側'],[230,415,'countryside','分水界の峠'],[215,465,'city','峠の向こうの町'],
 [165,480,'city','町の商店'],[145,535,'city','川沿いの分かれ道'],
 [80,555,'city','路地の花壇'],[65,615,'city','川辺の広場'],[85,675,'city','波止場の贈りもの'],[145,700,'city','船着き場'],
 [205,535,'city','並木の商店街'],[265,570,'city','時計台の坂'],[280,630,'city','町の時の扉'],[240,680,'sea','港の市場'],[205,735,'sea','湾の桟橋'],[275,745,'sea','砂浜への道'],
 [350,735,'sea','浜の小さな店'],[420,720,'sea','海辺の分かれ道'],
 [485,750,'sea','貝がらの浜'],[555,745,'sea','潮風のベンチ'],[615,710,'sea','浜辺の贈りもの'],[650,655,'sea','河口の見晴らし'],
 [450,655,'sea','砂丘の草はら'],[500,610,'sea','岬の坂道'],[555,590,'sea','海風の時の扉'],[610,600,'sea','海と谷の出会い'],[690,590,'home','峡谷の木道'],[700,480,'home','おうちへの坂道'],
];
export const BOARD=REGIONS.flatMap((region,s)=>{
 const types=['facility','plus','event',s%2?'social':'minus','item','event','plus',s%2?'minus':'social','fate','event','plus',s%2?'social':'minus'];
 return types.map((type,i)=>{const base=s*12,id=base+i;const next=i===1?[base+2,base+6]:i===5||i===9?[base+10]:i===11?[(base+12)%48]:[base+i+1];
 const [x,y,worldRegion,label]=places[id];const surface=[2,24,34].includes(id)?'bridge':worldRegion==='city'?'paving':worldRegion==='sea'?'sand':'soil';
 return{id,region,worldRegion,type,next,x,y,label,surface};});
});
export const SCHEDULE={10:[2,4,5,7,9],15:[3,5,8,10,13],20:[3,6,10,14,18]};
export const ITEMS={double:{name:'ダブルサイコロ',price:15,desc:'2個のサイコロで2〜12マス'},slow:{name:'ゆっくりサイコロ',price:8,desc:'1〜3マスで進む'},charm:{name:'おまもり',price:10,desc:'次のマイナス効果を1回ふせぐ'},clock:{name:'ときもどし時計',price:15,desc:'2段階若返る。次の選択イベント2回にそだち＋1'},seed:{name:'そだちの種',price:20,desc:'そだち＋3'},box:{name:'ふしぎな箱',price:10,desc:'お金・そだち・進化のいずれか'}};
export const MINI_NAMES=['ひかりをキャッチ','おぼえて、ぽん！','まどあかりパズル'];
export const SAVE_KEY='naotocchi-life-sugoroku-v1',ALBUM_KEY='naotocchi-life-albums-v1';
