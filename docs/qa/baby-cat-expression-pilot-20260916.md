# あかちゃんねこ表情（cat/01）

ユーザーの続行依頼に基づき0〜2歳の最初の段階へ10表情を展開。開始時main: 3f4bfda0b8c0d30098ebb68c4313abd370a8576a。PR #278 HEAD: d2391296bcd1453efed75e52326c5d76b37f8309。Draft維持、main未マージ。

## 範囲と検証

限定allowlist・段階別マーク位置・確認ページを追加。ゲーム数値、閾値、セーブ形式、仲間、恋人、他段階の確定位置は変更しない。
新規4件と全段階実績演出回帰1件でRED確認。接続59件・PNG10件がGREEN。実績演出の割り込み検証は猫の全8段階を対象。

## アート

Built-in image_gen / precise-object-editで10枚個別生成。元のcat/01.pngを参照し、伏せた丸い小さな体、小さな折れ耳、前足、右側の丸い尾、灰色パレットを保持するよう指示。顔以外の画素は元絵と完全同一ではない。
ImageMagick alpha50%閾値、trim、nearest-neighbor64×47、128×128の[32,73,96,120]へ配置、64色RGBAに正規化。正規化画像を目視確認。
共通SVG形・色・縁を保持。通常(-13,38)、呼びかけ(-28,43)、拒否(12,36)へ移動。
iPhoneでの視認性とマークの距離感はユーザー確認待ち。

## 生成記録

### critical
Use case: precise-object-edit. Edit target: supplied original newborn gray kitten game sprite. Change ONLY facial expression: Eyes nearly closed with barely visible pupils, slack tiny mouth, pale cheeks. Alive but very weak, not horror. Preserve the extremely small low lying curled baby body, rounded head, tiny tucked front paws, small folded ears, gray fur and pale muzzle, and curled tail hugging body on the right. Keep the SAME low crouched pose and wide short silhouette. DO NOT turn into upright seated older kitten. Crisp outlined pixel art, genuine transparent background. Full body, no cropping. No objects, letters, sweat, icons, symbols, background or shadows. Runtime provides state marks. For 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-500d2131-879f-42b3-abb8-f225220843d4.png

Asset: assets/characters/expressions/cat/01-critical.png

### happy
Use case: precise-object-edit. Edit target: supplied original newborn gray kitten game sprite. Change ONLY facial expression: Narrow upward-arched smiling eyes and a tiny OPEN joyful grin. Awake and delighted. Preserve the extremely small low lying curled baby body, rounded head, tiny tucked front paws, small folded ears, gray fur and pale muzzle, and curled tail hugging body on the right. Keep the SAME low crouched pose and wide short silhouette. DO NOT turn into upright seated older kitten. Crisp outlined pixel art, genuine transparent background. Full body, no cropping. No objects, letters, sweat, icons, symbols, background or shadows. Runtime provides state marks. For 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-ced47b20-1b9b-47d3-a907-93f2e7ede2ca.png

Asset: assets/characters/expressions/cat/01-happy.png

### hungry
Use case: precise-object-edit. Edit target: supplied original newborn gray kitten game sprite. Change ONLY facial expression: OPEN expectant eyes, gently worried raised brows, tiny round open mouth asking for food. Preserve the extremely small low lying curled baby body, rounded head, tiny tucked front paws, small folded ears, gray fur and pale muzzle, and curled tail hugging body on the right. Keep the SAME low crouched pose and wide short silhouette. DO NOT turn into upright seated older kitten. Crisp outlined pixel art, genuine transparent background. Full body, no cropping. No objects, letters, sweat, icons, symbols, background or shadows. Runtime provides state marks. For 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-e530a13a-bb04-41b1-999f-f26863f9929b.png

Asset: assets/characters/expressions/cat/01-hungry.png

### sick
Use case: precise-object-edit. Edit target: supplied original newborn gray kitten game sprite. Change ONLY facial expression: Pinched-tight eyes, knitted brows and tense tiny wavy mouth. Subtly pale cool forehead, no sweat. Preserve the extremely small low lying curled baby body, rounded head, tiny tucked front paws, small folded ears, gray fur and pale muzzle, and curled tail hugging body on the right. Keep the SAME low crouched pose and wide short silhouette. DO NOT turn into upright seated older kitten. Crisp outlined pixel art, genuine transparent background. Full body, no cropping. No objects, letters, sweat, icons, symbols, background or shadows. Runtime provides state marks. For 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-98fdbe88-7547-4db9-8d7f-d3f01a065965.png

Asset: assets/characters/expressions/cat/01-sick.png

