import fs from 'node:fs';
import {candidateDetails,compass,headingNames,directions} from './priorities.mjs';
import {fixture,simulate,cellName} from './model.mjs';
import {spriteData} from '../naopoyo-rescue/sprite-data.mjs';
const root=new URL('./',import.meta.url),docs=new URL('../../docs/naopoyo-split-priority-20261030/',root);
const read=n=>JSON.parse(fs.readFileSync(new URL(n,docs))),esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const compatibility=read('compatibility.json'),search=read('search-results.json'),exact=read('exact-search.json');
const circle=n=>String.fromCodePoint(n<=20?0x2460+n-1:0x3251+n-21);
fs.mkdirSync(new URL('diagrams/',docs),{recursive:true});
const spec=spriteData['dog/01'],pngBytes=fs.readFileSync(new URL('../../'+spec.path,root)),png=pngBytes.toString('base64');
for(const mode of ['A','B','C'])for(let h=0;h<8;h++){
 const r=simulate(fixture(),mode,h),cs=r.candidates;let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="560" height="620" viewBox="0 0 560 620"><rect width="560" height="620" fill="#f6f7ef"/><text x="24" y="28" font-family="sans-serif" font-size="19">${mode} / ${headingNames[h]}へ進入 / 実コード算出</text><g transform="translate(24 48)">`;
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){const p=cs.find(p=>p.x===x&&p.y===y),ox=x*64,oy=y*64;svg+=`<g><title>${p?`${p.order}番：${p.path.map(q=>cellName(...q)).join(' → ')}`:'本体または生成不可'}</title><rect x="${ox}" y="${oy}" width="64" height="64" fill="${p?(p.distance===1?'#d8edf4':'#fae7ce'):'#edf1e6'}" stroke="#a4b69d"/><text x="${ox+4}" y="${oy+59}" font-size="10" fill="#657961" font-family="sans-serif">${cellName(x,y)}</text>`;
 if(x===3&&y===3){svg+=`<svg x="${ox+7}" y="${oy+9}" width="50" height="43" viewBox="${spec.crop.join(' ')}"><image href="data:image/png;base64,${png}" width="${pngBytes.readUInt32BE(16)}" height="${pngBytes.readUInt32BE(20)}"/></svg><text x="${ox+32}" y="${oy+16}" text-anchor="middle" font-size="11">本体1</text>`;}else svg+=`<text x="${ox+32}" y="${oy+39}" text-anchor="middle" font-family="sans-serif" font-size="26" fill="${p?.distance===1?'#215f7c':'#8b581d'}">${p?circle(p.order):'×'}</text>`;svg+='</g>';}
 svg+='</g><text x="24" y="589" font-family="sans-serif" font-size="13">青：1歩の経路 / 橙：2歩の経路 / ×：生成不可</text></svg>';
 fs.writeFileSync(new URL(`diagrams/${mode}-${h}.svg`,docs),svg);
}
const order=[4,0,6,2,1,3,7,5];
const dirTable=order.map(h=>`|${headingNames[h]}|${directions(...compass[h]).map(d=>headingNames[compass.findIndex(c=>c[0]===d[0]&&c[1]===d[1])]).join(' → ')}|`).join('\n');
const rowStatus=(r,m)=>{const a=search.find(s=>s.stage===r.number&&s.mode===m);return r.modes[m].status==='solved'?`${r.savedMoves}手成立`:a?.status==='solved'?`旧解答${r.modes[m].failure.step}手目×／別解${a.moves}手`:`旧解答${r.modes[m].failure.step}手目×／別解未発見`;};
const table=compatibility.map(r=>`|${r.number}|${['A','B','C'].map(m=>rowStatus(r,m)).join('|')}|`).join('\n');
const metrics=compatibility.flatMap(r=>['A','B','C'].map(m=>{const v=r.modes[m],n=v.metrics;return `|${r.number}|${m}|${v.status==='solved'?'完走':'中断'}|${n.steps}|${n.splits}|${n.children}|${n.merges}|${n.familyMerges}|${n.overflow}|${n.secondStepSplits}|${n.candidateOrderChangesWithObstacles}|${n.directionChanges}|${n.actorSwitches}|`;})).join('\n');
const two=['A','B','C'].map(m=>{const a=simulate(fixture(),m,4),b=simulate(fixture('two'),m,4),cells=r=>r.spawns[0].children.map(p=>cellName(p.x,p.y)).join(' → ');return `|${m}|${cells(a)}|${cells(b)}|`;}).join('\n');
const text=`# なおぽよ。分裂生成順位 A/B/C 比較 — 2026-10-30

正式基準 main: 851cf09a80c7ed41ba7293888084272917e4582c。正式 engine blob: e3e35db190d5b8ba63fa2420dc90d5fa53157f45。
本番・正式物理・ステージ・保存解答・セーブ・Pages allowlistは変更していません。独立実験用エンジンはsync-engine.mjsで生成し、候補関数と観察フックだけを差し替えています。Aの候補自体は正式関数を直接呼びます。

## 1. 結論と判断の留保

Aは全10面・312手で正式エンジンと状態／イベントが完全一致。Bは旧解答5/10、Cは8/10成立。代替探索でBの16〜19面とCの18面の解答を確認。20面は両案とも今回の探索では未発見で、解答不能と証明していません。
理解しやすさを優先する次の候補はCです。ただし外周の固定順位を覚える負担は残り、20面の互換性もないため、正式採用を勧める段階ではありません。Aを維持し、順位・経路を可視化した同盤面の予測テストで比較するのが今回の到達点です。実プレイヤーによる比較評価は未実施です。

## 2. Aの正確な規則

compassは 上・右上・右・右下・下・左下・左・左上。進入方向のindex fに [4,-2,2,-3,3,-1,1,0] を加えて8で循環します。「後ろ→進行方向の左90°→右90°→左後方→右後方→左前方→右前方→前」です。

|進入|その地点から試す8方向（優先順）|
|---|---|
${dirTable}

本体位置を距離0としてFIFOキューへ置きます。各地点で上の8方向を調べ、合法なら候補に追加し、到達距離と共にキューへ追加。距離2の地点から先へは進みません。1歩で発見された全候補の後に、それらを同じ順序で起点にした2歩先を発見します。
同じ座標は最初の合法到達だけを採用します。seenへの登録は合法性確認の後です。ある経路で角が塞がっていても、その時点ではseenに入らず別経路から発見できます。候補経路は本体→中継→候補の最大2辺です。「距離」は探索辺数で、隣接セルでも回り道の2歩で初めて発見される場合があります。

- 盤面外・岩・仲間・トゲ・出口・ゲートを候補／中継に使いません。ゲートは条件一致でも候補外です。
- 仲間は中継を塞ぎますが、斜め角判定の地形障害には含みません。
- contact-v2＋magic-gate-v2の斜め角判定では、2通りの直交迂回路が両方塞がったときだけ不可。片側の岩だけでは斜め移動は禁止されません。ゲートの上面は条件一致でも通路を遮り得ます。段階1として地形／ゲート条件を確認します。
- optional policy.canEnterは元の親actorを渡す正式仕様です。本実験と第2章には追加policyがありません。
- 盤面端では範囲外だけを除外し、合法な残りの経路で探索。方向順位のルールは同じです。
- 候補リストを先に全計算し、min(親段階−1, トゲpower, 候補数)体だけ順に段階1で生成。余りは親に残ります。候補不足で段階合計が消えることはありません。
- 子を生成するごとに候補を再計算しません。従って先に生まれた子が中継地点を占めても、同じ分裂の後の子は計算済みの遠方へ生成されます。1体ずつ移動して通り抜ける物理ではありません。

## 3. B/Cの独立定義

B：Aと同じ8方向を使い、各方向の1歩先→同一直線上の2歩先。途中が不適格ならその方向の2歩先も除外。曲がる経路は使いません。最大16候補です。近傍と外周を交互に調べるので「近傍①〜⑧／外周⑨〜」の表示は不正確になります。図は実際の通算探索順を表示し、色で歩数を区別します。

C：まず近傍8マスをAと同じ方向順位、次にChebyshev距離2の外周16マスを後ろから時計回り。座標ごとの固定枠は障害物で変化しません。合法な2辺以内の経路がある候補だけ採用し、Aと同じ角判定を使います。Aの到達可能集合を経路付きで求めて固定枠で並べる実装です。経路が塞がれても別の合法経路があれば候補は残ります。固定枠と、除外後の実際の探索番号は区別します。

回転：近傍の方位indexを1ずつ、C外周の周上indexを2ずつ進めると進入45°の変更に対応。格子は45°のユークリッド回転で自己一致しないため、45°で全経路・距離が幾何学的に合同とは主張しません。90°の座標回転は地形を含めてテスト済み。重力とゲート上面は常に画面の上下を基準にするため、回転対称性の対象外です。

## 4. 実コードからの順位図

rank-atlas.jsonに24条件の全候補・実順位・固定枠・経路。diagrams/にA/B/C×8方向のSVGを保存。独立サイトのatlas.htmlでは実キャラ付き8×8盤面をタップして経路確認できます。障害物ありの変化は実験室で再計算されます。以前の模式図は流用していません。

## 5. 2マスを埋めた場合の実例

下へ進入、親D4・段階8・power7。D3（後ろ）とE4（進行方向の左）を異種の仲間8で埋めた同一盤面です。

|方式|障害物なし：子1〜7の生成順|2マス占有：子1〜7の生成順|
|---|---|---|
${two}

Aでは近傍の合法6マスを使い切り、最初の中継C4からB4を発見するので7体目がB4に生まれます。Cでは同じ6マスの後、固定外周の先頭D2へ。D3は通れなくてもD4→E3→D2が合法なので残ります。Bでは最初の2方向を丸ごと除外し、C4→B4から始まります。単に「近い場所へ順に」では3案の差を説明できません。

scenarios.jsonは10障害物条件×8方向×平面/重力×3方式=480条件。岩・角・ゲート・狭所・端・縦穴と、仲間1/2/3マスを含み、候補・生成直後・最終状態・イベントを保存しています。

## 6. 生成と重力を分けて読む

比較ページの生成前は本体がトゲへ到着した瞬間を準備した実験盤面です。8方向の接近経路や上昇支持条件を通ったと主張するものではありません。正式ステージの検証はmoveを通して全条件を適用しています。
分裂直後は最初のsplit終了時点、重力後は全連鎖終了時点。スライダーは同時生成を順に見せる説明であり、子を1体ずつ落下させる新ルールではありません。
落下は下にいるものから（y降順→x昇順→ID順）。岩・盤面底・通れない地形・ゲート上面等で支持され、同種に落ちると合体、8を超えると余剰を元の場所へ残します。下が段階8なら落下合体は停止。異種への落下は停止。同種の親子も通常通り再合体します。出口は条件を満たせば救出、条件不一致なら占有できても支持にはなりません。トゲは支持になりません。
recombine-once-v1では、1マス操作の解決中に各座標のトゲで成功分裂は1回だけ。生成できなかった試行は消費しません。別のトゲは発動可能。同じ盤面＋発動済みトゲ集合が再出現するとgravity-cycleで操作全体を巻き戻します。正式のこの処理は全案で同一です。
空盤面の落下では7体が最終的に再合体し、体数が減ることがあります。生成候補の番号を最終位置の順位と取り違えないよう、ページは両者を分離しています。

## 7. 第2章互換性と代替解答

|面|A|B|C|
|---|---|---|---|
${table}

既存解答の検証は各手の出発座標・段階・方向を照合。分岐後に別の駒を勝手に操作することはありません。compatibility.jsonとreplay-N-M.jsonに最初の状態差、最初の失敗、分裂経路を記録しています。第19面78手はA/Cで成立。第20面97手はAのみ成立し、Bは15手目、Cは36手目で旧操作列の条件と合わなくなります。

代替解答はalternative-N-M.jsonに独立保存、実エンジンで再生し全員救出・段階合計・状態合法性を確認。正式examplesは変更していません。別解の手数は探索器の発見結果であり最短ではありません。
最初の探索は座標・段階・種族・救出数で同値化したグラフ。B20は1696状態、C20は27677状態を展開して完走解なし。ただしIDやnextIdを除外した同値化の厳密性を証明していないため、exhaustedでも数学的解答不能と結論しません。
追加でactor配列・ID・gate状態・救出・nextIdを保持した厳密キーの探索を実施。B/Cとも60000状態の上限で打ち切り。こちらも未発見です。タイムアウト、状態上限、縮約グラフの探索終了を混同しません。元のsearch-results.jsonのnot-found-within-budgetは保守的総括で、個別attemptのexhaustedを必ず併読してください。

## 8. 操作と生成の計測

以下は旧保存解答の成立する接頭部のみ。不成立方式の短い接頭部を、完走方式より簡単だと評価しません。再合体は同じ1手中の同じ分裂family同士の合体。以後の手ではfamilyを追跡していません。予測しづらさそのものは測定できないため、2歩候補使用と障害物による相対順位の入れ替わりを代理指標として分けます。

|面|方式|状態|手数|分裂|子数|合体|親子等再合体|余剰|2歩使用分裂|障害物順位変化|方向変更|操作ID変更|
|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
${metrics}

「障害物順位変化」は、障害物を除いた候補列から不適格候補を除外しただけの場合と、実際の候補順が違う分裂回数です。B/Cは固定枠なので0が期待され、Aでは経路が変わることで相対順位が入れ替わります。理解の困難さを証明する数値ではありません。

## 9. 理解しやすさ（未実証の設計評価）

|観点|A|B|C|
|---|---|---|---|
|短い説明|近く全部→経路順。遠方の説明に補足が必要|方向ごとに1→2。最も短い|近く全部→外周を後ろから時計回り|
|位置予測|障害物で遠方の相対順位が変わる|直線中継だけで追えるが、遠方を近傍より先に使う|固定枠で追えるが、代替経路の可否確認が必要|
|最大7体|近傍が空なら同じ規則、混雑時はBFS説明が必要|4方向以内に7体を並べる一方、遠方使用が多い|近傍はAと同じ、外周の固定走査を追加|
|戦略性|経路の入口を塞ぐ制御が豊富|直線を開閉する制御。斜め中間座標8マスを失う|固定枠を残す／塞ぐ経路制御が残る|
|重力|3案とも生成後に別の理解が必要|同左|同左|
|チュートリアル|候補波と経路を見せる必要|直線2マスで説明可能|内周→外周の表示で説明しやすい可能性|

実験室に1体目予測（順位非表示、タップで正誤と経路）を用意しました。正式比較では同一の10盤面を方式順ランダムで提示し、1体目→3体目→7体全部の位置を予測、正答率・所要時間・自信度・説明可能性を測る設計を推奨します。UIは練習用で、試験順を統制したデータ収集やユーザー追跡は行いません。

## 10. 段階的チュートリアル案

1. 段階2＋トゲ：1体だけ生まれる。生成直後を止めて段階合計2を確認。
2. 後ろの1体：下／右／斜めで方向を回し、同じ相対法則を当てる。次に段階3へ。
3. 仲間1体で最初のマスを塞ぐ。消す→置く→予測→答えで因果を見せる。
4. 少数の出口だけが空いた狭所で2歩候補1つを見せる。中継マスを光らせ、岩で塞いだ場合と比べる。全24順位を並べて暗記させない。
5. 段階4程度で「生成直後→落下→合体→最終」を分離。親子再合体・下8支持・余剰・出口を一つずつ足す。
6. 仲間2体を置いて3体目の送り先を調整。最後に段階8の7体へ。予告を自由に切り替え、最後は予測してから確認する。

この設計はチュートリアル案と独立実験室だけです。新しい正式ステージは作成していません。別会話で出た「進入方向の後ろへ一列」案は今回のA/B/Cに混ぜていません。最大2歩のまま一直線なら最大2候補という制約があるため、別比較にする必要があります。

## 11. 再現と保護

- node prototypes/naopoyo-split-priority/sync-engine.mjs --check
- node --test prototypes/naopoyo-split-priority/tests/*.test.mjs
- node prototypes/naopoyo-split-priority/audit.mjs
- node prototypes/naopoyo-split-priority/search-alternatives.mjs
- node prototypes/naopoyo-split-priority/search-exact.mjs
- node prototypes/naopoyo-split-priority/write-report.mjs
- node prototypes/naopoyo-split-priority/build-preview.mjs /tmp/naopoyo-split-preview

追加範囲は独立prototypes/naopoyo-split-priority、対応docs、専用CIのみ。UIはlocalStorage/sessionStorage/IndexedDB/Service Workerを使用せず、試行はメモリー内だけです。正式素材は既存ファイルを読み取り利用。公開物は依存する32キャラ画像と必要モジュールだけを複製し、正式ステージ・セーブ・他ゲームを配信しません。

## 12. 検証と残る確認

evidence/にローカルテスト・ブラウザー・配布照合・CI結果を保存します。最終HEAD/tree/PR/公開URLはDELIVERY.mdを参照。
本人iPhone Safari実機、実際の指操作・OSバックグラウンド復帰、プレイヤーの理解度、B/C20面の解答有無、最短性、100ステージ全体の難度適合は未確認です。クラウドChromeの画面操作と実機Safariを混同しません。
`;
fs.writeFileSync(new URL('REPORT.md',docs),text);
// Render only our controlled Markdown subset; all text is escaped before markup.
const lines=text.split('\n');let html='',inList=false,inTable=false;
for(const line of lines){if(line.startsWith('|')){if(!inTable){html+='<div style="overflow-x:auto"><table>';inTable=true;}if(/^\|[-|: ]+\|$/.test(line))continue;html+='<tr>'+line.slice(1,-1).split('|').map(c=>`<td>${esc(c)}</td>`).join('')+'</tr>';continue;}if(inTable){html+='</table></div>';inTable=false;}if(!line.trim())continue;if(line.startsWith('# '))html+=`<h1>${esc(line.slice(2))}</h1>`;else if(line.startsWith('## '))html+=`<h2 style="margin-top:36px">${esc(line.slice(3))}</h2>`;else html+=`<p>${esc(line)}</p>`;}
fs.writeFileSync(new URL('report.html',root),`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>比較報告｜なおぽよ。</title><link rel="stylesheet" href="./style.css"><main><a href="./index.html">← 実験室</a> · <a href="./atlas.html">8方向の順位図</a>${html}</main></html>`);
fs.copyFileSync(new URL('compatibility.json',docs),new URL('compatibility.json',root));console.log('REPORT, report.html, 24 SVG diagrams generated');
