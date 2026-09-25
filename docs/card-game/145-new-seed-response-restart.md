# 145 新seedの3 response窓を独立再開

144保存JSON raw SHA `1df03987c5645ae3f3d1e13318c2a10e1abeda6e753cb76c8b7d855cd996dd7b` の完全候補監査と142保存state/hashを独立に再証明した。01-A/Bは最初の優先者と相手の双方が唯一の`response-pass`を選び、通常行動入口へ戻った。02-Bは既存のBのpassに続くAの唯一のpassで窓を閉じ、122の既存ターン終了入口へ戻った。02-Aは通常行動4候補の判断前stateを保持。

| 経路 | source seq→145 seq | 145 decision/event/snapshot | 新しい停止地点 |
| --- | ---: | ---: | --- |
| `probe-01-a-first` | 5→7 | 各2 | response後の通常行動候補の再証明 |
| `probe-01-b-first` | 5→7 | 各2 | 同上 |
| `probe-02-a-first` | 6→6 | 各0 | 解決後の通常行動選択前を保持 |
| `probe-02-b-first` | 5→6 | 各1 | R1 Bのターン終了provenanceの再証明 |

新decision5／event5／snapshot5、completed0、独立balance標本0。144の盤上除外を最初の優先機会にだけ適用し、相手の機会では現在の空盤上・時・手札から改めて候補を判定する。response窓を閉じる119遷移と、通常pass済みのターン終了入口へ接続する122の既存橋を分け、保存済み原本を変更しない。各eventの連番、game/continuation hash、snapshot、最終hashを独立再生成で照合する。カード本文・数値・登録区分変更0件。

## 検証

専用2件RED→GREEN、保存JSON再生成一致（raw SHA `724f12b4bd38dc11bb2d4d672abf5cd753fca8daa110697e4f89499f087a9a8d`）、設計データ`errors=[]`。全proxy41ファイル・432件中431件PASS、FAIL1件、ERROR0件。唯一のFAILは既知117旧テストの期待190・実測263で、新規失敗0件。全件GREENとは扱わない。144以前の保護対象を変更せず、`git diff --check`を通過した。
