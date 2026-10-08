# 承認Bから400戦preflightへ

正本：474（ユーザー承認）、473保存7ce93b62。docs/card-gameのみ。過去版を保持し、seed生成・入力固定・400戦は最終確認まで禁止。

1. 発動／解決／実効的適用の追補を正本化。共通の三値適用証拠とbounded growth、既存native効果のreceipt生成をTDDで接続。実増加0と他部分適用、条件不成立、未知、hash改変を検証。
2. M06/M07の適用根拠を共通証拠へ接続。challengeの宣言・逐次誘発・既存効果・比較・終了まで、既存loopで接続。旧116 pure frontierを統合し除外は維持。
3. 100履歴・既存終了6段階・次手番・勝利へ接続。既存正本の意味で一意の範囲のみ。guardの機械的削除や私的な低成長stateで優先度を偽装しない。
4. 全判断機会／全体replay／真正な初期入力と469lock／実行入口を統合。結果観測前固定は実行許可後、準備時に実験seedを作らない。
5. 大きな安全区切りで関連検証・必要な回帰・npm・設計検査・保護検査・独立レビュー1回をまとめる。GitHub保存後も判断不要なら継続。最終preflight-readyで実行確認。

Interface audit: native効果の既存receiptは指示量と実増加を混同しうる。新scopeは既存handlerの結果を既存本文に照合し、bounded結果・全hash・snapshotを再構成し、旧版defaultへ影響させない。M06の現在receiptとM07の履歴receiptは同じ適用分類を使う。最終全体entryは供給receiptでなくadapter再実行を要求する。

## 進行記録（未完了・継続中）

- 474承認B追補、三値適用契約2件RED→GREEN。native growth handler再利用3件（上限0・部分増加・別部分draw・M06/M07・source drift・独立adapter再実行）PASS。過去defaultは保持。
- 472loopに観測event集合のopt-in設定口だけを追加。default集合不変。challenge_declaredと既存M07/P-anglerfishを新scopeで接続し、通常判断→群→比較→challenge終了を検証。途中rootだけの試験は終了時に履歴欠落を正しく拒否。
- 既存115固定入力と既存test-onlyゼロpolicy rootによる合成結合で、80step／100event／10回の手番終了を通過しR6へ到達、stop=null。独立入力・新規balance対戦ではなく固定unit prefixの接続診断。
- この結合でlegacy native手札発動linkのsource_zone省略が個体監査と不整合になることを再現。明示use_item/use_play/use_eventの旧形式だけ移動元handとして扱い、他の未知形式は拒否するよう補修。カード個体や本文に固有の分岐は追加しない。
- 468のopening／manifest行結合／policy機会journalをそのまま利用し、新backendへつなぐ条件付き入口を追加。全tools fingerprint前後一致、全出力canonical再実行を検証。入力lock・全機会・適格性の完成を主張しない。
- population関連回帰を実行中。独立レビュー・最終preflightは未完了。次は100/終了/勝利と全入力真正性・機会網羅の残ゲート。

- 関連179件PASS完了。以後のchain/latching/entry結合22件PASS（101.337s）。R10最終比較までの固定unit接続を達成、これは部分入力の接続検証であり独立標本ではない。
- 3種類のquick top-linkを共有し、既存native hit/first-dateを利用。完全な外側chain保持、bounded growth、公開／drawと適用なし、現在incarnation対象／retired対象、終了正規化と履歴再照合を接続。
- 独立レビュー1回の指摘をverification/review.mdへ記録。source読込lock leakと終了復帰をRED→GREEN修正。challenge reward上限をnative比較後の実増加・結果・hashへ接続（新規価値付けなし）。以後の変更は最終関連検証でまとめる。

- 100到達後のbundle: challenge報酬・W-countryside・結婚のbounded実増加、typed当ターン効果失効、実到達／維持履歴と終了6段階を接続。通常選択の未知上位値はNoneのまま、既存114で証明できた劣位だけ除外し、残りを116へ委譲。paid/recoveryの適用再照合も現在の共通selectorへ接続。専用RED→GREEN、関連29件PASS、population203件PASS（234.890s）。100履歴の終端テストには条件付きhistoryとmockを含み、真正な新400入力や100到達対戦を検証した主張ではない。
- 横断監査: current107全41カードの本文sectionと能力classificationを照合。静的一覧をcurrent107-source-routing.jsonへ保存。これはhandler実行／判断機会網羅の証明ではない。通常／response、開始、登場、quick発動、効果適用、セカイ変更、challenge宣言、終了、継続補正、支払軽減、置換を別責務として扱う。
- 一意な不足を発見: 91のfirst-dateは段階0を解決条件と明記し他段階の発動を許すが、既存列挙器が0限定。87のhit-blowは空山札で分岐不実施を定めるが旧responseは候補を除外。保護114 table／旧adapterは変更せず、現行別版へ合法性を接続するRED→GREENを開始。旧responseの固定+5を新規合法範囲へ流用しない。新しい点数や解決済みの主張ではなく119未解決fallback／116除外を維持する。
- 誘発台帳を手番変更前・最終完了時にarchiveし、pending/deferredを残した破棄を拒否。RED→GREEN、関連7件PASS。02のpartner出来事時たまご抑止はsource hashと陰性捕捉を追加し7件PASS。
- 新bundle独立レビューC0/I0/Minor1（test名の未検証部分、threshold-review.md）。npm406PASS。全proxy回帰実行中。次の全機会監査では、C-chameleonの過去の場在籍を配置event名だけで再構成しないことを確認する。実snapshotからの公開継続適用照合を/tmpにTDD試作中（未接続、今回Git保存に含めない）。

## 公開適用・義務照合から全体審査への接続

9c56保存後、公開なかま適用を全event/snapshotの実在籍から検証する別版を接続。C-chameleonが去った後のセカイ配置で過去在籍を復活させない。公開fieldのみを判断へ返し、解決receiptの不明をfalseにしない。旧defaultは保護。条件付きfixtureは合法な対戦全体の証拠ではなく、旧event名推定の偽陽性を再現するunitである。

`proxy_population_trigger_coverage`は記録eventのうちdriverが観測対象にしたものだけを母集団にせず、各実state遷移へ既存source producerを適用し、開始captureからの義務と合わせ、全閉鎖台帳・残存台帳へ照合する。余分／欠落／複数手番への重複とjournal改変を拒否・報告。existing executor内の対象誘発に限定し、初期proof真正性、別実装ルール検証、全判断網羅、戦略的解決、標本算入を独立gateとして残す。固定R10結合は2件PASS（110.795s）。

全体審査は459/463の既存仕様を別版で接続する。callerのeligible/verifiedを根拠にせず、現行のmanifest結合entryから再構成した判断・遷移だけを審査する。旧schema/過去runの遡及算入は拒否。旧116を確認した判断は除外とし、同時に未証明gateを保持。指定MRPの戦略未証明は維持し、局所乱数一致だけでpolicy_eligibleへ上げない。対戦の未完走、機会不足、input lock欠落は未証明。鏡像の片側欠落、予定400行の欠落、複数attempt不一致を残し、全体結論は全gateが揃うまでnull。

次のTDDは、未知schema/自己申告、真正な旧116、指定MRPと指定外の分離、途中対戦、片側欠落、全予定行保持、再試行による除外消去拒否、0分母、過去record拒否をまとめて扱う。実験seed/manifestは作らず、既存の不適格in-memory test doubleで構造・保留動作を検証する。

## 判断・対戦・鏡像・予定集合の保留審査bundle

source再構成された現行recordだけを審査する別版admissionを追加。判断→対戦→鏡像→予定400行を保持し、未実施・除外・未証明を分離。旧schemaや自己申告flagは遡及算入しない。指定MRPは実Sessionのframe/origin/address/root/候補/選択/適用後stateを既存465で再検算し、戦略未証明・policy_eligible=nullを保持。通常/responseの選択根拠横断審査、全ルール機会、生成来歴・事前lockは未証明gateとして残す。全体件数/割合/結論はnull。

各source義務を処理する前に通常行動やresponseへ進まないことを全stepで照合。全ルールの独立証明ではなく、既存producerとphaseの処理順監査。対象再検査のnative失敗は条件を再照合して474不適用証拠に接続し、activation/resolution/cleanupを保持。証拠のないnullは未知であり不適用にしない。

独立レビューC0/I1/Minor0: caller共通replay limitで正規attemptの116除外が失われる点を実prefixで再現。各record固有reconstruction_step_limitを保存し、その境界で再構成するよう修正。修正確認で未解決0。最後の関連34件PASS（148.760s）、設計errors=[]、既存正本476ファイル一致。詳細admission-review.md。npmは前bundle406PASSを参照（今回Pythonのみ）。

保存9c56固定worktreeの全proxy回帰は1,546件PASS、開始/終了ID全件一致・skipなし・source不変。d0ceおよび今回の後続変更を含む全回帰ではない。全回帰集計をregression-9c56-summary.jsonに保存、現在差分は上記関連検証と区別する。

preflight-ready=false。入力生成・400戦固定・実行は0。次は残った通常/response・自動処理義務の証拠審査と入力生成/実行の管理境界。保存後も継続する。

## 指定必須選択の発生機会と全手番addressの照合

1911dcdから継続し、callbackの有無に依存せず全turn開始・全top-link解決からorigin journal/own-turn/resolution ordinalを再構成する。選択のない解決も番号を消費する。指定5種類は実際のentryから465 REGISTRY/prepareで必要な選択とno-choice理由を導き、実Session journalのidentity/frameと全件照合。全現物履歴をlife.observeで追い、現在active-copy投影と最終lifecycleを検証する。未知の指定外判断を今回のpolicyへ取り込まない。

専用RED→GREEN、関連15件PASS（26.679s）。固定unit R10までの入口結合を含む5件PASS（134.421s）。全20手番、選択なし解決を含むorigin、必要選択件数、欠落/frame改変拒否を確認。独立review C/I/Minor各0。origin真正性・全ルール機会・戦略適格・事前入力lockは別gate。新seed/400戦入力固定/本番実行0、preflight-ready=false。保存後も残った指定外判断・自動処理の機会と入力管理を継続する。

