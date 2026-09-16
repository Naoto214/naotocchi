# 若いねこ表情（cat/05）

ユーザーがおてんばねこの銀色マーク位置を承認し、続きを依頼。16〜21歳の次段階へ10表情を展開。
開始時main: 3f4bfda0b8c0d30098ebb68c4313abd370a8576a。
開始時PR #278 HEAD: c1e0af7caa52563343762d19f8a0d62da7f86c76。Draft維持、mainへマージしない。

## 手順・範囲

1. 段階別の画像対応、マーク位置、実行時描画、確認ページ、画像の透明境界をテストで先に検証。
2. cat/05の10表情を元画像から生成し、段階別allowlistへ追加。
3. 確認ページの姿選択に「若いねこ」を追加。
4. focused tests、npm test、画像目視、cache bump、差分確認後、既存PRと確認ページを更新。

状態閾値、ゲーム数値、セーブ形式、仲間・恋人は変更しない。確定済みcat/03、04、06の画像とマーク位置を保持。
cat/04の銀色拒否マークは(0,9)をユーザー承認済みとして維持。

## 画像と配置

Built-in image_gen / precise-object-edit。毎回cat/05.pngを参照。
若い細身の体型、四本足で立つ姿、左上の顔、白い口元と胸、右側の巻いた尾を保持するよう指定。
顔のみを変える指示だが、生成画像の顔以外の画素は元画像と完全同一ではない。
喜びは細めた上向きの笑い目と開いた笑顔。睡眠は下向きの閉じた目とわずかな閉じた微笑。
ImageMagickでalpha50%閾値、trim、nearest-neighbor94×105、128×128の[17,15,111,120]へ配置、64色RGBAへ正規化。
既存SVGマークの形・色・縁は共通。左上の頭に合わせ、通常(-12,-4)、呼びかけ(-24,-2)、拒否(10,-17)へ移動。
通常顔は元画像を使用。

## 検証

実装前に新規4テストの失敗を確認。画像を除く接続focused testsは46成功。
若いねこの表情とマーク距離感はiPhoneでユーザー確認待ち。

## 個別生成記録

- critical: Both eyes nearly closed with barely visible pupils, slack tiny mouth, pale cheeks. Alive but very weak, not horror.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-86835cf4-c9c4-47ec-8414-197824d094cc.png
  - Asset: assets/characters/expressions/cat/05-critical.png
- happy: Both eyes narrowed into upward-arched smiling curves, cheeks raised and small OPEN joyful grin. Awake and delighted.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-73deacf4-a46d-4e9e-9f1e-e63a48b69c51.png
  - Asset: assets/characters/expressions/cat/05-happy.png
- hungry: Both eyes OPEN, alert and expectant, gently worried raised brows, tiny round open mouth asking for food.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-475cf9b6-2bae-4483-836b-5f90173a70fc.png
  - Asset: assets/characters/expressions/cat/05-hungry.png
- sick: Both eyes pinched tight, knitted brows, tiny tense wavy mouth; subtly cool pale forehead. No sweat baked in.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-02987eda-89b2-4014-9e55-142491713877.png
  - Asset: assets/characters/expressions/cat/05-sick.png
- sleeping: Both eyes fully CLOSED as relaxed downward eyelid curves, tiny CLOSED mouth with a faint micro-smile. Calm sleep, not a broad joyful grin.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-db5aa284-de0e-4150-8818-93fdc977700c.png
  - Asset: assets/characters/expressions/cat/05-sleeping.png
- strained: Uncomfortable refusing expression: half-open eyes, knitted worried brows, tense tiny wavy mouth. No smile.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-08124385-4b80-4b08-b8f8-6965c9eb3888.png
  - Asset: assets/characters/expressions/cat/05-strained.png
- sulky: Pouting and displeased: narrowed sideways-looking eyes, lowered brows, tiny pursed downturned mouth.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-e3f1156e-8358-4b74-8ecf-c8b431673ab7.png
  - Asset: assets/characters/expressions/cat/05-sulky.png
- tired: Both eyelids heavy and HALF OPEN with small pupils visible, droopy brows, tiny yawning mouth.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-e881f20d-c7b7-40e8-bffa-295d06eb10d8.png
  - Asset: assets/characters/expressions/cat/05-tired.png
- wantsPlay: Both eyes wide open and sparkling, raised brows, inviting CLOSED cat-mouth smile, alert and engaging.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-da3d9732-659f-44b9-aa64-a6f2a1dff363.png
  - Asset: assets/characters/expressions/cat/05-wantsPlay.png
- weak: Both eyes open but downward looking, drooping worried brows, tiny downturned mouth, muted cheeks.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-c8357cbc-15d8-43c3-abc0-d02e8fb86f1e.png
  - Asset: assets/characters/expressions/cat/05-weak.png

最終 npm test: 701 passed / 0 failed。128×128 RGBA、透明境界、10枚の別画像性も検証。正規化画像を目視確認済み。iPhoneの視認性判定は未実施。
