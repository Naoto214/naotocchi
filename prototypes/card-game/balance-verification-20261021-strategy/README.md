# CARD GAME CPU戦略改善と3,080戦再検証（第3段階, Claude Code）

積み重ね: PR #404（修正前基準）→ PR #406（旧規則6種の評価修正）→ **本ブランチ**（`claude/card-cpu-strategy-20261021`, base = PR #406 のブランチ）。
比較対象は PR #406 の [`../balance-verification-20261020-cpufix/`](../balance-verification-20261020-cpufix/) で、そのディレクトリは変更していません。考察は [REPORT.md](REPORT.md) にあります。

## 変更（CPU評価のみ）

| ファイル | 内容 |
|---|---|
| `cpu-policy.mjs` | ①時の機会費用 `timeOpportunity()`、②山札情報による探索価値 `searchValue()`、③自分の捨て札からの回収を対象カードの価値で評価、④`if(targetPresent)` を確実扱い |
| `cpu-observation.mjs` | 自分の残り山札の多重集合 `deck`（順序なし）、探索stepの静的filter/max、filter照合による `hit`、`targetZone`、手札の応答カード `reactive` |
| `tests/cpu-strategy.test.mjs` | 新規の専用テスト7件 |

エンジン・合法手生成・状態遷移・カード定義・ルール・勝利条件・save形式・`POLICY_VERSION` は変更していません。

## 実行条件

- 予定集合 `runs/{pilot,E1,E2,E3}-manifest.json` は PR #404/#406 とbyte一致です（sha256: E1 `b08b9133…`, E2 `2516a0d4…`, E3 `dcd2aad4…`, pilot `b61e4c3b…`）。
- デッキ・初期順seed・policy seed・鏡像条件・難易度も同一です。
- 実行器・集計器は `../balance-verification-20261020/` のものを無変更で使います。
- `diag.mjs` は判断単位の診断器です（読み取り専用）。応答窓とターン終了の分類と、カード別の候補スコアを記録します。

```sh
cd prototypes/card-game/balance-verification-20261021-strategy
# 診断（PR #406版と本版で同じ標本を比較: E1の1/12）
node diag.mjs runs/E1-manifest.json diag/<name>.json 0 12
# 本実行
for E in E1 E2 E3; do for k in 0 1 2 3; do node ../balance-verification-20261020/run.mjs runs/$E-manifest.json runs/$E-shard$k.jsonl $k 4 & done; wait; done
gzip -n -9 runs/*.jsonl && python3 ../balance-verification-20261020/aggregate.py && python3 compare.py
```

pilot: 14戦を2回実行して一致しました。層別pilot（E1〜E3の1/12、257戦）は全完走・異常0・再生一致で、PR #406との比較は `diag/sample-pilot-vs-pr406.txt` にあります。
