# 落ちついたねこ表情（cat/07）

ユーザーの続行依頼に基づき、40〜69歳の段階へ10表情を展開。
開始時main: 3f4bfda0b8c0d30098ebb68c4313abd370a8576a。
開始時PR #278 HEAD: c2b9a713e022fae689405374b6dc41817e79814a。Draft維持、mainへマージしない。

## 範囲と手順

1. 段階別対応、実行時描画、マーク位置、確認ページ、PNG透明境界のテストを先に追加してRED確認。
2. cat/07元画像を参照して10表情を生成し、限定allowlistへ追加。
3. 確認ページに「落ちついたねこ」を追加。
4. focused tests、npm test、画像目視、cache bump、差分確認後に既存PRと確認ページへ反映。

閾値・ゲーム数値・セーブ形式・仲間・恋人は変更しない。cat/03〜06の表情と直近のマーク位置を保持。

## アートと位置

Built-in image_gen / precise-object-edit。各回cat/07.pngを参照。成熟した丸みのある座り姿、前足、白い口元・胸、足元の右側へ巻いた低い尾、灰色パレットを保持するよう指示。
顔だけを変える指示だが、生成画像の顔以外の画素は元画像と完全同一ではない。
通常の細い目と疲労を区別するため、疲労はさらに重いまぶたと小さなあくび。喜びは細い上向きの笑い目と開いた笑顔、睡眠は下向きの閉じ目とわずかな閉じた微笑。
ImageMagickでalpha50%閾値、trim、nearest-neighbor91×106、128×128の[18,14,109,120]へ配置、64色RGBAへ正規化。
共通SVGマークの形・色・縁を保持し、通常(-4,0)、呼びかけ(-18,3)、拒否(10,-8)へ平行移動。

## 検証

実装前の新規4テストでRED確認。画像を除く接続focused testsは50成功。
iPhoneでの見分けやすさとマーク距離感はユーザー確認待ち。

## 個別生成記録

- critical: Both eyes nearly closed with barely visible pupils, slack tiny mouth, pale cheeks. Alive but very weak, not horror.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-9d5bb77a-6e55-42fb-aae8-332c63f646ad.png
  - Asset: assets/characters/expressions/cat/07-critical.png
- happy: Both eyes narrowed into upward-arched smiling curves, cheeks raised and small OPEN joyful grin. Awake and delighted.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-c26724fd-427b-46f5-9e73-a4da983d25fc.png
  - Asset: assets/characters/expressions/cat/07-happy.png
- hungry: Both eyes OPEN, alert and expectant, gently worried raised brows, tiny round open mouth asking for food.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-5e46d333-ac5b-4573-b6e4-511a350211e8.png
  - Asset: assets/characters/expressions/cat/07-hungry.png
- sick: Both eyes pinched tight, knitted brows, tiny tense wavy mouth; subtly cool pale forehead. No sweat baked in.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-9bc761e8-4c90-44d8-b99a-1cf001ebefdd.png
  - Asset: assets/characters/expressions/cat/07-sick.png
- sleeping: Both eyes fully CLOSED as relaxed downward eyelid curves, tiny CLOSED mouth with a faint micro-smile. Calm sleep, not a broad joyful grin.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-8b19dc2a-2412-4f5b-895e-2372f01b617a.png
  - Asset: assets/characters/expressions/cat/07-sleeping.png
- strained: Uncomfortable refusing expression: half-open eyes, knitted worried brows, tense tiny wavy mouth. No smile.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-3b653e0a-18be-4776-9030-ec48dcc4becc.png
  - Asset: assets/characters/expressions/cat/07-strained.png
- sulky: Pouting and displeased: narrowed sideways-looking eyes, lowered brows, tiny pursed downturned mouth.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-69991256-66d8-4223-b30a-0b0a83449d9d.png
  - Asset: assets/characters/expressions/cat/07-sulky.png
- tired: Both eyelids very heavy and HALF OPEN with small pupils visible, droopy brows, tiny yawning mouth. Clearly more tired than original neutral face.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-e8728257-c6af-4729-8f43-03367d7c1b5d.png
  - Asset: assets/characters/expressions/cat/07-tired.png
- wantsPlay: Both eyes wide open and sparkling, raised brows, inviting CLOSED cat-mouth smile, alert and engaging.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-5479f68f-695c-4515-92fc-5ec6334b63fe.png
  - Asset: assets/characters/expressions/cat/07-wantsPlay.png
- weak: Both eyes downward looking, drooping worried brows, tiny downturned mouth, muted cheeks.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-64d51dc1-6253-4057-8bcb-6d22566f5ab9.png
  - Asset: assets/characters/expressions/cat/07-weak.png

初回npm testはdialogueテスト途中でエラー詳細なしに終了コード1。visual-qa単独は成功。原因を断定せずnpm testを再実行して結果確認。

再実行の最終 npm test: 706 passed / 0 failed。128×128 RGBA、透明境界、10枚の別画像性も検証。正規化画像を目視確認済み。iPhoneの視認性判定は未実施。
