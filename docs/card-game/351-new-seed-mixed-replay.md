# 351 新seed混合4経路の再生

[351計画](plans/2026-09-29-new-seed-mixed-replay-351.md)。[350選択](350-new-seed-mixed-choice.md)を[348保存state](data/proxy-new-seed-mixed-replay-348-20260928.json)へ適用し、[351保存state](data/proxy-new-seed-mixed-replay-351-20260929.json)に各event/snapshotと前後game/continuation hashを保存した。

01-Aは連鎖相手Bの2回目passによりE-first-dateの解決待ちへ移行。カードはまだ起動域にあり、そだち+5とドローは未適用。01-Bは配置後2回目passで通常行動入口へ。02-A/Bは通常passでターン終了前response入口へ。4経路でdecision/event/snapshot各4、completed0、独立balance標本0。

次は01-AのE-first-date効果解決契約、01-B通常行動候補、02-A/Bターン終了前response候補を監査する。全proxy回帰とCI成功は未確認。
