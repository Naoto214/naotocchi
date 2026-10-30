# 「時」の使い方・相手ターンの反応・すぐつかう／しかけるの調査（2026-10-30）

現行ルール（時の再設定・残り時の保持・すぐつかう／しかける）を維持したまま、正式CPU（`heuristic-1`、初級・中級）がその駆け引きを使えているかを測った調査です。**正式カード・ルール・エンジン・CPU・保存形式・戦績・画像・固定400戦の証拠は変更していません。** 結論と改善案は [REPORT.md](REPORT.md)、実行前の計画は [PLAN.md](PLAN.md)。

## 要点

- 中級は相手ターンに価値のある「すぐつかう」をほぼすべて使う（78回中74回、見送り4回は同名2枚の相殺）。初級は相手ターンに反応しない（設計どおり）。
- 時は約半分が次の開始時に未使用で失われる（R6以降65〜82%）。中級では「使える札を持ったまま失った」例は0で、使い道がない構造による。
- 問題：P-1 同価値候補の相殺でパスと同点（中級の15.6%の席）、P-2 スキージャンプ・かくとうバトルのモードを比べる能力値で選ばない（スキージャンプ発動の46%が逆、22%で比較結果が変わる）、P-3 しかけの評価が一律（ミサイルコマンド発動0）。
- 第一推奨：B-1（モード選択の修正）。実験では得点率0.542（0.481〜0.602）。正式採用は本人判断。

## ファイル

| ファイル | 内容 |
|---|---|
| `PLAN.md` | 実行前に固定した計画 |
| `REPORT.md` | 総合報告書（結果・代表局面・改善案A/B/C・第一推奨・本人判断事項） |
| `lib/run.mjs` | 計測付きの対戦再生（正式ランナーと同じ判断・同じ保存hash。状態の複製だけを読む） |
| `lib/counterfactual.mjs` | 時の機会費用の反実仮想（記録のみ。既定値で正式関数と全決定一致） |
| `lib/make-manifest.mjs`・`runs/TR-manifest.json` | 追加560戦（7デッキ鏡像×10群×先後×難易度4通り）の計画 |
| `lib/run-all.sh` | X再生（`../deck-balance-20261025/runs/X-manifest.json`）とTRの実行 |
| `lib/candidate-policy.mjs`・`lib/ab-*.mjs`・`runs/AB*-manifest.json` | **実験のみ**：改善候補（正式 `chooseCpuAction()` の写しを1か所だけ変更）と正式中級の対戦 |
| `lib/variant-audit.mjs` | スキージャンプ・かくとうバトルのモード選択の自然対戦監査 |
| `scenarios/fixed.mjs` | 固定局面（17局面×200 seed） |
| `scenarios/scenes.mjs` | 自然対戦の代表局面の再生・記録 |
| `analyze_existing.py` | 既存記録（V1・V2・X）の集計（再実行なし） |
| `analyze.py`・`analyze_ab.py`・`make_tables.py` | 集計と報告書用の表 |
| `runs/*.jsonl.gz` | 対戦記録（X 480・TR 560・AB 1,120・AB2 240） |
| `results/` | `summary.json`・`tables.md`・`existing-records.json`・`reproduction-X.json`・`fixed-scenarios.json`・`representative-scenes.json`・`variant-audit.json`・`ab-summary.json` |

## 再現

```sh
cd prototypes/card-game/time-reaction-study-20261030
node lib/make-manifest.mjs | cmp - runs/TR-manifest.json
sh lib/run-all.sh && gzip -9 runs/X-shard*.jsonl runs/TR-shard*.jsonl
for E in AB AB2; do for k in 0 1 2 3; do node lib/ab-run.mjs runs/$E-manifest.json runs/$E-shard$k.jsonl $k 4 & done; wait; done
node scenarios/fixed.mjs > results/fixed-scenarios.json
node scenarios/scenes.mjs > results/representative-scenes.json
node lib/variant-audit.mjs > results/variant-audit.json
python3 analyze_existing.py && python3 analyze.py && python3 analyze_ab.py && python3 make_tables.py > results/tables.md
```

対戦はすべて決定的です（seedは `../balance-verification-20261020/lib.mjs` の `deriveSeed`、固定400戦とは無関係）。
