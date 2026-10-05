# 467 — 初回responseの選択境界・両者pass・通常行動入口の結合

2026-10-05 JST。開始remote/local HEAD `28a178f74fa052fc8edb28d3f300661da3b77e89` / tree `e47abe09aec393622710a2662196d4cedf5d981a`一致。PR259 Draft/open/unmerged。docs/card-gameのみ。[計画](plans/2026-10-05-population-start-window-467.md)、[ledger](data/proxy-population-start-window-467/ledger.md)。

## 完了範囲

466の最初のresponse候補証拠を、既存119の唯一候補規則と138の開始時pass遷移へ接続した。供給bundleから466を再構成し、初回responseの選択根拠を判定、**唯一候補passの場合だけ両者の機会を記録して通常行動入口まで検算**する。最初に複数合法候補があれば、その機会で未選択のまま止まる。

`tools/proxy_population_start_window.py`を追加。既存実行器を置換していない。実験用seed/root生成・400戦入力固定・新対戦・保存12run再実行なし。testは合成局所state、固定合成root、歴史115の順序を反復した非独立in-memory bundleのみを使う。これらの局所prefixを新たなbalance対戦に数えない。

## 判断種別と選択根拠

|初回機会|合法性・情報|選択根拠|適格性|
|---|---|---|---|
|先手、passのみ|466の初期境界/全候補を再検査|既存119/120 `response_unique`をそのまま使用|policy_eligible/balance_admitted null|
|先手、G-hit-blow/I-c_coin2等の複数候補|完全な現物・宣言候補は保持|未証明、選択しない。seed proofなし|未証明のまま。旧fallbackを使用すれば除外|
|先手の唯一pass後の後手|時0、手札5、盤面/準備/予約/捨て札空。全107 quick-useの時が1以上|候補はpassのみ、既存response_unique|対戦適格へ昇格しない|

先手は時1/手札6、後手は時0/手札5であり、鏡像でownerやデッキを交換しない。後手の各手札現物について、非quickと時不足を明記する。未知のfamilyや時0のquick-useが現れた場合は停止し、勝手に除外しない。107の41 IDを後手の合成局所手札へ一つずつ置く横断testを行う。これは真正107デッキmultisetを認証するテストではない。真正供給デッキは465/466 bundle wrapperが別に検査する。

唯一候補は`selection_status=existing_contract_unique`、戦略比較の`strategic_unproven=null`。複数候補は`selection_status=unproved`かつ`strategic_unproven=true`。唯一候補を戦略最適性の証明と読み替えない。どちらもpolicy_eligible/balance_admittedはnull。

旧120の比較器は未登録カードについて数値0を返す実装を持つ。今回その多候補比較を新しい正当化として呼ばない。G-hit-blow/I-c_coin2の未公開山札の結果を覗かず、期待値・点数・同価値・恣意的優先順位を追加しない。MRPはresponseへ適用しない。`excluded_if_used`は旧fallbackを将来用いた場合の契約境界であり、未実施400戦を除外済みに分類した値ではない。過去119/120/116の記録を再分類しない。

## 状態と判断機会

local `assess_initial_response`は初期stateに条件付けた検算。後手の評価には先手pass済みという条件があるため、`entry_authenticated=false`と`origin_assumption`を残す。任意callerの主張から後手機会の真正性を承認しない。

`reconstruct_initial_window`は空chain/未処理誘発なし/初期v1 runtimeから順番を固定し、先手の実際の唯一passを再構成した後だけ後手を審査する。呼出側のcontext・選択・ordinalを採用しない。初期機会index1→後手index2→閉鎖index3、event seq2→3→4。最初に複数候補ならevent追加0、opportunity1件、seq2のままであり、後手機会が発生済みだったとは記録しない。

既存138のpass event、snapshotとcontinuation hash規約を維持する。通常行動へ戻った後も旧contextの表現は変更せず、game phaseとwindow_closed/next_opportunityで到達点を示す。全card lookupを含むsource/final envelopeと全record比較を追加し、lookupを除く旧game hashだけで一致判定しない。

`build_start_window(bundle, match_id)`は466を初期入力から再構成し、その全体C hashと供給bundle hash、source envelopeの完全一致を結合する。真正な独立入力/結果前lockを認証したわけではない。466の未証明欄を上書きせず別版の証拠とする。

## validator / CLI

```
python docs/card-game/tools/proxy_population_start_window.py --bundle PATH --record PATH --match MATCH_ID
```

strict JSON。全recordのcanonical再構成で欠落/追加/型/順序/選択/lookup/runtimeの差替えを拒否する。記録整合は`record_verified`、window閉鎖は別の`window_closed`。未解決で止まったrecordも正しく再現されれば前者trueになり得るが、選択済みや対戦適格にはならない。不一致時のwindow_closedはnull。

CLIは整合でもexit1（準備未完了）、不正はexit2。実行・生成オプションなし。ready_for_input_generation/ready_for_executionはfalse固定。供給policy rootをstdoutへ出力しない。

## 残る本線

- 最初の複数response候補の選択根拠、通常行動の完全候補・選択・適用、発動/連鎖/効果の接続。
- 全5 mandatoryの実際の効果解決入口への結合、後続ターン/自動処理の義務台帳とO、全期間の判断機会網羅。
- 独立入力の生成来歴、歴史入力台帳、真正な結果前lock、実行source全体の固定。
- 判断→対戦→鏡像→400戦の算入審査。除外/未証明の後落としは禁止。

今回は全400戦が必ず不適格になるという証明ではない。どの入力で複数responseが残るかを調べる目的でseedや実験順序を生成・選別していない。唯一pass経路の局所接続を、全予定集合のbalance結論や実行準備完了へ一般化しない。新方式未採用・独立balance標本0。

## 検証

専用12件を逐次RED→GREEN。全41IDの後手候補、両先手側のpass2件とhash連鎖、hidden順序非依存、供給bundle結合、改変拒否、read-only CLIを検査。独立hash計算testで当初pretty JSONを用いた誤りは、既存canonical（compact sorted JSON、LFなし）へ訂正。実装側のhash規約は変更していない。

source39件を固定。関連検証・npm・保護blob検査・独立レビュー1回は[verification](data/proxy-population-start-window-467/verification/)へ保存。全proxy回帰ではない。114・116・119・A初版・505・454〜466・過去結果・72件の別扱いを維持。

最終結果：専用12件を含む関連224件PASS、npm406件PASS（npm-retry.txt、初回ログの終了集計欠落のため再確認）、設計検査errors=[]。既存追跡3,712 blob中、README索引以外3,711件の一致。独立レビュー1回はCritical0 / Important0 / Minor0。reviewerは専用12件と混在9候補・v2 scope拒否を確認。最終検証梱包はレビュー後。
