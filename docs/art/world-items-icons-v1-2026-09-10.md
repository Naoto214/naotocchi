# メニュー・商品・天候・小物のイラスト v1

`assets/ui/world-items-atlas-v1.png` は画像生成による新規36種の素材。
1254×1254 RGBA、1,457,487 bytes。
SHA-256: `edf8893222b8399d8b1e9bd23dd29e7809d4659bfc8b6ca1d1a31fe4611023d0`。
生成出力をバイト変更せず採用した。白背景・1536pxを希望したが、実出力は透過付き1254px。
既存の `care-atlas-v1.png` は白背景のまま変更していない。

## 素材の棚卸しと再利用

main `f847cd78dcf652601bf4c960257e673d81c459d2` のキャラ・エンディング307画像と
初回お世話atlasを点検した。公開されたClaudeブランチ
`claude/review-existing-code-readme-naq7pv`（`cc7aaa462bca784a18faf91bdade7f7447bae098`）も取得。
そのブランチにはREADME・HTML・JS・CSSがあり、追加PNGはなかった。
これは他タブの未コミット素材がないことの証明ではない。未共有素材は引き続き未確認。

既存 `games.js` のレーンラッシュ・積み上げ・ボウリング・アーチェリー等のCanvas描画、
`world-environment.js` と既存CSSの天候演出を保持する。
絵が必要なメニュー／商品一覧／時刻・天候の選択表示／おたのしみ小物へ新素材を接続し、
既存Canvasの全ゲーム小物を描き直す二重実装はしていない。
「アイテム」「ゲームを選ぶ」のメニューと「ふかふかまくら」は既存お世話atlasを再利用。
未接続だった空の皿も、空腹・睡眠中の空腹の状態通知へ接続した。

## 接続先

| atlasキー | 絵／用途 |
| --- | --- |
| flower, ribbon, bowtie | おはな、リボン、ちょうネクタイ |
| paper, scarf, glasses | トイレットペーパー、マフラー、サングラス |
| band, hat, backpack | げんきバンド、シルクハット、リュックサック |
| star_badge, paw_badge, letter | スターバッジ、おともだちバッジ、らぶれたー |
| crown, clover | かんむり、よつばのクローバー |
| charm, lantern, ring, naoto_crown | なおとの4ごほうび |
| world, book, medal, palette | せかい、ずかん、じっせき、デザインのメニュー |
| sun, cloud, rain, snow | 晴れ、曇り、雨、雪の選択肢と世界情報 |
| moon, sunrise, sunset | 夜、朝、夕方の選択肢と世界情報（昼はsun） |
| candy, bubbles, balloon, fireworks | おたのしみのあめ、しゃぼんだま、ふうせん、はなび |
| camera, musicbox, surprise | おたのしみのカメラ、オルゴール、びっくりばこ |

装備15商品、4ごほうび、7おたのしみの表示に接続。ID・価格・効果・説明・保存中の絵文字は変更0。
装備絵は既存の装備フレーム内へ収め、主役・恋人・仲間の配置計算は保持した。
おたのしみの絵は持ち物ボタンと既存の短い結果演出に使う。
初回実績が同時に出た場合に実績の演出へ切り替わる既存優先順は維持する。

## 座標と表示

生成物は厳密な等分セルではなく、下の行ほど位置と余白がずれる。
[座標JSON](../../assets/ui/world-items-atlas-v1.json)の各正方形フレームを使用し、
背景サイズは `1254 / size * 100%`、背景位置は `x / (1254 - size) * 100%` と
`y / (1254 - size) * 100%` へ換算した。メダルは隣の本の薄い画素を除いたフレームを採用。
36フレームとも画像内・CSS一致・外周の不透明画素0を照合済み。

