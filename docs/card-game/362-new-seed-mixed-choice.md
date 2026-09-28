# 362 新seed混合4経路の選択

[362計画](plans/2026-09-29-new-seed-mixed-choice-362.md)。[361監査](361-new-seed-mixed-audit.md)と[360保存state](data/proxy-new-seed-mixed-replay-360-20260929.json)のraw SHA256・正準JSON・経路境界を照合し、[選択JSON](data/proxy-new-seed-mixed-choice-362-20260929.json)に適用前の決定を保存した。

01-Aの配置後response、02-A/Bの開始時responseは各唯一の`response-pass`。01-Bは必須たまご交換10候補から既存116のseeded fallbackで`A-030`を選択した。

新event0、completed0、独立balance標本0。次は4件を適用しevent/snapshotと前後hashを検証する。全proxy回帰とCI成功は未確認。
