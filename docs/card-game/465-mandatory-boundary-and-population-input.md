# 465 — mandatory局所処理・記録検算・400戦bundle接続

2026-10-04 JST。開始remote/local HEAD `d4ff486fe461b5d130ecaaa88dea44d1cdc2b245` / tree `e9629bfb7160f5997d0c0125f028aca0a42289da`一致。PR259 Draft/open/unmerged。docs/card-gameのみ。464の続きを中間確認なしで進める指示に基づく。[計画](plans/2026-10-04-mandatory-boundary-465.md)、[ledger](data/proxy-mandatory-boundary-465/ledger.md)。

## 完成した接続

|実装|今回検算できること|なお認証しないこと|
|---|---|---|
|proxy_mandatory_choice_boundary.py|正本固定20sourceから5種の局所処理、先行draw/対象移動、全現物候補、選択適用と後続draw|供給された処理入口の真正性、発動適法性、全履歴|
|proxy_mandatory_policy_local.py|局所候補から464抽選を先にdispatchし、全recordを再構成して検算|本番実行器への採用、full MRP record認証、policy_eligible|
|proxy_mandatory_policy_journal.py|供給された同一match内のroot固定、O再使用と完全一致retry、state/候補/材料差替え拒否|O自体の真正性、未記録機会、判断数の網羅|
|proxy_mandatory_population_input.py|459の200群/400戦・全初期順構造と464 MRP版・400 owner root・行digestの対応、bundle→match→chooser→局所記録|乱数採取来歴、歴史入力除外、外部lock、全対戦算入|

新しい評価点・期待値・優先順位・同名現物の同値化はない。旧116 resolverで決めた結果をMRPへ改名していない。旧tools/contract/artifactはREADME索引以外無変更。新しい実装は別版のoffline検算用APIで、現行runnerに自動登録しない。

## 5種の局所処理

局所入口はexact `mandatory_rule_slice_input.v1`。actor、choice_contract_id、entry、source/targetの現行instance、既存形式game_stateを受け取る。これは**供給入口が正当であるという条件下の処理**であり、入口ラベルが発動・到達を証明するわけではない。

- egg_exchange_bottom: `after_normal_draw`から追加1drawを再構成して返却候補を列挙。たまご状態/本人手番を検査。山札が空でも手札があれば返却、手札も空なら選択なし。既存実行器の`egg_exchange_choice`保存stateは既に追加draw後なので、そのままこの入口へ渡すことは禁止。将来bridgeは通常draw直後の実stateを取得し、履歴証拠へ結合する必要がある。
- ability_hand_bottom: 戻す前の全手札。M-beetle-01は返却不能でも後続1drawを行う。P-cat_ceoは返却成功時のみdraw、02に従い解決開始時にたまごなら能力全体を適用しない。
- ability_draw_then_hand_bottom: I-sleepboost1の先行2draw（引ける分）を適用した途中stateから全手札。
- final_time_hand_bottom: E-final-timeの自分の捨て札・メイン以外という対象再確認、対象を下へ戻してから2draw、実際の途中手札。対象不適正ならdraw/選択とも発生しない。発動時のR10/段階/時/回数/応答合法性は本sliceの証明範囲外。
- ability_topdeck_order: W-city/M-beetle-02の許可されたtop確認を前提に、既存canonical option IDでtop/bottomの2候補。山札1枚でも2optionを価値同値として縮約しない。空山札は選択なし。

同名C-boxの2現物も2候補。candidate detailにcopy ID・現行instance・card ID・owner/zoneを保存。全game fieldを保持した局所前後stateを検算し、選択者に与えるviewは本人手札と当該top確認に限定。抽選材料は464のcontextと候補IDだけで、hidden game hash/他方鏡像の結果を混ぜない。

局所適用は手札/山札/捨て札の操作まで。連鎖解消、効果sourceの行先、予約/終了、領域移動に伴うinstance再結合、event/snapshot/hash発行は別責務。既存canonical規約をこの簡易局所stateで置換しない。`global_transition_verified=false`、`instance_rebinding_verified=false`を保持。

## 記録・retry・singleton

schemaは`mandatory_local_policy_record_465.v1`。将来full `mandatory_policy_choice.v1`を名乗らない。供給入口hash、context、供給root commitment、464算術、全候補/途中state/view/選択適用を一体で再計算する。未検証の`verified`等は追加fieldとして不一致になる。

複数候補はplanned_policy_random、strategic_unproven=true。singletonでは464のsupplied_singletonを維持し、戦略解決済みへ昇格しない。ただし465の外側記録はsingletonでもcontext/root/入口を結合するため、464単体算術では識別できなかった材料差替えも検出する。旧464の動作・記録は不変。

journalは同じOと完全一致する供給記録だけをretryとして数える。同Oで候補/state/root/recordを変更すれば、抽選を正しく作り直していても拒否する。別Oでも同じowner/matchでrootを切替できない。`distinct_supplied_addresses`は供給address数であり、`judgment_opportunities=null`。真に別の機会を同じO/同じstateで偽装した場合や、行丸ごとの欠落は義務台帳なしでは発見できず、網羅性を主張しない。

