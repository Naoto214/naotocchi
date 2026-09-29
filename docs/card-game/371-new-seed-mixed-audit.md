# 371 新seed混合4経路の次局面監査

[371計画](plans/2026-09-29-new-seed-mixed-audit-371.md)。[370保存state](data/proxy-new-seed-mixed-replay-370-20260929.json)のraw SHA256 `60d17436aa5f9ab6165a427fffd32ac33230dde6247ae59468f53bbb50446656`を照合し、[監査JSON](data/proxy-new-seed-mixed-audit-371-20260929.json)に4経路を記録した。監査JSONのraw SHA256は`cc7e815a2ee7359fa0c311e5ce940f0028ae818b4801f040cb5f5c9753b85b85`。

| 経路 | 次局面 | 候補・証拠 |
| --- | --- | --- |
| 01-A | turn_end | 337の終了証拠から370までのevent/snapshot・hash・成長を接続。354のE-first-date解決は対象A-017#1、そだち+5と照合。六段階の終了集合が完全、stop codeなし |
| 01-B | turn_start連鎖中のresponse | B優先、唯一`response-pass`。E-first-dateは起動域で未解決 |
| 02-A/B | 終了前response | B優先、それぞれ唯一`response-pass` |

新event0、completed0、独立balance標本0。01-Aの効果検証は既存カード本文・354保存eventの照合であり、新裁定ではない。次は3件のpassと01-Aの必須終了を選択する。全proxy回帰とCI成功は未確認。
