# 297 新seedたまご交換・開始時response横断監査計画

1. 296保存state/event/hashのraw/canonicalと4経路境界を照合する。
2. 01-A/01-BのR5たまご交換を全手札と116のseeded fallback契約で完全監査する。
3. 02-A/02-BのB側開始時responseを手札・盤上・準備域別に監査し、C-cat_friendの源領域を確認する。
4. RED→GREEN、専用テスト、canonical JSON、GitHub保存後のHEAD/treeとPR状態を確認する。
