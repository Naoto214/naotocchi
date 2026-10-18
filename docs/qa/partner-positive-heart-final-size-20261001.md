# Approved ring and partner positive heart size — 2026-10-01

> Final decision: iPhone human approval completed on 2026-10-01. Ring and partner positive heart are formally adopted at1.2x; all size/colour/position comparisons are closed. See [final acceptance](relationship-expression-human-final-acceptance-20261001.md). Pending/comparison statements below are historical, not remaining work.

## Authority and scope

Fresh branch `feat/relationship-expression-pilot-20260930` started at `920acdf31d5a7496adf3216c98a4dddc378483f3`, tree `522dc51ec876c48e9739528c295e6e7741dbfc4b`. Latest main `31edb95ee0e4470669d220dfcf87600281128e5a`; ahead24 / behind10; no open PR; clean isolated worktree matched remote. No main integration. This record supersedes the ring acceptance pending note in married-ring-visibility-20261001.md: the user has now approved the 1.2x ring, bright silver/pale silver-blue and existing lower-right position.

## Change

The approved ring was already the production default; ring CSS, atlas, anchor and marriage logic are unchanged. Removed obsolete ring A/B/1.15/1.25 QA options and their overrides. The page now states the ring decision rather than asking for another comparison.

Only partner positive heart sizing changes: previous `clamp(width*.4,16,26)` becomes the same value times1.2 (requested19.2–31.2px versus16–26px). The existing owner-attached anchor uses the enlarged size before placement, preserving a3px gap above art bounds and the same horizontal centre. Existing edge clamping/top-space shrink remain. No CSS transform enlargement after placement, no character-coordinate exceptions. Physical rendered size can be reduced by the existing top-edge safeguard.

Companion positive remains16–26px. Partner normal/lonely remains10–15px. Reaction motion, warm/cold layers, duration2500ms, suppression during movies/overlays, Expression resolution and save logic are unchanged. Ring remains independent of all three Relationship states.

Production files: relationship-expression.js (shared sizing helper), script.js (call it), index.html (content-hash tokens). QA files: tools/relationship-home-qa/{bootstrap.js,cases.cjs,controls.js,page.html}. Tests: tests/{relationship-reaction-test.cjs,relationship-home-qa-test.cjs}. No image files changed.

## Comparison

Existing20 fixtures reused. Select けっこん：うれしい or non-married クマ／タコ：うれしい. A uses the same production sizing helper with multiplier1; B uses the untouched production1.2 default. The QA wrapper is installed only in the isolated iframe and disappears on reload. No production QA parameter, CSS-only imitation or save field is introduced. Married normal/lonely remain available with approved ring and unchanged hearts. No1.15 fallback is added unless human iPhone review finds1.2 too large.

QA uses real production renderer/layout/resolver and memory-only storage. Fixed positive is for appearance comparison, not lifecycle proof. Actual transition cases remain available. Existing access audience and main game publication are unchanged.

## Verification

New sizing regression test was observed failing before implementation (missing helper), then passing. Checks both kinds/all states across multiple widths, exact1.2 ratio, unchanged other sizes, proximity and stage-edge constraints. Existing Relationship integration tests cover married/non-married three states, expiry/current-value re-resolution, ring position restoration, save/reload and movie suppression. Related Relationship77 + Home53 =130 PASS/0 FAIL. QA23 PASS/0 FAIL separately. Review found a stale married-case ring-comparison hint; corrected. No other important scoped issue found.

SHA256 audit against startHEAD: all3430 tracked images unchanged; Relationship88 unchanged. Includes normal31, companion/partner normal, Naoto and other images. Ring atlas unchanged. Screenshot evidence is separate from production assets.

Implementation checkpoint `a9db1e5797dde4375f2808b27e3dd5d9c6ee6d03`, tree `cc36a2b31bc1e226dd4f984c2891460344576fe0`.

Full `npm test` completed exit0: baseline2789 + Relationship77 = **2866 PASS / 0 FAIL**. Smoke, dialogue and visual-fixture commands also succeeded. QA23 PASS separately; Home53 overlap the full suite and are not added to2866. No skips or cancellations. Publication and representative browser evidence follow below. Human iPhone final acceptance of partner positive heart size remains pending. No Ready/PR creation/main merge.

## Published QA and representative images

Existing owner-private QA Site successfully updated; audience unchanged and main public game untouched:
https://naotocchi-relationship-home-qa.kerzion214.chatgpt.site/

Site source `e33c2a465cf6f0dede4ba37114b467b46ac57e4e`; deployment `appgdep_6abe1932bb8081918ba64d312da533c3`, succeeded at2026-10-01T08:26:50Z. Manifest sourceHead identifies the implementation checkpoint above. Subsequent branch change is this record only.

Cloud Chrome actual UI checks: married positive A/B at390x844, married normal/lonely at390x844, non-married octopus positive B at320x568. B partner heart DOM width/height23.04px at390; old sizing at the same48px cast frame is19.2px. Positive heart above face and approved ring lower-right are visibly separate. Normal/lonely hearts remain small; ring persists. Octopus B fits the small viewport without obvious face overlap or major clipping. These are representative fixture observations, not exhaustive all-partner layout verification or human iPhone size acceptance. Fixed snapshots do not establish lifecycle correctness; automated integration tests cover that separately.

Saved actual screenshots: partner-heart-A-married-20261001.jpg; partner-heart-B-married-20261001.jpg; approved-ring-normal-20261001.jpg; approved-ring-lonely-20261001.jpg; partner-heart-B-octopus-320-20261001.jpg. Full viewport retained; existing idle/conversation timing can differ. No generated mockups or modified Expression assets.

Human steps: open QA URL → choose「けっこん：うれしい」「クマ：うれしい」「タコ：うれしい」→ switch「こいびと：うれしいハートの比較」A/B →「Homeを見る」. Confirm B is clear without hiding face/ring/conversation. Ring is already accepted; only partner positive heart size awaits final iPhone approval. If B is explicitly too large, compare1.15 in a later small adjustment; no extra candidate now.

Local Work Chromium was not retried. Saved automated Home-browser full runner remains **未実行**; do not infer a full browser GREEN from these representative cloud Chrome screenshots. **画像88枚変更0、main mergeなし、人間実機最終確認待ち。**
