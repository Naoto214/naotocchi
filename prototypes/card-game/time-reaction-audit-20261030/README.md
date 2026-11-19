# CARD GAME 調査 —「時」の使い方・相手ターンの反応・すぐつかう／しかける（2026-10-30, Claude Code）

基準 main `851cf09a`。**資料と読み取り専用の分析コードだけ**を追加しています。正式ルール・452枚のカード・時の管理・発動／連鎖処理・CPU初級／中級の正式実装・保存形式・戦績・カード画像・固定400戦の証拠・他のPRは変更していません。

結論は [REPORT.md](REPORT.md)、改善案は [PROPOSALS.md](PROPOSALS.md)、代表局面は [positions/REPRESENTATIVE.md](positions/REPRESENTATIVE.md)、計画は [PLAN.md](PLAN.md)。

## ファイル

| パス | 内容 |
|---|---|
| `PLAN.md` | 調査計画、正本とエンジンの照合表 |
| `REPORT.md` | 総合報告（完了報告の1〜12） |
| `PROPOSALS.md` | 改善案 A／B／C の比較（効果・リスク・テスト・デッキへの影響） |
| `positions/REPRESENTATIVE.md` | 代表局面 R1〜R8（自然／固定を区別） |
| `tools/existing.py` → `results/existing-summary.json` | 既存の対戦記録（V1・V2・X、計3,000戦）の再集計。再実行なし |
| `tools/make-manifest.mjs` → `runs/T-manifest.json` | 追加対戦896戦の条件（実行前に固定、sha256 `f50fc71a…`） |
| `tools/audit-run.mjs` → `runs/T-shard*.jsonl.gz` | 計測付きの読み取り専用ランナー（公式エンジン・CPU観測・CPU方針・自動パスをそのまま使用） |
| `tools/analyze.py` → `results/summary.json`, `results/tables.md`, `results/samples.json.gz` | 集計表と見送り・時不足・ターン終了時の標本 |
| `tools/probe.mjs` → `results/positions.json` | 固定局面 P1〜P5（難易度・時を変えた比較） |
| `tools/probe-defense.mjs` → `results/positions-defense.json` | 相手のちょうせん中の防御反応（候補ごとに比較まで進めた結果） |
| `tools/probe-final.mjs` → `results/positions-final.json` | 最終ターン（R10）の終了時に残したカードを使った場合と、使わなかった場合の比較 |
| `tools/probe-variant.mjs` → `results/variant-check.json` | 能力値を選ぶ反応の種目一致の集計（3分割の出力を結合） |

## 再現

リポジトリの `prototypes/card-game/time-reaction-audit-20261030/` で実行します。

```sh
python3 tools/existing.py > results/existing-summary.json
node tools/make-manifest.mjs > runs/T-manifest.json          # 既存の manifest とバイト一致
for k in 0 1 2 3; do node tools/audit-run.mjs runs/T-manifest.json runs/T-shard$k.jsonl $k 4 2> runs/T-shard$k.log & done; wait
python3 tools/analyze.py
node tools/probe.mjs runs/T-manifest.json results/positions.json
node tools/probe-defense.mjs runs/T-manifest.json results/positions-defense.json 30
node tools/probe-final.mjs runs/T-manifest.json results/positions-final.json 60
for k in 0 1 2; do node tools/probe-variant.mjs runs/T-manifest.json results/variant-shard$k.json $k 3 & done; wait
```

- 決定性：記録済みの5試合を再実行し、保存のsha256と計測値が完全に一致することを確認済み。
- 既存のCPUテスト `node --test tests/cpu*.test.mjs` は49/49 PASS（正式コードは無変更）。
- 所要時間：4並列で、追加対戦が約20分、固定局面が各5〜15分。

## 計測の定義

- **相手ターンの発動機会**：相手のターン中に自分へ優先権が来た応答ウィンドウ（合法手がパスだけの自動パスを含む）。
- **使用可能／時不足／条件不成立**：手札の「すぐつかう」カードを、実際に合法／時を99にした複製でだけ合法／どちらでも不可、に分ける。
- **失効**：次の自分ターン開始で時がラウンド値に設定し直される直前に残っていた時。各席の最後のターンの残りは「終局時残り」として別に集計。
