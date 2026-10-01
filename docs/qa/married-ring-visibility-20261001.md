# Married ring visibility comparison — 2026-10-01

> Final decision: iPhone human approval completed on 2026-10-01. Ring and partner positive heart are formally adopted at1.2x; all size/colour/position comparisons are closed. See [final acceptance](relationship-expression-human-final-acceptance-20261001.md). Pending/comparison statements below are historical, not remaining work.

## Scope / source

User reports Relationship Home mostly satisfactory on iPhone. This change only improves the existing married ring; approved88 Expression images and completed heart/aura/motion rules remain unchanged. No main merge, PR creation/Ready, game progression, save schema, migration or new permanent state.

Fresh remote start: branch `feat/relationship-expression-pilot-20260930`, HEAD `59f0efad3d9342779590297d9abaa0c84be3e8d8`, tree `3409960a4294744ec11fa3a4a97f0c2a5b0b8c5b`. Fresh main `31edb95ee0e4470669d220dfcf87600281128e5a`; ahead22/behind10; open PR none. Local remote-tracking main was stale; `ls-remote` plus explicit main SHA fetch established the authoritative comparison. Existing isolated clean worktree matches branch remote. No main integration.

## Inventory and bounded implementation

`script.js:renderPartnerCompanion` uses `<span class="partner-ring">💍</span>` only when `partner.married`. At boot, `display-illustrations.js` decorates that source into `data-ui-icon=ring`; `ui-illustrations.css` samples the existing `assets/ui/world-items-atlas-v1.png` atlas. It is not an independent ring PNG or the unrelated Naoto ring item asset. Initial source-only inspection missed this decoration; actual browser DOM established the complete pipeline. `cast-layout.js` reserves a15–23px ring frame and positions it between the couple (visually partner lower-right in these QA fixtures). `renderRelationshipReactions` restores that same frame after partner expression rebuild. Those functions and the solver are unchanged.

Only production `ui.css` ring rule changes: `scale(var(--married-ring-scale,1.2))`, centre origin; `filter:var(--married-ring-tone,saturate(.25) brightness(1.18))`; pointer-events none. The original centre/anchor remains identical;1.2x paints18–27.6px, extending1.5–2.3px per edge. No added animation, glow, particle or z-order. Silver becomes brighter and gemstone blue less saturated; filtering is scoped to the ring glyph, never the character or aura. This is a candidate for human choice, not final iPhone approval. Normal rendering uses the shared atlas on every device; iPhone remains authoritative for physical-size visibility and perceived brightness. The original emoji is retained only as a source/fallback.

Production CSS token is updated in index using the existing8-character content-hash convention. No production JS/renderer/layout/resolver/save logic is changed.

## QA comparison

Existing20 cases retained without duplicate fixtures. In `けっこん：ふつう / さみしい / うれしい`, the ring selector offers:

- A: current size/current colour (scale1, filter none).
- B:1.2x bright pale silver-blue (actual production defaults).
-1.15x or1.25x with the same production colour.

The same real production Home and CSS render every option. QA changes only the two validated presentation custom properties on the isolated QA document. Invalid options reset to production defaults; no arbitrary CSS values accepted.1.2 does not copy production constants. No usual save read/write. Selecting a case or option reloads its identical fixture; actual device viewport remains default,390x844/320x568 remain available. Positive remains the existing fixed comparison snapshot, not lifecycle proof.

Human steps: open existing QA Site; choose one of the three marriage cases; switch ring A/B or multiplier; choose Homeを見る. Compare recognizability, excessive size, face/body/conversation overlap, distinction from lonely blue and independence from positive warm heart. Final selection remains human iPhone acceptance. Representative actual browser images accompany the report.

## Automated checks

QA override/reset test verified failing before implementation, then passing. The new reload tests initially used the harness querySelector as real DOM absence detection; this harness creates synthetic nodes for missing selectors. Corrected assertions inspect actual production-rendered markup, matching existing tests. No runtime fix was made for this test-only issue.

