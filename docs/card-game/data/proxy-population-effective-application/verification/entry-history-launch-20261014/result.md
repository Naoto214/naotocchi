# 再登場履歴の共通修正・承認待ち

6行動系統の外側instance boundaryへ現在のenvelopeを明示し、100/105・life.observe・既存capture/finishを再利用した。実public履歴と連続したhash鎖を照合し、full-envelope binding不一致・raw履歴で一意にならない仮state・旧個体・証拠欠落を停止する。ゲーム裁定、カード本文、選択policyを変更していない。

- 修正source: `542ab53b6a9e273eaf84b1bb4a46c9c3b3261a2a` / tree `58a328b4f9a4b9ef9d8a5d41e5ff26326fc44a70`。
- 新execution edition: `99eceff1ed7af8c7405dab7f9ed544cc20ebfa00` / tree `0511182fb6d328e8bff5ced9ca4918695a3e020b` / SHA-256 `75390b23a1edd71d30e36037c3356070b6a8ac3e3957d1b7c3d676ec131a930c`。
- binding公開: `33c1017fd0d406183f59715bb45c92050a6208c8` / tree `d866e10ab4665744b3f61721681f718c5fadd34b`。editionの直接の子、binding/manifestの2ファイルのみ追記。公開後の再構成監査成立。
- binding SHA-256: `b0564168c600baa396e4f2621c7794cbedb98893d7e34daae03d2cedfb184bfd`。
- manifest SHA-256: `37cab5faa0d6edf54aa9f45475fccae0842fa3cd2da729b9d9c2480293c38270`。元の固定200群・400行とsource_versions以外が完全一致。新seed・初期順・入力package変更なし。
- 本人launch request SHA-256: `df230d6cbae39a7e55bc96a7ea0ea38f90e456ca3d566e134f30d5a6a4da985e`。本文はapproval-comment.txt、機械可読正本はrequest.json。新しい本人コメントが必要。旧コメント6127373548は消費済みのまま再利用しない。
- 新出力先予定: `docs/card-game/data/proxy-population-400-entry-history-run-20261014`。まだ作成・起動していない。512step上限、自動retry/resume禁止。

## 最終sourceの検証

- 専用8件PASS（6系統の本番外側ガード・raw履歴6系統の補足検証・保存275eventの履歴fold）。初登場→合成離脱/回収→再登場、新個体、登場時誘発、旧使用記録の非継承、未解決予約停止を確認。
- 現行population/mandatory191モジュール909件PASS、実exit0、1826.854785秒、Python1097ファイル前後一致。生ログと全ファイル指紋を保存。
- 非本番の旧115/固定零root診断は328eventでcompleted=true、stop=null、実exit0、484.094229秒。13root監査成立、Python1097一致。保存済み第1戦の再実行ではない。
- 保存第1戦の275snapshotは再計算一致。保存event/envelope/continuation/lifecycle hash鎖と再登場ガードを読み取り検証。保存結果を成功へ書き換えていない。
- 設計検査exit0/errors=[]。初回のsparse-checkoutリンク不足は正本のリンク先を取得して解消。旧独立checkoutの欠落blobをprefetchした後、既存の旧生成来歴監査が成立（監査契約変更なし）。
- 独立レビュー1回 C0/I1/M1。full-envelope枝混同の指摘をRED→GREENで修正。旧使用記録・未解決予約のnative検査を追加。修正後の独立再査読とは扱わない。詳細はentry-history-542ab53-review.mdと初回/修正差分。
- 修正前の初回回帰はsource更新で無効化され、906件中failure5/error3。PASSに含めない。生ログを別保存。初回の完全結合停止、summary出力失敗もレビュー記録に区別した。
- 実preflight=true/errors=[]。旧生成来歴、原package7成果物、保存入力の同一性、新editionとの再結合、公開binding再構成が成立。
- 既存非Python4053ファイルの全bytes一致。既存baseline保護3668ファイルも一致。旧edition・両停止原本・全保存event/snapshot/hash・承認消費履歴を変更していない。

## 実行状態

新400戦の実行0、承認消費0。前回400行の保存結果はcompleted0 / rules-stop1 / integrity-stop0 / 未実施399のまま。独立balance標本は0、同じ固定入力を新標本として二重計上しない。全400戦の適格性を保証しない。PR259 Draft/open/unmergedを維持し、mainマージ・別PR・本編/3D/イラスト変更なし。

CIの最終状態と最新保存HEAD/treeは、最後の公開後にfresh確認する。この文書はCI実行や新たな開始承認を表さない。
