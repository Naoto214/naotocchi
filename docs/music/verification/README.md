# 本番統合の検証記録

基準main:105dba519890c2dc17e94a8c9d1b7679720fddf3。統合PR:#552。原盤:#549、音量:#550。制作と基盤は独立ブランチに保存し、公開は全検証成功が条件。

## 通過した検証
- `library-preservation.json`:32曲の原盤・台帳・楽譜・ライセンスhash一致。既存解析32件を再利用、再生成0件。
- `home-b2plus.json`:ホーム4曲AAC/FLAC/MIDI12ファイルが#548固定HOME-LOCKと一致。
- `library-tests.txt`:14件。重複ID、ライセンス、path、AAC/FLAC/MIDI、loop、承認fingerprint、不完全receipt、模擬追加/再開/保護。
- `runtime-unit.txt`:共通gain、非同期停止/中断/再開、全100ゲーム選曲、SFX、無音設定等。
- `game-scope.txt`:BGMの4接続とHTML3script以外の既存ゲームbytesを復元して固定blobと一致。既存保護を緩めていない。
- `all32-browser.json`:実AAC32件をChromium/WebKitで復号、非無音/clipなし、端末時刻境界。
- `actual-routes.json`:実ホーム+3別ページのsource→destination実効gain0.36、定常BGM一重。
- `lifecycle.json`/`subapp-states.json`:選曲、フェード、voice/SFX duck、BGM設定、連続選曲、勝敗/クリア/帰還。
- `new-track-browser.json`:一時33曲ライブラリを実audio.jsへ読み込み、模擬ゲームID→新曲→.36出力。nativeHTMLAudio A/B位置維持。正式一覧には未登録。
- `package-http.json`/`pages-tests.txt`:承認AACのみのPagesパッケージ、全HTTPファイルhash、配信除外境界。

## ホーム画面テストの旧HEAD失敗記録
GitHub Home selected nameのChromium/WebKitで、密集した住民の間から操作対象/移動先を選ぶ試験が失敗。`home-ci-failure.txt`に記録。ローカル統合版でも別の横画面ケースで「No exposed touch target for partner」を確認（`home-local-failure.txt`）。このテストはAudioContextを無効化しており、AACの出力確認ではない。

対照として、mainのindex/audio/scriptを固定コミットからそのまま復元し、変更のないゲーム資産と同じテストを共有した別ディレクトリでChromium全5ケースが通過（`home-main-control.txt`）。結果の揺れの原因を断定していない。通過回だけで失敗を無視しない。

対応案:画面の実操作・移動経路・保存復元のassertionを維持し、QAの時計と住民配置、対象点選択を安定化して両エンジンで再検証する。ゲームの描画/配置/当たり判定をBGM統合の都合で変更しない。これを含め必要チェックが通過するまでmainマージと本番公開を保留する。

## 測定の境界
ブラウザー検証はLinuxのChromium/WebKit上の実デジタル経路。iPhone実機の本体スピーカー可聴性やBluetoothルーティングを実測したという意味ではない。楽曲品質は正式採用版をそのまま保持し、客観値は同一原盤hashの#549/#550記録を使用。

`full-game-suite.json`: `npm test`全工程exit0。単体群とsmoke/dialogue/visual QAがすべて完了。これは別ワークフローのHome selected name実ブラウザー失敗を解消したという意味ではありません。

## PR #552 再開時の原因調査と修正

[home-input-resume/README.md](home-input-resume/README.md)に失敗ログ・画像、時計/表示乱数の安定化、実入力と保存復元の維持、両エンジンの検証を記録。旧HEADでの未解決という記述は上の履歴を指す。新HEADの全CI成功を確認するまで公開ゲートは閉じる。

[paused-renderer-resume/README.md](paused-renderer-resume/README.md): Home selected name修正後のCIで見つかった、別の停止時計下の背景準備待ちを再現・修正。実ゲームの変更なし。新HEAD全CIを公開条件として維持。

[unload-lifecycle/README.md](unload-lifecycle/README.md): 次のCIで操作検査をすべて通過した後に発生したWebKitの離脱中ジングル取得を調査。保存時の実績通知が原因と確認し、BGMモジュール内だけで離脱処理中の新規取得・開始を抑止。ゲーム操作・保存・音源は維持し、native離脱/キャンセルと通常音声経路を両エンジンで再検証。
