# Motion repair workflow review

Reviewed the unstaged two-file root diff against `ad96bc539b8bfc2799d1ad8e9790fa5360c0f4ac`: `.github/workflows/character-3d-rollout.yml` and `tests/character-3d-integration-workflow-test.cjs`. No implementation edits or captures.

**Current result after focused correction review: C0 / I0.** Original I1 below is resolved. Actual repair captures and image acceptance remain pending.

## Resolved Important I1 — invalid YAML in stage-matrix command

Location: `.github/workflows/character-3d-rollout.yml`, stage-matrix inventory step, current line22.

The new single-line plain YAML value contains the JavaScript ternary `? ['mushroom','clownfish'] : Object.keys(...)`. The colon followed by a space is interpreted as a YAML mapping separator despite the shell command's inner double quotes. Independent PyYAML parsing fails:

```text
yaml.scanner.ScannerError: mapping values are not allowed here
line 22, column 126
```

The exact HEAD workflow parses successfully with18 jobs. The new regex-based routing test executes the extracted JavaScript successfully but never parses the whole YAML, so all seven tests PASS while the actual workflow is invalid. Change the command to `run: |` with the command indented underneath, or validly quote the entire YAML value. Adjust extraction/verification accordingly and parse the complete final workflow before saving. This blocks all proposed CI evidence, not merely the repair stage.

## Other reviewed behavior

- For motion-repair alone, with integration, with nonplayer, with scene, or with old family markers, the current conditions enable only stage-matrix, stage-evidence and dedicated. Stage matrix JavaScript selects exactly mushroom and clownfish. The existing stage job retains normal all-eight front/back distance capture, then all-eight four-view source comparison and the exact eight affected motion stages. Actual topology/fish candidate factories expose stages1–8 for these two families.
- Actual CLI parsing supports the commands: wave-review accepts `--topology --line=mushroom` and `--fish --line=clownfish`; wave-motion accepts the positional comma-separated1-based stage list. The repair block passes `bash -n`. The stage lists are mushroom5/6/7 and clownfish2/3/5/6/7; no new capture tool is added.
- Integration missing-motion step is suppressed when motion-repair is present, avoiding duplicate captures. Aggregate stage-coverage is suppressed, so the two-family result does not claim same-source248 coverage. Unrelated scene/performance/gallery/source-review jobs and broad/scoped unrelated mutation steps are suppressed. Dedicated remains the existing broad regression plus fish/fungus mechanism controls for ordinary repair mode.
- Existing job IDs/matrix key and `full-rollout-stages-${matrix.line}-${github.sha}` artifact binding remain. Exporter `.github/scripts/character_qa_export.py` maps that artifact to `stage-evidence (<family>)`, which the unchanged matrix naming retains. Nested repair directories preserve source provenance under those family artifacts.
- With motion-repair plus runtime, runtime's prior exclusion of stage jobs takes precedence while motion-repair suppresses meguru-wave: only dedicated runs its focused runtime route. No capture occurs in that mixed mode. This is a routing limitation rather than a widened scope; use motion-repair without runtime for the intended repair evidence. The submitted test does not currently cover this pair, though independent expression evaluation established it.

## Verification and limits

Independent existing plus new workflow tests: **7/7 PASS, 2753.77257 ms**. Existing64 family-marker combinations and integration routing remain unchanged. Repair shell syntax passes and JavaScript matrix selectors execute correctly. `git diff --check` is clean. Whole-YAML parsing fails as stated above; base18-job parsing succeeds.

Actual CI capture duration, artifacts and independent image/motion acceptance remain pending. The25-minute stage timeout is bounded but has not been measured for the new combined commands. No browser or full suite was rerun.

## Focused correction review

Root changed the inventory command to the requested multiline `run: |` scalar and changed the test command extraction from the single-line `run:` assumption to the actual `node -e` command. Independently parsed the complete corrected workflow with PyYAML: **PASS,18 jobs**. Inspected the parsed inventory run value; it preserves the intended exact two-family ternary and GITHUB_OUTPUT write. Diff check remains clean. Root's corrected seven-test PASS is reused; the command content is unchanged and no full routing replay was needed. This resolves I1 without altering the reviewed job/step routing, artifacts or capture commands.
