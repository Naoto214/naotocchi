# 13地域の移動とタッチ

260のホーム条件（13地域 × 住民数1・4・10・20・28体 × 幅320・375・390・430 CSS px）をタッチ対応 Chromium で開く。起動時の名簿、足元、乱数214、ボタンの状態、指の始点と終点を揃え、V9・V10のネイティブゲームに同じ操作を送る。両版とも通常の初期配置を使う。森28体のオプション配置の結果は森の試験に記載する。

## 全260条件の結果

各版3,276住民条件を300秒観測した。V9の公表値、今回同じ環境で再測定したV9、V10を示す。公表V9の基準を満たしたのは開始時のドラッグ到着・指先4 px以内・タップの3指標。通常歩行は2条件、5分後の到着は1条件少なく、双方失敗は1条件多かった。

| 指標 | 公表V9 | 再測定V9 | V10 |
| --- | ---: | ---: | ---: |
| 自分の目的への通常歩行を完了 | 3,217/3,276 | 3,215/3,276 | 3,215/3,276 |
| 開始時ドラッグ・採用終点に到着 | 911/1,058 | 911/1,058 | 911/1,058 |
| 開始時ドラッグ・指先4 CSS px以内 | 522/1,058 | 522/1,058 | 522/1,058 |
| タップで本人を選択 | 246/260 | 246/260 | 246/260 |
| 対象の自律歩行と本人へのドラッグが双方不成立 | 2/260 | 2/260 | 3/260 |
| 5分後のドラッグ・採用終点に到着 | 236/260 | 235/260 | 235/260 |

公表V9で通常歩行がなかった59住民条件のうち、V10で1条件が初めて完了し、58条件は未完了だった。公表V9で完了した3,217条件のうち、V10で新たに未完了になったのは3条件。この4条件はすべて海28体・320 px。フクロウが0→1回、ハムスターが2→0回、ウサギと多尾のキツネが各1→0回で、今回のV9とV10では4体それぞれ同じ結果だった。個別表には元の59条件と、新旧いずれかで未完了だった全住民の識別子を残した。[個体別の増減](evidence/matrix-cohort.csv)

| 地域 | 通常歩行 V9→V10（各252） | 開始時到着 V9→V10 | 指先4 px以内 V9→V10 | タップ V9→V10（各20） | 5分後到着 V9→V10（各20） |
| --- | ---: | ---: | ---: | ---: | ---: |
| ホーム | 252→252 | 65→65 | 42→42 | 17→17 | 19→19 |
| 森 | 221→221 | 69→69 | 40→40 | 19→19 | 14→13 |
| 川と湖 | 252→252 | 72→72 | 45→45 | 20→20 | 18→18 |
| 街 | 251→251 | 74→74 | 38→38 | 20→20 | 20→20 |
| 田園 | 252→252 | 62→62 | 39→39 | 20→20 | 20→20 |
| 山 | 252→252 | 75→75 | 42→42 | 18→18 | 19→19 |
| 雪 | 252→252 | 73→73 | 39→39 | 20→20 | 18→18 |
| 海 | 231→231 | 66→66 | 32→32 | 20→20 | 16→16 |
| ジャングル | 247→247 | 80→80 | 41→41 | 18→18 | 16→17 |
| 砂漠 | 251→251 | 69→69 | 40→40 | 20→20 | 18→18 |
| 深海 | 252→252 | 71→71 | 41→41 | 18→18 | 19→19 |
| 星空の停留所 | 252→252 | 69→69 | 42→42 | 18→18 | 19→19 |
| 記憶の湖 | 250→250 | 66→66 | 41→41 | 18→18 | 19→19 |

同時に走らせたV9とV10で、完了した個体の集合は3,215条件すべてで一致した。公表V9と今回のV9は、開始時の全260世帯・ゲームのスクリプト・指の座標が一致した。5分後の全員の足・画面投影は251世帯で一致し、残る9世帯の幅はいずれも320 pxだった。

方向付きの通常歩行数・距離、失敗後の最長時間、回復、退避だけの住民を地域・人数・幅単位でも集計した。[地域・人数・幅別](evidence/matrix-groups.csv)

