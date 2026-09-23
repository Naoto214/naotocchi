# ぬいぐるみ 最終仕様・コード品質レビュー

Spec PASS / Code quality PASS。制作/検証の未解決critical/important/minor各0。全80独立PNG・全80独立合成受理、全最終SHA一致、既存2541PNG/224配置/28anchors保持、全2320接続・配置、全体1746PASS。以下は独立担当の経過記録であり、末尾の公開完了記録を最新とする。GitHub遠隔保存はこのレビュー後に主担当が実施し、保存後HEAD/tree/main/PR/CIをPR本文へ追記する。

# plush 独立Spec先行レビュー

2026-09-23。実装・生成途中の先行確認であり、完成・最終PASSを宣言しない。

## 確認資料

- spec最新「ぬいぐるみ80表情の継続制作（2026-09-23）」
- `docs/qa/plush-expressions-20260923.md` initial QA
- scratch `check-plush.cjs` / `prepare-plush-site.py` / `plush-review-state.cjs`
- `plush-preservation-baseline.json` と現時点の既存2541PNG SHA-256照合
- `git rev-parse 13aa5b7fc2b16a5949d9c29eee1d99c28bdb9ecf^{tree}`

## 先行所見

新規plush 8段階×10状態のみを追加し、通常297・既存2240・旧4の計2541PNG、旧224配置・旧28系統のanchor/nameを保持する範囲は整合。元画像レビューの単一身体単一顔、03/08ハート、05綿、06/07補修、08輝きという判断とspecの不変条件も一致する。最新3分類を上書きせず、顔のない小物を生物扱いしない。既存2240表情の再目視は実施していない。

initial QAは作業未完了を明記しており、Site更新・GitHub保存の完了を先取りしていない。local基準treeを独立に確認し、`ab8e2427406a5ae1c0cb9525adcd93b212f1a451` だった。remote `d299c2bb03d471745dddd0928c03541d99863907` が同treeという記載は主担当取得の遠隔証跡に依存し、この先行レビューでは遠隔照会を重複しない。

check-plushは既存2541SHA、2320表情のresolver/存在/SVG/確認Site SHA、新旧配置数と旧値、旧anchor/name値、80jobの一意性とprovenance hash、80レビューの最終hash/ACCEPT、各画像128×128/二値alpha/元絵bounds一致を確認する設計。現時点で既存2541PNGの独立SHA照合を行い、2541一致・不一致0。新80・配置・確認Siteは未完成なのでスクリプト全体はまだ実行していない。

prepare-plush-siteは同じdistに新80とpet-expressionをコピーし、既存レビュー一覧にplushモードを追加、総数2320、旧starモードを保持する準備処理。メモキーを変更する処理はない。対象はローカル確認Siteの準備のみで、公開権限や遠隔保存の保証は担当する別工程の証跡が必要。

plush-review-stateはVM DOMで2320レコード、新旧モード、A/B/C関連対象集合、既存メモの保持、選択/追記/コピー/ダイアログを検証する設計で、実ブラウザ操作ではないことを結果に明示している。この検証だけで視覚上の重なりや実Site権限を証明しない。独立合成レビューと同一owner-private Site確認が必要。

## 最終確認で残ること

- 未制作/未受理の80PNG、全80個別目視と最終SHA照合。
- 新8配置・独立合成、check-plush全実行、既存回帰/全体テスト。
- index等の最終差分がplush追加・キャッシュ更新等の必要範囲か確認。
- 同一owner-private Site更新と権限、PR278 Draft/open/未マージ、main非取り込み、Git Data API保存の遠隔証跡。

先行時点で制作停止を要するSpec矛盾や必要修正は発見していない。実装途中のため最終受理は保留する。

## 実装後の利用可能証拠による更新

2026-09-23、主担当から全80生成・単独PNG受理後の確認依頼を受けて更新。以下は最終成果物の一部が揃った時点でのSpec適合確認であり、全工程完了の宣言ではない。

