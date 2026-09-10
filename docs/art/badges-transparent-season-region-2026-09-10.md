# 透過お世話素材・バッジ・季節地域

## ファイルと保存方針

- `assets/ui/care-atlas-v2.png`: 1254×1254 RGBA、1,031,977 bytes。
  SHA-256 `1cefd08973207e7c46411335dfa02c7390891da73aebd0c8d77cb3f957039da2`。
  元の16点の外側を画像編集ツールで透過。元の配置・色・白い米や器を保持するよう指定。
  フレームはv1と同じ。v1の画像・JSONは上書きしていない。
- `assets/ui/season-region-atlas-v1.png`: 1254×1254 RGBA、1,549,146 bytes。
  SHA-256 `a50ae6e608fee5b234b076ff597b755a4a1dea7db3a4d68271086413407a708f`。
  桜・ひまわり・紅葉・緑の葉・広葉樹・針葉樹・ヤシ・サボテン・雪山・岩山・家・街・麦・波・貝・ハイビスカス。
- どちらも組込みimage_genを使用。生成出力のバイトとalphaをそのまま保存した。
  原画キャラ307点と旧atlas2点の変更0。追加PNGは2枚。

## 接続

| 場所 | 表示 |
| --- | --- |
| お世話、状態バッジ、所持金、状態通知、足元のうんち | 透過care v2 |
| クリアバッジ 1〜5 | 既存花火、既存ランタン、新しい木、既存図鑑、既存青い王冠 |
| 春、夏、秋、冬 | 桜、ひまわり、紅葉、既存雪 |
| 主な8地域の世界情報と旅の選択 | 家、木、麦、波、ヤシ、雪山、サボテン、街 |
| 同じ意味の周囲の飾り | 新16種＋既存素材。秋の落ち葉は透過careのdecline |
| データ、会話、保存、マスター | 既存記号・ID・文章を維持 |

新素材のフレームは等分ではない。同名JSONの正方形frameから背景座標を計算する。
横長の山・家などでは正方形のままだと上下の隣の絵が混ざるため、
clipBoundsに対象物と4pxの余白を記録し、CSSのinsetで表示範囲を制限する。
絵の縦横比は変えず、画像読込失敗時はclip-pathを解除して元の絵文字を出す。
CSSの固定フレームとボタン寸法を保ち、白い下地のみ透明にした。

[QA](../qa/badges-transparent-2026-09-10.md)・[静的見本](../qa/badges-transparent-art-check-2026-09-10.png)を参照。
素材見本はPDFに原画像を配置して確認したもの。実ゲーム画面ではない。

## お世話atlasの編集プロンプト

入力: `assets/ui/care-atlas-v1.png` をview_imageで確認後、編集対象として指定。

```text
Use case: background-extraction. Asset type: production sprite atlas for a browser pet game. Image 1 is the EDIT TARGET, a 4 by 4 atlas of 16 existing cozy pixel-art care icons. Remove ONLY the white exterior background so the output is an actual RGBA PNG with a fully transparent alpha channel around and between the 16 objects. Keep ALL 16 objects, dark outlines, original warm pixel-art colors, opaque white rice/cream bowl/highlights, positions, relative sizes, and 4x4 order unchanged. The rice bowl, controller, broom, pillow / medicine, feather cat toy, two hearts, money bag / gift, empty plate, thermometer, danger triangle / bandaged heart, green sprout, orange leaf, poop must all remain complete and uncut. Clear enclosed empty-background gaps such as behind the cat-toy string, but retain the objects' white material inside their dark outlines. Do not redraw or restyle the objects. No white tiles, no white halo, no drop shadow, no simulated checkerboard, no black background. Keep each icon separate with clear transparent padding. Preserve square canvas and exact layout; transparent output only.
```

## 季節地域atlasの生成プロンプト

新規生成。既存画像ファイルへの編集は行っていない。

```text
Use case: stylized-concept. Asset type: ONE production sprite atlas for a cozy Japanese browser pet game. Make one square PNG with an ACTUAL TRANSPARENT RGBA background, all empty space alpha zero. Arrange exactly 16 small complete illustrations in a regular 4 column by 4 row grid with invisible equal cells and generous transparent gaps. Style: charming richly shaded warm pixel art, dark chocolate brown stepped outlines, chunky readable silhouettes, gentle dither shading, natural muted but colorful tones, like hand-drawn retro inventory sprites. Intended display 18 to 42 pixels so simple and distinct. All objects complete with at least 10% transparent padding; no overlap. Content and order: ROW 1 left to right: one pale pink five-petal cherry blossom; one yellow sunflower with brown center and two small green leaves; one orange-red maple leaf; one fresh green leaf with a short stem. ROW 2: one full round-canopy green broadleaf tree with brown trunk (for a life-achievement badge); one dark green evergreen pine tree; one green palm tree with curved trunk; one upright branching desert cactus. ROW 3: one snowy mountain peak; one bare rocky mountain peak; one cozy small house with coral roof; one compact modern city skyline of three towers. ROW 4: one tied golden sheaf of wheat; one curling blue ocean wave; one pale peach seashell; one red tropical hibiscus flower with two green leaves. Each specified group is ONE icon wholly inside its own cell. All 16 items same optical weight and visual quality. No faces, no labels, no writing, no numbers, no borders, no cell tiles, no shadows, no halos, no white background, no white squares, no simulated checkerboard. Actual alpha transparency around all objects. Keep the 4 by 4 layout and 16 requested subjects exactly.
```
