# アイテムV2：承認済み22品と経済の検証記録

2026-09-16。対象は通常装具10＋使い切り12と、正本の承認済み経済・日次・伝説。なおとシリーズ4達成品の新しい効果は別の未承認設計であり、完成範囲に含めない。[未確定事項と提案](../specs/2026-09-16-naoto-series-v2-open-decisions.md)を参照。幼少期の自然年齢リスクは現在0で、旧U字型リスク前提は未解決の設計判断。

PR #274はDraft・未マージを維持する。実装・ローカル検証・全変更レビューと、コード保存HEADの両CIは成功した（末尾の最終確認）。mainへは反映していない。この検証記録を追記した文書保存HEADの最終CI結果は、PR本文へ別途記録する。

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
| 10 実装状態／公開 | 検証結果を記録しDraft維持、mainへは未マージ | 下記ローカル実測結果と末尾の全変更レビュー・コードHEAD両CI・main不変確認。文書保存HEADの最終CIはPR本文 |

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
- ローカル検証時点ではGitHub CI／WebKit／全体レビュー／PR反映は未実施だった。その後の完了結果は末尾へ追記。Home runnerの同じengine loopから新モジュールをChromium/WebKit両方で実行した。

出力は`test-results/consumables-local/`の各JSONと14枚の今回の成功PNG（装具2、使い切り6、経済6）。同ディレクトリに残る古い`*-failure.png`は成功証拠に数えない。既存Homeレイアウト網羅は削除しない。CI全体の時間は未測定のため、この時点では10分timeoutを変更しない。

## 承認済みPNGの不変確認

`git hash-object`で開始コミットのblobと一致した。

| ファイル (`assets/items/normal-equipment/`) | Git blob SHA |
|---|---|
| `bento-box.png` | `f02296e488dcf7b19b96b1b56cf9db5e67629423` |
| `first-aid-box.png` | `fad04de9e1bc740863b18b90c328295718d8b8fa` |
| `toy-box.png` | `fc601ae0292158e401239231fc9c319eaeb1ce1d` |
| `game-pass.png` | `903c482ce593e7869bc6f39b5c1d72b2e4da9642` |

タスクのcommit・実行command・変更ファイル・判断は以下に保存する。無視対象のローカルreport／logsは追加の出典であり、継続に必要な情報の唯一の保存先にはしない。公開したコードHEAD／CIは末尾に追記済み。


## レビュー済み保存地点と再現コマンド

Tasks1／2／3の個別レビューはPASS／Approved。以下は個別レビュー時点の保存地点。後続の全変更レビュー、PR反映、コードHEAD CIは末尾に区別して記録する。

| 地点 | Commit | Tree／確認範囲 |
|---|---|---|
| 経済作業の比較元 | `30df0ae707fb05aa945b7aee38546ea53c026d15` | 承認済み通常装具・使い切り完成後、今回の経済完成作業前 |
| Task3最終ローカル実装 | `dfc284218f4fcda51cf4a2dda79db02273424047` | `6c50a3f10a6f98557e41a68aa27c1ae7ed8ed68b`、個別レビューPASS |
| 同等内容のリモート保存（root報告） | `bf8df2eb778055044ab4ab2cf609e5daa730fc67` | 同一tree `6c50a3f10a6f98557e41a68aa27c1ae7ed8ed68b`。本記録の担当agentはリモート操作していない |

以下は実際に使ったコマンド。作業ディレクトリは `/workspace/scratch/949941642af1/items-v2-work`。ローカルrunnerはその外の一時補助ファイルだが、呼び出す3モジュールはリポジトリ内の同じ本番browser testsで、Home CIからも利用される。ローカルログの共通場所は `.superpowers/sdd/2026-09-16-items-v2-economy-completion/task-3-logs/`。

1. 初回focused — **326 pass／0 fail／0 skipped**、`focused.txt`。

```sh
node --test tests/quick-mode-test.cjs tests/quick-daily-economy-v2-test.cjs tests/item-economy-sources-v2-test.cjs tests/economy-test.cjs tests/lucky-coin-test.cjs tests/item-inventory-test.cjs tests/item-care-game-test.cjs tests/items-v2-care-automation-test.cjs tests/items-v2-ease-automation-test.cjs tests/item-relations-travel-test.cjs tests/item-collections-economy-test.cjs tests/consumables-v2-*-test.cjs tests/movie-test.cjs tests/offline-test.cjs tests/sticker-test.cjs
```

2. 初回全体 — **830 pass／0 fail／0 skipped**と先行smoke／dialogue／visual-QA script成功、`full.txt`。

