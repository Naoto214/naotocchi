# 400戦準備: handler・validator・入力条件の横断監査

基準: a33d7a6。107の41種類/80物理カード。実装の入口を読んだ対応表であり、全意味・全機会の証明書ではない。残課題の分類・完了条件は[残課題台帳](2026-10-08-preflight-remaining-work.md)を正とする。ここで「存在」は実handlerの所在、「未接続」は要求する証拠との結合不足を指す。新handlerをすべて作り直す一覧ではない。

## カード別の実handlerと不足

以下のモジュール名は `docs/card-game/tools/` 内、拡張子 `.py`。表の全行にP07/P09/P10の全意味・全機会・許可情報実使用の合成が残る。typed生成/寿命や現在predicateが済んだ行も、この共通残件を省略しない。

| 107 source | 既存の主な実入口 | 特有の残件/完了条件 |
|---|---|---|
| C-bat | proxy_population_trigger_effects.resolve | 相手手番での自分quickプレイが起点（適用成功は不要）。準備札→手札の全差分を監査へ接続、全発動起点は別gate |
| C-box | 能力なし。通常配置は既存actions | 能力なしと配置/交換/離脱の機会を区別 |
| C-cat_friend | proxy_population_discard_recovery.activate_normal / activate / resolve | 自身を底へ支払う・付属装備離脱・対象不適正時の全差分 |
| C-chameleon | proxy_continuation_challenge.stats | 公開両worldの同名/異名/片欠けによる数値根拠。履歴/状態起点は別 |
| C-chicken | proxy_population_start_effects.resolve_chicken、trigger_connection.resolve | 開始時capture・公開top・空山札・drawの結合 |
| E-big-illness | proxy_continuation_payments.resolve | typed生成/対象離脱/当ターン失効済。解決全体と数値参照の結合 |
| E-boss | proxy_continuation_payments.resolve | 先のmain敗北・両者draw/成長・474上限の各部分 |
| E-fateful-transform | proxy_continuation_payments.resolve / batch.transition | typed生成/次変身消費/期限済。実費用算定と行動全体 |
| E-final-time | proxy_continuation_quick.resolve | 対象draw後bottom選択の旧116、空/部分解決 |
| E-first-date | proxy_population_chain_resolution.resolve_top | 現partner個体・解決条件・成長/draw・旧119比較operand |
| G-air-hockey | proxy_continuation_payments.resolve | typed生成/この勝負期限済。公開の現在値条件と解決全体 |
| G-animal-shogi | proxy_population_discard_recovery.resolve_quick | 捨てなかま回収・top順選択。recovery.scope登録を欠落と誤認しない |
| G-archery-3d | proxy_continuation_payments.resolve | 対象移動・残る装備/個体・部分解決と不適正 |
| G-area-claim | proxy_continuation_payments.resolve | 発動時7枚以上裁定と解決時6→0を分離、474差分 |
| G-asteroids-classic | proxy_continuation_payments.resolve | 公開複数枚・指定mandatory選択・戻す順・空山札 |
| G-baseball-batting | proxy_continuation_payments.resolve | typed生成/勝負終了済。現在値の発動条件と使用値 |
| G-basketball-3d | proxy_continuation_payments.resolve / consume_win_rewards | 次勝利で消費・差2だけ追加報酬済。過去生成/全機会 |
| G-beach-volley | proxy_continuation_payments.resolve | typed生成/当ターン失効済。対象維持と解決全体 |
| G-hit-blow | proxy_population_chain_resolution.resolve_top | 宣言型と公開top分類・一致時draw/成長。未公開topの選択利用禁止 |
| I-bond1 | proxy_population_departure.replace_companion 等の離脱/装備処理 | 自分の交代・コスト・山札移動を防がない。敵除去routeが到達するかを別証明 |
| I-bowtie | proxy_population_trigger_connection.scope / resolve → triggers.resolve | 開始捕捉群と付属対象、生存/離脱、1draw |
| I-c_coin2 | proxy_population_chain_resolution.resolve_top | 公開top分類・底へ戻す・分岐draw/成長。旧予約の再導入禁止 |
| I-poop1 | preparation.transitionで設置。preparation.response_inventoryは置換発動境界を拒否 | **置換resolverを完全接続済みとしない**。107から敵main除去発動の到達不能をsource/dispatch全域で証明するか、到達時は既存裁定から接続。除外を成功に数えない |
| I-sleepboost1 | proxy_continuation_triggers.resolve | end条件（残り時2以上、時2の支払ではない）・2draw後bottom・指定mandatoryと期限 |
| M-antlion-01 | proxy_continuation_preparation.transition のcost_modifiers | 任意軽減の選択/実費用/1ターン使用記録。main自身のbirth/transformは現行main_routes.scope→既存batchへ接続済み、旧play_main_birthの監査も追加（P22） |
| M-antlion-02 | proxy_population_paid_draw.scope → triggers.resolve | 自伏せ底への支払と1draw、全コスト候補・機会 |
| M-antlion-03 | proxy_population_trigger_effects.resolve | typed生成済。解決時parameter指定policyと実使用/起点 |
| M-antlion-04 | proxy_continuation_triggers.resolve | 到来/伏せなし・対象の捨て札→top、部分不適正 |
| M-antlion-05 | proxy_continuation_triggers.resolve | time_skipのみ・装備含む準備空とdraw |
| M-antlion-06 | proxy_population_trigger_effects.resolve | quick実適用→手札world支払→捨てworld回収。供給済み解決の全差分を監査へ接続、発動/支払起点は別gate |
| M-antlion-07 | proxy_continuation_payments.resolve_board_stat | typed生成/終了済。world変更・quick実適用・宣言の全履歴 |
| M-antlion-08 | proxy_population_paid_draw.scope → triggers.resolve | 異なる2枚の支払順・型条件・1draw |
| M-beetle-01 | proxy_continuation_triggers.resolve | birth由来・hand bottom後draw・指定mandatory |
| M-beetle-02 | proxy_continuation_triggers.resolve | 現個体が当ターンtime_skip入場でない条件・top/bottom |
| P-anglerfish | proxy_continuation_payments.resolve_board_stat | typed生成/終了済。deepseaと自宣言の条件・個体 |
| P-cat_ceo | proxy_continuation_triggers.resolve | 登場の任意手札支払→draw、指定mandatory |
| P-cliff_goat | proxy_population_trigger_effects.resolve / relationship_payment | typed生成/同partner交際消費済。全関係の数値根拠、成長100到達は既存拒否継続 |
| P-desert_scorpion | proxy_continuation_triggers.resolve | end時手札条件、draw・空山札・1ターン制限 |
| W-city | proxy_continuation_triggers.resolve | 登場起点/公開top選択の指定mandatory |
| W-countryside | proxy_continuation_triggers.resolve | end条件と成長5/474上限/誘発の結合 |
| W-deepsea | proxy_continuation_challenge.stats | hand2以下の即時再適用/解除と両値補正 |

