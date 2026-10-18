# 147 新seedの3通常行動を独立再開

146保存JSON raw SHA `d21dff526e1c699ee8fb3ccb2717355421c8a0d2bdccc78e37ba42d6869213da` の完全候補と145停止state/hashを再証明した。01-Aは唯一のpass、01-BはM-antlion-01の時1たんじょうの即時そだち0とpassの時残量を107/114で比較してpass。02-Aは時0こいびと配置3候補を116のseed付き安全配置で解決し、`A-016#1`（P-anglerfish）を選択。条件付き能力が配置時に発動したと扱わない。

| 経路 | source seq→147 seq | 判断・event | 新しい停止地点 |
| --- | ---: | --- | --- |
| `probe-01-a-first` | 7→8 | 一意pass／通常pass終了申請 | 終了response候補未証明 |
| `probe-01-b-first` | 7→8 | 確定時収支でpass／通常pass終了申請 | 同上 |
| `probe-02-a-first` | 6→7 | 116 seeded fallbackで時0こいびと配置 | 配置後response候補未証明 |
| `probe-02-b-first` | 6→6 | 追加判断なし | ターン終了履歴provenance未証明 |

新decision3／event3／snapshot3、completed0、独立balance標本0。02-AはR1の交換・responseにもseeded fallback履歴を持つためbalance標本へ算入しない。カード本文・数値・登録区分変更0件。保存原本のraw SHA、最初のevent before hash、連番、game/continuation hash連鎖、snapshotと最終正準bytesを独立再生成で照合する。

## 検証

専用2件RED→GREEN、保存JSON再生成一致（raw SHA `a61cde34884118abf5abf399cbc54e724970c981c87508802aec3b9662b3b0f8`）、設計データ`errors=[]`。全proxy43ファイル・436件中435件PASS、FAIL1件、ERROR0件。唯一のFAILは既知117旧テストの期待190・実測263で、新規失敗0件。全件GREENとは扱わない。146以前の保護対象を変更せず`git diff --check`を通過した。
