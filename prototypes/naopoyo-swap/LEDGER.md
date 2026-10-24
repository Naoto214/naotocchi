# Implementation ledger — SPEC.md section 13
Base: db9ea8e8d86c632a68ed8ab4880968803f78a243
Approval: 2026-10-20 implementation, simulation, independent branch/Draft PR, owner-private Site. No main/Pages/existing game changes.
Preflight: shared board/config between state, resolver, supply, engine, UI, replay; one engine for all consumers.
Ruling: compact numeric cells (species*8+stage; 0 empty), without identity IDs. Equal-looking pieces are interchangeable and replay needs only positions; cost: future per-individual history would require migration.
Ruling: keep small config/random helpers with state, and supply/rescue together until complexity warrants splitting; behavior and independent boundaries unchanged.
Ruling: follow user approval to perform simulations before human QA, which remains outstanding; do not infer human enjoyment from bot results.
Tasks 1–2: core RED assertions observed, then 23/23 GREEN (node --test tests/*.test.mjs). Initial generation 30 seed/settings cases stable.
Ruling: initial-generation exhaustion explicitly errors instead of unverified template fallback. Tested seeds do not exhaust; cost: rare seed may require restart, not silently biased replacement.
Task 3: 35/35 GREEN. R20 exposed equal-looking swap classification; explicit value-change guard added (RED→GREEN).
Task 4 storage: store RED→GREEN, suite 38/38. Save serializes preview/bags/RNG/history; replay exact. Corrupt source retained; stale writer rejected.
Baseline npm test blocked before changes by sparse missing character-3d/runtime.mjs; after materializing character-3d, vendor/three-0.170.0/three.module.min.js is missing. Not a new-engine failure; no claim of full repository suite green.
Task 4 UI: 39/39 test suite including fast-input gate RED→GREEN. Browser: real two-tap exchanges and reload retain board/moves/egg clock. Device Safari remains user QA.
Legacy scoped regression: 95/95 node tests for growth-clear and slide08 pass. Root npm test now reaches asset check, blocked by sparse missing assets/characters/author/naoto.png. Do not claim complete root suite.
Task 5 pilot: original one-step bot 180 runs (3/4/5 × 3/4/5/6 × 3 policies × 5 seeds), no clear within300. Avoiding low-stage clears made it freeze. Policy v2 rewards low-stage clearing, retained separately. Planner pilot records retained; blocked target approach corrected with a failing regression test.
Ruling: screening begins at 5 seeds/cell (180 runs) rather than 100; expand selected comparisons after meaningful policy behavior. Cost: wider uncertainty; all denominators disclosed.
Ruling: shuffle candidate must offer immediate reaction (stronger than <=2), preserving stage/species counts. If bounded search fails, preserve playable board and report rather than fabricate loss; cost: more unresolved reshuffles possible.

### 最終レビューと試遊版

- 独立レビュー: Critical/Importantなし。08寿命消滅のドラッグ予告を追加し、通常マッチより優先表示する。
- 予告欠落時の全消滅救済: 内部回復経路は予告を再構築。通常の破損セーブ読込は従来どおり検証で拒否し、原文を保護する。
- R25は低密度による早期returnではなく、実際に1手解なし・2手解ありの盤面で検証するよう修正。
- 5種族の初期余剰1体は種族0に固定（SPECのseed回転からの残差）。初期の純進化確保も種族0を優先する。保存済み比較の再現性を優先して今回は変更しない。focus戦略の種族0優遇との交絡をREPORTで明記。正式比較時は種族ラベル回転を追加する。
- 自動戦略の旧版結果を上書きせず保存。最終同条件比較はfinal-uniform-v4。旧manifestの簡略説明は当該実験の説明として残し、v4は到達可能ラインの割当計画を使用すると明記。
- 4種族・均等卵・4手・密度12/18を標準候補として維持。高段階化・密度16/24は比較条件であり、標準への採用根拠は不足。
- 旧28件はテスト設計として継承したが、R28の実機回転・Safariタッチまで自動検証完了としない。操作核の連打抑止とブラウザUIは検証、実機QAは本人確認項目。
