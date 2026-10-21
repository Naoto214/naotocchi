# 167 盤上能力response IDの一般契約

[167 TDD計画](plans/2026-09-25-board-ability-response-id-167.md)に沿い、ユーザーが確定した`response-activate-ability-{source_instance_id}`を[119 response契約](119-response-window-contract.md)の追加契約としてここに正本化する。119原本は120保存済みsource SHAで保護されているため変更しない。

盤上の誘発能力を現在のresponse opportunityで起動できる場合、単一source instanceに合法な起動能力が1件なら、一般stable IDを`response-activate-ability-{source_instance_id}`とする。`source_instance_id`は盤上の個体IDであり、card ID・特定copy・経路をID規則へ含めない。119の`response-pass`、138の手札quick-use用`response-use-{play|item|event}-{source_instance_id}`、通常行動の`candidate-`名前空間と分離する。同一instanceに同一機会で複数の合法な起動能力が実際に現れた場合は重複IDを発行せず停止して一般形を再検討する。対象・variantとの未到達の組合せや他の盤上能力の合法性は定義しない。

166の4機会を再監査し、01-Aは`response-activate-ability-A-015#1`と`response-pass`の2候補、01-B/02-Bはpassのみ、02-Aはpassと`response-use-item-B-033#1`。4経路の候補集合が完全となった。新decision/event/snapshot0、completed0、独立balance標本0。カード本文・数値・登録区分変更0。次はこの候補で119の選択と開始時responseを保存stateから再開する。