### 旧予約・非到達の扱い

`proxy_reservation_pilot`は既存の固定transcriptの追跡器であり、現行全sourceの一般resolverではない。107内の期限付き効果は上表のtyped群へ登録されているが、それだけで旧予約生成が全到達状態で不要と証明した扱いにはしない。P06の完了には、全source本文の遅延句・移動先・起点から生成先を対応し、旧予約が非到達ならその根拠を閉じる必要がある。空のreservationsを要求するguardが通った事実も代替証明ではない。

## validatorと入力認証の不足

| 既存入口/validator | 現在確認すること | 完了に必要な追加結合（全て必須） |
|---|---|---|
| source_inventory / *_predicates / *_expansions | 現在source/候補/条件・早期不成立 | P08: 到達集合と全源、P10: 実際に読む情報の許可 |
| decision_binding / selection_basis | 実recordとの対応と114/116/119の計算 | P11: 数値operandの正本由来、未知の扱い。非fallbackだけで証明しない |
| automatic_binding | forced出力とevent/envelope/snapshot/choiceの対応 | P07: dispatch優先順位と各効果の全意味 |
| resolution_choices / resolution_order | 逆順解決/選択義務 | 発動適法・対象・各部分の実結果。選択義務なしを効果証明にしない |
| trigger_coverage / latching / existing / starts / sequential | 供給起点と保存ledger/実行の整合 | P09: 正本由来の全機会の欠落がないこと、最初の機会/失効/見送り |
| typed生成/消費/失効/挑戦lifetime | 供給遷移上のexact行変更・他状態保持 | 過去生成起点、型以外の効果全体、全履歴の認証 |
| generation_entry | local edition/fresh remote/履歴registryを確認して生成するAPI | P13: 非空approval_referenceは認証ではない。生成前の権限主体・対象・失効・再利用防止。現状APIを本番に呼ばない |
| generation_journal / generation_package | byte列/順序/保存内容の整合 | P14: OS実生成の由来・結果より前の信頼時系列。合成fixtureを認証へ昇格しない |
| input_lock.verify_git_binding | local commit/blobの不変内容 | P15: remote完全package、事前edition、承認対象・時系列。返すinput_lock_verifiedはfalse |
| remote_publication.verify | fresh exact-ref/commit/tree一致 | 承認・生成由来・結果前固定は証明しない。既存機能を再実装しない |
| attempt_runner / batch_supervisor | local binding/package/edition/remote、予定400行保持・停止記録 | P13〜17: 認証済み開始gateへ合成。名前after_external_approvalだけで許可済みとしない |
| admission / 旧readiness460 | 算入条件/明示未証明、歴史checkpoint | 現行editionの全必須証拠への共通gate。旧source hashや460を変更して通さない |

