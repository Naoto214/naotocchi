# 156 新seed4経路の通常行動候補監査

[156 TDD計画](plans/2026-09-25-new-seed-normal-audit-156.md)に従い、155の3経路と148から保留した02-Aの保存済みraw SHA、canonical再生成、state/hashを検証した。4経路の現在通常行動候補を12条件で再列挙し、すべて候補集合が完全であると証明した。過去の停止証拠やカード本文は変更していない。

| 経路 | 現在候補 |
|---|---|
| probe-01-a-first | Cなかま配置、Mたんじょう、pass |
| probe-01-b-first | Cなかま配置2、pass |
| probe-02-b-first | Pこいびと配置2、pass |
| probe-02-a-first | pass |

02-Aの盤上P-anglerfishは74本文「自分のメインが自分からちょうせんする時」「しんかい」の条件成立時にだけ使える能力であり、06/119のresponse候補family `triggered_ability`へ一意に分類した。134の一般`response_triggered`区分と同様、現在の通常行動では`timing_not_normal_action`として除外し、通常行動用IDを発行しない。盤上こいびと位置のsource検査はこの監査範囲で行い、未到達の条件成立時response解決へは先行していない。

新decision/event/snapshot各0、completed0、独立balance標本0。カード本文・数値・登録区分変更0件。専用2件PASS、保存JSON一致、設計データerrors空。全proxyは実行中で結果未確定。次は既存107/114/116の現在意思決定を証明してから行動を再開する。
