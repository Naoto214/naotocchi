# なおとっち 秋の落ち葉の見え方

[本人限定の動作比較を開く](https://naotocchi-autumn-leaves.kerzion214.chatgpt.site/)

左は#568の現行E3+、右は試作です。開いたときは、晴れた秋の昼の森にBを表示します。分割線を動かしたり、A・B・Cを選び直したりしても、その場の住民と時計を共有します。「背景演出を一時停止」で葉の表裏や縁を同じ瞬間で比較できます。スマートフォンでは上部の「設定」から、色、大きさ、枚数、落下速度、風の強さを変更できます。

| 初期表示 | A 約1.5倍 | B 約2倍 | C 約2.5倍 |
| --- | --- | --- | --- |
| もり・秋・晴れ・昼 | [森でAを見る](https://naotocchi-autumn-leaves.kerzion214.chatgpt.site/?scene=forest-leaves&variant=A) | [森でBを見る](https://naotocchi-autumn-leaves.kerzion214.chatgpt.site/?scene=forest-leaves&variant=B) | [森でCを見る](https://naotocchi-autumn-leaves.kerzion214.chatgpt.site/?scene=forest-leaves&variant=C) |
| いなか・秋・晴れ・夕 | [いなかでAを見る](https://naotocchi-autumn-leaves.kerzion214.chatgpt.site/?scene=country-leaves&variant=A) | [いなかでBを見る](https://naotocchi-autumn-leaves.kerzion214.chatgpt.site/?scene=country-leaves&variant=B) | [いなかでCを見る](https://naotocchi-autumn-leaves.kerzion214.chatgpt.site/?scene=country-leaves&variant=C) |

葉一枚を同じ倍率で追った実寸の切り抜きと、画面全体の本人用画像も用意しました。[表・縁・裏の比較画像](https://naotocchi-autumn-leaves.kerzion214.chatgpt.site/evidence/leaf-turnovers.png) ／ [森といなかの分割画面](https://naotocchi-autumn-leaves.kerzion214.chatgpt.site/evidence/leaf-split-at-1-5s.webp)

## 原画・風・葉の関係

A・B・Cは同じ色・枚数・放出時刻・風を使います。倍率は葉の長さの設計値です。遠くの葉は小さく、手前は少し大きく補正します。面を広く見せたり細い縁を見せたりするので、端末上の幅と高さは回転に応じて変わります。

- **形と色**　枝先から離れた葉に、茎、先のとがった不揃いな輪郭、折り目、葉脈を描いています。光が当たる側には赤・橙・黄を入れ、返った面はくすんだ暖色に落とします。混色、赤、橙、黄を切り替えられます。
- **運動**　#568と同じ風を受けながら、手前ほど横に広く滑り、傾いたところで少し落ち、風が強まると浮き上がります。個体ごとに周期と向きを変えました。絵柄を小さな描画面に蓄えて使い回し、落下中の一枚を一回の画像描画で表示します。
- **配置**　標準は森20枚、いなかの夕方6枚の枠を使います。いなかでは、縦画面の端に隠れていた前景の1枚を、原画で小道の右手に見える木から出るようにしました。端末の幅が変わっても、この木の位置と風の基準を共有します。
- **保護範囲**　試作の対象は森といなかで既に秋の葉が出る晴れ・曇りの場面です。「動きを減らす」を尊重します。秋の雨雪、春の花びら、特殊地域の光などには#568の描画を使います。52背景、住民画像・装備・移動モデル、BGM、ゲームUI・保存形式は元のままです。

## 検証と再現

スマートフォン幅での実際の葉の大きさ、背景との色差、回転の見え方は視認性レポートにまとめています。住民28体のフレーム間隔と環境描画の単独計測は性能レポートに分けています。iPhone Safari実機の評価は採用前に残ります。[視認性と比較画像](VISIBILITY.md) ／ [描画負荷と停止の内訳](PERFORMANCE.md)

基準は#568のコミット `2935622edf9ccdc6f8a36f2297dd86b789022b87`。このDraftはmainの `38b4e9d0c8ed4cacdfc1cc6c072a7a9e62e5c053` から独立して分岐しています。試遊用アダプターは生成先のホームにだけ加え、セーブは試遊専用に分離します。[基準画素の照合](evidence/reference.json)

完全なチェックアウトで実行します。出力はリポジトリの外を指定します。

```sh
node --test comparisons/home-beauty-v7/*.test.mjs
node comparisons/home-beauty-v7/build.cjs /tmp/naotocchi-leaves --fresh
python -m http.server 8197 --bind 127.0.0.1 --directory /tmp/naotocchi-leaves
```
