# Approved chapter 1 production release

User-approved scope: adopt d55a48d9 unchanged gameplay/sign/design, route the existing official portal to Time Hand chapter 1, retain legacy sources and saves without reading/migrating them. Chapter 2 is temporarily outside normal navigation; stage 10 keeps its escape ending and says preparation is underway.

1. Resolve latest-main packaging conflicts without reverting unrelated main features. Add production routing, preparation copy and exact runtime dependencies. Verify route, save isolation, all 10 examples/live clears and approved file preservation.
2. Run existing chapter, legacy puzzle, card, runtime and Pages checks on the integrated candidate. Review diff and require successful GitHub CI on its final HEAD.
3. Mark PR ready, merge with expected HEAD, verify Pages deployment and actual production hashes/navigation. Stop for failed required checks or unsafe behavior; report unverified device-specific behavior honestly.

No save migration, chapter 2 redesign, new gameplay, sign/style/control changes or legacy source deletion.
