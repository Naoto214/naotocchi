# アイテムV2：承認済み22品と経済の検証記録

2026-09-16。対象は通常装具10＋使い切り12と、正本の承認済み経済・日次・伝説。なおとシリーズ4達成品の新しい効果は別の未承認設計であり、完成範囲に含めない。[未確定事項と提案](../specs/2026-09-16-naoto-series-v2-open-decisions.md)を参照。幼少期の自然年齢リスクは現在0で、旧U字型リスク前提は未解決の設計判断。

PR #274はDraft・未マージを維持する。この記録は作業ブランチの実装とローカル検証であり、mainへの反映や最新GitHub CI成功を意味しない。公開・全体レビュー・最新HEADのCIは別の最終工程。

## 基準と継続位置

- 本タスク開始HEAD: `9f84e5dc98fe2e927bbb70d1bf2fbfc3d6546d7b`、tree `471cf5824790fe317c5470c7b76d88ebb6796b98`、作業ツリーclean。
- 開始時点の復旧チェックポイント: `2a3e057a35de9a7e279269cc1497b58478d7b0e1`（同一tree）。元PR HEAD `b3faed9`。リモート確認・更新はroot担当。
- [使い切り12種の完成・検証記録](2026-09-16-consumables-v2-verification.md)を引き継いでおり、古い復旧文のTask4時点へ戻さない。
- Quick／日次とイベント経済の実装はTasks1／2で個別RED→GREEN・レビュー済み。本タスクではそれらの報酬コードを変更していない。

## 正本§1〜10の対応

正本は[2026-09-16 items V2 decision log](../specs/2026-09-16-items-v2-decision-log.md)。旧focused specの相違は正本を優先する。

| 節 | 実装・保持する契約 | 主なソース／実行済みの検証 |
|---|---|---|
| 1 基本方針 | 通常装具1枠、販売10＋12、旧専用ごほうび・お楽しみ廃止、なおと4品は別枠 | `item-system.js` catalog/normalization、`script.js` shop/equipment；`item-inventory-test.cjs`、`items-v2-care-automation-test.cjs`、`normal-equipment-browser.cjs`、`consumables-v2-browser.cjs` |
| 2 コイン経済 | 普通0／30／60、Star普通だけ3倍、混合Quick20/20だけ100、4系統以外の通常収入を停止、返金は補償 | `ordinaryMinigameCoins`、`finishMinigameInner`、`applyGamePassSuccess`、Lucky apply、`settleDuel`；`item-care-game-test.cjs`、`economy-test.cjs`、`quick-mode-test.cjs`、`quick-daily-economy-v2-test.cjs`、`item-economy-sources-v2-test.cjs`、`lucky-coin-test.cjs`、`item-collections-economy-test.cjs` |
| 3 通常装具10種 | 全価格／説明／装備1枠、閾値自動世話、睡眠即全快、旅の消費0と疲れ維持、関係回復、Gamepass5秒と除外、Star | `script.js` equipment/care/tick/Gamepass、`item-system.js` catalog；`item-inventory-test.cjs`、`items-v2-care-automation-test.cjs`、`items-v2-ease-automation-test.cjs`、`item-relations-travel-test.cjs`、`item-care-game-test.cjs`、装具browser |
| 4 使い切り12種 | Lucky即ルーレット、命だけ回復、自動救命と100歳除外、5分だけ前後／図鑑姿、合法3候補、通常／レア未加入指定、相互恋愛候補、未経験卵 | `script.js` `CONSUMABLE_ITEMS`/picker/temporary form/death/dream helpers、`item-system.js` stock/catalog；`lucky-coin-test.cjs`、`consumables-v2-{migration,life,forms,encounters,eggs}-test.cjs`、使い切りbrowser |
| 5 予約／移行 | 予約1件、取消無料、孵化時1回消費、在庫持越し、旧在庫・予約・無限snapshotを重複返金しない | `item-system.js::migrateConsumablesV2`、`script.js::migrateNormalEquipmentV2`/egg helpers；`consumables-v2-migration-test.cjs`、`consumables-v2-eggs-test.cjs`、`item-inventory-test.cjs`、`item-collections-economy-test.cjs`、両既存browserのreload／移行 |
| 6 日次 | 当日の指定ゲーム実成功30以上でLucky1、失敗／quit／別ゲーム／Quick／Gamepass不可、同一日reload・次人生・無限・旧claimは重複不可、翌日は再取得 | `dailyKey`/`dailyChallengeGame`/`dailyChallengeToday`/`finishMinigameInner`；`quick-daily-economy-v2-test.cjs`、`item-relations-travel-test.cjs`、新`item-economy-v2-browser.cjs` |
| 7 伝説 | 購入不可、条件付きランダム1人生1回、未体験優先、地域重み、全5種の映画／発見／人生記録維持、育成・コイン報酬なし | `triggerLegendEncounter`/movie builder；`item-economy-sources-v2-test.cjs`、`movie-test.cjs`、`dialogue-test.js`の6 blocked states・7 paused menus・5 unseen legends |
| 8 撤去 | お楽しみ7、専用ごほうび、伝説／探検ticket、旧装具、旧Star集計・再会UIを戻さない | `retireFunItems`/normalization、ショップ・使用handlers；`item-experiences-test.cjs`、`item-inventory-test.cjs`、`consumables-v2-life-test.cjs`、`items-v2-ease-automation-test.cjs`、`ui-illustrations-test.cjs` |
| 9 仕様優先順位 | 正本へのリンクと現在のREADMEを更新し、旧設計は履歴として保持 | `README.md`、`NAOTOCCHI_MASTER_SPEC.md`冒頭、本記録、復旧引継ぎ冒頭。人向け文書をソース文字列テストに置換しない |
| 10 実装状態／公開 | 検証結果を記録しDraft維持。ここで公開・mergeの完了を主張しない | 下記ローカル実測結果、Task3 report；最新HEAD CI・全体レビュー・main不変確認はrootの最終記録待ち |

