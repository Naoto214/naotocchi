# CARD GAME CPU評価欠陥修正後の再検証（2026-10-20, Claude Code 第2段階）

修正前の基準結果は PR #404 の [`../balance-verification-20261020/`](../balance-verification-20261020/)（変更していません）。
本ディレクトリはCPU修正版で**同じ予定集合**を再実行した結果だけを置きます。比較と考察は [REPORT.md](REPORT.md)。

## 修正内容（CPU評価のみ）

| ファイル | 変更 |
|---|---|
| `cpu-observation.mjs` | `hints()` が空の規則 `{}` を `null` として返す（根本原因の修正）。`kind:'play'` の旧規則6種に、エンジンの解決処理（`engine.mjs` 179–188行）を既存のhint語彙で表した `legacyHint()` を追加。行動者自身の公開viewだけを使い、効果が何も起きない局面では `steps:[]` を返す |
| `cpu-policy.mjs` | hint op `chance`（確率pで子stepsの価値を加算）を1行追加 |
| `tests/cpu-legacy-cards.test.mjs` | 新規の専用テスト6件 |
| `tests/ui-field-declaration.test.mjs` | 宣言のばらつきを確認していたassertを、山札順に依存しないことの確認へ変更（理由はREPORT §2） |

エンジン・合法手生成・状態遷移・カード定義・ルール・save形式・`POLICY_VERSION`（`heuristic-1`）は変更していません。
`POLICY_VERSION` を据え置いたのは、`CpuSession.restore` が文字列不一致の既存CPU保存を拒否するためです（保存は操作列の再生なので、変わるのは再開後のCPU判断だけです）。

## 実行条件

- 予定集合: `runs/{pilot,E1,E2,E3}-manifest.json` は修正前ディレクトリのファイルのbyte一致コピーです。sha256は以下のとおりです。
  - E1 `b08b9133…c8ac8ca`
  - E2 `2516a0d4…b95906e6`
  - E3 `dcd2aad4…bccb`
  - pilot `b61e4c3b…7dd2`
- デッキ・初期順seed・policy seed・鏡像条件・難易度は修正前と同一です。
- 実行器・集計器は修正前ディレクトリの `run.mjs` / `aggregate.py` / `verify-reproduction.py` を無変更のまま使います（cwdをこのディレクトリにして実行）。
- 比較: `compare.py` が修正前と修正後の `results/summary.json` と `card-usage.csv` を読みます。

```sh
cd prototypes/card-game/balance-verification-20261020-cpufix
for E in E1 E2 E3; do for k in 0 1 2 3; do node ../balance-verification-20261020/run.mjs runs/$E-manifest.json runs/$E-shard$k.jsonl $k 4 & done; wait; done
gzip -n -9 runs/*.jsonl
python3 ../balance-verification-20261020/aggregate.py   # → results/
python3 compare.py                                      # → results/comparison.json, comparison.md
```
