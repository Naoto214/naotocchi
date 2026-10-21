# SDD ledger — plan: docs/card-game/plans/2026-10-01-normal-decision-resource-pilot-implementation.md
Method: Native, user approved. Base 7fcf8290341a268dd54732cb95b49edb0f751f51. Approved spec414 immutable.
Pre-flight 1→2: compare_problem/validate_problem consumed as defined; no conflict.
Pre-flight 1–3→4: problem schema and wrapper agree; no conflict.
Pre-flight 2–4→5: full transition state must remain distinct from strategy view; adapter handles conversion, not old priority mode forgery.
Pre-flight 4/5→6: planned vs observed IDs and unsupported records retained; no conflict.
Pre-flight all→7: original 505 baseline and historical counts preserved.
Task 1: in progress.
Task 1: complete (commits 7fcf829..fbaf3d4, tests: python -m unittest discover -s docs/card-game/tools -p test_proxy_resource_value_comparison.py -v → OK)
Task 2: Ruling: Existing116 test file currently runs36, not historical34 in plan — preserve all36 and report actual run — cost if wrong: inventory attribution only, no contract change.
Task 2: complete (commits fbaf3d4..72c420b, tests: python -m unittest discover -s docs/card-game/tools -p test_proxy_resource_value_selection.py -v → OK)
Task 3: Ruling: Legacy pass score uses empty card_copy_id — allow empty only for pass to preserve114 tie behavior, verified RED→GREEN — cost if wrong: pass tie priority differs; covered by literal compatibility test.
Task 3: Ruling: Full old121 projector exposes every opponent prepared card; new strategy view conservatively masks undeclared visibility, retains only explicit public cost/face-up metadata — prevents secret text use; unsupported actual visibility representation must stop instead of infer — cost if wrong: extra unsupported boundaries, never secret-informed choices.
Task 3: complete (commits 72c420b..e29d7f7, tests: python -m unittest discover -s docs/card-game/tools -p test_proxy_resource_value_inputs.py -v → OK)

Task 4: Ruling: Historical141 score copy field used instance IDs whereas its116 certificate used physical copy IDs — preserve historical scores for legacy, bind pilot copy field to the owner-visible physical copy — cost if wrong: equality tie ordering; actual source identity is separately validated.
Task 4: Ruling: Fresh candidate scope differs on17 saved boundaries — preserve all110 planned records and classify17 unsupported, without replacing historical legal sets or claiming policy effects — cost if wrong: reduced shadow coverage; no secret-informed or fabricated choice.
Task 4: complete (commits e29d7f7..ca68c73, tests: python -m unittest discover -s docs/card-game/tools -p test_proxy_resource_value_shadow.py -v → OK)

Task 5: checkpoint 421 — 10専用テストPASS、8初期軌跡独立再実行、全て未接続段階停止。完了ではない。
Task 5: Ruling: 応答pass終了は既存290ハンドラを再利用する — 120単独ではturn_end phaseへ遷移しないため — 誤りの場合は既存phase契約との不一致。
Task 5: Ruling: 新方式wrapperの選択IDに加えて実際の合法actionと公開problemを再照合する — actionすり替えを支払前に拒否するため — 誤りの場合は合法actionの過剰拒否。

Task 5: Ruling: R2先攻のmandatory eggは既存165、その他は205を接続する — 原保存165のactor_turn_index=1を旧／新双方で保持するため。全段を205へ置換するとseq22からmandatory seedが変化するREDを実測 — 誤りの場合は政策外seed差を比較へ混入する。

Task 5: Ruling: 前のR2先攻限定の接続条件を全mandatory seed profileに拡張する — 186はR2後攻もindex1、205は02-A R2後攻index2と実測したため。保存済み文脈のactor/round/indexのみをsource manifest付きで読み、choice・未公開カードを参照せず同一profileを旧／新へ適用 — 誤りの場合は政策外seed差の混入。

Task 5: checkpoint 422 — 12/12専用PASS、8初期軌跡独立再実行、旧4到達prefix保存event/state一致。既存chicken/coin解決接続が残り、Task 5は進行中。

Task 5: checkpoint 423 — C-chicken試験接続の13件全体は履歴照合FAIL。01-A seq33/45配置後first passのreturn_target差（120 None、保存normal_action_opportunity）。不一致を無視せず、案をpatchへ保存し実行コードを検証済み422へ戻した。Task 5未完了。

Task 5: Ruling: 120を使った145/148/158/176境界だけsource契約互換profileを適用し、それ以外の配置後空応答を138へ委譲する — 過去中間hashを保持し両policyの遷移契約をそろえるため — 誤りの場合はhandler版本差を政策差へ混入する。
Task 5: Ruling: 01-B seq84のfresh応答候補と保存318候補scope差を支払前停止とする — historical unique passをコピーしてC-chicken候補を隠さないため — 誤りの場合は比較可能なprefixを短縮する。
Task 5: Ruling: C-cat_friendの2歴史的分類名は同一source referenceと前後hashを条件として旧serializer名へ投影する — 両方が配置即時効果なしの既存契約を指し、rule/stateを変えないため — 誤りの場合は効果分類差を隠す。
Task 5: checkpoint 424 — 15/15 PASS、旧4到達prefix一致、8独立再実行。条件証明等が残りTask 5は未完了。

Task 5: Ruling: 318／401の開始イベント名判定差を真正停止の公開証跡として残す — seq84は最初のegg交換直後でありpass後という仮説が否定されたため。原本も候補も強制修正しない — 誤りの場合は比較可能なprefixを短縮する。
Task 5: checkpoint 425 — 公開trigger event証跡追加、8fresh生成／独立再実行、event/state差0。Task 5は未完了。

Task 5: Ruling: 318の履歴scopeは元のaudit_responseをfresh実行し同一のsource/hash/public event列でのみ使う。保存choiceをコピーせず両policyで同じ互換profileを使う — 誤りの場合はhistorical版本差をpolicy差へ混入する。
Task 5: Ruling: M-antlionのコスト補正とP-desert_scorpionの終了時条件は公開本文から応答起動ではないと分類し、E-first-dateは現在の公開partnerとstage/timeから対象付き候補を再生成する。未知の盤面源・準備済み源は真正停止 — 誤りの場合は候補集合の不足。
Task 5: Ruling: E-first-dateは119のactivate_response_candidate/resolve_chainを再利用する。対象をfresh再照合し支払前に拒否、既存345 serializerと同じevent表現を使う — 誤りの場合は履歴再現不備。
Task 5: Ruling: 227はturn_end要求中でも138空passを使った。その正確な前game/continuation hashにのみ同じhandlerを適用し、後続290接続と区別する — 誤りの場合はphase版本差の混入。実測RED→GREEN、seq37後payload一致。
Task 5: Ruling: C-chickenの配置即時効果なしを示す歴史的2分類名はC-cat_friend同様、同じsource referenceと生成後2hash一致時のみ旧serializerへ投影する — 誤りの場合は分類差の隠蔽。
Task 5: checkpoint 426 — 専用27/27 PASS、8fresh生成・各独立再実行、旧4到達prefix一致。完了0/停止8/未実施0、505不変。Task 5は未完了。次は通常候補scopeの17保留局面と新盤面の分類・通常coin解決。Task 6/7/全proxy回帰/最終独立レビュー未完了。
