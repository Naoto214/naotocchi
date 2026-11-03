# 木の看板タップで重力説明を開閉（2026-11-04 JST）

基準: PR #504 `43eaefe2df8555417e501ef56aa165213cc1e861`。

上部の「重力 ↓ ・ 支えがないと落ちる」は初期非表示。重力面06〜10のA8木製看板をタップすると表示、再タップで非表示。面の切替で閉じる。キャラへのタップを優先し、キャラをドラッグしてA8へ入れる操作は維持。看板から10px超動かした操作、pointercancel、lostpointercaptureでは説明を切り替えない。開閉は手数・保存履歴・モーションを変更しない。

採用画像、1マス寸法、位置、CSS、盤面・物理・分裂・解答・保存形式・共通入力は変更なし。製品変更はapp.mjsとindex.htmlだけ。保護テストは今回の明示的UI変更だけを正規化し、既存hashを維持。

検証:
- 専用120/120テスト成功。
- `NAOPOYO_JSDOM=<jsdom path> node prototypes/naopoyo-time-hand-chapter1/tests/gravity-help-dom.cjs` 成功。実appのイベントで全重力面の開閉・中断・ドラッグ誤開閉抑止・resize・手数/保存不変、全10面の通常クリアとおてほん、既存保存/Undo/A8操作を確認。
- Chromeローカルプレビュー: 06初期非表示→看板タップで表示→再タップで非表示、看板からのドラッグで開かない、キャラドラッグで1手進むことを確認。
- clean build: 77コンテンツ＋manifest、371,807 bytes。旧配信との差分はapp.mjs/index.html/manifest.jsonのみ。
- iPhone Safari実機未確認。mainマージ・本番Pages公開は行わず、既存Draftと本人限定公開を維持。
