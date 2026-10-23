# v8 latest-main integration plan and ledger

Goal: preserve the completed v8 Home and integrate main e7fef44b (Conversation #433) into Draft #426 only.
Spec: REPORT.md and the user's v7 follow-up requirements.

- [x] Resolve index script tags by retaining Home modules and adding updated Conversation modules before script.js.
- [x] Union test registration and runtime allowlist; refresh hashes for merged files.
- [x] Run Home, Conversation, relationship, Motion, individuality and save regression tests; inspect merged diff independently.
- [ ] Commit/push feature only, update existing owner-private preview, verify deployment and CI, retain Draft.

Constraints: no main push/merge, no Pages publish, no visitor/growth/save schema change. Preserve trial save family. Previously saved v8 visual comparisons remain applicable to unchanged Home visuals.

Baseline: HEAD 5f4849b3, focused Home 16/16 pass in this session. Remote main is one commit ahead of the previous merge base. Conflicts: index.html, package.json, tools/pages/allowlist.json. script.js and runtime harness merge automatically; test both integrations.

Results: Home/Conversation/relationship/individuality/Motion/save regression 378/378 pass; Python packaging 15/15 pass; independent reviewer focused 15/15 pass, no material findings. Manifest comparison covers 4050 files with zero mismatches (trial save key and game.html mapping accounted for). First attempts lacked sparse-checkout assets/prototypes; after restoring required tracked inputs the same tests passed. No production logic was changed to make tests pass.

Decision: merge main into feature, retain all 190 Home and 183 main test registrations, retain both runtime allowlists, refresh only merged script cache/hash entries. Home visuals remain byte-identical to v8; saved v8 comparisons are retained, not represented as newly captured v9 images. iPhone Safari QA remains pending.