- jobs80件、review `complete:true` / accepted80、manifest `complete:true` / expected80 / available80 を実ファイルで確認した。manifestのcompleteは80素材・接続検証の区切りであり、未実施の公開・全体テスト・GitHub保存まで完了した意味には解釈しない。
- reviewer記録に対する最終PNGのSHA/ACCEPTを独立再照合し80/80一致。既存2541PNGも再度独立照合し2541/2541一致。既存完成画像の再目視はしていない。
- 主担当生成 `plush-validation.json` の証跡は旧224配置/新8、既存2541保持、全2320接続/SVG/確認Site PNG SHA、最終受理80SHA、cache `20260923-fbcc8334`。当該checkは先行確認済みの検証設計であり、結果の数値とspecの範囲は整合する。
- focused最終ログを直接読み、34テストPASS/失敗0、10794.595347 ms。fallback最終ログは11テストPASS/失敗0、1314.878898 ms。配置制約JSONはmarks2320/sweatEnvelopes1392/issues0。
- `plush-review-state.cjs` を独立再実行し成功。records2320、newPlush80、旧各モード、A100/B70/C40、多顔100、メモ保持・navigation・selection・copy・dialogすべて成功。これはVM DOM評価であり、実ブラウザ操作ではない。
- 最終差分を直接読んだ。indexはpet-expressionキャッシュのみ、pet-expressionは新8配置とplush asset routing追加、旧配置値は維持。anchor/nameはplushのみ追加、preview/gallery/placementはplush対応のみで、ゲーム数値・成長文・恋愛・セーブ形式・resolver意味の変更はない。main取り込みは行っていないという主担当作業方針と矛盾する差分は発見していない。

現時点でSpec範囲の逸脱や制作停止を要する必要修正は見つからない。以下はこの更新時点で未完了として明確に残す。

1. 独立合成レビュー残01〜04/07〜08（05〜06受理済みとの主担当報告）。本担当は単独01〜04計40を受理したが、合成レビューは別担当である。
2. full npm test（全合成後に開始予定）。focused PASSを全体PASSとして扱わない。
3. 同じowner-private Siteへの公開更新と、更新後のアクセス権・表示確認。ローカルSiteソースの準備と全2320PNG一致は済んでいるが、未公開。
4. Git Data API保存、遠隔tree/HEAD一致、およびPR278 Draft/open/未マージ維持の最終確認。

このレビューは利用可能証拠でのSpec適合を支持する。全体完了報告は上記残工程の証拠が揃った後に行う。


## 制作・検証の最終判定

全80独立合成受理のrepo記録を確認し、全8シートの現在SHAが記録内に存在することを独立照合した（8/8一致）。PNG全80も受理SHAから変更なしを再照合。全npm test最終ログは1746 PASS、fail/cancelled/skipped/todo全0、595616.834519 ms。主担当の終了コード報告は0。focused/配置/保持/単独/合成/全体テストの必要証拠が揃ったため、制作・ローカル検証範囲はPASSと判定する。

未解決の欠陥severityは critical 0 / important 0 / minor 0。記載済みの状態読み分けと静止合成の限界は受理条件の説明であり、未解決修正要求ではない。

アーカイブ検証JSONを確認: source commit `259c4ee33a30b1c9150464c6b7e79f5d8eed4c56`、111510694 bytes、2964 files、SHA-256 `6278205fe40aa769f032064bbaa861ea29f91729eafe3ee7cc1b6a10db5583eb`。gzip_complete/local_content_match/committed_git_blob_match/complete_source_file_set は全true。これは主担当の全アーカイブ検証証跡を参照したもので、本担当が111MBの解凍照合を重複したものではない。scratch検証器のstartswith誤置換の修正は画像・runtime・アーカイブ・source内容を変えない検証器だけの修正との報告であり、PNG全80SHA不変という独立実測とも整合する。

この判定で完了したのは制作・ローカル検証・公開用source準備。Siteは公開要求中で、公開成功／owner-private維持／実Site確認、GitHub遠隔保存／PR278状態の最終証拠は主担当結果待ち。この公開・保存未完を欠陥数0と混同して全工程完了を宣言しない。


# Plush code quality review — preliminary

Reviewer scope: code and validation tooling; excludes aesthetic acceptance of my own plush03/04 PNGs. Repository baseline is local commit `13aa5b7fc2b16a5949d9c29eee1d99c28bdb9ecf` (the `local` prefix is a description, not part of the Git ref). This is not a final PASS. Final PNG, layout, cache, tests, independent acceptance and Site checks remain pending.

## Preliminary findings

No required code correction identified in the inspected diff. At the inspection snapshot there were 11 modified tracked files, 78 plush PNGs, two new QA records, 224 placements and an unchanged index cache. This is expected work in progress, not evidence of completion.

