# 420 — shadowのfresh候補再検査

415 Task4を実装した。全予定110局面（27/27/28/28）を境界hashで復元し、717 eventと721 snapshotの連続性、137→138 seq2 handover、241除外／242採用を再照合した。原本rawと412観測・410保護manifestのrawもfresh照合する。保存scoreだけで不足する場合は、境界が一致する保存監査と既存141/147/229の本文検査付き関数を使用した。旧選択・mode・理由・seedの再計算は110/110一致。

新方式の比較可能93、unsupported17、比較可能93内の選択差56、116 frontier fallback88。93局面は既存候補器を再列挙し12検査を再計算、対象付き候補集合が保存traceと一致する。17局面は歴史的scopeと今回のfresh adapterの候補集合が異なるため保留する。過去の候補や保存結果を修正せず、予定母数110へ残す。既存adapterのscope差を新方式の方針効果へ計上しない。

419の初回checkpointは限定観測のまま保持し、420結果を別directory `data/proxy-resource-value-pilot/shadow-420/` へ保存する。419の数字を確定比較へ合算しない。新規対戦/event/decision0、独立balance標本0。114正本化なし、414仕様・原本505 JSON・既存結果・112 fixtureの変更なし。

専用9/9 PASS。seed証明再計算・全110旧互換性・fresh候補再列挙のRED→GREENを新たに保存した。比較器14＋wrapper8＋inputs7＋shadow9＝新規38テストは専用combinedログを参照する。AST数ではなく実行結果を記録する。

実装判断：141の旧scoreはinstance ID、116 certificateはphysical copy IDを使用していた。旧scoreはそのまま旧比較器へ渡し、新版のcopy欄は同じ可視手札のphysical copy IDへ結合する。根拠不整合を見逃すための例外ではなく、既存の異なる識別子の意味を保持する。単独passの歴史的reasonも、元の汎用比較列と唯一行動専用分岐の違いを維持する。

次はTask5の同一初期入力8軌跡。paired結果・評価・全proxy・最後の独立レビューは未完了。新方式の勝敗や最適性はまだ評価できない。
