# 恋人18種類「♥ 結婚したら」VERSION 5：本人限定試遊版（2026-11-04・未承認）

- 試遊版 V5（本人のみ閲覧可）：https://claude.ai/artifact/Ttxw56rothNvss3vVYxtGW（V4：https://claude.ai/artifact/HDJZ8ekM7a3F7LTuGfTZHT はそのまま）
- 報告：[REPORT.md](REPORT.md)／正式公開時の説明文の差分案：[RULEBOOK-DIFF.md](RULEBOOK-DIFF.md)
- V4（`../lover-marriage-v4-20261104/`）を写して作りました。V4 のファイルは変更していません。
- **正式カード・ルール・エンジン・CPU・保存形式・main・本番 Pages は変更していません。**

| 作業 | コマンド |
|---|---|
| テスト | `node --test prototypes/card-game/lover-marriage-v5-20261104/tests/v5-abilities.test.mjs` |
| 対戦の組み立て | `node sim/run.mjs build <dir> [腕,...]` |
| 対戦の計画 | `node sim/run.mjs plan <plan.json> "<spec>"` |
| 対戦の実行 | `node sim/run.mjs run <plan.json> <out.jsonl> <shard> <shards> <dir>` |
| 集計 | `python3 sim/analyze.py <V4 results> <V5 final>`、`python3 sim/compare.py ...` |
| 試遊版 | `ESBUILD=<esbuild> node trial/build-trial.mjs <リポジトリ外の出力先> [--artifact]` |
| ブラウザ確認 | `TRIAL_URL=... SHOTS=trial/evidence node trial/qa-trial.cjs` |
