# 148 新seed現在response窓再開 TDD計画

1. 147保存JSONのraw SHA、正本再生成、各状態とevent/hashを確認する。147の保護対象は変更しない。
2. RED: 01-A/Bの終了要求後1回のresponse-pass、02-Aの配置後2回のresponse-pass、02-Bの停止維持を先にテストする。
3. 現在のpriority actorの手札、盤上、しかけ、予約、誘発、chainから完全候補を検査する。P-anglerfishは74の挑戦時かつしんかい条件と現在の配置eventを照合し、当該窓でのみ不発を証明する。119のresponse専用namespaceと122の終了bridgeを使用する。
4. GREEN: 決定・event・snapshotを各4件記録し、SHA連鎖と再生成bytesを独立検査する。turn_endへの入口までとし、その先の処理を推測しない。
5. 設計検査、全proxy検査、差分、既知117旧期待件数だけの分離を検証してGitHubへ保存する。次の監査を継続する。
