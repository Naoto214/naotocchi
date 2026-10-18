# 291 新seed終了境界横断監査計画

1. 290保存state/event/hashと251・261の既存終了証明をraw/canonicalで照合する。
2. 01-A/01-Bの終了前responseを手札・盤上源別に監査する。
3. 02-Aは251、02-Bは261から290までのevent/snapshot/hash・成長履歴を接続し、既存6段階終了契約を検査する。
4. RED→GREEN、専用テスト、canonical JSON、GitHub保存後のHEAD/treeとPR状態を確認する。
