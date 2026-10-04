# 460 ledger — plan: plans/2026-10-04-population-contract-validator-459.md

Base HEAD 3ab01fd598e478b502964193f9c91475d7367c24, tree 7763ae0ef83980fd1ed198c952b237209f31122e. PR259 Draft/open/unmerged fresh. Existing isolated CARD GAME checkout; docs/card-game only.

Ruling: 459の静的実現可能性gateを先に確認した。01/02と117の固定必須選択処理から、初回たまご交換は7現物からの116 seeded fallbackである。seed/初期順に依存せず全体適格条件に到達不能。458 §7に従い、このpolicyを変えずに実行readyとはしない。誤りなら不必要に実行を止めるためsource固定・証拠検査・独立レビューを要する。

Ruling: 不可避除外が確定したため、400戦の目的・policyについて判断確認を優先し、実行器全接続・全41ID機会adapterの残り実装を保留する。原計画の停止条件が直接禁止するのは大量実行/readinessの認定であり、非実行validator実装そのものではない。今回protocol/manifest構造検査、静的適格性preflight、実行を拒否する共通入口までTDDで具体化して保存する。459全タスク完了とは報告しない。実際の判断/対戦/群の適格認定validatorは未実装のまま残す。誤りなら実装を早く止めすぎるが未検証適格認定は生じない。

Interfaces: protocol結果はmanifest/preflightに渡す。manifestのstructurally_validとvalid（来歴認証を含む）を分離。preflightの静的到達不能と、未実施400戦/200群の未証明分類を分離。459原契約は不変。

保守性監査（read-only、前turn）: カタログ452固定値、107/114候補表、複数moduleの能力登録はカード追加時の対応事項。共通ID/state/hash/効果handlerは再利用可能。今回の固定107計画の前にカード追加用改修は不要。全能力汎用化・過去adapter統合・本文自動実行化へ広げない。

Progress: Task1 RED pending. Task2 pending. Static preflight/entry pending. Final review pending.

Task1 complete: 5 RED→GREEN; approved protocol/source/path/strict JSON verification.
Task2 partial: 4 RED→GREEN plus structure-only scope test RED→GREEN. Membership and supplied historical-order recomputation tested; trusted receipt/history/generation verification blocked/unimplemented.
Static preflight/entry: 7 RED→GREEN; proof revocation on source change, unchanged-policy exclusion, no actual reclassification, execution unavailable. Dedicated suite 17 PASS.
Task3–5 deferred at the explicit feasibility boundary; no claim of actual all-judgment/match/group admission implementation.

Self-check: exponent overflow JSON 1e999 could evade parse_constant; existing JSON test extended, RED observed, finite parse_float added. No new semantics.

Final review: Critical 0 / Important 1 / Minor 1. Important橋渡しsource pin漏れはtrajectoryとbatch_runner変更テストRED→GREENで修正。Minor停止理由の表現は上記Rulingを訂正（意味論変更なし）。残り実装を保留するのは今回の判断である。

Final verification: dedicated18 PASS; related118 PASS (includes dedicated18); npm406 PASS; design errors=[]; existing3590 blobs unchanged except README index; preflight regeneration byte-identical. New seed/order/match/replay 0. Independent review one; all findings resolved.