read-only CLI:

```
python docs/card-game/tools/proxy_mandatory_policy_journal.py --evidence PATH
```

exact `{binding, attempts}`を読み、整合しても未準備exit1、不正exit2。root値を出力しない。generate/executeオプションなし。

## 結果前bundle構造との接続

新schema `policy_conditional_population_manifest.v1`、protocol_id=`policy_conditional_population.v1`。459のschema/承認artifactを書き換えず、同じgroup/seed/full-order/実行順を別版として検査する。

459既定のtop fieldsにprotocol_id・mandatory_contract_sha256・policy_rootsを追加。policy_rootsはgroup IDごとexact A/B、各32byte lowercase hex。初期順seedの128bit整数とは型・用途を分離するが、値の形式から独立採取を証明しない。400 rootを要求し、偶然一致/all-zeroは引き直し条件にしない。coincidence/zero件数を診断表示し、来歴gateを閉じておく。

各match rowは459 fieldsにpolicy_input_sha256を追加し、policy_versionsをnormal=`114_with_116`、mandatory=`mandatory_random_policy.v1`、response=`119`で固定。digestは464 Cを使い、次をSHA256で結合する。

`{protocol_id, group_id, match_id, mirror_side, initial_input_sha256, policy_versions, root_commitments:{A,B}}`

root_commitment=SHA256(hex decodeした32byte)。初期input hashは459の既存canonical形式のまま。鏡像の初期順は共有し、mirror_sideをA_first/B_firstとして行に結合する。同じ抽選結果は要求しない。

459の既存validator再利用時だけ、別のdeep copyへ旧schema/旧mandatory IDを置く**構造検証用projection**を作る。これは旧方式で実行したという記録でも、旧116陰性という証拠でもない。元bundleは不変。旧validatorが返すvalid=false/不足gateを昇格しない。新policy自体はprojection前に別途exact照合する。

`build_bound_local_record`は供給bundleの構造検査後、match rowから側/group、frameのchooserからowner rootを取得する。相手ターン中でもturn_ownerのrootを代用しない。bundle全体hashと行digestも外側へ結合。`audit_bound_local_record`はこの接続を再構成するが、input_lock_verified=false/全適格性nullを維持する。

## 残る実行準備と算入gate

今回の局所候補完全性は`local_rule_given_supplied_entry`。全局面合法性・義務網羅性と異なる。以下は引き続き未完であり、callerの真偽値や再現一致で補完しない。

1. 実生成器/中断復元/初期順とpolicy rootの分離採取来歴、歴史seed/order-pair台帳照合。
2. 結果前の真正bundle保存・外部lock receipt・実行承認、実行source版の完全固定。
3. 通常draw直後/各効果解決入口の真正state取得。全41ID・自動処理を含む正本由来義務台帳からOを採番・照合。
4. 現行runnerの固定135入力・旧mandatory profile依存を別版loader/runnerで分離し、局所選択からcanonical実遷移・event/snapshot/hash・継続/終了まで結合。
5. 通常行動/response/指定外mandatory、全判断→対戦→鏡像→予定集合の適格/除外/未証明審査。予定行の欠落・除外・未証明が残れば全体結論null。

旧116 fallbackは引き続き除外。指定MRPの戦略未証明許容は、共通証拠未証明の許容ではない。今回の未完gateは新しい比較意味論の承認待ちではなく、後続実装・真正証拠の責務。準備完了とは報告せず、seed生成/400戦開始の確認を先取りしない。

## 検証と保存境界

TDDは局所14、記録6、journal/CLI7、bundle/接続/依存pin9の計36件。初回RED→GREEN、変更依存のsource差替え拒否も追加RED→GREEN。テストは固定合成bytesと局所合成state、400行構造testは過去115の既存seed/orderを反復した**不適格なin-memory double**のみ。200 seed/rootの新規採取、実験用入力固定、新対戦、保存12run再実行は0。テストdoubleを成果物manifestとして保存しない。

関連suite・npm・設計データ・保護blob・独立レビュー結果はverificationへ保存する。全proxy回帰と呼ばない。policy_promoted=false、独立balance標本0、balance_admitted=null。114/116/119/454〜464/A初版/505/過去結果・72件境界は不変。

最終検証：専用36を含む関連172 PASS、npm406 PASS、design-data errors=[]、source20件一致、README以外の既存3,654/3,655 blob一致。独立レビュー1回はCritical0/Important0/Minor1。Minorはbundle testファイルの直接実行で最後の3件を拾わない点で保留。今回使用した`python -m unittest ...`では全9件が実行され、関連172件にも含まれる。productionへの影響はない。

レビュー判断保留だったgeneration_provenance/lock_evidenceのnested型は、459からのopaqueな未認証metadataという範囲を維持する。False/空object/自己申告trueでも構造検算の一部は通り得るが、来歴/lock gateはfalse固定。完全な真正bundle schemaの検証を済ませたという意味ではない。未使用game fieldの真正性も入口gateの後続責務。最終verification梱包はレビュー後に追加した。
