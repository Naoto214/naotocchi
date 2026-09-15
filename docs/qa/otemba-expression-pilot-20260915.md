# おてんばねこ表情（cat/04）

ユーザーがこねこの10表情と「かまって」の位置を承認し、続きを依頼。次の12〜15歳段階へ展開する。
開始時main: 3f4bfda0b8c0d30098ebb68c4313abd370a8576a。
開始時PR #278 HEAD: a6f34e311eeedec5b9e5a0168af398d11755f884。Draft維持、mainへマージしない。

## 範囲と手順

1. 段階別の画像対応、マークの頭への追従、実行時表情、確認ページ、画像の透明範囲を失敗テストで確認。
2. cat/04の10表情を元画像から個別生成し、段階別allowlistへ追加。
3. 確認ページに「おてんばねこ」を追加。元の姿／成猫／こねこの切り替えと保存分離を保持。
4. focused tests、npm test、画像目視、cache bump、差分確認後に既存PRと確認ページを更新。

ゲーム数値、状態閾値、セーブ形式、他系統、仲間・恋人の表示は変更しない。
こねこの承認済み「かまって」位置を保持。

## アートと位置

Built-in image_gen、precise-object-edit。各回cat/04.pngを参照し、元の横長の姿、左側の頭、伸ばした前足、灰色パレット、右側の巻いた尾を保持するよう指示。
元画像のウインクを各表情に応じた両目へ変更。喜びは目を細めて開いた笑顔、睡眠は閉眼とわずかな閉じた微笑。
生成画像の顔以外の画素は元画像と完全同一ではない。
ImageMagickでalpha50%閾値、trim、nearest-neighbor112×82、128×128の[8,38,120,120]へ配置、64色RGBAへ正規化。
マークは既存SVGの色・形・縁を使用。頭が左下にあるため、通常マークはSVG内で(-22,8)、呼びかけは(-32,18)、拒否は(0,5)だけ平行移動する。

## 検証状況

実装前に新規4テストの失敗を確認。画像が揃う前の接続focused testsは42成功。
おてんばねこの実機での見分けやすさと、マーク・汗の位置はユーザー確認待ち。

## 個別生成記録

- critical: Both eyes nearly closed with barely visible pupils, slack tiny mouth, pale cheeks. Alive but very weak, not horror.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-b797bc17-e1f1-4a9a-86a6-0fddce9f4e80.png
  - Asset: assets/characters/expressions/cat/04-critical.png
- happy: Both eyes narrowed into upward-arched smiling curves, cheeks raised and small OPEN joyful grin. Awake and delighted.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-6c4c6620-5e1e-4233-8130-c7fb55fe48a7.png
  - Asset: assets/characters/expressions/cat/04-happy.png
- hungry: Both eyes OPEN, alert and expectant, gently worried raised brows, tiny round open mouth asking for food.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-a0bb0d95-7522-45e4-b1f3-01a96002c3ae.png
  - Asset: assets/characters/expressions/cat/04-hungry.png
- sick: Both eyes pinched tight, knitted brows, tiny tense wavy mouth; cool pale forehead. No sweat baked in.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-86b23704-4b76-40de-9f29-e0a25bc719ce.png
  - Asset: assets/characters/expressions/cat/04-sick.png
- sleeping: Both eyes fully CLOSED as relaxed downward eyelid curves, tiny CLOSED mouth with a faint micro-smile. Calm sleep, not a broad joyful grin.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-43b85ae5-6394-4b87-9675-f9f58eed304b.png
  - Asset: assets/characters/expressions/cat/04-sleeping.png
- strained: Uncomfortable refusing expression: half-open eyes, knitted worried brows, tense tiny wavy mouth. No smile.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-0ea69ec3-18c2-4f10-93fe-10d89f6152db.png
  - Asset: assets/characters/expressions/cat/04-strained.png
- sulky: Pouting and displeased: narrowed sideways-looking eyes, lowered brows, tiny pursed downturned mouth.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-9cffbf25-edf2-41e8-935b-3823903ecaa4.png
  - Asset: assets/characters/expressions/cat/04-sulky.png
- tired: Both eyelids heavy and HALF OPEN with small pupils visible, droopy brows, tiny yawning mouth.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-57538604-dad5-4a01-a0ea-55db76f7a7e2.png
  - Asset: assets/characters/expressions/cat/04-tired.png
- wantsPlay: Both eyes wide open and sparkling, raised brows, inviting CLOSED cat-mouth smile, alert and engaging.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-d1d582bb-0102-44c1-88b8-982dd7044025.png
  - Asset: assets/characters/expressions/cat/04-wantsPlay.png
- weak: Both eyes open but downward looking, drooping worried brows, tiny downturned mouth, muted cheeks.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-31fdb7c2-2840-44e9-aadb-26386d131a10.png
  - Asset: assets/characters/expressions/cat/04-weak.png

最終検証: npm test 696 passed / 0 failed。128×128・RGBA・透明境界・10枚の別画像性を検証し、正規化した10表情も目視確認。iPhone確認は未実施。
