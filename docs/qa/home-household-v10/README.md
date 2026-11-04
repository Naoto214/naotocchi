# 28体の生きているホーム — Pilot V11

対象: [Draft PR #426](https://github.com/Naoto214/naotocchi/pull/426)。main マージ・本番 Pages 更新は行わない。本人の iPhone Safari 実機判定は未実施。

## 正本と原因

調査開始時の PR HEAD は `f7f192ea717a8945beb0839761f8c10a25f100c7`、remote main は `e7fef44b92233ebcbdcee5b7e9bebb97d3b790e7`。main はこの PR の祖先であり、会話全対象展開 #433 も含む。

大人数表示を失った直接原因は **PR #382 の実装 commit `6a56ce9ecba6b5c17ee898b2b98808d51b8ab8b9`**。merge は `faeee72c81957073502d9c37e2ca6bedb37c1a79`。`renderCompanionRow`、`renderPartnerCompanion`、`homeCastMotionRadius`、`renderHomeCast` が、所属データ全員から `homePresentCompanions/Partner` へ切り替わった。この関数は単一の `homeVisits.current` で絞るため、来訪中の一人だけが描画される。仲間データ自体の消失ではない。

PR #253 の head `271b2330b21e65bff25100a430f1d925b1cf407b`、merge `77b1ea5c6f08ce38a7afc8bea0199866d640d556` の二重半円・大人数検証を参照した。現在の `cast-layout.js` / `cast-bounds.js` は変更せず、正式画像の透明余白を除いた輪郭、装備・指輪・ハートの相対位置を再利用する。3D 地域では半円を固定せず、地形上の前・中・奥に配置する。他地域は既存配置へ戻る。

| 関連PR | 確認・保護した契約 |
|---|---|
| #105 / #165 | 当初の成功2回から、現行の通常50点以上・レア70点以上の1回加入へ。現行定数・結果処理は無変更 |
| #235 | 地域ごとの出会いやすさ・景観・遊び。完全地域限定には変更しない |
| #366 | 仲間26＋恋人18の normal / lonely / positive、positive優先、絆・親密度判定、非保存Reaction |
| #368 / #389 | Resident Expression、3D表情・交流、正式2D表示との接続を維持 |
| #382 | 自由生活と単一の特別来訪。所属表示からイベント参加資格を分離 |
| #414 / Conversation v2 / #433 | Director・専用台詞・抽選・質問・間隔・重複防止・postgameを無変更 |

## 統合構造

- 所属: 既存 `state.companions` と `state.partner` が唯一の正本。未加入の生成なし。仲間IDの重複・未知IDは描画時だけ除外し、セーブは書き換えない。
- ホーム: 新しい `homeResidentCompanions/Partner` を上記4描画箇所だけで利用。主役1＋仲間最大26＋現在の恋人/配偶者1。
- 生活: 非保存モデルの散歩・休憩・観察・向き変更・接近・一緒に過ごす行動。加入・離脱・結婚・別れの再描画で同期。選択対象の離脱は選択解除。
- 特別イベント: `homePresent*` と `homeVisits` は従来どおり。既にいる相手への来訪は同じDOMを参照し、二重生成しない。来訪終了は発話資格・会話を終了し、所属キャラクターは残る。

会話エンジンの複製や人数別の発話頻度制御は追加していない。視覚モデルのイベントは会話候補を増やさない。保護ソースの実バイト一致は [protected-sources.json](protected-sources.json) に記録した。

## 配置・操作・負荷

| 合計人数 | 配置と縮尺 | 同時に自律散歩する上限 |
|---|---|---|
| 1〜5 | 既存の大きさを維持。390pxで主役フレーム176px。地形の安全位置へ | 5 |
| 6〜15 | 奥行きの列をずらし、描画輪郭に基づく可変サイズ。小集団の接近・観察 | 3 |
| 16〜28 | 輪郭と地形・遮蔽を確認して分散。待機時間9〜21秒程度＋個体差 | 2 |

「みんなを見る」は全員を維持して84%に縮小する。通常表示も全員が存在する。短い画面では密集表示領域を最低300px確保し、極端に小さく潰す代わりに既存文書のスクロールを利用する。周囲の建物・木・水面は残る。移動先は既存の地形投影・衝突・経路探索を使い、顔・体が背景に隠れすぎる座席を避ける。

透明画像枠より実際の体のヒットを優先し、周辺44pxの候補は中心に最も近い相手を選ぶ。選択相手は輪郭と名前で明示。画像自体・表情・装備は変更しない。指輪・ハートは既存配置から追従する。静止中のDOM更新と遮蔽計算をキャッシュし、移動人数を制限する。非表示時停止・reduced-motionは既存の停止経路を維持。

独立レビューで、短い画面の縮小しすぎ、静止話者の吹き出し追従、縮尺変更後の遮蔽マスク座標の3件を修正し、再現テストを追加した。その後、300pxちょうどで最小高さが解除されるResizeObserver再計算ループを再現・修正。短画面ではサイズ包含を解除してスクロールを許可した。大人数専用CSSを `data-home-fixed=true` に限定し、メニュー・ミニゲームへの影響も修正。最終独立レビューは追加阻害事項なし。

## 自動検証

| 検証 | 結果・証拠 |
|---|---|
| 新規人数・配置・モデル・実来訪44人・操作・World | **101/101 PASS** [ログ](logs/final-focused.log) |
| Expression / Reaction / Director v1・v2 / 全対象展開 / postgame | **192/192 PASS** [ログ](logs/conversation-regression.log) |
| 来訪・保存互換・旧世代実セーブ・恋愛・地域・地形・非表示復帰 | **191/191 PASS** [ログ](logs/household-protection.log) |
| 最終版 Home・44来訪・操作・情報・iPhone相当レイアウト・ファイル整合 | **109/109 PASS** [ログ](logs/final-v11.log) |
| CSS適用範囲・最終キャッシュ更新後のruntime/touch/整合 | **19/19 PASS** [ログ](logs/final-cache-scope.log) |
| キャッシュ参照・実ファイル整合 | **6/6 PASS** [ログ](logs/asset-integrity-final.log) |
| 広域既存テスト | 初回2901件中2878成功・23失敗。[初回ログ](logs/full-suite.log)。省略チェックアウトの入力不足、更新前キャッシュトークン、並列ワーカー失敗を記録。入力を正本から補い並列数2で再検証し680/681成功。残ったWorld出典JSON不足は補完後、上記101件に含め成功。[再検証](logs/full-retry.log) |

全体の `npm test` が一度で全成功したとは報告しない。失敗した領域は個別再検証済み。進行・会話の実装をテスト通過のために変更していない。

人数は仲間0/1/5/13/20/26×恋人有無。幅320/375/390/430相当のレイアウト、低い表示領域、重複・未知ID、実際の来訪開始/終了、離脱時の選択解除を検証した。10分の非保存生活モデルで人数維持・行動の種類・同時歩行上限・reduced-motionを確認。

全44キャラの専用掛け合いは、他候補を既使用にしたテスト条件で、実際の来訪イベントから本人専用unitへ到達し、全beatが既存文言の順番どおり表示されることを検証。台詞・発話間隔・抽選条件の本体は変更していない。来訪途中の終了では会話を終了する。恋人専用台詞を仲間へ渡さない。

## ブラウザ視覚QA

クラウド Chromium の Canvas 3D フォールバックで実施。WebGL/iPhone Safariの実機試験ではない。

- 森28体: 75秒以上の継続稼働、28 DOM維持、背景の鳥等の生成・移動を継続。9種類の生活行動を計測。[計測JSON](household-forest-long.json)
- 28体・森: 約4.82FPS、描画平均7.81ms / p95 13.30ms。旧v9の同環境も約5FPS。クラウドの全体FPSをiPhone性能へ換算しない。
- JS heapはサンプル約32〜84MB。GCを含む単発計測であり、リークなし・実機長時間安定を保証する証拠ではない。
- 森390px、水辺320px、都会430pxで28体を目視。375pxで13体。全体表示・通常表示で28体を維持。タップで「いたずらたぬき」の正確な選択を確認。
- ドラッグ、透明余白、選択解除、非表示復帰、reduced-motionは自動イベント/モデルテスト。Safariの指操作・スクロール競合は本人確認が必要。
- 開発中、一度背景が単色になったフレームを観測。後の長時間確認で短画面の高さ再計算ループを特定・修正した。単色フレームとの因果までは確定していない。最終版320×576・111秒では28体、約4.97FPS、背景の移動継続、描画平均8.33ms / p95 14.90ms、heap約41.5MB。投影再計算は5回であり連続ループは再現しなかった。[最終計測](household-short-final.json)
- 320×576でcast下端481.48px、ステータス上端486.48px、文書高さ717px。下部の「ごはん」をブラウザで実際に操作し、成功通知と会話を確認。指によるスクロールは実機未確認。

## 比較画像

旧図はPR #253の実配置コードと当時のboundsを使った**再構成**で、当時のスクリーンショットそのものではない。新図の人数セレクターは主役込みの合計。

| 内容 | 画像 |
|---|---|
| 旧: 仲間26＋主役 | [旧半円配置](images/household-old253-companions26.jpg) |
| PR #426 v9: 正式来訪中の2体 | [旧v9の実来訪](images/household-v9-real-visit2.jpg) |
| 新: 少人数 | [2体](images/household-forest-2.jpg) |
| 新: 中人数 | [13体・375px](images/household-forest-13-375.jpg) |
| 新: 仲間26＋主役 | [27体](images/household-forest-companions26.jpg) |
| 新: 仲間26＋配偶者＋主役 | [28体・森](images/household-forest-28.jpg) |
| 全体表示 | [28体・全体表示](images/household-overview.jpg) |
| 水辺・会話中 | [28体・320px](images/household-river-28-320.jpg) |
| 都会 | [28体・430px](images/household-city-28-430.jpg) |
| lonely救済・じゃれる反応、ハート・指輪、会話と通知 | [28体のReaction](images/household-reaction.jpg) |
| V11最終・28体390px | [最終全景](images/household-v11-forest28.jpg) |
| V11最終・320×576 | [短画面](images/household-short-final.jpg) |
| 時間差の生活配置 | [後続フレーム](images/household-forest-frame2.jpg) |

## 試遊と残る判定

[本人限定iPhone試遊版](https://naotocchi-home-diorama-20261022.kerzion214.chatgpt.site/)を継続利用。**version 11 / succeeded**、Site source `1676f7146706d682457772c165dcae330c993f04`、deployment `appgdep_6adba058caec8191b1ed6c2399ef9fe9`。所有者1名のみ、外部0を再確認。通常の試遊保存キーは `naotocchi-home-diorama-preview-v1`、本番は `naotocchi-save-v1`。見本の人数・地域選択は試遊データを置き換えることを画面に明示。本番の仲間や恋人を追加しない。

本人のiPhone Safariで、全員の見やすさ、28体の指操作、縦スクロール、発熱・FPS・メモリ、バックグラウンド復帰、継続した来訪・会話、天候/時刻変化を確認してから最終採用を判断する。Draftを維持し、mainと本番Pagesは更新しない。
