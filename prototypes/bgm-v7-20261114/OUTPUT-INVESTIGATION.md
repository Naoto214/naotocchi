# iPhoneスピーカー無音 — 調査と修正候補

**状態: 実機iPhoneの本体スピーカー確認待ち。修正完了ではない。**

利用者の条件: イヤホンを外すと本体スピーカーが無音、再生バーは進む。消音モードOFF、YouTubeの本体再生は正常。この条件から音源の取得成功やAudioContext.currentTimeの進行だけで成功とは判定しない。iPhone機種・iOS版・イヤホン種別・新しいタブでの再現は確認依頼中。

## 確認できた実装上の問題

1. 旧比較プレーヤーはAudioContextの状態変化を監視せず、contextをsuspendしてもplaying=trueだった。Chromium・WebKitの実AudioContextで再現。これだけでは利用者の「時計が進む無音」の原因を確定できない。
2. AudioSessionの用途がauto任せで、音楽再生であることを指定していなかった。対応ブラウザーでplaybackを指定する。
3. 読み込み中に音声セッションがinterruptedになっても、復号完了時に再生が始まる競合があった。独立レビューで検出し、遅延リクエストを使ったテストで再現。割り込みで再生予約を無効化し、復号だけを完了させる。
4. 出力先切替・バックグラウンド移行後に出力を作り直す操作がなかった。

## 修正候補

- `navigator.audioSession`を機能検出してplaybackを指定。録音用セッションを使わず、マイク許可も求めない。
- context/sessionの割り込み、通知可能なdevicechange/sinkchange、ページ非表示を監視。停止位置を保持し、再生操作を待つ。非表示時はcontextをsuspendする。
- 「音声出力を再接続」は旧contextをcloseし、同じユーザー操作の中で新しいcontextをresume。選択中の曲・V6/A/B・位置・共通ゲイン・ループ設定・復号済み音源を保持する。
- Web Audioグラフのゲイン後を透過的なAnalyserNodeで測定。RMS・context状態・session状態・イベント履歴を表示する。**グラフの信号はOS出力・スピーカー実音の証明ではない。**
- 別の診断ページ `output-check.html` は、同じ元AACをHTMLAudioElement.srcへ直接渡す。AudioContext / MediaElementAudioSourceNode / MediaStreamは作成しない。同じタブで切り替え、旧contextを閉じて出力経路を分離する。
- 診断プレーヤーの音量はiOS本体側で調整する。iOSではHTMLMediaElement.volumeのJS変更を前提にできないため、通常の共通ゲイン付きV6/A/B比較は置き換えない。診断ページは音量比較用ではないことを明記。
- 実際の出力デバイスや聞こえた音をSafariから自動判定するとは表示しない。「聞こえた／無音」の実機結果だけを利用者が選べる。自動送信はない。

音源・編曲・楽譜・MIDI・32曲メタデータ・配置・ゲームコードは変更しない。追加したのは比較ページの出力管理・診断・回帰テストだけ。通常の比較位置・共通音量・3案切替・ループは既存テストで確認する。

## 資料と仮説

- [WebKit bug276687](https://bugs.webkit.org/show_bug.cgi?id=276687): running/時計進行と実際の出音が一致しない報告、タブ遷移時のsuspend/resumeの議論。今回のiPhoneと同じ原因とは断定しない。
- [WebKit bug232640](https://bugs.webkit.org/show_bug.cgi?id=232640): iOSのイヤホン切断でMediaStreamAudioDestinationNode経路が無音になる報告。今回の旧ページはこのノードを使っていないため直接の証拠ではない。単にWeb Audio→MediaStream→audioへ迂回しても独立した切り分けにならないので、診断は直接AACを使う。
- [MDN AudioSession.type](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type): 音楽はplayback用途。対応しないブラウザーもあるため機能検出。
- [Apple iOS-specific volume control](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/Using_HTML5_Audio_Video/Device-SpecificConsiderations/Device-SpecificConsiderations.html): 標準メディア音量はiOS本体操作。Web Audioの共通ゲインを無断で失う全面切替は行わない。
- [MDN AudioContext.setSinkId](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/setSinkId): 出力選択は対応・権限が必要。本体スピーカーへ強制切替したと偽らず、OSの現在の出力経路へ再接続する。

## 自動検証と実機確認の境界

`test_output.cjs`: 実contextの中断、再接続、旧contextの終了、位置・ゲイン保持、グラフ信号、独立HTMLAudioElement経路。AudioSessionとsinkchangeは環境に機能がない場合を含むため模擬イベントでハンドラーを検証。物理的なイヤホン切断の試験ではない。
`test_output_loading.cjs`: AAC読み込み待ちの割り込みが自動再生を取り消す回帰。
`test_compare.cjs`: 従来の比較操作と12AAC復号の回帰。
Linux WebKitの標準メディア経路は一時キャッシュ `/var/tmp/WebKit-Media-*` が必要。最初のローカル試験は環境の書込制限で失敗（readyState0/error4）。テスト実行に限り `/var/tmp` 書込権限を追加すると直接AAC再生が進行した。iOSの利用者の障害とは別のテスト環境問題。
公開AACのRangeリクエストは206、Content-Rangeと100bytesの応答を確認。

### 必須の実機完了条件（未実施）

- iPhone Safariをイヤホン未接続で開き、V6/A/Bすべてが**本体スピーカーで聞こえる**。
- イヤホン接続→切断後、停止した場合は再生／再接続操作で、同じ位置・音量の比較が本体スピーカーで聞こえる。
- Safariを離れて戻った後も、再生操作で本体から聞こえる。
- 通常比較が無音なら、直接AAC診断の本体出音と状態を記録する。診断だけ鳴っても、通常比較の修正完了にはしない。

機種・iOS・イヤホン種別・各条件の実音結果が揃うまで、この不具合は未完了とする。

## 保存した検証結果

`verification/output-20261114/` に回帰の失敗→成功、従来比較の成功、24音源/MIDIファイル・楽譜の不変照合を保存。独立レビューの読み込み競合と、中断中の読み込み完了後に操作ボタンが無効のまま残る表示不整合を修正し、どちらも失敗するテストを確認してから成功させた。
