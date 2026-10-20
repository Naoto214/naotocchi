# CARD GAME CPU 第4段階：ちょうせん判断・難易度差・CPU戦略デッキ（2026-10-22, Claude Code）

積み重ね: main ← #404 ← #406 ← #407 ← **本ブランチ**（`claude/card-cpu-variety-20261021`、base = #407 のブランチ）。
過去の結果ディレクトリ（`../balance-verification-20261020*/`、`../balance-verification-20261021-strategy/`）は変更しません。考察は [REPORT.md](REPORT.md) にあります。
**統合の引き継ぎ（PR依存・競合・Pages allowlist・回帰テスト・残る実機QA）は [HANDOFF-ASTRA.md](HANDOFF-ASTRA.md) にあります。CPUの追加チューニングは、本人のiPhone試遊まで停止しています。**

## 変更

| ファイル | 内容 |
|---|---|
| `cpu-policy.mjs` | 難易度プロファイル `PROFILES`、ちょうせんの期待値評価 `challengeValue()`、相手の応答確率の推定（公開枚数のみ）、検証用の `profile` 上書き |
| `cpu-observation.mjs` | 自分の補正手段 `challengeKit`（自分の手札・自分の伏せ札・自分の場の誘発）と、相手の公開枚数（伏せ札数・手札数・残り時） |
| `cpu-decks.mjs`（新規） | CPU戦略デッキ7種、おまかせのseed選択 `pickCpuDeck()`、`resolveCpuDeck()`（おまかせ／指定／固定／マイデッキ） |
| `cpu-session.mjs` | CPUデッキ情報を保存へ追加（任意項目。旧保存も読込可）。復帰時に実際の40枚と一致するか検証し、デッキ名は対戦終了後だけ表示 |
| `app.mjs` / `index.html` / `my-decks-ui.mjs` / `ui-presentation.mjs` / `style.css` | 開始画面の「CPUのデッキ」選択、結果パネルへのCPUデッキ名表示、戦略デッキ使用時は自分の席だけマイデッキを検証 |
| `tests/cpu-variety.test.mjs`（新規） | 専用テスト6件 |

エンジン・合法手・カード効果・数値・勝利条件・ルール・`POLICY_VERSION` は変更していません。

## 実行条件（manifestは実行前にcommit）

| manifest | 内容 | 目的 |
|---|---|---|
| `runs/E1〜E3`（#404〜#407とbyte一致） | 旧7デッキ、旧seed | CPU判断変更の効果だけを測る（デッキ固定） |
| `runs/V1-manifest.json`（sha256 `8d659566…`） | 新CPUデッキ7種の総当たり28組×30群×先後2＝1,680戦、中級×中級 | デッキ間の強さ |
| `runs/V2-manifest.json`（sha256 `bfe9504a…`） | 新CPUデッキの同デッキ鏡像7組×30群×先後2×難易度入替＝840戦、初級×中級 | 初級と中級の差（デッキの強さと分離） |
| `h2h/h2h.mjs` | E1全試合×席入替で、新CPU 対 PR #407 CPU（`h2h/pr407-*.mjs` は25c1519の復元） | 判断品質の直接比較 |

- `tuning/` にはデッキ調整（総当たり3回）と機能ablationの記録・原本があります。
- `ui/` には iPhoneサイズ（390×844、タッチ）のブラウザ確認 `ui-check.cjs` と、その結果・画面写真があります。

```sh
cd prototypes/card-game/balance-verification-20261022-variety
for E in E1 E2 E3 V1 V2; do for k in 0 1 2 3; do node ../balance-verification-20261020/run.mjs runs/$E-manifest.json runs/$E-shard$k.jsonl $k 4 & done; wait; done
for k in 0 1 2 3; do node h2h/h2h.mjs runs/E1-manifest.json h2h/h2h-E1-shard$k.jsonl $k 4 & done; wait
NODE_PATH=$(npm root -g) node ui/ui-check.cjs ui
```