- Recomputed all 2541 hashes from `plush-preservation-baseline.json`: zero mismatches. The baseline contains exactly 2541 PNGs.
- Parsed baseline and current MARK_PLACEMENT: all 224 old entries deeply equal; no new placements yet.
- Parsed baseline/current anchors and stage names: old 28 entries deeply equal, only `plush` added for 29 total.
- `pet-expression.js` before its generated block is byte-equivalent. After its generated block it is byte-equivalent after only the expected plush allowlist addition. Resolver, reactions, mark SVG content, state logic and gameplay remain unchanged.
- `tools/place-expression-marks.cjs`, normalization, gameplay, CSS and save logic have no diff. Generator search ranges, clearance, directions and established species exceptions remain intact. Only the checker species list adds plush.
- Preview adds plush forms and rare achievement fixture suppression, with canonical stage-name and isolated-storage coverage. Fallback changes from plush to unknown occur only in tests; runtime unknown behavior is untouched.
- Latest plush specification preserves the established three classifications, original decorations, 10 expressions, separate PNG/mark layers, old assets/layouts, no automatic next species and Draft/unmerged PR scope. Its final completion gates are explicit.
- `git diff --check` passed. This is formatting evidence only, not a full test result.

## Scratch tooling review

`check-plush.cjs` is a final materialization gate: it compares preserved hashes, all connected 2320 images against Site copies, old layout/anchor/name equality, expected 232 placements, runtime suffix restriction and cache identity. It validates all 80 unique jobs and all accepted final PNG hashes, RGBA size, binary alpha, original bounds, generation/repair sources, then writes manifest/validation. I did not run it during preliminary review because it mutates root QA and requires final inputs. It does not replace placement collision tests, full application tests or human reviews; final evidence must keep those separate.

`prepare-plush-site.py` copies plush assets, runtime and regular game page, creates isolated plush preview, extends review data and adds explicit star scope while preserving the existing memo key/filter sets. Its substitutions match the inspected pre-plush Site source. It deliberately rejects a second run after NEW_PLUSH is present, so a failed partial run needs review instead of blind re-execution. Not run by this reviewer; no Site modification performed.

`plush-review-state.cjs` checks 2320 records, existing category sizes, plush and historical new-line filters, selected memo retention, navigation, selection and copy/export using a VM DOM. Its output explicitly states this is VM state evaluation, not browser interaction. The fake DOM cannot substantiate actual rendering, network or browser clipboard permissions; those remain separate validation requirements.

## Required final recheck

After all 80 PNGs and eight layouts exist: re-read full working diff and 12-file allowlist, verify old preservation again, validate only eight new layout keys, inspect final cache change, read independent accepted SHA records and focused/full/placement logs, and confirm no interim RED or partial QA is promoted to final success. Review all required eight final QA deliverables and exact final PNG hashes. Independently inspect plush07/08 composites when root provides them; my own plush03/04 visual acceptance remains excluded.

## Final asset/layout delta recheck (tests still pending)

After final 80 PNGs and layouts arrived, independently rechecked the working delta. Exactly 12 tracked files are modified: specification, index.html, pet-expression.js, four expression tests, preview tool, placement checker, anchors, review gallery and stage names. There are 80 plush PNGs. At this snapshot QA has five of the planned eight files; final review/composite/validation records are still being assembled. This is an asset/layout code review pass with final overall acceptance withheld pending tests and final QA.

Recomputed all 2541 preserved hashes with zero mismatches. Parsed MARK_PLACEMENT now has 232 entries: all 224 baseline values remain deeply identical and exactly plush/01–08 are new. All 28 prior anchor/name entries remain identical; plush is the only added key. Runtime suffix remains identical except plush allowlist addition. Index changes only the pet-expression cache from bcff2986 to fbcc8334, which matches the current JS SHA1 prefix. No generator, constraints, gameplay, mark shape/color or unknown runtime change was introduced.

Independently accepted 07/08 static composites, recorded separately in `plush-composite-review-07-08.md`. They are outside the reviewer's own generated03/04 assets. No code correction or composite repair is required from this review. Full tests, final focused tests, placement validator results and completed QA evidence remain to be reviewed before a final completion statement.

## Final code quality and production-validation decision

