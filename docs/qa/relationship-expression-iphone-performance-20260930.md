# iPhone QA loading follow-up

User reported that the QA page was too heavy to check.
Baseline: 0fa3f79cf3b3d0b16ff271bdff19870c270b02e1; main remains dd50ce4bc7b2bef1952ca52ab6157579598aacc1.

QA-only adjustments:
- Preload current expressions and required transition assets instead of all three expressions for every actor. Dense static case: 81 -> 27 image decodes/requests (before browser cache).
- Held positive renews the existing reaction timer without rerendering all of Home every second. Initial render and real 2.5s transition cases remain unchanged.
- Fetch original script dependencies concurrently using preload links, then execute in the unchanged production order after memory-storage isolation. No bundling or production source edits.
- Case reset still reloads the isolated iframe, preventing previous state/timers from leaking between cases.

Verification: two new tests failed before the changes and pass afterward. QA 15 PASS; existing Relationship 62 PASS; combined 77 PASS / 0 FAIL. Prior full repository 2,851 PASS remains the baseline; full suite not repeated for this QA-only follow-up. All 3,430 image SHA256 values unchanged against saved hash manifest, including approved Relationship 88. Production files changed: 0.

Same owner-private QA Site: https://naotocchi-relationship-home-qa.kerzion214.chatgpt.site
No main merge or PR. No local Chromium retry. Actual iPhone timing and visual QA remain human verification; no measured speedup or Home GREEN claimed.
