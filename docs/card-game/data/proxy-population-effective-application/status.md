# 承認B後の接続作業 — 継続中

Base473:7ce93b62。474はユーザー承認Bの追補正本。既存114/116/119、過去artifact、カード本文・数値は不変。新方式未採用。400戦準備全体は未完了。seed生成・入力固定・400戦開始なし。

共通三値適用証拠、native growth handlerのbounded結果、M06/M07適用参照、challenge逐次接続、manifest行から468のopening/sessionを再利用する現行backend入口を追加。旧発動linkの明示hand action形式と個体監査の整合も修正。関連179件PASS（199.716s）。専用RED/GREENと誤fixture修正途中のログも区別して保存。新しい独立レビューはまだ実施していない。473の全1498回帰やnpm406を今回変更後の結果として流用しない。

現行unit結合は既存115順序と以前からのtest-onlyゼロpolicy rootを使用する条件付き再構成。80step、100event、10回turn_end_completed、R6、stop=null。独立入力や新しいbalance対戦ではない。開幕のない途中rootのchallenge試験は、比較・challenge終了後、全体終了履歴欠落を正しく拒否する。これを対戦完走と呼ばない。

残工程：旧coin depth1/2および100 guard、他のgrowth処理の上下限／適用証拠、100到達維持の全履歴、終了6段階／勝利、全判断機会、入力真正性／lock／実行承認gate、最終検証・独立レビュー。保留していたB裁定は解消済みであり、ここでユーザー確認を挟まず続行する。

preflight-ready=false。保存後も続行。最終実行許可はまだ求めない。

## 後続接続（同じ作業を継続）

固定unit prefixを220step上限へ延長し、R10最終比較まで到達する結合assertを追加。これは固定115/test-only policyの再構成であり400戦入力ではない。関連22件（101.337s）PASS。ただしこの後のレビュー修正とchallenge reward追加は別の関連検証で扱う。ソース編集中に入口fingerprint拒否になった途中実行はPASSに数えない。

coinのdepth1/2制限を新top-link adapterで外し、外側の未解決linkを維持。hit-blow/first-dateは既存native pure handlerを再利用し、上限処理と公開／draw等の実操作を記録する。空山札の不適用と、増加0でも公開した場合の適用を分離。first-dateの現在再登場個体を既存native target checkへ私的viewで接続し、retired targetを書換えず実stateの不変メタデータを保持する。

終了historyで新eventを再構成し、実増加のprovenanceを登録する。レビュー後の直接照合テストは正規化終了先・改変event/stateを検査。明示native hand actionのsource_zone省略はM06タイミング捕捉にも接続。詳細レビューはverification/review.md。

未完了：W-countryside／その他全成長箇所の上限証拠、100時通常判断の既存114/116証拠、100維持の全historyと終了6段階、全機会の合成監査、入力真正性／lockと実行gate、全体最終検証。ready=falseを維持する。今回の安全保存後も続行し、実行承認はまだ求めない。

## 100・終了・合法性・閉鎖台帳bundle（後続保存）

前節の残件のうち、bounded challenge/W-countryside/結婚、typed失効、100維持履歴の6段階終了への条件付き接続、既存116の未知上位frontier、paid/recovery再照合を実装。population203件PASS（234.890s）。100到達完走の真正入力検証とは区別する。

91/87由来のfirst-date他段階／hit-blow空山札の合法性と、既存119未解決fallbackを接続。関連20件PASS（121.429s）。全turnの閉じた誘発台帳を保持し、pending/deferredを残した置換を拒否。closure関連7件PASS（6.351s）。02の出来事時たまごのpartner無効はlatching7件PASS（0.294s）。新規カード、カード本文、数値、114 table、旧adapter、過去artifactは変更しない。

新bundle独立レビューC0/I0/Minor1（テスト名の範囲、詳細threshold-review.md）。npm406件PASS。全proxy回帰は別途実行中であり、この保存時点では完了結果を主張しない。保存後も作業を継続する。

残件：正本由来の全機会義務と実台帳の合成監査、実state履歴による継続効果の適用履歴照合、判断/対戦/鏡像/400行の真正な適格性審査、OS生成来歴・remote事前lock・実行承認gate。preflight-ready=false。400戦用seed／入力／実行は0、新方式未採用。


