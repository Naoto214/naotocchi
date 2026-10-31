# 10ラウンド／12ラウンド比較実験・物理版「時カウンター」検討（2026-10-30〜31）

現行の正式ルール（10ラウンド固定）と、ラウンド数と時の設定値だけを12へ延ばした案を、実際のエンジンと正式CPUで比べた調査です。
**正式ルール・カード452枚・エンジン・CPU・保存形式・既存の証拠（固定400戦など）は変更していません。** mainへのマージ・Pages公開は行いません。

**本人の判断（2026-10-31）：10ラウンド＝100歳を維持。12ラウンドへの変更・別モード追加は保留。**

- **12ラウンド・そだち120・120維持の総合比較（A〜D、heuristic-2、計5,992戦）：[REPORT-G120.md](REPORT-G120.md)**（計画 [PLAN-G120.md](PLAN-G120.md)、維持勝利の仕様 [HOLD-SPEC.md](HOLD-SPEC.md)、本編との整合 [MAINGAME.md](MAINGAME.md)）。最終推奨：**現行A（10R・100）維持**
- 結论と全指標：[REPORT.md](REPORT.md)（第一推奨：**10ラウンド維持**）
- 追加の限定比較（⑧到達・すれちがいによる別れ・離婚、2,640戦）：[FOLLOWUP.md](FOLLOWUP.md)・計画 [PLAN-EXTRA.md](PLAN-EXTRA.md)（最終推奨：**10ラウンド維持**）
- 実行前に固定した計画：[PLAN.md](PLAN.md)
- 10ラウンド前提の箇所の洗い出し：[DEPENDENCIES.md](DEPENDENCIES.md)
- 正式CPUデッキに⑧が無い理由と⑧採用の比較（追加2,100戦）：[EIGHT.md](EIGHT.md)
- 100歳設定との整合性：[AGE.md](AGE.md)
- 物理版の時カウンター（別評価）：[COUNTER.md](COUNTER.md)

| ファイル | 内容 |
|---|---|
| `lib/build-variants.mjs` | main `851cf09a` の正式モジュールを `git show` で `build/<変種>/` へ写し、変種ごとの差分だけを当てる（git管理外）。前後で作業ツリーの正式ファイルのsha256を照合 |
| `lib/make-manifest.mjs` | 対戦計画（7デッキ28組×seed×先後、全変種で共通seed） |
| `lib/run.mjs`・`lib/run-all.sh` | 隔離環境での CPU 対戦と記録（CPUの判断には一切介入しない） |
| `lib/check-equivalence.py` | R10 の写しと正式エンジンの保存sha一致 |
| `analyze.py`・`analyze_extra.py` | 集計（対応のあるブートストラップCI） |
| `lib/build-g120.mjs`・`lib/make-manifest-g120.mjs`・`analyze_g120.py` | A〜D（12R・そだち120）の隔離ビルド（main 7c1f18c7・heuristic-2）・対戦計画・集計 |
| `lib/decks-extra.mjs`・`lib/make-manifest-extra.mjs`・`analyze_followup.py`・`analyze_eight.py` | 追加比較の実験用デッキ（⑧・すれちがい・対照）・対戦計画・集計 |
| `runs/` | 計画（`*-manifest.json`）と対戦記録（`*.jsonl.gz`）。pilot 168（＋不具合発見時の pilot-v1 168）、MAIN 3,360、SENS 560、EQ 168、追加：pilotX 88、E8 1,680、EL 960、⑧調査：C8 1,260・C8b 840（10Rのみ） |
| `results/` | `summary.json`・`extra.json`・`equivalence.json`・`build-manifest.json`・`followup.json`・`eight.json`・`g120.json`・`g120-build-manifest.json` |

## 再現
```sh
cd prototypes/card-game/round12-comparison-20261030
node lib/build-variants.mjs                 # build/R10, build/R12, build/R12h
sh lib/run-all.sh MAIN SENS EQ              # 4並列・再開可能（約45分）
python3 lib/check-equivalence.py runs/EQ-shard*.jsonl.gz runs/MAIN-shard*.jsonl.gz
python3 analyze.py runs/MAIN-shard*.jsonl.gz runs/SENS-shard*.jsonl.gz > results/summary.json
python3 analyze_extra.py runs/MAIN-shard*.jsonl.gz runs/SENS-shard*.jsonl.gz > results/extra.json
sh lib/run-all.sh E8 EL                     # 追加比較（約30分）
python3 analyze_followup.py > results/followup.json
sh lib/run-all.sh C8 C8b                    # ⑧調査の対照（約25分）
python3 analyze_eight.py > results/eight.json
node lib/build-g120.mjs                     # build/G-*（build-variants.mjs の後に実行）
sh lib/run-all.sh gpilot G120 G120S G120EQ G120E8   # A〜D（約80分）
python3 analyze_g120.py > results/g120.json
```
seed は `balance-verification-20261020/lib.mjs` の `deriveSeed`（ラベル `R12C:MAIN:<X>:<Y>:<nnn>`）から決まり、同じ計画なら保存sha256まで再現します。
