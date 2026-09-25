# 空腹アイコン候補集約（2026-09-26）

runtime未接続の候補。31系統の意味カテゴリは `hungerCategoryFor` で正準化済みだが、この資料の絵柄は人間確認前の候補であり、表示仕様として未採用。

![候補一覧](hunger-icon-candidates-20260926.svg)

## 共用案

|意味カテゴリ|候補絵柄|扱い|
|---|---|---|
|rice|既存ごはん|維持|
|food_bowl|既存フード皿|維持|
|fish|既存魚|維持|
|insect / fly|既存虫|ハエにも共用候補|
|aquatic_small_prey|既存粒状餌|カクレクマノミ現行粒を共用候補|
|omnivore_food|既存フード皿|意味カテゴリは別、絵柄共用候補|
|milk|ミルクボトル|新規候補|
|neutral_nutrition|中心核＋外輪の中立エネルギー|新規候補。薬・状態マークに見えない単純形|
|water|じょうろ|新規候補。汗の滴と混同しない|
|algae_aquatic_plant|水草3本|新規候補|
|leaf|一枚葉|新規候補|
|nectar|花|新規候補|
|humus|organic_matter|有機物の山＋小片を共用候補|
|organic_nutrients|organic_matter|キノコ専食を示さず有機資源として共用候補|
|decaying_wood_humus|decaying_wood|朽木の断面＋木目|
|tree_sap|sap|幹＋葉＋汁を共用候補|
|plant_sap|sap|同上。意味カテゴリは保持|
|benthic_small_prey|殻状の底生小餌＋粒|新規候補。貝専用の断定を避ける|

## 方針

- 意味カテゴリとSVG絵柄は分離する。同じ絵を共用してもsemantic categoryは潰さない。
- 中立養分はfallbackではなく明示カテゴリ。
- 水は滴単体にせず、汗との混同を避けるためじょうろ。
- キノコの有機養分は朽木専食にしないため、朽木とは別のorganic_matterを第一候補。
- 樹液と植物汁は意味は別だが、視覚上は共用sap候補。
- ハエは既存虫が小表示でハエとして自然なら共用し、専用SVGを増やさない。
- ヤドカリ汎用雑食餌は既存皿を第一候補。
- 水中小餌は既存粒状餌を第一候補。
- runtime接続・新SVG採用は人間確認後。
