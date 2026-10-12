# Waterwheel before/after source binding repair

Independent review of c032ad8 found an Important comparison-validity defect: runtime-harness reads production JS relative to cwd, while the baseline command stayed in the current checkout. Its pack therefore contained AFTER wheel geometry. Product code is unchanged.

Fresh artifact 11588979345 from run37869662786 (source c032ad8305ca7140d921dd9edf3eabddbeeecfe8), ZIP SHA256 `2a409eca3f18a516f9986b6f253c9fd1dddbf4a6f540c018ba126a9abddbb5f9`, confirms identical BEFORE/AFTER target hashes. This run's successful execution is NOT valid before/after image evidence. The two original inspection JSONs are retained here; the raw ZIP remains in Actions until 2026-11-08.

Fix: resolve ROOT/OUT, then change cwd to ROOT before requiring the harness. Current runner-relative selection remains shared. An artifact gate now requires exactly the eight unique expected names, matching IDs/regions/cameras/object counts, active3D on both sides and different paired target hashes. These are verification changes only.

Local reproduction executes the real runner initialization before browser launch. The synthetic baseline directory points to unchanged current files except meguru.js, read directly from cf50037 via git show. Reviewer checked harness dependencies unchanged between source revisions. Removing cwd binding reproduces both current hashes on the baseline side. Restoring binding yields the expected baseline hashes and 14→16 parts, objects899/831 unchanged. Log retained. First multi-case diagnostic incorrectly reused Node's harness module cache; its failure is retained separately. The corrected diagnostic clears that cache between cases, consistent with CI's separate processes.

| Target | Baseline descriptor SHA256 | Current descriptor SHA256 | Parts |
|---|---|---|---|
| countryside:495 | f532706d935d261070629de1762a85137c8c8fd828aa2ebd64284df06c328732 | 6575148cb3887fccf771f85657d1534ee3ca22bcd7df1e7d4f29aff4e4bc9c9d | 14→16 |
| river_lake:406 | 9809f658ba25c0b842e84012b3d437c8f8cce190891df3da98610979853ff2bf | 4d4a51bee3d2fed38ece92f3dd4f40bc2fbc133c55cac6fd79967c188864c9b9 | 14→16 |

The new artifact guard was run against the original c032ad8 JSON and correctly failed with source-mixed wheel: prop-wheel-0. Syntax and diff checks pass. Independent re-review of cwd binding found no remaining blocker. Browser recapture and image gate remain pending at this save. Proxy pack count is a transport count, not proof of all rendered geometry or gameplay visibility. Actor-free/static fixtures are not performance evidence or Human QA approval.

Earlier ccdfabc/run37869346880 failed with countryside899 vs browser588 objects. Its cause is still unconfirmed; c032ad8's complete-pack transport is a scoped fixture approach, not a runtime fix. Unmodified npm evidence remains lost/unretained. CI37780406075 still supplies2882+80PASS with concurrency4. No full same-product rerun needed for this QA-only correction.
