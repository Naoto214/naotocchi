# 294 新seed終了・たまご交換横断監査計画

1. 293保存state/event/hashと268・276の終了証明をraw/canonicalで照合する。
2. 01-Aは268から、01-Bは276から293までのevent/snapshot/hash・成長履歴を接続し、既存6段階終了契約を検査する。
3. 02-A/02-BのB側必須たまご交換を全手札・seeded fallback契約で完全監査する。
4. RED→GREEN、専用テスト、canonical JSON、GitHub保存後のHEAD/treeとPR状態を確認する。
