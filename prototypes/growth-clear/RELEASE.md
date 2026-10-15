# New drop trial integration — 2026-10-15

This release is authorized for public iPhone trial only after tests, CI and preservation gates pass. Formal balance adoption and completion remain pending user iPhone Safari QA. Earlier no-publication statements in DESIGN/REPORT/PHONE-QA describe the prior phase; they are superseded only for this conditional trial release.

## Integration

- Base main: b8fad706ee65a20f4b27e9f966327ff5500f0c8e, tree b3fa1c71ede7ec8b32916f13154dad5b0b888a20.
- Reused PR385 source: 97ef03a83988336c5f8f225a266604ea829a6506, tree 5bddcfe975bf77e31499618a71f7ba92ddbf13f0.
- Latest main merged without conflicts. Existing series routes remain unchanged. Old drop start/title screens explicitly label old rules and link to the trial; trial settings link back. Series records link to the separate trial records.
- Old drop remains the default, with its original engine, save/history/preferences and mode selection. New trial starts at 2/6; 8/24 can be chosen for a new run. Neither is a final balance adoption.
- No changes to slide08, main save/schema, assets, 3D, card game or other game runtime. New resolver, supply, 560 measurements and witness records remain unchanged. Mixed clearing awards no eggs or gauge; its existing score behavior is retained.

## Storage

Old drop: `naopoyo-player-v1` (comparison profiles remain separately keyed).
New drop: `naopoyo-growth-clear-phone-v1` and its own Web Lock.
Slide: `naopoyo-slide-player-v1`. Main: `naotocchi-save-v1`.
No migration, removal, reset or cross-loading is performed.

Review found two trial UI defects, fixed with regression tests: saved sound/reduced-motion preferences were not restored; saving during an animation omitted the just-accepted action. The new checkpoint settles a deep copy of the already-resolved state and persists its records, retaining live animations and the original snapshot contract. Short landscape screens use available width for controls while retaining the board-left/tools-right grouping and two control rows.

## Verification

- Existing new-rule suite: 41 tests; checkpoint regressions add 2 tests.
- Old drop: 130 tests. Slide: 50 tests.
- New rule mutation: 20/20; player mutation: 8/8.
- Saved comparison: 560 SHA-256 and replay hashes verified (no remeasurement).
- DOM: tools (3 taps), continuing fall, cancellation, NEXT3, chain10, denied storage, navigation and preference regression.
- `release-browser.cjs`: seven portrait/landscape sizes (320×568, 375×667, 390×844, 430×932, 667×375, 844×390, 932×430); real old/new navigation, checkpoint reload, 2/6 and 8/24, protected raw saves, old resume.
- Local browser launch is blocked by sandbox socket permissions. Browser assertions and screenshots run in GitHub Actions `Naopoyo drop trial`. Full npm test, existing Naopoyo/Slide CI, Home layout and pad-size are required before merge. See the PR checks for the exact tested commit and outcomes; this document does not assert those pending checks have passed.

## User QA after deployment

Open the series entry → ドロップ (old rules selected) → 新ルール試遊 → 新しく開始 (2/6). To compare, open 設定 / 保存, choose 8/24, then 新しく開始. Use 保存して戻る or 保存したゲームへ戻る to resume. New trial records are in 設定 / 保存. Return via 旧ルールへ戻る or シリーズ入口.

Check portrait/landscape usability, three-tap tools during falling, evolution versus mixed-clear readability, chain feel, board congestion, enjoyment of reaching 08, difficulty and operation burden of 2/6, old/slide saves and records, sound, reduced motion, and save/reload mid-animation. Human QA is not performed by automated Chromium checks.
