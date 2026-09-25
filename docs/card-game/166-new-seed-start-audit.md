# 166 新seed次手番開始response横断監査

[166 TDD計画](plans/2026-09-25-new-seed-start-audit-166.md)に従い、165の4保存state/hashから手札と盤上の現在候補を別々に監査した。新decision/event/snapshotは0、過去原本は非変更。

| 経路 | 手札合法候補 | 盤上の現在候補 | 完全性 |
|---|---|---|---|
| probe-01-a-first | response-pass | C-chicken発動可、ID未確定 | ID決定待ち |
| probe-01-b-first | response-pass | C-batは相手ターンのquick-use未成立 | 完全 |
| probe-02-b-first | response-pass | なし | 完全 |
| probe-02-a-first | response-pass、I-c_coin2すぐつかう | なし | 完全 |

E-final-timeはR2・メインなし、G-archery-3dは自分のセカイなし、E-fateful-transformはメインなし、G-asteroids-classicは準備枠対象なしで除外。時不足の候補は138既存列挙へ戻した。C-chickenは164以前から盤上にあり、自分のターン開始時に72の任意誘発条件を満たす。公開山札上は発動後の解決まで参照しない。

119は`triggered_ability` familyと`response-pass`を正本化し、138は`response-use-{play|item|event}-{source_instance_id}`を手札quick-use用として確定済み。しかし盤上能力のresponse用stable ID形式は定義されていない。例えば`response-activate-ability-{source_instance_id}`と`response-use-ability-{source_instance_id}`がどちらも命名上は可能で、正本のみから一意に選べない。特定カード／copy専用処理を避けるため、01-AはID発行・選択・発動前で真正停止する。他3経路は今回の監査で候補完全。独立balance標本0、カード本文・数値・登録区分変更0。固定158全proxy458件では457 PASS／既知117旧テスト1 FAIL／ERROR0。166 HEADの全proxy回帰は未実施。

## 判断後の実装範囲

responseの既存名前空間内で、対象なし盤上`triggered_ability`単一source個体のstable IDを一般形式として決める。推奨は発動操作を明示する`response-activate-ability-{source_instance_id}`。候補IDを追加した上で現在の開始時C-chickenを列挙・比較し、選ばれた場合だけ公開山札上1枚を解決する。今回未到達のvariant＋targetや他能力・複数対象へは拡張しない。01-A保存state/hashから再開する。ほか3経路も保存stateから独立して進められる。
