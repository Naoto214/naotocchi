# 267 新seed混合response適用

[267計画](plans/2026-09-27-new-seed-mixed-replay-267.md)。266選択と264保存state/hashを照合し、01-A・02-Aの終了response-pass、01-Bの配置後response-pass、02-Bの手札`I-c_coin2`時1起動を各1event適用した。01-A・02-Aはターン終了入口、01-Bは次優先者response、02-Bはコイン連鎖の相手response入口。ラッキーコインは手札から起動域へ移し、山札上の公開・効果解決は保留する。

[生成JSON](data/proxy-new-seed-mixed-replay-267-20260926.json)。新decision/event/snapshot各4、game/continuationの前後hashを照合。completed0、独立balance標本0、カード本文・数値・登録区分変更0。専用テスト・canonical bytes検証後、次の現在局面を横断監査する。全proxy回帰とCI成功は未確認。
