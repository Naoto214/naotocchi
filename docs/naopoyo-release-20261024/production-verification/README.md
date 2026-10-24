# PR #435 本番配信・公開後CI 最終確認

確認日: 2026-10-24（日本時間）。今回の引き継ぎ時点でPR #435は既にマージ済み。
重複実装・再マージは行わず、残っていた配信照合と公開後CI確認を完了した。

## 対象

- PR HEAD: `59b6053da224d4981e0ae16962244e638251885c`
- PR/main tree: `c92d3d77ccaec865c9478e8d1c1a011e7e2e72ba`
- main: `92ac654644351a169b9661e2319b0cd81670c497`
- main parents: `e7fef44b92233ebcbdcee5b7e9bebb97d3b790e7`, `59b6053da224d4981e0ae16962244e638251885c`
- Pages workflow: https://github.com/Naoto214/naotocchi/actions/runs/40005897654
- 配信期待値: 上記workflowの `pages-capacity-reports` artifact `12523428790` の `package-report.json`。
- artifact ZIP digest: `929960db6bef232b6136347ffcb55062307eec2cc48eddfd6874f70b8f4a8d45`
- `package-report.json` SHA-256: `a3d8690bf4c41e3db19c91dbe137e8357ccc694baad4b0fc2b6b88decac8c16e`

## 本番配信結果

本番URLから全4,053パスを実際に取得し、デプロイ対象mainの期待値と照合した。

- **ゲーム配信4,052ファイル: HTTP 200、SHA-256全一致。**
- **総取得サイズ: 213,456,803 bytes。期待値と完全一致。**
- 正式カード452 ID / 904画像: mainのart-delivery/manifest.jsonに対してサイズ・SHA-256全一致。
- 正式入口5か所: directory URLの応答内容もhash一致。
- 飛行比較室・Pilot画面・開発用資料など9パス: 404。
- **例外1件: `.nojekyll` はHTTP 404。** 生成コード `tools/pages/package.py` が追加する0バイトの制御ファイルで、期待hashは空bytesのhash。
  raw checkerはこの不一致を保持してexit 1になっている。監査条件や結果を書き換えていない。
  ゲーム配信の欠損/hash不一致は0だが、**「4,053パスすべてHTTP成功」とは扱わない**。
  通常入口・全runtime/画像の配信は成功し、この制御ファイルの非公開によるゲーム動作上の問題は確認されていない。

`production-files.json.gz` に全パスの実測結果、`production-summary.json` にraw集計を保存。
`package-report.json.gz` はActions生成物の期待値そのもの。圧縮前SHA-256は上記。
`check-production.py` と `check-production-async.py` を同じディレクトリ構造で実行した。
同期版のcheckpointを使い、接続を再利用するasync版で全件照合を完了。取得済みの成功分はファイルのhashを再検証して引き継いだ。
async版開始時刻は全調査の開始時刻ではない。`.nojekyll`の404は両実行で再現。

再実行例（aiohttpが必要）:

```sh
mkdir -p reports verification runtime
gzip -dc package-report.json.gz > reports/package-report.json
cp check-production-async.py verification/
python verification/check-production-async.py
```

## CIの直接確認

- 最終PR HEAD: 11 workflows成功、**19 jobs成功**。PagesのPR deployのみ仕様どおりskip。
- main push後: 8 workflows / **15 jobsすべて成功**。未完了・中止・失敗0。
- CARD GAME CIログ: **412/412 pass、fail/cancel/skip 0**。元410件を維持し故障注入2件追加。
- パズルCIログ: **526/526 pass、fail/cancel/skip 0**。
- main Runtime smokeログ: TAP計**3,432/3,432 pass**（26+24+3,223+159）、fail/cancel/skip 0。
- Pages build/deploy成功。PR/mainのtreeが同一なので、PR上の第1章/CARD検証済み内容がそのままmainに入っている。
- GitHub review APIにレビュー提出なし。PR説明上の独立レビュー記録とは区別。

`ci-status.json` にworkflow/job ID・結論を保存。対象ログのテスト集計は `ci-log-totals.json`。
修正前2失敗の証跡と修復内容はmainの `docs/naopoyo-release-20261024/` に保存済み。

## 今回の追加実ブラウザ操作（Cloud Chrome）

- 正式入口から第1章へ遷移。初期01だけ有効、02〜10は無効、全10面の一覧を確認。
- ふくろうの物語・正式画像・句点修正、3段階ヒントを確認。
- 第1面を実ドラッグで脱出し、第2面へ進行。
- 第2面の1+1合体を実ドラッグで操作。再読込後に段階2の1体として復帰。
- 復帰後のUndoで初期盤面に戻り、Retry後も01クリア・02開放・03〜10未開放を保持。
- 旧12面リンクから `STAGE 01 / 12` の起動を確認。
- 本編起動・メニュー・CARD GAME導線、CARD GAMEのマイデッキ画面・452/452種類表示・画像表示を確認。
- 本人の保存データを削除・初期化していない。今回の追加操作はCloud Chrome側の状態であり、本人のiPhone検証ではない。

前担当がPRに記録した公開後全10面pointer再生・旧保存fixture・本編有効save fixture・CPU対戦保存復帰の結果は引き継ぎ記録。
今回それら全項目を改めて実施したとは扱わない。最終PR CIのchapter-browser成功とその実ログも確認した。

## 保護・未確認

追加作業によるゲームコード変更は0。CARD GAMEのルール・452枚・画像・96/97固定hash・400戦証跡に変更なし。
旧12面のruntime/store/stages/保存キー、章独立保存、飛行仕様書を維持。飛行の正式導入なし。
PR #422は今回の正式採用対象外。PilotのUIは本番配信されず、必要な共有moduleだけを配信。

本人のiPhone Safari全10面個別QA・本人の実保存データによる復帰は未確認。
今回の追加実ブラウザ操作では全10面・分裂・魔法門・CPU対戦完走を再実施していない。
それらの既存自動/ブラウザ検証は上記の最終HEAD CI・保存済み証跡を参照する。

公開入口: https://naoto214.github.io/naotocchi/prototypes/naopoyo/

この証跡はmainを変更せず別ブランチに保存し、マージ済みPR #435からリンクする。