Relationship76 PASS/0 FAIL. QA23 PASS/0 FAIL. Existing Home53 cases passed in related run; the initial combined144 run contained only the two test assertion failures above, subsequently corrected. Full repo test completion and browser evidence are recorded below after execution.

All3430 tracked images SHA256 compared with startHEAD:3430 unchanged,0 changed. Includes Relationship88, normal31, companion/partner normal, Naoto and other assets. Ring asset changes0 (the shared atlas is unchanged). Screenshot evidence separate from production assets.

Implementation checkpoint: `bbe1fd3dd87aa20a0b0319e6f4d37b60ec825452`, tree `99867316591c1ac88d091d8b64d0263a5563a98c`. Review found the same test-harness assertion issue; corrected. No other important scoped production regression identified.

## Final verification and browser evidence

- `npm test` completed exit0: baseline2789 PASS/0 FAIL + Relationship76 PASS/0 FAIL = **2865 PASS/0 FAIL**. Smoke, dialogue and visual-fixture commands also succeeded. QA page23 PASS/0 FAIL separately; Home53 PASS/0 FAIL in the related run (overlap with full suite, not additive). No skips/cancellations.
- The full command started before the new reload-test assertion correction, but its sequential Relationship invocation ran afterward against the corrected saved implementation tree. Full output contains0 FAIL. The initial focused test-only failure is described above.
- Browser: existing cloud Chrome, actual production-rendered QA Site.390x844: A/current and B/1.2 candidate observed for married normal/lonely/positive. Ring remains lower-right, heart above, face unobscured. Warm positive and cold lonely coexist with bright ring. Positive screenshot includes conversation; no ring/conversation overlap observed.
- DOM confirmed decorated atlas ring, original inline frame17x17 at left48.5/top31 relative to partner; candidate computed transform matrix1.2, filter saturate(.25) brightness(1.18), painted box20.4x20.4. Solver frame unchanged.
-320x568 representative checks:1.25 positive,1.15 lonely and1.2 normal. Ring visible with separate heart/cast/conversation/button regions; no significant clipping observed. Not an exhaustive18-partner layout audit, not iPhone Safari acceptance.
- Browser clipped screenshot operation timed out. Retained complete viewport screenshots instead. Some DOM inspection calls also timed out; AX/screenshot observations remained available. Local Work Chromium was not retried; the saved automated Home-browser full suite remains **未実行**. Do not label all browser QA GREEN.
- Actual screenshots: `ring-current-{normal,lonely,positive}-20261001.jpg`, `ring-candidate-{normal,lonely,positive}-20261001.jpg`; smaller viewport `ring-125-positive-320`, `ring-115-lonely-320`, `ring-120-normal-320` (same date). Saved as report attachments, not production assets. Fixed condition comparison retains existing idle/conversation so capture timing can differ; this is not a pixel-diff or lifecycle test.

## QA publication / handoff

Existing owner-private Site, audience unchanged, main game publication untouched:

https://naotocchi-relationship-home-qa.kerzion214.chatgpt.site

Site source `aa0dc9cf0917cdd894c4882ca493fc3340b14233`, deployment `appgdep_6abe03b3a4c88191af6ce53ea13b8c3c`, **succeeded** at2026-10-01T06:55:08Z. Source manifest identifies implementation checkpoint `bbe1fd3dd87aa20a0b0319e6f4d37b60ec825452`; subsequent branch changes are this QA record only.

Open on iPhone → choose「けっこん：ふつう／さみしい／うれしい」→「けっこん指輪の比較」A/B or1.15/1.25 →「Homeを見る」. Keep「この端末」for actual iPhone. Decide whether ring reads immediately, is not too big, remains distinct from lonely and does not compete with positive.

**画像88枚変更0。全3430画像hash不変。main mergeなし。人間実機比較待ち。** The only remaining acceptance decision is iPhone ring size/brightness. CurrentRelationship state visual language is retained; this task does not reopen image approval or begin future gameplay work.
