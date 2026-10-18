# Non-art CARD GAME integration — 2026-10-18

User authorized conditional merges259→381→384 and public same-device two-player play. PR393 artwork is excluded. No400-match run, supervisor, approval consumption, input regeneration or balance proof is performed.

## Fresh starting points

| Ref | HEAD | tree | base |
|---|---|---|---|
| main | 5d950d1b88751b202ac2fe2fcb2f3ea7ef0598af | ccca80d3796cf91cfcc9e03962f8d0315f3c9dfc | — |
|259|0a9df8f09b5ad657730f29d14e2d357241dace8c|78677b98fdc229c7acf10e9112ca9744ae0fa7ba|main|
|381|3a987044513fdb6d5e69b52b8af40add5a45ccd4|e86f089e6778061d7acd39492e96286656455702|design/card-pool-master-20260914|
|384|e30b2fed1f5e9143089cec389b2ef183df6c02aa|26705a0cefd064eb4c50821821b68caad6c70190|feat/card-game-hotseat-20261014|
|393 (excluded)|7c52352e4c711acb36d4b49ee181c23064ca4072|312fc688e0ec446e9223e06d7babec2657f47f62|feat/card-game-approved-ui-20261015|

All PRs started Draft/open/unmerged. Actual main ref was read directly; cached PR base_sha was not used as main authority.

## Integration and preservation

Three-way tree comparison against merge-base3ea8adac59281cbd10d5f5ff48a94cd9913c36a5 showed259 changes only.gitignore and docs/card-game. Main's card-game subtree still equals the ancestor. The only content conflict is independent ignore additions; both sets are retained. Design subtree13b06284577aa8fd88adb31eca734c16b97e68fa is imported unchanged, preserving all canonical Python, fixed inputs, stop and approval artifacts by Git tree identity. All other main trees/blobs remain unchanged.

259 reconciled HEAD e2e924d4f18250027b993ce29e7a16473df6c82d; tree c279a370a4cc96390a68be5aab0e48c95c601da2. Merge24402d1b6098a038a11d8a6e8b17f6b08854c66d has that exact tree.

381 adds only prototypes/card-game subtree838683aef5ea9c1a68abdffe7da19db463c2aebf to updated main, preserving all existing prototypes. Reconciled HEAD1591070a8593d174d45320c32f2bdb1c853b5cca; tree113bad6ee11cac37189b7a9dd478788b6ec281cf. Mergee56e77877cb066ca6adc38b8002e9fba68d9aaa3 has that exact tree.

384 uses the approved QA11 subtree20061198c7b294f686067858862212a64bca81e2, preserving its approved card backs/common rendering and existing art. Its sole additional docs change is plans/2026-10-17-card-qa5.md, added without replacing current main's superpowers plans. No source from393 is selected. Integration additions are the main menu anchor, this record, README publication instructions, an entry test and fresh test logs. No engine/rules/effects/save schema/autopass logic changes.

Main index gains one native independent-game link beside the existing Naopoyo link. Removing that anchor reproduces the previous index content apart from trailing newline. Main scripts, existing games, Character3D/World3D and asset subtrees are unchanged. No artificial main lifecycle/save coupling is introduced. The card game uses its existing localStorage keys and formal replay save format.

## Verification

- Canonical catalog/source/hash gate:3 passed. All452 definitions match actual canonical text hashes.
-381 exact existing Node test set:157 passed,0 failed. These test and engine blobs match the original381 snapshot.
-384 QA11 regression:253 passed,0 failed; with native main entry test:254 passed,0 failed.
- Existing cases cover representative effects, R10 victory, opening egg exchange/①birth, automated formal passes, human responses, mandatory choices, chain/continuations, save replay, privacy and stale/double actions.
- The large audit-dependent catalog regeneration test is excluded as in prior QA; this is not a new400-match or Python replay run. No unapproved runtime is executed.
- Independent scoped review found no merge-blocking issue. Syntax/diff checks passed.
- Existing11 rounds of iPhone QA and saved browser evidence are retained. Current browser geometry tests are not executed in this managed environment (no supported browser capability); actual Safari portrait/landscape, address-bar/rotation/safe-area and touch still require final public-version device QA.
- GitHub Actions and Pages delivery results, final merge SHA/tree and final393 state are recorded in PR384 after publication; this pre-merge record does not assert pending jobs have passed.

## Public routes and private trial

- Main: https://naoto214.github.io/naotocchi/
- Game: https://naoto214.github.io/naotocchi/prototypes/card-game/
- Existing owner-only UI trial: https://naotocchi-card-ui-trial.kerzion214.chatgpt.site/ (unchanged)

Pages and Site are different origins and therefore have separate saves; existing export/import transfers a saved game. Online play and advanced AI are not included. Artwork393 and new14-color adoption are not release gates and are not imported.
