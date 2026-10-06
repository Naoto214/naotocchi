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
