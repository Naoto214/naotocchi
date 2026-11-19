# 秋の落ち葉見本の描画負荷

もり・秋の昼・晴れで、#568 の E3+ と V7 の落ち葉を比較した。正式ホームの表示を組み込んだ試遊版を Linux で実行。画面は 390 × 844 CSS px、DPR 2、速度・強度・葉の4調整は標準。各試行で同じ住民フィクスチャを読み込み、CPU 0–1 に固定した。ホストは共有 Xeon Platinum 8573C、5論理CPU・4 CPU相当のクォータ。 Chromium 156.0.8078.79（ソフトウェアCanvas、SwiftShader）と Linux WPE WebKit 26.5 を使用した。物理GPUの描画完了フレームは測定対象外。[ホストの描画構成](evidence/perf/host.json)

## 28体、実時間3分

葉の占有面積が最大の C を長時間計測した。rAF はコールバック到着頻度。住民更新はコントローラーが更新を採用した回数で、その中に追いつき用の複数のモデルステップを含む。環境描画は環境Canvas関数の実行回数。p95・最長・250 ms以上は rAF 間隔。

| 案 | 実測秒 | rAF Hz | 住民更新/秒 | 環境描画/秒 | p95 ms | 最長 ms | 250 ms以上 | 住民一時停止 秒 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| #568 E3+ | 180.0 | 48.0 | 25.0 | 7.8 | 16.8 | 1,966.6 | 14 | 7.6 |
| V7 C | 180.1 | 46.8 | 25.1 | 7.9 | 33.4 | 1,416.6 | 16 | 122.9 |

C の最長間隔 1,416.6 ms には、住民モデルの同期処理 1,409.3 ms が含まれた。#568 の最長間隔 1,966.6 ms にもモデル処理 1,162.5 ms が重なった。全期間の環境描画関数の同期最大は #568 が 6.3 ms、C が 81.2 ms。C の 81.2 ms は別の時刻に発生した。GPU完了やOSの実行待ち時間はこの同期計時では分離できない。

両試行で28体は表示された。ゲーム側の一時停止状態は #568 が7.6秒、C が122.9秒で、環境時計は178.6秒と179.6秒進んだ。実行順は #568 → C。各案1走で住民の稼働時間とホスト負荷が異なる。C は平均 rAF と p95 が悪化し、最長間隔は短縮した。この長時間試験から28体の非劣化は確定できない。C の長時間走は先行ステージで行い、その後、森の風の係数を #568 の式へ戻し、いなか限定の葉色と起点を調整した。森の標準風量での葉色・軌跡は同じ。短時間の交互切替はこれらを反映したビルド、最終左右比較は共通環境の1回描画を反映したビルドで測定した。[#568 本体3分](evidence/perf/original-28.json) ／ [C 3分](evidence/perf/c-28.json)

### 同じ28体のまま交互に切替

V7 の同一画面・同一ノードで #568 相当の表示と C を切り替え、各8秒 × 4窓を測定した。順序は 基準・C・C・基準・C・基準・基準・C。描画設定を反映して0.4秒後から計時し、住民モデルと時計は継続した。各窓の中央値と一時停止の合計を示す。

| 案 | rAF Hz（窓中央値） | 住民更新/秒 | 環境描画/秒 | 各窓のp95 中央 ms | 一時停止合計 秒 |
| --- | --- | --- | --- | --- | --- |
| E3+ | 48.2 | 25.4 | 7.8 | 33.3 | 2.5 |
| C | 48.5 | 25.3 | 8.1 | 33.3 | 0.0 |

[交互に切り替えた8窓](evidence/perf/crossover.json)

## 28体の短時間比較と初期の左右比較

V7 単独表示は C → B → A → E3+ の各10秒、#568 本体は8秒。

| 案 | rAF Hz | p95 ms | 最長 ms | 住民更新/秒 | 環境描画/秒 | 一時停止 秒 |
| --- | --- | --- | --- | --- | --- | --- |
| #568 本体 E3+ | 55.5 | 16.8 | 183.2 | 28.7 | 8.3 | 0.0 |
| E3plus | 26.3 | 99.9 | 1,999.9 | 14.5 | 5.1 | 0.0 |
| A | 53.1 | 16.8 | 383.2 | 27.4 | 8.2 | 0.0 |
| B | 55.6 | 16.8 | 183.4 | 28.5 | 8.4 | 0.0 |
| C | 50.9 | 33.3 | 433.3 | 26.8 | 8.0 | 0.0 |

中央で左右を分けた28体・各12秒の最適化前試作も測定した。#568（E3｜E3+）と V7（E3+｜B）の rAF は 54.9 → 33.3 Hz、p95 は 16.8 → 83.3 ms、最長は 233.3 → 983.4 ms。[V7 全案](evidence/perf/staged-28-short.json) ／ [#568 人数別](evidence/perf/original-short.json) ／ [#568 左右](evidence/perf/original-split.json) ／ [V7 左右](evidence/perf/staged-split.json)

### 1体・4体の単独表示

