export {EVENTS} from './events.mjs';
export const REGIONS=['forest','sea','city','square'];
export const REGION_NAMES={forest:'こもれびの森',sea:'きらめきの海',city:'はじまりの都会',square:'めぐりあい広場'};
export const TILE_NAMES={plus:'おこづかい',event:'人生のできごと',minus:'あれれ…',social:'ふれあい',item:'贈りもの',fate:'時の扉',facility:'よりみち商店'};
const coords=[[110,25],[110,85],[45,135],[30,200],[45,265],[90,315],[190,135],[205,200],[190,265],[145,315],[115,375],[115,435]];
export const BOARD=REGIONS.flatMap((region,s)=>{
 const types=['facility','plus','event',s%2?'social':'minus','item','event','plus',s%2?'minus':'social','fate','event','plus',s%2?'social':'minus'];
 return types.map((type,i)=>{const base=s*12;let next=i===1?[base+2,base+6]:i===5||i===9?[base+10]:i===11?[(base+12)%48]:[base+i+1];
 const [u,v]=coords[i];let x,y;if(s===0){x=70+u;y=20+v;}if(s===1){x=420+v;y=10+u;}if(s===2){x=790-u;y=310+v;}if(s===3){x=450-v;y=730-u;}return{id:base+i,region,type,next,x,y,label:`${REGION_NAMES[region]} ${i+1}`};});
});
export const SCHEDULE={10:[2,4,5,7,9],15:[3,5,8,10,13],20:[3,6,10,14,18]};
export const ITEMS={double:{name:'ダブルサイコロ',price:15,desc:'2個のサイコロで2〜12マス'},slow:{name:'ゆっくりサイコロ',price:8,desc:'1〜3マスで進む'},charm:{name:'おまもり',price:10,desc:'次のマイナス効果を1回ふせぐ'},clock:{name:'ときもどし時計',price:15,desc:'2段階若返る。次の選択イベント2回にそだち＋1'},seed:{name:'そだちの種',price:20,desc:'そだち＋3'},box:{name:'ふしぎな箱',price:10,desc:'お金・そだち・進化のいずれか'}};
export const MINI_NAMES=['ひかりをキャッチ','おぼえて、ぽん！','まどあかりパズル'];
export const SAVE_KEY='naotocchi-life-sugoroku-v1',ALBUM_KEY='naotocchi-life-albums-v1';