[20・26・40pxの静的見本](../qa/ui-illustration-size-check-2026-09-10.png)で全36種の輪郭と欠けを確認。
40pxの暗背景見本も併記した。ReportLab／PDFレンダラーによる縮小見本であり、
ゲーム・CSS・Safariのスクリーンショットではない。拡大すると一部の半透明縁が見えるため、
大きいイラストへの転用は別途点検する。18px・16pxでの実表示は未確認。

UIでは白い角丸枠を基本とし、装備だけ既存フレーム内の透過表示とする。
メニュー・商品・世界情報の文字は画像とは別に残す。画像が失敗すると、
商品／装備／おたのしみは同じ枠の中の元の絵文字へ戻す。
各atlasを1枚ずつ非表示imgで読み込み、load/errorで表示用属性だけを更新する。
失敗処理による保存・ゲーム状態・タイマー・レイアウト計算の変更はない。

## 生成プロンプト（1回、新規生成）

```text
Use case: stylized-concept.
Asset type: ONE production sprite atlas PNG for a warm, cozy browser pet game.

Create a square image laid out in EXACTLY 6 columns and EXACTLY 6 rows, 36 equal square cells total. Prefer 1536 by 1536 pixels. The cell grid is invisible: absolutely no gridlines or cell borders. Each of the 36 requested subjects appears exactly once in its specified cell. Center each subject inside its equal cell with at least 15% clean white padding on all four sides. Keep the icons optically similar in scale, separated, and fully inside their cells.

Scene/backdrop: perfectly solid pure white #FFFFFF throughout; no scenery or floor, no cast shadows outside the objects, no texture in the background, no transparency, no checkerboard.

Style/medium: cohesive cozy pixel-art illustrations with a thick dark chocolate-brown stair-stepped pixel outline, chunky crisp pixel shapes, subtly dithered soft warm shading, creamy highlights, muted yet rich colors, and simple bold silhouettes readable as 20–40 pixel game icons. Match this described reference style: lovingly illustrated retro inventory icons, such as a cream ceramic rice bowl, sage-green game controller, ochre broom, powder-blue moon pillow, amber medicine bottle, coral hearts, and warm golden coin pouch, with rounded charming forms and dark brown pixel contours. Draw the NEW subjects listed below, not those reference examples. Use the same visual weight, warmth and shading across all 36 subjects.

Required arrangement, read each row LEFT TO RIGHT, with no substitutions, no omissions and no repeated subjects:
ROW 1: daisy flower; red hair ribbon with hanging tails; blue bow tie with NO hanging tails; toilet paper roll; orange wool scarf; dark sunglasses.
ROW 2: green wrist energy band with a small lightning-bolt emblem; black top hat; red backpack; gold star badge; round pawprint badge; sealed love-letter envelope.
ROW 3: modest gold crown; four-leaf clover; blue eye charm amulet on a short cord; small red paper lantern; silver ring with a blue gemstone; regal silver-and-blue crown with a larger central blue jewel, clearly distinct from the modest gold crown.
ROW 4: globe; open illustrated field-guide book with tiny nature pictures and absolutely NO text; bronze medal with ribbon; paint palette and brush; golden sun; pale gray cloud.
ROW 5: raincloud with blue droplets; blue snowflake; crescent moon; sunrise over a small horizon; orange sunset over a small horizon; colorful spiral lollipop.
ROW 6: bubble bottle and wand with exactly two bubbles; red balloon with string; small bursting firework; compact camera; wooden music box with open lid; colorful jack-in-the-box toy.

Constraints: exactly 36 complete icons arranged as 6 by 6, one requested subject per cell, centered on equal cell centers. Treat named accessories, droplets, ribbon, cord, brush, bubbles, string, horizon, and open lids as parts of that cell's single subject group. Keep every group within its own cell. Make the sunrise pale golden and fresh; make the sunset warm orange. No labels, words, numbers, typography, watermarks, logos, border, grid, extra decorations, sparkles beyond the requested firework, or extra objects. This is one integrated sprite atlas, not separate images or variants.
```
