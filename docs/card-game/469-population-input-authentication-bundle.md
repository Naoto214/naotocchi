# 469 — 過去入力台帳・供給乱数材料・不変保存の検証bundle

468から継続。400戦実行準備の入力側をまとめた。seed生成・400戦入力固定・新対戦は0。現時点ではpreflight-readyではない。保存を終了理由にせず、実行器・機会網羅の残作業を継続する。

## 共通検証

- `proxy_population_input_history.py`: immutable468 commit/treeの全data JSON/gzip・Python sourceをGit blobで照合し、明示された40現物×A/Bの入力順とshuffle seedを抽出。重複は同じ順序対として束ねるが全出典を保持する。欠損・異常なseed/現物/ownerはgapとする。結果・勝敗は同定に使わない。
- 115/135の保存manifestを既存constructorで再構成して一致確認。コードにだけ保存されていた135旧テストのseed+100入力も、固定sourceから初期順だけ復元する。対戦は再実行しない。既知45順序対・10seed。全Pythonの直接sampling/shuffle call7件を分類。これは保存リポジトリ内の明示入力と監査済constructorに限定し、外部・任意の動的Python・未保存過去入力までの完全性を主張しない。
- `proxy_population_material_protocol.py`: 供給bytesだけを受ける状態機械。128bit A/Bの組内同値または既知seed/順序対を拒否し、試行を消去しない。200組の初期順を揃えた後にgroup順・owner A/B順で32byte rootsを受ける。新集合内の偶然の一致・zero rootは除外しない。合法候補の選択は既存464に任せる。本moduleは乱数を採取しない。
- transcriptは呼出し順・目的・owner・bytes・再抽選理由・初期順・rootsを丸ごと再計算しcanonical比較する。465の200/400構造・owner/mirror row検査を再利用する外側validatorで、履歴台帳digest、試行参照、group順、rootを結合する。小さいgroup_countは合成単体検証用で、外側入口は200固定。
- `proxy_population_input_lock.py`: ローカルGitの完全commit/tree/path/blob IDとcanonical内容の一致だけを検査する。branch名、自己申告approved、timestampだけの承認を受け入れない。

算術上一致した材料はOS乱数由来の証明ではない。Git object一致はremote公開、結果観測前の固定、外部承認の証明ではない。これらは別gateとして未証明を維持する。実験driver・OS採取・実際のlock発行は未実行。ready_for_execution=false、balance_admitted=null。

## 検証・復旧

[計画](plans/2026-10-06-population-input-authentication-469.md)、[検証ログ](data/proxy-population-input-authentication-469/verification/)、[履歴台帳](data/proxy-population-input-authentication-469/historical-registry.json)。専用は履歴5・材料/結合6・Git1の計12件。RED→GREENを保存。結合test最初の不一致はtest側が既にshuffle済みの履歴順を元deckとして再shuffleしていたためで、107原順に直して再確認した。失敗logも保持する。

途中でscratch環境が置換された。468 GitHubから専用checkoutを復元し、未保存469実装は再構築・再検証した。468の全proxy1,406PASSは置換前のtool出力で確認したが、raw完了logを永続保存する前に失った。この限界と観測済集計は468の証拠へ保存済。469の検証結果と混同しない。保護正本・過去結果・別作業は変更しない。

## 残る実行準備

入力側ではOS由来の実行証跡と外部承認・remote保存・結果観測前固定の結合が残る。実行側では交代時離脱/予約/100維持等の共通処理、ルールから導いた判断機会網羅、全400行・対戦・鏡像群の算入審査が残る。これらをこのbundleだけで証明済みとしない。116旧seeded除外、指定mandatory policyだけの限定許容、戦略未証明、診断部分の非一般化、新方式未採用を維持する。

最終関連31件PASS、設計データ検査errors=[]。独立レビュー1回はCritical0/Important2/Minor2。Git置換参照の拒否、異常row/欠損ownerの拒否、外側200/400結合testを補完し全指摘を解消。レビュー後にappend-only台帳のcopyを限定して処理量を抑え、関連suiteで再確認した。既存追跡blob全件一致をREADME索引追加前に確認。npm406と全proxy1406は468の検証であり、469で重複実行していない。
