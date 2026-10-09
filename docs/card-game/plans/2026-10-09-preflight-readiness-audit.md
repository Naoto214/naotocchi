# 400戦前の残工程横断監査（2026-10-09）

基準HEAD `8286fbc639c3a12fdb6434a71504cc39b35a2a6b`。fresh remote exact-refと独立cloneのHEAD一致を確認した。対象は `design/card-pool-master-20260914` の `docs/card-game/` のみ。PR259はDraft/open/unmergedを維持する。

**preflight-ready=false。生成準備、生成承認、入力固定、開始承認は別段階。今回のseed生成・本番入力固定・400戦実行は0。** 旧116除外、指定mandatory policyの限定範囲、policy promotion=false、独立balance標本0、全体結論nullを維持する。

## 数え方と現在地

正本は既存[22項目台帳](2026-10-08-preflight-remaining-work.md)。41種類/80現物は107固定デッキの分母であり、全ゲーム505種類や全機会の分母ではない。既存route inventoryは登録先の観測であり、全効果・全到達の完了証明ではない。

| 管理分類 | 件数 | 現在の意味 |
|---|---:|---|
| 必須 | 18 | P01〜P05、P07〜P18、P22 |
| 条件付き | 2 | P06旧予約・置換、P19新発見。到達可能なら必須、未発生だけでは免除しない |
| 本番開始後でよい | 2 | P20実400行の算入/集計、P21実時間/観測。保存仕様は事前必須 |
| 必須中の局所実装・回帰を既存台帳で達成 | 6 | P01〜P05、P22。初期起点/全機会/認証を含む総合完了ではない |
| 必須中の残る大項目 | 12 | P07〜P18。今回P11の費用operand結合を進めてもP11全体は未完 |

完了率は出さない。22は大きさの異なる管理項目であり、41/80はカード集合、局所テストの成功数は条件付き入力の数である。これらを同じ分母にできない。残り12項目を「12個のhandlerを新設」とも数えない。

## 全残件・依存・完了条件

| ID | 現在の実装と残り | 既定実装か設計判断か | 完了条件/依存 |
|---|---|---|---|
| P01〜05、P22 | 次勝利消費、挑戦終了、main離脱/再登場、typed10source生成/寿命、交際軽減、M01移動は接続済み | 既定の局所実装済み | 現行版回帰をP18で維持。これだけでP07〜12を完了としない |
| P06 | payment2/stat7/conditional1はtyped化済み。旧reservations空を要求する入口が残る。I-poop1/I-bond1、時3以上自装備を要求するG-asteroidsは107本文集合下で条件付き非到達 | 到達閉包は既定。到達が判明し本文が曖昧ならP19 | [source閉包](2026-10-08-preflight-source-closure.md)を初期80現物、再登場、全遷移保存、全handler意味、全機会へ結合。静的表/空予約観測だけでは不可 |
| P07 | 各種全差分、逆順解決、外側連鎖、終了4source→失効/終了順まで接続。全dispatch優先境界の合成が残る | 大半は既定。main/装備の捨て到着順は根拠未確認で判断保留 | automatic_binding/各effect監査/coverage/resolution_order/end_dispatchを全到達phaseへ結合。差分正しさと先行義務完了を別証明。discard_arrival_order_proven=falseを保持 |
| P08 | source_inventory、normal/response/準備/盤上の各predicateとexpansionは存在。I-poop1置換入口は明示拒否 | 到達証明/既存predicate結合は既定 | source41の生成/再登場を含む全候補、早期除外、未知源の未証明保持。handler登録があるだけで合法集合完全としない |
| P09 | starts/latching/existing/sequential/coverage/order、見送り・不適用閉鎖、終了dispatchは局所結合済み | 472承認Aの順序は既定 | 全正本機会の発生・最初の窓・見送り・失効・deferred起点と実順序。全ルール機会flagはfalse。単一既存unitのnormal29/response89全行coveredは全域証明でない |
| P10 | 通常/responseの実判断recordについて有限の非公開山札/相手手札非干渉、全state hashと許可view参照の分離済み | 既定の情報境界の検証 | 相手伏せidentity自体、全経路の実read、後で公開される情報の先取り等へ拡張。hash参照一致だけで情報利用合法としない |
| P11 | 挑戦印刷値・最終0下限・実移動費用済み。今回比較行の支払/残り時をcore/handの根拠へ結合 | 今回部分は既定。新値付け/期待値/優先順位は対象外 | 未対応盤上費用、上位優先値/成長/将来効果/response比較operand、全履歴由来を結合。未知は0点化しない。operand_provenance_verified=falseを維持 |
| P12 | 指定5種policy、frame/選択/適用、journal/入力rootへの局所結合あり | 463〜465の既定範囲 | 全判断網羅、指定外116の除外伝播、生成前root/lockへ結合（P14〜16）。通常/response/任意誘発への拡張禁止 |
| P13 | generation_entry/attempt_runnerは非空approval_referenceを要求するが権威を認証しない | **信頼主体/認証方式は新設計判断が残る** | 生成と開始の別対象、権限主体、改竄、再利用、失効を認証する方式を確定し拒否試験。API名や文字列を承認証拠にしない。実承認は準備後の別段階 |
| P14 | historical registry/material protocol/journal/packageあり。provenance/結果前時系列はfalse | 既定機械検査＋P13の信頼方式に依存 | OS材料の由来、履歴除外、初期順/選択seed分離、事前edition、全400行結果前固定を信頼鎖へ結合。本番材料を今生成して試さない |
| P15 | local immutable blob/commit bindingとfresh remote ref/tree検査、edition照合あり | 既定結合＋P13/14依存 | 全generation packageのremote保存、承認対象、時系列、manifest/lockを共通gateへ。fresh remote単体ではlock認証でない |
| P16 | admissionが未証明/除外を保持。readiness460は旧固定executorの静的証明 | 既定のgate合成＋P13依存 | 現行edition用に全必須/条件付き証拠の否定ケースを合成。旧460/hash/manifestを書換えて通さない。準備完了を実行許可にしない |
| P17 | supervisorは予定行保持・未完/不正で停止・自動retryなし | 既定の保存/停止結合 | 中断/重複/欠落/版変化をP16付きで再検証。失敗を削除/差替えせず保持。新retry/resume policyは導入しない |
| P18 | 局所/結合・design・保護正本・review・Git Data保存の仕組みあり | 既定 | 固定最終Python、必要回帰、未解消失敗明示、独立review修正、fresh remote HEAD/treeと全変更blob照合。過去PASSを現行全proxyへ読み替えない |
| P19 | 新しい正本不足が見つかった場合のみ増える | 一意なら既定実装、不定なら設計 | 原因とID/完了条件を既存台帳へ。曖昧さを乱数/同値化/値付けで埋めない |
| P20/P21 | 実結果と実時間/頻度は未取得 | 本番後 | 事前固定された400行全体、鏡像群、completed/excluded/unprovedを保持。除外/未証明があれば全体結論null、subsetは診断のみ |

