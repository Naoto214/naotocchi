// Read-only presentation adapter. Never generates eligibility, changes state or advances work.
import {CATALOG} from './full-catalog.mjs';
export function visibleCards(v){
 const peek=v.choice?.peek;return [...Object.values(v.players).flatMap(p=>[...(p.hand??[]),...p.discard,p.board.main,p.board.partner,p.board.world,...p.board.companions,...p.board.prepared]),...(Array.isArray(peek)?peek:peek?[peek]:[]),v.effect?.card,...(v.effectQueue??[]).map(x=>x.card)].filter(Boolean);
}
const moves={bottom:'山札の下へ戻す',top:'山札の上へ戻す',discard:'捨て札へ送る',hand:'手札に戻す',reveal:'公開する'};
const bottomKinds=new Set(['egg_bottom','birth_bottom','sleep_bottom','program_handBottom']);
export function projectOperation(s,v,viewer){
 v.effect=null;v.effectQueue=[];
 if(!viewer||viewer!==v.actor||v.result)return;
 const safe=new Map(visibleCards(v).filter(c=>!c.hidden).map(c=>[c.id,c]));
 // A chain source is already public in engine.view; only those exact sources may be
 // described from the catalog when a played card has left both hand and field.
 for(let i=0;i<(s.chain??[]).length;i++){const l=s.chain[i],publicLink=v.chain[i],definition=CATALOG[s.cards[l.source]?.cardId];if(publicLink&&definition&&!safe.has(l.source))safe.set(l.source,{...definition,cardId:definition.id,id:l.source,name:publicLink.name});}
 const q=s.choice,d=s.activationDraft,spec=d?.rule?.select?.[d.index]??q?.spec;
 const destination=spec?.cost??(d?.rule?.steps??spec?.steps??[]).find(x=>x.op==='selectedMove'&&x.key===spec.key)?.destination;
 const move=bottomKinds.has(q?.kind)?moves.bottom:q?.kind==='program_handTop'?moves.top:moves[destination];
 v.actions=v.actions.map(a=>({...a,displayLabel:a.kind==='pass'?'応答せず進む（パス）':a.kind==='choose'&&move&&a.choiceCard?spec?.cost?`${safe.get(a.choiceCard)?.name??a.label}を支払いに選ぶ（${move}）`:`${safe.get(a.choiceCard)?.name??a.label}を${move}${spec?'対象に選ぶ':''}`:a.label}));
 const describe=(link,status)=>{if(!link)return null;const c=safe.get(link.source);return {kind:'card',card:c??null,name:c?.name??'カードの効果',ability:link.kind==='birth'?'たんじょう時の効果':c?.source?.match(/「([^」]+)」/)?.[1]??'カード効果',actor:link.actor??v.actor,status,instruction:''};};
 const chain=(s.chain??[]).map(l=>describe(l,'応答を待っています')).reverse();v.effectQueue=chain;
 let current;
 if(q){
  const legacySource=['birth_bottom','sleep_bottom','look'].includes(q.kind)?[...(s.history??[])].reverse().find(e=>e.kind==='effectApplied')?.source:null;
  current=describe(d?{source:d.action.source,actor:d.actor}:q.link??(legacySource?{source:legacySource,actor:q.actor,kind:q.kind==='birth_bottom'?'birth':null}:null),'選択してください');
  if(q.kind==='egg_bottom')current={kind:'egg',card:null,name:'たまご',ability:'ターン開始時の効果',actor:q.actor,status:'手札を選んでください'};
  current??={kind:'choice',card:null,name:'効果の選択',ability:'',actor:q.actor,status:'選択してください'};
  current.instruction=move?`手札${spec?.zone&&!spec.zone.includes('Hand')?'以外の候補':''}から選び、${move}。`:q.kind==='activation_selection'?`${spec?.cost?'支払いに使うカード':'対象'}を選んでください。`:q.kind==='look'||q.kind==='program_look'?'確認したカードを置く位置を選んでください。':'下の候補から、行う処理を選んでください。';
  if(spec?.zone&&!spec.zone.includes('Hand')&&move)current.instruction=`${move}${spec.cost?'支払いカード':'対象'}を選んでください。`;
 }else if(v.phase==='trigger')current=describe(s.pending?.[0],'効果を使うか選んでください');
 else if(v.phase!=='normal')current=chain[0];
 if(!current&&v.phase==='response'&&s.window==='start'&&!s.players[s.turn].board.main)current={kind:'egg',card:null,name:'たまご',ability:'ターン開始時の効果',actor:s.turn,status:'応答を待っています',instruction:'手札を戻しました。応答するカードを選ぶか、パスしてください。'};
 if(current){if(!current.instruction)current.instruction=v.phase==='trigger'?'表示された行動を選んでください。':v.phase==='response'?'応答するカードを選ぶか、パスしてください。':'必要な選択を続けてください。';v.effect=current;}
}
