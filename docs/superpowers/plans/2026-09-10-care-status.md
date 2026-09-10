# Care illustration and status implementation plan

> For agentic workers: use superpowers:subagent-driven-development for the independent pure-state unit, then integrate and review the whole branch.

**Goal:** Show understandable care and life risk with dedicated pixel illustrations, without changing gameplay.
**Architecture:** A pure `care-status.js` derives a notice and summaries. `script.js` renders it into the existing message slot; `care-status.css` uses an image atlas. All transient state stays outside the save.
**Tech Stack:** Existing static JavaScript, CSS, Node test harness, Vite development QA.
**Spec:** docs/superpowers/specs/2026-09-10-care-status.md

## Global Constraints

No gameplay, save, world master, dialogue or approved image changes. Preserve cast geometry and fixed two-line message/speech slots. No death claims for immortal/egg/farewell/dead. No natural-tick spam. No extra continuous motion. Reduced motion keeps text and shapes. Read-only assessment.

### Task 1: Pure status assessment and changes

**Files:** Create `care-status.js`, `tests/care-status-test.cjs` only.
**Interfaces:** CommonJS export and `window.NaotocchiCareStatus` with `assess(state, options)`, `snapshot(state)`, `changes(before, after)`.
Options: `{immortal: boolean, petAvailable: boolean}`. Default immortal to state.infinite, petAvailable to true. Assess returns null or `{kind, severity, title, detail, icon, action, motion}`. Severity `critical|warning|info`. Action is an existing button ID or empty string. Icon names: food, game, clean, sleep, medicine, play, love, coin, gift, hunger, sick, danger, recovery, growth, decline, poop.

- [x] Write failing table-driven tests first. Expected examples: healthy=>null; growing health0/deathMeter0=>critical; lowHealthStreak>0 with health<20=>critical; dying or deathMeter>=80=>critical; health<=25=>warning; sickness=>warning and medicineBtn; hunger<=25=>food/feedBtn; awake energy<=25=>sleep/sleepBtn; happiness<=25=>play/playWithBtn if petAvailable; energy low takes priority over fun; poopCount>=2=>clean; decline>=70=>decline; sleeping=>sleep with recovery text, energy>=100=>wake advice; egg/dead/farewell=>null; infinite health0=>warning without death words. Sickness labels must remain plain text (the DOM integration escapes by textContent).
- [x] Use current game facts: feed adds hunger but no direct health; health recovers each tick only with hunger>50 and happiness>50 and no zero-energy or sickness damage. Medicine only helps while sick; medicine works asleep. Feed and petting are blocked asleep. Playing consumes energy. Petting loses happiness when spammed, so respect petAvailable. For health/life notices choose one next useful action: cure sickness, wake for food, feed if hunger<=50, wake/restore happiness if happiness<=50, sleep for low energy, clean dirt, otherwise maintain care and wait for recovery. Never prescribe medicine when not sick, food when hunger>=80, or play when tired. Name the actual cause in title/detail.
- [x] `snapshot` copies hunger,happiness,energy,health,sodachi,growth,decline,deathMeter,isSick,isSleeping,stage. `changes` compares explicit action snapshots only and returns null or `{text,icon}`; text shows at most two changes with Japanese names and explicit +/−, life uses 100-deathMeter, decline improvement uses minus. Prefer sodachi, health, energy, hunger, happiness, decline, growth, life; ignore absolute changes <1. State inputs remain unchanged.
- [x] Run `node --test tests/care-status-test.cjs`; self-review and report. Do not edit gameplay, integration, package or other tests.

### Task 2: Integration and atlas

**Files:** `script.js`, `index.html`, new `care-status.css`, `assets/ui/care-atlas-v1.png`, runtime/smoke harness loading, `tests/care-status-integration-test.cjs`.
- [x] Add failing real-runtime tests for critical notice persistence through setMessage/timers, correct next care, resolving/reload/hidden views, action changes, quiet natural ticks and egg/dead/infinite behavior.
- [x] Render notices via the existing #message without changing its height. Reuse its label and textContent. Add fixed-size icon art to seven care buttons, money, badges, gift inventory and poop floor. Keep button label as its first span for existing selectors.
- [x] Capture explicit action changes in withFeedback and minigame result. Track meaningful transitions outside saves; cap and expire summaries. Critical notices always win.
- [x] Reuse bounded cast emote once when entering a low state; respect sleep, speech, motion preference, lightweight mode and overlay state.
- [x] Inspect generated atlas and small sizes. Final generation has an opaque near-white background, so use white rounded tiles and per-object frames without editing the source pixels. Add generation instructions, dimensions, mapping and provenance.

### Task 3: Verification and handoff

**Files:** package.json, CI workflow, tests/visual-qa.cjs, docs/qa/care-status-2026-09-10.*, docs/handoff/care-status-2026-09-10.md, POST_RELEASE_CHECKPOINT_2026-09-10.md.
- [x] Add synthetic QA saves for each representative status and reduced/large/all26 combinations.
- [x] Run npm test and diff check; compare preexisting assets, death code and world master to base. Confirm 6-tick death trace unchanged with earlier notice.
- [x] Browser connection failed twice after successful initialization; record current limitation. Do not claim real-device verification or ask user to redo accepted date scenarios.
- [ ] Review changes, fix material findings, save work to a dedicated PR based on #224, record exact commit and CI and remaining checks. Recheck latest main/PR before saving; do not merge either PR implicitly.
