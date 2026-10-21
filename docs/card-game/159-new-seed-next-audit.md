# 159 新seed次機会の横断監査

[159 TDD計画](plans/2026-09-25-new-seed-next-audit-159.md)に従い、158保存JSONをraw SHA・canonical再生成・state/hashで再検証した。現在の3通常行動と1ターン終了入口を監査した。過去保存済みstate/hashとカード本文は変更していない。

| 経路 | 現在機会 | 合法候補 |
|---|---|---|
| probe-01-a-first | 通常行動 | M-antlionたんじょう、pass |
| probe-01-b-first | 通常行動 | passのみ |
| probe-02-b-first | 通常行動 | passのみ |
| probe-02-a-first | ターン終了入口 | 履歴出所の再構築待ち |

02-Bの盤上P-cliff_goatは74本文の「名前の異なるセカイへ変更した時」に発動可能な能力で、06/119のresponse_triggered区分に属する。現在の通常行動では`timing_not_normal_action`として除外し、通常行動用IDは発行しない。盤上こいびと位置だけを監査対象とし、セカイ変更時の未到達response処理には先行しない。

新decision/event/snapshot各0、completed0、独立balance標本0。専用2件PASS、保存JSON一致、設計データerrors空、カード本文・数値・登録区分変更0件。全proxyは固定158保存HEADの別作業領域で実行中で結果未確定。
