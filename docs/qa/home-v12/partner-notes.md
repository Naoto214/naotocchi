# Home v12 partner life audit

## Root causes and boundaries

- `bounds`, `destination`, terrain `nearest`/`route`, swept collision, and visibility checks were already shared across pet, companion and partner. No role-specific movement rectangle existed. Body/attachment dimensions legitimately change safe extents. These functions remain unchanged.
- The existing social selector picked every other resident uniformly. A partner had no preference for the protagonist; differences in observed position came from selection, body sizes, collision and initial placement.
- Manual selection and successful moves deferred idle for only four seconds. Arrival replaced that delay with 3–8 seconds; cancellation reduced it to two; resize/navigation/roster reflow could replace actor timing. An ordinary `nextAt` delay could therefore not express a stable player-input grace period.
- A social arrival could also change a selected/held pet's direction and activity because reciprocal `together` did not check player control.

## Changes

A separate ephemeral `manualUntil` deadline gives twelve active seconds after selection or any finite manual movement command. Sync retains it by actor key even when position/route must reflow. Care/conversation/sleep blocking freezes the existing model clock, so blocked time cannot consume grace. Arrival, ordinary defer, and cancellation cannot shorten it. Ambient commands cannot override either grace or an unfinished manual route. Reciprocal social animation respects both grace and held input.

Partner preference remains inside the existing `approach`/`together` idle choices. When apart, those choices gain weight and an overdue walk uses the same together path; near the pet, normal idle weights and free roaming remain. Social destinations use variable angle and comfortable distance based on body dimensions. The normal destination, terrain route, collision, visibility, recent-activity, weather, night speed and 5/3/2 movement-budget paths still apply. No separate AI, gameplay state, save schema, gameplay RNG or conversation engine was added or modified.

## Test evidence

New `tests/home-v12-partner-test.cjs`: **11/11 passed**. It covers:

- Twelve-second selection grace and eventual autonomy resumption.
- Drag arrival plus frequent sync, resize and repeated care cancellation.
- Grace renewal, prevention of ambient override, and authoritative manual routes lasting more than twelve seconds.
- Six-resident body-size/roster reflow without losing grace.
- Equal-sized pet/companion/partner exact common bounds and identical final destinations around a real terrain obstacle, including asymmetric attachment extents.
- Four deterministic 600-second household comparisons with additional social targets. Existing manual-input controls keep the comparison residents stationary; only the tested resident roams. Close means less than 130 px; far means more than 210 px.
- Reduced motion, held actor and generic blocking. Sleep/conversation reach this same `blocked` flag through the adapter; this model test does not independently test that upstream wiring.
- 300-second simulations at 5, 6 and 28 residents: existing 5/3/2 ambient budgets held, no pairwise overlap, movement continued.
- Social arrival leaves selected/held pet activity and facing alone.
- A 180-second autonomous partner simulation follows an actual terrain detour, returns near the pet, never crosses the solid and never overlaps the pet.

| Four-seed aggregate | Companion reference | Partner |
| --- | ---: | ---: |
| Samples within 130 px |503/2400 (21.0%)|1513/2400 (63.0%)|
| Samples beyond 210 px |1582/2400 (65.9%)|600/2400 (25.0%)|
| Far-to-close returns |29|43|
| Occupied 10 px close-distance bands |9|9|

The original two-resident comparison was unsuitable for measuring partner-specific target preference: its companion already had the pet as its sole social target. The final four-resident fixture supplies alternate targets. Removing partner recognition in a process-local mutation makes the final test fail with identical 503/2400 proximity for both roles. The grace, route priority and reciprocal-social regressions were observed failing before their corresponding fixes.

`node --test tests/home-v12-partner-test.cjs tests/home-diorama-test.cjs tests/home-terrain-navigation-test.cjs`:31/31 passed at the initial nine-test partner revision. The final eleven-test partner file subsequently passed 11/11. A final run of the eleven partner tests plus all fifteen existing model tests passed 26/26, and `node --check home-diorama-model.js` passed. Existing 15 model tests and 7 terrain tests were not edited or weakened.

`npm test` was attempted during integration: initial blocks 142/142 and 26/26 passed; the next block passed 23/24. It stopped on `social-expression-integration-test.cjs` → `presenter turns body and head only as presentation and reduced motion suppresses it`, because sparse checkout lacked `character-3d/runtime.mjs`. Root owns restoring the remaining inputs and final broad verification. Existing Node `MODULE_TYPELESS_PACKAGE_JSON` warnings for vendored Three are unchanged.

## Limits and follow-up

The deterministic tests are behavioral checks, not claims that all real art sizes or crowded phone layouts can achieve the same proximity ratio. Crowded terrain can legitimately prevent a return, and the model must keep safety and player control ahead of preference. Visual comfort, actual phone touch sequences and upstream sleep/conversation blockers need root's integrated browser QA. No screenshot or browser observation was performed by this model task. New tests should be included in the root's integrated test command/CI entrypoint.
