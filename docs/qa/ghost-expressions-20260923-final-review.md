# おばけ 最終仕様・コードレビュー

## 確認済み

- 資料・8段階元画像からghostを選定、全8単一身体/単一顔。新分類曖昧さなし。
- 全80個別生成、06 wantsPlayのみ局所編集1、全80独立原寸/6倍受理、最終SHA一致。
- 全80静止合成を当該画像/配置の非担当が受理。主担当も実見。
- 既存2381PNGのSHA、新旧接続、旧208配置/26anchors/names保持。新2160 asset/SVG/SitePNG接続一致。
- 新8配置のみ。generator/制約/例外不変、2160marks/1296汗動作範囲issues0。
- 新ghost34検査PASS、既存resolver/gameplay/成長・恋愛条件/save不変。
- 同じSiteの既存保存KEY/選択/メモ/copy/dialog/nav/filter保持をVM DOMで確認。

## 制約

01 sick/critical、04 tired/weak、07〜08 weak/criticalは原寸で差が控えめ。06〜08は通常が閉じ目なので睡眠との差も小さい。06汗は青火を避け頭上、07〜08は周辺意匠を避け広い。非顔部分の生成微差はあり、pixel完全一致を主張しない。自動衝突0と理想的見た目は別。合成はPNG/SVG/CSS静止・汗近似、VMは実機クリックではない。

# Ghost independent code/spec review

Baseline: `3d21778a2bc2aa9e9278a0fbe428a73f64b93624` against working tree. Reviewer authored only stage 02 image assets, not integration code; stage 02 image acceptance is explicitly excluded. Read-only repository review; no index, HEAD, code, or test mutations. Report is scratch-only.

## Findings

- Critical: none in the reviewed code delta.
- Important: none in the reviewed code delta. External publication gate below remains pending and is not successful yet.
- Minor: none introduced by this scoped change.

## Reviewed evidence

- Full tracked `git diff --no-renames` inspected: ghost is appended to the existing stage asset allowlist, preview forms and placement-check loop. Runtime resolver, shared accents, sweat calculations, reactions and gameplay/save logic are unchanged.
- Fallback fixtures change ghost to unsupported star only in tests. No production species substitution occurs.
- Preview fixture adds ghost to its isolated rare-line achievement setup; live gameplay achievement conditions and localStorage isolation remain unchanged.
- Existing asset/integration loops gain all eight ghost stages; runtime cases exercise all ten states, critical overriding happy, and saved-state invariance. Canonical stage-name test references master rare data.
- Focused pre-existing log `ghost-integration-green-routing.log`: 18 tests / 18 pass / 0 fail. Its scope is routing/runtime/preview; this does not prove asset, placement, or full-suite completion.
- Direct read-only SHA256 comparison: all 2,381 baseline PNG files unchanged.
- Direct JSON comparison: all 26 old anchor lists and all 26 old stage-name lists unchanged; exactly ghost added to each.
- Ghost spec appendix accurately scopes one 80-image series, 27 lines / 2,160 active images after completion, preserving 208 old placements and adding only eight; classification and mark-layer rules remain consistent.
- Generator `tools/place-expression-marks.cjs`, `pet-expression.css`, `script.js`, world master, package scripts and save/gameplay files have no tracked delta at this review point.
- Statically inspected coordinator scratch scripts `prepare-ghost-site.py` and `ghost-review-state.cjs` against the existing Site distribution. Replacement targets exist; preparation scopes additions to ghost images, fresh runtime expression module/preview, eight ghost composites, stage data, ghost navigation/filter/version and explanatory copy. Existing review storage key and prior A/B/C/series sets remain intact. VM script checks 2,160 records, 80 ghost entries, retained filters, saved notes, navigation, selection and copy. These scripts have not been run by the reviewer and are not deployment evidence.

## Considered and excluded

- Image aesthetics/state acceptance, particularly self-authored stage 02: excluded from independent code verdict; assigned independent visual reviewers must accept every image and composite.
- Existing repeated line allowlists and legacy test titles mentioning adult-cat-only: pre-existing architectural/naming issues, not regressions requiring unrelated refactoring in this batch.
- Existing unsupported star behavior: deliberately retained as test fallback; no request to produce star assets.
- Full test rerun or additional tests by this reviewer: excluded per review assignment; focused existing logs and coordinator's final log will be assessed.
- Main merge/conflict resolution: explicitly prohibited and unrelated to draft-save readiness.
- Site publishing/access and Git Data API save: coordinator-owned external gates; not inferred from local code.
- Re-audit or regeneration of completed species: expressly out of scope; preservation checked by hashes rather than subjective re-review.

## External save gate

- Same owner-private Site publication is complete according to coordinator's successful publish workflow and refreshed get_site result: version 67, owner access 1, group access 0, external access 0; source commit `3787ff4bbf5b717834249f8811fe91b32c469748`. This reviewer did not independently invoke deployment tools or a live browser.
- Git Data API save to the same Draft/open/unmerged PR278 is coordinator-owned and follows this readiness review; this report does not claim a save already happened.

