# 287 新seed混合局面再生計画

1. 286選択、285監査、284保存state/hashのraw/canonicalと候補境界を照合する。
2. 01-A/01-Bの2回目response-pass、02-A/02-Bの選択済み通常passを既存遷移へ適用する。
3. 4件のevent/snapshotと前後game/continuation hashを独立検査し、次の入口を保存する。
4. RED→GREEN、専用テスト、canonical JSON、GitHub保存後のHEAD/treeとPR状態を確認する。