## 公開適用・全遷移誘発照合bundle（継続保存）

実event/snapshotの公開state履歴を利用するなかま適用照合を接続。離脱後のC-chameleonを過去配置eventだけで残存扱いにしない。C-cat_friendの実回収は既存targetsと実hand/discard移動へ照合し、成功／不適用／未知を分離する。

開始・途中・終了の既存source producerを全実遷移へ再適用し、全手番の閉鎖台帳と残存台帳を照合。欠落／余分／複数手番への重複、終了stateへのarchive再束縛、全event展開を検査。これは対象producerの範囲だけであり、独立ルール実装や全判断種別網羅の証明ではない。initial proofは条件付き入力であり、入口真正性は別gate。

関連bundle29件PASS（186.874s）、独立レビューC0/I1/Minor1を逐次RED→GREENで修正。同一review cycleの修正確認で未解決0、6件独立PASS。最後の実R10／manifest入口込み10件PASS（145.551s）。設計検査は保存9c56でerrors=[]。新規moduleはPythonのみでnpmに変更なし、前保存bundleのnpm406を明示参照する。

全proxy回帰は、active checkoutの直列試行を途中中止し、保存9c56のdetached worktreeで410 runnerによる6別processへ切り替えて継続中。この保存時点では全回帰完了を主張しない。直列試行も全回帰PASSではない。今回の後続変更はその固定baselineには含まれず、上記専用／関連検証で区別する。

次は459/463の判断→対戦→鏡像→予定400行の真正審査と、生成来歴／remote事前lock／実行承認gate。preflight-ready=false、seed／本番入力固定／400戦実行0を維持し、保存後も続行する。

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

## 選択計算と入力準備の版・manifest接続

114全候補比較/116 safe-free certificate/119 response計算の純粋検算を追加。source再構成された実recordへ計算を束縛するが、operand意味論・完全合法性・選択根拠の認定とは別。reviewでsafe分岐に先行114 unique検査とpassの上位4項目一致を追加。許可根拠/116陰性gateは未証明を維持し、過去recordを補完しない。

459/463の実装版準備として、完全commit/tree・全保存CARD GAME blob・Python source集合/実装版を検証し、manifestのsource_versions/Python版とexact比較するread-only verifierを追加。Git replacementでは保存sourceを書き換えられない。新規artifact追加は既存source改変と分離する。remote公開・外部承認・OS採取・入力lock・全体適格性は未証明のまま。

既存469 Cursor transcriptから465形式の200群/400行・先後鏡像・奇偶実行順・owner root commitmentを組み立てる純粋builderを追加。採取・保存・実行APIは持たない。テストは旧115 seed/orderを200回繰り返すin-memory doubleと零root、合成registryであり、独立標本や本番入力ではない。

逐次RED→GREEN、最終関連24件PASS（43.321s）、直接実行2件PASS、設計errors=[]、保護正本476件不変。独立reviewのImportant2/Minor1を修正し未解決0。全proxy/npmは保存9c56の1546/406PASSを参照し、この差分の全回帰とはしない。

preflight-ready=false。通常/responseの完全合法性・情報制約・operand根拠、全機会/自動処理の合成、生成来歴/remote事前lock/実行承認は残る。seed採取・本番400行固定・400戦開始0、新方式未採用。保存後も準備を継続する。

## 通常行動の直接成長operand未証明を116へ接続

通常比較のnative generic outcomeが、直接成長の3mechanismにも初期growth=0を返す点を現在合法E-first-dateでRED確認。比較用outcomeだけを未証明guardへ置き、既存116 frontierへ委譲する。symmetric_draw_growth / board_count_growth / targeted_relationship_growthという既存分類を使い、カード現物や経路専用分岐にはしない。新しい比較値を作らず、効果実行はnativeを維持。G-area-claim/E-bossの条件付き実候補でも、未知候補がfrontierに残り、proved_scoresから分離されることを確認。

最終関連14件PASS（186.241s）、固定115/零rootの全20turn接続を含む。独立read-only review C/I/Minor各0。最初の結合commandはテストclass指定誤りによるloader errorであり、訂正後の14件を最終結果とする。保護正本476件不変、旧native・過去結果不変。現在の非fallbackを遡及して過去へ適用しない。

