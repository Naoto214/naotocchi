# VERSION 20 — inspection controls candidate

## Scope and preservation

PR #501 remains Draft. V19 was confirmed by the owner on iPhone Safari in portrait and landscape. V20 changes inspection interaction only. No main merge or production Pages deployment.

- V19 baseline: `9a1e387dc53dfcf4583790135c78dcff3280d486`.
- V18/V19 renderers, source images, exported SVGs, six hand angles and central gold/red/green paint order are unchanged.
- Rules, CPU policy, deck definitions, 452 official cards and save format are unchanged.
- V18/V19 records remain in place; provenance has a separate V20 interaction-candidate entry.

## Interaction

- Shared pointer double-tap recognizer: 350ms between taps, 12px movement tolerance, 36px separation tolerance; rejects long press, any excursion beyond tolerance even if returning, cancellation, multiple fingers and intervening controls.
- Single taps retain their original meaning. Card pinch calculation remains; both paths update the same card zoom state.
- Both zoom controls always show 拡大 / 全体表示 with synchronized aria-pressed; both close controls say 閉じる ×.
- Shared 260ms cubic-bezier animation and reduced-motion behavior. Card retains its fit/readable size rules; clock uses a uniform scalar of at least 1.5 and a readable 720px short side.
- Clock normal left/right swipe rotates; expanded drag scrolls/pans, with the flip button available. This V19 priority prevents pan/flip ambiguity.
- Display controls are separate from game commands. Closing details preserves mandatory pending engine selection; explicit action and confirmation retain original behavior.
- Closing a card during animation settles animation before removing its DOM. Resize settles pending motion and keeps zoom state.

## Verification

- CARD GAME regression: see final run summary below.
- New unit coverage: double tap vs single tap; drag/long/far/multitouch/cancel; label/aria synchronization; separate display controls; proportional clock dimensions.
- `inspection-v20.dom.mjs`: 320×568, 375×667, 390×844, 430×932 and their landscape counterparts as DOM viewport states. Clock/card double tap, buttons, close, resize; swipe vs pan; original hand angles; storage bytes unchanged while inspecting; mandatory selection preserved on close and explicit choice commits; close during non-reduced animation. **These are DOM state tests, not rendered viewport QA.**
- Existing clock DOM: CPU both seats pause/resume, restore, blur, focus, Escape, six hands. Existing turn DOM: directions, jitter, vertical, cancel, multitouch, rotation lock, reduced motion. Lifecycle DOM: queued close/reopen and stale asynchronous load. Menu DOM: mode routing and save isolation.
- Packaging: 16/16 unit checks. HTTP verification: 4,120 files / 220,849,169 bytes, 7 entrypoints, 452 IDs / 904 images, 0 missing files, 0 hash mismatches. Trial source matches package byte-for-byte. Old development QA HTML remains in Site git history and is excluded from the new served package.
- Independent review found anisotropic clock animation. Fixed by proportional scene dimensions plus uniform transform; new geometry test failed before implementation and passed after. No further concrete important findings.

## Verification limitations

Cloud browser could not initialize: `failed to start node_repl backend: Connection closed`. No alternate browser path used. iPhone Safari native touch, actual overflow/panning, safe-area, toolbar overlap and real orientation rendering are **unverified**. The owner must still evaluate V20 on device. Do not equate JSDOM or geometry checks with these visual checks.

The broad main-game `npm test` run is separate from CARD GAME; its outcome is recorded below. No claim of all-main-game passing is made without a completed run.

## Final results and publication

- Final CARD GAME run: **572/572 pass**, 0 fail/skip/cancel (`node --test prototypes/card-game/tests/*.test.mjs`).
- Final V20 DOM, existing clock DOM/lifecycle and menu DOM passed. Turn DOM passed unchanged.
- Main-game `npm test`: stopped after over five minutes with 972 passing test lines and no failure lines at the last inspection; unfinished 3D/region traversal tests included `meguru-3d-visual-quality-test.cjs`, `meguru-discovery-test.cjs`, and `meguru-life-test.cjs`. **Incomplete**, not a full regression pass.
- Site source: `88b0febc1b27db0a04d82fe1633f31fa41d6accd`.
- Saved version: `appgprj_6ae71faa85448191977d6f89971d5d0b~appgver_5f09cb0685a08191aa9b68dceda9bd15`.
- Deployment: `appgdep_6ae746efe1308191816566817dd31fdf` — succeeded, 2026-11-01 23:04 JST.
- Owner-only URL: https://naotocchi-card-clock-v17a-20261101.kerzion214.chatgpt.site
