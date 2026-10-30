# Version 9 CI follow-up — 2026-10-30

Resumed at PR #462 HEAD `8067baf5aa1211ad6f45854efaa612a096e92629`. The existing v9 artwork, comparison pages and owner-only publication are retained.

## Failure and root cause

Run 41009097493, job 123910673722 (sea-b2), passed the Chromium/WebKit background matrix but failed the interactions runner's final page-error assertion. Its unconditional Playwright init script accessed localStorage on the lifecycle test's `about:blank` document, producing `Access is denied for this document`. This is test setup, not a demonstrated game-save failure.

## Change

Extract the same sentinel initializer into a test-only helper. Seed only when `location.origin` equals the exact HTTP test-server origin, including port. Keep the blank-page navigation, page-error assertion, sentinel byte comparison, save/reload checks, and all pointer/motion assertions. No swallowed storage errors or weakened assertions. Three unit cases cover opaque/unrelated origins, seeding and preservation, and visible storage failures at the real test origin. The original behavior fails the first case; the guarded behavior passes all three. Existing v9 manifest and region selector tests also pass (7 total).

The runner invokes the new unit tests in CI. No runtime, artwork, delivery files, main, PR #426 or Sites deployment is changed. Existing v9 publication remains source `22dab24840fa39f557c180d12a3f2b5167e5c4e4`, saved version 12; v8 rollback version 11 remains available. CI success after the change must be checked separately; this commit is not a claim that browser CI has passed.


## 再開後の検証結果（2026-10-30）

- 再開時HEAD `8067baf5aa1211ad6f45854efaa612a096e92629`、CI修正HEAD `369858842b13a443aae217cf13c277d0a6da3f42`。水辺G・海B2・公開済みv9は作り直さず継承。
- 旧run `41009097493` の海B2操作テストは、テスト用の保存初期化が`about:blank`でlocalStorageを読み失敗。正確なテストoriginでのみ初期化する修正を実施。エラー検出・実ポインタ・reduced-motion・セーブ再開・保存値保護のassertionは維持。詳細はCI-FOLLOWUP-20261030.md。
- 修正の単体テスト3件、既存v9 manifest/地域選択4件、加算ビルド1件＝8件成功。今回再実行した既存全回帰3,690件も全件成功、失敗0、skip/cancel0。ログ`regression-followup.log.gz`、集計`regression-followup.json`。
- 独立レビュー：Critical/Importantなし。小テスト3件を独立再実行して成功。Minorはstorageプロパティgetterそのものを使った再現テストへの改善余地。現テストでも修正前は失敗、修正後は成功し、実originのstorageエラーが隠されないことを確認。
- ローカルのクラウドChromeで水辺Gを390px・28体表示、28/28 safe、通知42px・会話76pxを再確認。これはiPhone Safari実機QAではない。
- Sitesの保存版12・公開succeeded・owner1名/グループ0/外部閲覧者0・正常v8保存版11を再確認。匿名ブラウザーはサインイン要求。
- 公開v9 manifest内30ファイルを認証付きHTTPで再取得し、30/30が公開時SHA256と一致。raw再ビルドでは2本のJSに既存整形差があるが、位置情報/コメントを除くAST一致を検証。`delivery-followup.json`。前回の全4,304ファイル一致記録も保持。
- 新CI run [41014280598](https://github.com/Naoto214/naotocchi/actions/runs/41014280598) は最終確認時47/47 queued。CI成功条件は未達。ブラウザーCI修正の最終成功や性能を断定しない。`ci-followup-status.json`を参照。
- main `851cf09a80c7ed41ba7293888084272917e4582c` とPR #426 `8ba4ef1cb2030979664589d2e36423f58c4dedbd` は今回の再開開始時から不変。本作業はPR #462のみ更新。本番Pages/v22/Sites配信/ゲーム保存への更新なし。
- この最終追補コミットはdocs内の記録だけを追加し、`[skip ci]`で同一コードの47ジョブを重複起動しない。検証対象は上記CI修正HEADであり、そのCIは停止・成功扱い・緩和していない。
- 残件：GitHub CI完了確認、本人iPhoneで水辺A/Gの最終選択と操作・育成・回転・再開・性能QA。水辺G正式採用、main統合、本番公開は行っていない。