6190固定worktreeで全proxy回帰を実行中。6190のnpm406PASS、同版の全3437保存ファイルとPython集合のedition照合成功。この後続2tools差分は6190回帰に含まれない。preflight-ready=false、seed/本番入力固定/400戦実行0。残る合法集合・情報制約・全義務合成と入力/実行管理を継続する。

## 現在source inventoryと通常／response入口の照合

121/125の6source familyと114手札action/variantを現在stateから導き、候補選択と独立に照合。sourceと合法リストを同時に削除しても拒否する。responseは現在priority actorの手札・盤面・準備現物を、合法候補と不成立sidecarの合併へ照合し、除外理由を脱落させない。各通常／response stepの実source envelopeへ証拠を接続。

逐次RED→GREEN、最終関連20件PASS（229.034s）。旧115/零rootの全20turn再構成・指定外必須選択・admission結合を含む。独立read-only review C/I/Minor各0。通常盤面ability variant全展開、response全action variant、対象条件、除外理由の意味論、実情報利用、全ルール機会はこの検査で証明していない。合法性flag・policy適格性・balance算入へ昇格しない。

6190固定版の全proxy回帰は別途継続中で、この後続差分は含まれない。preflight-ready=false。seed／本番入力固定／400戦実行0、旧116除外・新方式未採用・過去正本を維持。保存後も残りの共通契約接続を続ける。

## 通常入口・選択・event/snapshot連鎖の束縛

通常とresponseの実入口からactor/round/phase/windowを検証し、inventory内の選択現物detail・wrapper・最初のevent選択をexact照合。全eventの前後game/continuation/envelope hash・全snapshot・最終envelopeを既存canonical binder/snapshotで検算する。全stepのordinary/mandatory判断を保存decision列へ順序を含めexact投影し、削除・追加・並べ替えを拒否。効果意味論や全合法集合・全ルール機会とは分離。

独立reviewでImportant2/Minor1を検出し、逐次RED→GREENで全件修正。native priority_unique最小schemaを保持、既存116 safe-free subchoiceを明示区別、119 response seedの全10座標を実entryへ束縛。初回25関連はpriority_unique誤拒否により未完走でFAIL、最終26件PASS（283.865s）で全20turn接続を再確認。review修正確認は未解決0。準備伏せ札の不成立sidecar欠落も拒否する条件付きunitを追加。

設計errors=[]、現行保護正本476件一致、473時点の475正本一致、docs/card-game外変更なし。6190固定全proxy回帰は別途進行中で、この差分の全回帰とはしない。npmは6190の406PASSを参照。新seed／本番入力固定／400戦開始0。preflight-ready=false。保存後も指定外／no-choice解決義務、全機会・合法性、入力来歴／事前lock／実行gateの接続へ継続する。

## 解決時選択義務の共通route照合

空のmandatory_decisionsだけを「追加選択なし」と扱わず、既存descriptor／source-pinned handler routeへ結合する。直接成長・支払／能力値／条件付き補正・固定対象移動・reveal・draw-only等は解決時の追加選択なしを明示し、余分なrecordを拒否。paid drawの動的DRAW_EFFECTS登録も既存handlerのまま再利用。旧116の3選択familyは既存auditを用い、指定465はactual-frame journalへ委譲（このlocal route単独ではverified=false/count=null）。未知routeは未証明で停止し、全ルール網羅とはしない。

専用RED→GREEN、関連18件PASS（156.134s、旧115/零root全20turnを含む）。その後、既存paid draw登録のテストのみ追加して専用8件PASS。独立read-only review C/I/Minor各0。初期fixture誤指定とM03 descriptor欠落の誤分類は検証中に検出・修正済み。最終設計errors=[]、保護正本476件不変。

6190固定版の全proxy回帰は1584件PASSで完了。開始・終了全ID一致、skip/重複なし、全6process成功、source不変。manifest／各worker JSON／各log／summaryの全14ファイルをregression-6190-evidence.json.gzへ保存。6190以降のnormal operand、source inventory、入口束縛、本bundleを含む全回帰とは呼ばない。後続差分は各bundle関連検証で区別。npmは同6190版406PASS。

preflight-ready=false、新seed／本番入力固定／400戦開始0。入力生成・実行の最終承認は未取得。通常／responseの全合法集合・情報制約・operand根拠、全ルール機会合成、入力来歴／remote事前lock／実行gateを残して準備を継続する。旧116除外、新方式未採用、予定400行の全体結論保留を維持。

