# よちよちこねこ表情（cat/02）

ユーザーの続行依頼に基づき、3〜6歳の段階へ10表情を展開。
開始時main: 3f4bfda0b8c0d30098ebb68c4313abd370a8576a。PR #278 HEAD: bafd6f9aadd246081094e892a47a7167fe98fbcf。
Draft維持、mainへマージしない。

## 変更範囲と検証

段階別allowlist、マーク位置、確認ページへ追加。ゲーム数値・閾値・セーブ形式・仲間・恋人・他段階の確定位置は変更しない。
新規4件と全段階の実績演出回帰1件でREDを確認。接続56件、PNG9件がGREEN。
前回の実績達成演出の割り込みテストを全7段階へ拡張。

## 画像と配置

Built-in image_gen / precise-object-editを10枚個別実行。元のcat/02.pngを参照し、小さな座り姿、大きい頭、短い前足、上向きの尾、灰色パレットを維持するよう指示。顔以外の画素は元画像と完全同一ではない。
ImageMagick alpha50%閾値、trim、nearest-neighbor70×80、128×128の[29,40,99,120]へ配置、64色RGBAに正規化。正規化画像を目視確認。
共通SVGの形・色・縁を維持し、通常(-7,18)、呼びかけ(-22,23)、拒否(12,10)へ平行移動。
iPhoneでの見分けやすさ・マーク距離感はユーザー確認待ち。

## 生成記録

### critical
Use case: precise-object-edit. Edit target: supplied original tiny young gray kitten game sprite. Change ONLY facial expression: Eyes nearly closed with barely visible pupils, slack tiny mouth, pale cheeks. Alive but very weak, not horror. Preserve small seated full body, large head, short front paws, gray fur, pale muzzle and chest, ears, and upward curling tail on the right. Same pose, proportions and silhouette. Crisp pixel art with dark pixel outlines, genuine transparent background. Full body centered, no cropping. No extra objects, letters, sweat, icons, symbols, background or shadows. Runtime supplies marks separately. Intended for a small 128x128 sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-774c9fa4-f535-4014-aa8b-92ec14bfd352.png

Asset: assets/characters/expressions/cat/02-critical.png

### happy
Use case: precise-object-edit. Edit target: supplied original tiny young gray kitten game sprite. Change ONLY facial expression: Narrowed upward-arched smiling eyes and a small OPEN joyful grin. Awake and delighted. Preserve small seated full body, large head, short front paws, gray fur, pale muzzle and chest, ears, and upward curling tail on the right. Same pose, proportions and silhouette. Crisp pixel art with dark pixel outlines, genuine transparent background. Full body centered, no cropping. No extra objects, letters, sweat, icons, symbols, background or shadows. Runtime supplies marks separately. Intended for a small 128x128 sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-5ae445f8-2e5b-46f9-8bf9-c58610f85e7f.png

Asset: assets/characters/expressions/cat/02-happy.png

### hungry
Use case: precise-object-edit. Edit target: supplied original tiny young gray kitten game sprite. Change ONLY facial expression: OPEN expectant eyes, gently worried raised brows, tiny round open mouth asking for food. Preserve small seated full body, large head, short front paws, gray fur, pale muzzle and chest, ears, and upward curling tail on the right. Same pose, proportions and silhouette. Crisp pixel art with dark pixel outlines, genuine transparent background. Full body centered, no cropping. No extra objects, letters, sweat, icons, symbols, background or shadows. Runtime supplies marks separately. Intended for a small 128x128 sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-dc7edfc6-e9a9-48f8-8fb2-a616b7f1b02f.png

Asset: assets/characters/expressions/cat/02-hungry.png

### sick
Use case: precise-object-edit. Edit target: supplied original tiny young gray kitten game sprite. Change ONLY facial expression: Pinched-tight eyes, knitted brows and tense tiny wavy mouth. Subtly pale cool forehead, no sweat. Preserve small seated full body, large head, short front paws, gray fur, pale muzzle and chest, ears, and upward curling tail on the right. Same pose, proportions and silhouette. Crisp pixel art with dark pixel outlines, genuine transparent background. Full body centered, no cropping. No extra objects, letters, sweat, icons, symbols, background or shadows. Runtime supplies marks separately. Intended for a small 128x128 sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-c57e901f-2385-4351-b5d4-1b1ea4d41fea.png

Asset: assets/characters/expressions/cat/02-sick.png