Gamepassの除外は、実プレイ回数・記録・自己ベスト・高得点実績・日次・なかま加入・消耗品予約／Lucky在庫を変えないことを`item-care-game-test.cjs`と`item-relations-travel-test.cjs`で確認。`quick-mode-test.cjs`は普通Gamepass待ち時間中もQuickを実ゲームで開始できることを確認する。5秒ちょうどとreload後の残り待ち時間は装具browserで実測。

## コイン発生源の監査

現在の正の加算箇所9件は、Lucky使用、Quick混合完走、通常ゲーム、Gamepass普通成功、duel精算、未公開duel掛け金返却、通常装具移行返金、お楽しみ移行返金、使い切り移行返金。後4件中の掛け金返却と3種移行返金は通常収入ではない。誕生日・段階・そだち・中年・環境・シール・留守・伝説からの加算はない。取得済み残高・在庫・旧claimを遡って没収しない。

移行はlifelong bagを正本にし、live／infiniteの重複、前払い予約と在庫の二重補償、既使用効果、異常数値、旧Lucky pending、孵化予約を個別にテストする。旧価格差額の追加請求はしない。

## ブラウザの内容と視覚回帰

新モジュールはPlaywrightの実DOMボタンでQuick開始・終了とblackjack全4ハンドを操作する。公開保存`naotocchi-save-v1`だけをseedし、日付をUTCの2026-07-13、乱数を0.99に固定する。本物の指定ゲームが`blackjack-21`であることをUIで確認する。毎回hitで15点の失敗、standで60点の成功となり、通常30コインとLucky1だけを確認。reload後の再プレイ、旧同日Dランクclaimも実ゲーム完了まで通す。報酬・ゲーム完了handlerを置換せず、デバッグAPIも追加しない。

混合Quick20/20の成功は既存のruntime `quick-mode-test.cjs`で実Quick solver→20個の結果→遅延final callbackを2ラン実行し、100ずつの精算、Star除外、実績、再読込、重複・古いcallbackの拒否を確認する。ブラウザでランダム全20問の成功を主張しない。

初回browserの操作は6/6成功したが、rootのスクリーンショットレビューで320pxのQuick本文が縦1文字、390pxで100コインの末尾が省略される問題を発見。原因は横一列flexの非縮小statusと2行line-clamp。読める本文幅と全テキストのscroll-overflow検査を追加し、修正前に「`.quick-card squeezes copy into 2px at 320`」でREDを確認。`style.css`でカードの本文と操作を別行のgridへ変更し、見出しwrapと説明のclamp解除だけを行った。`index.html`のCSS cache tokenを更新。ゲーム処理・価格・報酬・PNGは変更していない。

## 実行結果

- 初回focused: **326/326 pass**。
- 初回`npm test`: **830/830 pass**＋smoke・dialogue・visual-QA各script成功。既知Quick solver flakeは発生せず、baseline比較やassertion緩和は不要だった。
- 初回local Chromium **153.0.8010.0**: 装具／使い切り／新経済×320/390の**6/6 pass**。視覚欠陥を見落とした初回assertionのみを完成根拠にしない。
- 視覚回帰RED後: asset／viewport／screens／Quick／daily focused **67/67 pass**、修正した経済browser **2/2 pass**、続く`npm test` **830/830 pass**＋先行script成功、最後に全3モジュールのChromium **6/6 pass**。変更のあるCSSの検証のために再実行し、緑の任意再実行はしていない。
- 320/390の未達成・達成済みカードをフルサイズで確認し、Lucky1と20/20完走100コインの全文、開始ボタン、スクロールが収まることを確認。全14枚の成功PNGも一覧で視覚確認した。`git diff --check`、両browserの`node --check`成功。
- 最新HEAD GitHub Runtime/Home CI、WebKit実行、全体レビュー、PR反映はrootの最終工程。Home runnerには新モジュールを既存と同じengine loop内へ追加し、Chromium/WebKit両方で実行する。

出力は`test-results/consumables-local/`の各JSONと14枚の今回の成功PNG（装具2、使い切り6、経済6）。同ディレクトリに残る古い`*-failure.png`は成功証拠に数えない。既存Homeレイアウト網羅は削除しない。CI全体の時間は未測定のため、この時点では10分timeoutを変更しない。

## 承認済みPNGの不変確認

`git hash-object`で開始コミットのblobと一致した。

| ファイル (`assets/items/normal-equipment/`) | Git blob SHA |
|---|---|
| `bento-box.png` | `f02296e488dcf7b19b96b1b56cf9db5e67629423` |
| `first-aid-box.png` | `fad04de9e1bc740863b18b90c328295718d8b8fa` |
| `toy-box.png` | `fc601ae0292158e401239231fc9c319eaeb1ce1d` |
| `game-pass.png` | `903c482ce593e7869bc6f39b5c1d72b2e4da9642` |

タスクの正確な最終commit・検証command・ログ・自己レビューは`.superpowers/sdd/2026-09-16-items-v2-economy-completion/task-3-report.md`へ記録する。公開時の最終HEAD/CIはrootが追記する。