確認した実装入口は `proxy_population_challenge_window`、`trigger_coverage`、`decision_binding`、`selection_basis`、`readiness`、`admission`、`generation_entry`、`attempt_runner` 等。全カードのsource/handler対応は既存[handler監査](2026-10-08-preflight-handler-and-gate-audit.md)とsource閉包を参照する。古い対応表に残る「次に接続」は末尾の追補/最新コードと区別した。

## 継続順と概算

1. P07〜09をsource/phase別に閉じ、P06の条件付き非到達を実遷移へ結合する。
2. P10〜12を候補・比較・選択の入口へまとめて結合する。今回の費用operandはこの段階の一部。
3. P13の具体的信頼方式を確定した後、P14〜17の認証/事前固定/共通gateを合成する。
4. P18を固定版で完了し、初めて生成承認を判断できる状態にする。完全manifest保存後の400戦開始承認はさらに別。

作業のまとめ方としては、閉包2〜3、判断/情報2〜3、認証/gate1〜2、最終照合1〜2の**6〜10個以上のbundle**を仮置きする。これは実測工数ではなく低信頼の工程分割で、実装量が均等という意味でもない。P07/P09全到達閉包、P10全read境界、P13信頼方式の詳細と検証量が未確定のため、所要日数・人日は未見積り。追加発見でbundle数も増え得る。日付や残り数ターンでの完了保証はしない。

## 今回の既定実装継続

`proxy_population_payment_operands.audit_normal` は、実normal比較の全行IDをadmitted行/法定候補projectionへ対応させ、既存core/handのsource-pinned predicateをfresh再計算する。supported行のpayment_timeと実actor時からの残り時を比較行へ結合し、同額の+1/-1改変、bool、欠落、重複、別ID、偽sourceを拒否する。pass/挑戦は01/02の時0として扱い、現物コストや未対応盤上sourceを時0と推定しない。

現行実入口へ結合した。E-boss等のproblem=Noneでは「比較なし」を適合証明にしない。費用が正しくても他の優先値・情報実使用・履歴起点・全算入は未証明。歴史selector/executor/source pin・指定policyは不変。今回の初回実装テスト1FAILはE-bossにもproblemがあるというテスト側仮定の誤りであり、実支払不具合や漏洩として数えない。

検証結果・review・保存照合は `data/proxy-population-effective-application/verification/payment-operands-*` と既存台帳末尾を参照する。全proxy回帰の今回完了は主張しない。
