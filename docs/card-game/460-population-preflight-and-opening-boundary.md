# 460 — 400戦preflight実装と初回必須選択の適格性境界

2026-10-04 JST。開始時remote/local HEAD `3ab01fd598e478b502964193f9c91475d7367c24` / tree `7763ae0ef83980fd1ed198c952b237209f31122e` 一致、PR259 Draft/open/unmergedをfresh確認。docs/card-gameのみ。

## 結論と停止理由

**現在の107初期条件・既存必須選択処理を維持した実行では、初回たまご交換が必ず116 seeded fallbackとなり、全予定対戦が適格であるという458/459条件に到達できない。** seedや初期順を変えて解消する問題ではない。

これは400戦を実行した結果ではなく、下記の固定sourceに対する静的な含意である。未実施の400戦を「除外済み」へ分類せず、予定400戦/200群は未証明・未実施のまま保持する。判断機会数は未観測なのでnull、適格部分0、全体勝率・結論はnull。将来の別policyまで不可能とは主張しない。

458 §7と459 Task4は、不可避116除外が証明されたら実行readinessを閉じ、規模承認だけで大量実行へ進めないと定める。今回この判断境界に達し、目的・policyの確認を優先して残り実装を保留する判断をしたため、**459全工程の実装完了・実行準備完了とは報告しない**。新しい選択意味論、116の緩和、評価目的の変更は行っていない。

## 静的証明の根拠

|前提|正本／実装|含意|
|---|---|---|
|初手5枚、マリガンなし、先攻R1も通常1ドロー|01 デッキ|初回開始で6枚|
|開始時メインはたまご、通常ドロー後さらに1枚引き手札1枚を下へ|02 たまご、01 開始順|行動機会前に7枚からの必須選択|
|時回復からたまご交換の間に別発動を挟まない|01 ターン開始、06参照|選択前に通常たんじょう等で回避しない|
|107の各40枚は異なる現物ID。最初の盤面・予約は空|107 fixture、117 `build_initial_state`|全順序で7つの現物候補。同名を同値扱いしない|
|必須選択resolverは無条件でseed proofを作り、seeded/strategic_unresolvedを記録|117 `build_mandatory_choice_decision`|手札内容や先手A/Bによらない|
|135 `run_route` が上記resolverを呼び、現在のcontinuation runnerは135 prefixから開始|135、`proxy_continuation_runner.run_route`|現在の実行接続を維持する場合の不可避性|
|seededまたはstrategic unresolvedが1件でもあれば対戦を独立balanceへ算入しない|116|その経路の適格完走は不可|
|全400戦/200群の適格が必要|458/459|予定集合全体のbalance結論を許可できない|

115の「通常行動契約はたまご交換の比較規則を持たない」という境界も維持する。過去4経路や12runの観測を200組へ統計的に一般化した証明ではない。今回の機械検査は、レビュー可能なこの証明が依拠するsource版・protocol・現物在庫を認証するもの。Pythonプログラム一般の定理証明器ではない。sourceが変われば結論を再利用せず`unproved`へ落とす。

## 今回実装したもの

- [proxy_population_contract.py](tools/proxy_population_contract.py): 459 artifact SHAを信頼anchorとして全値/型と21 sourceを照合。strict JSON、重複key/非有限数、path逸脱拒否。manifestの200群/400行・一意ID・鏡像・偶奇実行順、policy、現物多重集合、提供seedの全順再計算、行入力hashを検査する。
- [proxy_population_readiness.py](tools/proxy_population_readiness.py): 初回必須選択の静的証明sourceを追加固定し、protocol/manifestの不足と不可避116除外を区別して返す。
- [proxy_population_entry.py](tools/proxy_population_entry.py): `--manifest`/`--receipt`を受ける**非実行preflight入口**。stdoutにcanonical JSONを返す。実行/生成オプションなし。保留exit1、構文不正exit2。将来の400戦を実際に走らせるdispatcherではない。
- 専用テスト2本。過去sourceやhandlerは変更していない。