各8秒。各セルは rAF Hz / p95 ms。V7 は1体で E3+ → A → B → C、4体で逆順。

| 住民 | #568 本体 | V7 E3+ | A | B | C |
| --- | --- | --- | --- | --- | --- |
| 1 | 58.3 / 16.8 | 55.1 / 16.8 | 44.6 / 16.8 | 45.3 / 33.3 | 50.3 / 16.8 |
| 4 | 41.8 / 66.7 | 41.5 / 50.1 | 42.8 / 50.0 | 53.0 / 33.3 | 51.0 / 16.8 |

[1・4体の短時間計測](evidence/perf/staged-small.json)

## 環境 Canvas 単独

住民とUIを外し、デコード済みの原画に正式コンポジターを実行した。390 × 585 描画ピクセルで、8時刻のウォームアップ後、同じ48時刻で4案の実行順を回転・反転した。表は **命令投入 / 全画素RGBA取得まで** の中央値（ms）。実際のゲームは全画素を毎回読み取らない。WPEの計時分解能は約1 ms。

| ブラウザー | 場面 | E3+ | A | B | C |
| --- | --- | --- | --- | --- | --- |
| Chromium | もり・秋の昼 | 0.43 / 3.92 | 0.46 / 3.98 | 0.46 / 4.12 | 0.41 / 4.34 |
| Chromium | いなか・秋の夕 | 0.13 / 1.26 | 0.15 / 1.38 | 0.14 / 1.26 | 0.13 / 1.26 |
| WebKit | もり・秋の昼 | 2.00 / 8.00 | 2.00 / 7.00 | 2.00 / 7.00 | 2.00 / 7.00 |
| WebKit | いなか・秋の夕 | 1.00 / 3.00 | 0.00 / 3.00 | 1.00 / 3.00 | 1.00 / 3.00 |

[Chromium Canvas 48組](evidence/perf/chromium-canvas.json) ／ [WebKit Canvas 48組](evidence/perf/webkit-canvas.json)

### 左右比較の共通環境描画

表示境界50%、標準風量で、#568 の E3｜E3+、最適化前 V7 の E3+｜B、最終 V7 の E3+｜B を同じブラウザー・Canvas・時刻で比較した。最終版は共通の背景を1回描画し、左右で形の違う葉だけを別々にクリップする。表は同じ48時刻における命令投入 / 全画素取得までの中央値（ms）。

| ブラウザー | 場面 | #568 | V7 最適化前 | V7 最終版 |
| --- | --- | --- | --- | --- |
| Chromium | もり・秋の昼 | 0.75 / 3.89 | 0.81 / 4.01 | 0.61 / 3.73 |
| Chromium | いなか・秋の夕 | 0.26 / 1.48 | 0.29 / 1.54 | 0.23 / 1.38 |
| WebKit | もり・秋の昼 | 2.00 / 6.00 | 2.00 / 6.00 | 2.00 / 6.00 |
| WebKit | いなか・秋の夕 | 1.00 / 3.00 | 1.00 / 3.00 | 1.00 / 3.00 |

[Chromium 左右比較](evidence/perf/split-canvas.json) ／ [WebKit 左右比較](evidence/perf/split-webkit-canvas.json)

実際の28体で最終 V7 → #568 の順に各12秒再測定した。最終 V7 は rAF 41.3 Hz、p95 33.4 ms、最長 499.9 ms。#568 は 52.9 Hz、16.8 ms、283.3 ms。環境描画は 7.1 回/秒と 8.2 回/秒だった。[最終 V7 28体の左右比較](evidence/perf/final-split.json) ／ [逆順測定時の #568](evidence/perf/split-repeat-568.json)

別コンテキストの差を除くため、同一の住民28体を動かしたまま、描画時に読み込む実際の左右比較関数だけを8窓で切り替えた。#568 のモジュールでは E3｜E3+、最終 V7 では E3+｜B を実行した。各7秒 × 4窓、順序は基準・B・B・基準・B・基準・基準・B。

| 左右比較 | rAF Hz（窓中央値） | 住民更新/秒 | 環境描画/秒 | 各窓のp95 中央 ms | 一時停止合計 秒 |
| --- | --- | --- | --- | --- | --- |
| PR568 | 46.8 | 24.8 | 8.0 | 33.3 | 0.0 |
| B | 44.8 | 23.7 | 7.8 | 33.3 | 2.3 |

[左右比較関数を同じ28体で交互に実行](evidence/perf/split-crossover.json)

## Linux WebKit・28体

同じ森で、最大面積の C → E3+ の順に12秒ずつ計測した。各窓の後、住民からドラッグして目標マーカーを確認した。WPE の入力はマウスイベントを使用した。

| 案 | rAF Hz | p95 ms | 最長 ms | 住民更新/秒 | 環境描画/秒 | 入力→次rAF 中央 ms | マーカー |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C | 9.2 | 322.0 | 1,631.0 | 8.0 | 5.8 | 110.0 | 表示 |
| E3plus | 15.9 | 246.0 | 521.0 | 10.7 | 6.5 | 33.0 | 表示 |