```sh
npm test
```

3. 初回browser — Chromium153.0.8010.0、**6/6 pass**、`browser-first.txt`。この後の画像レビューでカードの省略を発見した。

```sh
node /workspace/scratch/949941642af1/run-item-browser.cjs "$PWD" normal-equipment-browser.cjs consumables-v2-browser.cjs item-economy-v2-browser.cjs
```

4. 視覚回帰テスト追加、CSS修正前 — **RED**、`layout-red.txt`。`.quick-card squeezes copy into 2px at 320`。CSS修正後も同じコマンドを実行し **2/2 pass**、`layout-green.txt`。

```sh
node /workspace/scratch/949941642af1/run-item-browser.cjs "$PWD" item-economy-v2-browser.cjs
```

5. CSS修正時のcache更新とfocused — style.css参照1件更新、**67 pass／0 fail／0 skipped**、`layout-focused.txt`。実行順はcache更新→focused→上の回帰GREEN。

```sh
node tools/bump-versions.js
node --test tests/asset-versions-test.cjs tests/viewport-design-test.cjs tests/screens-test.cjs tests/quick-mode-test.cjs tests/quick-daily-economy-v2-test.cjs
```

6. CSS修正後の最終全体→実browser — **830 pass／0 fail／0 skipped**と先行scripts成功、`full-after-layout.txt`。続いてChromiumの**6/6 pass**、`browser-final.txt`。CSSに具体的な変更が入ったため必要な再検証であり、任意の緑再実行ではない。

```sh
npm test
node /workspace/scratch/949941642af1/run-item-browser.cjs "$PWD" normal-equipment-browser.cjs consumables-v2-browser.cjs item-economy-v2-browser.cjs
```

7. Syntax／差分検査 — すべて成功。今回の追補は文書だけで、suiteは再実行しない。

```sh
node --check tests/item-economy-v2-browser.cjs
node --check tests/home-layout-browser.cjs
git diff --check
git diff --cached --check
```

### 全体ログの既知・意図的な診断出力

`full-after-layout.txt`は診断なしのログではない。下記は失敗処理そのものを確かめるテストから意図的に出力され、実測の集計は**830 pass／0 fail／0 skipped**。警告・例外文言だけでテスト失敗扱いにも、逆に無視して「pristine」扱いにもしない。

| ログの位置 | 出力と発生元 | 意図して確かめること |
|---|---|---|
| 1行 | npm `Unknown env config "http-proxy"` | 実行環境のnpm設定警告。アプリのassertion失敗ではない |
| 22行から | `[naotocchi] test Error: probe failure`、`tests/album-test.cjs`の`recorded runtime errors appear in the data screen` | 記録した例外がデータ画面に表示される |
| 580行から | `[naotocchi] minigame Error: boom`、`tests/minigame-lifecycle-test.cjs`のframe-loop crash test | 2フレーム目の例外でゲームを閉じ、報酬を与えず、次のゲームを開始できる |
| 591行から | `[naotocchi] minigame Error: start boom`、同ファイルのstart crash test | 開始処理の例外からoverlayとセッションを安全に閉じる |
| 758〜800行付近 | `localStorage quota exceeded`計4出力、`tests/save-recovery-test.cjs`のsave呼出し52／63行、export handler240行、permanently-full-storage282行 | 復旧後の保存失敗でもbackup保持、直近成功backup維持、修復不能primaryからのrecoverable export、恒常的な容量不足の可視化 |

既知Quick solver flakeは今回の実行で発生せず、baseline比較やassertion緩和はしていない。

## 判断台帳：レビューで採用した3件

正本を現在の既存モードと保存形式に適用するための解釈を明示する。新しい報酬や強さの追加ではない。

| 判断 | 根拠／守る境界 | 判断が誤っていた場合のコスト |
|---|---|---|
| Solo Quickは100点でも0コイン | 正本の100コイン条件は混合20/20完走。Soloは10問で、100点という表示だけでは20/20を満たさない。記録・実績は維持する | Soloへの支払いが意図されていた場合、Solo成功者の期待報酬を欠く。逆に点数だけで100を払うと未承認の10問金策経路を増やすため、独断で拡張しない |
| 日次は開始入口によらず、精算日の指定ゲームを実プレイして成功すれば達成 | 正本は日付ごとの指定ゲームと実成功を条件にし、専用ボタン限定とはしていない。game-list入口も対象、Gamepass／Quick／失敗／別ゲームは除外。同日重複は防ぐ | 専用ボタン限定が意図されていた場合、通常入口からの指定ゲーム成功にもLuckyが付く。一方入口で限定すると同じ指定ゲームを正しく遊んだ成功を取りこぼす。経済影響は1日1個の枠内 |
| 移行完了後の有効な共有`boostTicks`は保存して維持 | 日次から今後のboost付与は停止するが、移行後の共有残量は通常Sランク由来と旧日次由来を確実に区別できない。既存一度限り移行は維持し、毎loadで再削除しない | 古い日次由来が残る場合は、その残り時間だけ利益が続く。逆に一律削除すると正当に獲得済みのSランクboostを没収する。由来不明の有効値への遡及削除はしない |

