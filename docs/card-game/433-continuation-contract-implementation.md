# 433 — 432承認設計の共通継続契約実装

432の共通契約設計をユーザーが承認した後の実装記録。431の完了済み7タスクは再開しない。新実行版は `continuation_contract_v1`、既存runner/414/114/505原本・過去結果は変更しない。

## 実装と接続範囲

- `proxy_continuation_state`: 装着先・公開準備情報・使用回数を旧5field payload外の版付きenvelopeへ保存し、全体hash/公開view/厳密な関係検査に含める。旧任意stateから不明な装着先を推測しない。
- `proxy_continuation_rules/candidates`: 02/55/77本文と114 tableを参照する共通分類、誕生・同種族の後段階・別種族のへんしんの合法性と費用、任意軽減variant、実盤面全対象の完全候補。現在の公開情報と候補が合致する既存の比較証拠も再利用する。未知の効果は上位評価0に変換しない。
- `proxy_continuation_actions`: 装備の原子的な支払/hand→prepared/公開装着関係/配置後応答、開始能力の任意発動条件、使用履歴参照。既知のpass・誕生・無料人物配置・コイン宣言/応答を既存handlerへ接続。
- `proxy_continuation_runner`: 署名付き135の同一4入力から2policyを各実行し、初期入力から再生比較する。新runtimeを捨てる旧handlerには渡さず明示停止する。

**未接続を実装済みとは扱わない。** メイン移動の実行、軽減付きしかけ実行、装備開始能力の発動/解決、装備対象の実際の離脱handler、装備ありの終了・強制処理は未接続。対象離脱時の装備破棄は共通primitiveのみ検証し、未接続handlerは止める。分類が通常判断で通っても終了処理の分類/効果履歴証明までは完了していない。

## 実行結果（検証・保存対象）

予定8、実行8、初期入力からの再生一致8、完走0、停止8、未実行0。停止時の勝者・最終そだちは全てnull。

|135入力|431旧policy停止seq|新契約旧policy停止seq|431pilot停止seq|新契約pilot停止seq|
|---|---:|---:|---:|---:|
|01-A先攻|131|31|20|22|
|01-B先攻|140|24|10|12|
|02-A先攻|77|51|25|30|
|02-B先攻|103|79|30|33|

- 新契約旧policy: 01-A/01-B/02-Bは `M-beetle-02` の確定効果分類不足。02-Aはworld配置の確定比較証拠不足。完全候補に段階②誕生等を含めると、旧scopeの範囲より早く未知の証拠に達する。旧結果と同じ進行を強制しない。
- 新契約pilot: 01-A/01-Bはmainありの終了分類・効果履歴証明不足。02-Aは装備を保持した終了handler未接続。02-Bは交際の確定比較証拠不足。
- 新版内の同じ公開view/候補詳細/seed contextで比較できた通常機会は10、選択差5（01-A 1/4、01-B 1/2、02-A 1/1、02-B 2/3）。完走・強さ・採用の証拠にはしない。
- 旧scope監査はshadow17+427停止4=予定21、全21監査済み、停止0、未実行0。行動/source/card/variant/target/費用指定の追加・欠落・意味差を記録。旧証拠のない費用は `unproved`。これは21回の対戦や新decision生成ではない。

## 検証状態

最終結合検査の結果は `verification/final-combined-tests.log`。新専用34件と既存resource97件を同一processで実行し、131/131 PASS、skipなし。共有分類scopeの復元を含めて確認済み。npm testは406件と前段smoke/dialogue/visual QAがPASS。default design/catalogはエラー0、505原本はraw hash不変。全913件は431での検証済み結果であり、433で全913再実行済みとは記載しない。112 fixtures未実行、独立balance0、採用false。

独立レビューは最後に1回実施、Critical0 / Important1 / Minor1。必須のこいびと登場処理をたまご中と誤判定する問題と、費用のみの候補差を検出しない問題をRED→GREENで修正。独立再レビューは追加していない。[レビュー対応記録](data/proxy-continuation-contract/verification/independent-review.md)。

`manifest.json`は圧縮/展開artifact hashと実行source hashを保持する。`paired.json.gz`は新8runの全snapshot/event/decision、21scope監査、歴史差/同一版policy比較を含む。途中失敗ログもintermediate/REDと明記して保持し、最終PASSと混同しない。

## 比較の解釈

431との差は実行coverage/候補scopeの差として記録する。新実行版の中だけで旧/new policyを比較し、公開view・候補詳細・seed contextが一致する機会を重複消費せず対応づける。停止時のwinner/final growthはnull。今回の補修も到達位置の変化も、新方式の強さ・採用の根拠にはしない。

[設計](plans/2026-10-02-continuation-contract-design.md) / [実装計画](plans/2026-10-02-continuation-contract-implementation.md) / [実行証拠](data/proxy-continuation-contract/)

## 次に必要な共通接続

終了時の能力分類・登場/装着eventの効果履歴証明を、新しい共通記述とenvelopeに結合することが次の候補。既存の6段階終了検査を迂回しない。その後、装備あり開始時の任意能力発動/解決、人物移動と新instance管理へ進む。未知のゲーム裁定を今回作らず、既存本文で一意にならない場合だけ停止する。

判断の根拠とリスクは[実行判断台帳](data/proxy-continuation-contract/verification/rulings-433.md)。PR259のReady化、114採用、main mergeは行わない。
