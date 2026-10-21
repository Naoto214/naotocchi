# 463 — 事前固定mandatoryランダムpolicyの詳細設計（未採用）

2026-10-04 JST。開始remote/local HEAD `c38d1fa75a14d21d2068195b8f82f91a1e7a20d1` / tree `bb421972a6dceff50fcaed94e072b0d723755f03`一致、PR259 Draft/open/unmerged。docs/card-gameのみ。

## 1. 目的・承認境界

462③を採用する方向で**詳細設計まで**進める承認に基づく。評価対象は、事前固定されたmandatoryランダムpolicyと既存通常行動/response policyに条件付けた、107デッキ組の予定集合。戦略的正解・カード価値同値・完全合理的プレイヤー一般のbalanceを証明しない。

本書はR1（初期順と別のpolicy乱数材料）の具体的な推奨仕様。policy版、記録版、評価契約版を分離する。これらの正式採用・実装・seed生成・入力固定・新対戦は未承認。本書の仕様語は採用後に要求する条件であり、現在の実行器が対応しているという宣言ではない。

114・116・119・A初版・454〜462・505・過去結果・72件の旧方式適用限界は不変。459の200群×2戦=400戦計画は未実施のまま。新方式未採用、独立balance標本0、balance_admitted=null。新しいseed/鍵/初期順/manifest行/選択結果は作らない。

## 2. 版と概念の分離

設計上の識別子（runtime未登録）：

- policy: `mandatory_random_policy.v1`（以下MRP）
- record: `mandatory_policy_choice.v1`
- randomness: `mandatory_random_hmac256_reject.v1`
- evaluation: `policy_conditional_population.v1`（以下PCP）
- 本設計artifact: `mandatory_policy_detail_463.v1`

|項目|116既存fallback|MRP意図的ランダム|
|---|---|---|
|選択の発生理由|既存比較で一意にできず診断的に継続|評価policyとして指定範囲で最初から使う|
|dispatch|既存116規則|結果・優越証明成功率に依存しない、事前registryと判断kindによる|
|record|seeded_fallback / strategic_unresolved_seeded_fallback|別schemaのplanned_policy_random / precommitted_uniform_legal_choice|
|戦略的主張|strategic_unresolved=true|strategy_basis=unproved、optimality_claim=false、equivalence_claim=false|
|旧116/459への算入|除外|旧schemaの適格判定を受けたと偽装しない。旧契約の対象外としてnot_admitted。陰性ではない|
|PCP案への算入|本提案でも真正な旧fallbackは除外|指定mandatoryのみ、policy適合と全共通gateが証明された場合に限る提案|

MRPは比較失敗後の救済関数ではない。registryに載る複数合法選択では、カード本文・現在使えるか・勝敗予想を重みにせず最初から完全候補集合上の指定分布を使う。通常行動の比較途中からMRPへ送ることは禁止。MRPの失敗を116へ自動委譲して完走させない。

旧boolean `strategic_unresolved`をfalseで埋める互換処理は作らない。MRPは別schemaで戦略未証明を明示する。旧validator/455投影器へ新schemaを通して「非fallback」と認定しない。将来の共通envelopeはrecord_kindと版から専用validatorへdispatchし、未知版は未証明にする必要がある。

将来の接続は、判断発生時に専用dispatcherがMRPを選び、その選択を効果処理へ適用する別版実行経路とする。既存116 resolverで選択した後にrecordだけMRPへ変換するadapterは禁止。旧resolver・保存artifactは保持し、新経路は選択直前state、実適用、保存証拠まで一貫して検証する必要がある。

singletonは`rule_forced_singleton`、strategy_basis=`forced_by_complete_legal_set`として別branch。最適性の主張ではない。乱数を使わず、完全列挙と発生元を検証する。0候補は正本が自動skipを定めるか検証し、未確定なら停止。過去singleton seeded記録は一切変更しない。

## 3. 対象registryと候補分布

