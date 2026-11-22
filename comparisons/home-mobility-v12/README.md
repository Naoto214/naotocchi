# なおとっち　ホーム移動 VERSION 12

[本人限定試遊](https://naotocchi-cast-size.kerzion214.chatgpt.site/v12/) ／ [住民別の10分記録](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/v12/forest.html) ／ [検証原本とSHA-256](https://naotocchi-mobility-v8-evidence.kerzion214.chatgpt.site/v12/)

比較の基準は [Draft PR #581](https://github.com/Naoto214/naotocchi/pull/581) の `5f899a2de868fa70e772a56d0fad733f87717e6a` です。V11は表示要素を差し替えたときの足元保持のみを使用します。散歩先の事前変更と拒否後の散歩先探索は、比較の標準設定から外しました。各版で同じ住民、初期位置、時刻、乱数を再現できます。

[結果の要約](RESULTS.md) ／ [全13地域](MATRIX.md) ／ [既存の直線道譲りと本人の未達目標](REVIEW.md)

## 試遊で確かめる

- ホーム上部のV10・V11・V12を押すと、同じ場面を最初から再生します。V12の標準試遊では、8pxの退路がある住民には最後の8pxを、それがない住民には最後の3pxを残す候補を使います。「設定」で地域・時間帯・人数・初期配置・乱数を選べます。「住民の移動記録」から記録を開始し、個体別の通常歩行、受けた道譲り、ほかの住民に譲った回数、再配置と足元の変位を確認できます。
- [森の道譲り](https://naotocchi-cast-size.kerzion214.chatgpt.site/v12/yield.html) では、375pxで到着した過去の23経路を再生できます。記録指定の経路再生・行き詰まった指示からの探索・通常の移動指示を区別して試せます。8pxのみを守る版と短い退路も守る版で、ほかの住民の足元に残る方向数も比較できます。
- [375pxでハムスターに残る退路](https://naotocchi-cast-size.kerzion214.chatgpt.site/v12/narrow.html) では、道譲りの前後6秒間を両案で見比べられます。28体の実測足をゲームの描画で再生し、同じ時刻で切り替えられます。近くの3体の拡大、1コマ送り、前後半の歩行回数、3px進める方位を確認できます。
- [成長時の足元](https://naotocchi-cast-size.kerzion214.chatgpt.site/v12/growth.html) では、同じお世話操作で成長前後を比較し、動いた距離と失われた退路を確認できます。
- [山と森の通路](https://naotocchi-cast-size.kerzion214.chatgpt.site/v12/corridor.html) では、地形が再計算されたときに仲間の足元を保持できるか、そのまま主人公が歩けるかを再生できます。

## 版と計測の対応

`curve.cjs` は既存の探索が直線の譲り方を見つけられなかった場合にだけ追加の候補を調べます。助け手は最大2体で、一人の経路には最大1回の曲がりがあります。地形・原画による遮蔽・他者との接触を各区間で検査し、助け手と本人は既存の歩行処理で移動します。足元や目標が変わった場合は安全条件を再確認します。直線探索を終えた時点で既存の歩行予約を解放し、追加探索がほかの住民の行動を待たせないようにしています。

`reflow.cjs` は同一の地形投影への再同期時、全住民の原画・実測範囲・接触・移動中の経路と主人公の退路を検査します。保持条件がそろったときだけ足元を引き継ぎます。成長時の五方式は比較室で個別に選択できます。

長時間観測では通常歩行の開始と到着、道譲り・ドラッグによる移動、休息や会話を区別します。森は実時間とモデル時間を両方記録します。全地域では通常の生活後の操作と、同じ足位置・乱数・操作を復元した比較を別々に集計します。描画試験はLinux WebKitでのフレーム間隔と、同じ描画列を再生した結果を分けて記録します。

- [森の連続試験・V11対照](https://github.com/Naoto214/naotocchi/actions/runs/44991773760)
- [森の連続試験・最終候補](https://github.com/Naoto214/naotocchi/actions/runs/44994820432)
- [13地域の回帰試験](https://github.com/Naoto214/naotocchi/actions/runs/44994820430)
- [WebKit性能試験](https://github.com/Naoto214/naotocchi/actions/runs/44994965617)

初回、探索を分離した8px版、短い退路を守る最終候補それぞれのコード・測定条件・結果は分けて保存しています。[曲がる道譲り](CURVES.md) ／ [森の空間](SPACE.md) ／ [成長と通路](FOOT.md)
