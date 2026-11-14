# なおころ。正式150ゲーム対応 — 第1段階

開発開始: 2026-11-15 JST。基準main: `408c72e6ebef71da3eab33cfb268c7494117aaaa`。
独立ブランチ: `work/naokoro-minigames-150-20261115`。
Draft PR: https://github.com/Naoto214/naotocchi/pull/553

## 今回の範囲

クイック残り5種を実装し、ソフトウェア検証対象を50/50へ拡張。通常は既存15/100を維持する。全150種完了ではない。通常85種は次の段階で、未対応ゲームを抽選登録しない。物理iPhone Safariと本人による操作感・難度評価は未実施。

#511 FIRST STARTと#516ミニゲームV2はmainにマージ済み、#510 V6は独立DraftであることをGitHub APIで確認した。旧V5/V6監査は過去時点の証拠として保持。現行mainの正式コピーとルートquick.js/games.jsは一致。旧`minigame-adapter.mjs`はV3簡易版であり、今回変更していない。

正式quick.js blob: `9ec166e8e5fdb36474cdf2062dde3ca7774fd797`。
正式games.js blob: `2b3a6ccdbd3ec3bde991fa06409b9016dbdda6a5`。

## 追加ゲームと合法CPU

|ID|名称|判断と入力|
|---|---|---|
|knock|たたけ！|Canvas上の現在回数／指定回数を読み、指定回数でタップを停止|
|wait|まて！|正式指示どおり入力しない。100点同点を維持|
|spin|まわせ！|可視円の中心から連続した円周ドラッグ。初級は遅く、時間切れが起こり得る|
|sneak|そっとはこべ！|可視の寝床・眠りマークから方向を決定。毎フレーム連続移動し、初級の速度誤差は正式判定で失敗し得る|
|rhythm|リズム！|音符と判定線の可視位置、直前フレームとの差から到達を予測。反応遅延後にタップ|

`official-quick-cpu-v7.mjs`を追加し、V6のCanvas観測器を再利用。既存60種のCPU経路は維持。新CPUは試行開始時刻だけを共通メタデータとして用い、game.target・非公開closure・未公開正解を読まない。座標を百万分の1論理ピクセル単位に丸め、JSエンジンの三角関数の微小差を入力ジャーナルへ持ち込まない。正式物理・得点・演出には手を加えない。

## 成績分布

正式難度0.5固定、game seed1〜16、cpuSeed101〜116、60Hz。各難度16試合、計160試合。詳細は[V7-CPU-SCORES.json](V7-CPU-SCORES.json)。

|ID|初級 平均［最小–最大］|中級 平均［最小–最大］|
|---|---:|---:|
|knock|100［100–100］|100［100–100］|
|wait|100［100–100］|100［100–100］|
|spin|66.6875［0–100］|100［100–100］|
|sneak|81.375［33–100］|100［100–100］|
|rhythm|41.5625［0–100］|100［100–100］|

100点固定は隠さず報告する。waitの無操作は正式な成功条件であり「無操作0点CPU」ではない。knockは可視の数を正しく数える限り成功する。中級はこの標本では全ゲーム成功した。差を作るためだけに採点や成功率を改変していない。人間との難度校正は残る。

## 保存・公平性

4席のgameId、初期seed、正式難度、時間制限を共通化。CPU乱数だけ分離。抽選は登録候補から等確率、直前同一ID除外、同点同順位。クイックのお金、通常のそだち15/10/5/0を維持。

新5種で各席の途中checkpoint→serialize/restore→残り実行、正式callback、結果保存、古いcommand再送拒否を確認。保持中ポインターも入力履歴から復元する。Node adapterにevent.typeを渡す修正を追加し、pointercancelがpointerupとして最終ドラッグを発生させる不一致を解消。再現テストではsneakキャンセル0点、通常release33点。

QAの保存は専用sessionStorageキー`naokoro-minigame-qa-v7`だけ。4人比較の席・既得結果も保存する。本編保存キー群とFIRST START保存キーをsentinelで保護し、localStorage全体の前後一致を検証する。新Siteは別originなので既存Siteの保存へアクセスしない。

## 検証と残る確認

- 初回基準: 307テスト中305成功、2失敗は軽量取得で不足した正式画像。必要画像を取得して解消。
- 最終Nodeテスト **326/326成功**。新5種の起動・終了、両難度、4席、途中復帰、二重報酬防止、キャンセル、試行間のpointer解放を検証。
- 成績160試合すべて正式callback終了。クイック30秒以内。
- Chromium: 新5種×2難度のCPU、実iframeとNodeの正式結果・入力履歴一致、停止/再生成/復帰、CPU早送り。
- Chromium: 新5種すべて4席比較で2人目の途中保存・復帰後に4人の結果を表示。
- Chromium: 新5種の人間席でnative pointer入力、正式終了後の入力再生。成功操作の手動全クリアや本人の操作感承認を意味しない。
- 幅320/375/390/430pxのcanvasは画面内に収まり、実タップが入力ジャーナルに反映。
- 最新の強化テスト結果・CI状態はPR本文と`V7-VALIDATION.json`を参照。GitHubのqueued/pendingを成功とは扱わない。
- 物理iPhone Safari・タッチ実機・全種の横向き画面は未検証。Chromium結果と区別する。

## 本人限定試遊

新規Site ID: `appgprj_6af884b25f1481918ac28e42fa19d10d`。
URL: https://naokoro-minigames-150-20261115.kerzion214.chatgpt.site/
公開の成否・バージョンはPR本文で記録する。QA選択、人間/CPU、4席比較、一時停止・保存・復帰・CPU早送りを備える。

`tools/life-sugoroku/package-v7-qa.mjs`が専用QA入りの開発packageを作る。通常のpackager・本番allowlist・Pages設定は変更していない。全アセットのSHA256とGitHub HEADはbuild-manifest.jsonに記録する。

## 次の段階と競合境界

通常85種のID・名称・分類・保留理由は[V7-REMAINING-NORMAL.json](V7-REMAINING-NORMAL.json)。V6の分類を再利用し、未着手を明記。長時間ゲームは正式時間を短縮せず保留。次はmatch-3、pipe-connectなど可視盤面解析群から、個別の合法手探索・アニメーション中の入力待ち・終了条件を検証する。

スイス編の盤面・イベント・背景・ブランチには変更なし。`swiss`ブランチ検索では該当なしだったが、別名・未pushの開発との競合なしとは断定しない。共有境界は`POOLS`/`GAME_NAMES`、`openTournament`/`checkpoint`、`mountOfficialFrame`で、既存APIの引数・保存schemaを変更していない。スイス側は地理・マス設定から既存pool名quick/gameを指定し、CPUや抽選登録ファイルを複製しない方式を提案する。

## 再開手順

```sh
git fetch origin work/naokoro-minigames-150-20261115
git switch work/naokoro-minigames-150-20261115
node --test tests/life-sugoroku/*.test.mjs
node tools/life-sugoroku/scores-v7.mjs
# CIではPlaywright Chromiumをインストール。既存ローカルChromiumなら:
CHROMIUM_PATH=/usr/bin/chromium node tests/life-sugoroku/expansion-v7-browser.cjs
node tools/life-sugoroku/package-v7-qa.mjs /absolute/empty/development-output
```

保存済みHEADはPRのhead_shaを参照。完成済み60種と本段階の5種は再実装しない。次段階も別commit、成績・保存・ブラウザー検証後にのみ登録する。mainマージ・本番Pages公開は禁止を継続する。
