# Execution ledger — PLAN.md
- Baseline f69f16d6: 24/24 Home tests pass.
- Merged current remote main b3f8f4f7 into working tree; preserved Home and Conversation v2 changes; integration baseline 42/42 pass. Merge not committed yet.
- Ruling: use existing isolated clean worktree; initial clone exhausted disk and its incomplete temporary pack was removed. Other work preserved.
- Ruling: proceed through requested design/implementation/publication without redundant approval, as explicitly authorized.

- Implemented shared Home compositions, opt-in wind/life, Canvas fallback for unavailable WebGL, private visual RNG and bounded population.
- Fixed per-actor deadline starvation, long-held pointer priority, partner nested facing, reduced-motion zero-step, import generation race and style cleanup. Independent review completed; all material findings addressed.
- Visual QA found and fixed the old poop-anchor offset and dummy world-player shadow. Car orientation follows the horizontal road.
- Browser observation: forest repeat 143s, water 106s, city 115s; Canvas only, ~1.1fps remote update limitation. GPU/iPhone not verified.
- Full broad run 3213 cases, 5 stale-token/camera-fixture failures resolved; explicit rerun/remaining relationship + conversation 140/140. Home integration 48/48; renderer 41/41; input 12/12; Naopoyo existing rescue 205/205.
- Browser crop export became unreliable; contact detail HTML preserves exact screenshot regions. Do not claim all requested per-region crop/video artifacts were produced.

## Delivery receipt — 2026-10-22 16:17 UTC

GitHub runtime commit 53dcb210990033ee6a687fb41cd4d947292081a3 matches the validated local tree. The existing owner-private Site version 2 deployed successfully from source 9fa76d2b6297e61c5f5af74657a7619f0ac38069. Runtime file hashes and isolated preview save keys were checked. Anonymous navigation shows the sign-in gate. Authenticated published runtime and human iPhone Safari QA remain unverified; see REPORT.md. Draft #426 is retained and main / production Pages are untouched.

## 追加検証

最新main 4a70f2c（Conversation postgame）を統合。レビューで再現した描画復帰障害と視覚QAで見つかった地面位置のずれを修正。390px幅で3地域を各60秒以上再観察し、5種類の画像（切り出し含む）を保存。最終結果・未確認事項は [followup/REPORT.md](followup/REPORT.md)。
