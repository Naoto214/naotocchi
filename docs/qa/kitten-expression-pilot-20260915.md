# こねこ表情パイロット（cat/03）

ユーザー承認に基づき、確定済み成猫の次に7〜11歳のこねこ段階へ10表情を展開。
通常は元の assets/characters/cat/03.png を使う。猫のほかの6段階、他系統、仲間・恋人は対象外。

## 実装

pet-expression.js の段階別allowlistにcat/03を追加。成猫の確定したv3喜び・睡眠を含む既存画像対応を保持。
状態判定、回復量、ゲーム数値、セーブ形式は変更しない。マークとその色は成猫と共通で、猫の空腹は魚。
確認ページは姿の選択（こねこ／大人のねこ）を追加し、選択後も子iframe内の使い捨てセーブだけを再初期化。
喜びと拒否はこれまでどおり実際のお世話操作で確認する。自動クリックしない。

## アート

Built-in image_gen precise-object-editで元のcat/03を各回参照し、10枚を個別生成。
共通指定：顔だけ変更し、幼い大きめの頭・小さな体・短い足・耳・尾・灰色パレット・ピクセルアートの輪郭をできるだけ保持。背景透過、文字・小道具・汗・状態マークを焼き込まない。
生成画像は顔以外の画素も元画像と完全同一ではない。画像の不透明範囲を元の86×92、座標[21,28,107,120]へ合わせる。
ImageMagickでalpha50%閾値、透明余白trim、nearest-neighbor86×92、透明128×128へ配置、64色、RGBA PNG。

## 検証

段階別パス、実際の描画・喜び・睡眠・成猫への遷移、保存不変、プレビュー分離と姿の切り替えを検証。
新規接続テストは実装前3失敗を確認。画像の存在・透過・範囲テストは追加前1失敗を確認。
こねこ10表情のiPhoneでの視認性とアクセント位置はユーザー確認待ち。

## 生成記録

- critical: Almost closed eyes with tiny barely visible pupils, slack tiny mouth and pale cheeks. Alive but very weak, quiet, not horror, no crosses.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-e7975353-ad97-4d08-8dd0-30c200bff769.png
  - Asset: assets/characters/expressions/cat/03-critical.png
- happy: Narrow upward-arched smiling eyes, cheeks raised, small OPEN joyful grin. Awake delighted expression, no round open pupils.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-7b8d9ae3-5c3f-40cc-9beb-4935fbb4b818.png
  - Asset: assets/characters/expressions/cat/03-happy.png
- hungry: Alert expectant open eyes, gently raised worried brows, tiny round open mouth asking for food. Not smiling, not sleepy.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-3659e283-8f09-4fff-b8e1-0589675aaae6.png
  - Asset: assets/characters/expressions/cat/03-hungry.png
- sick: Pinched eyes, knitted brows, tiny tense wavy mouth, subtly pale cool forehead. Ill but cute; NO sweat baked into image.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-243c6683-0152-4f85-9f1f-5a3e4ce57692.png
  - Asset: assets/characters/expressions/cat/03-sick.png
- sleeping: Fully closed relaxed DOWNWARD eyelid curves, tiny CLOSED mouth with faintest micro-smile, relaxed cheeks. Peaceful sleep, not broad happy grin.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-dfa4bc86-3624-499e-9e57-18271a1be582.png
  - Asset: assets/characters/expressions/cat/03-sleeping.png
- strained: Uncomfortable refusing face: lowered half-open eyes and knitted brows, tense tiny wavy mouth. No smile, not asleep.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-c2aa6d2a-2a9b-47f3-965f-9e1700c21006.png
  - Asset: assets/characters/expressions/cat/03-strained.png
- sulky: Pouting sulky expression: narrowed eyes looking sideways, slightly lowered brows and a tiny pursed downturned mouth. Displeased, no smile.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-6ba4fbe8-a021-4e46-9c0f-b598059df974.png
  - Asset: assets/characters/expressions/cat/03-sulky.png
- tired: Heavy HALF OPEN eyelids with small visible pupils, droopy relaxed brows, tiny yawning mouth. Sleepy but awake.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-e0e49d3b-4fc1-4776-853a-cfab193416d0.png
  - Asset: assets/characters/expressions/cat/03-tired.png
- wantsPlay: Wide lively sparkling eyes looking at viewer, inviting CLOSED cat-mouth smile, raised brows, alert engaging face.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-bed3877c-54e7-4ac9-ba50-c94e5797cb22.png
  - Asset: assets/characters/expressions/cat/03-wantsPlay.png
- weak: Weak downward-looking small pupils, drooping brows, tiny downturned mouth, muted cheeks. Visibly weak, not angry.
  - Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-d859bc1c-7ae9-45b2-b2f5-35c779439eed.png
  - Asset: assets/characters/expressions/cat/03-weak.png

最終 npm test: 691 passed / 0 failed。画像10枚の透明範囲・別画像性を含む。
