# 局所生成履歴

built-in imagegen、1回。入力はWP-CL1の[100,56,110,66)を80倍nearest-neighbourした10×10ネイティブ画素領域。全顔生成なし。

Prompt:
Precise local pixel-art edit. Input is an 800x800 enlargement of a 10x10 native pixel crop of the CHARACTER LEFT EYE (viewer-right) of a golden antlion sprite. Make ONE variant. Relocate the single warm ivory highlight one native pixel diagonally left and down: from native crop (4,6) to (3,7), zero based. Keep it one native pixel of same RGB 252,226,178; restore original cell (4,6) to dark RGB14,11,9. Preserve all other cells, transparent background and exact framing, outer contour and surrounding brown separation strip. No new face, no enlarged white patch, no smooth redraw, no added sparkle. Same 10x10 coarse pixel grid.

生成物全体の採用はしない。既存色を使い、元128pxの(104,62)→(103,63)の光移動だけを固定2画素で再構成。局所生成参照は候補枚数に数えず、最終候補はcandidates/WP-CL2.pngの1枚のみ。
