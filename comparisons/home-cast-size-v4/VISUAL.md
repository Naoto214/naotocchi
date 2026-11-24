# 390pxの縦画面で見比べた28体

昼の現行・A・B・Cを同じゲームで切り替え、各地域で全28体のIDと足座標の一致を検査した。画像は幅390 CSS px、DPR 2のChromiumで描画したもの。上下の余白を共通の範囲で切り、4枚を並べている。比較画像を開いて拡大すると、顔や背景との境目を元の画素で確認できる。 [撮影条件・画像のSHA-256](evidence/visual.json) ／ [撮影スクリプト](verify_visual.py)

| 地域 | 比較画像で確認できる違い |
|---|---|
| [みずべ](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/v4-river_lake-390-28.webp) | 石と毛色が近い河原で、中央の主人公の耳や手前のリスの尾がBでは現行より見分けやすい。奥の小さい住民には遠近差が残る。 |
| [もり](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/v4-forest-390-28.webp) | 手前のパンダやフクロウ、ハムスターではBでも顔と胴の輪郭を読み取りやすい。奥の住民の一部は現行から樹冠・幹に重なり、Cではその足位置がより目につく。 |
| [おうち](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/v4-home-390-28.webp) | 床中央ではBでも主人公の周囲に空きがあり、恋人のハートや仲間の姿を区別できる。奥には窓・鉢植えの高さに立って見える住民がいる。 |
| [とかい](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/v4-city-390-28.webp) | 手前の歩道では体色が舗装と分かれ、Bでは小さい黄・茶の住民の形が読みやすい。一方、奥の看板や柵に足が重なる箇所は4案に共通する。 |
| [うみ](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/v4-sea-390-28.webp) | 水色の背景と毛色の対比が強く、BとCのどちらでも主人公と恋人を探しやすい。沖側の住民は水面に浮かんで見え、足と波の対応は倍率だけでは決まらない。 |

ここで評価した接地は人の目で見た原画との対応。V5で有効な足座標であることと、絵の上で地面に立って見えることは別々に確認した。物理iPhoneの表示、指で顔を見つける難しさや好みは本人限定試遊で判断する。昼以外の背景は試遊の「時間帯」から切り替えられる。
