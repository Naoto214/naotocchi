# 人間最終承認とCI実行条件の確定（2026-09-30 JST）

**Expression System：GREEN。repo全体test：GREEN。GitHub CI：未実行（成功ではない）。**

ユーザーは今回の会話で、これまで提示された確認Site・実Home・最終比較資料を人間側で確認し、正式承認済みであることを明示した。この裁定により、公開Site本人認証後画面の人間確認、追加画像／表情目視、128／104／80／64px比較、1px再監査、美的微調整はすべて残件から除外する。前のreport.mdの条件付き判定は承認前の履歴であり、本書が現行判定を優先する。

エージェント自身が公開Siteへ認証して目視したという主張には変更しない。人間承認の完了をそのまま記録する。新しいブラウザー目視や画像監査は実施していない。

## fresh開始状態

- remote HEAD `e0416c8dc3a538bff38ae6a13f655536fea5bce3`
- tree `de3a06978db591869b19f72ad523e612e0aab990`
- 実main `05b31dfd4c2c2ebecc5890ffc2a23efbcfd1d032`
- PR278 open / draft=true / merged=false / mergeable=false / mergeable_state=dirty
- ローカルHEADはremote一致・作業ツリーclean。

## CI 0件の理由

GitHub contents APIとそのGit blob SHAで、現HEADに次の2 workflowが存在することを確認した。

|workflow|起動条件|現branch/PRへの適用|
|---|---|---|
|Runtime smoke test|pull_requestの対象branch main、push branch main|feature branchへのpushは対象外。PRはmerge conflictにより起動しない|
|Home layout|同じbranch条件＋CSS/HTML/JS/CJS/package/workflow等のpath条件|同じくfeature push対象外、PR競合で起動しない。path filterもあり|

両workflowともworkflow_dispatch/pull_request_target/scheduleは定義されていない。jobにDraft PRを理由としてskipするif条件もない。今回0件をDraftだけが原因とは説明しない。

GitHub公式仕様は、merge conflictがあるPRではpull_requestイベントのworkflowが実行されないことを明記している：[Events that trigger workflows — pull_request](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request)。このPRのfresh mergeable=false/dirtyと実workflow定義を合わせて、現在の起動経路が成立しないことを確認した。

現HEADを指定したActions runs、check-runs、statusesはすべて0。queued/running/waitingのrunは存在しない。combined pendingは0件の集約状態であり、実行中jobの存在や将来の自動起動を示す根拠ではない。

branchには過去22件のActions runがあり、最新の過去runは別HEAD `68f368424811460cf18751b6dbdbcccd5d1ed60d`。過去成功を現HEADの成功に転用しない。リポジトリ全体にCI設定がない、あるいはActions全体が無効、とは判断しない。

結論は **「CI未実行（現feature pushは対象外、PRは競合で起動せず）」**。単に待てば完了するCI待機ではない。CI成功は主張しないが、ユーザーの明示裁定に従い、現在のCI未実行だけで今回スコープのGREENを妨げない。将来のmerge可否・required checksの充足を保証する判定ではない。

API制限：actions/workflows一覧endpointはconnectorのURL allowlistで拒否された。利用可能なcontents/.github/workflows、Git blob、runs/check-runs/statusesで上記根拠を取得。管理設定や権限へ迂回せず、CIの新規設定・強制起動・変更も行わない。[fresh証拠JSON](final-approval-ci-evidence.json)。

## 最終判定の根拠と非変更保証

前工程の保存済みfresh QAを明示的に引き継ぐ。今回新たにnpm testを実行したとは称さない。

- 正式npm test 1,850 PASS / 0 FAIL / 0 SKIP。
- focused 1,154 PASS / 0 FAIL、名称8 PASS、quick-modeは全体・単独で再発なし。過去初回FAILの原因未特定という履歴を維持。
- 31系統の名称、248/248 hunger resolver、19意味カテゴリ、正式15食事絵柄、247位置維持＋キノコ07 B、z-order・状態resolverを維持。
- 正式画像26枚、新ヒトデ30表情、通常基準、ウスバカゲロウ08のD4／CL3／hungry B／strained A／critical A等の承認選択を保持。
- 既存save互換tests、schema5の248段階fixture、実Home確認、Site version74保存ソースと本番asset整合を維持。
- 既存画像3,280ファイル（PNG2,932枚）と非対象hashを保持。今回はQA記録だけを変更し、本番asset/runtime/workflow/セーブschema変更0。
- 保存前git diff --check・対象外diffを確認。保存後remote HEAD/tree/main/PR/競合/CIをfresh再取得し、ローカルremote一致・cleanを確認して報告する。

画像・表情制作は正式完了。人間目視残件なし。Expression System GREENは今回スコープの完了判定であり、PR Ready化やmergeの承認ではない。PR278 Draft/open/未マージ、既存dirtyを維持し、main取り込み・競合解消・なおと制作・他PR作業へ進まず停止する。
