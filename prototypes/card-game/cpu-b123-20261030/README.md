# CARD GAME CPU判断の独立比較 — B1 能力値選択・B2 最終ターン・B3 しかけ（2026-10-30, Claude Code）

基準 main `851cf09a`。PR #489 の調査（`0ac54ccd`）を読み取り専用で引き継いだ実験です。**正式CPU（`cpu-policy.mjs` `cpu-observation.mjs`）・エンジン・ルール・452枚・正式7デッキ・保存形式・戦績・画像・固定400戦の証拠は変更していません。** 実験用のCPUはこのフォルダの `lib/` だけにあり、ゲーム本体からは読み込まれません。

結論は [REPORT.md](REPORT.md) にあります。

## ファイル
| パス | 内容 |
|---|---|
| `PLAN.md` | 実験計画（実行前に固定）と、実行中の変更記録 |
| `REPORT.md` | 総合報告（完了報告の1〜12） |
| `INTEGRATION.md` | PR #488・#489・#491 の照合、名前の対応（本人方針B-2＝本実験B4）、B-1とB-2の関係、重複を避けた追補計画 |
| `FOLLOWUP.md` | 追加比較 E4（B4）・E14（B1＋B4）の報告：固定局面（かくとうバトル2枚・時1）、95%区間、不自然な見送りの解消率、代表局面、第一推奨 |
| `COMPATIBILITY.md` | 保存互換性と、正式採用時の影響範囲・版の提案 |
| `DECKS.md` | CPUデッキの検討（ミサイルコマンドのデッキ相性、比較候補 D0〜D2。正式デッキは変更しない） |
| `lib/policy-exp.mjs` | 正式方針の複製に B1/B2/B3 のスイッチを足したもの。全スイッチ無効で正式CPUと同じ選択 |
| `lib/observe-exp.mjs` | 正式観測の結果に、公開情報のヒント（`variantCond`・`horizon`・`oppUsable`・`trapHint`）を足すアダプタ |
| `lib/arms.mjs` | 比較条件 base／E1／E1b／E2／E2b／E3、追加の E4／E14、計測の再生 baseM／E1M |
| `lib/ref488-counterfactual.mjs` | PR #488 の `counterfactual.mjs` の読み取り専用の複製（B4 の同一性検査だけに使用） |
| `tests/b14.test.mjs` / `tools/fixed-b14.mjs` | 固定局面「相手の勝負中・かくとうバトル2枚・時1」の B1／B4／B1＋B4 比較 |
| `tools/b4-identity.mjs` → `results/b4-identity.json` | B4 と #488 strictlyBetter の同一性（3,477/3,477） |
| `tools/run-followup.sh`, `tools/analyze_followup.py` → `results/followup-*.{json,md}` | 追加比較の実行と集計 |
| `tests/b1.test.mjs` | B1のRED/GREEN（`CPU_IMPL=official` で正式CPUに対して実行するとRED） |
| `tests/b23.test.mjs` | B2・B3 の直接テスト |
| `tests/fixtures*.json` | テスト局面（正式の保存テキスト：seed＋デッキ＋操作列。`engine.restore` で厳密に復元） |
| `tools/exp-run.mjs` | 比較ランナー（公式エンジン＋自動パス、CPUだけ実験コピー） |
| `tools/run-all.sh` | 全条件を4並列で実行 |
| `tools/equivalence.mjs` → `results/equivalence.json` | base と PR #489 の正式CPUの記録の同一性（896/896） |
| `tools/analyze.py` → `results/summary.json`, `results/tables.md` | 比較表 |
| `tools/find-fixtures*.mjs` | テスト局面の抽出 |
| `tools/first-diff.mjs` | 2条件で最初に分かれた判断の表示（B1の回帰の原因調査に使用） |
| `runs/` | manifest（PR #489 から複製、sha256 `f50fc71a…`）と各条件の記録（`*.jsonl.gz`） |
| `results/E1-v0/` | B1の最初の版の E1（回帰を見つけた記録、REPORT 第1節） |
| `results/tests/` | テストのログ（REDとGREEN） |

## 再現
`prototypes/card-game/cpu-b123-20261030/` で実行します。

```sh
node --test tests/b1.test.mjs tests/b23.test.mjs          # GREEN
CPU_IMPL=official node --test tests/b1.test.mjs            # RED（正式CPU）
./tools/run-all.sh                                         # 4,928戦。runs/*.jsonl に出力（再開可）。4並列で約2.5時間
python3 tools/analyze.py
node tools/equivalence.mjs <PR489の T-shard*.jsonl.gz のフォルダ> runs/base-shard*.jsonl.gz
```

- 保存済みの記録は gzip 済みです。`run-all.sh` を再実行すると、未圧縮の `.jsonl` を新しく作ります（`.gz` は再開の対象として読みません）。
- PR #489 の記録は `git show origin/claude/naotocchi-time-reaction-audit-x8rev0:prototypes/card-game/time-reaction-audit-20261030/runs/T-shardK.jsonl.gz` で取り出せます。