```bash
PYTHONDONTWRITEBYTECODE=1 python docs/card-game/tools/proxy_population_entry.py
```

現在の正常結果はexit1（readiness保留）。[preflight.json](data/proxy-population-readiness-460/preflight.json)に保存。`ready_for_input_generation=false`、`ready_for_execution=false`、独立balance標本0、新方式未採用。

`manifest.structurally_valid`は**実装済み構造検査のみ**の成否。生成来歴、歴史台帳の完全性、Python/実行source版の最終固定、結果前lock認証は未実装/未完了なので、`valid`はfalseのまま。自己申告のapproved・時刻・hashで開かない。459のfalse許可値も書き換えない。

行入力hashは`{first_player, players:[{player_id:A, deck_order_top_to_bottom:...},{player_id:B,...}]}`のsorted/indent2 UTF8 JSON＋LFのSHA-256。各群の全順序を両側が参照し、ownerは固定。既存state/continuation hashの規約は変更しない。このhash形式は接続表現の定義で、実入力の固定ではない。

## 未実装を残した範囲

459 Task1完了、Task2は構造検査まで。Task3〜5の真正な判断/対戦/鏡像群の適格認定、全機会validator、途中state証拠adapter、全41IDの正本由来機会台帳、実行dispatcher・新入力loaderの完全接続は未実装。既存455/456/457の結果をこれらの代替にしていない。

今回の`disposition_counts`は未実施予定枠の状態表示であり、供給runの実審査ではない。将来の実対戦証拠をこのpreflightへ渡して適格化するAPIはない。完全な算入validatorを名乗らない。

この停止は技術的なエラーではなく、承認済み選択処理と全体算入条件の組合せによる判断境界。新たな機会adapterを増やしても最初の116陽性は消えないため、ここで未承認の意味論を補って進めない。

## 保守性監査の将来対応を維持

前turnのread-only監査で確認したカタログ452固定値、新版候補表、複数moduleに分散した能力登録はカード追加時の対応事項。共通stable ID/state/hash/効果handlerは再利用可能。今回の固定107計画前にカード追加用改修は不要。全能力汎用化・過去adapter全面統合・カード本文自動実行化・hash/ID再設計は行わない。監査を再実施したcheckpointではない。

## 検証と保持

専用18件RED→GREEN（protocol5、manifest4、readiness/入口7、構造成功と認証の分離1、レビューによる実行器接続版の失効1）。manifest試験は抽象ID群および既存115の保存入力をメモリ内で反復した非独立テストデータのみ。本番200組のseed・全順序・manifestは生成/保存していない。保存115の提供seedによる順序検算はゲーム再実行ではない。

関連suite・npm・設計データ検査、保護blob照合、独立レビュー1回の最終結果は [verification.json](data/proxy-population-readiness-460/verification/verification.json) / [review.json](data/proxy-population-readiness-460/verification/review.json)。[ledger](data/proxy-population-readiness-460/ledger.md)に停止判断とTDD範囲を残す。全proxy回帰は実施していない。

459の200群/400戦計画、454〜459、114・A初版・116・119・505・過去結果不変。72件の旧方式適用限界は別扱い。過去の未証明・seeded判断を再分類しない。新カード・新seed・入力固定・新対戦・replayは0。

## 次に必要な判断（未採用）

- 全体適格を必要とする目的を維持するなら、初回たまご交換を含む必須選択の選択根拠について別版設計が必要。既存正本だけから新しい優劣は導けない。新方式採用や成功は保証しない。
- 現行116の選択処理を維持して400戦を行うなら、独立balance標本ではなく非算入の診断実行へ目的を変更する承認が必要。現在の459計画を黙ってこの意味へ置き換えない。

どちらも今回採用しない。計画を維持したまま判断待ちで停止し、seed生成・入力固定・新対戦を開始しない。
