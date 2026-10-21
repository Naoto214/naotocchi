# 431 — 資源価値pilotの実装・評価・検証結果

414承認仕様と415計画の7Taskを、真正停止を明示するrun/replay範囲で完了。430 HEAD `829742a1f16a3f1961b149cd823f45b071d30396`、tree `4c637ab3507f1b7ec4677862714fc005ea3c0364`から最終保存する。

## 結果

|項目|実測|
|---|---:|
|予定shadow|110局面|
|比較可能 / unsupported|93 / 17|
|選択差|56/93（60.2%）|
|旧 / 新の通常fallback|4/93 / 88/93|
|新たにseededとなった判断|84/93|
|選択pool差（同値tie-break後の一意選択または抽選集合）|84/93|
|両方seededのcontext差 / 抽選集合差|4/4 / 0/4|
|合法inventory互換性差|0/93|
|paired実行 / 完了 / 停止 / 未実施|8 / 0 / 8 / 0|
|反応fallback / 有効反応判断|25 / 257|
|mandatory seeded / 有効mandatory判断|61 / 61|
|有効通常判断|85|
|独立balance標本|0|

対応不能17局面は過去の盤面projectionにより装備targetが候補から除外されたscope差。方針効果には加算しない。新版はメイン配置へ到達し、fallbackが増えた。資源価値の優劣を証明できる範囲と実行handlerのcoverageが限られるため、改善・強度・採用を断定しない。

新方式の停止は01-A seq20、01-B seq10、02-A seq25、02-B seq30。01-A/B/02-Bはメイン配置後の候補/系統証明不足、02-Aは装備解決adapter不足。旧4はseq131/140/77/103の過去候補scope差で停止し、到達したcanonical選択/event/stateは過去結果と一致する。

共通完了手番は01-A R1/A、01-Bなし、02-A/BともR1/A・R1/B。成長、残り時、枠占有、予約、個体遷移を手番終了/実event単位で集計。片側だけの手番は他方null。全8の最終そだち差・winnerは欠測。発動と効果解決は手札プレイへ二重加算しない。`hand_plays`は01のアクションカードのプレイを指す。

## 検証

新しい全proxy manifestで913/913 PASS。予定=開始=終了913、ID完全一致・重複/欠落/skip0、6 workerすべてexit0/success、ソース不変。worker実行時間は1663〜1923秒。旧908/912件の中断runは未完了として保持し、合算していない。

専用97/97 PASS（86.907秒）、npm test exit0、catalog/既定設計検査errors0、空白検査成功。静的AST913と実行PASS913は別々の根拠で照合。歴史190/221/263とproxy_test_count263は維持。原本505 raw変更0、114正本・408の保存結果・112未実施fixtureは維持。

fresh8実行と各独立再生は427全rawを完全再現、SHA256 `da96502819911c579bd5895116192524398a6b7b5db4a673b29319d3dee39d71`。署名付き424 base/427 deltaを復元し、各operation/ID/base lengthとraw/gzip/reconstruction hashesを照合する。保存形式の差分であり実行cacheではない。

## 最終独立レビュー

独立レビューは1回、Critical0・Important2・Minor1。重要2件は非公開山札順による証拠の有無とsubset/context差の評価不足。公開状態・合法action/source/variant/target・公開履歴へ証拠を結合し、完全hashは実行/再生で保持した。93局面の非公開山札/手札順変更でselection/proof一致を確認し、公開履歴改変を拒否する。seeded移行と両方seededのcontext/subset差を別集計する。実schema追加照合で反応専用mode25件の集計漏れもRED→GREEN修正した。最終97件専用検査と全913件回帰は成功。再レビューは追加していない。

Minorは`hand_plays`名称の明確化を保留。現在の意味は01のプレイ定義に一致するが、全手札カード消費と読み違えられる可能性があるため本報告で定義した。

## 裁定と保存状態

Task5は未知handlerを真正停止として残す検証済みの8 run/replayを完了範囲とした。誤っていれば処理coverageが不足するが、欠測と停止理由を公開し、採用判断を保留する。reviewerもこの範囲を認めた。レビューが判断を保留した全回帰・remote/原本は主担当が実測照合し、政策強度/採用/最終結果は支持できる証拠がないため判断しない。誤りの費用は検証不足・保存/履歴不一致・政策改善の見落としで、各検査と未採用の維持を記録する。

全裁定・理由・誤った場合の費用は[rulings](data/proxy-resource-value-pilot/verification/rulings-431.md)に列挙。[独立レビュー記録](data/proxy-resource-value-pilot/verification/final-review-429.md)と[反応率修正](data/proxy-resource-value-pilot/verification/final-response-rate-fix-430.md)も保持。

PR259はDraft/open/未マージ、作業ブランチとworktreeを保持。114正本化・Ready化・main mergeは行わず、112未実施・独立balance標本0を維持する。

[最終評価JSON](data/proxy-resource-value-pilot/evaluation-checkpoint-430/evaluation.json) / [全proxy summary](data/proxy-resource-value-pilot/verification/full-431/summary.json) / [manifest](data/proxy-resource-value-pilot/verification/full-431/manifest.json) / [独立照合](data/proxy-resource-value-pilot/verification/final-verification-431.json)
