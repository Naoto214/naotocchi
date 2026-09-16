# こいぬ：dog/03の10表情

開始PR HEAD: bef2655c40eb06948ece22af5a5f83208cb35146。成犬の銀色マーク(-12,1)をユーザーが「良いです」と承認後、続行依頼を受けて子犬1段階へ進む。PR #278 Draft維持、main未マージ。

## 範囲

7〜11歳のdog/03のみ。通常は元画像、10表情は専用PNG。元の小さな体、大きい耳、丸い顔、前足を上げた姿を保つ。共有の色・濃い縁・リアクションを継承。空腹は黄色のフード皿。マーク初期位置: 通常(-12,16)、かまって(-24,22)、拒否(-8,16)。成犬と猫8段階の確定表現は不変。

## 接続と確認ページ

allowlistにdog/03を追加。既存の状態判定・意味イベント・afterglowを再利用。新しいセーブ項目や閾値は追加しない。保存しない確認ページへ「こいぬ」を追加。実績演出割り込み回帰を含める。

## 自動検証・レビュー

新規4件＋実績回帰拡張の5件が未実装のため失敗するREDを確認。画像以外のfocused testsは66件成功。独立コードレビューで機能上の問題指摘なし。画像は別途目視確認。

## アート

Built-in image_gen / precise-object-editで元のdog/03.pngを参照し、10表情を個別生成。最初の一部で座り姿へ変わったため、前足を上げた元の立ち姿を強調して再生成。顔以外の画素は元絵と完全同一ではない。
ImageMagickでアルファ50%閾値、trim、nearest-neighbor85×91、128×128キャンバスの(21,29)へ配置、64色RGBAへ正規化。PNGにマークを含めない。

## 実機確認

表情の見分けやすさ・マークと顔の距離・リアクションへの愛着はユーザーのiPhone確認待ち。

## 生成記録

共通: precise-object-edit、元のdog/03.pngを参照。顔の表情だけを変更し、金茶の毛・クリーム色の口元と胸・大きい耳・小さい体・右の尾を維持。128×128ゲーム用ピクセル絵、真の透明背景、マーク・汗・文字・背景を含めない。hungry/sick/strained/criticalは前足を上げた立ち姿を明記して再生成した版を採用。

- critical: Very weak but alive expression: eyes nearly closed with pupils barely visible, slack tiny mouth, pale cheeks. Not horror.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-e457abda-c493-4013-baad-69308be14e2e.png
  - Asset: assets/characters/expressions/dog/03-critical.png
- happy: Narrowed upward smiling eyes and an OPEN joyful little grin. Awake and delighted.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-61ca601b-74fc-4432-976e-5b31f373d050.png
  - Asset: assets/characters/expressions/dog/03-happy.png
- hungry: Hungry expectant expression: OPEN eyes, gently worried raised brows, tiny round open mouth asking for food.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-7f1ccf14-6793-4ea1-8575-f19be47afcb7.png
  - Asset: assets/characters/expressions/dog/03-hungry.png
- sick: Ill expression: pinched tight eyes, knitted brows, tense tiny wavy mouth and slightly pale cool forehead, no sweat.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-69ec96aa-71e6-41c9-b240-a10a71fde06e.png
  - Asset: assets/characters/expressions/dog/03-sick.png
- sleeping: Peaceful sleeping expression: fully CLOSED relaxed downward eyelid curves, CLOSED mouth with only faint micro-smile, NO broad grin.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-5bd16204-7b96-418c-a526-4bbc3b8a9b3a.png
  - Asset: assets/characters/expressions/dog/03-sleeping.png
- strained: Uncomfortable refusing expression: half-open eyes, knitted worried brows, tight wavy closed mouth, no smile.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-818817fe-94d0-43fe-9481-5e36af4e534b.png
  - Asset: assets/characters/expressions/dog/03-strained.png
- sulky: Pouting unhappy expression: narrow side-looking eyes, lowered brows, pursed downturned CLOSED mouth, no smile.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-aa64ec90-6bb2-4784-a477-02f5d8c50f33.png
  - Asset: assets/characters/expressions/dog/03-sulky.png
- tired: Tired expression: heavy HALF OPEN eyelids with visible pupils, droopy brows, small yawning mouth. Not fully asleep.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-8dfa5dd7-e64b-4e07-9477-ed8fe02735c7.png
  - Asset: assets/characters/expressions/dog/03-tired.png
- wantsPlay: Asking to play expression: WIDE OPEN sparkling eyes, raised brows, engaging CLOSED-mouth dog smile.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-5b0851e5-0992-4c05-a626-552c302cb1a0.png
  - Asset: assets/characters/expressions/dog/03-wantsPlay.png
- weak: Low vitality expression: downward looking eyes, drooping worried brows, small downturned mouth, muted cheeks.
  - Source: /workspace/scratch/cfccd9f29804/generated_images/exec-47827fe6-fc1c-4e32-9109-8f26ddd0d02d.png
  - Asset: assets/characters/expressions/dog/03-weak.png

## 最終結果

`npm test`: 727 passed / 0 failed / 0 skipped、終了コード0。PNG検証12件成功。`git diff --check`成功。確認ページと検証対象の表情関連105ファイルがバイト一致。猫・成犬の既存PNG、共通CSS、ゲーム判定・セーブ処理に差分なし。独立レビューに機能上の指摘なし。iPhoneはユーザー確認待ち。