MRP v1の提案範囲は**1つの合法選択肢を選ぶ、既に責務が確認された5種**。カード別の優先表ではなくchoice契約で接続する。

|choice_contract_id|既存接続の参照|候補の原子と必要な選択時点|
|---|---|---|
|egg_exchange_bottom|117 build_mandatory_choice_decision|たまご追加draw後の本人手札の各現物|
|ability_hand_bottom|continuation_triggers.mandatory_choice|当該能力の戻し直前に残る各手札現物|
|ability_draw_then_hand_bottom|同resolveのdraw後branch|先行drawを適用した途中stateの各手札現物|
|final_time_hand_bottom|406 hand_bottom_decision / continuation_quick.resolve|対象再確認・条件付きdraw後、実際に戻しを要求する時点の各手札現物|
|ability_topdeck_order|continuation_choices.resolve / triggers.resolve|許可された確認を行った後のtop/bottom位置option|

registryの各entryはsource path/hash、発生条件、合法集合証拠規則、情報view、途中state参照、継続義務、origin抽出規則、候補schemaを将来の実装契約へ結合する。現時点の参照は接続箇所の同定までで、adapterの完全性認証ではない。未対応の必須選択はregistry外として停止/未証明。検索・任意k枚・順列選択などを5種の語に似ているだけで含めない。必要時は既存契約を調べて別版で追加する。

完全合法集合Lをcanonical candidate ID順に並べ、N=|L|。N>=2なら設計分布は各候補1/N。N=1は上のsingleton処理。重み・順位・frontierの抽出なし。同名別現物は別候補。現物IDは識別用で、低IDが優先されるわけではない。

手札戻しのIDは既存card copy IDを保持し、detailに選択時の現行instance ID・領域・owner・card IDと移動契約を結合する。top/bottomは既存optionのcanonical IDを保持する。ID再設計や領域移動時の旧instance再使用を認めない。同一の選択肢を別IDで重複登録することを拒否するが、別現物を価値同値として削除しない。

候補をシャッフルして順序へ重みを隠す、今使えない札を除く、同種類にまとめてから抽選する、抽選候補だけをlegal_candidatesと呼ぶことは禁止。カード追加時はこの完全列挙・遷移証拠を新版catalogとともに認証する。選択器の再利用は可能でも、候補構成変更による分布変化は評価の版差として残す。

## 4. 入力固定：初期順seedとpolicy rootを分離

採用後・生成承認後に作る計画上の材料（今回はすべてnull）：

|材料|提案する数・型|共有/分離|
|---|---|---|
|初期順seed|459どおり200群×owner A/B=400個、unsigned128bit|同じ群の鏡像2戦で全山札順を共有|
|policy root K(g,owner)|200群×owner A/B=400個、OS乱数32byte、64桁lowercase hex|初期順seedから導出せず、別のOS乱数採取。各rootから鏡像側別keyを導出|
|鏡像側key|計算上200×2 owner×2側=800本、32byte|A_first/B_firstでdomain分離。実際の独立OS採取800回とは数えない|

初期順は459の歴史入力台帳・棄却条件・生成順序を保持。policy rootは**初期順の入力条件による棄却を終えた後**、群番号順・owner A→Bで採取する提案。初期順やカード構成を見てrootを選び直さない。policy rootの偶然一致・all-zeroを理由に引き直さず記録し、複製バグ/乱数源不具合が疑われる場合は計画を保留する。偶然一致だけで独立性を証明/否定しない。再生成を隠して採用rootを選別しない。

異なる採取用途・root集合・生成器版・OS乱数API/環境・採取順/回数・中断記録を保存し、意図的なコピー/導出がないことを監査する。hash一致は来歴・無作為性の証明ではない。rootを含む再現材料は監査保管対象、戦略選択器が相手乱数や隠れ山札を推測する入力にはしない。