## responseの未知0拒否と指定外の必須選択義務

旧119実装の辞書default0は、新しい現行候補集合で未証明なカードの比較根拠にしない。E-first-dateとE-bossが合法な条件付きunitで、旧priority_uniqueをRED再現。現行scopeは明示119 first-date/passの既存前提が揃う場合と唯一responseを維持し、それ以外の未証明比較を119 seededへ委譲する。点数・同値化・優先順位追加なし。候補を落とさず、旧116除外を保持。

指定外の解決時選択（本体能力値選択、回収成功後の山札順、対象装備除去後の探索）を既存descriptor/targets/choicesから導き、実mandatory_decisionsと完全比較。必要な選択の欠落、不要な選択追加、recordの戦略flag改変を拒否。対象不成立・山札空等のno-choice理由を保持。対応外mechanismはapplicable=false/未検証。指定MRPへ拡張しない。検索正例の新対戦は作らず、固定107の装備3種類はいずれも印刷時2で、時3以上の対象がない条件付き不成立根拠を別保存。

専用RED→GREEN、関連16件PASS（1.595s）、response関連21件PASS（35.444s）、最終R10含む24件PASS（168.215s）。独立read-onlyレビューC/I/Minor各0、設計errors=[]、保護正本476件不変。npm/full regressionは保存9c56の406/1546PASSと区別し、この差分の全回帰とは呼ばない。

preflight-ready=false。通常/responseの全合法集合・選択根拠と、自動処理を含む全機会の合成認定、入力生成来歴/版/事前lock/実行承認gateは残る。予定400行は削除しない。seed生成・実験入力固定・400戦実行0、新方式未採用。保存後も準備を続行する。

次の既存選択根拠接続: source再構成済の現行recordについて、通常114の全候補比較/116 safe-free証明と119の明示response証明を別validatorで検算する。ラベルの非fallbackだけでは認定しない。候補・点数の出所は現行source再構成へ結び、計算証明と完全合法性/機会/入力lockを別gateに残す。未知点数・新関係を補完しない。未対応のresolution_modeや不足certificateは未証明、既知116除外は優先保持。合成計算fixtureと実入口record改変拒否を先にREDで確認する。

選択計算レビューでsafe分岐の114先行比較欠落をRED再現して修正。計算一致はoperand意味論の証明ではないため、admissionの選択根拠/116陰性gateを未証明のまま保持する。

入力準備の次bundle: 459/463の実装版固定を、完全commit/treeとdocs/card-gameの保存blob集合、現在Python実装/版、現在tools集合へ結ぶread-only edition verifierとして追加する。Git replacementを無効化し、source差替え/欠落/追加Pythonを拒否する。保存済み全ファイルの不変性を検査するが、新しい入力/検証artifactの追加は既存sourceの変更と区別する。remote公開・承認・OS採取・結果前順序・適格性はこの検査から導かない。合成一時Git repositoryでTDDし、実seed/入力/対戦は作らない。

同じ入力準備bundleで、供給済みtranscriptから465形式の全200群/400行・奇偶先後順・owner root commitmentを構成する純粋builderを追加する。乱数採取なし、旧115の同じ初期順を繰り返すin-memory fixtureでのみ構成を検証する。入力真正性・edition認証は別検査で、builder成功を生成許可や実験入力lockへ昇格させない。

## 通常比較operandの未証明0境界

続く横断確認で、native batch.outcomeの初期growth=0が、直接成長mechanismにも返ることを確認。E-first-dateの現在合法候補でpriority_uniqueになるREDを保存。現在opt-in比較scopeに限り、symmetric_draw_growth / board_count_growth / targeted_relationship_growthを未証明guardとして既存116 frontierへ委譲する。効果実行handlerはそのまま再利用し、新しい成長比較値を与えない。既存の条件付き非公開コインの141比較を一括置換しない。G-area-claim/E-bossの条件付き実候補でも、未知候補がfrontierに残り、proved_scoresへ入らないことを検査。旧native・過去記録を変更しない。

独立read-only reviewerはC/I/Minor各0。候補削除、新点数、比較意味論の追加はなく、実行outcomeと比較outcomeを分離し例外時もscope復元することを確認。全20turnを含む結合検証は別記。6190固定全回帰には、この後続差分を含まない。

## 現行107のsource義務閉包監査bundle

read-only横断レビューから、121/132の6 source familyと現行107表を実entryへ結ぶ不足を確認。まず通常行動の全source/手札action variantを、選択結果とは独立に現在の許可viewと114表から導き、保存された全enumeration_units（不成立理由を含む）へ照合する。candidate_set_complete=trueだけを受け入れず、source欠落・variant欠落・重複・合法projectionの脱落を拒否する。target/predicateの意味論、情報の実使用、戦略選択根拠は別項目であり、このsource被覆だけで完全合法性や全rule機会を認定しない。現行adapterのfirst-date等の裁定を旧表の発動条件へ戻さない。response/mandatory/trigger/automatic側も同じ責務で合成する方向とし、旧121や132を変更しない。

### Ordinary entry / record / transition binding bundle

Source inventory coverage is retained as a narrower proof. Next, derive ordinary decision identity from actual entry round/actor/phase and current response window, compare every selected detail with its inventory, and bind the selected ID to the actual first event. Verify all event/envelope/snapshot hashes through existing canonical bind/snapshot functions. No action semantics or legality inference from hash equality. Compose all step decisions/mandatory decisions into the exported decision list without deletion or reordering. Use actual115/zero-root fixtures and tamper tests first; then connected full-turn regression. No seed generation or input lock.

### Resolution choice obligations: remaining source closure

Current legacy obligation audit deliberately returns applicable=false outside its three known families. Do not interpret that as no mandatory choice. Next source-derived composition will separate:465 designated families (prepare/frame plus actual local record), existing116 legacy effect choices, source-bound resolvers with no further resolution choice, and unsupported/unproved mechanisms. Activated targets and paid costs are already fixed at activation; they must not be silently selected anew during resolution. No-choice certificates need a pinned source descriptor and handler route, not merely an empty new_decisions array. Current107 resolver routes include payment/stat/conditional/direct growth, reveal, draw-only, fixed-target recovery, designated cycle/look and legacy search/order/parameter. Reuse each existing descriptor/preparer rather than a new generic card interpreter. Unknown routes remain unproved and prevent a completeness claim. Keep activation/opportunity/legal-set/effect-semantic obligations separate from this resolution-choice classification.

通常候補のsource内target/cost展開bundleを追加。121/132と現在source-checked helperから期待列を作り、欠落・重複を検出。関連16件と全20turn5件PASS、独立review0。完全合法性の認定とは分離。次はresponse側のsource-local候補展開と、残る全ルール義務・生成/lock/実行管理。新しい値や新対戦は追加しない。

### Generation preparation: durable sampling boundary

459/463/469 already fix OS sampling order, rejection rules and interruption behavior. Connect the existing Cursor/builder to an explicit future generation entry, without calling OS randomness now. Before every read, persist and fsync a request; persist the exact returned bytes before consumption. An unresolved request after interruption prohibits automatic redraw/resume. Preserve all rejected pairs. No result-dependent retry or replacement. A completed generation writes canonical transcript/manifest/edition/journal artifacts exclusively; output presence or caller approval-reference text does not prove external approval, OS provenance, remote publication, or input lock. Approval remains an external operator/workflow prerequisite, to be requested before any real invocation. Tests use injected historical115 bytes/zero roots and temporary files; the production OS function is never called. Reuse current fixed200 Cursor and pure builder, and verify immutable local edition before sampling and after collection. No production driver is invoked.

### Fixed-order execution control

Use the existing admission/source-reconstruction path to derive schedule position from every retained attempt. Preserve all400 rows and200 mirrors; fixed execution_order is the only ordering input. A completed source-reconstructed116-excluded row may advance diagnostic scheduling, never admission. Missing/unverified, out-of-order, conflicting-version/result or unfinished attempts block automatic progression. Same-row retry keeps all prior attempts and cannot create a new sample. A next_planned_row is a position only, not permission: input-lock/external approval/whole-rule proof remain separate, and this read-only controller executes no game. Integrate only after tests for retained excluded rows, interrupted rows, prior-exclusion retention, order corruption and self-reported completion. No seed generation or actual400 execution.

The attempt entry will reuse connected.reconstruct and existing source replay/admission, not duplicate game execution. Before invoking it, bind the supplied manifest to an immutable local Git receipt and exact saved source/Python edition. Write exclusive durable start evidence before reconstruction, retain canonical compressed raw record even if replay/audit later fails, then write completion evidence. External generation/execution approval, remote pre-outcome publication and all-rule readiness are prerequisites of the operator workflow, not facts established by a string or local Git equality. Tests use only existing historical115/zero-root unit prefixes or mocks; no production inputs or400-game dispatch. One future worker per process; no threads or in-process parallel scopes.

Compose a fixed-order supervisor over the saved one-attempt API: one fresh isolated Python process per planned row; no threads, new policy or alternate executor. Validate supplied bundle/local immutable receipt/edition before output creation. Persist the full planned set before launching any child. A source-replayed complete row advances execution position even when116-excluded; incomplete/nonzero/invalid receipt halts and retains every remaining not-executed row. Child records and local control receipts are exclusive and immutable. No automatic resume/retry or outcome-based skipping; any later retry must keep prior artifacts and the same manifest/version. Operational completion does not make a balance conclusion. Tests mock child launch and exercise stop/order/retention without executing any new match. Real invocation remains forbidden before final external confirmation.

### Automatic output / whole-step binding

Reuse the ordinary canonical transition checker for automatic steps and compare native forced output with every exported event, snapshot, full envelope, mandatory subdecision, final state/hash/sequence and terminal result. Native output without new_envelopes must reconstruct the full envelope sequence with the existing state.advance, as runtime._step does. A rehashed forged runtime must not pass merely because legacy snapshots match. This is structural binding, not dispatch/effect semantics, full legality, all-rule opportunity closure, or admission. Test historical115/zero-root resolution and next-turn prefixes, full20turn completion and corruptions; preserve historical sources and no new production input.

