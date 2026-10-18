# Generation operation / immutable package — 2026-10-11

Base c1a491688bbb0e6d7de7a586c748ffed63198c95. Reuse existing journal/material/manifest and claim verification; no production input generation.

The package audit now requires all seven canonical regular artifacts, including operation.json and completion.json. A local immutable claim reader is extracted from the existing live publication verifier; the public verifier still performs fresh owner-comment and exact remote checks. The operation audit reconstructs generation_request from the actual certificate/registry/destination, matches the immutable claim, saved comment/remote observations, then requires the package to be the direct child of the claim and add exactly the seven artifacts. Completion must exactly bind returned call count/byte count, journal/material hashes, complete status, 200 groups/400 rows, zero games and closed readiness/provenance scope. No extra result artifacts or different parent are accepted.

This proves recorded content and Git ancestry only. It does not prove OS entropy origin, historical edits/rollback absence, results-before-publication chronology, or current generation consent. The later launch claim remains separately live authenticated. All operational gates remain closed; production generation/fixation/matches0.

TDD: absent operation/completion accepted -> RED1FAIL, fixed by seven-artifact join. Fixture initially used placeholder contract hashes -> setup ERROR (also a dependent operation fixture0tests ERROR), corrected to actual pinned contract hashes. Scope inflation RED1FAIL; local claim false author/body RED1FAIL -> checks added. Related24PASS9.395s.

Independent review once: Important/P2 accepted saved remote/live scope inflation. Reviewer10PASS plus two mutation probes. Reproduced as2FAIL; validated saved schema, exact remote/ref/commit/errors, all closed scope fields and null admission throughout original approval/live/claim/auth/remote records. Related26PASS11.085s. No second review; fixes verified inline. Test sources only: synthetic Git/comments, repeated old115 bytes/zero roots; no live networking or game execution for these new tests.

Final fixed64PASS61.356s, exit0; recursive Python1064 hashes unchanged. Design errors=[], numbered477 canon unchanged. Latest full proxy suite not completed; previous interrupted run stays incomplete. Preflight-ready=false. P07–12 full opportunities/information/operand evidence, P14–17 final trust/gate composition, and P18 final regression remain. No existing result or numbered canon altered.