## Source内の対象・支払候補展開の照合

121/132実entry展開に、現在91のfirst-date対象・既存paid drawのordered cost・既存equipment target・item cost optionsを接続し、inventory内に残った候補とは独立に期待列を導く。source自体を残したまま対象や支払案を1件落とす改変を拒否。支払不能時も候補不成立行を残す。通常入口へ証拠を束縛し、差異時は停止する。新カード価値・新しい順位・現物同値化は追加しない。

専用の入口未接続REDを保存後に実装。関連16件PASS（9.471s）、別途全20手番を含むpolicy journal5件PASS（146.256s）。割引テストの初期fixture集計は手札action以外も数えて失敗し、set_item対象へ訂正。独立read-only review C/I/Minor各0。設計errors=[]、保護正本476件不変。6190固定版1584全proxy/406npmと、この後続差分の関連検証を区別。

これは登録済み展開helperによる列一致であり、helper自体の意味論・disposition・実情報利用・完全合法性・全rule機会の独立証明ではない。preflight-ready=false。seed生成／本番入力固定／400戦実行0。通常/responseの残るsource義務合成と入力／実行管理を継続する。

## response候補展開と入力採取準備の接続

responseの既存hand/paid/trigger helperへ実entry/historyを渡し、対象・宣言・ordered costの候補全行をcanonical Counterで照合。helper外のsourceはunproved_sourcesへ明示し、不在・全合法性と扱わない。共有full current/runtimeをfinallyで復元。専用RED→GREEN、関連20件PASS（12.032s）、全20turn・判断束縛・解決選択18件PASS（157.870s）。独立review C/I/Minor各0。

459/463/469の将来OS採取入口とdurable journalを追加。要求永続化→read→返却永続化→既存Cursor消費、全拒否pairを保持し、途中fileの自動再開/上書き/引き直しを行わない。新directoryの親entryとjournal/file双方をfsyncする。固定200の既存builder・immutable edition前後照合へ接続。承認referenceはoperator申告であり認証tokenでない。入口は実際の外部承認取得後にのみ呼ぶ運用とし、CLI/default invocationなし。remote公開・OS由来の独立認証・入力lock・実行承認は自動成立しない。

独立review Important1（新directory親fsync欠落）を解消。修正前variantでRED、修正後の入力関連19件PASS（12.536s）。テストは旧115 bytes/零root/合成registryまたはentropy関数を返却前に遮断した一時file検証。実OS乱数採取・本番200群/400行固定・新対戦はいずれも0。完全400生成成功の実行検証は未実施であり、上記19件を本番生成の証拠とはしない。

preflight-ready=false。全合法性/許可情報/選択operand/全ルール機会の合成認定、生成来歴/remote事前lock/実行gate/全予定行driverは残る。6190版1584全proxy/406npmと後続専用・関連検証を区別。旧116除外・新方式未採用・保護正本・過去結果・予定集合を維持して準備を続行する。

## 固定予定集合・単独attempt・別process supervisor接続

全attemptを既存admission/source reconstructionへ結び、固定execution_order上の位置を導くread-only scheduleを追加。400行と200鏡像群、旧116除外、再試行前の記録を残す。出所未確認・未完走・順序違反・結果/版衝突で自動進行を保留。次行IDは実行許可ではない。

将来の単独attempt入口はimmutable local Git入力とsource/Python editionを検査し、startを永続化してから既存connected backendを呼ぶ。raw recordを保存後に既存admissionの独立再構成へ渡すため、後段異常でもrawを捨てない。supervisorは全予定集合を先に保存し、固定順で1行ずつfresh isolated Python processへ渡す。worker receipt・圧縮/展開record・bundle/match/完走状態を結合し、不完走/異常で後続を止め、未実施行を保持する。自動再開/再試行なし。外部承認、remote結果前lock、readinessは別のoperator前提であり、文字列やlocal一致で証明しない。実入口/本番supervisorの呼出しは最終確認前に禁止。

逐次RED→GREEN。最終関連33件PASS（61.226s）。supervisorはmock-childの異常・未完走試験に加え、旧115/零root3stepだけを実別interpreterの既存backend/replayへ渡した輸送結合を含む。後者のlocal lock/edition gateは両processでmockしており、本番入力認証成功の主張ではない。独立read-only review C/I/Minor各0（追加輸送テストはreview後）。

