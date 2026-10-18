# Motion v2 L2 — 実Homeでの人間目視

人間承認待ち。main未マージ。回復pilotは承認済みのまま再調整しない。

## 起動と再生

専用branch `feat/motion-v2-l2-20261002` を取得し、以下を実行する。

```sh
npm ci
npm run dev -- --host 0.0.0.0 --port 5178 --strictPort
```

PC: http://localhost:5178/__qa
同じWi-FiのiPhone: `http://<PCのLAN内IP>:5178/__qa`
これはローカルQA手順であり、公開済みURLではない。

このQAは実際のHome HTML/CSS/JSと画像を使用する。Load sceneは確認用originの
セーブを置き換えるため専用portを使用し、普段のセーブを持ち込まない。
Scene・Width・Heightを選びLoad scene後に実際のケアボタンを押す。
繰り返し見るときはLoad sceneで戻す。静止画ではなく通常速度で再生する。

| Scene | 操作 | 見る動き |
|---|---|---|
| l2_feed_solo / pair / few / dense26 | ごはん | 小さな準備→むしゃむしゃ→満足の上向き反応→着地 |
| l2_play_solo / pair / few / dense26 | じゃれる | 予備動作→嬉しい1回の跳躍、くすぐったい台詞ならwiggle |
| l2_clean_solo / pair / few / dense26 | 掃除 | 全員が一緒に1回ぴょん→原点。会話後半で繰り返さない |
| l2_wake_solo / pair / few / dense26 | おきる | 目覚めの準備→上へ伸びて少し保持→柔らかく原点 |
| l2_play_rescue26 | じゃれる | 既存の複数lonely救済と主役L2の共存 |
| l2_clean_lonely26 | 掃除 | lonely表情を保ったまま共有の喜び。表情の所有者は変えない |

soloは主役＋装備。pairは既婚のクマ、fewはさらに3体、dense26は26体。
全シーンを390×844、代表4シーンと掃除全構成を320×568でも確認する。

## 確認項目

- ごはん：周囲全員が跳ばない。続けて満腹まで食べさせた場合は喜びmotionにしない。
  既存の食後の小さなhappy余韻と表情の条件判定は保持している。
- じゃれる：疲労・休みたい台詞、じゃれすぎではsettle。既存の代表positive／全員救済を維持。
- 掃除：主役・恋人・26体の配置、サイズを変えず、床・顔・指輪の見え方を確認。
  実Homeでじゃれる直後に掃除してpositive中の共有ジャンプも確認する。
- 起床：recoverほど大きくせず、睡眠との違いが読めるか。
- 主役とリボンの同期、heart/aura/ringの所有者、会話の話者表示を確認。
- 動いている途中でメニューを開閉／次のケアを押す／タブを離れ、位置ずれが残らないか。
- iPhoneの「視差効果を減らす」をONにして再読込。身体移動を止めても台詞・表情は残る。

記録：端末・OS・ブラウザ・サイズ・Scene・通常/reduced、大きさ、可愛さ、重なり、着地ずれ。
人間の可愛さ／意味の承認は自動テストでは代用しない。

## 自動検証との区別

Nodeの専用／Home／Relationshipテストは別の結果報告に記録する。
この環境ではPlaywrightのChromium取得が失敗したため、実ブラウザの描画・配置・
Safari動作をGREENとは報告しない。既存Home browser runnerと下記L2 runnerは
ブラウザを導入できる環境で実行できる。

```sh
node tests/motion-l2-browser.cjs
```