実行前に全初期seed/全山札順/全policy root/全400行と群対応/版hash/生成来歴を**一つの完成した入力bundle**へ結合し、immutable保存commitとcanonical hashを確認する。commit内の自己参照hashは作らず、外側のlock receiptがbundle hashと保存commitを指す。自己申告approved=trueや時刻だけでlock認証しない。結果観測前の保存と明示的実行承認を別途確認する。

未来の判断数・選択肢は未確定なので、将来判断を先に実行して選択列を作るのではない。固定rootと以下の固定導出規則が、後で発生する各機会の選択を決定する。bundle固定後の追加・差替え・引き直し禁止。中断から同じ入力を復元できなければ生成/実行を止め、別版計画の承認へ戻る。

## 5. canonical encodingと導出仕様案

### C、候補hash、機会address

新policy専用のC(x)：JSONをUTF-8、key sort、ensure_ascii=false、separators=(',',':')、allow_nan=false、BOM/末尾LFなしでencodeする。整数はschemaで許可した非負範囲のみ、boolを整数として受理しない。float、重複key、未対surrogate、未知key、型違いを拒否。Unicodeの暗黙正規化はせずcode point順でcandidate IDを整列する。既存state/event/snapshot/hash規約は変更しない。新artifactの読みやすいJSONファイル表現とCのbytesは区別する。

D=SHA256(C(sorted_candidate_ids))のlowercase hex。Dは許可候補だけのhash。hidden全state/viewや初期山札hashは**抽選材料に入れない**。証拠束には監査用hashを別欄で保持できる。

機会address Oは次の固定長配列案：

`[turn_owner, turn_index_for_that_owner, chooser, origin_kind, origin_ordinal, choice_contract_id, choice_slot, repeat_index]`

- turn_owner/chooserはA/B。turn_indexはそのownerの実ターン開始数、1始まり。roundの別名を無検証に使わない。
- origin_kindは`turn_start`または`effect_resolution`。前者origin_ordinal=0。後者はそのターンに実際に開始した効果解決を、正本による処理順に1から採番する。自動処理を含め、効果解決を丸ごと数える責務は義務台帳から検証する。
- choice_slotはsource固定registryの意味上の位置（本版5entryでは各1slot）。同じ効果内で別の位置が必要ならregistry新版へ戻す。repeat_indexは同じorigin/slotでの発生回数、0始まり。既存ルールが反復を要求しない本版entryでは0。
- Oは合法発生証拠から導出する。任意caller文字列、ログ行数、保存snapshot数、thread順、retry attempt番号を採番根拠にしない。effect_resolutionは発動時点ではなく解決開始時点で採番。中断/resumeで同じ解決を再採番しない。
- 監査ledgerはOをorigin event/chain link/source rule/解決内位置/前後stateへ結合する。効果解決に未知の発生/順序/情報制約があればOも未証明として停止。非公開情報由来のorigin識別を乱数APIへ渡すことを許可しない。正当な公開または本人既知の解決であることが必要。

Oの再利用は同じ機会のretryに限る。同一run内の別機会が同じOになる衝突、同じOで異なる候補hashになる再呼出しは停止。異なるchoiceを後で追加して既存計画の選択を維持できるとは保証しない。ルール/policy/実行器版を変えた時点で別計画とする。単なる監査ログ追加はOへ影響しない。

### HMACと候補index

Kはmanifestの当該群/owner rootをhex decodeした32byte。鏡像側Sは`A_first`または`B_first`。群IDとownerもmanifestから認証する。ownerはchooserと一致させ、turn_ownerのrootを誤用しない。protocol_idは将来の承認済みPCP protocolの固定IDで、実行途中に変更しない。Km commitmentはSHA256(Km)のlowercase hexとする。

