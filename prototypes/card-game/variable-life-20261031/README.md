# 人生延長カード・そだち上限解放カードによる 10／11／12 ラウンド可変制の比較実験（2026-10-31）

**通常は10ラウンド・100歳・そだち100で終わり、特定のカードで最大12ラウンド・120歳・そだち上限120まで延ばせる方式**が、現行ルールより面白いかを、実際のエンジンと正式CPU（heuristic-2）で比べた独立実験です。
本人の正式決定（10R・100歳・そだち100・100維持、PR #495 DECISION.md）を覆すものではありません。

**正式カード452枚・正式ルール・正式CPU・正式7デッキ・保存形式・固定400戦・PR #495 の資料・main・本番Pagesは変更していません。** 新カードは隔離ビルドの中だけで定義した仮カードです。mainへのマージ・Pages公開は行いません。

## 結論（REPORT.md §0）
- **第一推奨：正式ルールは現行のまま。** 可変制が現行より面白いという根拠は得られませんでした。延長ルールそのものは、接戦を −3.7〜−6.3pt 減らし、最強のアイテム・じゅんびデッキを +5〜+7pt 強くします（対照X0との差）。
- 延長は、負けている側が使っても得点率は約0.15で、**逆転の手段としては弱い**です。毎試合12Rにはなりません（A1t 4.8%・A3 0.7%）。
- 事前の判断基準を満たした最有望案は **A1t（人生延長・しかける・時2・最終ラウンドの自分のターン終了時）**。追加比較（REPORT §11）の **しかける×1枚（A1t1）** は、延長27.5%・12R 0.9%で現行との差がすべて有意差なしの、最も穏やかな方式でした。ただし延長ルールそのものは接戦を −4.0pt 減らし、引いた側がわずかに有利（+3.0pt）になります。試作を続けるなら A1t1 を人間同士の試遊にかけるのが次の一歩です。
- **そだち上限解放（共通）は、相手の100維持を止める守りのカード**として新しい駆け引きを生みます（維持の開始の21.7%を阻止）。ただし88%は使われずに終わります。

## 資料
| ファイル | 内容 |
|---|---|
| [PLAN.md](PLAN.md) | 本実行の前に固定した計画（条件・seed・試合数・指標・判断基準） |
| [PLAN-NEXT.md](PLAN-NEXT.md) | 追加比較（しかける×1枚）の計画（実行前に固定） |
| [REPORT.md](REPORT.md) | 結果と推奨（全指標・95%CI） |
| [CARDS.md](CARDS.md) | 仮カードの効果比較（コスト・分類・タイミング・枚数・使用回数・公平性・抜いた枠） |
| [RULINGS.md](RULINGS.md) | 12の論点の仮裁定と、正式ルールと矛盾する箇所 |
| [SAVE-COMPAT.md](SAVE-COMPAT.md) | 保存互換性（実験の事実と、正式採用時に必要な変更） |
| [CLOCK.md](CLOCK.md) | 時計型カウンター（12目盛り・10赤／11緑／12青・3本針）の設計検討 |

| コード・データ | 内容 |
|---|---|
| `lib/build-life.mjs` | main `7c1f18c7` の正式モジュールを `git show` で `build/<条件>/`（git管理外）へ写し、仮カード・`life` 状態・CPU補助だけを足す。前後で正式ファイルの sha256 を照合 |
| `lib/decks-life.mjs` | 実験デッキ（各デッキの同じ2枠を置き換え） |
| `lib/make-manifest-life.mjs` | 対戦計画（PR #495 と同じ seed ラベル） |
| `lib/run.mjs`・`lib/run-all.sh` | 隔離環境での CPU 対戦と記録（PR #495 の runner を複製して拡張） |
| `lib/smoke.mjs` | 動作確認（`evidence/smoke.txt`、26項目合格） |
| `lib/extract-ref.py` | PR #495 の G-A（A0）・G-D（A5）の記録を、PR #495 の commit から読み出して `ref/` へ写す（PR #495 側は無変更） |
| `analyze_life.py` | 集計（seed グループ単位のブートストラップ 95%CI） |
| `runs/` | 計画（`*-manifest.json`）と記録（`*.jsonl.gz`）：pilot 672、EQ 112、MAIN 8,960、SENS 1,680、E8 420、追加 NEXT 1,120・NEXTn1 560（計13,524戦。異常終了0、保存→復元 13,524/13,524 一致） |
| `results/` | `summary.json`（全集計）、`build-manifest.json`（ビルドの sha256） |
| `ref/` | PR #495 から再利用した A0・A5 の記録（2,240＋280戦）と出典の sha256 |

## 再現
```sh
cd prototypes/card-game/variable-life-20261031
node lib/build-life.mjs                        # build/L-*（git管理外）
node lib/smoke.mjs > evidence/smoke.txt        # 動作確認
sh lib/run-all.sh pilot EQ MAIN SENS E8        # 4並列・再開可能（約2時間）
sh lib/run-all.sh NEXT NEXTn1                  # 追加比較（約20分）
python3 lib/extract-ref.py                     # PR #495 の A0・A5（要：git fetch origin pull/495/head）
python3 analyze_life.py > results/summary.json # 約5分
```

## 本人の判断が必要な事項
REPORT.md §9 と、PR 本文の「本人が判断すべき事項」を参照してください。
