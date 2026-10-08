# 400戦preflight継続・2026-10-07引継ぎ

GitHub `Naoto214/naotocchi` / `design/card-pool-master-20260914` を正本にする。最初にfresh remote HEAD/treeとPR259 Draft/open/unmergedを確認し、remoteが進んでいれば最新を採用。対象はdocs/card-game/だけ。main・frontend・World/Character 3Dは変更しない。基盤を作り直さない。

まず data/proxy-population-effective-application/status.md の末尾、plans/2026-10-06-effective-application-to-preflight.md、verification/{hand-bundle,board-bundle,response-bundle,response-board}-* のreviewを読む。過去ログを会話へ展開し直さない。

## 最新実装

通常core/手札15種/能動盤上のpredicateと供給unit対応、response通常手札13種と能動盤上predicateを実入口へ接続済み。現在源・対象・cost・variant・時・履歴・回数・priority actorを照合。E-bossのmain離脱後の当該ターン敗北履歴を維持する修正も保存済み。効果・選択は既存処理を再利用。最後のbundleはpreparedをcapability照会前に未証明へ分離する補強を含む。

最後の検証：関連28PASS、統合24PASS（123.873s）、独立review C0/I0/Minor2対応後の最終関連29PASS（13.747s）。統合24はprepared分離順変更前、最終関連には実入口を含む。設計errors=[]、番号付きtop-level保護476件不変。87638396の1630全proxy/406npmは旧版のみ。局所一致・同じ実行器の再構成を完全合法性/情報利用/全機会の別実装証明へ昇格しない。

## 次の作業・未完了

preflight-ready=false。事象依存response/手札反応/予約、実際に使用する許可情報、比較operand根拠、全判断・自動処理機会を共通責務で接続。結果前remote lockと外部生成/実行承認gateも未完了。既存generation entry/package、edition、attempt runner、supervisorを再実装しない。非空approval_referenceは承認認証ではない。remote fresh照合gate案はまだ未実装。

既存正本から一意に進む実装はinline逐次TDD。安全な大区切りで検証、変更bundle末尾に独立レビュー1回、commit/push、fresh remote確認して次工程へ。小検査や保存だけを終了理由にしない。

## 保護・承認境界

- 既存107デッキ、独立初期順200組×先後鏡像2＝予定400行を維持。結果後に追加/削除/差替えしない。
- seed生成・本番入力固定・400戦開始は未実施/未承認。preflight-ready後に生成/固定を確認。完全manifest保存後も開始前に別途最終確認。
- 114/116/119、過去結果、保護正本を維持。旧116は除外。唯一候補/非fallback/再現一致だけで算入しない。除外/未証明が残れば全体結論null、適格部分は診断限定。
- 指定mandatory policyのみ完全合法集合から事前固定1/N。初期順seedとpolicy root分離、鏡像初期順共有/policy乱数分離。strategic_unprovenとpolicy_eligibleを区別。通常/response/指定外へ許容を広げない。
- 同時任意誘発は合法な次の発動＋残り見送りを逐次選択し再列挙。474B：実増加0かつ他の実効部分なしは適用なし、履歴は保持。じんとり発動時7枚以上は114/127確定、解決時6枚0と両立、再質問しない。
- 新方式414/A未採用、policy promotion=false、独立balance標本0。未知を0/同価値にしない。新価値点数・期待値・任意優先順位・有限先読み・現物同値化を追加しない。

このcheckpointはタスク完了ではない。テスト編集の誤挿入を修正・再検証したが、このタブの編集精度低下を認め、ユーザーの品質優先ルールに従い新タブ移行を提案した。稼働中テスト/対戦やバックグラウンド処理を残さず停止する。

## 2026-10-07 再開後の優先追補（上の旧checkpointより新しい）

手札反応bundleは7723df78/tree f17dca59でremote保存確認済み。バッティング現在条件・エアホッケー通常response再提示禁止を実入口へ接続。最終関連47+全20turn2PASS、npm406PASS。旧条件付きchallenge testのturn-start不足をbaseで再現して入力だけ補修。module冒頭説明Minor1保留。

この追補を含む保存版ではremote公開のlive exact-head prerequisiteも生成/attempt/supervisorの副作用前に実装済み。親Git設定継承をレビューで発見しRED→ceiling修正→最終関連21PASS。timeout/git失敗の個別test追加Minor1保留。外部承認/結果前順序/OS来歴は依然未認証であり、この変更をreadyやinput lockへ昇格しない。旧『remote gate未実装』はこのnarrow prerequisiteに関して更新する。完全gate結合は残る。

次はstatus.md末尾とverification/{reaction-predicates,remote-publication}-review.mdを読む。preflight-ready=false、seed/本番入力/400戦0。残作業・保護・生成/開始の別承認境界は維持。最新remoteをfresh取得してこのファイルの所在commitを正本にする。

