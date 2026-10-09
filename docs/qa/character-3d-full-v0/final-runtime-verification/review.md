# Final runtime integration QA review

Reviewed head `c4e5b2263acf04e5c6c873a563b88392b5bf1b92` against base `711f2dcb6836f27370b8155483f466ea312458df` in `/workspace/scratch/150320e8a2fd/rollout-final-runtime-integration`. Worktree is clean. Scope: six QA/test/workflow files, as listed in `final-runtime-integration-report.md`. No implementation edits were made during review.

**Code/spec result: C0 / I0.** No actionable critical or important finding. This approves the bounded QA changes for integration; it does not certify browser execution, final45 readiness, source images, performance acceptance, or PR readiness.

## Spec and quality

- The new functional route serves production directly, with no candidate factory or historical revision. Its inventory independently requires45 master roles, preserves the two legacy companion IDs, checks exact role model/source and stage0, and rejects a filtered full sweep. Actual browser actor identity, production lookup, live template identity, attached holder, fallback and failed-template counters are validated. Readiness failure and validation/browser errors propagate and produce failure metadata when the browser has launched. Pending roles in the worker base remain explicit; subset PASS cannot become final45 PASS.
- Author reuses the actual legally available memory_lake resident and existing forest adapter. Natural2D is observed before staging; object identity and pose/draw/step/list restoration are checked after release. Save/getter/write-count assertions bracket the complete author staging interval. The successful path does not suppress release errors. The finally fallback suppresses an additional page cleanup error only while closing the isolated context; it cannot turn a failed validation/readiness into PASS.
- `--no-capture` prevents the existing screenshot function from taking or inventing images; the functional helper has no capture operation. Integration scene/metrics flags reject candidate and historical source modes. The ordinary source capture path and ordinary workflow commands remain available outside the integration marker.
- The repeated scene probe warms once and records three complete off/on and forest/city/forest cycles. It requires actual city/off live and holder cleanup, forest recovery, six warmed template/material/atlas/eye/GPU resource plateaus, created-minus-removed balance, unchanged save storage/getter/write counts, and restored simulation step/region. It runs before intentional actor fallback. It does not force a city presenter reset to manufacture cleanup. Existing lifecycle/fallback assertions remain in the scene command.
- Animation measurements instantiate independent animation/bone trees from each actual live template, preserve exact composition, warm30 and measure120 frames, and dispose the clones in finally. Runtime `disposeInstance` does not dispose shared template geometry/materials. Live actor animation/bone state is compared before/after. The label correctly describes isolated QA animate CPU rather than main render CPU.
- Appearance measurements retain timestamped RAF samples and neighboring frames around actual creation/build events. They exclude unrelated startup maxima and use an explicitly observational label. Missing windows and incorrect clone count/composition/unchanged state fail the command. These metrics currently have no numerical acceptance threshold and claim no iPhone performance result.
- Workflow changes use the existing `meguru-wave` job, preserve its artifact root and timeout, and add the production45, strict scene, and native-composition measurements only for `[qa:integration]`. The existing stage/gallery/aggregate routing is untouched. A subsequent `[qa:nonplayer]` source save does not gain the integration route. No production model, registration, renderer, runtime, gameplay, save, World/Home, Expression, or 2D file is changed.

## Evidence checked

Read the exact diff, helper/CLI/workflow/test/control code, production presenter instantiation/disposal and renderer region handling, worker report and raw logs. `git diff --check` is clean; the final QA-helper SHA256 is `c1e575dfece9d8f8fead2320755ba0ff62dbdd5219175c3280c2be439662e381`, matching the control restore log.

Independent narrow check (no actor-template rebuild or mutation replay):

```sh
node --test --test-reporter=tap --test-name-pattern='production role planner|functional gate|repeated scene gate|final integration wiring|appearance windows|served lookup' tests/character-3d-runtime-integration-test.cjs
```

**7/7 PASS, 514.595319 ms.** This covers planner identities/full-sweep constraints, functional and author rejection gates, strict repeated-scene validation, integration wiring, appearance-window semantics, and served production spec equality.

Reused the unchanged worker evidence: combined15/15 PASS in47.965007 s includes43 actual production Node simulation actors/presenters plus workflow checks; seven guard mutations each produce assertion RED and restore exact helper bytes before focused GREEN. These controls meaningfully remove full45, actual kind, live template, Author draw restoration, city cleanup, resource plateau, or replace the appearance window with unrelated sample maxima. They exercise gate sensitivity, not browser execution. The actual presenter fallback test independently makes a real actor fail presentation without changing saved state.

## Minors and open items

No blocking minor. Much of the new code/test file is densely formatted; this does not impair the reviewed invariants, though future maintenance could benefit from normal formatting.

**Browser/CI gate OPEN.** The inspected smoke/scene logs stop at missing Playwright Chromium launch. They contain no successful role sweep, WebGL lifecycle, save-write, cache plateau, or timing evidence. The isolated base has43 registered roles; root's later45-role promotion is outside this reviewed commit. Final immutable CI must run the production `--require-full` route against that promoted source and the strict scene/performance commands.

The report's retained-city-holder concern is an unverified production hypothesis. The code leaves the strict city test enabled so an actual failure will be visible; no defect is declared from the hypothesis and no assertion relaxation is approved here. Actual source image decisions remain separately root-owned.
