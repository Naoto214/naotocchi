# VERSION 5 implementation plan

Goal: readable full notices and isolated special-region device QA, using the owner's detailed V5 specification.

Architecture: retain the 42px reservation and original notice nodes/queue. Measure natural content height, reserve only its excess as normal-flow margin; keep speech 76px. No text, simulation, coordinate or save changes. Use the existing disposable production QA generator for a separate V5 namespace and landing page, excluded from the production allowlist.

- [ ] Reproduce the two authored notices with DOM clipping measurements before changing production code.
- [ ] Add production-only natural notice layout and observer, verify collapse and simultaneous speech, fonts and rotation. Keep actor stage dimensions stable.
- [ ] Add QA generator and direct star_stop / memory_lake links for background and 1/6/28 actors; isolated persistent save and explicit resume.
- [ ] Run existing regression and new Chromium/WebKit notice matrix; retain existing assertions.
- [ ] Recheck remote head and commit only selected files to PR #490, no force push. Inspect all CI states.
- [ ] Package verified V5, retain V4 source/version, deploy owner-private and inspect access/provenance. Defer J2 if release gates consume the session.

Review focus: late font loading; multiline story portrait clipping; birth decoration; messages arriving during speech; long-to-short restoration; short landscape viewport scrolling. Browser evidence must distinguish viewport reachability from simultaneous visibility.
