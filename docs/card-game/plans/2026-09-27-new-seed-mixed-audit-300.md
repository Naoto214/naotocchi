# 300 新seed開始時response横断監査計画

1. 299保存state/event/hashのraw/canonical・4経路境界を照合する。
2. 手札・盤上・準備域別に開始時response候補を監査する。
3. 01-AのC-chicken盤上能力の一般stable ID・起動条件を確認し、他の源と除外理由を保存する。
4. RED→GREEN、専用テスト、canonical JSON、GitHub保存後のHEAD/treeとPR状態を確認する。