seed生成・本番入力固定・本番400戦開始0、preflight-ready=false。現在のmoduleは外部承認/remote lockを本人認証しない。残るsource由来の合法性・許可情報・比較operand・全ルール機会の合成を進め、最後に実際の生成/実行承認へ戻る。基盤接続だけで全体適格を成立させない。新方式未採用、旧116除外、過去正本/結果を維持。

## 自動処理全出力と生成保存packageの結合bundle（87638396から継続）

自動stepを、native forced outputの全event/snapshot/mandatory decision/final state/hash/sequence/完了結果に結合。ordinaryと共通の遷移照合を利用し、native envelopeがない旧形式は既存state.advanceからfull runtimeを含めて再構成する。解決・次手番の複数event・全20turn/R10完了を既存115/zero-root fixtureで検証。全ルール機会・dispatch/effect意味論・合法性・戦略的妥当性へは昇格しない。

独立review I1（runtime改変後の再hashを拒否できない）がREDで再現し修正。修正確認済、残指摘0。専用/ordinary9PASS。途中関連26件の1件は検証中のsource変更をfingerprint guardが拒否したため失敗として保持。その後、変更しない専用checkoutで関連27件PASS（175.334s）。通常の証拠と失敗ログを混同しない。

入力側はmanifest receiptと同じimmutable Git commitから、edition・469履歴registry・全material・sampling journalを読み、既存builderで全200/400行を再構成してexact比較する。worker/supervisorはpackage不一致を出力作成/子起動前に拒否しstartにbindingを保存する。OS来歴・remote公開・結果前固定・外部承認は依然別gateでfalse。path版journal validatorは保存bytes版と同じ検査本体を利用する。

package関連10PASS（79.089s）、実行入口関連7PASS（33.988s）、独立review C/I/Minor0。正例は過去115反復/zero roots/synthetic registry・edition mock、真正registryによる拒否を別検査。isolated子process検査もpackage/local Git/editionをmockしており本番認証の証拠ではない。

87638396固定版npm406PASSを保存。全proxy回帰は同じ固定版で進行中であり、今回差分を含む全回帰ではない。保護正本476件一致。preflight-ready=false、seed生成/実験入力固定/400戦実行0、新方式未採用。保存後も残る合法性・情報使用・全rule機会の合成と実行前認証手順を継続する。

## 現在ターンの公開履歴・相手ターン誘発の接続

89「とかい」は自分が**このターンに**出した2枚目を対象とし、自分ターン限定ではない。06も両者の1ターン制限を先後交代で更新する。旧nativeのactor==turn_player限定とactorの前回自分ターン起点は、この境界に不足していた。旧実装で4枚扱い（正しくは現ターン2枚）と相手ターン候補欠落をRED再現。

現行scopeだけに公開ターン境界を接続。自分/相手のどちらのプレイも現在ターン内で数え、board/prepared能力発動をカードプレイへ混ぜない。回数制限も現在ターン・現在source_instance_idに結合する。response windowのanchorと実際の2枚目originは区別し、途中のturn_end_completed→turn_start区間は明示、境界欠落は停止。候補以降は既存発動・効果・逐次群判断・指定look policyを再利用。点数・比較意味論・カード本文変更なし、旧116除外維持。

関連24PASS、相手ターンの既存発動/解決/指定policyまで含めた専用5PASS、最後の全20turnを含む関連25PASS（193.526s）。独立review C/I/Minor0。設計errors=[]、保護正本476件一致。履歴fixtureは条件付きであり、新しい独立対戦や全ルール機会の証明とはしない。

preflight-ready=false。入力生成/400戦入力固定/本番実行0。87638396固定全proxy回帰は継続中で、この後続変更とは区別。保存後も合法性/情報使用/全機会の残りを進める。

## 完走再生の証拠合成と全resolver共通の連鎖順序検査

対戦のcompleted_source_replay gateを固定未証明から、真正な完走再構成・全attempt認証・結果/版の非矛盾に基づく三値へ接続。未検証attemptは保留、真正な結果/版矛盾はcontradicted、過去未完走のgapと116除外は消さない。他の適格性gateや全体結論は変更しない。

