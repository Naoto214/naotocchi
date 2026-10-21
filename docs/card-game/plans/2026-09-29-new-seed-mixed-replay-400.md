# 400 新seed横断監査・選択・再生計画

399のremote保存stateとraw SHA256を照合し、4経路の合法候補、盤上と手札の除外理由、選択契約107・114・116の適用順序を監査する。専用テストを先にREDとし、既存の正準契約を再利用して4経路を再生する。正準JSON、event/snapshot数、各前後game/continuation hashを検証して保存する。

01-AはB通常行動の2セカイとpassを比較。01-Bは必須たまご交換10件に116 seeded fallback。02-Aと02-BはA優先の応答を監査する。02-Bの候補用投影は盤上と手札の列挙だけに限り、実遷移のwindow_kind=after_normal_actionを保持する。
