# Astra Work への統合引き継ぎ — CPU第4段階（PR #409）

確定日: 2026-10-21。確定版はPR #409 head `7157b934068c0b4a723c5feaafbe511000a871f3`（tree `fb9c83a3…`）です。この資料を追加したコミットでは、ランタイムコードは変更していません。
内容の詳細は [README.md](README.md)（変更一覧・実行条件）と [REPORT.md](REPORT.md)（検証・未解決）にあります。本書は統合に必要な補足だけをまとめます。

**CPUの追加チューニングは、本人のiPhone試遊結果が出るまで停止しています。** デッキ構成（`cpu-decks.mjs`）と評価係数（`cpu-policy.mjs` の `PROFILES`・`challengeValue`・`opponentSwingChance` など）は、この版で固定します。

## 1. PRの依存関係と統合順序

```
main (c3a72aa, #403 統合済み)
 └ #404 claude/card-balance-verification-20261020  143f709  検証のみ（ランタイム変更なし）
    └ #406 claude/card-cpu-legacy-eval-20261020   dda7c9d  cpu-observation / cpu-policy
       └ #407 claude/card-cpu-strategy-20261021   25c1519  cpu-observation / cpu-policy
          └ #409 claude/card-cpu-variety-20261021 7157b93  CPU・デッキ・UI（本PR）
```

- 最新mainとの単独マージ試算（`git merge-tree`、2026-10-21）: #404・#406・#407 は**衝突なし**です。#409 は `app.mjs`・`index.html`・`style.css` の3ファイルで衝突します（§5）。
- 推奨: #409のブランチ（#404〜#407を含む）を最新mainへ1回で統合します。衝突解消とPages allowlist更新（§6）を同じ統合PRで行います。順に統合する場合も、#406の時点で allowlist の更新が必要です（`cpu-observation.mjs`・`cpu-policy.mjs` はハッシュ固定の対象です）。
- **mainへのマージは本番Pagesの公開になります**: `.github/workflows/pages-runtime.yml` は main への push でデプロイジョブを実行します。統合PRの作成・CI確認までと、mainマージ（公開）とは、承認を分けてください。

## 2. ランタイム変更ファイル（Pagesで配信されるもの）

| ファイル | 由来 | 内容 |
|---|---|---|
| `cpu-observation.mjs` | #406/#407/#409 | CPUへ渡す安全な観測（旧規則6種のhint、自分の残り山札の多重集合、探索の一致判定、`challengeKit`） |
| `cpu-policy.mjs` | #406/#407/#409 | 評価関数（`PROFILES`、時の機会費用、探索・回収、ちょうせんの期待値） |
| `cpu-decks.mjs` | **#409で新規** | CPU戦略デッキ7種、`pickCpuDeck`、`resolveCpuDeck` |
| `cpu-session.mjs` | #409 | 保存の `cpuDeck`、復帰時の照合、終了後だけデッキ名を投影 |
| `app.mjs` / `index.html` / `my-decks-ui.mjs` / `ui-presentation.mjs` / `style.css` | #409 | 選択UI・開始処理・結果表示 |

ランタイムではないファイル（配信しない）:
- `tests/cpu-*.test.mjs`、`tests/ui-field-declaration.test.mjs`
- `balance-verification-2026102*/`（検証資料。allowlistに入れないでください）

エンジン・`rules.mjs`・`cards.mjs`・`full-catalog.mjs`・`effects.mjs`・アート・`docs/card-game/` は、スタック全体で変更0件です。

## 3. CPUデッキと選択UIの接続箇所（PR #409 head の行番号）