### Committed generation package cross-binding

The future manifest receipt must bind more than manifest.json: read the sibling edition, historical registry, material transcript and sampling journal from that same immutable Git commit. Reconstruct the manifest from the complete supplied transcript using the existing fixed200 builder and pinned repository registry, and compare it exactly. Bind journal returns/completion to those exact material bytes. Check the saved edition against the current execution edition. This supplies immutable content consistency, not OS provenance, remote publication, chronological precommitment or external consent. Those gates remain separate. No generation function is invoked. Unit positives use repeated historical115 seeds and zero roots with explicitly mocked registry/edition gates; genuine registry rejection remains a negative case. Do not create a new experimental input set.

### Public current-turn counters and second-own-card trigger

Cross-audit finding: 89 W-city says the player's second card in *this turn*, including response card plays; it does not require the owner's turn. Native board_candidates adds actor==turn_player, while turn_card_count/_used anchor to that actor's last own start. 06 explicitly resets each card's per-turn limit on either player's turn change. Add an opt-in current-turn public-history boundary and source-bound second-own-card enumerator, preserving native activation/resolution, sequential group policy and designated look-choice policy. Count both owners' plays within the same current turn; separate occurrence from window anchor, and retain physical incarnation/usage identity. No new card priority, scoring or ruling. TDD opponent-turn positive, prior-turn reset, first/third-play negatives, board ability not a card play, once-per-current-turn, missing boundary, source drift and scope restoration. Reuse source-checked89/06 and existing card-event grammar. No new match or initial input.

### Admission composition of authenticated execution evidence

The current admission validator reconstructs completed attempts but leaves its completed_source_replay gate unconditionally unproved. Replace that fixed placeholder with evidence-derived composition: verified only when at least one completed record is source-reconstructed, every supplied attempt authenticates, and completed results/runtime and execution editions do not conflict. An earlier authenticated unfinished prefix remains a retained gap even if a later attempt completes. An unauthenticated retry cannot erase an authenticated116 exclusion or make the completion gate verified. Conflicting authenticated completions/editions contradict the gate. Keep input lock, all-rule opportunities, full legality/information and selection-operand gates separate and unproved. No new admission conditions, retry policy, denominator repair or runtime behavior. TDD complete/incomplete/unverified/conflicting cases first, then existing real-prefix admission/schedule/attempt integration. This is evidence composition, not a new claim that the population is eligible.

The same execution-evidence bundle also checks06's reverse-chain/no-interruption boundary across all current resolution handlers. Inspect the actual source activation stack and each exported transition, require exactly the top link to resolve, bind its actor/source/link ID to the resolution event, retain the ordered outer links, and keep any nonempty remainder in resolving state. No new activation or ordinary decision may occur during that step. This certifies supplied resolution order only; target/effect legality, full opportunity coverage and origin authentication remain separate. Reuse current conditional native resolver fixtures plus the historical115/zero-root full-turn fixture. Do not reimplement effect processing or introduce a new comparison.

### Hand-based event-conditioned optional triggers

06 and63 classify a normal optional `when ... may activate` as a first-opportunity decision before ordinary response, regardless of hand/board source.83 G-air-hockey and84 P05 provide the reached107 hand case. The native challenge helper checks only the latest non-pass event; it is not latched into the sequential group and can lose its occurrence when another trigger is added first. Extend the existing actual-transition capture/group adapter to owner-known hand sources for this registered event mechanism, with before-event hand presence, opponent quick-play/challenge condition, exact origin, current time/participant/target/parameter enumeration. Reuse existing legacy116 seeded group selection and the existing quick activation/stat resolver. Suppress the separate ordinary-response route after group handling so decline cannot be undone. Observe actual group activations too, because a hand quick can trigger another registered occurrence. Keep hidden hand contents out of the other player's choice options; full-information noninterference remains a separate audit obligation. No463 policy expansion or new values. Conditional native fixtures and ledger/closure/replay tests, then multi-turn integration; no production seed/input/game.

Nested response projection finding: preserve the actual outer full current/runtime through the existing prepared-card hiding projection. This prevents loss of challenge/modifier context from current native predicates. Restore both temporary globals and original function on exceptions. Verify candidate inclusion in a prepared-slot + challenge + existing modifier fixture and in the actual connected entry. No historical adapter edits or new effect semantics.

### Core normal disposition predicates

The source/variant and expansion audits do not verify admitted/excluded verdicts. Bind01/02's current normal core predicates to every supplied core unit, including excluded alternatives: standing pass, challenge, relationship, main movement with existing payment adjustment, person/world placement, attachment/preparation capacity and existing optional payment. Compare reason sets/disposition and actual payment evidence; retain all unsupported card-specific quick/board/reservation rows explicitly as unproved. Reuse main identity/payment helpers and the fixed114 table, not a second executor or inferred card priorities. This check establishes these local predicates only; source/target completeness, allowed-information use, provenance and whole-game eligibility are separate. Test self-consistent disposition/projection corruption, unavailable targets/time/shared person limits, source drift and actual entry binding before implementation. Historical inputs and conditional states only.

Review corrections: current P-cliff_goat same-partner relationship discount must be reused, including its exact effect IDs; printed time1 is not the actual payment in that state. Extract only the existing filter/payment expression to a shared helper and keep existing effect/transition behavior. Check active challenge in game_state, not runtime. Both are reproduced and verified separately before multi-turn integration.

### Current hand activation predicate cross-audit (fa6e9d6c continuation)

Fresh remote HEAD/tree and PR259 Draft/open/unmerged were verified. Restored an isolated checkout; existing core predicate baseline6PASS. Cross-read458/459/463 and current status before implementation. No production seed/input/game.

The current107 quick-use table has15 hand card IDs. Add a pinned-text/table predicate audit for supplied normal hand rows: timing, current targets, current public loss/application history, payment, same-name turn limit, board-count variant. Keep source/variant completeness, reason-code semantics, actual information use, comparison operands and whole-rule opportunities separate. Reaction-only rows are proved excluded by timing; this does not establish their unused response targets. Reuse existing public history, equipment-target and identity helpers; no new executor or score.

Investigation reproduced an extra E-boss normal condition:121 matches the words “own main” in its historical prerequisite text and therefore requires a surviving current main, although91 requires only the public loss this turn. Reuse the existing payment/response enumerator for registered after_own_main_loss_this_turn rewards in the current population scope. Keep old adapters and table unchanged. TDD the departed-main positive and absent/previous-turn/draw/opponent-loss/insufficient-payment negatives; retain normal activation through the existing quick handler. This does not certify information noninterference or strategic eligibility.

Remaining cross-cutting gates: normal board/reservation predicates, response predicate semantics beyond registered expansion, actual allowed-information use and comparison operand provenance, all-source/all-phase opportunity obligations, remote publication/pre-outcome ordering/external authorization binding. No local equality or static flag may resolve these. preflight-ready=false until their evidence is composed; generated inputs and actual execution remain unauthorized.

### Normal board activation and supplied-unit composition (4bd9853 continuation)

After verified remote checkpoint4bd9853, connect the remaining normal board predicates by shared mechanism: registered own-turn paid draw (current main, instance usage, every ordered cost), self-board-cost recovery (other-named discarded companion, current incarnation usage), and source-classified passive/response-only units. Preserve native grammar and cost/target helpers; do not reimplement activation or selection. A companion ability listed as a hand template still cannot pay its board-source cost. Retain legacy reservation sources and unsupported mechanisms explicitly as unproved.

Compose the freshly computed core, hand and board audits against every supplied enumeration_unit_id. Reject duplicate/foreign proof rows and expose missing/unproved IDs. This is normal supplied-unit predicate coverage; source/target expansion, actual information use, choice operand meaning and whole-rule opportunity completeness remain separate. The composition does not authenticate arbitrary caller proof objects. TDD altered dispositions, paid-cost omissions/substitutions, used-instance/other-name conditions, all current person/world/preparation source classes, and actual-entry export. Existing115/zero-root integration only, no experimental inputs.

### Response hand predicates (dc2ba7f continuation)

Reuse the source-bound hand conditions with explicit priority actor; compare semantic target/variant/payment alternatives for 13 ordinary quick IDs, including fallback routes not covered by registered response expansion. Reaction-only air-hockey/baseball and board predicates stay unproved here. RED matrix → shared predicate connection → integration and one independent review → remote checkpoint. No new policy, values, production inputs, full-legality or information-use promotion.

### Response activated board predicates (efbee579 continuation)

Reuse normal board current-source/ordered-cost/target/usage conditions for own-turn response activation, with explicit priority ownership. Add response-history once-use checks for companion recovery. Verify nonactivated source classifications only; event-origin and prepared responses remain explicitly unproved. RED→GREEN, source matrix and related integration, one independent review, remote checkpoint. No policy/input/eligibility changes.

### Ordinary response reaction predicates (cb8fa877 continuation)

Fresh remote HEAD/tree and PR259 Draft/open/unmerged verified; restored the dedicated branch in a fresh checkout. Reuse current response audit and actual entry. Bind81 batting to current participants, declaring actor, power comparison through existing source-bound stats, current payment and own participant target.83 air hockey remains owned by the existing06 sequential hand-trigger ledger; certify only its absence from ordinary response, not occurrence coverage. Preserve candidate/selection/effect handlers, all old sources,116 exclusion, unknown operands and unproved admission gates.

TDD: missing audit/entry evidence5RED; implement narrow semantic comparison; correct a test fixture that changed priority before authenticating its capture (recorded separately). Cover missing/duplicate/forged alternatives, wrong target/variant/copy/payment, greater/equal power boundary, nondeclarer/wisdom/ended/departed/time conditions, concealed projection with active modifier, source/priority drift, hand-trigger reoffer and actual entry. No experimental material or match. One independent review at bundle end, related/full-turn verification and remote checkpoint; continue remaining preparation.