## 今回の経済完成作業の累積変更26ファイル

抽出コマンドは `git diff --name-only 30df0ae HEAD`、抽出時HEADは`dfc284218f4fcda51cf4a2dda79db02273424047`。この文書追補も既存2文書の更新だけなので累積ファイル集合は変わらない。これ以前の使い切り完成作業全体のファイル一覧とは区別する。

```text
NAOTOCCHI_MASTER_SPEC.md
README.md
docs/superpowers/plans/2026-09-16-consumables-v2-recovery-handoff.md
docs/superpowers/plans/2026-09-16-items-v2-economy-completion.md
docs/superpowers/plans/2026-09-16-items-v2-economy-verification.md
docs/superpowers/specs/2026-09-16-naoto-series-v2-open-decisions.md
index.html
package.json
script.js
style.css
tests/dialogue-test.js
tests/economy-test.cjs
tests/helpers/runtime-harness.cjs
tests/home-layout-browser.cjs
tests/item-care-game-test.cjs
tests/item-economy-sources-v2-test.cjs
tests/item-economy-v2-browser.cjs
tests/item-experiences-test.cjs
tests/item-inventory-test.cjs
tests/midlife-test.cjs
tests/movie-test.cjs
tests/offline-test.cjs
tests/quick-daily-economy-v2-test.cjs
tests/quick-mode-test.cjs
tests/region-identity-test.cjs
tests/sticker-test.cjs
```

## 最終レビュー・コード保存HEADのCI確認

- 全変更レビュー：比較元 `30df0ae707fb05aa945b7aee38546ea53c026d15` → `fb6979970d5997813bb9e2f630edb88584e30237`、PASS。Critical／Importantなし。唯一のMinorはシールのお題の旧「おかねと」内部コメント。
- 最終修正：ローカル `b07de18fd7a860d78a30667b72e24a077cf7d61f`。そのコメントとscript cache tokenだけを修正し、syntax／asset2件／diff確認成功。実行処理は変更なし。限定再レビューもPASS、指摘はすべて解消。
- GitHubコード保存HEAD：`919a49d067e40094d2ec805f4654b133d0c854cb`。tree `990b2b65645ba5a1b2762d67b340c310d7c06026` は最終ローカル内容と完全一致。
- 本来の作業ブランチと復旧ブランチへ同じコードHEADを保存。通常のfast-forward、force pushなし。PR本文を現在の確定仕様へ更新した。
- [Runtime smoke test #748](https://github.com/Naoto214/naotocchi/actions/runs/35163252366)：**success、830 pass／0 fail／0 skipped**。job `105018547398` の完了ログで確認。
- [Home layout #277](https://github.com/Naoto214/naotocchi/actions/runs/35163252378)：**success、Chromium83／WebKit83、計166 PASS、FAIL0**。job `105018547245` の完了ログで集計。新しい日次／Quickの320・390も両engineでPASS。実行9分、既存10分timeout内で完了。
- CI検証用の合成commit `da71d4a159b4c1389e5c7eddd1de2499c92dc1cf` のtreeも上記保存HEADと一致。この合成commitはmainへのマージを意味しない。
- 両CI後にGitHubを再読込し、PR HEADが `919a49d…`、Draft=true、merged=false、main=`bcdd6a6811ce8255ef16895ffff26f53b89d1478` 不変を確認。

この追記は文書2ファイルだけ。ゲームコード・テスト・PNGに追加変更はない。文書を保存した後の最終HEADでもRuntime／Homeを確認し、結果と実行URLは[PR #274本文](https://github.com/Naoto214/naotocchi/pull/274)へ保存する。最後の文書commit自身のSHAを追記して無限に新commitを作ることはしない。

なおと4達成品の新効果は未承認設計として残る。販売22品と承認済み経済の実装漏れとは分けて明示し、数値・方式を勝手に確定しない。
