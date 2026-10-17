# World CI修復・最終監査

結果: 総合再検証合格。PR #392はDraft / open / 未マージ。最終マージ承認待ち。

## 検証対象

- 修正PR: https://github.com/Naoto214/naotocchi/pull/392
- source HEAD: `098e77d0e6f091a49a24c2586e161904fb18fe74`
- source tree: `ccca80d3796cf91cfcc9e03962f8d0315f3c9dfc`
- 最新main: `faeee72c81957073502d9c37e2ca6bedb37c1a79` (作業終了時も不変)
- GitHub PR統合候補: `014ad4f072dacf2adad6082bb9d65f1a3df61f9b`。treeはsource treeと一致。
- この監査ブランチは、検証対象コードを変更せず完了後のログを保存するためのもの。修正PRのHEADを進めず、証跡commitをPR本文から参照する。

## 失敗原因と修正

元のWorld run 38981863084ではcharacter-integration / browser(smoke)のみ失敗。
character-integrationは起動時の自動同行2人と通常URLでの26人同行を前提にし、空partyから故障注入対象を探していた。smoke summaryは13地域すべてparty=27を要求していた。
本番は新仕様どおり自動同行0人。CI/fixtureの旧仕様前提が原因で、本番コードの修正は不要だった。

通常起動と負荷配置を分離。通常はparty=0、全地域住民のregistry一致、実際に稼働するsocialSessionの時間進行、form/companion/partnerの実際の3D holderを検証。負荷fixtureはテスト側で明示配置し、非空・重複なし・保存不変・実際の描画を検証する。
Character統合は主人公+26なかま=27体、地域smokeは主人公+26なかま+恋人=28体の従来負荷を維持。2D fallback、故障隔離、地形、13地域、通路、縦横回転、cleanup、reduced motion、save境界の検査を削除/skipしていない。
World workflowをPRでも実行可能にし、既存の293体×12表情、自発イベント、方向、27モデル表情負荷を再利用してCI接続した。

## 最新HEADの新規CI (すべてsuccess)

| Workflow / job | Run / job |
|---|---|
| Home layout / pad-size | [38992307684 / 117277147501](https://github.com/Naoto214/naotocchi/actions/runs/38992307684/job/117277147501) |
| Home layout / home-layout | [38992307684 / 117277147727](https://github.com/Naoto214/naotocchi/actions/runs/38992307684/job/117277147727) |
| Runtime smoke test / smoke-test | [38992307666 / 117277147487](https://github.com/Naoto214/naotocchi/actions/runs/38992307666/job/117277147487) |
| World visual quality / browser (corridor) | [38992307677 / 117278982080](https://github.com/Naoto214/naotocchi/actions/runs/38992307677/job/117278982080) |
| World visual quality / regression | [38992307677 / 117278982159](https://github.com/Naoto214/naotocchi/actions/runs/38992307677/job/117278982159) |
| World visual quality / browser (smoke) | [38992307677 / 117278982186](https://github.com/Naoto214/naotocchi/actions/runs/38992307677/job/117278982186) |
| World visual quality / browser (captures) | [38992307677 / 117278982205](https://github.com/Naoto214/naotocchi/actions/runs/38992307677/job/117278982205) |
| World visual quality / browser (visibility) | [38992307677 / 117278982267](https://github.com/Naoto214/naotocchi/actions/runs/38992307677/job/117278982267) |
| World visual quality / character-integration | [38992307677 / 117278982314](https://github.com/Naoto214/naotocchi/actions/runs/38992307677/job/117278982314) |

全体pipelineはWorld regressionおよびRuntimeで成功。Nodeテストは24 + 3164 + 80 = **3268 PASS / 0 FAIL**、補助smoke/dialogue/visual-qa scriptsも終了コード0。

- Character browser contract: 27 checks PASS、page errors 0。
- Default startup故障注入10ケース成功、startup mutation 12/12、integration mutation 9/9検出。
- 全293モデル × 12状態 = 3516適用のブラウザ検証成功。既存代表画像・方向5場面・27モデル負荷検証成功。
- 自発reunion / greeting / affection_interaction → 本番expression bridge: 3 PASS。
- Regional smoke: 13/13、issues=[]、明示的27同行fixtureの実体を確認。最大obstacle overlapは浮動小数点丸め相当の4.97e-14。
- Visibility: 13地域、2832 samples、fully hidden=0、partial=1、issues=[]。partialを除外/隠蔽せず保持。画素レベルのHuman QA合格とは扱わない。
- Home: pad-sizeとhome-layout両方成功。

## 旧結果との区別

- 元mainの成功ログはbaseline-actions.json、失敗2ジョブはoriginal-*.log。
- 初回修正HEAD `216e307f561e3abeed0d68d2149e29e6f8c97012` のWorld run 38991943501も6ジョブ成功。ただし最終合否は上記最新HEADのrun 38992307677で判定。
- ローカルnpm testは3268 PASS / 0 FAIL、exit0 (full-local.log.gz)。作業中のcheckoutでの実行であり、最終immutable HEADの証明には上記GitHub CIを使用。
- focused31、protection153、review gate7は本体テストと重複するため総数に足さない。
- ローカル通常Chromiumはsocket制限で起動不可。Headless ShellによるCharacter統合27件は成功。最初のsmokeはレビューに伴いhome後に中断しており完走としない。最新CIの13地域smokeが最終結果。

## 修正ファイル

- .github/workflows/world-visual-quality.yml
- tests/world-character-browser-runner-test.cjs
- tools/meguru-3d-qa/cast-fixture.cjs (新規)
- tools/meguru-3d-qa/character-integration.cjs
- tools/meguru-3d-qa/ci-summary.cjs
- tools/meguru-3d-qa/regions-smoke.cjs
- docs/qa/world-ci-free-life-20261017/ (計画・原ログ・専用検証・監査記録)

本番コード変更なし。自由行動、任意同行の人数/時間制限、交流/デート/別れ、293体/12表情、World/Motion/Relationship Expression、save/schema、他ゲーム/UIのソース/資産はbaseと同一。
独立レビューで指摘された通常住民の描画確認不足・方向証跡のupload漏れを修正し、再レビューにblocking指摘なし。

## 判断・残課題

このCI修復PRは技術的にmainへマージ可能。ユーザーの最終承認を待ち、今回はマージしない。
iPhone Safari Human QA、最終視覚品質/操作感の判定は未実施。SwiftShader測定を実機性能と同一視しない。既存のpartial visibility 1件はHuman QAで引き続き確認する。