| 箇所 | 内容 |
|---|---|
| `index.html` `.match-options` 内 | `<label data-cpu-setting>CPUのデッキ<select id="cpu-deck-mode">`（auto/choose/fixed/mydeck）、`#cpu-deck-type-wrap` > `#cpu-deck-type`、直後に `<p data-cpu-setting id="cpu-deck-guide">` |
| `app.mjs:6` | `import {CPU_DECKS,resolveCpuDeck,cpuDeck} from './cpu-decks.mjs'` |
| `app.mjs:147-150` `$('new').onclick` | `seeds` を3個にし、`resolveCpuDeck({mode,chosen,last,seed:seeds[2]})` でCPUの席のデッキを差し替えます。`new CpuSession({...,cpuDeck:label})` に渡し、開始後に `writePref({last})` |
| `app.mjs:157-158` | `strategyDeck()` と、`mountMyDecks({...,seats})`（戦略デッキ使用時は人間の席だけを検証） |
| `app.mjs:166-179` | 端末内の設定 `naotocchi-cpu-deck-pref-v1`（`readPref`/`writePref`、失敗は無視）、`deckGuide()`、選択肢のonchange、`modeGuide()` の案内文 |
| `my-decks-ui.mjs:7,47` | `mountMyDecks` の任意引数 `seats`（既定 `['A','B']`）と、`refresh()` の開始ボタン判定 |
| `cpu-session.mjs:3-25,51-57` | `deckLabel()` による検証、`cpuDeck` の保持・保存・復帰、`projection.cpuDeckName`（`finished` のときだけ） |
| `ui-presentation.mjs:247` | 結果パネルの `<p class="cpu-deck-reveal">CPUのデッキ：…</p>` |
| `style.css` 末尾 | `.cpu-deck-guide`、`.cpu-deck-reveal` |

## 4. セーブ互換性

- CPU保存は `cpu-match-1` のままで、`POLICY_VERSION` も `heuristic-1` のままです。追加は任意項目 `cpuDeck {mode,id,name,seed}` だけです。
  - 旧保存（`cpuDeck` なし）→ 新コード: 復帰できます（`cpuDeck=null`、結果にデッキ名は出ません）。テストで確認済みです。
  - 新保存 → 旧コード: main の `CpuSession.restore` は未知のキーを無視するため、復帰できます（デッキ名の表示が無くなるだけです）。
  - `cpuDeck` があるのにCPUの席の40枚と一致しない保存は「CPUデッキ情報が対戦と一致しません」で拒否します。偽のデッキ名表示を防ぐためです。
- 2人対戦の保存（`hotseat-2`・`naotocchi-hotseat-v1`）、マイデッキの保存（`naotocchi-my-decks-v1`）、エンジンの保存形式は変更していません。
- 進行中のCPU保存を新しいコードで再開すると、保存済みの操作列はそのまま再生されます。再開後のCPUの判断だけが新しい評価になります。
- 新しい端末内キー `naotocchi-cpu-deck-pref-v1` は便宜上の設定です。消えても動作は既定（おまかせ）に戻るだけです。

## 5. PR #403（main統合済み）との競合と解消方針

3ファイルとも、**両方の追加を残す**のが正しい解消です（同じ位置に双方が追加しただけで、ロジックの取り合いではありません）。

| ファイル | main（#403）側 | #409側 | 解消 |
|---|---|---|---|
| `app.mjs`（2か所） | `mountCollection({onRule,…})` と学習用の `mountLearning`・メインメニューのボタン類。`modeGuide()` の文言とaria-pressed | `strategyDeck`/`mountMyDecks({seats})`、デッキ設定の関数群、`modeGuide()` の案内文の分岐 | mainの `mountCollection`・学習コード・`modeGuide()` 本体を残し、#409の `seats` 引数・`deckGuide` 群を追加します。`modeGuide()` の案内文にだけ#409の分岐（`strategyDeck()?…`）を入れ、onchangeは `modeGuide();deckGuide();` |
| `index.html` | 開始画面の構造を変更（`main-menu`・`#match-setup`・`match-start-actions`）。`.match-options` の中身は従来のまま | `.match-options` へ2つのlabelを追加し、`#cpu-deck-guide` を追加 | mainの新構造を採用し、`#match-setup` 内の `.match-options` へ#409の2つのlabelを、その直後に `#cpu-deck-guide` を入れます。タイトル・ヘッダはmainのものにします |
| `style.css` 末尾 | メインメニュー・カード表示の追加CSS | `.cpu-deck-guide`・`.cpu-deck-reveal` | 両方残します |

自動マージされるが確認が必要な点:
- `my-decks-ui.mjs`（自動マージ）: `refresh()` の開始ボタン判定が `seats()` を使っているか確認してください。
- `ui-presentation.mjs`（自動マージ）: 結果パネルに `cpu-deck-reveal` が残っているか確認してください。
- **mainのチュートリアル `onCpu`**（`app.mjs` の `mountLearning({...onCpu})`）は、CPUの強さ・席を設定して `modeGuide()` を呼びます。統合後は `deckGuide()` も呼ぶ必要があります（デッキ案内文と、CPUの席の選択無効化の更新）。チュートリアル後の練習対戦でCPUのデッキをどうするか（例: おまかせのまま／標準のマイデッキ）は、統合時に決めてください。#409では決めていません。
- mainのチュートリアル（`tutorial.mjs`）は `cpu-policy`・`cpu-observation` を使いません（台本で動くCPU）。そのため、CPU評価の変更はチュートリアルの手順に影響しません。

