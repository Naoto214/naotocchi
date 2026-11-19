# 再開・完了確認（2026-10-16 JST）

前回の実装は停止で失われておらず、UI修正はDraft #386、比較はDraft #387に保存済み。本再開は既存成果を再利用し、検証・完了記録を更新した。製品コード・ルール・測定データを変更していない。両PRともopen/Draft/unmerged。新規PRの重複作成、mainマージ、本番置換は行わない。

## 正本と分離

開始時main: ad559758bc9101adc7c00ab04ed333572ce37d9d / tree 6cddcb7ded93275e71581ce8a9778e5a00ba39f4。
元の分岐点b8fad706以後のmain変更はドロップ試遊統合。既存ブランチを再利用し、その変更を巻き戻さない。

- UI検証対象: d4fdafebdfbd2111c5a42c1148ed5c7633dc418c / tree ed14b4436fd7c2ac0e856d108074b8b30f1e62b7。
- 比較検証対象: b84b5178aa6899da5f43b623d3c020d9f10c4aea / tree b7862a96b7a55d8afe2202b03ac4dc0a84b64b6b。
- 上記双方は取得したremote/local HEAD・tree一致、cleanから開始。本追補は文書のみ。
- 差分はスライド、入口CSS、専用CI/証跡に限定。ドロップ、本編save/schema、画像資産、3D、カードゲームは変更していない。

## 再実行した検証

|検証|結果|
|---|---|
|比較14＋既存50テスト|64 PASS / 0 FAIL|
|UIブランチ|52 PASS / 0 FAIL|
|比較semantic mutation|9/9検出|
|既存engine/player/balance mutation|15/15＋8/8＋7/7検出|
|新操作列SHA-256・補充列再生|376列一致、寿命消滅152列|
|旧証明・既存比較|87＋147証明、320盤面/120方策/480追加履歴一致|
|実DOM操作|E/A/B/C/D、Undo、復帰、保存分離、終了後評価保存 PASS|
|既存player DOM/races|操作列、資源、勝利、Undo確認/取消、非表示/読込競合 PASS|
|旧ドロップ|130 PASS / 0 FAIL|

コマンドの作業ディレクトリ指定・balance mutationの拡張子を誤った呼出しは修正して再実行した。これは製品不具合ではない。

## 再利用した全体回帰・画面証拠

- 比較最終コードCI: https://github.com/Naoto214/naotocchi/actions/runs/38714269596 — rules/replayと5方式×4サイズの画面検証stepとも成功を再取得確認。
- UI最終コードCI: https://github.com/Naoto214/naotocchi/actions/runs/38713684499 — rulesとiPhone相当サイズの画面検証stepとも成功。
- 全体npm test CI: 比較 https://github.com/Naoto214/naotocchi/actions/runs/38714269540 、UI https://github.com/Naoto214/naotocchi/actions/runs/38713684457 — 両方success。workflowはnpm test全体を実行する。
- 保存済みfull-regression.logは3144＋80 PASS、0 FAIL。SHA-256: 5b3ea649483d8bc7fe88d66ff4e7d253c0430d7ee6fae3dc52c8041c3ccc799b。
- 今回ローカルで開始した重複全体回帰は、製品コード不変と上記成功CIの確認後、途中で中断（exit130）。今回完走したとは報告しない。
- 今回のChromium起動は環境のsocket権限制限で失敗。制限を回避せず、同一コードの成功CIと保存済み画像を使用。実iPhone/Safari Human QAは未実施。

## 完了条件と成果の場所

|依頼事項|成果|
|世界12作品/群・出典・未確認事項|RESEARCH.md。2048/Triple Town公式本文を再確認。CupcakesのJS取得不能は引き続き未確認扱い|
|A〜D/E・Cの6条件・D留保・ゲージ単独/組合せ|engine/session、README.md、MEASUREMENTS.md、SUMMARY.json|
|共通seed測定・新証明|8seed、376列、results.tar.gz（再探索せず再生確認）|
|重点試遊候補|B、C16-20、D0。基準E、費用2/6、共通seed2から比較|
|UI不具合・演出保護|#386 QA-20261015-RESULTS.md、保存済み修正前後画像|
|Human QA準備|HUMAN-QA.md、ui/index.html、端末内記録/JSON出力、主観評価|
|独立保存|#386と#387を維持。本追補と計画書の完了状態のみ追加commit|

## 未解決・正式採用前の判断

B/Cは終盤の材料とスライド進化を増やす候補。Dは手動卵削減の対照候補。しかし、だいへんしん依存と集中方策の優位は残る。4/12への単純変更は手数・別アイテム負担を増やすことがある。スライド限定40探索は未証明であり不可能とはいわない。AIの解法確認数は人間達成率ではない。

Human QAでSafariバー/回転/指操作、200/240/280ms、横画面の狙いやすさ、実タップ負担、終盤の楽しさ、複数種族の価値を比較してから採否を判断する。試遊環境は非公開開発HTTPSの起動手順を用意済み。公開試遊URLを新設したとは主張しない。
