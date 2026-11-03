# 恋人の別れペナルティ再検証（2026-10-29）

A（現行：別れ−10・離婚−10）、B（結婚前の別れ−5）、C（新カード「円満な別れ」で救済）を、**実際に別れが起きる対戦**で比べた調査です。正式カード・ルール・エンジン・CPU・保存形式は変更していません。考察と推奨は [REPORT.md](REPORT.md) にあります。

**本人の判断（2026-10-29）：A 案（現行−10維持）を正式採用。B 案は不採用、C・C2 案（円満な別れ）は現時点で追加しない、「浮気」は将来候補。** 記録は [DECISION.md](DECISION.md)。

| ファイル | 内容 |
|---|---|
| `DECISION.md` | 本人の採用判断（A 案）、結果の要約、実験条件と限界 |
| `PLAN.md` | 実行前に固定した実験計画（§7 は F2 の追加計画） |
| `REPORT.md` | 総合報告書（比較結果・既存カードへの影響・分かりやすさ・推奨・本人の判断事項） |
| `COMPATIBILITY.md` | 保存互換性と影響範囲（設計案のみ） |
| `UWAKI.md` | 「浮気」の差別化調査（将来候補・比較対象外） |
| `lib/build-variants.mjs` | 正式モジュールを `build/<案>/` へ写し、案ごとの差分だけを当てる（git管理外。実験時の main `953b9c34` から `git show` で写す。作業ツリーの正式ファイルのsha256を前後で照合） |
| `lib/decks.mjs` | 実験用デッキ（公式CPUデッキからの明示的な入れ替えだけ） |
| `lib/make-manifest.mjs` | 対戦計画の生成（全案で共通seed・先後入替） |
| `lib/run.mjs`・`lib/run-all.sh` | 隔離環境での CPU 対戦と記録（円満な別れ・段階指定・注入・悪用検証の実験用規則を含む） |
| `lib/check-equivalence.py` | A の写しと正式エンジンの一致確認 |
| `scenarios/rules.test.mjs` | 固定局面テスト（`node --test scenarios/rules.test.mjs`） |
| `analyze.py`・`analyze_extra.py` | 集計 |
| `runs/` | 計画（`*-manifest.json`）と対戦記録（`*.jsonl.gz`）。N1・N2・F・F2・P、計2,960戦 |
| `results/` | `summary.json`・`extra.json`（全指標）、`equivalence-N1.json`、`reproduction-N1-BC.json`、`build-manifest.json` |

試作カード「円満な別れ」（検証用・正式採用ではない）：できごと・すぐつかう・時1。「自分の交際中のこいびと1枚を対象として発動できる。対象を持ち主の手札に戻す。この効果で別れる場合、そだち−10を受けない。」