**PASS for code quality and specification production/validation scope. Unresolved findings: Critical 0, High 0, Medium 0, Low 0.** This supersedes the earlier test-pending review status. It does not claim Site publication or GitHub delivery has completed; those are root-owned delivery gates. The eighth QA final-review document is intentionally assembled by root from the completed reviewer reports.

Evidence personally read/rechecked at final review:

- `plush-npm-test-final.log`: 1746 tests / 1746 pass, 0 fail/cancelled/skipped/todo, duration 595616.834519ms. Root reports command exit 0. This is the completed final run, not the earlier interrupted attempt.
- `plush-focused-final.log`: 34/34 pass, zero fail/cancel/skip/todo, 10794.595347ms; exit 0 recorded in integration status.
- `plush-fallback-final.log`: 11/11 pass, zero fail/cancel/skip/todo; exit 0 recorded in integration status.
- `plush-placement-constraints.json`: 2320 marks, 1392 sweat envelopes, empty issues. This supports geometric clearance and complements the static human review without claiming actual animation/browser inspection.
- `plush-validation.json`: preserved2541, old224/new8 layouts, 2320 connected assets/SVG accents/Site image hash matches, 80 accepted final hashes, cache fbcc8334.
- Independently recomputed all 2541 preservation hashes again; no mismatch. Independently checked all 80 review records against actual final PNG SHA256 and ACCEPT verdicts, and all eight current composite sheet SHA256 values against the combined independent review; all matched.
- Rechecked tracked diff list: still exactly the permitted 12 files. Seven QA files exist; the planned eighth final-review is pending reviewer consolidation. `git diff --check` remains clean. No new runtime or image change after earlier code inspection was reported, and final review hashes remain matched.
- Read `plush-archive-validation.json`: source commit259c4ee33a30b1c9150464c6b7e79f5d8eed4c56, 111510694 bytes, 2964 files, SHA2566278205fe40aa769f032064bbaa861ea29f91729eafe3ee7cc1b6a10db5583eb; complete gzip, local-content match, committed-Git-blob match and source-file-set all true. These are archive checker's recorded evidence, not a fresh independent download by this reviewer. Root reports the initial scratch checker startswith replacement error was corrected and rerun with exit0, without artifact/source/PNG mutation; that failed attempt is not counted as success.

No required repair remains. Final delivery still needs root to record successful owner-private Site publication, final QA consolidation and Git Data API save to the existing Draft/unmerged PR, with no main merge or next-species progression. Actual mobile Safari/rendering and dynamic sweat behavior remain explicitly outside the static visual evidence; this limitation is documented and is not presented as a passed browser test.

## 確認Site公開完了・GitHub保存準備

同じproject `appgprj_6aa908e9357c8191abb0f486be58697c`、version69はsucceeded。公開後get_site/get_site_version/get_deployment_statusを再取得しowner1/groups0/外部0、source `259c4ee33a30b1c9150464c6b7e79f5d8eed4c56` を確認。URL https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/ と /mark-review/。version ID `appgprj_6aa908e9357c8191abb0f486be58697c~appgver_4904dd5051748191884291037886649c`、deployment `appgdep_6ab3a0639a7c8191aaf24f59e8f40e8d`。画像版plush-db80cb75、選択保存KEY `naotocchi-mark-review-mf-0660b59a` 保持。

公開API側archiveはTAR/2964files/121047040bytes、SHA256 `9766c99179b2828f030b1704fd9cbb249a7293eee86e8e4dabc6d88eb4070a44`。公開に渡したlocal GZIPとは容器形式が異なりbyte同一性は主張しない。local gzip全読取・全内容と保存済sourceの一致、API source commit/file_count一致、公開成功を確認済み。

完成素材は29系統2320表情、全character PNGは2621（active2320＋旧4＋通常297）。全キャラクター制作完了ではない。生成80回、再生成/局所修正0、既存2240表情の変更/再生成0。Spec/Code qualityの制作検証PASS、未解決critical/important/minor各0。全体1746PASS後runtime/PNG変更なし。最新remote treeをbase_treeに使うGit Data APIで必要100ファイルのみ保存し、localとremote treeの完全一致を要求する。保存後HEAD/tree/main/PR/CIはPR追記と最終報告へ記録。PR278 Draft/open/未マージ、main取り込み・競合解消・Ready化なし。この1系統保存後に停止する。