## 同じ足元・同じ指の位置での結果

| 5分後の足元・入力 | 版 | 到着 | 別の住民を選択 | 本人を選択・未発行 | 本人に発行・経路不成立 | 本人に発行・歩行後未到着 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 各版の自然経過260件 | V9 | 235 | 5 | 0 | 18 | 2 |
| 各版の自然経過260件 | V10 | 235 | 5 | 1 | 17 | 2 |
| V9の足元260件 | V8 | 235 | 5 | 0 | 18 | 2 |
| V9の足元260件 | V9 | 235 | 5 | 0 | 18 | 2 |
| V9の足元260件 | V10 | 235 | 5 | 0 | 18 | 2 |
| 過去に成否が変わったV8の足元24件 | V8 | 14 | 1 | 0 | 9 | 0 |
| 過去に成否が変わったV8の足元24件 | V9 | 14 | 1 | 0 | 9 | 0 |
| 過去に成否が変わったV8の足元24件 | V10 | 14 | 1 | 0 | 9 | 0 |

V9の足・指を共通にした260件で、V8とV9の到着成否が異なるのは0件、V9とV10で異なるのは0件だった。260件中251件は過去の全員の足・投影座標にも完全一致。V8の変化対象24件では24件が該当した。自然経過直後と同じ版に状態を移した比較では、到着・入力・経路の分類がV9で0件、V8で0件変わった。[全世帯の対照表](evidence/matrix-shared-pairs.csv)・[未到着と本人に届かなかったケース](evidence/matrix-aged-failures.csv)

追加の双方失敗は森10体・320 pxのカワウソ。本人は選択され、両版とも5分の自律歩行開始は0回。V9では終点にクマが重なる状態で補正終点に2歩で到着し、V10ではクマとパンダが重なり経路が不成立になった。V9の同じ足と同じ指を使った試験では、3版とも到着した。

## 足元・表示・保存

V10では1,112,397歩の全区間で、境界 0、地形 0、遮蔽 0、速度 0、住民間の掃引接触 0。1,560回の描画確認で、足と絵の最大ずれは0.0134 CSS px、非表示の住民 0、影の不足 0・余分 0、リボン一致 1,560/1,560。開始時・5分後のドラッグで危険歩行 0、指を離した位置の最大ジャンプ 0.000 CSS px。V9・V10それぞれ13地域の実保存を読み直し、名簿・保存項目の一致と物理タッチを26/26件確認した。[保存の照合](evidence/matrix-restores.csv)

## 出典と再計測

