# 401 4経路の連続遷移・次手番ドロー

[401計画](plans/2026-09-30-new-seed-mixed-replay-401.md)。400のremote HEAD/tree、PR #259のDraft/open/未マージをfresh確認し、remoteの400保存stateから再開した。source raw SHA256 `dd83009fca60289dac8c54a3f7e4316bd886eb326f4baf38375e6ccb790d173a`。[監査JSON](data/proxy-new-seed-mixed-audit-401-20260930.json) raw SHA256 `d295c37886cc11628677bf32d984f6f23d9b7be3927c6b236d807dbc6c16f6be`。[保存state](data/proxy-new-seed-mixed-replay-401-20260930.json) raw SHA256 `78840ee72e3ab907c79cfa74869a52e8d0d633a071850efe38da2bf59e209cdb`。

| 経路 | 再生内容 | 次局面 |
| --- | --- | --- |
| 01-A | Aの終了前唯一応答pass、六段階終了監査、終了・Aの2枚ドロー（3 event） | seq128、R8、Aのたまご交換 |
| 01-B | Bの開始時C-chicken/passを完全列挙しseeded起動。応答2回・能力解決、通常候補W-city/W-deepsea/passの107・114でpass、終了前pass・終了・Aのドロー（8 event） | seq137、R8、Aのたまご交換 |
| 02-A | Bの通常候補M-antlion-01/I-poop1/passの107・114でpass、終了前pass・終了・Aのドロー（4 event） | seq122、R8、Aのたまご交換 |
| 02-B | C-chameleonの継続分類を保持。Bの通常候補W-countryside/M-antlion-01/passの107・114でpass、終了前pass・終了・Aのドロー（4 event） | seq134、R8、Aのたまご交換 |

各中間局面の候補・除外理由・stable ID・選択・event seqを監査JSONへ保存した。通常行動主体はgame_state.turn_player、応答主体はresponse_context.priority_actor。候補用投影は列挙に限定し、実遷移のturn_start/after_normal_actionを保持する。起動中のC-chickenを再起動しない。各経路の過去の六段階終了証拠を既存event/snapshot/hash連鎖で延長し、今回の終了監査を再実施した。

到達済みのメイン/セカイなし局面に限定した[共通adapter](tools/proxy_reached_mixed_contracts_401.py)で138・142・144・188・190・196・204・229・325・381を再利用した。旧388の手札8枚限定を今回の9枚へ広げる代わりに、既存332・353のW-deepsea継続効果・時2の根拠を参照して費用比較した。ゲームルール・カード本文・数値・登録区分・過去停止証拠を変更していない。

新decision10、event/snapshot各19、completed0、独立balance標本0。専用3テストRED→GREEN、全中間・最終hash、正準JSONを確認。次のたまご交換候補も4経路で完全列挙済み。全proxy回帰とCI成功は未確認。次は402で既存選択pipelineを続行する。
