# なおとっち　歩行空間と公平性 VERSION 13

基準は Draft PR #582 の `bff63b9db6fd22334fbf776090a318bc671ce5aa`。本人限定の比較用に、同じホーム描画・住民モデル・入力を用いる。背景や住民の画像、音源、保存形式、ゲーム本体のUIを含む基準バンドルはビルド前に全4,143ファイルのハッシュを照合する。

| 案 | 森の地形 | 開始時の足位置 | 曲がる道譲り |
|---|---|---|---|
| A | 現行 | 現行 | オフ |
| B | 既存の草地に小さな張り出しを追加 | Aと同じ | オフ |
| C | Bの草地に退避場所を追加 | Aと同じ | オフ |
| D | Cと同じ | 退路を保つ条件で調整 | オフ |
| D＋曲がる道譲り | Dと同じ | Dと同じ | 最大2体 |

V11の足元のみ、V12の曲がる道譲りも試遊できる。森以外は既存地形を使用する。足元保持の独立した候補は、通知時のパンダと山の通路で再生できる。

## 測定結果

[総合報告](RESULTS.md) · [歩行地図と接触](MAP.md) · [長時間の公平性](forest-report.md) · [13地域の回帰](regional.md) · [WebKitの性能](PERF.md) · [足元保持の独立候補](FOOT.md)

[本人限定試遊](https://naotocchi-home-v13.kerzion214.chatgpt.site/v13/) · [住民別の記録](https://naotocchi-home-v13.kerzion214.chatgpt.site/v13/forest.html) · [測定原本](https://naotocchi-home-v13-records.kerzion214.chatgpt.site/)

## 再現

比較用の全ファイルを生成するには、#582の本人限定バンドルをビルドしてから `node comparisons/home-mobility-v13/build.cjs OUTPUT --baseline V12_DIR` を実行する。計測用のみを生成する場合は `--gameplay-only` を追加する。いずれもゲーム本体の出力先と別のディレクトリを指定する。
