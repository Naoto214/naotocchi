# 停止時計下の背景準備待ち

HEAD `7b6702a7`の[Production 2.5D home](https://github.com/Naoto214/naotocchi/actions/runs/43587216888/jobs/132424256774)で、砂漠のChromiumケースが会話ブロック試験の準備待ち（旧108行）で15秒タイムアウト。6人/28人の実タップ・ドラッグは全件成功していた。Home selected name両エンジンとBGM専用CIは成功している。

通常の再実行は両エンジン成功したため、それを解消の根拠にはしなかった。動的importの`home-production-world.mjs`応答だけを1秒遅らせると、元の砂漠試験全体で同じ待機失敗を再現した。28住民、blocked=false、paused="false"、画像エラーなしだがworld.loaded=false。停止時計ではdaypartのdecode後にdraw()が実行されず、loadedを更新できない。分離した準備処理の再現でも、実フレームを500ms進めるだけでloaded=trueになった。

修正は`tests/home-production-browser.cjs`の準備待ちだけ。同ファイルの実入力準備と同様に、16msずつ実アニメーションを進め、50msの実時間でI/Oを待つ。条件式と15秒上限を維持し、準備できなければ失敗する。失敗時の状態・スクリーンショットも追加。会話中の実ドラッグ、主人公へのpointerdown、pointerup、座標不変、移動要求拒否、会話選択、保存復元は省略していない。ゲーム本体・描画・当たり判定・音源・基盤には変更なし。

- `ci-before.log/json`: GitHub失敗記録。
- `reproduced-*`: 元の試験＋1秒のmodule応答遅延での失敗と画像。
- `after-normal.json`: 修正後、Chromium/WebKit計24地域/幅/人数ケース、実入力、卵、回転、保存復元成功。
- `after-module-delay.json`: 同じ全試験に1秒遅延を加えて両エンジン成功。
- `physical-inputs.json`: 通常/遅延の各10入力ケースと既存assertion行の維持確認。

独立レビューで追加指摘なし。新HEADの全CI成功がマージ条件であり、このローカル結果だけで公開しない。
