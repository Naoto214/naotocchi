# Motion System v2 recovery pilot — main landing

## Authority and remote audit (2026-10-02 JST)

The user explicitly approved all eight real-Home recovery scenes, motion size,
cuteness and jump-peak display, and authorized Draft PR → CI → Ready → main merge.
Human aesthetic approval is complete. No additional aesthetic review is a gate.

- Starting authoritative branch HEAD: `122633e27e03c242fd01e548912638c83586f9d8`
- Starting branch tree: `8115d6a3d16c37d42b78554e500a07c4f155f105`
- Latest main included: `591b9def6a88733721249f80d3138087d00764f0`
- Main tree: `58f91270e6eca091646dee02238661eee09d5ea7`
- Ahead 11 / behind 0, confirmed by complete local history and GitHub compare API.
- Main is the merge base; no extra integration commit or conflict resolution needed.
- No existing PR for this head branch at start.

## Scope audit

Runtime differences from main are restricted to `cast-motion.js`, `script.js`,
and their cache tokens in `index.html`. Other changes are tests, development-only
QA scenes, design/approval records and test evidence. Images, CSS, layout,
Relationship Expression, save schema, progression and balance are unchanged.
The existing personality table is untouched. No L2/L3 rollout or 168-character
motion work is included. Cleaning's shared group reaction is retained.

The pilot preserves successful-cure semantic priority, one focused recover with
16px budget (including dense26), synchronous equipment, reduced motion, canonical
rest, no large collective cure motion, and happy afterglow without delayed bounce.

## Fresh local verification

A minimal correctness fix was added after the independent review (see below).
Environment: Node v24.19.0, Linux x64. CI uses the repository's Node 22 workflow.

| Gate | Result | Evidence |
|---|---|---|
| Dedicated cast-motion + emotion-integration | 73 PASS / 0 FAIL | landing-20261002/dedicated.log |
| Home (8 files) | 365 PASS / 0 FAIL | landing-20261002/home.log |
| Relationship + Home QA tooling | 104 PASS / 0 FAIL | landing-20261002/relationship.log |
| Asset integrity + cache tokens | 8 PASS / 0 FAIL | landing-20261002/static.log |
| Full npm test | 2,806 + 80 = 2,886 PASS / 0 FAIL; exit 0 | landing-20261002/npm-test.log |

The gate sequence is dedicated → completed Home → Relationship rerun → full npm.
An earlier Relationship process overlapped Home and is not used as the gate.
Counts overlap and must not be summed. Home is now 365 because the previous
runtime follow-up had added the normal/reduced-motion happy-afterglow case.
`git diff --check` is clean. Independent review found the issue below; the fix was
reviewed with no remaining runtime blockers. CI is pending and will be checked on the PR before Ready/merge.
No browser-runner success is inferred from Node tests or human approval.

## Next work (excluded from this merge)

Separate branch: Motion v2 L2 rollout — feeding, play-with, cleaning (GROUP pilot),
waking. Then L3 evolution, transformation, companion joining, partner formation,
marriage. Motion personality follows later. Future scopes SELF / RELATIONSHIP /
GROUP are documented without implementing the broad rollout here.

## Independent review: repeated cure on conversation follow-up

The reviewer reproduced a second full -14px recover at the closing pet reply
(5 seconds after a real medicine click with a partner). The old regression ended
at 2.7 seconds. A listener bounce also occurred between recoveries.

A new full-conversation test reproduced the failure (2 recoveries instead of 1).
The conversation now passes whether the beat is primary; only the primary pet
cure beat uses recover, and later cure speakers/listeners use nod. The approved
recover frames, 16px budget, duration and equipment synchronization are unchanged.
Four regression cases cover partner-only/dense26, normal/reduced motion, the
companion reply and closing pet reply, partner displacement and equipment frames.
The pair cases also assert happy afterglow; dense fixture achievements can
legitimately suppress it. Independent review confirmed no other runtime blockers.

The initial full npm run was interrupted (exit130) after discovering this issue;
it is not reported as a completed gate. All required gates are rerun for the fix.
