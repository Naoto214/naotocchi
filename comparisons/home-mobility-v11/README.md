# なおとっち　ホーム移動 VERSION 11

[足元修正のみを試す](https://naotocchi-cast-size.kerzion214.chatgpt.site/v11/?arm=v11&variant=foot) ／ [全条件を比較](https://naotocchi-cast-size.kerzion214.chatgpt.site/v11/) ／ [通知時の足元を再現](https://naotocchi-cast-size.kerzion214.chatgpt.site/v11/replay.html) ／ [森の歩行地図](https://naotocchi-cast-size.kerzion214.chatgpt.site/v11/space.html) ／ [Draft PR #581](https://github.com/Naoto214/naotocchi/pull/581)

V9・V10・V11を切り替えると、同じ地域・時間帯・人数・乱数でホームを開き直す。森の28体では、「設定」で通常の初期配置とV9の配置案を選べる。V11の3案は同じレンダラーを使う。「足元の修正のみ」で描画の修正を確認できる。通常探索より前に行き先を選ぶ案と、元の経路探索が拒否した後で安全な前方16pxを調べる案は、それぞれ別に選べる。各住民が経路を得られなかった時間と、本人が休息や会話を選んだ時間は、本人用の記録画面で区別する。

パンダの再現ページでは、当時の320px幅の森と28体の足元を復元し、パンダを表示する要素を実際に差し替える。森の地図は10分試験で記録した足位置から、各住民がその瞬間に安全に進めた方向を表示する。

[調査結果と推奨範囲](RESULTS.md) ／ [成長時の足元を比べる](https://naotocchi-cast-size.kerzion214.chatgpt.site/v11/growth.html) ／ [28体の個体別記録](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/v11/forest.html)

## 再現方法

基準はPR #580の `ed671e26f5599cebf5aa1a8020d50a5f43dbf076`。初めて生成するときは、森のCIにある参照コミットとV1からV10までのビルド順を使う。リポジトリのルートから、`V10_DIST` に生成済みV10の配布ディレクトリ、`V11_DIST` に別の出力先を指定する。V11のビルドは元の4,016ファイルをまとめたSHA-256を照合する。[参照チェックアウトとビルド手順](../../.github/workflows/home-mobility-v11-fairness.yml)

```sh
node comparisons/home-mobility-v11/build.cjs "$V11_DIST" --baseline "$V10_DIST"
MOBILITY_GAME="$V10_DIST/game" MOBILITY_V10_DIST="$V10_DIST" node --test comparisons/home-mobility-v11/*.test.mjs
python -B comparisons/home-mobility-v11/verify-protected.py --game "$V11_DIST/game" --arm v11 --out /tmp/v11-regression.json
```

検証用ゲーム内の乱数に加え、実際のフレーム・通知時刻が次の住民の判断に影響する。通常再生の記録、同じ世帯状態・入力にそろえた再生、描画する姿勢を固定した測定をそれぞれ保存した。歩行は実際に足元が進んだ距離で評価する。

Gitには集計と測定コードを収録した。CIで採取した原本は各実行のArtifactsから14日間取得できる。本人限定ポータルの目録には、ローカルで採取した原本も含めてパスとSHA-256を収録している。[原本の目録](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/v11/manifest.json)

| 測定 | 同じ条件で実行する方法 |
| --- | --- |
| 森の10分間 | Linux・Node 22・Python 3.12・Playwright 1.62.0・Chromeを使用。`forest_case.sh` が `RUNNER_TEMP/v10` または `v11` を配信し、`PROFILE` と `POLICY` で選んだ1世帯の自律移動と開始時・10分後の入力を再生する。8条件と4版の指定は [森のCI](../../.github/workflows/home-mobility-v11-fairness.yml) を参照。 |
| 全13地域 | 同じChrome環境でV11配布物をローカル配信し、`matrix_worker_v11.py --url http://127.0.0.1:8377 --region forest --out /tmp/v11-forest-region` で1地域の5人数×4幅を実行できる。CIの `REGION` を切り替えると他の12地域も同じ手順になる。[地域別CI](../../.github/workflows/home-mobility-v11-matrix.yml) ／ [測定内容](MATRIX.md) |
| Linux WebKit | Node 24・Python 3.12と、性能CIに記載のPlaywright・psutil・Pillow・WebKitを使用。`experiment=all` で通常再生・固定再生・処理別時間、`reverse-input` で逆順の操作と320pxの自然発生通知を測る。[性能CI](../../.github/workflows/home-mobility-v11-performance.yml) ／ [測定結果](PERF.md) |
| 足元 | `/usr/bin/chromium` とPlaywrightを使い、下記の2コマンドで同じV10配布物・同じ28体からパンダの差し替えを再現する。追加の `foot_guards.py`、`foot_transitions.py`、`foot_save.py` は各 `--help` に入力と出力がある。[測定条件](FOOT.md) |
| 森の移動空間 | PythonのNumPy・SciPy・PlaywrightとChromiumを使用。再採取する場合はV10の30試行を `実行番号/条件/forest28.json.gz` の形で展開する。保存した8世帯の空間原本からは `space_metrics.py` や `space_graph.py` を直接実行できる。動きの前後で進路が開閉した区間を再測定する `space_closures.py` には10分記録も使う。[手順と本人限定の空間原本](SPACE.md#再測定) ／ [元になったV10の10分記録](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/v10/forest.html) |

```sh
python -B comparisons/home-mobility-v11/foot_replacement.py "$V10_DIST" --out /tmp/v10-panda.json
python -B comparisons/home-mobility-v11/foot_replacement.py "$V10_DIST" --candidate --expect-stable --out /tmp/v11-panda.json
```

WebKit固定再生の基準テープにはV10初回のCI成果物を使う。14日経過後のローカル再生では、旧版目録の `fixed` と `stress` を別フォルダーに復元する。各フォルダーで `<種類>.json.gz` を `<種類>.json` に展開し、`<種類>-active-poses.json.gz` と `<種類>-active-animation-phases.json.gz` は先頭の `<種類>-` を外して圧縮のまま置く。V10の `fixed-fixture.sha256` または `stress-fixture.sha256` と照合してから、性能CIの `performance.py replay --tape` にそのフォルダーを渡す。[V10テープの本人限定原本](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/evidence/mobility-v10/performance/ce31e78/index.json)