### sleeping
Use case: precise-object-edit. Edit target: supplied original tiny young gray kitten game sprite. Change ONLY facial expression: Fully CLOSED relaxed downward eyelid curves, tiny CLOSED mouth with only a faint micro-smile. No broad grin. Preserve small seated full body, large head, short front paws, gray fur, pale muzzle and chest, ears, and upward curling tail on the right. Same pose, proportions and silhouette. Crisp pixel art with dark pixel outlines, genuine transparent background. Full body centered, no cropping. No extra objects, letters, sweat, icons, symbols, background or shadows. Runtime supplies marks separately. Intended for a small 128x128 sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-c3bf7573-eaed-41ff-90b0-577f552da1d2.png

Asset: assets/characters/expressions/cat/02-sleeping.png

### strained
Use case: precise-object-edit. Edit target: supplied original tiny young gray kitten game sprite. Change ONLY facial expression: Uncomfortable refusing expression: half-open eyes, worried knitted brows, tense tiny wavy mouth. No smile. Preserve small seated full body, large head, short front paws, gray fur, pale muzzle and chest, ears, and upward curling tail on the right. Same pose, proportions and silhouette. Crisp pixel art with dark pixel outlines, genuine transparent background. Full body centered, no cropping. No extra objects, letters, sweat, icons, symbols, background or shadows. Runtime supplies marks separately. Intended for a small 128x128 sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-89b5cea1-268f-4395-8c36-f4cc01129219.png

Asset: assets/characters/expressions/cat/02-strained.png

### sulky
Use case: precise-object-edit. Edit target: supplied original tiny young gray kitten game sprite. Change ONLY facial expression: Narrow sideways-looking eyes, lowered brows, tiny pursed downturned mouth. Pouting. Preserve small seated full body, large head, short front paws, gray fur, pale muzzle and chest, ears, and upward curling tail on the right. Same pose, proportions and silhouette. Crisp pixel art with dark pixel outlines, genuine transparent background. Full body centered, no cropping. No extra objects, letters, sweat, icons, symbols, background or shadows. Runtime supplies marks separately. Intended for a small 128x128 sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-be4be581-a137-4ff9-84e7-4d626a811c5e.png

Asset: assets/characters/expressions/cat/02-sulky.png

### tired
Use case: precise-object-edit. Edit target: supplied original tiny young gray kitten game sprite. Change ONLY facial expression: Heavy HALF OPEN eyelids with pupils visible, droopy brows and tiny yawning mouth. Preserve small seated full body, large head, short front paws, gray fur, pale muzzle and chest, ears, and upward curling tail on the right. Same pose, proportions and silhouette. Crisp pixel art with dark pixel outlines, genuine transparent background. Full body centered, no cropping. No extra objects, letters, sweat, icons, symbols, background or shadows. Runtime supplies marks separately. Intended for a small 128x128 sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-8ce4cf0c-4e00-4793-92c7-a1b34fff6b3c.png

Asset: assets/characters/expressions/cat/02-tired.png

### wantsPlay
Use case: precise-object-edit. Edit target: supplied original tiny young gray kitten game sprite. Change ONLY facial expression: Wide OPEN sparkling eyes, raised brows and inviting CLOSED cat-mouth smile, engaging. Preserve small seated full body, large head, short front paws, gray fur, pale muzzle and chest, ears, and upward curling tail on the right. Same pose, proportions and silhouette. Crisp pixel art with dark pixel outlines, genuine transparent background. Full body centered, no cropping. No extra objects, letters, sweat, icons, symbols, background or shadows. Runtime supplies marks separately. Intended for a small 128x128 sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-73d96700-bbeb-4c2d-8f33-91a193dd739f.png

Asset: assets/characters/expressions/cat/02-wantsPlay.png

### weak
Use case: precise-object-edit. Edit target: supplied original tiny young gray kitten game sprite. Change ONLY facial expression: Downward looking eyes, drooping worried brows, tiny downturned mouth, muted cheeks. Preserve small seated full body, large head, short front paws, gray fur, pale muzzle and chest, ears, and upward curling tail on the right. Same pose, proportions and silhouette. Crisp pixel art with dark pixel outlines, genuine transparent background. Full body centered, no cropping. No extra objects, letters, sweat, icons, symbols, background or shadows. Runtime supplies marks separately. Intended for a small 128x128 sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-a0b04cca-31bb-4550-9db7-53156e818c65.png

Asset: assets/characters/expressions/cat/02-weak.png


## 最終検証

npm test: 714 passed / 0 failed、終了コード0。git diff --check成功。iPhone最終確認待ち。
