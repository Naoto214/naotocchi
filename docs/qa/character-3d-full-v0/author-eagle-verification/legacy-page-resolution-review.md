# Legacy wave-page resolution review

Scope: pending `character-3d/wave-review.html` change against `8523` and new `tests/character-3d-wave-legacy-resolution-test.cjs`.

Spec verdict: PASS. Quality verdict: PASS.

Critical: 0. Important: 0. Minor: 0.

The page now resolves an own `SPEC.ARCHETYPE_REUSE` identity only at exact stage zero through its existing `SPEC.stageSpec` authority. This supplies the missing cat/Shiba legacy route without creating a namespaced alias, accepting inherited/unknown identities or changing player/candidate lookup branches. Other stages still require an existing exact row-stage specification. No production registration or model geometry changes.

The regression executes the actual page's resolver snippet after the same ESM entry's UMD imports. It checks exact identity with the approved cat/Shiba specification, wrong stages, wrong role prefixes and unknown IDs, plus retained player and Author candidate resolution and Author stage-one rejection. This exercises the failing resolver rather than a duplicate helper.

Inspected recorded RED (one legacy failure, one preserved-path PASS) and GREEN (2/2 PASS, no skips/failures). The earlier capture remains failed; Eagle/Author remain unpromoted and successful real-page capture/image acceptance remains open. No broad suite, capture or implementation was repeated.
