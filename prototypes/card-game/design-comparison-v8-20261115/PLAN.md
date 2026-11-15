# VERSION 8 implementation plan

Goal: User-approved B3-A/V7, all small cards without body copy; full canonical details on selection. Independent /v8/ on PR551, no production integration.

Architecture: Separate reusable V8 card renderer and CSS; V7 reference snapshot; memory-only battle lab using byte-identical official engine/session/presentation modules with a DOM presentation adapter. No official save or CPU changes. Official names only; no ruby on cards. Research separates current name divergences from unapproved renames.

- [ ] Build read-only 459-card + special egg export, preserve formal14 colors/marks/art/back and all V1–7.
- [ ] Create cards.mjs/cards.css/fit.mjs: one-line measured names, fixed auxiliary B, equal status cells with optical glyph centering, no normal body. Use contain by default; offer explicit cropped-fill comparison for illustration area.
- [ ] Comparison/gallery/detail/deck-display lab: no persisted decks; rare mark retained; isolated rule-limit resolver matches current limits and supports test overrides.
- [ ] Battle lab: existing board dimensions/hand layout, genuine legal actions through unmodified HotseatSession, full detail/action confirmation/return/flip; local memory only. New7 shown as display samples, not injected into official engine.
- [ ] Egg uses preserved-art.png and existing pale-blue source gradient; no invented cost/stats/rare/ID; original illustration and state rules unchanged.
- [ ] Name audit: latest main and pinned card source, all main/companion/partner IDs, stage/form/aux/dex names; all mismatches, kanji candidates and shared registry proposal. No renames.
- [ ] QA 459×4 widths + 40px hand/board sizes, normal-copy absence, one-line no ellipsis, exact full text, egg fields, rare/limit invariance, actual battle selection/action/return. Chrome available; disclose WebKit/iPhone limit.
- [ ] Review, source/asset preservation checks, PR551 commit/push, owner-only Site publication.

Source baseline c04688e468d40c507c81352ce559e9a1282dee49; current main 408c72e6ebef71da3eab33cfb268c7494117aaaa; PR498 948026343099e34628f5655ae240d1083763ea9e. All new code stays in this directory. No main merge, Pages publish or PR498 edits.
