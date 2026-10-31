# 10ラウンド／12ラウンド比較実験・物理版「時カウンター」検討（2026-10-30〜31）

現行の正式ルール（10ラウンド固定）と、ラウンド数と時の設定値だけを12へ延ばした案を、実際のエンジンと正式CPUで比べた調査です。
**正式ルール・カード452枚・エンジン・CPU・保存形式・既存の証拠（固定400戦など）は変更していません。** mainへのマージ・Pages公開は行いません。

- 結論と全指標：[REPORT.md](REPORT.md)（第一推奨：**10ラウンド維持**）
- 実行前に固定した計画：[PLAN.md](PLAN.md)
- 10ラウンド前提の箇所の洗い出し：[DEPENDENCIES.md](DEPENDENCIES.md)
- 100歳設定との整合性：[AGE.md](AGE.md)
- 物理版の時カウンター（別評価）：[COUNTER.md](COUNTER.md)

| ファイル | 内容 |
|---|---|
| `lib/build-variants.mjs` | main `851cf09a` の正式モジュールを `git show` で `build/<変種>/` へ写し、変種ごとの差分だけを当てる（git管理外）。前後で作業ツリーの正式ファイルのsha256を照合 |
| `lib/make-manifest.mjs` | 対戦計画（7デッキ28組×seed×先後、全変種で共通seed） |
| `lib/run.mjs`・`lib/run-all.sh` | 隔離環境での CPU 対戦と記録（CPUの判断には一切介入しない） |
| `lib/check-equivalence.py` | R10 の写しと正式エンジンの保存sha一致 |
| `analyze.py`・`analyze_extra.py` | 集計（対応のあるブートストラップCI） |
| `runs/` | 計画（`*-manifest.json`）と対戦記録（`*.jsonl.gz`）。pilot 168（＋不具合発見時の pilot-v1 168）、MAIN 3,360、SENS 560、EQ 168 |
| `results/` | `summary.json`・`extra.json`・`equivalence.json`・`build-manifest.json` |

## 再現
```sh
cd prototypes/card-game/round12-comparison-20261030
node lib/build-variants.mjs                 # build/R10, build/R12, build/R12h
sh lib/run-all.sh MAIN SENS EQ              # 4並列・再開可能（約45分）
python3 lib/check-equivalence.py runs/EQ-shard*.jsonl.gz runs/MAIN-shard*.jsonl.gz
python3 analyze.py runs/MAIN-shard*.jsonl.gz runs/SENS-shard*.jsonl.gz > results/summary.json
python3 analyze_extra.py runs/MAIN-shard*.jsonl.gz runs/SENS-shard*.jsonl.gz > results/extra.json
```
seed は `balance-verification-20261020/lib.mjs` の `deriveSeed`（ラベル `R12C:MAIN:<X>:<Y>:<nnn>`）から決まり、同じ計画なら保存sha256まで再現します。