06の逆順解決/途中割込み禁止を、全現行原子resolverの実stepへ共通接続。top linkとactor/source/event、外側linkの内容・順序、残った連鎖のresolving状態を照合。native handlerの出力結合と別に検査するが、効果意味論・合法性・全機会の証明にはしない。

逐次RED→GREEN、関連44件PASS（263.913s、既存115/零rootの全20turn、admission/schedule/attempt結合を含む）。独立read-only review C/I/Minor各0。保護正本476件不変。87638396固定版の全proxy回帰は引き続き実行中で、本差分を含まない。npmは87638396版406PASSを参照。preflight-ready=false、seed採取/本番入力固定/400戦開始0。保存後も残る機会・情報・合法性の接続へ継続する。

## 手札の事象条件付き任意誘発とresponse実state接続

06/63/83/84の既存境界に従い、相手の勝負中quick play直前に手札にあったG-air-hockey現物を逐次任意誘発群へ捕捉する。現在の支払・参加者・対象・parameterは選択直前に既存helperで再列挙。後から引いた現物を遡及追加せず、見送り後の通常responseへの再出現を抑止する。発動は既存quick/連鎖handler、判断は既存116を再利用し、発動自体から生じる次の相手群も記録する。463の許容範囲は拡張しない。

混在fixtureで、伏せ札を隠す内側投影が外側の実勝負stateを上書きし、合法なG-baseball-battingを落とす不足もRED再現した。現在pipelineのscopeで外側の実current/runtimeを保持し、既存合法性predicateへ渡す。過去adapterは変更しない。例外時も共有接続を復元。新しい裁定・効果・優先順位を追加しない。

専用RED→GREEN、接続9PASS、関連42PASS、最終関連39PASS（238.484s、既存115/零root全20turn・admission・policy journal・coverageを含む）。途中のfixture不備／重複keyword／候補欠落失敗も保存し、最終成功と分離。独立read-only review C/I/Minor各0。条件付き438/native fixtureと合成unit contextは本番入力や独立標本ではない。

87638396固定版の全proxy回帰が完了：1630件すべてPASS、6process exit0、開始/完了ID完全一致、skip/重複/欠落なし、source不変。14原本ファイルをcanonical JSON/gzipで梱包。同版npm406PASS。9ec3以降と本変更を含む全回帰とは呼ばず、後続差分は各関連検証で区別する。

preflight-ready=false。全合法性・許可情報・比較operand・全rule機会の合成証明は未完了。seed生成／400戦入力固定／本番対戦0、旧116除外、新方式未採用、全体結論保留を維持。保存後も準備を継続する。

## 通常行動のcore合法／不合法判定の結合

候補source/target/cost列の一致と、各行のdispositionの正しさを分離。01/02/06と114固定tableに基づき、pass・ちょうせん・交際・人生移動・人物／セカイ配置・準備枠／装備対象／支払について、合法行と除外行の双方を現在stateから検査する。主な対象は既存の枠・回数・種族段階・対象現物・時・軽減効果ID。main identityと支払は既存helperを再利用。未対応のquick/能力/予約unitはunproved_unitsへ残し、完全合法集合・情報利用・選択根拠・全機会を認定しない。

逐次TDD：初回3件REDから接続。理由と合法列を同時改変するケース、余分なpayment effect ID、bool/int、対象差替え、source変化を拒否。独立review C0/I1/Minor1。I1は既存P-cliff_goat交際軽減を印刷時1と固定していた監査不足で、既存のeffect filter/payment計算をcurrent trigger_effectsの共通helperへ移し、実候補器と監査で共有。Minorはchallengeの参照先をgame_stateへ修正。いずれもRED再現→GREEN、旧効果・値・保護adapterは変更しない。

専用6PASS、review修正＋既存誘発10PASS、最終関連52PASS（223.910s、保存115/零root全20turn、候補、policy journal、admission、連鎖、手札誘発を含む）。review後の追加capacity fixtureの失敗も保存。設計errors=[]、番号付きtop-level正本376ファイルを直前保存blobと照合し一致。87638396版1630全proxy／406npmと今回差分の関連検証を区別する。