13地域260条件は同一の実測コミット `fdd2b1bcf6b156de0daeb5c1ab46295c681921f1`で完了した。[13地域すべての成功ジョブ](https://github.com/Naoto214/naotocchi/actions/runs/44924416605)

[検証済みZIP・実行ID・SHA-256](evidence/matrix-receipt.json)・[集計JSON](evidence/matrix-result.json)・[全住民の記録（gzip）](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44924416605/matrix-residents.csv.gz)・[開始時操作（gzip）](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44924416605/matrix-opening-inputs.csv.gz)・[5分後操作（gzip）](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44924416605/matrix-aged-inputs.csv.gz)・[同じ足元への入力（gzip）](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44924416605/matrix-shared-inputs.csv.gz)

- [ホームの元ZIP](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44924416605/mobility-v10-44924416605-home.zip)
- [森の元ZIP](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44924416605/mobility-v10-44924416605-forest.zip)
- [川と湖の元ZIP](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44924416605/mobility-v10-44924416605-river_lake.zip)
- [街の元ZIP](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44924416605/mobility-v10-44924416605-city.zip)
- [田園の元ZIP](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44924416605/mobility-v10-44924416605-countryside.zip)
- [山の元ZIP](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44924416605/mobility-v10-44924416605-mountain.zip)
- [雪の元ZIP](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44924416605/mobility-v10-44924416605-snow.zip)
- [海の元ZIP](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44924416605/mobility-v10-44924416605-sea.zip)
- [ジャングルの元ZIP](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44924416605/mobility-v10-44924416605-jungle.zip)
- [砂漠の元ZIP](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44924416605/mobility-v10-44924416605-desert.zip)
- [深海の元ZIP](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44924416605/mobility-v10-44924416605-deepsea.zip)
- [星空の停留所の元ZIP](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44924416605/mobility-v10-44924416605-star_stop.zip)
- [記憶の湖の元ZIP](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44924416605/mobility-v10-44924416605-memory_lake.zip)

本人画面の表示を更新した `330efb1a7c91ce4b9e094e7399118c1e285a94d9` でも、ホーム20条件を独立に再計測した。3版の入口・記録したスクリプトのハッシュ、開始時の足、指の座標が一致した。V10は通常歩行252/252、開始時到着65、指先4 px以内42、タップ17/20、双方失敗0/20、5分後到着19/20で、13地域の主試験に含むホームと同じだった。5分経過時の全員の足・画面投影も一致したのはV9で19/20、V10で18/20だった。主試験の260条件はすべて `fdd2b1bc` の結果である。[独立確認の照合](evidence/matrix-home-confirmation.json)・[ホーム確認の元ZIP](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44926076361/mobility-v10-44926076361-home.zip)

## 測定方法

- **通常歩行**　自分の目的地への経路で足が実際に動き、到着時に8 CSS px以上移動し、元の目的地への距離が0.75 CSS pxを超えて縮んだ歩行を数える。退避、道譲り、経路を引いただけのものは別欄に記録する。各版3,276住民条件を個別に照合する。
- **開始時の操作**　過去の実測座標に物理タッチイベント列を再生する。実行できるドラッグは各版1,058件、タップは260件。到着はネイティブの到着イベント、または実際の歩行後に採用経路の終点で停止したことから判定する。指先への誤差4 CSS px以内は別に数える。
- **5分後の操作**　開始時操作と独立したホームで各版を300ゲーム秒進める。60秒ごとの描画と各歩行ステップを観測し、260条件すべてで過去と同じ個体にドラッグする。終了時に選ばれた個体、本人への移動命令、経路受理、実際の足運び、到着を別々に記録する。
- **同じ足元での比較**　V9で5分経った260世帯をV8・V9・V10で再現する。さらに、過去のV8とV9で到着の成否が入れ替わった24条件ではV8で5分経った世帯も3版で再現する。同じ対象に同じ画面座標で計852回のドラッグを送る。過去の全員の足と画面投影が一致する場合は保存済みの指の座標を使い、異なる場合は再現した世帯上で3版共通の座標を使う。
- **移植した状態**　全員の足、体格、移動中の経路、活動、向き、選択、時刻、乱数、クールダウン、手動要求を複製する。再開位置を移植できない探索ジェネレータと版固有の待機・失敗キャッシュを3版共通で空にする。入力受付は各ホームのネイティブ制御で有効になるまで待つ。この条件の差は独立した300秒経過後の成績と別集計にした。
- **安全と表示**　全員の実歩行について足元の地形・遮蔽、境界、速度、2体間の移動線分での接触を照合する。各サンプルで影、足と絵の位置、リボン表示を確認する。各地域の28体・390px幅で実際の保存と読み直し、その後のタッチを検証する。

## V8からV9へ変わった5分後のドラッグ

公表済みV9試験の同一実行にはV8・V9の両方がある。V8は240/260、V9は236/260に到着した。V9で新たに10件が到着し、以前着いた14件が未到着となった。

| 5分後の結果 | V8 | V9 |
| --- | ---: | ---: |
| 到着 | 240 | 236 |
| 別の住民が選ばれ、本人に命令なし | 2 | 5 |
| 本人を選択したが移動命令なし | 0 | 1 |
| 本人に命令が届き、経路が成立せず | 17 | 16 |
| 経路を受理し足も動いたが終点に未到着 | 1 | 2 |

各版の内訳で、本人に命令が届いた後の未到着は18件ずつ。V9の18件はいずれも終点に他の住民が重なり、1件は地形上も歩行不可だった。前景の住民を通り抜けて背後の個体を選択する補正や、空いていない終点への衝突許容を比較条件に加えていない。[V9の原データと判定基準](../home-mobility-v9/MATRIX.md)

V9で経路が成立しなかった16件は、全員の足と体格を当時の座標に戻し、周囲を静止させたネイティブモデルで調べた。本人に元の座標へのドラッグ要求を直接渡すと、16件すべてで最初の経路探索が不成立だった。指へ近づく直線を0.5度ごとに720方向、2〜12 CSS pxを1 px刻みで調べた。14件で接触・地形・遮蔽・画面内の条件を満たす候補がなく、残る2件の安全な候補はいずれも2 pxだった。指との距離が縮んだのは海20体・320 pxで1.994 px、ジャングル28体・430 pxで0.008 px。回り道や、他の住民が後で移動して開く経路はこの静止時の直線探索の対象外である。手動経路の規則はV9を維持した。[16件の探索結果](evidence/matrix-v9-manual-rays.json)

海10体・320 pxでは、過去のV9記録でクマの選択とドラッグ表示まで進んだが、移動命令は記録されなかった。今回、同じ足元・同じ指の座標ではV8・V9・V10すべてが本人への命令を発行した。指を離した瞬間は3版とも入力可能で、押した時と同じ住民・同じナビゲーションだった。その後の到着は3版とも未達。過去の1件で命令が発行されなかった時点の内部の分岐は、保存されたログだけでは特定できない。

## 最初に検証したV10

隣の住民の最後の退路を塞ぐ直前に本人の歩行を切り上げる版で、公表V9の6指標をすべて満たした。通常歩行3,217/3,276、初期ドラッグ911/1,058、4 px以内522/1,058、タップ246/260、双方失敗2/260、5分後の到着241/260。同時に再測定したV9の5分後到着235件からは、11件が新たに到着し、5件が未到着に変わった。公表V9で歩けなかった59条件のうち21条件が回復し、以前歩けていた21条件は未完了になった。全1,112,117歩で地形・遮蔽・境界・速度・掃引接触違反は0件だった。過去に到着成否が変わった24条件は、V8で育った足とV9で育った足の両方を当時と同じ画面座標で再現できた。48件すべてで元の到着・本人選択・経路分類を再現し、同じ状態に置いた3版の結果もすべて一致した。[48件を含む同じ足元の対照表](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44921996444/matrix-shared-pairs.csv)

当初ホームの5番目の条件で入力対照の一致判定が停止し、完全な結果は4条件分だけだった。再計測の20条件で入力座標・足・尺度が全て一致し、再試行は発生しなかった。残り12地域は最初の成功ジョブを使い、13地域すべてで同一のゲーム入口とネイティブスクリプトのSHA-256を照合した。[第一版の集計](evidence/matrix-first-result.json)・[地域別の受領記録](evidence/matrix-first-receipt.json)・[除外した4条件の元ZIP](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/matrix/44921996444/mobility-v10-44921996444-home-partial.zip)

## 再計測コマンド

同じ配布物をローカルで配信し、各地域を独立して実行する。 `--counts 28 --widths 390` を指定すると1条件の確認になる。全体の集計には260条件とGitHubが記録した元ZIPのダイジェストが必要になる。

```bash
python -B comparisons/home-mobility-v10/matrix_worker_v10.py \
  --url http://127.0.0.1:8462 --region forest --out "$EVIDENCE/forest"
python -B comparisons/home-mobility-v10/matrix_report_v10.py \
  --run 44924416605 --archives "$V10_ARCHIVES" --v9-archives "$V9_ARCHIVES" \
  --out "$SUMMARY" --private-data "$PRIVATE_DATA"
```

V8からV9で到着が変わった操作の一覧は固定入力CSV、経路不成立16件の静止時の追加検証は `matrix_routes_v10.py` で再現できる。[地域別ワークフロー](../../.github/workflows/home-mobility-v10-matrix.yml)・[過去の5分後入力](matrix-aged-history.csv)・[追加の経路検証](matrix_routes_v10.py)