### sleeping
Use case: precise-object-edit. Edit target: supplied original newborn gray kitten game sprite. Change ONLY facial expression: Fully CLOSED relaxed downward eyelid curves, tiny CLOSED mouth with only a faint micro-smile. No broad grin. Preserve the extremely small low lying curled baby body, rounded head, tiny tucked front paws, small folded ears, gray fur and pale muzzle, and curled tail hugging body on the right. Keep the SAME low crouched pose and wide short silhouette. DO NOT turn into upright seated older kitten. Crisp outlined pixel art, genuine transparent background. Full body, no cropping. No objects, letters, sweat, icons, symbols, background or shadows. Runtime provides state marks. For 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-811cf397-4d15-4291-b2c2-173f80d87abf.png

Asset: assets/characters/expressions/cat/01-sleeping.png

### strained
Use case: precise-object-edit. Edit target: supplied original newborn gray kitten game sprite. Change ONLY facial expression: Uncomfortable refusing expression: half-open eyes, worried knitted brows, tense tiny wavy mouth. No smile. Preserve the extremely small low lying curled baby body, rounded head, tiny tucked front paws, small folded ears, gray fur and pale muzzle, and curled tail hugging body on the right. Keep the SAME low crouched pose and wide short silhouette. DO NOT turn into upright seated older kitten. Crisp outlined pixel art, genuine transparent background. Full body, no cropping. No objects, letters, sweat, icons, symbols, background or shadows. Runtime provides state marks. For 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-97c00039-b1fe-4e32-bef0-946978aad307.png

Asset: assets/characters/expressions/cat/01-strained.png

### sulky
Use case: precise-object-edit. Edit target: supplied original newborn gray kitten game sprite. Change ONLY facial expression: Narrow sideways-looking eyes, lowered brows, tiny pursed downturned mouth. Pouting. Preserve the extremely small low lying curled baby body, rounded head, tiny tucked front paws, small folded ears, gray fur and pale muzzle, and curled tail hugging body on the right. Keep the SAME low crouched pose and wide short silhouette. DO NOT turn into upright seated older kitten. Crisp outlined pixel art, genuine transparent background. Full body, no cropping. No objects, letters, sweat, icons, symbols, background or shadows. Runtime provides state marks. For 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-8db8a2c4-9ba0-4872-a259-60252ddc5996.png

Asset: assets/characters/expressions/cat/01-sulky.png

### tired
Use case: precise-object-edit. Edit target: supplied original newborn gray kitten game sprite. Change ONLY facial expression: Heavy HALF OPEN eyelids with pupils visible, droopy brows and tiny yawning mouth. Preserve the extremely small low lying curled baby body, rounded head, tiny tucked front paws, small folded ears, gray fur and pale muzzle, and curled tail hugging body on the right. Keep the SAME low crouched pose and wide short silhouette. DO NOT turn into upright seated older kitten. Crisp outlined pixel art, genuine transparent background. Full body, no cropping. No objects, letters, sweat, icons, symbols, background or shadows. Runtime provides state marks. For 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-015a6140-9301-43e7-b51c-1cd35d35069a.png

Asset: assets/characters/expressions/cat/01-tired.png

### wantsPlay
Use case: precise-object-edit. Edit target: supplied original newborn gray kitten game sprite. Change ONLY facial expression: Wide OPEN sparkling eyes, raised brows and inviting CLOSED cat-mouth smile, engaging. Preserve the extremely small low lying curled baby body, rounded head, tiny tucked front paws, small folded ears, gray fur and pale muzzle, and curled tail hugging body on the right. Keep the SAME low crouched pose and wide short silhouette. DO NOT turn into upright seated older kitten. Crisp outlined pixel art, genuine transparent background. Full body, no cropping. No objects, letters, sweat, icons, symbols, background or shadows. Runtime provides state marks. For 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-f5068e5a-6542-41b0-8222-028066b5171b.png

Asset: assets/characters/expressions/cat/01-wantsPlay.png

### weak
Use case: precise-object-edit. Edit target: supplied original newborn gray kitten game sprite. Change ONLY facial expression: Downward looking eyes, drooping worried brows, tiny downturned mouth, muted cheeks. Preserve the extremely small low lying curled baby body, rounded head, tiny tucked front paws, small folded ears, gray fur and pale muzzle, and curled tail hugging body on the right. Keep the SAME low crouched pose and wide short silhouette. DO NOT turn into upright seated older kitten. Crisp outlined pixel art, genuine transparent background. Full body, no cropping. No objects, letters, sweat, icons, symbols, background or shadows. Runtime provides state marks. For 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-9985d80f-02ab-462f-981a-12bc96306358.png

Asset: assets/characters/expressions/cat/01-weak.png


## 最終検証

npm test: 718 passed / 0 failed、終了コード0。git diff --check成功。iPhoneの最終視認性はユーザー確認待ち。