## 6. Pages allowlist（統合PRで必須）

`tools/pages/allowlist.json` は、パスとSHA-256を個別に固定しています（`tools/pages/README.md`「Updating runtime dependencies」）。

1. `files` に `prototypes/card-game/cpu-decks.mjs` を追加します（新規import。追加しないと、公開版で `app.mjs` の読み込みに失敗します）。
2. `reviewed_runtime_sources` の SHA-256 を、統合後の内容で更新します: `cpu-observation.mjs`・`cpu-policy.mjs`・`cpu-session.mjs`・`app.mjs`・`my-decks-ui.mjs`・`ui-presentation.mjs`・`style.css`・`index.html`、それに `cpu-decks.mjs` の追加。
3. `balance-verification-*` などの検証資料は追加しません。
4. `python -m unittest discover -s tests/pages -v`、`package.py`、`verify.py` を実行します（READMEの手順）。

## 7. 統合後の最小限の回帰テスト

```sh
# 1) 単体・統合（mainのチュートリアル/ルールブック試験を含む）
node --test prototypes/card-game/tests/*.test.mjs
#    既知の失敗: catalog.test.mjs「regeneration is deterministic…」（FUN_ITEMS、#404以前から既存）。main単体での結果と比べ、増えていないことを確認する
# 2) 判断が検証済み版と同一か（14戦、約20秒）
cd prototypes/card-game/balance-verification-20261022-variety
node ../balance-verification-20261020/run.mjs runs/pilot-manifest.json /tmp/pilot.jsonl && python3 verify-pilot.py /tmp/pilot.jsonl   # mismatch [] になること
# 3) 選択UI（390×844・タッチ、mainの新しい開始画面で）
NODE_PATH=$(npm root -g) node ui/ui-check.cjs /tmp/ui   # pageErrors []、horizontalOverflow false、cpuSeatHasChosenDeck true、deckNameHiddenDuringPlay true
# 4) Pages
python -m unittest discover -s tests/pages -v
```

- mainで追加されたDOM／ブラウザ試験（`learning.dom.mjs`・`menu.dom.mjs`・`tutorial-board.dom.mjs`・`ui-*-layout.browser.mjs` など）も、mainの手順どおり実行してください。
- `ui-check.cjs` は、`#cpu-deck-mode`・`#new`・`#restore` などのIDを前提にしています。mainの開始画面でIDが変わっていれば、それに合わせてください。

## 8. 検証結果の正本（変更しないもの）

| 内容 | 場所 |
|---|---|
| #404 の基準 3,094戦 | `../balance-verification-20261020/` |
| #406 の再検証 3,080戦 | `../balance-verification-20261020-cpufix/` |
| #407 の再検証 3,080戦＋直接対戦 3,360戦 | `../balance-verification-20261021-strategy/` |
| #409 | このディレクトリ。E1〜E3 3,080戦、V1 1,680戦、V2 840戦、直接対戦 3,360戦、pilot 14戦、tuning（総当たり560戦×3、ablation 1,680戦×3。不採用案を含む） |

- 異常終了0・再生不一致0、層別再実行227/227一致です。manifest・seed・ログ・レポートは確定版です。
- 固定400戦（`docs/card-game/data/proxy-population-400-*`）は、#404〜#409のどのPRでも変更0件です。状態は「予定400・完走0・未完了1・未実施399」のままで、その承認ゲートは本作業と独立しています。

## 9. 残る実機QA（本人のiPhone試遊で評価）

- 開始画面の「CPUのデッキ」選択の分かりやすさ（mainの新しい開始画面に組み込んだ後の見た目・タップしやすさ）
- おまかせで、対戦中にCPUのデッキが分からず、終了後に表示されること
- 固定・指定の動作と、保存復帰後もデッキ名が正しいこと
- ちょうせん宣言側の勝率（約98%）が対人で単調に感じるか
- 初級と中級の差（CPU同士では約54:46）が体感できるか
- 初期配札への依存（鏡像組の82〜92%で同じ並び側が両勝）が対人で目立つか
- 7種の戦略デッキの個性が感じられるか、対戦が楽しいか
- iPhone Safari での表示（PR #409 は Chromium 390×844 でだけ確認しています）
