# 制作履歴

使用：built-in image_gen、局所編集1回、候補1枚。入力は元wantsPlayの[100,56,110,66)を80倍nearest-neighbourで拡大した800×800px透明PNG。全顔・全身を生成入力にしない。

## Prompt

Use case: precise-object-edit. This is an enlarged 10 by 10 native pixel crop, each native pixel an 80x80 square, from the CHARACTER'S LEFT EYE (viewer-right) of a tiny golden antlion insect sprite. Edit this crop only, not an entire face. Keep the 10x10 pixel-block arrangement and all transparent areas EXACTLY. Make just these three native pixel cells clearer: native crop column4,row6 (zero-based) is inside the black eye: make it a single subtle warm ivory eye highlight, clearly within the dark eye. Native column5,row6 and column5,row7 are the dark connection between the black iris and outer face rim: change only those two cells to the surrounding warm ochre/brown face shading to separate iris from outer contour. Keep all other cells, the black iris size, surrounding face colors, outline and alpha unchanged. No new face, no extra eyes, no smooth painting, no enlarged eye, no symmetry. Return one edited crop on transparent background, same framing. This is a local color donor; preserve crisp square native pixels.

## 採色・合成

生成結果は1254×1254px。光が指示より1セルずれ、他セルにも変化があるため全体採用しない。保存した色参照PNGのセル中心でRGBのみ採色：

- セル(3,6)、画素(438,815) → 元画像(104,62)
- セル(5,6)、画素(689,815) → 元画像(105,62)
- セル(5,7)、画素(689,940) → 元画像(105,63)

元128×128のalphaを全て保持。RGB3画素以外は元候補を使用。本人右目（viewer-left）のコピーなし。本人左目（viewer-right）の外形を拡大する処理なし。色参照PNGはメタデータを除いて再保存した制作履歴であり、最終候補はcandidates/wantsPlay-left-eye.pngのみ。
