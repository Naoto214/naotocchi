# 13地域の公平性・指操作の検証

V7・V8・V9の各版で260条件・3,276人分、同じ指座標によるドラッグ1,058回・タップ260回を検証した。実測コミットは `e309a299de5593b0f3fa06ebde768058f08749f5`。地域内の3版は同じChromiumを使い、各版のゲームスクリプトと開始画面のハッシュは全地域で一致した。[地域別の公式測定](https://github.com/Naoto214/naotocchi/actions/runs/44903860732)

本人限定の集計データでは、修正後の全住民の歩行、開幕時の指座標と到着、5分後のドラッグを個別に確認できる。地域別の表からは、修正後と初回の生データを取得できる。[住民ごとの歩行（CSV.gz）](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44903860732/matrix-residents.csv.gz) · [初期の指操作（CSV.gz）](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44903860732/matrix-opening-inputs.csv.gz) · [5分後のドラッグ（CSV.gz）](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44903860732/matrix-aged-inputs.csv.gz)

## 全地域での指操作

| 案 | 経路終点 / 1,058 | 指先4px / 1,058 | 本人タップ / 260 | 双方失敗 / 260 |
|---|---:|---:|---:|---:|
| 過去のV7 | 910 | 521 | 246 | 3 |
| 過去のV8 | 909 | 520 | 246 | 2 |
| V7再測定 | 911 | 522 | 246 | 3 |
| V8再測定 | 910 | 521 | 246 | 2 |
| V9再測定 | 911 | 522 | 246 | 2 |

版を変えずにV8を再測定した際、前回値から選択・発行・移動・到着のいずれかが変わった操作は3件。V7公表時のV7と今回のV7を対応付けた際は1件だった。過去のゲーム本体、保存済み指座標、開始配置・乱数が一致した上での実行間差を、同時に計測したV8→V9の変化と区別した。V8→V9では経路終点の新規到着1件・喪失0件、4px以内の新規到着1件・喪失0件。[同一版の過去からの変動](evidence/matrix-historical-changes.csv) ／ [同時期の操作別比較](evidence/matrix-paired-changes.csv)

両版で本人に指示を発行できた1025回では、終点到着はV8が910、V9が910件。4px以内はそれぞれ521、521件。初期入力と独立して、過去または同じ実行内で選択が変わった条件をローカルで再測定した。24回中24回で実際に選ばれた住民が、その指先で原画が不透明な最前面の住民と一致した。公式1,058件のドラッグは当時の原画画素を保存していない。[追加押下試験の原画画素と選択](evidence/matrix-press.json)

V8→V9で増えた1件は、ゆきぐに28体・320pxの空き地ドラッグで、狙った主人公への指示がV9で発行されて到着したもの。本人を選んで発行した操作の経路処理には増減がなかった。同じ操作のV7・V8・V9の勝敗は前回の実行と逆転している。公表V8の再測定でも、いなか20体・28体（320px）の2件はサルから主人公に選択が変わり、ゆきぐに28体（320px）の1件は主人公からカメレオンに変わった。同じ開始条件の表でも、この数件は描画時点の指先と原画の重なりに左右される。

## 300モデル秒の生活と操作

| 指標 | V7 | V8 | V9 |
|---|---:|---:|---:|
| 自律要求機会があった住民 / 3,276 | 3,274 | 3,274 | 3,274 |
| 自律歩行を開始した住民 / 3,276 | 3,202 | 3,247 | 3,264 |
| 自律の通常経路終点についた住民 / 3,276 | 3,169 | 3,183 | 3,241 |
| 8px以上の目的に沿う通常歩行を完了した住民 / 3,276 | 3,082 | 3,088 | 3,217 |
| 上記の通常歩行の合計回数 | 24,433 | 24,646 | 27,542 |
| 退避完了だけの住民 | 32 | 64 | 23 |
| 終了時に経路失敗から60秒以上実ステップなし | 376 | 148 | 87 |
| 終了時に経路失敗から60秒以上通常完了なし | 667 | 587 | 293 |
| 経路不成立から実ステップまでの最長秒数（開いたままの失敗を含む） | 298.95 | 298.55 | 297.85 |
| 終了時点までの失敗からの復帰回数 | 4,679 | 4,991 | 6,331 |
| 実ステップの自律総距離（CSS px） | 2,141,962.59 | 2,152,621.18 | 2,165,272.08 |
| 5分後の指定住民のドラッグ到着 / 260 | 241 | 240 | 236 |
| 他の住民が占有する目標へのドラッグ到着 / 208 | 144 | 144 | 144 |
| 成立 / 計画を判定した回数（%） | 39,615 / 52,031（76.1%） | 42,301 / 54,768（77.2%） | 44,540 / 56,144（79.3%） |

V9で通常歩行を完了しなかった59人分の内訳は、自律要求なし2、要求があっても経路成立なし10、経路が成立して実歩行での到着なし0、退避のみの到着23、通常経路に到着したが変位・目標への進捗条件に届かず24。最長の失敗は forest・10体・320px の companion:otter で、34回要求、0回成立、実際に次の自律ステップを踏まずに297.85秒が経過した。

要求がなかった2件は、いずれも恋人のクマ（ジャングル20体・320px、さばく28体・320px）。自律要求が一度も出なかった住民はV7、V8、V9で各2人分だった。

自律生活後のドラッグ終点到着はV8の240件からV9の236件へ下がった。V9で新規に到着した対象は10件、到着しなくなった対象は14件。このうち両版で本人に指示を発行できた範囲では新規9・喪失10件。各版で住民が歩いた後の足元と周囲の占有は実際に異なる。自律・ドラッグ双方が失敗した2件はV8・V9とも森20体・390px/430pxの恋人のクマ。[5分後の対象者・実ステップ・双方失敗](evidence/matrix-aged-targets.csv)

## 地域別の成績

各地域の分母は住民252人分・20世帯。通常歩行は8 CSS px以上の定義を用いる。住民名と長短・距離、経路成立率、失敗時間、復帰・道譲り回数は、地域名のリンクからダウンロードできる。

| 地域 | 通常歩行 V7→V8→V9 | 成立/判定 V9 | 指終点 V8→V9 / 全ドラッグ | 4px以内 V8→V9 | 本人タップ V8→V9 / 20 | 双方失敗 V8→V9 / 20 | 地域の生データ（ZIP） |
|---|---:|---:|---:|---:|---:|---:|---|
| [おうち](evidence/matrix-residents-home.csv) | 250→252→252 | 3139/3401 | 65→65/75 | 42→42 | 17→17 | 0→0 | [修正後](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44903860732/mobility-v9-44903860732-home.zip) · [初回](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44901881496/mobility-v9-44901881496-home.zip) |
| [もり](evidence/matrix-residents-forest.csv) | 155→164→221 | 2266/4709 | 69→69/96 | 40→40 | 19→19 | 2→2 | [修正後](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44903860732/mobility-v9-44903860732-forest.zip) · [初回](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44901881496/mobility-v9-44901881496-forest.zip) |
| [みずべ](evidence/matrix-residents-river_lake.csv) | 246→247→252 | 3749/4597 | 72→72/86 | 45→45 | 20→20 | 0→0 | [修正後](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44903860732/mobility-v9-44903860732-river_lake.zip) · [初回](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44901881496/mobility-v9-44901881496-river_lake.zip) |
| [とかい](evidence/matrix-residents-city.csv) | 238→239→251 | 3523/4561 | 74→74/85 | 38→38 | 20→20 | 0→0 | [修正後](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44903860732/mobility-v9-44903860732-city.zip) · [初回](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44901881496/mobility-v9-44901881496-city.zip) |
| [いなか](evidence/matrix-residents-countryside.csv) | 248→248→252 | 3681/4340 | 62→62/86 | 39→39 | 20→20 | 0→0 | [修正後](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44903860732/mobility-v9-44903860732-countryside.zip) · [初回](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44901881496/mobility-v9-44901881496-countryside.zip) |
| [やま](evidence/matrix-residents-mountain.csv) | 251→249→252 | 3636/4255 | 75→75/81 | 42→42 | 18→18 | 0→0 | [修正後](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44903860732/mobility-v9-44903860732-mountain.zip) · [初回](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44901881496/mobility-v9-44901881496-mountain.zip) |
| [ゆきぐに](evidence/matrix-residents-snow.csv) | 247→249→252 | 3647/4355 | 72→73/76 | 38→39 | 20→20 | 0→0 | [修正後](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44903860732/mobility-v9-44903860732-snow.zip) · [初回](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44901881496/mobility-v9-44901881496-snow.zip) |
| [うみ](evidence/matrix-residents-sea.csv) | 220→219→233 | 3054/4535 | 66→66/78 | 32→32 | 20→20 | 0→0 | [修正後](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44903860732/mobility-v9-44903860732-sea.zip) · [初回](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44901881496/mobility-v9-44901881496-sea.zip) |
| [ジャングル](evidence/matrix-residents-jungle.csv) | 231→230→247 | 3389/4473 | 80→80/91 | 41→41 | 18→18 | 0→0 | [修正後](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44903860732/mobility-v9-44903860732-jungle.zip) · [初回](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44901881496/mobility-v9-44901881496-jungle.zip) |
| [さばく](evidence/matrix-residents-desert.csv) | 248→248→251 | 3669/4188 | 69→69/75 | 40→40 | 20→20 | 0→0 | [修正後](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44903860732/mobility-v9-44903860732-desert.zip) · [初回](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44901881496/mobility-v9-44901881496-desert.zip) |
| [しんかい](evidence/matrix-residents-deepsea.csv) | 250→251→252 | 3513/4089 | 71→71/79 | 41→41 | 18→18 | 0→0 | [修正後](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44903860732/mobility-v9-44903860732-deepsea.zip) · [初回](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44901881496/mobility-v9-44901881496-deepsea.zip) |
| [ほしぞらのていりゅうじょ](evidence/matrix-residents-star_stop.csv) | 247→245→252 | 3583/4185 | 69→69/75 | 42→42 | 18→18 | 0→0 | [修正後](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44903860732/mobility-v9-44903860732-star_stop.zip) · [初回](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44901881496/mobility-v9-44901881496-star_stop.zip) |
| [きおくのみずうみ](evidence/matrix-residents-memory_lake.csv) | 251→247→250 | 3691/4456 | 66→66/75 | 41→41 | 18→18 | 0→0 | [修正後](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44903860732/mobility-v9-44903860732-memory_lake.zip) · [初回](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v9/matrix/44901881496/mobility-v9-44901881496-memory_lake.zip) |

同じ初期条件の住民を対応付けると、V8→V9で通常歩行が成立するようになったのは142人分、今回成立しなくなったのは13人分だった。各地域の集計が同じでも住民が入れ替わる場合がある。[条件・住民別の増減](evidence/matrix-normal-walker-changes.csv) ／ [幅別・人数別の集計](evidence/matrix-groups.csv)

### 森28体、従来の初期配置の300モデル秒

| 幅 | 通常歩行を完了した人数 | タヌキ完了回数 | パンダ完了回数 | 箱完了回数 |
|---|---:|---:|---:|---:|
| 320px | 17/28 | 1 | 0 | 1 |
| 375px | 24/28 | 0 | 3 | 2 |
| 390px | 28/28 | 4 | 1 | 5 |
| 430px | 28/28 | 5 | 5 | 1 |

## 足元・装備・保存・会話

| 各版300モデル秒の実測 | V7 | V8 | V9 |
|---|---:|---:|---:|
| 検査した自律実ステップ | 1,081,531 | 1,089,325 | 1,114,483 |
| 地形違反 | 0 | 0 | 0 |
| 可視範囲違反 | 0 | 0 | 0 |
| 境界違反 | 0 | 0 | 0 |
| 速度違反 | 0 | 0 | 0 |
| 歩行中の連続接触違反 | 0 | 0 | 0 |
| 初期ドラッグの速度・地形などの違反 | 0 | 0 | 0 |
| 初期ドラッグ連続接触違反 | 0 | 0 | 0 |
| 5分後ドラッグ連続接触違反 | 0 | 0 | 0 |
| 足元の画像とモデルの最大誤差 CSS px | 0.01362 | 0.01339 | 0.01339 |
| 足元影が不足した延べ数 | 0 | 0 | 0 |
| 位置・サイズが一致する装備表示 / 1,560 | 1,560 | 1,560 | 1,560 |
| 接近した住民による会話候補イベント | 5,312 | 5,453 | 5,432 |

保存データをリロードして28体・装備・お金・関係・保存版数と実タッチを照合できたのは39/39件。[ネイティブ保存・再読込](evidence/matrix-restores.csv)

V9・4体・390pxの別のネイティブ試験で自然な会話を観察した。日本語表示が意図どおりで可視だった発話は28件。同一の会話で相手の返答が確認できたのは13/13地域。[会話の吹き出しと話者](evidence/matrix-dialogue.json)

### 待機の修正と再測定

初回のV9では、森28体・390pxのプニュが157.85秒時点でハムスターと合流した際、聞き手に設定された4秒間の待機の途中に、保留中だった古い歩行要求を再開していた（160.10秒）。聞き手に新しい待機を設定する際に、本人の古い歩行予約と進行中の道譲りを解除した。320px・390pxで300モデル秒ずつの独立試験を再生し、待機中に古い歩行を再開した観測は修正前1件、修正後0件だった。16体の独立した単体モデルでも、0.55秒で歩き出していた聞き手が4.05秒の期限まで位置を保つことを確認した。[聞き手の待機の実測](evidence/matrix-listener.json)

この修正と、道譲り失敗を記憶する対象範囲を最大24 CSS pxの新しい移動距離に合わせた修正の後、全地域の同じ検証を新しいコミットでやり直した。V9の通常歩行者は初回3,219人分、修正後3,217人分、経路終点へのドラッグ到着は910→911件だった。上の表はすべて修正後の実行。[初回のActions記録](https://github.com/Naoto214/naotocchi/actions/runs/44901881496)

## 試験の条件

V7、PR #578 の V8、V9 の従来配置を、それぞれ新しい Chromium コンテキストで開く。13地域 × 1・4・10・20・28体 × 320・375・390・430 CSS px の260条件。各版で開始直後の実ドラッグ1,058件、実タップ260件、300モデル秒経過後の実ドラッグ260件を送る。各地域の28体・390pxでは、ゲームが書いた保存データの完全なバイト列を別ページの読み込み口に渡し、お金、世帯、装備、改訂番号とその後の指入力も確認する。

初期操作はV8が使った保存済みの指先座標・開始時の足元・乱数を再生する。5分後のドラッグはV8と同じ住民を選び、各版で実際に経過した時点の足元に合わせる。300秒の地域試験はモデル時計を進める方式。森で実時間・モデル時間ともに10分以上続ける試験は別途行う。

## 歩行と行き詰まりの数え方

通常歩行の主指標には、自分の自律指示で経路が成立し、実ステップを伴って終点に到着し、開始点からの正味変位が8 CSS px以上、元の目標までの距離が0.75 CSS pxより多く減った経路を数える。退避フラグ付きの経路と、他者に譲るために歩いた経路は別集計にする。途中で経路が打ち切られても、実際に進んだ距離は総距離に含む。カメラの縦横倍率をそれぞれ適用し、往復による累積距離だけでは通常歩行の達成にしない。

経路不成立から本人の次の物理的な自律歩行ステップまでを1件の失敗エピソードとする。300秒の終端で継続中の時間も最長値の候補に含む。通常の休息や会話だけで開始した待機は含まない。失敗後に休息を選んだ時間はこの経過時間に含まれる。歩行による復帰が短い退避だった場合も復帰数に含み、通常歩行の完了数とは分ける。

変位・距離・各歩行の元の目的地、到着地点、実ステップの距離をZIP内の各住民の観測に保存する。操作ごとに指のイベントが信頼されたタッチであること、狙った住民、実際に選ばれた住民、経路発行、到着イベント、終点の足元、指先誤差を照合する。V8の双方失敗は、自律計画が失敗し、300秒間にその住民が自律歩行を開始せず、その後本人に発行されたドラッグで物理ステップもなかった条件を指す。

## 再現

`.github/workflows/home-mobility-v9-matrix.yml` が固定コミットからV7・V8とV9候補を組み立てる。地域ごとに計測結果とSHA-256のマニフェストを格納する。集計は各ビューアーや各地域の結果を混ぜず、元のActions ZIPのサイズ・SHA-256、20セルのハッシュ、実行コミット、ゲーム本体のハッシュ、入力同一性を照合してから集約する。

```sh
python -B comparisons/home-mobility-v9/matrix_report_v9.py \
  --run "$V9_RUN" --archives "$V9_ARCHIVES" \
  --v8-archives "$V8_ARCHIVES" --v7-archives "$V7_ARCHIVES" --private-data "$OWNER_MATRIX_DATA"
```

正式な比較資料では、各版の再測定値、同じ実行内の差、V7・V8の公表値からの差を併記する。V8の公表値は経路終点909/1,058、指先4px以内520/1,058、本人タップ246/260、双方失敗2/260。以前のV7は910・521・246・3、V8測定時のV7は908・520・246・3だった。
