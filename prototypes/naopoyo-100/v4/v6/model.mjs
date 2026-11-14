import * as v5 from '../v5/model.mjs';
import{byId,worldIds}from'../v5/catalog.mjs';import{boardSignature}from'../../session.mjs';import{nativeKinds,checkParams,plain,safeId,cellSlot}from'./contracts.mjs';
export const speciesIds=['dog','frog','fish','penguin'];
export const FORMAT='naopoyo.editor.v6',STORAGE_KEY='naopoyo.editor.owner.v6';
export const clone=structuredClone;
export const rulesetId=d=>'formal-four-v1';
export function createDraft(board){return{...v5.createDraft(board),format:FORMAT,schemaVersion:1,metadata:{title:board.title||'自分の世界'},rulesetId:'formal-four-v1'}}
export const changeWorld=v5.changeWorld,paintTerrain=v5.paintTerrain,paintDecoration=v5.paintDecoration;
export function revised(d,n){n.rulesetId=rulesetId(n);if(boardSignature(d.board)!==boardSignature(n.board))n.play={signature:boardSignature(n.board),actions:[],groups:[],cleared:false};return n}
export function paintGimmick(d,x,y,id,p={}){checkParams(id,p,speciesIds);let n=v5.paintGimmick(d,x,y,id,p);if(id==='sign.gravity')n.board.tiles=n.board.tiles.filter(t=>t.catalogId!=='sign.gravity');return revised(d,n)}
export const placeActor=v5.placeActor;
export function erase(d,x,y,layer){return revised(d,v5.erase(d,x,y,layer))}
export const validPosition=t=>Number.isInteger(t.x)&&Number.isInteger(t.y)&&t.x>=0&&t.x<8&&t.y>=0&&t.y<8;
const keys=(v,allowed)=>plain(v)&&Object.keys(v).every(k=>allowed.includes(k));
export function structuralErrors(d){try{
 if(!keys(d,['format','schemaVersion','rulesetId','metadata','board','appearance','play'])||d.format!==FORMAT||d.schemaVersion!==1)throw Error('V6スキーマが不正です');
 if(!keys(d.metadata,['title'])||typeof d.metadata.title!=='string'||d.metadata.title.length>80)throw Error('ステージ名は80文字以内です');
 const b=d.board,a=d.appearance;if(!keys(b,['id','title','w','h','gravity','walls','gates','spikes','exits','actors','tiles'])||b.w!==8||b.h!==8||typeof b.gravity!=='boolean'||!safeId(b.id)||b.title!==undefined&&(typeof b.title!=='string'||b.title.length>160))throw Error('8×8の開始盤面が必要です');
 for(const k of ['walls','gates','spikes','exits','actors','tiles'])if(!Array.isArray(b[k])||b[k].length>(k==='tiles'?256:64))throw Error('盤面配列が不正です');
 const walls=new Set();for(const p of b.walls){if(!Array.isArray(p)||p.length!==2||!validPosition({x:p[0],y:p[1]})||walls.has(p.join(',')))throw Error('壁が不正です');walls.add(p.join(','))}
 const ids=new Set(),actorCells=new Set();for(const actor of b.actors){if(!keys(actor,['id','species','level','x','y'])||!safeId(actor.id)||ids.has(actor.id)||!validPosition(actor)||!speciesIds.includes(actor.species)||!Number.isInteger(actor.level)||actor.level<1||actor.level>8||walls.has(`${actor.x},${actor.y}`)||actorCells.has(`${actor.x},${actor.y}`))throw Error('キャラクター配置が不正です');ids.add(actor.id);actorCells.add(`${actor.x},${actor.y}`)}
 const slots=new Set();for(const t of [...Object.entries(nativeKinds).flatMap(([k,id])=>b[k].map(({x,y,...params})=>({x,y,catalogId:id,params}))),...b.tiles]){if(!keys(t,['x','y','catalogId','params'])||!validPosition(t)||!byId.get(t.catalogId)?.placeable)throw Error('素材の位置/IDが不正です');checkParams(t.catalogId,t.params,speciesIds);if(b.tiles.includes(t)&&['terrain.floor','terrain.wall',...Object.values(nativeKinds)].includes(t.catalogId))throw Error('正式の格納位置を使ってください');if(t.params.id!==undefined){if(ids.has(t.params.id))throw Error('配置IDが重複しています');ids.add(t.params.id)}if(t.catalogId==='sign.gravity')continue;
 const key=`${cellSlot(t.catalogId)}:${t.x},${t.y}`;if(slots.has(key))throw Error('同じ層の配置が重なっています');slots.add(key);if(walls.has(`${t.x},${t.y}`)&&!t.catalogId.startsWith('scenery.'))throw Error('壁と仕掛けが重なっています');if(t.catalogId==='object.crate'&&(actorCells.has(`${t.x},${t.y}`)||b.tiles.some(w=>w.catalogId==='terrain.water'&&w.x===t.x&&w.y===t.y)))throw Error('箱とキャラクター/水域が重なっています');}
 if(!keys(a,['version','world','seed','materials','decorations'])||a.version!==1||!worldIds.includes(a.world)||!Number.isSafeInteger(a.seed)||a.seed<0||a.seed>2147483647||!Array.isArray(a.materials)||a.materials.length!==64||!Array.isArray(a.decorations)||a.decorations.length>64)throw Error('環境データが不正です');
 for(const [i,id]of a.materials.entries()){if(id===null)continue;const e=byId.get(id),x=i%8,y=Math.floor(i/8);if(!id?.startsWith('v5.terrain.')||!e||(e.physicsId==='terrain.wall')!==walls.has(`${x},${y}`)||(e.physicsId==='terrain.water')!==b.tiles.some(t=>t.catalogId==='terrain.water'&&t.x===x&&t.y===y))throw Error('見た目と物理地形が一致しません')}
 const dc=new Set();for(const t of a.decorations){if(!keys(t,['id','x','y'])||!validPosition(t)||byId.get(t.id)?.category!=='decoration'||!byId.get(t.id)?.placeable||dc.has(`${t.x},${t.y}`))throw Error('装飾が不正です');dc.add(`${t.x},${t.y}`)}
 if(d.rulesetId!==rulesetId(d))throw Error('検証ルールの指定が一致しません');return[];
 }catch(e){return[e.message]}}
export function validateDraft(d){const errors=structuralErrors(d);if(errors.length)return errors;return v5.validateDraft({...d,format:v5.FORMAT})}
export function checkedEdit(d,n){n=revised(d,n);const errors=structuralErrors(n);if(errors.length)throw Error(errors.join('\n'));return n}
export const encode=d=>{const errors=validateDraft(d);if(errors.length)throw Error(errors.join('\n'));return JSON.stringify(d)};
export function decode(text){if(typeof text!=='string'||text.length>1000000)throw Error('JSONが大きすぎます');const d=JSON.parse(text),errors=validateDraft(d);if(errors.length)throw Error(errors.join('\n'));return d}
export const DraftHistory=v5.DraftHistory;
