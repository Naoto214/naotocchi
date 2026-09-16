# おとしよりのねこ表情（cat/08）

ユーザーの続行依頼に基づき、70歳以降の段階へ10表情を展開。直前のcat/07はユーザー承認済み。
開始時main: 3f4bfda0b8c0d30098ebb68c4313abd370a8576a。PR #278 HEAD: c654a64ebb42d43ad653447beeb741e8891cdba2。
Draft維持、mainにはマージしない。

## 範囲

既存の限定allowlistと段階別SVG位置調整にcat/08を追加し、確認ページの選択肢を追加。
閾値・ゲーム数値・セーブ形式・仲間・恋人・他段階の確定位置は変更しない。
新規4テストで未対応のREDを確認。透明範囲のテスト期待値を実画像の排他的境界に修正し、10種未対応による失敗を再確認後に実装。
接続focused tests 53件、PNG検証8件成功。

## アート

Built-in image_gen / precise-object-edit を10枚別々に実行。cat/08原画を参照し、丸くうずくまった体、前足、白い口元・額、右側の尾、灰色パレットを保持するよう指示。顔以外の画素は元画像と完全一致ではない。
喜びは上向きの笑い目と開いた笑顔。睡眠は下向きの閉じ目とごく小さい閉じた微笑。通常との区別のため疲労は重い半目とあくび。
ImageMagickでalpha50%閾値、trim、nearest-neighbor100×98、128×128の[14,22,114,120]へ配置、64色RGBAへ正規化。
共通SVGの形・色・縁を維持。通常(-6,6)、呼びかけ(-20,9)、拒否(8,-2)へ平行移動。
正規化画像を目視確認。iPhoneでの表情・マーク距離感はユーザー確認待ち。

## 生成プロンプトと出力

### critical
Use case: precise-object-edit. Edit target: supplied original pixel-art elderly gray cat game sprite. Change ONLY facial expression: Both eyes nearly closed with barely visible pupils, slack tiny mouth, pale cheeks. Alive but very weak, not horror. Preserve the rounded crouched/loaf body, small tucked front paws, gray fur, pale muzzle and forehead tufts, ears, and curled fluffy tail on the right, exactly the same pose and silhouette as reference. Crisp pixel art with dark pixel outlines, authentic transparent background. Full body centered, no cropping. No extra objects, marks, letters, sweat, symbols or shadows. Runtime overlays marks separately. This will become a 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-6800d629-06bd-403a-9574-7bb96ef29ed7.png

Asset: assets/characters/expressions/cat/08-critical.png

### happy
Use case: precise-object-edit. Edit target: supplied original pixel-art elderly gray cat game sprite. Change ONLY facial expression: Both eyes narrowed into upward-arched smiling curves, cheeks raised and small OPEN joyful grin. Awake and delighted. Preserve the rounded crouched/loaf body, small tucked front paws, gray fur, pale muzzle and forehead tufts, ears, and curled fluffy tail on the right, exactly the same pose and silhouette as reference. Crisp pixel art with dark pixel outlines, authentic transparent background. Full body centered, no cropping. No extra objects, marks, letters, sweat, symbols or shadows. Runtime overlays marks separately. This will become a 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-4a459b8e-85b9-4d93-8424-0291392a80d2.png

Asset: assets/characters/expressions/cat/08-happy.png

### hungry
Use case: precise-object-edit. Edit target: supplied original pixel-art elderly gray cat game sprite. Change ONLY facial expression: Both eyes OPEN, alert and expectant, gently worried raised brows, tiny round open mouth asking for food. Preserve the rounded crouched/loaf body, small tucked front paws, gray fur, pale muzzle and forehead tufts, ears, and curled fluffy tail on the right, exactly the same pose and silhouette as reference. Crisp pixel art with dark pixel outlines, authentic transparent background. Full body centered, no cropping. No extra objects, marks, letters, sweat, symbols or shadows. Runtime overlays marks separately. This will become a 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-6734c00f-b17f-43c5-bf96-a3defb192d4b.png

Asset: assets/characters/expressions/cat/08-hungry.png

### sick
Use case: precise-object-edit. Edit target: supplied original pixel-art elderly gray cat game sprite. Change ONLY facial expression: Both eyes pinched tight, knitted brows, tiny tense wavy mouth; subtly cool pale forehead. No sweat baked in. Preserve the rounded crouched/loaf body, small tucked front paws, gray fur, pale muzzle and forehead tufts, ears, and curled fluffy tail on the right, exactly the same pose and silhouette as reference. Crisp pixel art with dark pixel outlines, authentic transparent background. Full body centered, no cropping. No extra objects, marks, letters, sweat, symbols or shadows. Runtime overlays marks separately. This will become a 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-c35b42d7-84b2-4c7f-b1a0-ee034ce9f8a4.png

Asset: assets/characters/expressions/cat/08-sick.png