[WPE 実ホームの計時と入力](evidence/perf/webkit-28.json)

逆順（E3+ → C）でも両方のマーカーを再確認した。rAF は 12.8 → 8.7 Hz、p95 は 173.0 → 397.0 ms、最長は 1,189.0 → 1,113.0 ms。[WPE 28体の逆順再測定](evidence/perf/webkit-repeat-28.json)

同じ森を DPR 2（780 × 1,170 描画ピクセル）で再測定した。WPE の単独環境Canvasの命令投入 / 全画素取得までの中央値（ms）は E3plus が 2.0 / 12.5、C が 3.0 / 14.0。[WPE DPR 2の環境Canvas](evidence/perf/webkit-dpr2.json)

WPE でも同じ28体のまま E3+ と C を各6秒 × 4窓で交互に切り替えた。初回・逆順の各別起動と比べ、こちらは住民と時計を引き継いでいる。

| 案 | rAF Hz（窓中央値） | 住民更新/秒 | 環境描画/秒 | 各窓のp95 中央 ms | 一時停止合計 秒 |
| --- | --- | --- | --- | --- | --- |
| E3plus | 18.0 | 12.0 | 6.9 | 169.0 | 0.0 |
| C | 17.8 | 11.5 | 6.5 | 192.5 | 2.6 |

[WPE 同じ28体での交互試験](evidence/perf/webkit-crossover.json)

初期選択の B も、WPE の同じ28体で各4秒 × 4窓交互に実測した。左右境界を外した単独表示。

| 案 | rAF Hz（窓中央値） | 住民更新/秒 | 環境描画/秒 | 各窓のp95 中央 ms | 一時停止合計 秒 |
| --- | --- | --- | --- | --- | --- |
| E3plus | 18.0 | 11.7 | 7.0 | 214.5 | 0.0 |
| B | 19.5 | 13.2 | 7.0 | 208.0 | 0.0 |

[WPE Bの28体交互試験](evidence/perf/webkit-b-crossover.json)

同じ WPE・DPR 2 で B と E3+ も48時刻測定した。全画素取得までの中央値は E3+ 12.0 ms、B 12.0 ms。[WPE DPR 2・Bと基準](evidence/perf/webkit-b-dpr2.json)

## 動きを減らす設定と落ち葉ゼロ

「動きを減らす」を有効にし、28体・各5秒で計測した。E3plus は環境描画 0.0 回/秒、rAF 44.6 Hz、B は環境描画 0.0 回/秒、rAF 51.4 Hz。環境時計の進行は両案とも0、28体の位置と環境Canvas全体の画素が計測前後で一致した。[軽減設定中の計時](evidence/perf/reduced.json)

落ち葉数0では、森の昼といなかの夕で A・B・C × 3時刻の全18組が、数を100%にして葉の描画命令だけをスキップした同時刻の画素に一致した。全組で素の原画とも、数100%で葉を描いた状態とも異なった。[0枚時の全画素比較](evidence/perf/zero-leaves.json)

28体の B に対し、試験側で document の可視状態を hidden に設定して visibilitychange を発火すると、1.25秒間の住民更新・環境描画回数と環境時計は固定され、visible に戻すと再開した。実機をバックグラウンドに移す操作は未計測。[可視状態ハンドラーの試験](evidence/perf/visibility.json)

## 計測範囲と再現

実機 iPhone Safari の表示フレーム、電力、温度、指入力遅延は未計測。GPU・OS・ブラウザーのスケジューリングにより rAF は変動する。試験用の同期計時は Playwright のレスポンス差替えで挿入した。配布物にタイマーを追加していない。

比較ビルドを HTTP で起動し、Python と Playwright を用意して次のコマンドを実行する。既定の対象は `http://127.0.0.1:8197`。#568 本体は `--url` で対象を指定する。Chromium のパスは `CHROMIUM_PATH`、WebKit は `WEBKIT_PATH` で指定できる。

```sh
python verify_perf.py load --counts 28 --modes E3plus C --seconds 180 --warmup 3 --out long.json
python verify_crossover.py --mode C --seconds 8 --out crossover.json
python verify_crossover.py --engine webkit --mode C --seconds 6 --out webkit-crossover.json
python verify_crossover.py --engine webkit --mode B --seconds 4 --out webkit-b.json
python verify_crossover.py --mode B --split-reference http://127.0.0.1:8196 --seconds 7 --out split-crossover.json
python verify_perf.py load --counts 28 --modes B --split --seconds 12 --warmup 3 --out split.json
python verify_perf.py touch --engine webkit --counts 28 --modes C E3plus --seconds 12 --warmup 3 --out webkit.json
python verify_perf.py load --counts 28 --modes E3plus B --reduced --seconds 5 --out reduced.json
python verify_paint_cost.py --out canvas.json
python verify_paint_cost.py --engine webkit --out canvas-webkit.json
python verify_zero_leaves.py --out zero.json
python verify_visibility.py --out visibility.json
python verify_paint_cost.py --split --build pr568 http://127.0.0.1:8196 E3plus --build final http://127.0.0.1:8197 B --out split-cost.json
```