## Placement and asset gate update

- Parsed runtime MARK_PLACEMENT: 216 entries, all 208 baseline entries deeply equal, precisely `ghost/01`–`ghost/08` appended. Generator and exception report bytes match baseline, as do shared CSS and script.js.
- Final ghost inventory is 80 PNGs. Independent consolidated review JSON reports `accepted_count: 80`; this is the separate visual reviewers' acceptance, not self-acceptance of stage 02.
- Additional tracked index change is only the pet-expression.js cache token to `12b55a12`.
- Reviewer independently viewed all 20 stage 07/08 composites and accepted static positioning, as recorded in `ghost-composite-review-07-08.md`. Other stages' composite acceptance is assigned elsewhere.
- Read `ghost-composite-review-01-06.md`: separate reviewer accepts all 60 cells and records six sheet hashes. Together the independent composite reviews cover all 80 states without accepting self-authored images.
- Read final focused log `ghost-integration-focused-green.log`: 34/34 pass, 0 fail, duration 5697.727023 ms.
- Read `ghost-placement-check.json`: 2,160 marks, 1,296 sweat envelopes, zero issues; this supplements the static composite review's animation limitation.
- Read `ghost-validation.json`: 2,381 baseline PNGs preserved; 2,160 connected assets and SVG accents; 2,160 local Site PNG hashes match; all 80 accepted final hashes match; eight new and 208 old layouts; cache `20260923-12b55a12`.
- Consolidated provenance is a list of 80 jobs with prompts, source/final paths and hashes, repair histories. Consolidated independent review has `complete: true`, `count: 80`, `accepted_count: 80`, and per-file hash/verdict/note records.
- Coordinator reports local Site VM state checks passed. Published Site remains pending; no browser interaction is inferred from VM DOM evaluation.
- Read coordinator's final `ghost-npm-test-final.log`: 1,678 tests, 1,678 pass, 0 fail/cancelled/skipped/todo, duration 316551.233552 ms. Coordinator reports exit 0 and no subsequent runtime/PNG changes. Reviewer inspected the final tracked delta (12 files, 66 insertions/24 deletions) and ran read-only `git diff --check`, exit 0.

Spec verdict: **PASS** for local implementation, preservation and independent acceptance evidence. No scope expansion or unauthorized gameplay/save/mark change found.
Code quality verdict: **PASS; ready for draft save**. Same-Site publication evidence has been supplied by the coordinator. No Critical, Important or Minor issue introduced by the reviewed delta. No merge recommendation; PR must remain Draft/open/unmerged and main must not be incorporated.

## Publication evidence update

Read `ghost-archive-validation.json`: complete gzip, 104,326,322 bytes, 2,788 files, SHA256 `213e0a6172d699e073f3d9b18c95455ef76a64afaa7509c2f7a379a1d09faa7a`; local file contents, committed git blob and complete source file set all match. These are artifact-integrity checks. Combined with coordinator's publication/get_site report they establish the documented delivery gate; they do not imply that this reviewer personally tested browser interactions. Full npm and VM evidence retain their stated scope.


### 確認Site公開・保存準備の最終結果

同一project `appgprj_6aa908e9357c8191abb0f486be58697c` のversion67公開succeeded。get_site再取得でもversion67、owner1/groups0/外部0。URL https://naotocchi-emotion-pr275.kerzion214.chatgpt.site/ および /mark-review/。source HEAD `3787ff4bbf5b717834249f8811fe91b32c469748`。version ID `appgprj_6aa908e9357c8191abb0f486be58697c~appgver_cb2076ac172c81918bf2756e9b82e7e0`、deployment `appgdep_6ab3667b9644819187aa8c4d25815a84`。

archive `/workspace/scratch/0e1d599677f2/ghost-site-final.tar.gz` は104326322 bytes/2788 files、SHA256 `213e0a6172d699e073f3d9b18c95455ef76a64afaa7509c2f7a379a1d09faa7a`。gzip全体読込と全ファイルのlocal bytes/保存source Git blob一致、ファイル集合一致を確認。archiveのdist/.openai/hosting.jsonはrepo .openai/hosting.jsonに対応。今回はarchive再梱包不要。

Spec PASS / Code quality PASS、未解決critical/important/minor各0。初回80生成＋06 wantsPlay局所編集1、既存2080表情の変更/再生成0。完成は27系統2160表情、PNG総数2461（active2160＋旧4＋通常297）で全キャラクター完成ではない。最終全体1678PASS後にruntime/PNG変更なし。今回の1系統で区切る。

GitHub保存は最新remote treeをbase_treeに使うGit Data APIで行い、保存HEAD/treeと保存後main/PR/CIの確定値はPR278追記と最終報告に記載する。local履歴をそのままpushせず、main取り込み/競合解消/Ready化/マージは行わない。CI未実行pendingを成功扱いしない。
