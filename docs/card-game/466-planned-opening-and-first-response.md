# 466 — 予定bundleの初期loader・初回判断機会・response候補接続

2026-10-05 JST。開始remote/local HEAD `a514b4663b3eb71660e1e8810908f49351493f9a` / tree `cd1588de2f1ff428c38b8bd833112fa42fd89b30`一致。PR259 Draft/open/unmerged。docs/card-gameのみ。[計画](plans/2026-10-05-population-opening-466.md)、[ledger](data/proxy-population-opening-466/ledger.md)。

## 今回の前進

465は任意に供給されたafter_normal_draw/効果解決入口に条件付けた局所検算だった。今回は**供給された400戦bundleの1行から初期107 stateを構成し、通常draw直後の実際の途中stateを作り、初回mandatory O・全候補・選択・event/snapshot/hash・最初のresponse入口までを一体で再構成**する。

既存runnerは保存135のroute/prefix・旧mandatory/response seed profileに結び付いている。これをMRPへ改名せず、新しいoffline APIで初期接続を分離した。現行runnerの置換や本番採用ではない。通常/response選択、後続ターンの実行を開始するAPIは追加しない。

- `tools/proxy_population_opening.py`: load_match / reconstruct_opening / audit_opening とread-only CLI。
- `tools/proxy_population_first_response.py`: enumerate_first_response / build_first_response / audit_first_response。
- source固定：[sources.json](data/proxy-population-opening-466/sources.json)の34件。旧tools・正本・過去結果は変更しない。

## 入口と初回義務台帳

load_matchは465 bundle構造を再検査し、group/ownerの全40現物をそのまま読み、既存117の初期規約で各手札5・そだち20・時0・たまご・空の盤面/捨て札/予約を構成する。鏡像でowner/deckを交換しない。先手だけが変わる。135 path ID・保存seed profile・過去の選択は参照しない。

reconstruct_openingの処理順は01/02/64/107から固定：

1. R1・先手の初ターンを開始し、時1/ターン内flagを更新。
2. 通常draw1枚。ここで6枚の途中stateを保存。
3. 465のafter_normal_draw入口へそのstateを渡し、たまご追加draw1枚を適用。
4. 7現物の完全候補から、464のMRPで選択して手札1枚を下へ戻す。
5. 最初のresponse_windowへ渡す。priority_actorは先手、chainは空、pass0、opportunity index1。

Oは`[先手,1,先手,"turn_start",0,"egg_exchange_bottom","selection",0]`。callerやログ件数・retry回数から採番しない。turn_countsは先手1/後手0。初期状態に盤面・予約がないことと各処理のstateを結合した`initial_turn_obligations_466.v1`を保存する。これは**初回107 prefixだけの義務台帳**で、後続自動処理・効果解決ordinal・全41IDの全ゲーム中機会を証明しない。

このAPIは初期40枚/5枚手札を検証してから使うので、初回の通常draw/追加drawはいずれも可能。空山札などの一般局所処理は465の契約で保持しているが、466初回入口にその局面を偽装して渡さない。

## event / snapshot / hash接続

既存117の2event形（turn_start_and_egg_draw、egg_exchange_bottom）、seq0/1/2のsnapshotを保持。通常draw直後の6枚stateは、結合eventの中間証拠として別欄に置く。イベント件数を増やしてOを変えることはない。

既存game hashはimmutable card lookupを除く規約のまま。lookupを含む初期state全体のC hash、供給bundle hash、行policy digestを併記し、全recordのcanonical再構成で照合する。lookup改変を旧game hash一致だけで見逃さない。

最終stateは既存continuation_envelope.v1へ接続し、その全体hashも保存。選択した現物/領域順序/response context/runtimeを比較する。保存choiceは再構成への入力にしない。共有moduleの別版scopeが有効でcontinuation版が変わっていれば停止する。新しいevent/hash規約や過去recordの書換えはしない。

## 最初のresponse：合法候補まで

