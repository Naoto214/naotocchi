# 大人の犬：1段階・10表情の試作

開始PR HEAD: `4587266d2906f27a9b70249fec8997af7442ee70`。main: `3f4bfda0b8c0d30098ebb68c4313abd370a8576a`。
ユーザーが成犬1段階を承認済み。猫全8段階は保持。PR #278はDraft維持、mainへマージしない。

## 実装範囲

`dog/06.png`のみ10表情を追加。通常は元画像。元の立ち姿、金茶の毛色、胸の白い毛、立ち耳、右側のカーブした尾を参照。全マークは猫で確定した色・同系色の濃い縁を共有。空腹は黄色のフード皿。通常マークはSVG内(-22,0)、呼びかけ(-31,8)、拒否(-8,8)を初期位置とする。
既存のresolver・意味イベント・afterglowを使用し、ゲーム数値、セーブ形式、既存の猫画像・マーク位置を変更しない。犬の他7段階は未対応のまま。

## 自動検証

開始時npm test: 718 pass / 0 fail。新規4テスト＋実績演出回帰拡張の5件が未実装のため失敗するREDを確認。
接続後のfocused tests: 62 pass / 0 fail（画像は別検証）。レビューでURL指定の姿と選択欄が不一致になる既存問題を発見し、dog→cat→dog切替テストのREDを確認して修正。

## アート作成

Built-in image_gen、precise-object-edit。1表情ずつ元のdog/06.pngを参照して生成。顔以外は元画像と画素単位で同一ではない。ImageMagickでアルファ50%閾値、trim、nearest-neighbor96×112、128×128の(16,8)へ配置、64色RGBAへ正規化。マークはランタイムで重ねるためPNGには含めない。

## 実機確認

表情の見分けやすさ、体とのマーク距離、愛着につながる反応の見え方はユーザーのiPhone確認待ち。自動テストの成功を実機確認済みとは扱わない。

## 生成プロンプト記録

共通: Use case: precise-object-edit. Edit supplied adult golden brown dog pixel sprite; change only facial expression; preserve full standing four-leg pose, head on left toward viewer, upright ears, curved right tail, golden tan fur and cream chest/muzzle. Crisp outlined pixel art, genuine transparent background, no symbols, sweat, text, shadow or background. One asset per call.

- happy: Narrowed upward smiling eyes and joyful open grin.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-1e678418-85f7-4661-9e94-e3a25ba1a84d.png
  - Asset: assets/characters/expressions/dog/06-happy.png
- critical: Very weak but alive expression: eyes nearly closed with pupils barely visible, slack tiny mouth, pale cheeks. Not horror.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-f8e7104f-1d4a-42b0-be1e-5c27ec101b48.png
  - Asset: assets/characters/expressions/dog/06-critical.png
- hungry: Hungry expectant expression: OPEN eyes, gently worried raised brows, tiny round open mouth asking for food.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-1c8f5a77-1021-4eb4-9570-f09d11f1dd7d.png
  - Asset: assets/characters/expressions/dog/06-hungry.png
- sick: Ill expression: pinched tight eyes, knitted brows, tense tiny wavy mouth and slightly pale cool forehead, no sweat.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-e6b74898-cc5f-4b52-910d-92732b6f96b4.png
  - Asset: assets/characters/expressions/dog/06-sick.png
- sleeping: Peaceful sleeping expression: fully CLOSED relaxed downward eyelid curves, CLOSED mouth with only faint micro-smile, NO broad grin.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-41d00226-2eee-456e-a8c7-5183fed71e0f.png
  - Asset: assets/characters/expressions/dog/06-sleeping.png
- strained: Uncomfortable refusing expression: half-open eyes, knitted worried brows, tight wavy closed mouth, no smile.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-36b38ab0-4957-4c80-8ae9-16c926e32287.png
  - Asset: assets/characters/expressions/dog/06-strained.png
- sulky: Pouting unhappy expression: narrow side-looking eyes, lowered brows, pursed downturned CLOSED mouth, no smile.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-02eb6829-6228-40db-b223-b870132e40f7.png
  - Asset: assets/characters/expressions/dog/06-sulky.png
- tired: Tired expression: heavy HALF OPEN eyelids with visible pupils, droopy brows, small yawning mouth. Not fully asleep.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-93fa9724-5c54-4806-aeb5-440d1736ce1f.png
  - Asset: assets/characters/expressions/dog/06-tired.png
- wantsPlay: Asking to play expression: WIDE OPEN sparkling eyes, raised brows, engaging CLOSED-mouth dog smile.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-e2ff266a-39ea-4943-9c82-de428f09185f.png
  - Asset: assets/characters/expressions/dog/06-wantsPlay.png
- weak: Low vitality expression: downward looking eyes, drooping worried brows, small downturned mouth, muted cheeks.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-0131636e-8b25-469c-ae84-7e9f3e96c508.png
  - Asset: assets/characters/expressions/dog/06-weak.png

## 最終検証

- `npm test`: 723 passed / 0 failed / 0 skipped、終了コード0。
- PNG検証: 11 passed / 0 failed。成犬10枚は128×128 RGBA、透明/不透明alpha、元絵と同じbounds、全て異なる画像。
- 確認ページ: 17 passed / 0 failed。成犬を含む9姿の実績演出割り込み防止、保存分離、URLと選択欄の一致、犬→猫→犬切替。
- `git diff --check`: success。
- 猫の元画像・表情画像・pet-expression.css・script.js・care-status.jsは開始HEADから差分なし。
- 独立コードレビューの指摘（URLと選択欄の不一致）は修正済み。実機確認は未実施。

## 実機確認後の微調整

ユーザー指示により成犬の銀色マークだけを(-8,8)から(-12,4)へ移動。顔から左上へ4単位離す。他のマーク・猫・表情画像は変更しない。
