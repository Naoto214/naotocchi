# なおとっち — 朝昼夕夜4大テーマ・2.5Dホーム試聴 VERSION 1

本人の最終試聴用。**Draft・mainへのマージ禁止**。全ゲームへの統合・新曲・新しい編曲は含みません。

| 時間 | 正式名称 | 元のオブジェクト |
|---|---|---|
| 05:00–09:59 | そよかぜのまど | #527 朝C |
| 10:00–15:59 | いつものにわ | audio.js home / #524 current |
| 16:00–18:59 | ほしふるみずうみ | #524 D |
| 19:00–04:59 | ほしぞらのやくそく | #526 B |

## 原曲の保護

main `e0120c58`から独立。#528 `740225ef`にある5個のJSファイルを元のパスへバイト単位で取り込み、参照して再利用しています。#524/#526/#527/#528のブランチ・ファイルは変更していません。#522にも変更なし。原曲オブジェクトへ書き込まず、表示専用の曲名だけを別途定義しています。

`きせつのきおく`（#526 C）、`おはようのひかり`（#527 B）は `DEFERRED` と元の楽曲ファイルに保持。元の譜面・MIDIは各参考PRで引き続き保存されています。出典コミット・Git blob・SHA-256は `sources.json`。

## 試聴

- 13地域×4時間帯の正式52背景。正式ホームを同一オリジンのiframeへ表示。
- 時間帯ボタン、地域、個別再生、4曲連続、ループ、音量、再生曲名・進行表示。
- 手動／端末ローカル時刻／早送り（1秒＝1分または6分）。19時から翌5時まで夜。
- 曲間は4秒クロスフェード。次曲を事前レンダリング。連続再生は曲末4秒から次曲と重なります。ループOFFなら夜の終わりで停止。
- 元のV2エンジン `renderOffline` をそのまま使用。初期音色は既存比較のピアノ。メロディのみ／軽い伴奏も元エンジンの既存モードであり、追加編曲ではありません。音符・テンポ・リズムに変更なし。
- iPhone向けにタップ内でAudioContext生成／resume、audioSessionと無音audioの解除処理、playsinline、タッチ操作・16px時刻入力を使用。
- タブを離れる／画面ロックでは明示停止。戻って再生を押すと先頭から開始。バックグラウンド連続再生は今回の対象外。

## ホームの隔離

元のHTML/CSS/住民レンダラー/移動/遮蔽/背景ファイルは変更しません。ビルド時だけ専用HTMLと専用runtimeを生成し、サンプルのねこを初期化。試聴用runtimeのみ、お世話の定期進行と自動の出会い・できごとを止めます。元の描画・住民動作・タップ・ドラッグ・UIはそのまま。画面側のサンプル状態と既存の `NaotocchiDaypartsQA` を同期して、背景と時刻表示を一致させます。

試聴iframeのlocalStorage/sessionStorageはメモリ内の一時保存に置換。本番とは別オリジン。サンプル操作は更新で消えます。「ホームを戻す」でサンプルを初期化できます。

## 再現

正式配信allowlistのファイルがある軽量checkoutで実行（tools/work/README.md参照）。

```sh
node --test prototypes/home-four-themes-v1/tools/*.test.cjs
node --test tests/audio-regression-test.cjs tests/release-hygiene-test.cjs tests/asset-integrity-test.cjs
node prototypes/home-four-themes-v1/tools/build.cjs /absolute/external/directory
node prototypes/home-four-themes-v1/tools/verify-build.cjs /absolute/external/directory
```

出力ルートの `index.html` は試聴室への入口です。`home-audition.html`、`home-audition-runtime.js` は専用生成物。`script.js` を含む元の本体ファイルはそのまま同梱します。生成物はGitHubへ重複保存しません。

検証詳細と公開URLは `VALIDATION.md`。
