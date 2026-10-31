# 生成記録

生成器：内蔵 `image_gen.imagegen`。CLI/API代替は使っていない。原本入力は正式mainの `prototypes/card-game/ui-assets/card-back-approved.png`。原本ファイルは無変更。生成案は各1回、通常時計室内図はBを参照して1回。

## A — prompt

Use case: product-mockup. Create ONE precise frontal orthographic premium clock concept, variant A: round faithful botanical heritage. Reference image is the EXACT official Naotocchi card back, not an edit target. Preserve its dusty azure blue fine woven texture, pearlescent champagne-silver botanical leaf wreath, delicate four-point stars and central two-leaf seedling. Recompose as a ROUND clock; circular fine champagne metal bezel, tactile matte finish. Entire clock centered on warm white studio background with soft shadow, no perspective tilt. Clock occupies ~90% of square image. Readable cream ARABIC numerals 1 through 12 placed once each in conventional CLOCKWISE positions: 12 top, 3 right, 6 bottom, 9 left. Three identical small ROUND jewel dots just inward of numerals: at 10 muted ruby red, at 11 sage emerald green, at 12 sapphire blue. All three dots same diameter, all circles. No other colored dots. Fine 60 minute ticks. Botanical decoration should be abundant but confined to center and edge, never obscure numbers. Exactly THREE hands all from center, showing GAME state: long narrow ivory-gold hand at 7 (round 7); shorter wide dark navy outlined champagne hand at 4 (player A); shortest medium-width silver-blue outlined ivory hand at 2 (player B). Three hands distinct in length, width and color. Keep central seedling motif visible below hub. Small subtle text NAOTOCCHI near 6 inside dial. No other text, no labels, no extra clocks. Beautiful collectible design suitable for children and adults. This is an image concept, not a manufacturing drawing. Make image square.

## B / C / D — common prompt

Use case: product-mockup. Reference is the exact official Naotocchi card back. Inherit dusty azure blue woven texture, pearlescent champagne-silver botanical leaf decoration, delicate four-point stars and two-leaf seedling. ONE clock in straight-on orthographic view, warm white studio background, subtle shadow, entire clock visible, no tilt. Readable cream ARABIC numerals 1 to 12 exactly once, standard CLOCKWISE order 12 at top, 3 right, 6 bottom, 9 left. Same size ROUND jewel dots just inward of 10 = muted ruby RED, 11 = sage emerald GREEN, 12 = sapphire BLUE. Exactly three circular dots. Fine minute ticks. Exactly THREE hands meeting center: longest thin ivory-gold pointing 7; shorter broad dark navy edged champagne pointing 4; shortest medium silver-blue edged ivory pointing 2. These are independent GAME pointers, not current time. Keep sprout below hub visible. Small NAOTOCCHI branding, no extra words. Numerals clean and never covered by leaves. Square canvas.

### B suffix

ROUND luxury refinement. Thin brushed champagne bezel, refined restrained metal hour accents, sparse botanical wreath below center, refined deep muted azure face, generous quiet space around numerals, subtle engraved stars. Round clock diameter 90% of canvas. Elegant beautiful heirloom object, botanical source clearly recognizable.

### C suffix

RECTANGULAR faithful heritage. Tall softly rounded rectangle like original card proportions 3:4, height 90% of canvas width 67.5%. Preserve full rectangular double border and corner sprigs, large central elliptical leaf wreath and seedling from reference. The 12 hour marks follow a circular arrangement inside rectangular case. Rich original ornament, yet easily legible. Thin champagne-silver rim.

### D suffix

RECTANGULAR luxury refinement. Tall rounded rectangle 3:4, height 90% of canvas width 67.5%. Fine layered brushed champagne-silver metal case, refined blue dial, original corner botanical engravings and restrained two-leaf sprout near lower dial, central numerals in circular arrangement, wide negative space. Upscale decorative interior clock, quiet timeless beauty.

## 通常時計 — prompt

Use case: product-mockup. Reference image is the chosen Naotocchi round botanical clock B design. Create a tasteful photoreal interior product photograph of this exact round blue and champagne-silver clock hanging on a warm ivory wall over a walnut console, gentle daylight, a single small ceramic vase with branch off to side, subtle Japanese contemporary interior, clock prominent and easy to inspect. Preserve blue textile dial, silver botanical wreath, central seedling, engraved stars, NAOTOCCHI branding, thin champagne rim, ALL Arabic numerals 1-12 correctly clockwise. Preserve SAME THREE ROUND JEWEL DOTS at 10 red, 11 green, 12 blue. CHANGE ONLY THE CLOCK HAND CONFIGURATION from game to ordinary analog time: exactly three hands from center, thick short navy HOUR hand pointing slightly past 10, longer champagne MINUTE hand pointing to 2, extremely thin silver SECOND hand pointing 6. Time 10:10:30. No game pointers at 7 or 4, no extra hands. Product impression, not technical proof of movement. Show full clock and some breathing room, no people, no labels, no other text.

## 出力の検査と差異

- 全4案を目視：12数字、10赤・11緑・12青の丸、植物・双葉・青地、3本針を確認。
- 原画と同一の画素・銀箔表現を主張しない。忠実継承も意匠の翻案であり、無変更原本と区別。
- 生成画像のB針は指示した「最短」より長い傾向。機能図では見分けやすさを優先してAが174、Bが218、Rが265に整理した。色・役割・方向は共通。元のユーザーはA/Bの短針同士の長短までは指定していない。
- Dは縦長画像で出力された。画像を引き伸ばさず、比較シートで同じ長辺サイズの枠へcontain表示。生成画像で等しい半径を保証せず、機能図で同条件比較。
- 細かな目盛りの等間隔、宝石の同径、針の寸法、印刷解像度は最終製品仕様ではない。幾何の正本は機能図と、その後に本人が選定する製造版下。
- 原本・生成案のSHA256は `evidence/static-verification.json`。入力原本のGit blobはREPORT参照。

## VERSION 2 — concept-AB.png

2026-10-31。参照画像はこのPR内の `dist/assets/concept-A.png`（編集対象）と `dist/assets/concept-B.png`（マーカー配置参照）。image_genによる編集。元画像は上書きしない。
指示内容：Aの豊かな銀の葉飾り、中央双葉、青地、金属枠、12数字、3本針、正面構図を維持。Bを参考にマーカーを数字の外側へ移動。10赤・11緑・12青、同径の丸、落ち着いた宝石色。内側の元マーカーを除去。クロノグラフ・小文字盤・追加ラベルは禁止。
結果は意匠用ラスター。微細な形状・色・距離は製造公差を保証しない。正確な配置と指定色は操作図とVERSION2.mdに記載。
