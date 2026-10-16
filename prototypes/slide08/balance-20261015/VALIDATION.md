# 追加比較の検証記録

Node v24.19.0 / Linux。既存コードの変更は独立slide08内に限定。

|検査|結果|
|---|---|
|専用node:test|41 PASS、FAIL/SKIP 0|
|既存ルールmutation|15/15検出、旧結果不変|
|追加探索・指標mutation|7/7検出。各変異でassertion失敗1件|
|DOM|既存操作＋追加4条件の読込・全手再生PASS|
|追加履歴/証明|480履歴・147証明すべて再生一致|
|既存証拠|87証明・320比較・120方策履歴すべて一致|
|既存落下型なおぽよ|130 PASS、FAIL/SKIP 0|
|全体回帰（全指定、並列度2）|3144＋80 PASS、FAIL/CANCEL/SKIP 0、exit0。smoke/dialogue/visual QAも成功|
|実ブラウザ/iPhone|今回追加QA未実施|

```sh
npm --prefix prototypes/slide08 test
node prototypes/slide08/tests/mutation.cjs
node prototypes/slide08/balance-20261015/mutation.mjs
SLIDE08_JSDOM=/tmp/slide08-testdeps/node_modules/jsdom node prototypes/slide08/tests/ui-dom.cjs
node prototypes/slide08/balance-20261015/verify.mjs
node prototypes/slide08/verify-all.mjs
node --test prototypes/growth-chain/tests/*.test.mjs
node prototypes/slide08/balance-20261015/regression.mjs
```

jsdomは環境の既存インストールを使用。prototypeの開発依存を導入した環境では通常の`test:dom`でも実行可能。
DOM試験はjsdom未実装のdownload境界をstubし、href/download/出力JSONを検査。実ブラウザのダウンロード確認とは区別する。

## 長時間テストの切り分け

初回の`meguru-phase3b4-test.cjs`全体単独試行は完了前に中断（exit130）し、PASSに含めていない。
その後、元テストを編集せずrequireラッパーでcase4の開始・終了とstep呼出回数を記録した。

```sh
SLIDE08_TRACE_LOG=/tmp/slide08-case4.jsonl node -r ./prototypes/slide08/balance-20261015/regression-trace.cjs --test --test-isolation=none --test-name-pattern='^4[.]' tests/meguru-phase3b4-test.cjs
```

case4は非秘密36地点×8方向×5位置=1,440シミュレーション。561,566 stepを実行し128.44秒でPASS。
進捗は`results/regression-case4-progress.jsonl`、終了結果は`results/regression-case4.txt`。
全体回帰内でもcase4/5/6はそれぞれ127.42秒・305.65秒・181.39秒でPASS。合計614.46秒を占め、同形式の最大400step反復が長時間化の主要因だった。対象ファイルの20件もすべてPASSで、今回は未完走ではない。
全体の主node:test群は975.29秒、後続80件は5.12秒。全指定のコマンド・出力・exit0を`results/full-regression.log`へ保存。
全体回帰ではpackage.json指定を除外せず、`node --test`に`--test-concurrency=2`のみ追加。期待値・テスト内容は変更していない。
`NODE_OPTIONS=--test-concurrency=2`はNodeに拒否されたためCLI引数で適用した。拒否した起動はテスト実行成功に数えない。

## レビューと保護

読み取り専用の別レビューで測定コードと完成データを確認。最終480履歴/147証明を再生し、重大な欠陥なし。
再試行選択・itemPenaltyと初回到達重複排除の制約を報告へ追記。mutationの構文/importエラー偽陽性を防ぎ、既存証拠とのseed3 golden比較を追加。
旧エンジン・旧results・独立ディレクトリ外のdiffは0。`git diff --check` PASS。

保存は既存PR383への2段階。データcommit `48a170a32e8cebb3c0b8e10e31a5900fb9aa7dc5`、tree `664fa93eb35f001478908a72aca32604519d6273` をGitHub/local index双方で照合済み。
最終のツール・報告commitもremote/local treeを照合し、Draft/open/未マージ・cleanを確認する。
