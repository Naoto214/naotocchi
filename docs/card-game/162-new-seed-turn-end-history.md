# 162 新seed4経路のターン終了履歴出所

[162 TDD計画](plans/2026-09-25-new-seed-turn-end-history-162.md)に従い、135〜161の既存保存原本を経路ごとに再接続し、現在のターン終了入口までのevent seq、game/continuation hashと成長推移を証明した。監査だけを行い、新eventはない。

| 経路 | 最終成長A/B | 履歴の特徴 |
|---|---|---|
| probe-01-a-first | 20/20 | 2回のターンを経て終了入口 |
| probe-01-b-first | 20/20 | 2回のターンを経て終了入口 |
| probe-02-a-first | 25/20 | 142 G-hit-blow一致+5を保持 |
| probe-02-b-first | 20/20 | 155 itemとG-hit-blow不一致で成長0 |

全経路で予約・未解決誘発、現在の期限付き効果、100到達は0。最終state/hashが161と一致し、原本raw SHA、canonical bytesと改ざん検出の専用2テストを確認した。completed0、独立balance標本0、カード本文・数値・登録区分変更0。次は123/124のターン終了6段階を現在4状態に適用する。固定158スナップショットでの全proxy回帰は継続中。
