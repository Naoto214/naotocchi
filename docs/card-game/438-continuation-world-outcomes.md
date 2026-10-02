# 438 — 世界配置の即時結果証拠を共通接続

437保存HEAD08fe4b39263d19cda34aede10f69c4109d4f26cc / tree7f76f8d3e3283b9a23e36bab3b7dca2919902eeaをfresh確認して継続した。432承認済み設計内でinline実装し、世界の本文分類・完全合法候補・支払・即時結果の共通契約を接続。新裁定・114/414選択仕様は追加していない。

## 接続した契約

W-deepseaの89本文は、手札2枚以下の間にメインのちから・ちえを補正する継続効果で、配置時発動ではない。89本文の時2と114候補表の支払を照合し、能力節全体のSHAをレビュー済み分類へ結合する。引用表記や説明の変更でも、未知の登場時能力をゼロ結果として黙って受理しない。証拠には実sourceファイルSHAも保持する。

完全合法候補からaction/source/card/target/payment/referenceを厳密再検証し、確定そだち差0・支払時2を証明。436メイン比較との分割処理後も全候補を戻し、残りの候補は既存scorerへ委譲する。無料発展認定・誕生加点・未知カードへのゼロ結果は追加しない。

選択された場合の初回配置は、支払と手札→自分の空きセカイ枠を同時適用し、runtimeを保持したまま通常の配置後応答窓を開く。旧世界の離脱、世界あり応答、将来の継続補正・終了処理は未証明として停止。W-cityの履歴依存誘発や他世界を同じ分類へ入れない。この初回配置処理は専用テストで検証したが、実際の8軌跡では世界配置選択0件。

新coverage `continuation_world_immediate_outcomes_v1` は436を継承し、world証拠を追加する。世界候補の証明後に別候補が停止しても、証明済みworld証拠だけは記録し、比較全体や実行完了を認定しない。436の盤上参照を含む過去snapshotの比較では、437検査scopeを適用し参照を保存する。

## fresh検証

修正後の最終結合233/233 PASS（failure/error/skip0）、npm test406/406 PASS（fail/skip0）。専用world11件＋runner4件を含む。全proxy回帰を実施したとは主張しない。ログはverification/combined-tests.log・npm-test.logへ保存。最終レビューの重要指摘修正前の中間回帰・再生ログは最終PASSの根拠にしない。

同じ135初期入力の8実行＋8独立再生を検証。別再生成のpaired.json.gz/manifest.jsonはbyte一致。世界証拠5・メイン証拠9・条件証拠144を完全snapshotから独立再検証。実source29件のSHA一致、505原本と過去tracked data818件を437保存HEADへ照合して不変。114/414・112未実行を維持。

独立レビューは最後に1回のみ。Critical0 / Important1 / Minor0。追加能力がMarkdown引用の別表記や継続行で検出を逃れる指摘を、全能力節SHAの厳密結合へ修正。3不正形式のRED→GREENと最終回帰で確認し、再レビューなし。重要指摘の修正は分類証拠の完全性を守るもので、新しいゲーム裁定ではない。

## 到達点（437 → 438）

|経路|旧policy|pilot|438の停止境界|
|---|---|---|---|
|01-A|53 → 60|27 → 27|M-antlion-04分類／W-city配置実行adapter|
|01-B|43 → 72|26 → 26|M-antlion-04分類／mainありpartner登場処理|
|02-A|51 → 51|41 → 41|世界証拠後のM-antlion-03分類／relationship確定結果|
|02-B|103 → 103|33 → 33|M-antlion-05分類／relationship確定結果|

完了0 / 停止8 / 未実行0。winnerは欠測null、balance0、採用false。新版到達範囲の差をpolicyの改善・強さの証拠へ加算しない。同一coverageで照合可能な通常判断10件だけを比較し、選択差は5件。

## 次工程

M-antlion-03/04/05の本文はそれぞれ、相手quickプレイ時、準備の伏せ札なしでの段階到達、time_skipでの段階到達かつ準備全枠なしを条件にする。将来誘発と配置直後誘発を区別して共通分類・即時証拠を拡張する。main遷移実行、partner登場、relationship、W-city、世界の将来処理は未対応境界として保持し、既存正本だけで決まらない新裁定が必要な場合のみ確認する。

PR259 Draft/open/unmerged、Ready化/main mergeなし。

[実装範囲・判断記録](plans/2026-10-02-continuation-worlds-438.md) / [最終証跡](data/proxy-continuation-world-438/verification/) / [manifest](data/proxy-continuation-world-438/manifest.json) / [独立レビューと修正](data/proxy-continuation-world-438/verification/independent-review.md)