### 逐次誘発監査の追補

c4cc165から、trigger_predicatesをcurrent474へ接続。latched4種＋start2種の現在意味条件と候補集合を監査。関連42・全20turn含む結合19・npm406PASS、review C0/I0/Minor0。詳細status末尾とverification/trigger-predicates-review.md。次はprepared公開効果経路の監査、他の残gateを継続。preflight-ready=false、生成/固定/400戦0。

### 伏せ準備監査の追補（さらに新しい）

0c54b38からprepared_predicatesを実response監査へ接続。15quickの正本/dispatch経路と全active linkを検査し、伏せ準備除外の欠落/重複/再提示を拒否。盤上効果/未知経路/公開装備は明示未証明。review C0/I2/Minor0をRED→GREEN修正（recovery override・監査内の伏せidentityアクセス禁止）。最終関連34PASS。最終統合結果はverification/prepared-predicates-final-integration.log、詳細同review.mdとstatus末尾。最新全proxy/npm実行ではない。preflight-ready=false、生成/固定/400戦0。次は公開装備/残る盤上効果・予約/機会の閉包と共通gate合成を続ける。

### 公開置換装備の追補

590d853からI-bond1の現在装着先/所有者・除外行を公開quick経路と結合。伏せ準備なしでも全linkを検査。関連22PASS、独立review C0/I0/Minor0。結合結果はverification/equipment-predicates-integration.log、reviewは同equipment-predicates-review.md。開始/終了装備・盤上/未知効果・置換機会履歴は未証明。次は残るarrival/end条件、予約/機会・実情報使用/operand・承認/lockの合成。preflight-ready=false、生成/固定/400戦0。

### native登場・終了誘発の追補（最新）

36c4b91から登場3種/終了4種の現在意味条件をExistingAdapterへ結合。最終関連37PASS、review C0/I1/Minor0のI1修正済み。解決中の全event観測は独立に空候補と分かるnativeのみに許し、非空発動は拒否する。初回結合19中2errorsと途中のprocess異常終了を成功扱いしない。最終結合はverification/native-predicates-final-integration.log、詳細は同native-predicates-review.mdとstatus末尾。次は残るnative/挑戦等のpredicate、予約・全機会・情報使用/operand・外部承認/lockの結合。preflight-ready=false、生成/固定/400戦0。最新remoteを正本にする。

### とかい・強制恋愛・挑戦誘発の追補（最新）

c8b869dからW-city/P-cat_ceo/M07/Panglerの現在条件auditを既存列挙入口へ接続。既存public_turnは相手手番集計とturn_end_completed中間状態を実装済み。これを未実装として再実装しないこと。初期テストのscope順序誤認で重複試作したcity moduleは撤回済み。既存候補器/handler/選択・旧source pinsは不変。新監査の中間状態拒否を実next_turnのRED→GREENで修正。review C0/I1/Minor0解消、最終関連46PASS。最終結合はverification/remaining-native-final-integration.log、詳細同review.mdとstatus末尾。前40/結合19や途中のsource fingerprint失敗を最終結果と混同しない。

次はsource/phaseごとの全判断・自動処理/予約と機会閉包を既存inventory/capture/coverageで結合し、実情報使用/operand・外部承認/lockの残gateへ。単なる候補一致・静的一覧を完全性へ昇格しない。preflight-ready=false、生成/固定/400戦0、全体結論null。最新remoteをfresh確認して正本にする。

### 供給済み機会の保存閉包結合（最新）

04992fdから既存opportunity_orderを補強。個別に正しい保存ledgerでも実行と発動/見送り/ineligible証拠が違えば拒否し、全手番交代/終了のarchive境界と期待発生行重複を検証。関連33・結合19（130.792s）・npm406PASS、review C0/I0/Minor0、設計errors=[]・476不変。verification/closure-binding-review.md参照。空observe差を許容する意味状態結合で、独立実行認証/全機会/予約証明ではない。次はcollect早期除外を含むsource/phaseと残gate。preflight-ready=false、生成/固定/400戦0・結論null。

### native現在sourceと早期不成立の追補（最新）

35a6899のfresh remote保存確認後、collectのPcat早期不成立を既存意味監査へ接続。現在公開source rosterの分類/明示未証明と正の機会投影をfresh predicate証拠へ結合。とかいの2枚目originと走査anchorの違いを維持。最終関連45PASS6.485s・結合19PASS132.046s、独立review C0/I0/Minor0、設計errors=[]・476不変。verification/native-collection-review.mdとstatus末尾が最新。前closureの関連33/結合19/npm406と今回の範囲を区別する。