### Fresh remote publication prerequisite (7723df7 continuation)

Add a read-only live exact-HEAD prerequisite for the pinned Naoto214/naotocchi branch, before generation entropy/output, before attempt output/reconstruction, and before supervisor output/child launch. Verify local immutable commit/tree type and equality, query the exact HTTPS remote ref freshly without repository URL rewrites or inherited Git configuration, and reject missing/ambiguous/moved refs and transport errors. Use a bounded transport timeout. No cached caller verified flags. Retain observation evidence in existing start/operation artifacts.

This conservative check requires the receipt commit to remain the current remote head at each invocation; branch movement blocks progression, without automatic update/retry. It proves only an observed ref/content match. External generation/execute consent, OS provenance, temporal ordering, completeness/readiness and actual input-lock certification remain separate false/unproved fields. No new runner, dispatcher, retry policy, inputs or games. Test transport with synthetic raw advertisements and a real local Git fixture, and prove stale/missing remote rejects before any side effect on all three entries. Existing successful unit boundaries mock this new external prerequisite explicitly.

### Sequential current-trigger predicate audit (c4cc165 continuation)

Fresh fetch confirmed c4cc16533b3355cafd354603514c01d141ed3552 / f16380946293e271beaa7411475303344333bc3b; PR259 open/draft/unmerged. Reuse the dedicated clean checkout, actual capture/ledger, StartAdapter and latched current_actions. Opt in only through current474 contract_scope; historical defaults and numbered sources remain unchanged.

Add a separate semantic-alternative audit for M-antlion03/06, C-bat, P-cliff_goat and start C-chicken/I-bowtie. Source-slot/owner/turn, existing incarnation usage, current hidden-prepared presence, full world cost/target product and all prepared targets; start origin identity/current source/hand threshold. The start ledger owns occurrence consumption, so this is not a new once-use registry. No inference from deck content or predicted effect. Bind fresh audit into each adapter proof before sequential inventory consumes it. Keep occurrence authentication, all timing closure, candidate grammar, actual information-use and operand/admission gates false/unproved.

Pre-flight: wrapper is installed outside the existing positive/472 driver; existing adapters and replay call the same current helpers and preserve returned actions. No new candidate generator, selection policy, value, effect or experiment material. Four missing-audit tests RED then four GREEN. Conditional fixtures are not actual match histories. Next: edge/negative boundaries, connected fixed-input regressions, independent review once, save checkpoint, continue outstanding gates.

### Concealed prepared negative/public effect route audit (0c54b38 continuation)

After verified remote 0c54b38/tree37ee8bc and clean Draft259, audit current concealed exclusions against the pinned preparation pool plus actual public active links. Do not infer no-removal merely because a card belongs to CAPABILITIES. Use existing quick dispatch registries/descriptors and source sections: draw/reveal/growth, stat/payment/reward modifiers, equipment-only movement, own-discard companion recovery. Board and unknown mechanisms remain explicitly unproved; no effect simulation or resolver replacement. Inspect every active link even when the root event is a turn-start/nonactivation event. Bind physical source and origin identity, check all concealed controller/slot exclusions without reading or exporting opponent hidden identity, reject missing/duplicate exclusions or illegal reoffers. Public equipment remains a separate unproved scope.

Tests: five missing API failures; five GREEN after correcting quick recovery's registered cost label and a synthetic invalid board-link fixture. Extend all15 quick routes plus source/origin mutations, real connected entry and current related/full-turn integration. One review per bundle. No readiness/policy/admission promotion and no experimental input generation. The quick route certificate is registered semantic dispatch only, not whole-effect execution proof or all timing opportunity closure.

Review ledger: C0/I2/Minor0. Fix1 actual recovery override ordering RED→GREEN. Fix2 source-local audit must not call whole-state validation because it reads opponent concealed identities; tracked access RED→public-only checks→GREEN, existing runtime state validation retained. Ruling: full state validity is a separate false field, not inferred by this audit. Final related34PASS; review scope exclusions remain explicit unproved gates, not waived preparation requirements. No new adjudication/value/policy decisions.

### Public replacement equipment negative audit (590d853 continuation)

Fresh remote590d853/tree065a21b and Draft/open/unmerged259 verified; restored clean dedicated checkout. Reuse prepared_predicates and registered15quick routes to bind I-bond1's current source/controller/companion attachment to exact equipment exclusion evidence. Scan all active links even when no concealed preparation exists. Missing/duplicate/altered exclusions, reoffers, missing/wrong attachment and foreign exclusions fail closed. Unknown/board routes and start/end equipment stay unproved; replacement timing/opportunity history is not certified. No new replacement executor or candidate policy. Pre-flight: existing response entry consumes the same audit errors and preserves the separate concealed field; new equipment field has a narrower explicit scope.

Three initial tests RED (missing equipment proof), implementation GREEN. Conditional native inventories cover both owners, no-concealed chain scan and unproved start/end equipment. Continue related/connected tests and one independent bundle review before remote save. No production inputs or matches; all readiness/admission boundaries retained.

### Native arrival/end current predicates (36c4b91 continuation)

Fresh remote36c4b91378b3995cb3febf2c34dbf93571c77cb0/treefb95757 and Draft/open/unmerged verified; clean dedicated branch. Extend existing trigger_predicates scope to ExistingAdapter.enumerate for three arrival and four end mechanisms. Reuse candidate/effect/selection/ledger and current historical-use helper. Bind source slot/owner and pinned capability, unique supplied origin, M04 all discarded quick physical targets/no concealed preparation, M05 time_skip/empty preparation, beetle01 birth. End: beetle02 no current-turn self time_skip, countryside exactly one action play, scorpion public play+item with main, sleepboost attached current main/no declared challenge/time>=2. Current origin membership and existing once-use are checked. This is supplied occurrence/current alternative semantics, not occurrence production or historical authenticity.

Three arrival RED→GREEN, three end RED→GREEN. Pre-flight: ExistingAdapter is also used by collect/replay; audit preserves native return actions, and all out-of-scope cards retain native behavior. Scope restoration covers the extra wrapper. Current engine receives the audit through existing contract_scope; no historical numbered source edits. Ruling: do not equate end-event membership with authenticated first-opportunity closure; that remains false alongside info-use and operand evidence. Continue boundary tests, full-turn connection, one review and remote save. No new values, policy or production inputs.

Native review ledger: C0/I1/Minor0. I1 resolving observation regression reproduced in2 dedicated tests and initial integration2errors. Fix keeps nonempty activation forbidden and requires actual empty==independently expected empty for native observer scans. Final related37PASS (7.958s); initial35 predates the fix. Two intervening process-level incomplete runs retained, not counted as PASS. Ruling: observe-every-transition is not an activation opportunity; sequential.inventory remains the execution guard. Historical helper correctness, origin authentication, information use and full opportunity closure remain unproved. Final integration is recorded separately.

### Remaining native current predicates (c8b869d continuation)

Fresh remote c8b869da0a43664e40f9f5fdc40c09351c28362a/tree709026f and Draft/open/unmerged259; local clean. Reuse existing public_turn for city67/89 and ExistingAdapter for city, forced P-cat_ceo and challenge M07/Pangler. Add semantic-alternative audits to the current474 trigger scope, preserving current candidates/activation/effects/selection/ledger. City: current turn boundary, exact second own card, source/current world, once-use, precise trigger origin. Pcat: current partner/main and relationship_start source/actor, forced category and consumed occurrence, no hand-size prerequisite. Challenge: current source/own declaration/target/parameter, changed world + existing474-bound application helper or current deepsea, and once-use. Full origin/history/source-at-origin authenticity, all timing closure, actual info use and operand/admission gates remain unproved.

Attempt ledger (not completed changes): initial opponent-turn city test put contract_scope inside an already-entered runtime.operation, so it missed the existing operation wrapper's public_turn.scope and falsely suggested an unimplemented correction. Direct hooks into historical triggers failed pinned-source integration (2failures/6errors) and were restored; a replacement city module was temporarily tried. Reviewer found its draw-only boundary also rejected generated turn_end_completed before the next draw. Existing public_turn.boundary already covers this transition and existing public_turn.scope already supplies correct opponent-turn candidates. Removed the duplicate city module entirely, restored actual scope ordering in city tests, and reuse the existing boundary in the new audit. No old source pins/manifests or candidate semantics are changed in the final bundle.

TDD: initial city2failures/1missing-audit error included the invalid-scope diagnosis, so it is not evidence of a current runtime bug. Relationship2 missing-audit RED→GREEN; challenge3 missing-audit RED→GREEN. Review I1 reproduced on an actually generated next_turn snapshot (RED); removed duplicate mechanism and switched audit to existing public_turn.boundary (GREEN). Corrected tests cover opponent-turn activation through native chain/effects, used/reset counts, counted/excluded methods, third-play no-retroactivity, forged alternative/origin/source hash, exception restoration, and generated intermediate turn observation.474B capped growth with no effective portion stays not applied even when a stale result payload says growth5. Mandatory singleton does not create a decline or strategic admission.

