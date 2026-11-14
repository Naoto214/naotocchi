# 本番BGMの構造・保護・復旧

最新main105dba5を基準に、PR540から必要なBGM接続を移植。古いPRの連鎖や試遊版全体をmainへマージしない。音源はPR54901a5591、音量はPR550bea117b。既存Draftと履歴は残す。

## 出力経路

`assets/bgm/catalog.js`と`placement.js`を`bgm-v2.js`より先、これらを`audio.js`/`script.js`より先に読み込む。`bgm-v2.js`という既存API名は互換性のため維持し、中身は正式V7ライブラリを再生する。

本体：source→曲fade→duck1→playerOut1→fileBus→bgmBus0.28→master0.9→destination。fileBusは`COMMON_GAIN/(0.9×0.28)`であり、最終積は0.36。別ページも`NAOTOCCHI_BGM2.COMMON_GAIN=0.36`を使う。共通値を別々にコピーしない。曲別補正は0dB。SFXのbus0.9/master0.9、読み上げ時の既存duck値は変えない。

本体は`audio.js`のcurrentSongで、ホーム時刻・睡眠・デート/映画・ゲームID/分類・イベントを判定する。時間帯は背景と同じ`NaotocchiEnvironment.timeOfDay`（autoは端末時刻、朝5時/昼10時/夕16時/夜19時）。`script.js`の接続は孵化・達成・結婚とゲーム分類の取得だけ。保存データのフィールド追加はない。

別ページはDOM状態を`bgm-subapps.js`が読み、ゲームエンジンを書き換えずに選曲する。なおころのofficialAudioは従来どおりSFX/声専用でBGMはオフ。ゲームiframeの音/声の委譲も維持。読書ページにはBGMローダーを加えない。未タップ・BGMオフは無音。配置23の「無音」は追加失敗ジングルを鳴らさない意味で、通常BGMを継続する。

## フェード・ジングル・中断

実装は1.2秒fade-in/0.9秒fade-out、勝敗/ゴールの切替前は0.25秒fade-out。重ねる達成jingleは−10dB、孵化は−14dBduck、0.2秒で下げ終了後1秒で戻す。配置原本の古い「4秒」記述は履歴として保存するが、正式採用版の実装値をここに記す。

AAC末尾paddingは正確なカタログ尺で除き、loopStart/loopEndを反映する。最大3曲の復号キャッシュ。読込失敗時は本体の既存合成BGMに戻る。停止後や古い通信結果でジングルを鳴らさないrequest tokenを使用し、終了はwall clockではなくsource.onendedで判断する。中断したイベントジングルは取り消し、ループを復帰させる。対応SafariではAudioSessionをplaybackにする。

離脱時の保存でも実績判定は従来どおり行うが、`beforeunload`の処理中は新規ジングル取得・開始を抑止する。WebKitが離脱中のfetchを拒否するため。BGMモジュールを同期的に`script.js`より先に読み込む順序をテストで保護し、保存ハンドラーより先に離脱状態を記録する。次のタスクで解除するため離脱キャンセル後も再生でき、`pageshow`でも解除する。保存内容、通常の強弱、既存ループ、SFX/声の処理は変えない。

自動試験はデジタル信号と状態遷移の確認。実iPhoneのスピーカー振動・音圧・BluetoothのOS経路を証明するものではない。以前確認されたV7比較ページは試遊版に残し、HTMLAudioElementによる独立確認を利用できる。

## 保護・Pages

`approved32.lock.json`は最初の32曲のメタデータ、AAC/FLAC/MIDI、楽譜、配置、原receipt、サンプル/ライセンスを固定する。`import_approved.py`は固定Git blobを確認する初回移行専用で、既存台帳があれば拒否する。通常運用では実行しない。

本番に必要なファイルだけを`tools/pages/allowlist.json`へ登録する。`music/runtime-files.json`のapproved AAC集合と一致を検査する。FLAC/MIDI/候補/制作資料はGitHubに残すがPagesには配布しない。Pagesの350MB上限は緩めない。キャッシュ参照は変更したBGMファイルと接続先だけ更新する。

## 問題発生時

まず原盤SHAとcatalog/placement、BGM設定、AudioContext状態、ネットワーク404を確認する。原盤を再生成して直そうとしない。取得失敗の原因を直し、正常な原盤のコピーを固定コミットから復元する。前版へ戻す必要がある場合は統合コミットをrevertする独立PRで戻す。セーブ形式に変更がないため保存の移行/初期化は不要。旧原盤・旧Draft・ユーザーセーブを削除しない。

各工程は独立ブランチでコミット/プッシュし、検証ログを保存。追加曲のユーザー承認前は候補の試遊公開に限定する。承認済みの音源fingerprintと検証済みHEADが一致するPRだけmainへ統合し、Pages成功後に公開AACのSHAと主要画面を再確認する。