この結合は保存proofの独立認証ではなく同一呼出しのfresh監査結果を対象とする。全機会/予約/実情報使用/operand/承認・時系列・lockは未証明。次は正本効果と実dispatchに由来する予約/自動処理の条件・機会の結合。preflight-ready=false、生成/固定/400戦0、全体結論null。最新remote HEAD/tree・PR259 Draft/open/unmergedをfresh確認して再開する。

### typed効果の終了時失効監査（最新）

f696bbeから既存payments/stat/conditionalの終了失効を正本64と全event coverageへ結合。閉じた境界・全ID・全消去・無関係状態保持、turn/round/terminalへの持越し禁止。既存handler不変。review C0/I1/Minor0の残chain_links漏れを実処理RED→GREEN修正。最終関連56PASS4.344s・結合19PASS134.499s。npm初回環境異常は未完了として分離し再実行406PASS、設計errors=[]・476不変。詳細effect-expiry-review.mdとstatus末尾。生成/消費・旧予約・全機会・実情報/operand・承認lockは未証明。次は実生成/消費routeと残gate。preflight-ready=false、生成/固定/400戦0、結論null。

### 次回変身の軽減消費監査（最新）

dc4154eから正本91の消費を既存batch.transition/全event coverageへ結合。最終関連58PASS8.092s・結合19PASS133.828s、独立review C0/I0/Minor0、設計errors=[]・476不変。初回結合の誤った「既存試走にmovementあり」assertionは実event inventoryを確認して適用判定一致へ修正、実変身の正例は専用testに保持。詳細payment-consumption-review.mdとstatus末尾。支払量/生成/全機会証明ではない。次は既存consume_win_rewardsの次勝利消費（差2の報酬成立とは別）・挑戦終了/対象離脱/生成routeと残gate。preflight-ready=false、生成/固定/400戦0、全体結論null。

### 次勝利・挑戦終了・通常main対象離脱と残課題台帳

aeeca7fから既存compare/finish/main移動へ監査を追加。review C0/I1/Minor1、I1比較後のrefund/宣言reset/残chainを実abort5変異RED→完全照合GREEN修正。最終関連63PASS、最終結合はverification/challenge-lifetime-final-integration.log、npm406PASS、設計errors=[]、476不変。Minorのtime_skip対象あり/birth枝テスト未完。残課題の正本はplans/2026-10-08-preflight-remaining-work.md。次はP05既存P-cliff_goat割引relationship消費をpayment監査が誤拒否する欠落（再現済み）、P04生成route・P06旧予約等へ。今回も全機会/operand/情報/認証/lockは未証明、preflight-ready=false、生成/固定/400戦0。

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

### 107本文の予約・人物除去条件付き閉包

9e59c06からsource41本文を全件照合した別紙plans/2026-10-08-preflight-source-closure.mdを追加。外部card/能力生成と敵main/なかま除去は本文上0。I-poop1/I-bond1の条件は固定107・本文準拠遷移の仮定下で非到達、期限付き10sourceはtyped payment2/stat7/conditional1。実handler全意味・物理集合/再登場・input起点・全機会の結合が残るため、P06/P08/P09を実行証明へ昇格しない。I-sleepboost1の旧表「支払2」は残り時>=2条件へ訂正（nativeも時支払なし）。独立review C0/I0/Minor1の上表/下表誤記を修正。code変更なし、管理項目22を維持、生成/固定/400戦0、preflight-ready=false。

### 回収監査と開始/終了boundary adapterの結合修正

128aa1bから実dispatchを追跡し、9e59c06で追加した回収監査が、既存boundary_response.normalizeによる最終link後の反応再開を誤拒否する欠落を発見。新監査の結合不足であり、古いhandlerの不具合として数えない。C-bat/M06×start/endの実adapter4ケースをRED再現し、供給processing_boundaryの厳格形/turn owner/非未来origin/空stackと、反応再開後の全envelope差分を監査へ追加した。実adapter・driver・historical source/hashは変更しない。境界の実起点認証は既存ledger側に残し、event名/metadataだけで認証しない。

独立review C0/I0/Minor1。Minorは不正boundary型/外側stackの専用永続回帰不足（独立read-only probeでは拒否確認済み）。先の外側stack回帰未追加と合わせP07へ保留。関連32PASS2.143s、最終固定Python結合はverification/return-boundary-integration.log。source41本文の論証が全実行閉包を証明した扱いにはしない。

管理項目は22のまま。この追加修正の理由は監査を実開始/終了adapterまで辿って接続差を見つけたため。preflight-ready=false、生成/固定/400戦0、全体結論null。次の未完はP06の本文論証を実物理集合/全handler意味へ結合し、P07全dispatch・P08/P09全機会・P10〜P17へ進めること。

Final frozen-source integration22PASS167.431s; related32PASS2.143s; design errors=[]; numbered476 unchanged. Latest npm406 at9e59c06, not re-run for Python-only boundary fix. No production seed/input/game.
