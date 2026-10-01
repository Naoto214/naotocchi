# 411 — 全proxy回帰816件の完全coverage確認

410を先にGitHub保存したHEAD `0d4f80c54f99010eb4ce08b30c306186d7c08517`、tree `e27361360ebffa54b5a4f392e0387f9b4be5f50b`から、既存test_proxy_*.pyを完全列挙して6独立processで回帰を実施した。409コードから復元した410の5productionファイル・専用9テスト・runnerは変更していない。

**310モジュール、816/816 PASS。FAIL/ERROR/skip/expected failure/unexpected success 0。** 全worker exit0、全summary存在、全worker successful。予定816 ID、開始816 ID、終了816 IDの集合・件数が完全一致。欠落・重複・予定外IDなし。全816 statusがpassのみ。manifestに記録した既存テストsource SHA256は実行前後で全件一致。既存のテスト内容やsubprocess CLIを置換・削減していない。

終了後にrunnerとは別の再列挙・ID照合も実施し、同じ310モジュール／816一意IDと、全workerの開始・終了・PASS記録の完全一致を確認した。単純なログの`... ok`行数はsubtest等の出力書式により776となるが、確定件数はTextTestResultの816個の開始／終了ID・statusと各unittest最終summaryを照合したもの。途中進捗の行数や前タブの逐次204／並列196は合算しない。

| worker | 実行・PASS | 秒 | exit |
|---|---:|---:|---:|
|0|96|1470.284|0|
|1|137|1587.590|0|
|2|142|1405.596|0|
|3|201|1617.126|0|
|4|107|1461.397|0|
|5|133|1622.431|0|

最長workerは約27分。同process内の既存検証と各CLIの正準再生成を最後まで実行した。全proxyの最終結果は今回freshで得たもので、消失した未保存410の検証結果を利用していない。

復元後の専用9/9 PASS90.137秒、npm test exit0、catalog／既定設計検査exit0・errors0は410に保存済み。独立read-only code reviewはCritical/Important/Minor各0。全回帰後も既存data JSON505個のraw SHA256不変、408 state/auditのraw SHA256一致を再確認した。

- 408 state: `6623cc9b68a5a9375b0d02df081b56f42046c40e801b3ed937c3f38863018d4b`
- 408 audit: `006624f87ecb4b10b08f87d782a3c521dba02059637f69e10ce93ece2619724a`

4経路R10完了、A25/B20・A勝利、R11／追加ドロー未生成。独立balance標本0。112fixture6件は未実施。カード本文・数値・登録区分・イラスト変更0。全回帰成功からbalance結論は出さない。

## 保存した証拠

`data/proxy-verification-410-20261001/full/manifest.json`に全予定ID・モジュール分割・test source SHA256。
同folderにworker-0〜5のlog/json、summary.json。`full-runner.log`は親process最終結果。
`final-verification.json`は別途の再列挙・ID／raw SHA照合。runnerは`tools/run_proxy_regression_410.py`（410保存済み）。

保存直前remote HEAD410・PR259 Draft/open/unmergedを再確認。410 HEADのActions（PR-triggered取得）／statusesは各0件、CI成功とは扱わない。今回成功したのはローカル全proxy実行。Ready化・main mergeは行わない。

次段階: 409で未確認だった全proxy回帰は解消した。独立balance標本の設計／実行、112の実在入力不足、非アート凍結判断は後続であり、本checkpointで済んだことにはしない。
