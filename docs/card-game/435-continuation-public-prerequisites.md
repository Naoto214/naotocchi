# 435 — 公開前提条件の共通証明（途中保存・最終検証未完了）

434から432承認共通設計を継続。公開前提条件の証明と、最終独立レビュー1回の修正まで進めたが、実行環境の継続的な接続障害により最終検証を完了できていない。435を完了checkpointとは扱わない。最新の完了・検証済み基準は434の5cb9e57512edac8fa88c2ab9ff73a74b01ba8782。

## 保存した実装

- 共通public_prerequisite_v1: main⑧またはR10、own world/main/prepared存在を本文79/83/91と114に結び付けて証明する。未成立だけを除外し、possibleは合法性・対象・解決済みを意味しない。
- proofは公開観測・source/identity SHA・public input hashを持つ。非公開の山札順/相手手札/伏せ札種類や印刷時を読まない。
- opt-in runnerは実行coverage continuation_public_prerequisites_v1、state continuation_contract_v1を使用。旧433/434 defaultを変更せず、scope内だけ共有条件adapterへ接続。
- レビュー修正: すべての除外proofを完全な元stateへ照合して投影矛盾を停止。型を含むcanonical比較でTrue/1やFalse/0改変を拒否。main IDと本文表示段階の矛盾を拒否。

## 保存と検証の区別

実行環境がexec-server transport disconnected、executor key changed、websocket connection timeoutを繰り返し、shellとapply_patchでの復旧・記録保存も失敗した。GitHub APIは使用できたため、会話内の実行済み作成・修正入力からコード/テストを復元して途中保存した。

**保存版のローカルbyte照合・syntax再検査・最終回帰は未確認。** ローカルで取得したPASSをこのGitHub treeのPASSとは扱わない。ローカルの作業やHEADをresetして捨てず、復旧時は最新remoteと比較してから扱う。raw logs・435のpaired/manifestはこの途中保存には含めない。434以前の保存結果は一切変更していない。

## ローカルで取得した結果（最終treeへの保証ではない）

- 初期新専用12件、runner4件PASS。434 defaultの8保存結果と完全一致を確認。
- レビュー修正前の同じ135入力から旧/new8実行＋8再生は一致、完了0/停止8/未実行0。01-B pilotのみseq24→26へ到達し、mainありpartner登場処理の証明不足で停止。他7件の停止地点は434と同じ。
- 同じcoverage内の比較可能な公開判断10件、選択差5件。固定歴史scope21件を維持、82条件proofを完全snapshotと独立照合。431/434との到達差はexecution edition differenceとして分離しpolicy効果に数えない。
- npm406件PASS、default design/catalog errors0、505原本と過去dataのraw不変を確認（レビュー修正前）。
- 独立レビュー1回: Critical0 / Important2 / Minor1。3点へ対応し、4再現テストRED→GREEN、条件14＋修正境界2=16件PASS。
- 最初の193件結合検査は中断。修正後197件の結合検査と8軌跡再実行も最終結果を取得できていない。全984件の全回帰や435の完了を主張しない。431の913/913は過去の保存結果。

## 次に実行すること

1. 最新remoteから復元し、435ソースとテストのsyntax、可能ならローカルbyteとの差を確認。
2. 新runnerを実行して435 paired/manifestを生成し、同一入力の8軌跡・別再実行の完全一致を確認。
3. continuation全専用71件＋resource pilot97件＋終了関連29件=197件の結合検査を完了。新20件だけのPASSを全回帰と呼ばない。
4. npm/default design/catalog、505/114/414・過去保存結果とsource/artifact hashesを照合し、raw証跡を保存。既に行った独立レビューを繰り返す必要はない。
5. 最終結果を追記してGitHub保存を確認する。そこまで435は未完了。

生成コマンド:
```sh
python docs/card-game/tools/proxy_continuation_condition_runner.py --output docs/card-game/data/proxy-continuation-conditions-435
```

新回帰:
```sh
PYTHONPATH=docs/card-game/tools python -m unittest test_proxy_continuation_conditions test_proxy_continuation_condition_runner -v
```

M-beetle-02の能力分類/到達履歴、world配置の確定結果/実行/応答、mainありpartner登場処理、relationship確定結果は停止課題として残る。I-bowtie能力解決・対象離脱・R10新経路完走も未対応/未確認。完走・勝敗・強さは未確認、今回の補修を採用根拠にしない。

505/114/414・過去保存結果維持、112 fixtures未実行、独立balance0、採用false、PR259 Draft/open/unmerged。Ready化/main mergeは未承認。

[実装範囲](plans/2026-10-02-continuation-conditions-435.md) / [独立レビュー記録](data/proxy-continuation-conditions-435/verification/independent-review.md)