生成承認と開始承認は別。今回どちらも取得せず、seed生成・本番入力固定・400戦は0。外部承認の信頼主体/認証方式は既存正本から未確定（P13）。準備後にユーザーの最終確認を取り、完全manifest保存後も開始前に別確認する境界を維持する。

## 新発見と台帳への反映

- I-poop1の置換入口は明示拒否が残る。静的41種登録を全handler完了としないため、P08/P19の到達条件に具体化した。新しい裁定の追加ではない。
- 比較値をreceiptのまま信用すると、両側+7の自己整合した偽値を旧lifetime監査が受け入れる（P11）。独立の正本数値監査を追加した。
- 独立レビューで正本02「最低0、上限なし」に対し、既存challenge.statsと追加監査が負値を返すことを発見（P11）。既存実handlerの未接続ルールとしてRED→GREEN修正。歴史runtimeの固定sourceを変更するとanchor検査が拒否したため、旧file/hash/manifestを復元・維持し、現行challenge接続scopeに最終下限adapterを追加した。全補正は既存statsで計算し、監査側は別に再構成する。

- P22追補: M-antlion-01は準備軽減能力の接続と、main自身の移動経路を分ける。旧birthイベントにはcandidate_variant/payment_effect_idsがない。main_movement価格監査がこの旧経路も証明した扱いにはしない。transform候補はあるが旧handlerがbirth以外を拒否するため、current107内の未接続実行経路として必須に追加した。

- P22完了追補: 前項の旧executor拒否は現行main_routes.scopeによる既存batch登録で解消した。旧ファイルの拒否文を削除せず歴史版を保持。現行のbirth/transformと旧birth形式の監査を検証し、全機会や選択operandの完全証明へは昇格しない。

[107本文の予約・人物除去到達条件](2026-10-08-preflight-source-closure.md)で全41本文の作用先と条件付き閉包を整理。実意味/dispatch/起点結合を残し、P06やI-poop1非到達を実行証明へ昇格しない。
