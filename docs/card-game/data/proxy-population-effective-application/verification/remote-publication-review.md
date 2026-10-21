# Fresh remote publication prerequisite review

Base7723df78. One independent read-only reviewer /root/review_remote_bundle: C0/I1/Minor1. No reviewer edits. Three no-network tests independently PASS.

Important: default TemporaryDirectory can inherit a location within a checkout, allowing ancestor local Git URL rewrites. Reproduced with real git discovery and a nested temporary cwd; regression RED. Added query-only GIT_CEILING_DIRECTORIES at that cwd's real parent, preventing ancestor discovery. Regression and final21 related tests PASS (27.987s). No second review.

Minor deferred: TimeoutExpired/CalledProcessError do not yet have individually named regression cases. Both are caught by SubprocessError; generic transport failure and malformed/moved refs are tested.

Live read-only probe matched base7723df78/tree f17dca59, before the ceiling fix; it is not evidence of production input publication, consent, temporal lock or execution. Final source tested with synthetic remote transport plus real local Git and actual historical115/zero-root short attempt/replay/isolated-worker integration. All successful operational tests explicitly mock local/remote prerequisites. The generation durability test interrupts before returning entropy; no production material generated. The fatal-not-a-tree-object output is from an intentional negative edition test; suite result is21PASS.

Design errors=[]; protected numbered top-level476 unchanged. Prior bundle's npm406PASS refers to the same unchanged frontend; not a new npm or all-proxy run. External consent, OS provenance, pre-outcome chronology, full readiness/input-lock and balance eligibility remain unproved. Exact remote-head changes conservatively block; no automatic version update, redraw or retry.
