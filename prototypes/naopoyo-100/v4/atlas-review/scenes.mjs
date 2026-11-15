import {reviewEntries} from './review.mjs';
import {stages} from '../../stages.mjs';
import {puzzles} from '../puzzles.mjs';
import {createGameState,describeTiles} from '../../engine.mjs';
import {createDraft,changeWorld} from '../v6/model.mjs';
import {sampleDraft} from '../v5/previews.mjs';
import {byId,worldNames} from '../v5/catalog.mjs';
import {effectiveMaterial} from '../v5/model.mjs';
import {LabPlayback,createLab} from '../v6/lab-playback.mjs';
import {conditionLabel} from '../v6/gimmick-study.mjs';
import {speciesLabel} from '../v6/characters.mjs';
const materialIndex=new Map(stages.map(s=>[s.id,new Set(describeTiles(createGameState(s.board)).map(t=>t.catalogId))]));
const preferred={'object.crate':'crates','fixture.plate.weight':'crates','field.updraft':'air','fixture.burrow':'earth','fixture.warp':'warp','npc.owl':'cooperate'};
export function sceneFor(id,variant='formal'){
 const e=reviewEntries.find(e=>e.id===id);if(!e)throw Error('Unknown material ID');
 if(['F1','F2','D1','D2'].includes(variant)){
  if(!(id==='terrain.soil'&&variant[0]==='D'||['v5.terrain.air','v5.terrain.platform','field.updraft'].includes(id)&&variant[0]==='F'))throw Error('Unsupported experiment for material');
  const lab=new LabPlayback(createLab(variant));return{id,d:lab.document.d,lab,playable:true,witness:null,source:variant+' 独立試作。正式能力ではありません。'};
 }
 const candidates=stages.filter(s=>materialIndex.get(s.id).has(id));
 const puzzle=puzzles.find(p=>p.id===preferred[id]&&describeTiles(createGameState(p.board)).some(t=>t.catalogId===id));
 const sample=puzzle||candidates.find(s=>s.mainGimmick===id)||candidates[0];
 const world=['terrain.water','field.current','field.wave','field.bubble'].includes(id)?'sea':id==='terrain.ice'?'snow':['field.wind','field.updraft'].includes(id)?'sky':['terrain.tunnel','fixture.burrow'].includes(id)?'earth':'forest';
 const d=sample?changeWorld(createDraft(structuredClone(sample.board)),world):sampleDraft(id);
 return{id,d,lab:null,playable:e.playable,witness:sample?.solution?structuredClone(sample.solution):null,source:sample?(puzzle?'V4比較面':'V3保存面')+' '+sample.number+'「'+sample.title+'」のコピー':e.playable?'既存素材の8×8配置展示（専用パズルではありません）':'PR532の過去図・未実装展示。動作や能力は追加しません。'};
}
export function targets(id,scene,state){
 if(id==='sign.gravity'&&state.gravity)return[{x:0,y:7,catalogId:id,params:{}}];
 if(scene.lab&&['terrain.soil','v5.terrain.air','v5.terrain.platform'].includes(id)){
  const kind=id==='terrain.soil'?'soil':id==='v5.terrain.air'?'air':'floor';return scene.lab.session.state.cells.flatMap((v,i)=>v===kind?[{x:i%8,y:Math.floor(i/8),catalogId:id,params:{}}]:[]);
 }
 if(id.startsWith('v5.'))return[{x:1,y:1,catalogId:id,params:{}}];
 const t=describeTiles(state).filter(t=>t.catalogId===id);
 return t.length?t:[{x:1,y:1,catalogId:id,params:{}}];
}
export function inspectCell(scene,state,x,y){
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=8||y>=8)return[];
 const d=scene.lab?scene.lab.document.d:scene.d,material=effectiveMaterial(d,x,y);
 const lines=[`マス（${x+1}, ${y+1}）`, '世界：'+worldNames[d.appearance.world], '見た目の地形：'+byId.get(material).name+' ['+material+']'];
 for(const deco of d.appearance.decorations.filter(v=>v.x===x&&v.y===y))lines.push('装飾（物理効果なし）：'+byId.get(deco.id).name+' ['+deco.id+']');
 if(state.gravity&&x===0&&y===7)lines.push('重力の看板 [sign.gravity]：部屋全体に重力が働く目印。看板自体を操作して重力を切り替えません。');
 for(const a of state.actors.filter(a=>a.x===x&&a.y===y))lines.push(`${speciesLabel(a.species)}：現在${a.level}段階`);
 if(scene.lab){const kind=scene.lab.session.state.cells[y*8+x];lines.push('独立試作の地形：'+({soil:'実験役が掘れる土',rock:'通れない岩',air:'飛行空間',floor:'足場／開いた通路'}[kind]||kind));}
 for(const t of describeTiles(state).filter(t=>t.x===x&&t.y===y&&t.catalogId!=='sign.gravity')){
  const p=t.params;lines.push((byId.get(t.catalogId)?.name||t.catalogId)+' ['+t.catalogId+']');
  if(t.catalogId==='object.crate')lines.push('箱の重さ：'+(p.weight??2)+' ／ 押す段階：'+conditionLabel(p));
  else if(['exact','min','max'].some(k=>p[k]!==undefined))lines.push((t.catalogId==='fixture.plate.weight'?'載る重さ（仲間は段階・箱は重量）':'対象の段階')+'：'+conditionLabel(p));
  if(t.catalogId==='fixture.exit'&&!['exact','min','max'].some(k=>p[k]!==undefined))lines.push('ALL：全段階を受け入れます。全員救出がクリア。');
  if(p.species)lines.push('対象種族：'+speciesLabel(p.species));
  if(p.partner)lines.push('隣接する相棒：'+speciesLabel(p.partner));
  if(p.pairId)lines.push('対応する対：'+p.pairId+' ／ '+describeTiles(state).filter(v=>v.params.pairId===p.pairId&&v.catalogId===t.catalogId&&(v.x!==x||v.y!==y)).map(v=>`（${v.x+1}, ${v.y+1}）`).join('・'));
  if(p.role)lines.push('役割：'+(p.role==='entrance'?'入口':'出口'));
  if(p.orientation||p.direction)lines.push('向き：'+({N:'上',E:'右',S:'下',W:'左'}[p.orientation||p.direction]||p.orientation||p.direction));
  if(p.step!==undefined)lines.push('踏む順番：'+p.step+'（段階条件とは別）');
  if(p.period!==undefined)lines.push('周期：'+p.period+'手 ／ 作動相：'+p.phase+' ／ 現在相：'+(state.moves%p.period));
  if(p.needs?.length&&p.any?.length)lines.push('次の2条件のどちらかを満たすと開きます');
  if(p.needs?.length)lines.push('すべて必要：'+p.needs.join('・'));
  if(p.any?.length)lines.push('いずれか必要：'+p.any.join('・'));
  if(p.groupId||p.id)lines.push('装置の対応名：'+(p.groupId||p.id));
  if(p.active!==undefined)lines.push('現在の表示状態：'+(p.active?'作動中':'未作動'));
  if(t.catalogId==='fixture.spike')lines.push('針の強さ：'+(p.power??1));
 }
 return lines;
}
