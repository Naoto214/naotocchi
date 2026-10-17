# PR #392 最終監査・mainマージ後検証（2026-10-17）

結果: **合格。PR #392はmerged / closed。main統合、マージ後必須9ジョブ、Pages配信確認完了。**
iPhone実機Human QAと最終視覚品質・操作感は未判定。

## 正本

| 対象 | HEAD | tree |
|---|---|---|
| マージ前main | faeee72c81957073502d9c37e2ca6bedb37c1a79 | 49b29928798d07eca632f408e432b29eb8f0cce9 |
| 監査したPR #392 | 098e77d0e6f091a49a24c2586e161904fb18fe74 | ccca80d3796cf91cfcc9e03962f8d0315f3c9dfc |
| マージ後main / merge commit | 5d950d1b88751b202ac2fe2fcb2f3ea7ef0598af | ccca80d3796cf91cfcc9e03962f8d0315f3c9dfc |

PR branch: fix/world-ci-free-life-20261017。
merge commitのparentsは旧mainと監査済みPR HEAD。マージ後treeはPRと完全一致。
最終再取得時もmainは上記commit。追加コード変更なし。
旧監査は fba6ff62b8e3ce668ba2090390c5bc9b9f55aa8c の FINAL.md。

## 監査

- 差分17ファイル: CI 1、test 1、QA tools 4、監査資料11。変更は承認範囲内。
- 本番ソース・資産の差分なし。自由生活、任意同行、交流・デート・別れ、Character 3D 293体、12表情、視線・方向、World 3D、Motion System v2、Relationship Expression、save/schema、他ゲーム/UIは保護。
- 通常party=0、registry整合、実social session進行、住民の3D holder描画を検査。
- 明示fixtureは非空・一意・保存不変・実際の3D構築を検査。従来負荷人数を維持。
- fallback、故障隔離、地形、地域遷移、cleanup、回転、reduced-motion検査は保持。
- 検査削除・無条件skip・不適切な緩和なし。captures専用のbaseline checkoutのみ従来の条件分岐であり、検査skipではない。
- 独立レビュー: Critical / Important指摘なし。
- 最新main競合なし、9必須CI成功を確認後、承認に従いready化しexpected head SHA付き通常mergeを実施。

## 保存済み結果と今回の区別

保存済みPR CI（今回原ログと照合）:
World 38992307677、Runtime 38992307666、Home 38992307684。統合候補014ad4f072dacf2adad6082bb9d65f1a3df61f9bのtreeはPRと一致。全体3268 PASS / 0 FAIL。

今回ローカル再実行:
- world-character-browser-runner-test: 7 PASS / 0 FAIL。
- social-expression-integration / relationship-free-life / relationship-free-life-runtime: 24 PASS / 0 FAIL。
- 初回の追加保護検証ではsparse checkoutにcharacter-3d/runtime.mjsがなく23 PASS / 1 ERR_MODULE_NOT_FOUND。追跡済みcharacter-3dとvendorを取得して同じコマンドを再実行し24 PASS。ソース変更なし。
- これら31件は全体回帰と重複するため合算しない。

今回マージ後に新規実行（すべてHEAD 5d950d1b88751b202ac2fe2fcb2f3ea7ef0598af）:

| Workflow | Run | 結果 |
|---|---|---|
| World visual quality | [39027461084](https://github.com/Naoto214/naotocchi/actions/runs/39027461084) | success |
| Home layout | [39027461206](https://github.com/Naoto214/naotocchi/actions/runs/39027461206) | success |
| Runtime smoke test | [39027461096](https://github.com/Naoto214/naotocchi/actions/runs/39027461096) | success |
| pages build and deployment | [39027460388](https://github.com/Naoto214/naotocchi/actions/runs/39027460388) | success |

| Job | 結果 |
|---|---|
| [deploy](https://github.com/Naoto214/naotocchi/actions/runs/39027460388/job/117381703665) | success |
| [report-build-status](https://github.com/Naoto214/naotocchi/actions/runs/39027460388/job/117381703659) | success |
| [build](https://github.com/Naoto214/naotocchi/actions/runs/39027460388/job/117381161716) | success |
| [pad-size](https://github.com/Naoto214/naotocchi/actions/runs/39027461206/job/117381161593) | success |
| [home-layout](https://github.com/Naoto214/naotocchi/actions/runs/39027461206/job/117381161461) | success |
| [browser (visibility)](https://github.com/Naoto214/naotocchi/actions/runs/39027461084/job/117381161451) | success |
| [browser (corridor)](https://github.com/Naoto214/naotocchi/actions/runs/39027461084/job/117381161404) | success |
| [browser (captures)](https://github.com/Naoto214/naotocchi/actions/runs/39027461084/job/117381161399) | success |
| [regression](https://github.com/Naoto214/naotocchi/actions/runs/39027461084/job/117381161351) | success |
| [browser (smoke)](https://github.com/Naoto214/naotocchi/actions/runs/39027461084/job/117381161339) | success |
| [character-integration](https://github.com/Naoto214/naotocchi/actions/runs/39027461084/job/117381161160) | success |
| [smoke-test](https://github.com/Naoto214/naotocchi/actions/runs/39027461096/job/117381160989) | success |

World regressionとRuntime smoke-testは、それぞれ24 + 3164 + 80 = **3268 PASS / 0 FAIL / 0 skipped / 0 cancelled**。npm test補助scriptsも終了コード0。
RuntimeとWorldの同一テスト結果を二重加算しない。

Character: 27 browser contract checks成功。自発イベント3件成功。293体×12状態=3516適用、方向・負荷の既存browser sweepを含む全step成功。
Smoke: 13地域、issues=[]、最大party obstacle overlap 5.3290705182007514e-14（浮動小数点誤差相当）。
Visibility: 13地域、2832 samples、fully hidden=0、partial=1、issues=[]。部分遮蔽を除外せず引継ぎ。

## GitHub Pages

[公開URL](https://naoto214.github.io/naotocchi/)
Pages run 39027460388: build / report-build-status / deploy 全success。
deployログのpages_build_versionは 5d950d1b88751b202ac2fe2fcb2f3ea7ef0598af、2026-10-17T11:10:54ZにReported success。

公開URLからcache-busting query付きで取得した以下7ファイルはすべてHTTP 200・監査済みローカルファイルとbyte一致:
index.html, script.js, meguru.js, meguru-3d.mjs, relationship-life.js, character-3d/runtime.mjs, character-3d/animate.mjs。
Last-Modified: 2026-10-17 11:10:45–46 GMT。

注意事項: Pages artifact 1,542,332,747 bytes（約1.54GB）について1GB超過warningが出たが、今回のdeployは成功し公開応答も確認済み。容量整理は今回の変更対象外。黙って資産や監査資料を削除していない。

## 残課題 / Human QA

CIの未解決失敗なし。以下は未完了であり今回の合格に含めない:
- iPhone実機Human QA、再会・交流の自然さ
- 視線・身体方向の視覚品質、小さい顔・魚・植物の表情識別性
- Safari背景復帰・WebGL復帰
- 多人数・長時間利用の実機性能
- 部分遮蔽1件の画素レベル確認
SwiftShaderや3D holder確認は実機性能・最終画素品質を証明しない。

## マージ後全体回帰 原ログ抜粋

### World regression / job 117381161351
```text
2026-10-17T11:07:53.2676023Z # tests 24
2026-10-17T11:07:53.2676806Z # pass 24
2026-10-17T11:07:53.2677045Z # fail 0
2026-10-17T11:07:53.2677283Z # cancelled 0
2026-10-17T11:07:53.2677561Z # skipped 0
2026-10-17T11:07:53.2677798Z # todo 0
2026-10-17T11:23:16.8610878Z # tests 3164
2026-10-17T11:23:16.8611029Z # pass 3164
2026-10-17T11:23:16.8611108Z # fail 0
2026-10-17T11:23:16.8611191Z # cancelled 0
2026-10-17T11:23:16.8611263Z # skipped 0
2026-10-17T11:23:16.8611339Z # todo 0
2026-10-17T11:23:21.2743923Z # tests 80
2026-10-17T11:23:21.2744542Z # pass 80
2026-10-17T11:23:21.2744771Z # fail 0
2026-10-17T11:23:21.2745025Z # cancelled 0
2026-10-17T11:23:21.2745212Z # skipped 0
2026-10-17T11:23:21.2745397Z # todo 0
```

### Runtime smoke-test / job 117381160989
```text
2026-10-17T11:07:50.3685520Z # tests 24
2026-10-17T11:07:50.3685892Z # pass 24
2026-10-17T11:07:50.3686275Z # fail 0
2026-10-17T11:07:50.3686473Z # cancelled 0
2026-10-17T11:07:50.3686670Z # skipped 0
2026-10-17T11:07:50.3686852Z # todo 0
2026-10-17T11:29:00.5942377Z # tests 3164
2026-10-17T11:29:00.5942549Z # pass 3164
2026-10-17T11:29:00.5942633Z # fail 0
2026-10-17T11:29:00.5942718Z # cancelled 0
2026-10-17T11:29:00.5942806Z # skipped 0
2026-10-17T11:29:00.5942889Z # todo 0
2026-10-17T11:29:06.3312207Z # tests 80
2026-10-17T11:29:06.3312584Z # pass 80
2026-10-17T11:29:06.3312792Z # fail 0
2026-10-17T11:29:06.3312986Z # cancelled 0
2026-10-17T11:29:06.3313181Z # skipped 0
2026-10-17T11:29:06.3313368Z # todo 0
```
