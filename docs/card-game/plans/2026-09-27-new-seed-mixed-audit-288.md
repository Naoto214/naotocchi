# 288 新seed混合局面横断監査計画

1. 287保存state/event/hashのraw/canonicalと4経路境界を照合する。
2. 01-A/01-Bの通常行動候補、02-A/02-Bのターン終了前response候補を手札・盤上源別に完全監査する。
3. 候補ID、適法性・除外根拠、12段階の通常候補完全性を保存する。
4. RED→GREEN、専用テスト、canonical JSON、GitHub保存後のHEAD/treeとPR状態を確認する。
