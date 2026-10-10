# Motion repair selector review

Reviewed root's dirty workflow/config/test slice against `f07fef280059b41e6ab22c2475b0cc5fd3c7c9ca`. New config is `.github/character-3d-motion-repair.json` with `{mushroom:[6]}`. No implementation edits,26-test replay or captures.

**Current selector result: C0 / I0.** The exact configured repair is bounded correctly. One nonblocking future-config guard gap is noted below.

The repair matrix now derives only configured family names; independent execution selects only mushroom. The stage selector derives exactly `mushroom:6`, which the existing wave-motion positional CLI supports. It therefore avoids accepted clownfish and mushroom5/7 motion recapture. The existing normal-distance and four-view commands still capture all eight mushroom stages as requested; their existing topology/fish family branches are unchanged and unsupported family exits remain fail-closed. No production or CLI implementation is changed.

Config-only changes now trigger the existing workflow. The selector test checks aggregate nonempty/unique/legal/nonPilot keys and the two supported family names, executes the actual matrix expression with repair on/off, and executes the actual motion selector for the configured family. It does not freeze mutable model rows. Integration86 selection is now extracted specifically from the Missing plan-minimum step, avoiding the earlier repair command with the same STAGES syntax; the actual integration command is unchanged.

Prior repair marker routing/timeout/job names/artifact names remain. Integration plus repair suppresses the86-motion step; aggregate248 remains disabled in repair mode. Unrelated gallery/source/performance/scene jobs and broad mutation steps remain excluded. Dedicated regression plus affected fish/fungus controls retain prior behavior. The existing exporter family artifact-to-`stage-evidence (<family>)` binding is preserved.

Independent verification: complete YAML parses with **18 jobs**; focused executed selector/routing test **1/1 PASS,473.152029 ms**; dirty diff check clean. Root's three-suite26PASS is reused, not repeated. No actual duration/artifact/image acceptance is claimed.

Nonblocking future-config gap: aggregate expectedKeys>0 does not require every configured family array to be nonempty. A hypothetical `{mushroom:[6],clownfish:[]}` passes those structural assertions, selects both jobs and sends an empty positional argument to wave-motion for clownfish; that CLI's existing default then selects turtle/frog stages. Current config does not have that defect. Require each family array nonempty and fail before capture when STAGES is empty before broadening this config. Root was notified; no test/CLI implementation edit was made by review.

Actual mushroom6 replacement motion, source silhouette, four-view and distance acceptance remain root-owned pending fresh capture. Existing source-qualified accepted rows retain their separate evidence.

## Guard and recovery checkout closure

Re-reviewed the subsequent narrow root changes. The future-config gap above is **resolved**: the test now requires every configured family value to be an array with length greater than zero, and the actual shell block executes `test -n "$STAGES"` before either view capture or motion capture. Current selector result remains **C0 / I0**. Root's focused selector test1PASS is reused; no broader repeat.

Recovery now adds only `sparse-checkout: .github` to the existing actions/checkout@v4 step. The exporter reads its request from `.github/character-3d-qa-export.json`, imports only Python standard-library modules, fetches artifacts and base Git Data over its existing API paths, and writes its result outside the checkout; it does not require checked-out production assets or QA exports. Its test loads the adjacent exporter under `.github/scripts`. The existing branch/job/artifact provenance binding and no-ref-change export behavior are unchanged. Root's isolated .github-only22PASS and official checkout input verification are reused. Independently parsed both complete rollout and recovery YAML files successfully. No capture/image verdict is inferred from these checks.
