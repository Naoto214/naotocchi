# CARD GAME 独立バランス検証 2026-10-20（Claude Code）

固定400戦（Python proxy population）とは**別の、新規・独立したCPU同士の実戦検証**です。
結果と考察は [REPORT.md](REPORT.md)、集計値は `results/` にあります。

## 位置づけ

- 対象: 最新main `db9ea8e8d86c632a68ed8ab4880968803f78a243`（tree `b24d11f8af167b57bcc5da674f07bcdec6db6e1d`）のJavaScript 452枚エンジン
  （`engine.mjs` hotseat-2）と、既存CPU（`cpu-observation.mjs` + `cpu-policy.mjs` heuristic-1、初級/中級）。
- エンジン・ルール・カード定義・CPU判断・save形式・既存証跡は**一切変更していません**。このディレクトリはそれらを読み取り専用でimportするだけです。
- 固定400戦（`docs/card-game/data/proxy-population-400-*`）の予定集合・seed・manifest・停止原本・承認履歴には触れていません。
  本検証の対戦は固定400戦の「実行」でも「独立balance標本」でもなく、その代替として数えないでください。
- 自動パスは本番UIと同じ `auto-progress.mjs` の `advanceResponses`（合法手がパス1つだけの応答窓のみ）を使用。
  CPUの反復監視（1ターン512判断・同一観測3回）も `cpu-session.mjs` と同じ条件で停止扱いにします。

## ファイル

| ファイル | 内容 |
|---|---|
| `decks.mjs` | 代表7デッキ（D0標準＋6アーキタイプ）。実在カードIDのみ、`engine.validateDeck`で40枚・同名上限を検証 |
| `lib.mjs` | seed導出（sha256→uint32）、エンジンと同一のPRNG/Fisher–Yatesによる鏡像初期順の構成 |
| `make-manifest.mjs` | 実行前に予定対戦集合を固定するmanifest生成器 |
| `run.mjs` | CPU同士の対戦実行・記録（JSONL追記、shard並列、記録済みmatchはskip） |
| `aggregate.py` | 集計（CSV/JSON/Markdown） |
| `runs/*-manifest.json` | 実行前にcommit済みの予定集合（E1/E2/E3/pilot） |
| `runs/*-shard*.jsonl.gz` | 1試合1行の生記録 |
| `results/summary.json` | 実験別の集計 |
| `results/matches.csv` | 全試合の条件と結果（seed・デッキ・難易度・勝者・ラウンド・再生判定・save hash） |
| `results/card-usage.csv` | カード別の採用・ドロー・使用・発動・手札残り・使用時スコア |
| `results/tables.md` | デッキ相性表 |

## 対戦条件

- **鏡像グループ**: 1グループ＝（デッキX, デッキY, 初期順seed）。X先攻戦とY先攻戦の2試合。
  両試合で**各デッキの40枚の並び（初手5枚と山札順）は完全に同一**で、先攻・後攻だけが入れ替わります。
  エンジンは席A→Bの順に1本の乱数でシャッフルするため、`lib.mjs` で入力リストを逆算し、生成直後の手札＋山札がmanifestの順序と一致することを毎試合検査しています。
- **seed**: `sha256("naotocchi-card-balance-20261020|order|<group>")` の先頭32bitを初期順seed、
  `...|policy|<group>|<X-first/Y-first>|<A/B>` をCPU policy seed（同点tie-break用）とし、先後・席ごとに分離。
- **実験**
  - pilot: 各デッキ同士の鏡像1グループ（14戦）。環境と再現性の確認用。
  - E1: 全28組（同デッキ7＋異デッキ21）×30グループ×2＝**1680戦**、中級×中級。
  - E2: 同デッキ7組×30グループ×2×難易度入替2＝**840戦**、初級×中級。同じ初期順・policy seedで難易度だけ入替。
  - E3: 全28組×10グループ×2＝**560戦**、初級×初級。

## 再現方法

```sh
cd prototypes/card-game/balance-verification-20261020
# manifest（commit済みのものとbyte一致することを確認できる）
node make-manifest.mjs E1-int-int 30 intermediate intermediate all > /tmp/E1.json && cmp /tmp/E1.json runs/E1-manifest.json
node make-manifest.mjs E2-beg-vs-int 30 beginner intermediate mirror-swap > /tmp/E2.json && cmp /tmp/E2.json runs/E2-manifest.json
node make-manifest.mjs E3-beg-beg 10 beginner beginner all > /tmp/E3.json && cmp /tmp/E3.json runs/E3-manifest.json
# 実行（4並列の例。出力先に既存行があればそのmatchはskip）
for k in 0 1 2 3; do node run.mjs runs/E1-manifest.json /tmp/E1-shard$k.jsonl $k 4 & done; wait
# 集計（runs/*.jsonl.gz を読む）
python3 aggregate.py
# 再現性チェック（再実行した記録が保存記録と elapsedMs 以外完全一致するか）
python3 verify-reproduction.py /tmp/E1-shard0.jsonl
```

Node v22.22.0 / Python 3.13 で実行。1試合あたり約1秒（CPU1コア）。
