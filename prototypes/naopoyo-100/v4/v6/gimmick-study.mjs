// Unadopted, display-only annotations. Never imported by the editor or rules.
import {renderDraft} from './render.mjs';
import {drawCharacterActors} from './character-art.mjs';
import {formalSpecies, speciesLabel} from './characters.mjs';
import {drawActors} from '../../../naopoyo-chapter1/render.mjs';
import {describeTiles} from '../../engine.mjs';
import {byId} from '../v5/catalog.mjs';
export const studyCases = [
  {id:'crates',label:'箱の重さ・押す条件・重さの床'},
  {id:'air',label:'上昇気流・数値条件'},
  {id:'earth',label:'地下通路・正式アーチ'},
  {id:'warp',label:'スイッチと扉・保護するワープ'},
  ...['F1','F2','D1','D2'].map(id=>({id,label:id+' 独立試作の地形'}))
];
export function conditionLabel(p) {
  return ['exact','min','max'].filter(k=>p[k]!==undefined).map(k=>({exact:'=',min:'≥',max:'≤'}[k])+p[k]).join('・') || '自由';
}
export function connectionLabels(d) {
  const keys = new Set();
  for (const t of d.board.tiles) {
    const p=t.params;
    if (['fixture.plate.hold','fixture.plate.weight','fixture.latch','fixture.toggle','fixture.sequence','npc.owl'].includes(t.catalogId)) keys.add(p.groupId||p.id);
    for (const k of [...(p.needs||[]),...(p.any||[])]) keys.add(k);
    if (t.catalogId==='fixture.burrow') keys.add('burrow:'+p.pairId);
  }
  return new Map([...keys].filter(Boolean).sort().map((id,i)=>[id,String.fromCharCode(65+i%26)+(i>=26?Math.floor(i/26):'')]));
}
export function studyNotes(d, lab=null) {
  const links=connectionLabels(d), notes=[];
  for(const t of d.board.tiles) {
    const p=t.params, condition=conditionLabel(p)+(p.species?'・'+speciesLabel(p.species):'');let text='';
    if(t.catalogId==='object.crate') text=`箱の重さ${p.weight??2}。押す段階${condition}。重さと押す条件は別です。`;
    if(t.catalogId==='fixture.plate.weight') text=`床に載る重さ${condition}。箱は箱の重さ、仲間は現在の段階で判定。対応 ${links.get(p.id)}。`;
    if(t.catalogId==='field.updraft') text=lab?'この試作では現在の飛行候補の仲間だけを上へ1マス運びます。飛行能力を付与する印ではありません。':`上へ運ぶ気流。対象の段階${condition}。飛行能力を付与する印ではありません。`;
    if(t.catalogId==='fixture.burrow') text=`地下通路 ${links.get('burrow:'+p.pairId)} の${p.role==='entrance'?'入口（矢印と進行方向を合わせる）':'出口'}。入口側の条件と出口の空きを検査。`;
    if(['fixture.latch','fixture.plate.hold','fixture.toggle','fixture.sequence'].includes(t.catalogId)) text=`対応 ${links.get(p.groupId||p.id)}。対象の段階${condition}。${byId.get(t.catalogId).rule}`;
    if(t.catalogId==='fixture.door') text=[p.needs?.length?`${p.needs.map(k=>links.get(k)).join('・')} がすべて作動`:'',p.any?.length?`${p.any.map(k=>links.get(k)).join('・')} のいずれかが作動`:''].filter(Boolean).join('、かつ')+'すると開きます。';
    if(text) notes.push({id:t.catalogId,x:t.x,y:t.y,name:byId.get(t.catalogId).name,text});
  }
  if(d.board.gates.length)notes.push({id:'fixture.gate',name:'採用済みの数値条件アーチ',text:'= はちょうど、≥ は以上、≤ は以下。現在の段階を判定。A案の形・数値表示・開閉は変更しません。'});
  if(lab)notes.push({id:'trial-terrain',name:'この実験だけの地形',text:lab.kind==='flight'?'fは上の出口、gは下の出口へ。点線の縁は空間、短い実線の縁は着地できる足場。F1は空中停止、F2は次の足場まで着地必須。岩・閉じた扉・仲間は通過不可。':'dは右下、gは左上の出口へ。D1は掘って進む1手、D2は土を掘る1手と開いたマスへ進む1手。切れ目と土粒を付けた茶色の土は実験役だけが掘れます。灰色の岩は掘れません。正式エディターの土壁に掘削能力は追加しません。'});
  return notes;
}
function badge(c,text,x,y,w=.88,h=.24) {
  c.fillStyle='#fff6df';c.strokeStyle='#6b624d';c.lineWidth=.018;
  c.beginPath();c.roundRect(x-w/2,y-h/2,w,h,.045);c.fill();c.stroke();
  c.fillStyle='#253e42';c.font='700 .22px "Hiragino Sans", "Noto Sans CJK JP", sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,x,y,w-.04);
}
function annotate(c,t,links) {
  const p=t.params,id=t.catalogId;
  if(id==='object.crate') {badge(c,'押'+conditionLabel(p),.5,.15);badge(c,'重さ'+(p.weight??2),.5,.82,.76,.25);}
  if(id==='field.updraft')for(const [x,y]of [[.28,.48],[.5,.4]]) {
    c.beginPath();c.moveTo(x-.075,y+.08);c.lineTo(x,y);c.lineTo(x+.075,y+.08);
    c.lineWidth=.065;c.strokeStyle='#3c6c75';c.stroke();c.lineWidth=.028;c.strokeStyle='#e7fff0';c.stroke();
  }
  if(id==='fixture.burrow'){badge(c,p.role==='entrance'?'入':'出',.18,.48,.25,.26);badge(c,links.get('burrow:'+p.pairId),.84,.2,.23,.24);}
  const linked=['fixture.door','fixture.latch','fixture.plate.hold','fixture.plate.weight','fixture.toggle','fixture.sequence','npc.owl'];
  if(linked.includes(id)) {
    const ids=p.needs?.length||p.any?.length?[...(p.needs||[]),...(p.any||[])]:[p.groupId||p.id];
    ids.forEach((key,i)=>badge(c,links.get(key)||'?',.84-i*.24,.2,.22,.24));
  }
}
export function renderStudy(canvas,d,state,options={},style='old',lab=null) {
  if(style!=='candidate'){renderDraft(canvas,d,state,options);return;}
  // Preserve the shared terrain/gimmicks; labels remain below the actor layer.
  renderDraft(canvas,d,state,options,{actors:false});
  const width=canvas.getBoundingClientRect().width||384,dpr=Math.min(globalThis.devicePixelRatio||1,2),unit=width/8,c=canvas.getContext('2d'),tiles=describeTiles(state),links=connectionLabels(d);
  c.save();c.setTransform(dpr*unit,0,0,dpr*unit,0,0);
  if(lab)for(let i=0;i<64;i++) {
    const x=i%8,y=Math.floor(i/8),kind=lab.cells[i];
    if(tiles.some(t=>t.x===x&&t.y===y&&['fixture.exit','fixture.gate','fixture.warp','sign.gravity'].includes(t.catalogId)))continue;
    c.save();c.translate(x,y);c.strokeStyle='#31596b';c.lineWidth=.025;
    if(lab.kind==='flight'&&kind==='air'){c.setLineDash([.055,.055]);c.beginPath();c.moveTo(.12,.89);c.lineTo(.88,.89);c.stroke();}
    if(lab.kind==='flight'&&kind==='floor'){c.beginPath();c.moveTo(.12,.84);c.lineTo(.12,.91);c.lineTo(.35,.91);c.moveTo(.65,.91);c.lineTo(.88,.91);c.lineTo(.88,.84);c.stroke();}
    if(lab.kind==='dig'&&kind==='soil'){c.strokeStyle='#ead1a1';c.setLineDash([.09,.06]);c.beginPath();c.moveTo(.2,.22);c.lineTo(.8,.22);c.stroke();c.fillStyle='#ead1a1';for(const [a,b]of [[.3,.38],[.66,.59],[.43,.76]]){c.beginPath();c.arc(a,b,.035,0,7);c.fill();}}
    c.restore();
  }
  for(const t of tiles) {c.save();c.beginPath();c.rect(t.x,t.y,1,1);c.clip();c.translate(t.x,t.y);annotate(c,t,links);c.restore();}
  c.restore();
  const active=options.selected?{id:state.actors.find(a=>a.x===options.selected[0]&&a.y===options.selected[1])?.id}:null;
  c.save();c.setTransform(dpr,0,0,dpr,0,0);
  if(state.actors.every(a=>formalSpecies.includes(a.species)))drawActors(c,state,active,unit,width,options.stateEffects||[],options.now||performance.now(),options.reduced||false,false,true);
  else drawCharacterActors(c,state,active,unit,width,options);
  c.restore();
}
