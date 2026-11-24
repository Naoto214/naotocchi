# なおとっち　28体の住民サイズを見比べる

[本人限定の動作比較を開く](https://naotocchi-cast-size.kerzion214.chatgpt.site/)

初期画面はみずべの昼・28体・現行サイズ。主人公はいぬ、恋人はもりのクマさんで、仲間は正式名簿の26体。主人公にゲームのリボンを着け、装備が身体と一緒に拡大されるかを見られるようにした。試遊には専用の一時セーブを使う。

「配置を固定」を押し、画面上部の「現行」「A案」「B案」を順に選ぶと、歩く位置や向き、前後関係をそろえて見比べられる。「再生する」で同じ住民たちの自律移動・会話・ドラッグに戻る。「設定」には全13地域、朝昼夕夜、1・4・10・20・28体、主人公・恋人・仲間別の80〜150%調整がある。地域または人数を変えたときは、その条件の世帯を読み直す。

| 比較案 | 主人公 | 恋人 | 仲間 | みずべ・28体で配置を固定 |
| --- | ---: | ---: | ---: | --- |
| 現行 | 100% | 100% | 100% | [現行を開く](https://naotocchi-cast-size.kerzion214.chatgpt.site/?region=river_lake&count=28&paused=1&castPreset=current) |
| A案 | 120% | 110% | 105% | [A案を開く](https://naotocchi-cast-size.kerzion214.chatgpt.site/?region=river_lake&count=28&paused=1&castPreset=A) |
| B案 | 125% | 115% | 115% | [B案を開く](https://naotocchi-cast-size.kerzion214.chatgpt.site/?region=river_lake&count=28&paused=1&castPreset=B) |

%は、そのキャラクターを現行設定で描いたときの大きさを100とした値。既存の主人公110%は現行の画面に含まれる。試作は同じ足元から描画と画面上の選択範囲だけを拡大し、経路・接触・会話は正式ホームの座標と寸法で動かす。三案とも環境描画には #569 の**落ち葉B案**を使う。

[もりの28体](https://naotocchi-cast-size.kerzion214.chatgpt.site/?region=forest&count=28&paused=1) ／ [とかいの28体](https://naotocchi-cast-size.kerzion214.chatgpt.site/?region=city&count=28&paused=1) ／ [おうちの28体](https://naotocchi-cast-size.kerzion214.chatgpt.site/?region=home&count=28&paused=1)

[みずべともりの主人公・恋人を原寸で比較する](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/size-pairs.png) ／ [重点4地域の全景を比較する](https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/size-scenes.webp)

## 試遊で見てほしい場面

まずA案でみずべを眺め、次に恋人だけを120%まで上げる。390 × 844 CSS pxの固定画面では、主人公・恋人・仲間の高さ中央値をこの順に並べると、現行は32・21・20 px、A案は38・22・22 px、B案は39・23・24 pxだった。手動の120・120・105%では38・25・23 pxになり、この姿勢では恋人より背の高い仲間が15体（B）から0体に減った。もりでは恋人が奥にいるため、手動でも9体は恋人より高く見える。種ごとのシルエットと奥行きの差は残る。[みずべで手動案を試す](https://naotocchi-cast-size.kerzion214.chatgpt.site/?region=river_lake&count=28&paused=1&hero=120&partner=120&companions=105) ／ [もりで同じ案を試す](https://naotocchi-cast-size.kerzion214.chatgpt.site/?region=forest&count=28&paused=1&hero=120&partner=120&companions=105)

小さい画面では、みずべよりも密なもりも確認してほしい。320 × 568 CSS pxのもりで、二人の輪郭が4画素以上重なる組は、現行19組、A案25組、B案29組。手動案とA案では重なる面積が近く、仲間の表情と恋人の存在感を両立しやすかった。これらは固定した開始配置の測定で、歩き始めると変化する。

## 比較資料

- [実ホームのサイズを決める処理・原画の透明余白・表示切替](BASELINE.md)
- [各幅での輪郭・見切れ・重なり・操作の測定](VISIBILITY.md)
- [人数別の計測と28体の停止の内訳](PERFORMANCE.md)
- [既存の描画、移動、セーブ、並行PRの保護検査](PROTECTION.md)
- [落ち葉B案を採用した記録](DECISIONS.md)

ゲームの地形と住民の初期配置がそろうと「読み込み中」が消える。Linux ChromiumとWebKitの双方で、通常・動きを減らす・再生中からの配置固定を確認した。[Chromiumの初回表示](evidence/cast-ready-chromium.json) ／ [WebKitの初回表示](evidence/cast-ready-webkit.json)

## ローカルで比較する

最新mainの分岐元は `38b4e9d0c8ed4cacdfc1cc6c072a7a9e62e5c053`、環境描画の基準は #569 の `28628cf336a8ed92efe4e9e197ca03298b798a1e`。リポジトリのルートから実行する。ビルダーが基準コミットと描画用ファイルのハッシュを検証する。

```sh
git fetch origin refs/pull/569/head
git worktree add --detach ../naotocchi-leaf-reference 28628cf336a8ed92efe4e9e197ca03298b798a1e
node --test comparisons/home-cast-size-v1/*.test.cjs
node comparisons/home-cast-size-v1/build.cjs /tmp/naotocchi-cast-home --reference-checkout ../naotocchi-leaf-reference
python -m http.server 8201 --bind 127.0.0.1 --directory /tmp/naotocchi-cast-home
```

ブラウザーで `http://127.0.0.1:8201/` を開く。GitHubの比較専用ワークフローは試験とビルドを実行する。比較は独立した本人用サイトで実施する。