### sleeping
Use case: precise-object-edit. Edit target: supplied original pixel-art elderly gray cat game sprite. Change ONLY facial expression: Both eyes fully CLOSED as relaxed downward eyelid curves, tiny CLOSED mouth with a faint micro-smile. Calm sleep, not a broad joyful grin. Preserve the rounded crouched/loaf body, small tucked front paws, gray fur, pale muzzle and forehead tufts, ears, and curled fluffy tail on the right, exactly the same pose and silhouette as reference. Crisp pixel art with dark pixel outlines, authentic transparent background. Full body centered, no cropping. No extra objects, marks, letters, sweat, symbols or shadows. Runtime overlays marks separately. This will become a 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-04b7c958-9eaf-44dc-afbb-8a9c0a26b171.png

Asset: assets/characters/expressions/cat/08-sleeping.png

### strained
Use case: precise-object-edit. Edit target: supplied original pixel-art elderly gray cat game sprite. Change ONLY facial expression: Uncomfortable refusing expression: half-open eyes, knitted worried brows, tense tiny wavy mouth. No smile. Preserve the rounded crouched/loaf body, small tucked front paws, gray fur, pale muzzle and forehead tufts, ears, and curled fluffy tail on the right, exactly the same pose and silhouette as reference. Crisp pixel art with dark pixel outlines, authentic transparent background. Full body centered, no cropping. No extra objects, marks, letters, sweat, symbols or shadows. Runtime overlays marks separately. This will become a 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-8d37d4cb-974d-4810-aafe-9de8472d3078.png

Asset: assets/characters/expressions/cat/08-strained.png

### sulky
Use case: precise-object-edit. Edit target: supplied original pixel-art elderly gray cat game sprite. Change ONLY facial expression: Pouting and displeased: narrowed sideways-looking eyes, lowered brows, tiny pursed downturned mouth. Preserve the rounded crouched/loaf body, small tucked front paws, gray fur, pale muzzle and forehead tufts, ears, and curled fluffy tail on the right, exactly the same pose and silhouette as reference. Crisp pixel art with dark pixel outlines, authentic transparent background. Full body centered, no cropping. No extra objects, marks, letters, sweat, symbols or shadows. Runtime overlays marks separately. This will become a 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-09afa69f-82e9-41b1-8dfa-32988eb0dd4f.png

Asset: assets/characters/expressions/cat/08-sulky.png

### tired
Use case: precise-object-edit. Edit target: supplied original pixel-art elderly gray cat game sprite. Change ONLY facial expression: Both eyelids very heavy and HALF OPEN with small pupils visible, droopy brows, tiny yawning mouth. Preserve the rounded crouched/loaf body, small tucked front paws, gray fur, pale muzzle and forehead tufts, ears, and curled fluffy tail on the right, exactly the same pose and silhouette as reference. Crisp pixel art with dark pixel outlines, authentic transparent background. Full body centered, no cropping. No extra objects, marks, letters, sweat, symbols or shadows. Runtime overlays marks separately. This will become a 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-3b5dc173-027c-4df6-a44b-d3adfb27d873.png

Asset: assets/characters/expressions/cat/08-tired.png

### wantsPlay
Use case: precise-object-edit. Edit target: supplied original pixel-art elderly gray cat game sprite. Change ONLY facial expression: Both eyes wide open and sparkling, raised brows, inviting CLOSED cat-mouth smile, alert and engaging. Preserve the rounded crouched/loaf body, small tucked front paws, gray fur, pale muzzle and forehead tufts, ears, and curled fluffy tail on the right, exactly the same pose and silhouette as reference. Crisp pixel art with dark pixel outlines, authentic transparent background. Full body centered, no cropping. No extra objects, marks, letters, sweat, symbols or shadows. Runtime overlays marks separately. This will become a 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-89e72288-262f-4404-8eab-8884b991e7a3.png

Asset: assets/characters/expressions/cat/08-wantsPlay.png

### weak
Use case: precise-object-edit. Edit target: supplied original pixel-art elderly gray cat game sprite. Change ONLY facial expression: Both eyes downward looking, drooping worried brows, tiny downturned mouth, muted cheeks. Preserve the rounded crouched/loaf body, small tucked front paws, gray fur, pale muzzle and forehead tufts, ears, and curled fluffy tail on the right, exactly the same pose and silhouette as reference. Crisp pixel art with dark pixel outlines, authentic transparent background. Full body centered, no cropping. No extra objects, marks, letters, sweat, symbols or shadows. Runtime overlays marks separately. This will become a 128x128 game sprite.

Source: /workspace/scratch/2f4bfdc327d4/generated_images/exec-9225da33-147c-451f-8ba3-8513ee0a4655.png

Asset: assets/characters/expressions/cat/08-weak.png


## 最終検証

npm test: 710 passed / 0 failed、終了コード0。git diff --check成功。iPhoneの最終視認性はユーザー確認待ち。