107に含まれる全41 IDを、初期の空盤面・空捨て札・空予約・非challenge・先手時1という境界で横断検査した。全手札現物から手札quick-useと通常行動を分け、準備済み専用/場の能力を手札能力として扱わない。

- G-hit-blow：7種の宣言を既存stable IDで列挙。
- I-c_coin2：対象なしの既存1候補。
- その他の初回候補：時不足、対象なし、challenge条件なし、手札quick-useでないことをそれぞれ記録。
- 空の盤面/準備/予約と本人既知情報を保持。他方手札や山札内容を選択材料として読まない。hidden山札順を変えても候補/viewは同一。

これは新カードの優先表ではなく、固定source版・最初のresponse境界に限定した合法性adapter。新しい版/未知のaffordable条件は停止し、似た本文を自動実行しない。conditional helper単体のentry_authenticatedはfalse。bundleからprefixを再構成するwrapperが、その供給入力への結合を検算する。helperは真正107デッキinventoryの認証器ではない。

**responseの選択は未評価。** 唯一候補でも全対戦の適格とはしない。複数候補へMRPを適用せず、未知の結果を0点/同価値として新しい比較を作らない。119/旧116の選択・除外境界は不変。後続responseの実行/両者pass/normal到達を今回の候補証拠から補完しない。

## validatorと非実行CLI

```
python docs/card-game/tools/proxy_population_opening.py --bundle PATH --record PATH --match MATCH_ID
```

strict JSONで読み、recordに含まれる保存選択を使わずbundleから再構成し、全field/型/順序を比較する。整合してもexit1（未準備）、不正はexit2。seed生成/実行オプションなし。rootの値を出力しない。

`opening_verified`、`first_turn_obligation_binding_verified`、`first_mandatory_candidate_binding_verified`は供給bundleに条件付けた初回範囲だけ。`audit_first_response.candidate_binding_verified`も最初の合法候補の結合だけ。policy_eligible/balance_admittedはnull。opening auditのready_for_input_generation/ready_for_executionはfalse、response auditはready_for_execution=falseを返す（ready_for_input_generation欄は持たない）。local recordが元から持つ未認証gateを書き換えず、別版sidecarで完成範囲を示す。

## 残る準備

- 独立初期seed/policy root採取来歴、歴史入力台帳、真正な結果前bundle lock、実行source完全固定。
- 初回response以後の通常/response選択・実適用・連鎖、全5mandatoryを実際の効果解決入口へ結合。
- 後続ターン/自動処理/全効果解決の義務台帳とO、全41IDの全期間の機会網羅。
- 全判断→対戦→鏡像→予定400戦の算入審査。旧116除外と共通gate未証明を維持。

新しい比較意味論を仮置きしない。400戦全体の適格性や実行準備完了は未成立。初回prefixの検算が通ったことを、本番開始・新方式採用の承認へ読み替えない。

## 検証と保護

専用15件をTDD。初期loader3、開始処理3、audit3、CLI1、response5（41 ID横断を含む）。同名現物testは107自体の同owner各名1枚という構成とは別の合成lookupで、列挙の非縮約だけを検査。カード定義や実験入力を変更していない。

unit材料は過去115のseed/orderを反復する不適格なin-memory bundleと固定合成rootのみ。新しいseed/rootの採取・実験用入力固定・新対戦・保存12run再実行は0。unit出力をbalance標本や新しい400戦manifestとして保存しない。

関連suite/npm/design-data/保護blob/独立レビュー1回をverificationへ保存する。全proxy回帰とは表現しない。114/116/119/454〜465/A初版/505/過去結果・72件境界を維持。新方式未採用、独立balance標本0。

検証完了：専用10件＋response5件、これらを含む関連187件PASS、npm406件PASS、design-data errors=[]。既存追跡3,689 blobはREADME索引以外の3,688件が一致。独立レビュー1回はCritical0 / Important0 / Minor1（response auditのreadiness出力欄について本文の適用範囲を明確化、動作変更なし）。最終検証ログ梱包とREADME索引はレビュー後。
