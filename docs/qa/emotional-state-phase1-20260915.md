# Emotional State Phase 1 QA handoff

## 自動確認

- focused suite: `node --test tests/care-status-test.cjs tests/emotion-state-test.cjs tests/cast-motion-test.cjs tests/emotion-integration-test.cjs tests/care-status-integration-test.cjs` — 110件成功、0件失敗。
- reduced motion: 起動時のreduceと実行中のreduce切り替えで、persistent cueとcare afterglowのメインキャラanimationが増えず、実行中cueが停止する。既存のcare warning表示とdanger（`!`）アイコンは残る。
- 26体: hungry / sulkのpersistent cueはメインキャラと装備だけが対象で、`castResponse` と26体のcompanion nodeにanimationを追加しない。
- 画面遷移: menu / story / minigame / hidden tabへの遷移で予約中・実行中のpersistent cueを止め、表示中に新しいcueを発火しない。ホーム復帰後は現在の状態から再開する。
- 優先順位: 実際の `scheduleIdlePerk` / `scheduleIdleGreeting` callbackをcare afterglowの予約中とgentle bounce実行中に発火させ、メインキャラのtemporary reactionを置き換えないことを確認した。
- care更新: 新しいcare操作と新しいsemantic eventは古いafterglowを無効化する。
- 保存: 状態導出とpersistent cue実行の前後で `JSON.stringify(state)` が一致し、感情専用fieldを保存しない。
- critical life: persistent cue、通常pet idle、petのidle greetingを発火せず、既存critical UIとdangerアイコンを表示する。
- full regression: 最終cache bump後の `npm test` は成功。前段のsmoke / dialogue / visual QA route checksに続き、Node test 632件成功、0件失敗。

実callback試験で、通常idleがtemporary reactionを先取りする競合を再現した。`script.js` のidle callbackで、afterglow予約中またはpetがbusy / activeの間だけpetを候補から外す最小guardを追加した。companion / partnerのidle候補は残る。

full regressionには、既存のalbum error probe、storage quota fixtureの診断出力とnpmのenvironment noticeが含まれる。いずれも想定済みの試験出力で、失敗件数は0だった。

疲労profileは、strongを `12000..16000ms`、mildを `8000..12000ms` とする。当初planのstrong `6000..9000ms` は、疲労悪化時に動作量を増やさないという明示要件と矛盾していたため、ユーザー指定に合わせて訂正した。ゲーム数値は変更していない。

## iPhone実機チェック

| 項目 | 確認内容 | 結果 |
|---|---|---|
| 通常 | 何も困っていない時に動きがうるさくない | 未確認 |
| 空腹 mild / strong | 数秒以内の仕草で空腹らしさの強弱が分かる | 未確認 |
| げんき低下 | dozeが空腹と見分けられる | 未確認 |
| 病気 | 汗 + 弱いshakeで病気と分かる | 未確認 |
| いのち warning / critical | warningは弱り、criticalはむしろ静かになる | 未確認 |
| ごきげん mild | じゃれられる時は「かまって」感、連打後はsulkで距離を取りたそうに見える | 未確認 |
| ごはん | munchのあと、十分満たされた時だけ小さく喜ぶ | 未確認 |
| じゃれる | 楽しい/うんざりの結果が違って見える | 未確認 |
| 薬 | 治癒は落ち着く→小さく喜ぶ、間違い投薬はshakeで終わる | 未確認 |
| 睡眠 | doze / wake stretchが自然 | 未確認 |
| 26体 | メインの状態だけで全員が一斉に跳ねない | 未確認 |

結果は `未確認 / OK / 要調整` の三値で記録する。自動テスト結果から実機項目をOKへ変更しない。

critical lifeでも、既存の `world-breeze`（約±3px）または `world-float`（約±5px）の共有environmental swayは残る。Phase 1の自動試験が止める対象は新しいpet idle / cueであり、実機での「ほぼ静止」の見え方は未確認とする。
