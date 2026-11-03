// Rebuild the human audit from the reviewed, immutable-before machine snapshot.
// Usage: node tools/event-audit.mjs [--write]
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {EVENTS} from '../prototypes/life-sugoroku/events.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const audit=JSON.parse(fs.readFileSync(path.join(root,'docs/life-sugoroku/V3-EVENT-AUDIT.json'),'utf8'));
assert.deepEqual(audit.events.map(e=>e.after),EVENTS,'Audit snapshot must match authored events. Review changes before refreshing it.');
const signature=e=>({id:e.id,category:e.category,stages:e.stages,regions:e.regions,npc:e.npc,once:e.once,choices:e.choices.map(({sodachi,money,evolve,time,redo})=>({sodachi,money,evolve,time,redo}))});
assert.deepEqual(audit.events.map(e=>signature(e.before)),EVENTS.map(signature),'An original event mechanic changed.');
const changed=audit.events.filter(e=>e.status==='revised').length;
const cash=audit.events.flatMap(e=>e.choices).filter(c=>c.baseDelta.money!==0).length;
const signed=n=>n>0?`+${n}`:String(n);
const out=[
'# V3 全46イベント監査',
'',
`基準コミット: \`${audit.baselineCommit}\`。対象は V2 から引き継ぐ46件・92選択。${changed}件の文面を修正し、${46-changed}件は元の物語を保持した。お金が動く${cash}選択すべてについて、出し手・費用・仕事などの理由を確認した。`,
'',
'## 監査範囲と守ったもの',
'',
'- `character-world-master.v1.js` の正式ID・名称・behavior/hook と `profiles.mjs` の性別・指向を照合した。NPCは15種類、恋愛対象として明記された原イベントの相手は4種類。',
'- 元のID・順序・カテゴリ・段階範囲・地域・NPC・once・選択数・そだち・お金・進化・時間・redoを変更していない。V3新規対戦はステージ定義で実地形から地域プールを選ぶ。旧セーブはV2抽選を維持する。',
'- それぞれの小話、穏やかな結末、失敗や遠回りを残した。友好の成立や長年の付き合いを前提にする文だけを、その場で起こる出会いへ置き換えた。',
'- お金の理由は結果文に置いた。選択肢で金額を予告せず、失敗で高いお金を得る場合は成功報酬ではなく作業時間・距離などへの手当として説明した。',
'- 人生の長さ・場所はすごろくの寓話表現。膝・髪など特定の身体だけに依存する箇所は背の高さ・葉っぱへ調整した。発声や手紙は各種族を擬人化する既存の表現として扱う。',
'',
'## 条件・関係・報酬の読み方',
'',
'各イベントの段階は両端を含む。原イベントはプレイヤーごとに1回、共通の直近3件はほかの候補があれば避ける。カテゴリ枠が空なら別カテゴリへフォールバックする既存の処理は、この文面監査では変えていない。表の数値は基準値で、20ラウンドのそだち補正、若返りボーナス、おまもり、所持金下限・そだち上限、やりなおし上限によって実際の差分は変わる。結果文はお金が動く原因を述べ、実際の金額は結果欄で確認する。',
'',
'進化・時間は第1〜8段階の範囲内。第1段階で戻る、第8段階で進む場合も、起こっていない変身を文面で断定しない。やりなおしは元のイベントの再抽選ではなく別処理で、1つの思い出につき1回・一人生2回まで。進化は再実行せず、報酬にも既存の上限がある。',
'',
'原イベントのNPCは「この場面で会う相手」であって、加入・交際成立を示さない。継続的な関係、再会、加入や交際への明示的な誘いはV3の別イベントで扱う。関係状態はrelationships.mjsで処理する。fate-04後には追加報酬のない「なおと」との特別な立ち話を行う。',
'',
'恋愛文は相互の指向が合う場合のみ。非適合、指向不明、自分自身は同じ基準報酬の友情文へ置換する。`romance-05` / `romance-06` は元から `npc` がないため、現在の判定では常に友情文となる。架空の既存恋人を足さず、匿名の旅人と宛先未定の手紙の話に整えた。',
'',
'## 世界設定との対応・残る設計上の制約',
'',
'- `cat_ceo` は仕事人で交流のため会議を後回しにする、`robot_neighbor` は感情を学ぶ、`forest_bear` は大きく優しい、`sea_mermaid` は陸の景色を知りたい、`anglerfish` は暗所で積極的・明所で照れる、という正式な個性を残した。',
'- 普通の仲間の地域制限は本編の必須ロックではなく、この小話が起こる場所。原イベントの地域制約を狭めたり拡げたりしていない。',
'- 本編の恋人初遭遇地域と四地域版の盤面は同一ではない。ねこ社長・ロボットは city に加えて square、クマは forest に加えて square で登場する。チョウチンアンコウの本編初遭遇は deepsea だが、原イベントは sea の暗い観察路にまとめている。この抽象化を維持し、本編の地域設定は変更しない。',
'- 多い収入と低いそだちの組合せは既存バランスの制約。失敗自体に賞金を払うのではなく、仕事や時間の対価として説明する。新しい請求処理・支払い条件・購入必須条件は追加していない。',
'- 従来と同じく、おまもりが費用を防いだ場合や所持金が不足する場合にも基本の結末文が出る。実際の差分が正。こうした文の条件別差し替えはエンジン側の別課題で、本監査で数値や分岐を変えない。',
'',
'## 再現と検証',
'',
'`node tools/event-audit.mjs` は文面・数値と監査JSONの一致、およびMarkdownの再現性を検査する。`node tools/event-audit.mjs --write` は承認済みJSONからこのMarkdownだけを再生成する。JSONには46件の完全なbefore/afterを保存している。',
'',
'`node --test tests/life-sugoroku/event-audit.test.mjs` は固定した基準メカニクスのハッシュ、92選択の実際の金銭・そだち差分とRNG、正式NPC・プロファイル、恋愛／友情の両表示を検査する。',
'',
'## 46件の個別監査',
''];
for(const e of audit.events){
 const b=e.before,a=e.after;
 out.push(`### ${e.id} — ${a.title}`,'',`判定: ${e.status==='retained'?'原文保持':'文面修正'}。${e.findings}`,'',`条件: ${a.category} / 第${a.stages[0]}〜${a.stages[1]}段階 / ${a.regions.join(', ')} / 一人生1回。過去のNPC関係は必要なし。`,'');
 if(e.npc){out.push(`相手: \`${e.npc.id}\` ${e.npc.label}。個性: ${e.npc.personality}。本編初遭遇: ${e.npc.canonicalFirstRegion||'通常地域で出会える仲間'}。`,'');if(e.npc.profile)out.push(`プロファイル: gender=${e.npc.profile.gender}, orientation=${e.npc.profile.orientationId}, affinityHeart=${e.npc.profile.affinityHeart}。`,'');}
 else out.push('相手: 固定NPCなし。匿名の登場人物に関係IDを割り当てない。','');
 out.push(`**導入・改訂前**「${b.title}」 ${b.text}`,'',`**導入・改訂後**「${a.title}」 ${a.text}`,'');
 if(a.friendshipText)out.push(`**友情導入・改訂前**「${b.friendshipTitle}」 ${b.friendshipText}`,'',`**友情導入・改訂後**「${a.friendshipTitle}」 ${a.friendshipText}`,'');
 for(const c of e.choices){const old=b.choices[c.index];out.push(`**選択${c.index+1}** ${old.label===c.meaning?c.meaning:`${old.label} → ${c.meaning}`}`,'',`- 前: ${old.text}`,`- 後: ${c.result}`,`- 基準差分: そだち ${signed(c.baseDelta.sodachi)} / お金 ${signed(c.baseDelta.money)}。理由: ${c.moneyCause}`,`- 進化 ${signed(c.evolution)} / 時間 ${signed(c.time)} / やりなおし ${c.redo?'あり':'なし'}。`,'');if(c.friendshipResult)out.push(`友情結果・前: ${old.friendshipText}`,'',`友情結果・後: ${c.friendshipResult}`,'');}
 out.push(`アルバム: ${a.album}`,'',`関係設計: ${e.relationshipRecommendation.mode}。${e.relationshipRecommendation.next}${e.relationshipRecommendation.romance||''}`,'');
}
const output=out.join('\n').trimEnd()+'\n',target=path.join(root,'docs/life-sugoroku/V3-EVENT-AUDIT.md');
if(process.argv.includes('--write'))fs.writeFileSync(target,output);else assert.equal(fs.readFileSync(target,'utf8'),output,'Run --write after reviewing snapshot changes.');
console.log(`event audit OK: ${EVENTS.length} events, ${EVENTS.reduce((n,e)=>n+e.choices.length,0)} choices, ${cash} money causes, mechanics preserved`);
