# 388 新seed混合4経路の候補・選択・再生

[388計画](plans/2026-09-29-new-seed-mixed-replay-388.md)。[387保存state](data/proxy-new-seed-mixed-replay-387-20260929.json)のraw SHA256 `27509eee70483c9b48b7a063d546312715de2bbaa2325f50a7e3debe5235165d`を照合。[監査JSON](data/proxy-new-seed-mixed-audit-388-20260929.json)のraw SHA256 `5df3df4e83bc44c1526b02382badcf6d5d7584319844617effac4de8727f88f4`。[保存state](data/proxy-new-seed-mixed-replay-388-20260929.json)のraw SHA256 `3c3d5c70ff1b38c740a6278866e15f7d2fd8ec6b2bc0eec2fa53160901018974`。

| 経路 | 完全合法集合・選択 | 適用後 |
| --- | --- | --- |
| 01-A | Aのたまご交換10候補を116 seeded fallbackで選択 | seq113、turn_start response |
| 01-B | BのW-city、W-deepsea、pass。107/114の時残量でpassが一意 | seq116、turn_end_response |
| 02-B | AのC-chicken無料配置、W-city、pass。安全な無料配置がpassに優先し、有料配置には時残量で優先 | seq118、post_placement_response |
| 02-A | Aのたまご交換12候補を116 seeded fallbackで選択 | seq106、turn_start response |

02-Bでは盤上C-boxを能力なし、P-cliff_goatをセカイ変更条件不成立として分類した。配置したC-chickenのターン開始時能力は開始後に遡って起動せず、pending triggerは空。新decision/event/snapshot各4、completed0、独立balance標本0。専用テストRED→GREEN、監査・再生の正準JSON一致、各前後game/continuation hashを確認。過去state/hash・カード本文は非変更。全proxy回帰とCI成功は未確認。次は4経路のresponse候補を横断監査する。
