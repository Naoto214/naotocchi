import {catalog} from '../v5/catalog.mjs';
import {atlasHistory,history,auditRows} from './source.mjs';
import {topics,priorityIds,inkCandidates} from './topics.mjs';
export {history};
export function summarizeEvidence(rows){const r={tested:0,necessary:0,bypass:0,unknown:0,notApplicable:0};for(const row of rows){const status=row.necessity?.status;if(!status){r.notApplicable++;continue;}r.tested++;if(status==='exhausted')r.necessary++;else if(status==='shortest')r.bypass++;else r.unknown++;}return r;}
const src=new Map(atlasHistory.map(e=>[e.id,e]));
export const reviewEntries=catalog.map(e=>{
 const past=src.get(e.id),proposals=history.filter(h=>past?.candidates.includes(h.id)),t=topics[e.id];
 const visual=['terrain.floor','terrain.wall'].includes(e.id)||e.id.startsWith('v5.')||e.category==='decoration'||e.category==='world';
 const decision=e.status==='採用済み'||e.id.startsWith('v5.')?'正式採用':!e.placeable?(proposals.length&&proposals.every(p=>p.decision==='不採用')?'不採用':'保留'):'改善候補';
 const rows=auditRows.filter(r=>r.mainGimmick===e.id);
 return {...e,decision,approvalNote:e.id.startsWith('v5.')?'採用済みの表示・共通素材基盤。新しい能力の承認ではありません。':e.id==='fixture.warp'?'消失・出現演出は採用済み。対の転送ルールと表示候補の履歴は分けて扱います。':'採用状態は明示履歴を優先。「既存あり」「推奨」は正式採用と同義ではありません。',
 runtime:!e.placeable?'正式物理では未実装':visual?'既存IDの表示／地形として使用':'既存の正式物理で実行可能（採用判断とは別）',playable:e.placeable,
 meaning:e.placeable?e.rule:'未実装候補。'+(proposals[0]?.rule||past?.description||e.rule),
 eligibility:!e.placeable?'正式種族の能力としては使用不可。専用試作がある場合だけ別枠で確認。':visual?'表示だけで種族・段階の能力を変更しません。通行は対応する物理IDで決まります。':['terrain.water','field.current','field.wave','field.bubble'].includes(e.id)?'正式4種ではさかな・ペンギン。設定された段階／種族条件も検査。':'正式4種（いぬ・かえる・さかな・ペンギン）の現在の段階1〜8と、そのマスの条件で判定。NPCは直接操作しません。',
 always:t?.[0]||(visual?'通れる床／通れない壁の輪郭と必要なマス境界':'候補の形と「未実装」の区別'),
 details:t?.[1]||(visual?'素材ID、世界、物理ID、装飾かどうか。新しい能力は付かない。':'未承認のルール・実装範囲・類似案との関係。'),
 purpose:t?.[2]||(visual?'地形と仕掛けを読み取りやすくする。装飾自体で解法を増やすとは主張しない。':proposals[0]?.relations||'独自の選択や順序を生むか、実装前に検討する。'),
 difference:t?.[3]||(visual?'同じ物理IDの見た目の違い。別の仕掛けとして重複登録しない。':proposals[0]?.evaluation?.originality||'既存仕掛けの組み合わせで代替できるか検討する。'),
 candidate:t?.[4]||(visual?'採用済みの自然環境・形状を維持。説明だけ整理。':'未実装のため新しい動作・デザインは増やさず保留。過去図を展示。'),
 priority:priorityIds.has(e.id)?'高':!e.placeable?'保留':t&&!['terrain.floor','terrain.wall','fixture.spike','fixture.gate','fixture.exit','sign.gravity'].includes(e.id)?'中':'維持',
 inkCandidate:inkCandidates.has(e.id),history:proposals,oldDesign:proposals.map(p=>({proposal:p.id,text:p.currentDesign,decision:p.decision})),
 evidence:{...summarizeEvidence(rows),rows,scope:'V4時点のV3主効果禁止探索。全補助効果の証明・新規探索・面白さの実測ではありません。'},
 risk:!e.placeable?'未実装。動かない展示を遊べる仕掛けとして扱わない。':visual?'装飾が通路・キャラクター・条件を隠さないか。':'通過するだけで解ける配置や、別経路で省略できる配置では役割が弱くなる。',
 question:'初見で動きを予想できるか。順番を変えると結果が変わるか。理解後に別の組み合わせを考えられるか。'
 };
});
export const symbolGuide=[
 ['stage','仲間の数字','現在の進化段階。箱の重量ではない。','常時','種族と現在段階・変身後の能力'],
 ['weight','箱の重さ','箱自身の重量。押す仲間の段階と別。','常時','板に載った時の判定'],
 ['push','押す条件','押す仲間の現在段階・種族の条件。','常時','押す方向と空き・引けない規則'],
 ['condition','=／≥／≤','ちょうど／以上／以下。対象が段階か重量か明記。','常時','具体的な対象と条件の組み合わせ'],
 ['links','色・対応文字','装置を結ぶ対応名。数値条件ではない。','対応印を常時','接続名・座標・全条件かいずれか'],
 ['sequence','順番','踏む順序の番号。段階とは別。','常時','間違えた時のリセットと完成後の保持'],
 ['phase','周期と相','成功した操作の手番。実時間ではない。','現在の開閉・相','周期と作動相の内訳'],
 ['warp','対のワープ','同じ対への転送。塞がれば不発。','対の印','接続先座標と一手一回の規則'],
 ['updraft','上向きの流れ','正式版は段階条件。飛行能力の付与ではない。','向きと条件','F1/F2とは異なる対象判定'],
 ['flight','空間と足場','F1/F2の独立飛行試作だけの移動領域。','足場と空間の区別','距離・着地・滞空・候補種族段階'],
 ['dig','土と岩','D1/D2は実験役限定。正式な掘削能力ではない。','掘れる土と掘れない岩','掘って進む1手／掘ると進むを分ける2手'],
 ['exit','星・ALL','星は救出先。ALLは全段階を受け入れる表示。','出口条件','全員救出がクリア。種族条件は別途検査']
].map(([key,name,meaning,always,details])=>({key,name,meaning,always,details}));
