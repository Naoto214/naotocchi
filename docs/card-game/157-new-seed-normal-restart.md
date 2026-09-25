# 157 新seed4通常行動の再開

[157 TDD計画](plans/2026-09-25-new-seed-normal-restart-157.md)に従い、156の4完全候補集合をraw SHAと再生成で再検証した。107/114の一定結果比較と116の安全な時0配置・seeded fallbackを適用し、各経路の通常行動1件を独立再開した。過去保存済みstate/hashとカード本文は変更していない。

| 経路 | 選択 | 決定方法 | 最終seq／phase |
|---|---|---|---|
| probe-01-a-first | C-batを時0配置 | 安全な配置がpassを上回り、時1のM-antlionたんじょうには時残高で優先 | 15／配置後response |
| probe-01-b-first | C-chickenを時0配置 | 2つの安全配置から116 seed | 15／配置後response |
| probe-02-b-first | P-cliff_goatを時0配置 | 2つの安全配置から116 seed | 17／配置後response |
| probe-02-a-first | pass | 唯一の合法候補 | 10／ターン終了前response |

M-antlionのたんじょうは既存本文で確定即時成長0の継続能力であり、支払時1。時0のC-bat配置は時間を保持する。候補集合からM-antlionを隠さず、比較証拠をdecisionへ保存した。新decision/event/snapshot各4、completed0、独立balance標本0。全event seq、game/continuation hash連鎖、canonical bytes一致、専用2件PASS、設計データerrors空。カード本文・数値・登録区分変更0件。全proxyは実行中で結果未確定。
