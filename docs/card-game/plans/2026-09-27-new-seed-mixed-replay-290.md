# 290 新seed混合局面再生計画

1. 289選択、288監査、287保存state/hashのraw/canonicalを照合する。
2. 01-A/01-Bの通常pass、02-A/02-Bの終了前response-passを既存遷移へ適用する。
3. 4件のevent/snapshotと前後game/continuation hash、次局面を検査する。
4. RED→GREEN、専用テスト、canonical JSON、GitHub保存後のHEAD/treeとPR状態を確認する。