1. `Km = HMAC-SHA256(K, C(["MRP.v1/mirror", protocol_id, group_id, owner, S]))`。
2. counter j=0から順に `Bj = HMAC-SHA256(Km, C(["MRP.v1/draw", policy_id, O, D, N, j]))`。
3. Bjの32byteをbig-endian unsigned整数xへ解釈する。Nは2以上2^256以下。`T = 2^256 - (2^256 mod N)`。
4. x<Tならindex=x mod N、selected=sorted_candidate_ids[index]。x>=Tなら棄却しjを1増やす。
5. jは0〜2^32-1。全て棄却されたらrandomness_exhaustedとして停止/未証明。別root、別O、mod強行、116へのfallbackはしない。各jの連続性を検証し都合の良いblockから始めさせない。

HMACは[RFC2104 §2](https://www.rfc-editor.org/rfc/rfc2104)の構成をSHA-256で用いる案。RFCを統計的独立性や本ゲームの適格性の証明として引用しない。固定rootの下ではすべて決定的。rejectionは**理想的な一様blockを仮定した場合の余りの偏り**を除く。有限鍵・HMAC出力から、すべての判断が数学的に独立かつ厳密一様だとは主張しない。証明済みなのは採用後の算術検算であり、来歴/分布モデルは別審査。

seed値・HMAC出力・counter列の実生成は今回0。上は非実行仕様である。singletonはKm/Bj生成不要でrandom_proof=null、候補確率は1/1。PRNGの状態を逐次消費するAPIではないので、別判断で棄却が増えても後続機会の乱数消費をずらさない。

## 6. 鏡像戦の対応（推奨案・承認待ち）

本設計の推奨は**同じgroup/owner rootから、A_first/B_firstで分離したKmを使用**する方式。初期順は共有するが選択用乱数は共有しない。derive式にSを必須とするため、対応するO、同じ候補集合でも抽選blockは同じとは限らない。意図しない同じ値が出ること自体は改変証拠ではない。

鏡像対応表のキーはgroup/owner/O。両側に同じOがあれば構造上の対応、片側だけならunmatchedを記録する。同じOでもstate/候補集合/それまでの履歴の同値を意味しない。候補hash一致ならsame_candidate_setという事実のみ記録できる。choice source/card/継続が違えばその差も保持する。unmatchedを欠落と決めつけず、各側独立の正本由来機会ledgerで実際の発生/非発生を検証する。未知なら未証明。

**対応Oの有無で新しい乱数を選ぶことはない。** 各側の選択は自分のmanifest行とOのみで決まり、相手側の実行結果・候補・停止位置を読まない。先に実行した鏡像側へ依存しない。両側が相手policy rootを戦略入力として読むことも禁止。

代替はSを共有した共通乱数方式。ただし候補集合が変わると同indexでも同じ選択ではなく、Dを含めれば抽選block自体が変わる。どの局面を対応と呼ぶかの強い規則が必要になる。本版では未選択。共有で分散が減る保証はなく、どちらの案でも鏡像2戦を独立2群とは数えない。推奨案を採用するなら、同条件でも選択を揃えない先後比較になることを確認する。

## 7. 記録と再現証拠の契約案

recordに必須とする概念（exact field/型案は[contract-draft.json](data/proxy-mandatory-policy-detail-463/contract-draft.json)）：

|証拠群|保存する内容|検証責務|
|---|---|---|
|版/manifest|record/policy/randomness/evaluation IDと各source hash、lock receipt、match/group/owner/S|承認版と完全bundle照合。自己申告承認不可|
|機会|O、origin event/chain、rule/source、途中state参照、許可view参照|正本由来ledgerから同定/完全性。記録の列挙だけを網羅証明にしない|
|候補|N、整列ID、details、D、完全性証拠、情報制約証拠|実stateと正本から再列挙して一致。candidate_set_complete=trueだけでは不足|
|選択方針|selection_basis、strategy_basis、optimality/equivalence false、rational_probability=1/N|重み/順位がないこととregistry適用を検査。戦略未証明を保持|
|乱数|root_ref、S、導出message bytes表現、Km commitment、jごとのBj、T/index/selected|lockされたrootから全部再計算。rootの値は監査bundleへ分離。proofだけで真正来歴とはしない|
|遷移|selectedの実適用、支払い、現物/instance移動、前/後state、残存義務、event/snapshot/chain hash|選択直前の途中stateへ結合し、draw/response/終了を落とさない|
|分類|policy_conformance、strategic_comparison、common_evidence、old_contract_applicability、PCP disposition|欠落=null/未証明。抽選一致から全体適格を導かない|

planned_policy_randomはstrategy_basis=unproved固定。比較不能という理由で後から発動したことを示す旧reason_codeは使わず、新policyの適用であることを明記する。nonselected_candidatesは未選択集合でありrunner-upという戦略順位を付けない。

原recordはimmutable。証拠審査は版付きsidecarを追記し、raw recordのflagを書き換えない。再実行はmanifestの初期状態/版/rootから行い、保存choiceを入力しない。456と同様の同一実行器内の一致はexisting_executor_onlyを保持し、別実装の合法性/機会網羅証明と混同しない。

## 8. 機械審査と全体算入の案

validatorをまだ実装しない。採用後に必要な責務は以下。各gateの出力はverified/contradicted/unprovedと具体的理由。構文不正はエラー、証拠不足は未証明、改変/不合法が立証されれば除外理由。除外があっても他gateの未証明を消さない。

1. **入力認証**：exact schema、canonical bytes/hash、版、全400行/200群、初期順/seedとpolicy rootの分離、真正lockと生成来歴。乱数値から来歴を推測しない。
2. **機会/情報**：正本から発生義務を導き、O/registry/選択時点/viewと結合。途中draw前stateの代用を拒否。response発動の判断と、解決内mandatoryを分ける。
3. **候補/抽選**：完全候補集合、現物、分布1/N、HMACmessage/domain、連続rejection、選択結果を独立計算。禁止材料/未登録choice/恣意frontierを拒否。
4. **遷移/保存**：選択した現物・位置の実適用、全state/hash、残存義務/次の判断/終了を検証。候補proofが正しくても後stateが違えば適格にしない。
5. **評価集約**：下表に従い全判断→対戦→鏡像群→予定集合。未記録機会を0として通さない。

|判断|旧契約の評価|PCP将来案|
|---|---|---|
|真正な旧116 fallback（どの判断kindでも）|既存どおり除外|除外。MRPへ付け替えない|
|MRP planned_policy_random、全証拠verified|旧契約では対象外/not_admitted。116陰性としない|指定mandatoryに限りpolicy条件付き適格の候補。戦略比較は未証明と併記|
|MRP singleton、完全性/発生/遷移等verified|既存recordの再分類なし|将来別recordとして審査。singletonだけで対戦算入不可|
|MRP抽選のみ一致、候補/機会/情報/遷移不足|未証明/対象外|未証明、算入しない|
|不合法・情報漏洩・改変が確定|既存規則|除外。ランダムpolicyによる例外なし|
|通常行動・response|114/116/119、454〜460を維持|同じ必要証拠と116除外を維持|

全対戦のinput/版/全判断/自動処理/正本由来全機会/連鎖/終了/真正再生が整い、200群の両側がすべてPCP適格の場合のみ予定集合全体の記述を許す案。MRP部分のstrategy_basis=unprovedは**PCPで明示的に許容するpolicy依存**であって、合法性や未観測機会の未証明とは別。これは454/459の選択根拠/116陰性gateの別版変更に当たり、採用承認が必要。

除外/共通gate未証明/未実施が1件でも残れば全体勝率・結論はnull。適格部分は分母を明示した診断のみ。除外行の削除・置換・追加禁止。通常/responseのfallbackや未対応mandatoryにより全体gateが閉じる可能性を保持。400戦全体適格・準備完了は保証しない。

## 9. 報告範囲と保守性

報告名は「MRP v1＋固定通常/response policyに条件付けた、107デッキ組・予定400戦の記述結果」。A勝ち/引き分け/B勝ちの件数・割合、鏡像/先手別、既存補助指標を維持する。200は精度保証ではなく、鏡像400戦を400独立群と数えない。母集団推定/信頼区間/有意差は別設計であり、今回追加しない。

複雑な必須選択・コンボを要するカード/デッキへのpolicy依存を明示し、完全合理的プレイヤー・人間一般・他policyへ外挿しない。新カードが増えれば候補数と確率質量が変わる。同じpolicyコードでも同じbalance評価対象とは限らない。別版のcatalog/デッキ/契約を事前固定する。

再利用する責務はregistry、候補証拠、origin/途中state結合、純粋な乱数導出/検算、版付き審査。過去adapter統合・全効果自動解釈・カード価値表・有限先読みは不要。現行toolsや116のseed方法を改変して過去replay互換を壊さない。旧recordとの互換が必要なら明示的envelope/dispatchを将来設計し、黙ってflagを補わない。

## 10. 将来検証する受入条件（未実装・未実行）

- 初期順seedをpolicy rootとして渡す、root/side/groupの差替え、結果後lock、偽receiptを拒否。
- 同じmanifest/O/candidate集合の再計算は同じ選択。retryでattempt番号を変えても同じ。保存選択を再実行入力に使わない。
- 両鏡像側のderive messageはSで必ず異なる。出力が偶然同じでも失敗とはしない。実行順を反転しても各側の結果に相手側実行状態を使わない。
- N=7のTとrejection境界、Nが2の冪の場合、j連続性、counter上限停止を独立算術で検証。採用後TDD用の合成vectorは本番seedと別だが今回は作らない。
- duplicate候補、欠落候補、同名現物縮約、候補順依存、禁止hidden hash、O衝突、draw前state、証拠欠落を拒否/未証明とする。
- 新recordのstrategy未証明をfalseに変える、116 recordをMRPへ改名する、通常/responseへMRP適用する、過去runへ遡及適格を付ける入力を拒否。
- MRP判断が適合しても別判断の116陽性、未知機会、終了証拠欠落、片側欠落、予定外/欠落行があれば全体gateは閉じる。

これらはTDDの受入要件候補であり、テストコード/実装計画の実行承認ではない。

## 11. 次の確認事項

この具体案について、(a)5種の完全合法選択肢上1/Nと別record、(b)初期順400 seedと別採取のpolicy root400個、(c)HMAC-SHA256＋rejection、(d)鏡像側で分離した乱数と構造的対応のみ、(e)PCPの限定した選択根拠変更と全体gate維持、を一括で設計確認する段階。

ユーザー承認後も、まず実装計画と共通registry/途中state/Oの検証可能性を具体化する。460未完の全機会/真正適格性/loader/manifest認証を省略しない。実装・正式採用・生成・入力lock・対戦開始の各許可を混同しない。生成前に完全な仕様/コード/テスト/レビューを確認し、生成後には完成bundleとreadinessを示して最終実行確認する。

## 12. 保存・検証

設計artifact、source hash、既存blob保護、設計データ検査、独立設計レビュー1回を保存する。[verification](data/proxy-mandatory-policy-detail-463/verification.json) / [review](data/proxy-mandatory-policy-detail-463/review.json)。runtime/validator実装、TDD、npm/ゲームテスト、新seed/鍵/初期順/対戦/replayは0。機械可読draftは仕様を保持する文書で、実行可能なvalidatorではない。

保存前確認：source hash 24件一致、registry5種・未採用/非実行/null値の整合、設計データ `errors=[]`。README索引以外の既存3,624 blob保存一致。独立設計レビュー1回はCritical/Important/Minor各0。最終verification/review梱包とdispatcher責務の明示追記は独立再レビューなし。実装準備完了や乱数独立性の証明ではない。
