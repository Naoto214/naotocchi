# VERSION 1 検証記録

基準：e0120c58f36394c9acff6507d72ceb3a1f48e1e2。

- 通常100 ID・quick50 ID、全173 HTML入口（正式配信11）を抽出。
- 時の針第1章10、旧第1章10、第2章10、救出版12ステージをモジュールから読み出し、ID/タイトルを保存。
- 新規10 MP3すべて：SHA-256一致、FFmpegで全フレーム復号、32〜53.34秒、有限・非無音・クリッピングなし。詳細 audio-validation.json。
- 音源は最初の照合でcard-lateのファイルが途中までしか保存されていないことを検出し、再生成。その後10/10のhash・全デコード検証に合格。最初から全件合格したとは扱わない。
- 元audio.jsとlegacy-audio.jsはバイト一致。既存音楽回帰 tests/audio-regression-test.cjs：4/4成功。
- 独立player.test.mjs：7/7成功（同曲継続、変更時の単一source、OFF時未読込、背景停止/位置復帰、古い読込の破棄、storage/通信失敗、AudioContext非対応、unlock待ち中の停止。複数条件を含む）。
- Chromeの実ページ：10曲すべてで「再生中」表示到達を個別に確認。これはdecodeAudioData成功→source.start後に表示される。現行home再生、停止、ループ境界ボタンも実操作確認。聴感の好み・音質を人が評価した証拠ではない。
- デスクトップ画面の3列比較を目視確認。CSSは2列/1列へ折返すがiPhone実機の縦横・音声割込み・バックグラウンド復帰は未検証。
- 最終playerの競合対策追加は単体検証済み。ブラウザー全曲試聴はその前の版で行った（音源不変）。
- CI/本番の全ゲーム実行はこの試聴追加の検証に含めない。正式ゲーム/画像/CI/allowlistに差分なし。

再実行：
`node --test comparisons/music-v1/player.test.mjs`
`node --test tests/audio-regression-test.cjs`
`node comparisons/music-v1/inventory.cjs`
`python3 comparisons/music-v1/compose.py`

公開サイトは別originの所有者限定試聴ページ。ゲームの保存キー/本番配信への接続はない。正式統合前に実機と聴感検証が必要。
