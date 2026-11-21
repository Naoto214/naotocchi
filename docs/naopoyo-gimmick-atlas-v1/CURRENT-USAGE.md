# 第2章V2の面別実装棚卸し（固定HEADから抽出）

提案配置ではなく、V2の実装済みデータ。識別子は開発資料用で、盤面に表示する案ではない。

|面|重力|数値門|床・条件|扉|足場／崩壊／岩／NPC|
|---|---|---|---|---|---|
|11|False|[]|A:保持 / B:記憶|['AHeld', 'B']|{}|
|12|False|[]|A:保持 / B:保持 / C:記憶|['AHeld', 'C'] / ['BHeld', 'C']|{}|
|13|False|[{"x": 4, "y": 4, "exact": 2}]|A:記憶 exact2 / B:記憶 exact2|['sequence']|{"sequence": ["A", "B"]}|
|14|True|[]|L:記憶 exact1 / B:記憶 exact2|['B'] / ['B']|{"platforms": [{"x": 4, "y": 6, "rise": 2, "needs": "L"}]}|
|15|True|[]|A:保持 / B:記憶|['AHeld', 'B']|{"floors": [{"id": "F", "x": 3, "y": 4}]}|
|16|False|[{"x": 3, "y": 4, "exact": 2}]|A:保持 exact2 / B:記憶|['AHeld', 'B']|{"guardian": {"x": 5, "y": 1}}|
|17|True|[{"x": 4, "y": 6, "exact": 2}]|H:記憶 / A:保持 exact2 / B:記憶|['H'] / ['AHeld', 'B']|{}|
|18|False|[]|O:記憶 exact2 / A:保持 / B:記憶|['owlHelp'] / ['AHeld', 'B']|{"owl": {"x": 5, "y": 1, "needs": "O"}}|
|19|False|[{"x": 3, "y": 4, "exact": 2}]|K:記憶 ≥4 / B:記憶 exact2|['B']|{"boulders": [{"x": 5, "y": 4, "parkX": 6, "parkY": 1}], "bear": {"x": 5, "y": 1, "needs": "K"}}|
|20|True|[{"x": 4, "y": 4, "exact": 3}]|H:記憶 / A:保持 exact3 / B:記憶 exact3 / W:記憶 ≥6|['H'] / ['AHeld', 'B']|{"platforms": [{"x": 0, "y": 5, "rise": 2, "needs": "W"}]}|
