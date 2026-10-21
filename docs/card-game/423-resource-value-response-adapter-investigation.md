# 423 — 配置後pass adapterの調査checkpoint

415 Task 5は進行中。実行コードは検証済み422を保持する。414仕様・114正本・原本505 JSON・保存済み結果を変更していない。全proxy回帰・旧／新完成結果比較・最終独立レビューは未完了。新方式は正本化しない。

既存190/196でC-chicken発動・解決を試験接続した。保存済み応答seed文脈も境界の両hashに束縛して再利用する候補を調べた。延長後の01-A seq33/45では配置後最初のpassのreturn_targetが保存履歴と異なった。旧sourceではnormal_action_opportunityを保持し、120単独ではNoneへ変わる。次のpassで再一致しても中間hash差を無視しない。既存242は138のpassを使う一方、以前の段には120を使う契約があり、単純な全置換では過去prefix保持を満たせない。

13専用テスト全体はFAIL（保存履歴照合）。PASS扱いしない。接続案は`verification/task-5-chicken-in-progress.patch`として保存し、実行コードには採用しない。422の12テストを再実行して安定状態を確認した。

次作業は、歴史的な境界と現行の配置後pass契約のadapter対応を明示し、保存済み選択・stateを答えとしてコピーせず既存handlerから再生成すること。応答seed文脈の明示入力保護もfresh source再読込で補う。その後、C-chicken/coin等の接続、Task 6評価、Task 7全回帰、最後の独立レビューへ進む。今回のadapter未接続停止を政策効果に計上しない。

保存前に原本505のlocal/remote raw SHA256不変と422 remote content/tree一致を確認した。