preflight-ready=false。今回のcore predicate検証を完全合法性や対戦算入へ昇格しない。残作業は個別能力の合法性・実情報利用・比較operandのsource根拠、全rule機会の合成、結果前remote lock／外部実行承認への接続。未証明／116除外は予定400行・200群から落とさず、全体結論null。実seed採取、400戦入力固定、新対戦0、新方式未採用。

41本文との続行監査では、じんとりの発動条件を確認した。114は7枚以上を明示した手動裁定、127はその境界を明文化済み。85/86の解決時6枚で0と両立し、06/474もこの個別条件を撤回していない。独立read-only source reviewで確認し、追加裁定・ユーザー質問・コード変更は不要とした。既存の発動時7枚条件を維持する。詳細はverification/area-activation-source-review.md。

## 通常手札15種の発動条件監査・敗北履歴報酬の接続

fa6e9d6c / tree85031386のfresh remote一致、PR259 Draft/open/unmergedを確認して復元。通常手札quick15 IDについて、正本/tableを固定し、時・現在対象・盤面枚数・公開敗北/適用履歴・同名ターン制限・通常/反応限定timingから、供給された各行の合法/除外判定を照合。候補列の再現だけで誤除外を正当化しない。対象/variant全量、除外理由の意味論、実情報使用、operand、全rule機会は別証明のまま。

E-bossは91の「このターンに負けた事実」のみを条件とするのに、通常側121の英語前提文字列判定が現在mainも要求する不整合をRED再現。current scopeで既存response/payment helperを再利用し、main離脱後も時2と当該敗北履歴があれば候補を保持。過去ターン/引分/相手敗北/時不足は除外。旧table・旧adapter・過去結果は変更せず、比較は既存未証明guard/116のまま。既存固定test contextの通常/response双方で実選択→検証付き発動まで確認した。

検証：既存baseline6PASS、bundle関連30PASS、全20turn/R10・policy journal・admission等を含む結合33PASS（150.205s）。レビュー後の回帰test追加後は関連31PASS（12.093s）。独立review C0/I0/Minor1（検証付き実選択から発動までの回帰不足）を追加テストで対応。sourceコードは結合33PASS後不変、追加test版fingerprintと区別する。全proxy/npmをこの版で再実行したとは主張しない。番号付きtop-level正本は実測476ファイルがbaseと一致（引継ぎ376という件数をそのまま再使用しない）。

preflight-ready=false。残る共通責務は通常盤上/予約とresponseのpredicate、実際の許可情報使用、比較operandの根拠、全source/phaseの機会合成、結果前remote公開と外部生成/実行承認の結合。seed生成・本番入力固定・400戦開始0、旧116除外、新方式未採用、全体結論nullを維持。最新詳細証跡はverification/hand-bundle-*。

運用：GitHub保存checkpointを正本とし、安全な区切りでcommit/pushとfresh remote確認。以後は最新checkpointと残件を中心に進め、古い途中ログを会話へ再展開しない。保護対象と未承認の生成/固定/実行境界は継続保持する。

## 通常盤上能力のpredicateと供給unitの対応

4bd9853から継続。支払能力の現在main・現物cost全候補・現incarnation使用回数、C-cat_friendの現在companion・別名捨札対象・回数を既存helperで照合。手札の同能力は盤上自身costを払えないため除外。常時/誘発/response専用の通常非発動をsource分類から確認し、未対応能力・予約は未証明へ残す。

実入口でcore/hand/boardのfresh監査を合成し、供給された通常unit IDの欠落・重複・外部IDを検出。供給unitのpredicate対応だけを示し、完全合法集合、実情報使用、比較operand、全rule機会、任意caller proof認証へ昇格しない。

最終関連33PASS（13.036s）、policy journal/admission結合25PASS（127.245s）。独立review C0/I0/Minor1、予約・外部ID・未知schemaの保守的境界テスト追加で対応、追加後5PASS（2.709s）。結合検証後はtestのみ変更、実装source不変。設計errors=[]、番号付き保護正本476件不変。証跡verification/board-bundle-*。全proxy/npmの旧版検証とは区別。

preflight-ready=false。次はresponse個別predicate、許可情報の実使用、operand根拠、全source/phase機会、結果前remote lockと外部承認gateの結合。旧116除外・新方式未採用・独立balance標本0・全体結論nullを維持。seed生成/本番入力固定/400戦開始0。
