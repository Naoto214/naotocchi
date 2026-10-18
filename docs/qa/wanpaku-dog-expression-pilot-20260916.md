# わんぱくいぬ：dog/04の10表情

開始PR HEAD: 436cc627a2c4b589de1cab0d1de7f213bd77765f。子犬のユーザー承認後、続行依頼に基づき12〜15歳のわんぱくいぬ1段階を追加。PR #278はDraft維持、main未マージ。

## 範囲

通常は元のdog/04.png。前へ身を乗り出した低い頭、斜めに伸びる前足、右側の後ろ足、上に曲がる細い尾を保つ10表情。猫8段階・成犬・子犬の確定画像とマーク位置は維持。
状態別色・濃い縁・お世話リアクションは共通。空腹は黄色のフード皿。SVG内の初期位置は通常(-22,12)、呼びかけ(-30,18)、拒否(-10,12)。ゲーム数値、判定閾値、保存形式には変更なし。
保存しない確認ページに「わんぱくいぬ」を追加。実績演出の割り込み回帰へも追加。

## 制作と検証

Built-in image_gen / precise-object-editで元のdog/04.pngを参照し、1表情ずつ生成。元の前傾した立ち姿・足位置を明示。顔以外の画素は元絵と完全同一ではない。
ImageMagickでalpha50%閾値、trim、nearest-neighbor105×106、128×128の(11,14)へ配置、64色RGBAに正規化。
新規4件＋実績回帰拡張1件のREDを確認後に接続。focused testsは69件成功。実機での表情とマークの見え方はユーザー確認待ち。

最終 npm test: 731 passed / 0 failed / 0 skipped、終了コード0。全10枚の透過・128×128・元画像bounds一致・状態別ファイルの差異を検証。コードレビューに機能上の指摘なし。

## ブラウザ検査の測定修正

前回puppy HEADのHome layout CIを追跡し、両エンジンのright-speakerで「moving pet covers poop」を確認。表情PNGをCastBoundsへ直接引くため未登録として透明canvas全体を測定していた。ゲーム本体は元ステージのboundsを使用しており、検査2箇所もdata-fallback-assetを優先して同じ描画範囲を測るよう修正。失敗場面は成犬で、dog/04追加とは独立。

## 生成時の表情指示

critical: Very weak but alive: eyes nearly closed with barely visible pupils, slack tiny mouth, pale cheeks. Not horror.

happy: Narrowed upward smiling eyes and an OPEN joyful grin. Awake and delighted.

hungry: Hungry expectant OPEN eyes, worried raised brows, tiny round open mouth asking for food.

sick: Ill pinched tight eyes, knitted brows, tense wavy mouth, subtly pale cool forehead. No sweat.

sleeping: Fully CLOSED relaxed downward eyelid curves, CLOSED mouth with faint micro-smile. No broad grin.

strained: Uncomfortable refusing half-open eyes, knitted worried brows, tight wavy CLOSED mouth, no smile.

sulky: Pouting unhappy narrow side-looking eyes, lowered brows, pursed downturned CLOSED mouth.

tired: Heavy HALF OPEN eyelids with visible pupils, droopy brows, small yawning mouth. Not fully asleep.

wantsPlay: WIDE OPEN sparkling eyes, raised brows, engaging CLOSED-mouth dog smile.

weak: Downward looking eyes, drooping worried brows, tiny downturned mouth, muted cheeks.

ローカルのブラウザ再検証は実行ファイル未導入のため起動できず、導入もcdn.playwright.devへの接続がタイムアウト。GitHub Actionsで修正後の実ブラウザ結果を確認する。