One independent review C0/I1/Minor0. Final related46PASS (6.737s), including public_turn regressions. Prior40 and integration19PASS (139.164s) predate reviewer correction; they are not final evidence. An intermediate mixed-prefix admission run failed while test files changed (connected fingerprint covers all tools/*.py); same test with fixed files passed. Final integration runs with all Python sources frozen, recorded separately. Ruling: reuse the existing turn boundary and candidate implementation, not another implementation of it; observation remains distinct from activation and full opportunity proof. No new values, policy, seeds, production lock or400 games.

### Supplied occurrence closure bound to execution (04992fd continuation)

Fresh remote04992fdbf5eb2ce349445cd12509a5e225150ac1/tree f83d339a8977cb4123dc1972ae9f6f1981ab4b35, PR259 Draft/open/unmerged, restored clean branch. Inline TDD: existing coverage reconciles occurrence IDs, while individually valid saved ledgers can substitute activated/declined status without matching executed trigger steps. Existing order audit is the shared composition point; extend it, not the executor. Bind semantic ledger (turn owner, every occurrence/status/ineligible proof) at actual archive boundaries and final output to the already reconstructed order. Require exact turn-change/terminal archive boundaries; reject duplicate expected source occurrences before dict indexing. Empty observation journal entries are producer bookkeeping, so validate their journal reconstruction separately and compare semantic states, not byte-identical journal call counts.

Pre-flight: coverage calls order inside native scopes; existing driver closes the old ledger at the actual pre-turn-change boundary and terminal ledger on completion. Scope is supplied source obligations only; records' actual activation/effects remain authenticated by existing replay, not by this additional status binding. No origin authentication, all-rule opportunity proof, reservation absence, information-use/operand or admission promotion. Five initial mutation RED, then16 related PASS. Two archive-required RED next. Continue fixed-source related/connected verification and one independent review. No production seed/input/game, old pins/results and476 numbered sources unchanged.

Closure bundle final: related33PASS4.302s, connected19PASS130.792s with fixed Python sources, npm406PASS, design errors=[],476 unchanged. One independent review C0/I0/Minor0. No fixes required. All unproved gates retained.

### Fresh native collection/source and early-negative binding (35a6899 continuation)

Prior closure bundle saved35a6899adf658331e00963e001d51a774aab6c23/tree5189b3b5d9971dd5154e8fae7855d9978b12948a; fresh live exact-ref errors=[], Draft/open/unmerged confirmed. Continue existing trigger_predicates scope. Native collect bypassed the semantic audit for early negative P-cat_ceo, and had no cross-binding of classifications to every current public source and projected occurrence. Wrap collect only in current474 scope, preserve its candidate/effect/selection implementation. Source roster uses existing public_sources; every supported source has one classification/current audit, every out-of-scope source remains explicit. Evaluate early negative Pcat with the existing relationship semantic audit on an empty set, without attempting forced enumeration when prerequisites are absent. Positive projections match fresh audited source/actor/category/timing/reference and origin; city retains independently checked second-play origin, which can differ from the scan anchor.

This consumes proofs freshly produced under the same invocation's wrapped enumerate, not arbitrary saved caller evidence. Bind current envelope/occurrence hashes and candidate count to classification. It is conditional current-public-source collection, not proof that all historical opportunities or hidden/unsupported sources are absent, nor proof of allowed information use/operand authenticity. No new policy or runtime handler. Initial3tests/5assertion failures RED; intermediate GREEN attempt exposed fixture callback None return after assertions passed, corrected test return only. Related41PASS, then origin-projection mutation1RED→GREEN/related43PASS. Add city earlier-anchor and projection-corruption cases, freeze Python, related/connected verification, one independent review and remote save. All readiness/admission fields remain false/null; production generation/lock/400 games remain unperformed.

Native collection final: related45PASS6.485s; fixed-source connected19PASS132.046s; one independent review C0/I0/Minor0; design errors=[],476 unchanged. Ruling: fresh in-invocation predicate binding is not arbitrary saved-proof authentication or all-source/all-phase completeness. No production input generation, lock or400-game execution.

### Typed turn-end effect expiration (f696bbe continuation)

Fresh remotef696bbed2102dc2b551798ee1ab48623861ba16e/tree d2b81c35f2e5aa02821719d3afe4cb8489b2ddbc; PR259 Draft/open/unmerged and clean. Existing payment/stat/conditional handlers already expire typed current-turn effects; do not reimplement them. Connect a source64-bound transition audit through existing coverage's every-event walk. At explicit expiration require the actual closed turn-end boundary, all typed rows validated by existing descriptors, exact unique receipt IDs, removal of every typed family and no collateral envelope change except sequence. No typed effects may cross turn/round/terminal boundary. Empty/unrelated observations do not certify expiration. Other creation/consumption and legacy reservations remain explicitly unproved; no full lifetime or opportunity promotion.

Four missing-audit tests RED→GREEN on actual existing expiration at growth100; real coverage-entry assertion1RED before connection. Preserve474 bounded-zero semantics, deferred/current instances, old sources and all handlers. Next edge boundaries/source mutations, fixed-source related/connected verification and one independent review. No experimental seed/input/game. Inline TDD continues using existing executing-plans/test-driven-development workflow.

Expiry review ledger: C0/I1/Minor0. I1 retained chain_links under empty status reproduced through actual payments.expire RED; require exact empty links GREEN, final related56PASS4.344s. Earlier55/integration19PASS136.926s precede fix. npm incomplete environment failure retained separately, final npm406PASS. No second review. Narrow supplied expiry proof does not certify creation/consumption, old reservations or independent all-rule opportunities. Final frozen-source integration recorded separately.

Final post-fix connected19PASS134.499s with Python fixed; final design errors=[];476 numbered sources unchanged. Review I1 resolved, no second review, no production input or game.

### Next-transform payment consumption (dc4154e continuation)

Expiry saved dc4154e4ea0cc69717d6b24402a069e45e25de31/treeafa97741775f43f53882a0c3d505030a2072a3e2; fresh remote errors=[], local clean. Continue after save with source91 next-transform consumption through existing batch.transition, no new handlers/choices. At supplied main_movement require a normal closed entry, current actor and actual hand-to-main source, known birth/time_skip/transform variant and sequence. Existing typed descriptors validate rows; transform consumes every current actor's matching modifier and preserves other-controller rows exactly. Receipt IDs must agree, including when existing actual payment floors to0. Birth/time_skip retain all pending next-transform modifiers. Nonmovement events cannot claim payment consumption. Cost arithmetic/creation/other effect families and legacy reservation closure remain unproved; do not promote to whole legal/information proof.

Three missing-audit RED→GREEN through actual movement; real coverage export1RED→GREEN. Additional wrong source/actor/variant/boundary and retained-value mutations; full20turn fixture checks all actual event audit exports. Freeze Python before related/connected verification and one independent review. No production input, seed, lock or400 games. Existing expiry and all prior boundaries preserved.

Payment consumption final: related58PASS8.092s; fixed-source integration19PASS133.828s; independent review C0/I0/Minor0; design errors=[],476 unchanged. Initial integration19 had one test-only false assumption that the existing20turn fixture contains movement; its actual event inventory contains none. Corrected assertion checks applicability for each actual event; positive consumption remains tested via actual batch.transition. Final rerun passed. No second review, no production input or games. Next source81 next-main-win consumption must distinguish first win consumption from exact-difference2 reward, preserving other targets/controllers and draw/aborted cases; reuse current challenge and effect handlers.

### aeeca7f continuation: next win, finish, target departure and residual register

Reuse existing compare/consume_win_rewards/finish/batch.transition. Source81 consumes all matching winner/main rows independently of difference2 reward; source65 finish retains all except battle stats; source07 normal main departure removes old target stats/conditional rows. Bound every event through coverage. Missing audits RED3 + real coverage export RED1 + target-expiry RED1. One review C0/I1/Minor1: I1 collateral comparison mutations RED5→exact envelope GREEN, final related63PASS7.999s. Minor time_skip target-row/birth coverage deferred, P03 not fully closed. Fixed-source final integration logged separately. npm406PASS; design errors=[]; numbered476 unchanged. No old source pins altered or policy/input/game changes.

Ruling: narrow typed-transition evidence is not operand, source-origin, all-opportunity or admission proof. Review declined those out-of-scope judgments; retain required gates. Initial fixture mistakes were diagnosed and corrected only in tests, not counted as handler fixes. Whole remaining-work register is plans/2026-10-08-preflight-remaining-work.md with21 classified items and completion criteria;41-card static inventory is not closure. P05 newly reproduced aeeca7f's nonmovement-payment guard rejecting the existing goat relationship discount. Continue its TDD closure after this bundle save, then generation/old reservations and other required gates. Preflight remains false.

Final frozen-source connected19PASS146.339s after review correction; npm406PASS, design errors=[], numbered476 unchanged. No production input/game.

### typed効果生成と同じpartnerの交際軽減消費

f7dc4d1の保存一致確認後、既存10sourceのtyped生成行/receipt/保持/不生成条件を全event coverageへ接続。P-cliff_goatの実交際軽減を旧payment監査が誤拒否する欠落もsource74・実0→1〜3→結婚へ接続。未知receiptは拒否継続。handler/選択再実装なし。review C0/I1/Minor0、既存の成長100到達拒否を監査も保持する修正をRED→GREEN。最終関連49PASS4.985s、最終固定Python結合はverification/creation-relationship-final-integration.log。npm406PASS・design errors=[]・476不変。詳細creation-relationship-review.md。

次はP03再登場#1→#2の実main移動を前監査が誤拒否する欠落（実Connection.finishで再現済み）、P05対象外eventのtyped保存則、P06旧予約等へ。全残件は2026-10-08-preflight-remaining-work.md。許可情報実使用/operand/全機会/認証lockは未証明、preflight-ready=false、seed生成/本番固定/400戦0、全体結論null。

Final frozen-source integration19PASS146.406s after review fix; no production seed, lock or matches.

### 再登場個体の接続とtyped寿命保存則

0683401からP03/P05を継続。実Connection.finishでmain再登場#1→#2を前監査が誤拒否するREDを確認し、手札の前個体・同一物理ID・隣接世代・exact receipt・metadata追加・旧個体の所在消去・main到達を結合した。歴史全体の起点認証は未証明のまま。time_skipの旧対象行消去/他対象保持とbirthの保持も実処理で確認し、前bundleのMinor枝不足を閉じた。

生成/消費/離脱/終了以外での既存typed行の改変・消去をRED再現し、全eventのfamily別保存則を追加。例外familyは既存の消費・失効・挑戦監査でexact結果を検査する。効果全体/全機会の証明へ拡張しない。

独立review C0/I0/Minor0。最終関連41PASS7.678s、固定Python結合19PASS144.820s、npm406PASS、design errors=[]、保護476件不変。ログreentry-conservation-*.log、レビューreentry-conservation-review.md。preflight-ready=false、seed生成/本番固定/400戦0、全体結論null。残件正本は2026-10-08-preflight-remaining-work.md。

### 挑戦の公開数値根拠・最低0・全handler/gate監査

a33d7a6から継続。次勝利の比較値をreceiptから信用せず、正本のmain10種印刷値・typed補正・deepsea・chameleonから独立照合する監査を実compare/coverageへ接続。自己整合した両側+7の偽値をRED→拒否。供給状態上の算術だけを証明し、過去生成/初期状態/全判断operandは未証明のまま。

独立review C0/I1/Minor0。正本02「最低0」に対して既存statsが負値を返し、差2報酬まで誤る漏れをRED再現して修正。歴史nativeの直接変更はsource anchorで関連2/結合3ERRORになったため撤回し、旧file/hash/manifestは不変。現行challenge operation scopeのadapterで全補正後の下限だけ適用する。再レビューなし。

最終関連59PASS16.311s、固定Python結合19PASS141.784s（challenge-operands-final-scoped-*）。npm406PASSは同bundle内の下限scope修正前、npm対象コードは以後変更なし。design errors=[]、保護476不変。全proxy回帰完了ではない。初回fixture期待値誤認と設計検査コマンド誤りを含む失敗ログ保持。詳細challenge-operands-review.md。

残課題正本はplans/2026-10-08-preflight-remaining-work.md。21管理項目に分類/完了条件/増減理由を記録。別紙2026-10-08-preflight-handler-and-gate-audit.mdに107全41種類の実handlerと未接続証拠、validator/入力認証の不足を対応。I-poop1置換入口の明示拒否は全到達不能証明またはhandler接続が必要。P06旧予約、P07〜P12全意味/機会/許可情報/他operand、P13〜P17承認信頼元/由来/順序/lock/合成gateは未完。preflight-ready=false、seed生成/本番固定/400戦0、全体結論null、policy promotion=false、独立balance標本0。

### 通常main_movementの費用・実時間差分

ec3c5de保存・fresh一致後も継続し、正本02/06の価格を既存main_movementへ接続。birth段階費用・time_skip同種後段階差・transform別種段階費用、全該当軽減後0下限、event支払と両者の残り時を監査。7変異RED→GREEN。過去生成や一般payment全体は未証明。

独立review C0/I0/Minor2、関連46PASS7.960s・固定Python結合19PASS149.113s、design errors=[]、保護476不変。npmは直前bundle406PASSで今回再実行なし。Minor2（非行動側before.timeの厳格型/範囲、正額が残る割引と不足時専用test）は台帳P11へ明記。詳細movement-payment-review.md。

横断reviewでP22を発見: M-antlion-01旧birthはplay_main_birthで今回監査外、transformは候補あり/旧executor拒否。既存未接続であり今回回帰ではない。正本02/55と既存handlerの接続が次工程。残課題台帳は22管理項目、理由/完了条件を追記。preflight-ready=false、生成/固定/400戦0、全体結論null。

### M-antlion-01旧/新main入口の接続（最新）

cfba45eのfresh保存一致後も継続し、P22をTDD接続。source55の既存cost_modifier/set_item_payment/set_discountを現行main_routes.scopeだけでbatchへ登録し、既存birth/transform/outcome/applyを再利用。旧native/manifest/hashは不変。旧play_main_birth固有eventもM01/birthに限定して価格・個体監査へ接続した。

前reviewのMinor2（相手before.timeのbool/負値、正の割引支払8→6と不足時test）をRED→GREEN解消。今回review C0/I0/Minor0、関連50PASS8.787s・固定Python結合19PASS150.179s、design errors=[]、保護476不変。npmは挑戦数値bundleの406PASS以降再実行なし。全proxy回帰完了ではない。詳細main-routes-review.md、失敗/成功ログ保持。

P22の具体的未接続は解消。22項目の台帳2026-10-08-preflight-remaining-work.mdと全41種対応表2026-10-08-preflight-handler-and-gate-audit.mdを更新。残る全handler意味/全機会/許可情報実使用/他operand/外部承認の信頼元と認証/生成由来・結果前順序/lock・実行gate合成は未完。preflight-ready=false、seed生成/本番入力固定/400戦0、全体結論null。準備完了と本番開始の最終確認はまだ行わない。

### C-bat/M06回収解決の全差分監査

75483e9からP06の全source本文/dispatchを読み、P07のC-bat対応表が「quick適用→draw」と誤記されていると判明。本文/実装は「相手手番で自分がquickをプレイ→準備札を手札へ」で一致していた。表のみ訂正。既存2回収handlerの正本に基づく全envelope差分を全event coverageへ接続した。対象不適正は不回収、発動後source離脱を許容、M06支払は返還せず、bat装備回収時のpublic/attachment消去と外側連鎖/使用記録を保持。自己整合hashを付けた余計なdrawも拒否する。

独立review C0/I0/Minor1。Minorは外側非空stackの専用回帰未追加（独立probeは両sourcePASS）。P07の未完小項目として保持。関連30PASS2.634s、npm406PASS、design errors=[]、476不変。固定Python結合と試行ログはverification/return-effects-*。供給済み解決意味のみの証明で、activation/choice/history/全dispatch/全機会のP07/P09やP06を完了扱いしない。

P06調査: 41本文中の期限付き/次回効果はtyped10sourceとI-poop1の条件付き置換に分けられる。現在の可視sourceは敵mainを除去する本文を持たず、G-archery-3dは敵装備のみ。ただし現在表にない生成/複製がないこと、107の物理集合/再登場と全遷移の保存、既存dispatchの意味まで結合する前にはI-poop1非到達/旧reservations閉包を認定しない。課題数は22管理項目のまま。今回の表訂正とP07小項目追加理由は、全source本文と実resolverを突き合わせたため。

preflight-ready=false、seed生成/本番固定/400戦0。旧116除外、policy promotion=false、独立balance標本0、全体結論null。次は107 source閉包と予約/置換条件の実証へ続ける。

Final frozen-source integration22PASS162.362s (previous19 scope plus runtime_entry3). Related30PASS2.634s; npm406PASS; design errors=[]; numbered476 unchanged. Independent C0/I0/Minor1 deferred as above. No production seed/input/game.

### 回収監査と開始/終了boundary adapterの結合修正

128aa1bから実dispatchを追跡し、9e59c06で追加した回収監査が、既存boundary_response.normalizeによる最終link後の反応再開を誤拒否する欠落を発見。新監査の結合不足であり、古いhandlerの不具合として数えない。C-bat/M06×start/endの実adapter4ケースをRED再現し、供給processing_boundaryの厳格形/turn owner/非未来origin/空stackと、反応再開後の全envelope差分を監査へ追加した。実adapter・driver・historical source/hashは変更しない。境界の実起点認証は既存ledger側に残し、event名/metadataだけで認証しない。

独立review C0/I0/Minor1。Minorは不正boundary型/外側stackの専用永続回帰不足（独立read-only probeでは拒否確認済み）。先の外側stack回帰未追加と合わせP07へ保留。関連32PASS2.143s、最終固定Python結合はverification/return-boundary-integration.log。source41本文の論証が全実行閉包を証明した扱いにはしない。

管理項目は22のまま。この追加修正の理由は監査を実開始/終了adapterまで辿って接続差を見つけたため。preflight-ready=false、生成/固定/400戦0、全体結論null。次の未完はP06の本文論証を実物理集合/全handler意味へ結合し、P07全dispatch・P08/P09全機会・P10〜P17へ進めること。

Final frozen-source integration22PASS167.431s; related32PASS2.143s; design errors=[]; numbered476 unchanged. Latest npm406 at9e59c06, not re-run for Python-only boundary fix. No production seed/input/game.

### 5種の1draw解決意味の接続

ac5a24fからP07を継続。M02/M05/M08/P-desert_scorpion/I-bowtieの既存resolverを再実装せず、固定start catalogの本文と、供給linkに対する1draw/空山札/全状態差分を全event coverageへ結合した。支払済みcost・使用記録・予約・他者/他札を保持し、誤ったtop・枚数・返金・外側連鎖消去を拒否。開始/終了/挑戦の既存adapter差分も監査する。発動条件/起点認証/全機会/P06閉包は未証明。

独立review C0/I0/Minor1。Minorはchallenge分岐とP-scorpionのmainなし拒否の専用永続test不足（独立probeでは正常）。関連31PASS3.667s、設計errors=[]、保護476不変。固定Python結合はverification/draw-effects-integration.log。初回scope不足・public turn履歴不足のfixture失敗と、coverage接続前の不正draw受入れREDを保持。

新具体化: P-scorpionの解決時たまご抑止はtriggers.resolveに見当たらず、現監査はこの枝を明示拒否。06/93の既決定条件であり新裁定不要。実dispatchでの再現/必要接続または到達条件の結合をP07へ残す。また既存回収監査は挑戦normalize後のcontextを誤拒否する4条件付きprobeを再現。これは新監査の接続不足であり古いhandler不具合と数えない。次bundleで実挑戦状態によるTDD修正。管理項目22を維持、増加理由は全handler差分と外側adapterを突き合わせたため。

preflight-ready=false、seed生成/本番固定/400戦0、全体結論null。npm406は9e59c06時点。今回全proxy回帰完了ではない。

Final frozen Python integration: Ran 22 tests in 197.181s, PASS. Related31PASS3.667s. No production inputs/games.

### 回収監査の挑戦中context結合

afd4986から保存後も継続。回収C-bat/M06が最終linkを終えると既存challenge.normalize_resultは比較前ならchallenge_comparison、結果後ならchallenge_endへの反応を再開するが、新回収監査が通常行動へ戻ると仮定していた。2種×2statusの4REDを、既存adapterの全context差分を監査へ足してGREEN。実handler/比較/支払は不変。外側link維持/誤消去・不正戻り先・不正boundary型を永続回帰にした。draw側のchallengeとP-scorpion mainなし拒否も永続化し、前2bundleのMinorを解消した。

独立review C0/I0/Minor0。関連31PASS7.868s、固定Python結合はverification/return-challenge-integration.log。供給境界から実比較とresolver/adapterを実行するテストであり、最初からの実履歴/全到達性を証明しない。新監査の結合不足修正で、歴史handler不具合として数えない。

次工程調査: P-scorpionのmainを解決前に失った供給境界を実forcedへ通すと1drawしてしまう（scorpion-egg-dispatch-probe.log）。06/93の既決定抑止と不一致。現監査が拒否するため算入はされないが、供給境界の既存resolver未接続としてP07へ明示。全107到達不能の証明を先取りしない。管理項目22維持、preflight-ready=false、生成/固定/400戦0、結論null。

Final frozen Python integration: Ran 22 tests in 164.044s, PASS. Related31PASS7.868s; review C0/I0/Minor0. No production inputs/games.

### P-desert_scorpionの解決時たまご抑止

7130b02から実forcedの未接続をRED再現し、正本06/93の「正当に発動済みでも解決時たまごなら効果を適用しない」を現行operation scopeへ接続。該当source/時点だけ既存draw数を0にし、nativeの解決・連鎖pop・event生成を再利用する。stateの偽装/山札消去/発動取消し/使用回数復元なし。finallyでdescriptorとresolverを復元。通常1draw、main能力のsource離脱後draw、空外側/残存外側、終了反応再開を保持。旧file/hash/manifest不変。

独立review C0/I0/Minor1。Minorの負例テストが再開後stateと再開前eventを組んでいたため、同じstate/eventの正常受理を先に確認してから不正drawを加える形へ修正。再レビューなし。最終関連30PASS4.479s。レビュー修正前の結合試験はCtrl-C/exit130で中断し未完了ログ保存、Python停止を確認後に修正した。最終固定Python結合はpartner-draw-final-integration.logのみ。

試験コマンドのeffect_applicationという存在しないmodule指定ERRORも別ログに保持。途中境界だけをend.verify_new_eventsへ渡す追加probeは全seq0起点のsnapshotがなく拒否された。実forcedと条件付き全差分の確認を、全履歴provenance認証へ読み替えない。

P07のこの具体的resolver未接続は解消。107内での到達性/全機会/他partner handler意味/起点認証/P06閉包は別。課題数22維持、preflight-ready=false、seed生成/本番固定/400戦0、結論null。次は残る捨て札回収・山札操作handlerの意味結合を、既存処理/選択境界を再利用して進める。

Final frozen Python integration: Ran 22 tests in 157.743s, PASS. Related30PASS4.479s; review C0/I0/Minor1 corrected inline; design errors=[]; numbered476 unchanged. No production inputs/games.

### C-cat_friend/M04固定対象移動と監査境界の共通化

07edb58からP07を継続。C-cat_friendの自捨てなかま（同名以外）→hand、M04の印刷quick→deck topを正本に基づく全差分へ結合。対象不在は不移動、先払い本人/装備離脱・人物枠/使用記録・他札・予約を維持する。開始/終了/挑戦のcontext監査をreturn/drawからresolution_delta.finishへ抽出し、この移動監査も再利用。実executor/既存scope/選択policyを再実装しない。

TDD3FAIL→初回1FAIL/1ERROR（coverage未接続と、fixtureがCcatのpaid receipt付きlinkを別IDで外側に複製して正しく拒否された）→正しい独立board外側linkで19focusedPASS5.288s。関連38PASS6.004s。独立review C0/I0/Minor0。固定Python結合はzone-effects-integration.log。供給済みの効果差分のみ、全初期状態/発動/支払起点・印刷tableの認証・全機会は別gate。

P07のこの2handlerの解決差分を接続したが、activation/source/dispatch全体は未完。管理項目22維持、preflight-ready=false、生成/固定/400戦0・全体結論null。次はtyped生成10sourceの行以外の全状態差分とreceipt/解決選択の結合を、既存生成監査を再利用して進める。

Final frozen Python integration: Ran 22 tests in 160.145s, PASS. Related38PASS6.004s; review C0/I0/Minor0; design errors=[]. No production inputs/games.

### typed生成10sourceの解決全差分

4cdb1afからP07を継続。既存effect_creationの独立導出が成功した3family行のみを許可し、quick使用札の捨て移動と共通resolution_deltaを結合して全stateを比較する。正しいtyped行があっても追加draw・返金・使用札返還・予約/metadata/使用記録変更を拒否。M03は供給選択receiptのactor/choice_kind/link/parameterを実補正へ結合する。選択の外部認証ではない。無効対象は既存474の非適用evidenceを厳密照合し、source名の偽装も拒否。native/歴史hash/manifest変更なし。

TDD5FAIL→初回1FAIL（coverage未接続）→6focusedPASS1.677s、最終関連37PASS4.209s。全10sourceの外側link維持も永続回帰。独立review1回C0/I0/Minor0（reviewer6PASS1.674s）。最終固定Python結合22PASS166.032s、design errors=[]、番号付き保護476件不変。失敗/途中ログ保持。最新全proxy回帰/最新npm再実行とは扱わない。

供給境界からの解決差分の監査であり、発動/支払/選択認証・生成由来・初期状態からの全履歴・全source/phase/機会・P06予約閉包は未証明。管理項目22維持、preflight-ready=false、seed生成/本番固定/400戦0、全体結論null。次は残る公開/即時growth handlerの本文と全差分を、既存処理と監査境界を再利用して結合する。

### C-chicken公開と条件付き回収の全差分

1c6a5ecからP07を継続。72の山札上公開→なかまのみhandを独立導出し、非なかま/空山札の不移動、正確な公開receipt、物理source、支払0、全envelope保持をcoverageの全eventへ接続。既存start resolver/共通連鎖差分を再利用し、native変更なし。外側link/開始反応再開を維持、余計なdraw/返金/予約/metadata/使用記録変更を拒否。

TDD3FAIL→初回1FAIL（coverage未接続）→関連19PASS3.384s。独立review1回C0/I0/Minor0（reviewer7PASS0.675s、実StartAdapterのC-chicken/I-bowtie発動と逆順解決の追加probeも受理）。失敗/途中結果ログを保持。design errors=[]。

供給境界の解決意味のみ。印刷type tableの認証、発動/開始起点、全到達性・全機会・P06閉包は未完。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null。次は既存474のgrowth contractを再利用し、G-area-claim/E-boss/W-countrysideのoperand・全差分を正本へ結合する。じんとり発動7枚以上の裁定は変更せず、解決時6枚で0とは分離する。

Final frozen Python integration: Ran 22 tests in 167.085s, PASS. Full proxy regression/latest npm not claimed.

### 3種の即時成長operandと全差分

0e37c50からP07を継続。G-area-claimは実board枚数（準備1枚ずつ、発動領域を除外）から6枚以下0/7〜8枚10/9枚15を導出、E-bossは両者各1drawと5、W-countrysideは5。既存474 growth/classifyと共通連鎖差分を再利用し、receipt・厳密な適用evidence・全stateを照合する。成長100で実変化0/他の有効部なしは非適用、E-bossで実drawがあれば適用。native/裁定/歴史hash変更なし。じんとりの発動7枚以上条件と解決時6→0を混同しない。

TDD5FAIL→初回1FAIL/1ERROR（coverage未接続、供給W離脱rootにactivation receiptがなく既存検査が拒否）→関連23PASS3.732s。W離脱は拒否を維持し、離脱後の実証へ読み替えない。独立review1回C0/I0/Minor0（reviewer14PASS2.109s）。design errors=[]、保護476件不変。途中ログを保持。

次工程のread-only actual forced probeでP-cat_ceoも解決時たまごなのに手札下/1draw/選択1回を実行すると判明（cat-egg-dispatch-probe.log）。06/93の既決定抑止が既存native循環handlerへ未接続。P07小項目として追加する理由は、全partner handlerの意味を本文と突き合わせたため。既存465境界はpartner_suppressed_while_eggを既に定義しており、これを再実装せず既存partner scopeへ接続する。107内での全到達性は未証明。

管理項目22維持、preflight-ready=false、seed生成/本番入力固定/400戦0、全体結論null。発動/起点/履歴認証、P06/全機会・各gateは別。最新全proxy回帰/最新npm再実行とは扱わない。

Final frozen Python integration: Ran 22 tests in 160.014s, PASS.

### P-cat_ceo解決時たまご抑止の接続

88e2455からP07具体未接続を修正。06/93の既決定に従い、既存partner_draw.scope内でP-cat_ceoのcycle所属を一時的に外し、native zero-draw分岐へ渡す。解決/連鎖pop/receiptを既存resolverで保持し、手札下・draw・選択は0。state偽装/発動取消し/使用復元なし。descriptor両者を例外時もfinallyで復元。通常partnerの指定選択は維持し、既存policy bridgeでたまご0callback/通常1callbackを確認。

TDD4FAIL3ERROR→初回1FAIL（coverage未接続）→関連33PASS5.109s。独立review1回C0/I1/Minor0。Iは新監査がraw465 prepareへfull metadataを渡し、retired#1/active#2を重複札として誤拒否する点。1REDで再現後、新監査の責務をpin済06/93抑止と全envelope保存へ限定しraw465呼出を除いた。registry結合projection/choice認証は既存incarnation_policyを使い続ける。旧metadata保持・不正変更拒否も回帰化。再レビューなし、最終関連37PASS5.473s、design errors=[]。

レビュー修正前の固定結合はCtrl-C/exit130で中断しPython停止を確認してから編集。中断ログを成功へ読み替えない。最終結合はpartner-cycle-final-integration.logのみ。

P07のこの具体的未接続は解消。通常catの全意味/全dispatch、107での到達性、全機会/旧reservations閉包、入力認証は別。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null。次はI-c_coin2/G-hit-blowの公開札種・分岐・実移動・成長・適用evidenceを正本から独立照合する。歴史native/hash/manifest不変。

Final frozen Python integration: Ran 22 tests in 168.520s, PASS. Full proxy regression/latest npm not claimed.

### I-c_coin2/G-hit-blowの公開・分岐・全差分

dd0ec87からP07を継続。正本77/87と既存catalog/type tableを使い、実deck topの公開種、宣言との一致/不一致、山札下/hand移動、実draw、要求5と474上限、公開自体の適用を独立導出し、receipt/evidence/全envelopeと結合。空山札はどちらの分岐もなし、1枚不一致は下へ置いた同札を引く。成長100でも実公開がある場合の適用を維持。既存executorを再実行して証明する監査ではなく、native変更なし。

TDD5FAIL→初回1FAIL/1ERROR（coverage未接続、fixtureのM06が別の効果適用後誘発を成立させ既存guardが拒否）→mainをM-beetle01へ替えて対象効果を分離、関連29PASS3.524s。独立review1回C0/I0/Minor0（reviewer5PASS1.785s、retired metadata保持/改変拒否probe）。7印刷種×全宣言、empty/singleton/cap/outer/start/end/challengeを確認。design errors=[]、途中ログ保存。

印刷type tableの認証、発動時宣言/初期履歴の真正性、全到達性/全機会、P06/gatesは別。管理項目22維持、preflight-ready=false、seed生成/本番入力固定/400戦0、全体結論null。次はE-first-dateの現在partner・段階0・対象#1/#2を、既存再登場の認証範囲を保って効果全差分へ結合する。

Final frozen Python integration: Ran 22 tests in 164.680s, PASS. Full proxy regression/latest npm not claimed.

### E-first-dateの対象世代/段階と解決全差分

cd22246からP07を継続。正本91の現在partner・厳格な交際段階0と、既存active_cardsの世代整合から対象を照合し、1draw/要求成長5/474実変化を独立導出。現在#2指定は成立、旧#1指定は#2へ移行せず不成立。交際1〜3/married・対象離脱も不成立。たまごだけではこのできごと自体を抑止しない。receipt/適用evidence/旧metadataを含む全stateと連鎖差分を比較し、交際段階の変更や追加drawを拒否。native・歴史pin不変。

TDD4FAIL→初回1FAIL（coverage未接続）→関連25PASS3.858s。独立review1回C0/I0/Minor0（reviewer4PASS1.094s）。空山札/成長100/outer/start/end/challengeも確認。design errors=[]、保護476件不変。世代の発生由来・発動/初期入力の認証をsupplied mappingの整合から主張しない。

次工程調査: 107内の装備はI-bond1/I-bowtie/I-sleepboost1の印刷時2であり、G-asteroids-classicが要求する印刷時3以上の自装備はない。G-archery-3dは時2以下装備を対象にできる。旧単体テストのtableを3へ変更したprobeは仮想契約試験であり107実到達証拠ではない。P06/P07/P08の条件付き閉包へ記録するが、この静的一覧だけで非到達/算入を認定しない。source集合固定・全物理保存・handler意味/全機会/入力認証との結合が必要。

管理項目22維持、preflight-ready=false、seed生成/本番入力固定/400戦0、全体結論null。次はG-archeryの実装備除去全差分と、G-asteroidsの107条件付き非到達の根拠を既存入口へ結合する。

Final frozen Python integration: Ran 22 tests in 163.351s, PASS. Full proxy regression/latest npm not claimed.

### 装備対象operandの独立化とG-archery全差分

7e62933からP07/P11を継続。公開準備・controller・付属関係・印刷attach時から79の敵時2以下/83の自時3以上を独立導出する共用targetsを追加。通常/response監査をnative equipment_targetsからこの共用監査helperへ接続。実支払0/2/9でも印刷2を使い、伏せ札の種類は読まない。不明公開状態/関係欠損を空対象へせず拒否。worldは発動条件だけに残す。

G-archeryは適正な敵装備の捨て移動・public/attachment消去・使用札捨てと全stateを照合。不適正対象は既存474の非適用receipt/evidenceと不移動を照合。解決時world不在でも対象再判定を進める。native/印刷table/歴史pin変更なし。

TDD5FAIL→初回1FAIL（coverage未接続）。native対象列挙をstubした1ERRORで旧監査との結合を再現→独立helper接続。関連27PASS13.494s。独立review1回C0/I0/Minor0（reviewer13PASS9.723s）。design errors=[]。途中ログを保持。

G-asteroidsの現在107装備対象なしはこの述語からも導出するが、positive解決・全到達不能・入力/印刷table真正性・全機会の証明ではない。管理項目22維持、preflight-ready=false、seed生成/本番入力固定/400戦0、全体結論null。次は指定465効果を再実装せず、既存局所適用/再登場registryとreceipt・全envelopeの結合を進める。

Final frozen Python integration: Ran 22 tests in 156.436s, PASS. Full proxy regression/latest npm not claimed.

### 指定6効果の局所適用と全解決差分

e25fdbcからP07/P09を継続。既存465のprepare/apply_choice、既存life.project_game/restore_gameを使い、M-beetle-01/P-cat_ceo/I-sleepboost1/M-beetle-02/W-city/E-final-timeの選択有無・選択値・prefix/suffix操作からreceiptを導出し、旧metadata/全runtime/連鎖/境界を含むafterへ結合する。既存policy_journalのlife.observe直前に監査を接続。465の規則やpolicyは再実装せず、選択真正性/registry由来/全機会/算入を昇格しない。

新発見P07: E-final-timeの旧metadata保持fixtureは、歴史406.verify_transition内のsnapshot instance検査でmissing旧#1として拒否される。現bundleでは拒否を維持。既存incarnation_runtime.scopeのextended-step projectionはこの直接呼出しを置換していない。全backend/履歴結合での再現と現行scopeでの適合が次の検討対象。作業増加理由は全state監査試験による旧validator直結の発見であり、新ルール追加ではない。静的登録や他5種の成功でこの枝を完了にしない。

管理項目22維持、preflight-ready=false、生成/本番入力固定/400戦未実施、全体結論null。TDD3FAIL→初回1FAIL/1ERROR（監査未接続/上記406拒否）→関連17PASS121.681s、独立review1回C0/I0/Minor0（focused3PASS5.926s）。固定Python結合22PASS159.864s、design errors=[]、保護476件不変。途中結果を保存。最新npm/全proxy回帰完了は主張しない。

### E-final-timeの保持metadataと406保存則の接続

caaae54からP07の直前発見を継続。既存Connection.scopeでも旧#1 metadataのmissing拒否をRED再現。Connection内で406.verify_transitionの全state/chain/hash検査を保持し、その末尾snapshot物理保存則へ渡す写しだけ既存registryのactive projectionとする。元state/全metadata/receiptは変更せず、life.checkを前後へ適用し、snapshot hookと406 hookをfinally復元。歴史406/native/hash pinは不変。

無関係札#2/使用札#2/対象札#2を既存465選択・全効果監査に結合。改変metadata/重複位置/不正hashの拒否を保持。TDD2テスト中1ERROR→関連10PASS6.464s→source/target世代試験拡充後10PASS6.466s。起点registryはsuppliedであり世代生成の真正性は主張しない。Connection外の旧406拒否試験は保存し、scope必須を明示する。

残件: 406のouter board-link検査はC-chickenだけを許す既存制約があり、他board sourceの全連鎖閉包は未証明。今回のmetadata接続から全source/phase/機会を完了扱いしない。管理項目22維持、preflight-ready=false、seed/入力固定/400戦0、全体結論null。独立review1回C0/I0/Minor0。固定Python結合22PASS159.280s、design errors=[]、保護476件不変。旧npm406/全proxy回帰を最新完了へ読み替えない。

### G-animal-shogi回収/選択結果と全解決差分

7e680eeからP07を継続。正本83/catalogの現在自捨てなかまを再判定し、回収成功かつ山札ありだけ1choiceを要求。供給済みtop/bottomの選択値と使用札捨て・対象hand回収・deck順・全envelope/連鎖/境界を照合し、既存coverageへ接続する。native/既存選択policyは変更しない。旧116除外、指定mandatory対象の不拡張、全体結論nullを維持。

TDD3FAIL→初回3ERROR（fixtureに既存recovery.scope不足）→scope接続後8FAIL/1ERROR（canonical bytesをcandidate文字列に使用、coverage未接続）→修正し関連20PASS1.834s。empty/singleton/対象離脱/種類違い、top/bottom両枝、outer P-cat_ceo/start/end/challengeを検証。独立review1回C0/I0/Minor0（reviewer関連14PASS1.104s）。design errors=[]、途中ログ保存。

これは実効果の整合であり、印刷table/選択/発動起点の真正性・全機会・全到達性は未完。管理項目22維持、preflight-ready=false、生成/固定/400戦0。固定Python結合: Ran 22 tests in 167.420s、PASS。最新全proxy回帰/最新npm完了は主張しない。

### 実traceの全解決と個別意味監査の結合

65533e1からP07を継続。12個の既存full-delta監査にraw event hashを追加（envelope bindの3keyだけ除外し、before/afterは別hashで結合）。既存06 resolution_orderを再利用し、実traceの各top-link解決をbefore/after/eventの3hashで各局所監査に対応させる。missing/extra/failed/同family重複/misbound/receipt差替えを拒否。指定465は既存registry付きjournalの出力と合成し、connected_entryに必須接続。複数の正当な監査が同じ解決を覆うことは許す。

これはconnected entryが生成した局所監査出力の結合。standalone供給flagの真正性・全handler到達性/全機会・発動適法性・全体算入の証明ではない。実traceに未知/未監査解決があれば拒否し、静的登録を完了扱いしない。G-asteroids等の未到達枝は消さない。

TDD3FAIL→event hash欠落1FAIL→関連24PASS12.841s。独立review1回C0/I0/Minor0（focused3PASS2.486s、raw/bound正規化と抑止catの2監査併存probe）。design errors=[]。管理項目22維持、preflight-ready=false、生成/固定/400戦0、全体結論null。固定結合22+既存完走unit trace1=23PASS275.035s、保護476件不変。最新npm/全proxy回帰完了は主張しない。次は既存movement_payment/個体世代/typed消費の証拠を再利用し、通常main移動の全state保存則を結合する。
