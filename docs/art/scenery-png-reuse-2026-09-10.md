# 地域の飾りに既存PNGを再利用 — 2026-09-10

新しい絵は生成せず、既存18点の元PNGをそのまま参照する。全点を画像として読み取り、対応する動物・植物であることを確認した。画素・透明余白・縦横比は変えない。名前・仲間登録・恋人候補・図鑑解禁を追加するものではない。

表示枠は従来の飾りと同じ1em。PNG全体をobject-fit:containで納め、外枠の位置・動き・個数を維持。画像の失敗時はその枠だけ元の絵文字を出す。キャラの画像失敗記録へ入れず、主人公や仲間の配置を再計算しない。

| 元の記号 | 使用する既存PNG | 現行13地域×4季節から到達 |
| --- | --- | --- |
| 🐄 | [assets/characters/partners/field_cow.png](../../assets/characters/partners/field_cow.png) | あり |
| 🦋 | [assets/characters/butterfly/07.png](../../assets/characters/butterfly/07.png) | あり |
| 🐓 | [assets/characters/companions/chicken.png](../../assets/characters/companions/chicken.png) | あり |
| 🍄 | [assets/characters/mushroom/06.png](../../assets/characters/mushroom/06.png) | あり |
| 🐿️ | [assets/characters/companions/squirrel.png](../../assets/characters/companions/squirrel.png) | あり |
| 🦉 | [assets/characters/companions/owl.png](../../assets/characters/companions/owl.png) | あり |
| 🦔 | [assets/characters/companions/hedgehog.png](../../assets/characters/companions/hedgehog.png) | あり |
| 🦌 | [assets/characters/partners/grove_deer.png](../../assets/characters/partners/grove_deer.png) | あり |
| ⛄ | [assets/characters/partners/snowman.png](../../assets/characters/partners/snowman.png) | あり |
| 🐠 | [assets/characters/clownfish/05.png](../../assets/characters/clownfish/05.png) | あり |
| 🐢 | [assets/characters/turtle/05.png](../../assets/characters/turtle/05.png) | なし（現行参照の残件） |
| 🐟 | [assets/characters/salmon/06.png](../../assets/characters/salmon/06.png) | なし（現行参照の残件） |
| 🪼 | [assets/characters/jellyfish/06.png](../../assets/characters/jellyfish/06.png) | なし（現行参照の残件） |
| 🪸 | [assets/characters/coral/06.png](../../assets/characters/coral/06.png) | なし（現行参照の残件） |
| 🦜 | [assets/characters/companions/parrot.png](../../assets/characters/companions/parrot.png) | なし（現行参照の残件） |
| 🦍 | [assets/characters/partners/gentle_gorilla.png](../../assets/characters/partners/gentle_gorilla.png) | なし（現行参照の残件） |
| 🦂 | [assets/characters/partners/desert_scorpion.png](../../assets/characters/partners/desert_scorpion.png) | あり |
| 🦅 | [assets/characters/partners/high_eagle.png](../../assets/characters/partners/high_eagle.png) | なし（現行参照の残件） |

18点の対応を用意し、現行地域の通常の描画経路で使われるのは11点。残る7点を「表示確認済み」と数えない。多くは地域がvisualBaseIdを通して別地域の飾りを参照する既存処理により出てこない。カメは現行地域の飾りリストにもない。地域処理を変更する際に必要性を再確認する。

既存atlasも追加で使用する：💕→お世話の2つのハート、🫧→シャボン玉、🌅→日の出。上部・世界情報・旅の選択ではmountain→山、jungle→ヤシ、memory_lake→シャボン玉を接続。旧tropicalの対応は維持する。素材選択だけで地域IDや元の表示名を変更しない。

既存のお世話透過版・5バッジ・季節地域atlasは保持。白背景は復活させない。今回のPNGやCSSのゲーム画面は取得できていない。原画像の目視・Nodeの出力はiPhone描画の証拠ではない。
