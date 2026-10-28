# Independent runtime review: 873e8cd2 -> f1025fdd

- Reviewed commit: `f1025fdd113f6d15bc6f0b7ea21925cc9f8bac9a`
- Base (last independently reviewed edition): `873e8cd276c425c1c2ea7793728f0f509b029a10`
- Diff: `review-runtime.diff` (runtime tools only, tests excluded; 25 files, 1428 lines)

## Files covered

All 25 runtime files in the diff (all under `docs/card-game/tools/`):

proxy_population_approval_transport.py, proxy_population_board_predicates.py,
proxy_population_challenge_return.py (new), proxy_population_challenge_window.py,
proxy_population_concealed_origin.py (new), proxy_population_connected_entry.py,
proxy_population_current_preflight.py, proxy_population_designated_effects.py,
proxy_population_external_approval.py, proxy_population_final_time_round.py (new),
proxy_population_growth_runtime.py, proxy_population_history_replay.py (new),
proxy_population_incarnation_runtime.py, proxy_population_incarnation_window.py,
proxy_population_next_board.py (new), proxy_population_paid_draw.py,
proxy_population_positive_window.py, proxy_population_prepared_predicates.py,
proxy_population_remote_publication.py, proxy_population_resolution_choices.py,
proxy_population_response_group_closure.py, proxy_population_timing_occurrence.py,
proxy_population_trigger_connection.py, proxy_population_trigger_replay.py,
proxy_population_trigger_window.py.

## Method

- Read the full diff, then read the surrounding code in the worktree for every
  wrapped or replaced frozen function: `proxy_continuation_end.verify_new_events`,
  `proxy_continuation_quick` (scope/verify/activate/hand_candidates/resolve),
  `proxy_continuation_triggers.scope`, `proxy_continuation_preparation.response_inventory`
  and its reaction classifier, `proxy_continuation_actions.response_inventory`,
  `proxy_normal_action_candidate_completeness` (121) and the 125/127 extensions,
  `proxy_reached_mixed_contracts_401.classify_next_board/board_reason`,
  `proxy_normal_action_seeded_restart._verify_step`, the opportunity ledger and
  `trigger_sequential.close_turn/inventory`, `proxy_turn_end_provenance_restart.derive_provenance`,
  hand predicates, prepared predicates, and the approval/launch modules.
- Compared the new copies in `history_replay.py` (`base_verify`, `quick_verifier`,
  `triggers_verifier`) line by line with the frozen originals.
- Checked rule text: 06 (chain resolution and post-chain triggers, lines 39/56/145),
  72 C-cat_friend, 77 I-poop1/I-bond1/I-bowtie, 89 W-city, 91 E-final-time.
- Frozen-file check: `grep -c '"tools/<file>"' data/proxy-population-runtime-468/sources.json`
  for each of the 25 changed files returned 0; sources.json itself is unchanged
  between the two commits. The frozen modules that are wrapped (quick, end,
  triggers, preparation, actions, candidates, 121, 401, 122 restart, challenge)
  all return 1 and are unchanged.
- Ran read-only Python snippets with `-B` and `PYTHONDONTWRITEBYTECODE=1` from the
  tools directory; the worktree stayed clean (`git status --porcelain` was empty
  before and after).

## Area results

### Approval gate (external_approval, approval_transport, remote_publication, launch_authorization)
- PR moved 259 -> 408 in one place (`transport.PULL_REQUEST`). The transport allowlist,
  the request `pull_request` field (and so the digest and approval text), the comment
  `issue_url`/`html_url`, the PR read, and the comment pagination all use the same constant.
- Author id/type, exact body (`approval_text`), `created_at == updated_at` (no edits),
  scanning for owner revocations, open/draft/unmerged state, head repo, `BRANCH`,
  head sha and exclusive local consumption by comment id (`O_EXCL`) are unchanged.
- `HISTORICAL_PULL_REQUESTS` is unused, so it opens no bypass. A #259 request fails
  `_validate_request` (`pull_request != PR`).
- No weakening found.

### Frozen files
- None edited.

### Fail-closed / rule review of the new wrappers
- **challenge_return**: before it rebinds the fields, it proves the native hash fields
  against the native state. It accepts only a phase-only change from `normal_action` to
  `response_window` with an empty chain, unchanged pending triggers and the exact
  battle-status return target. The scope refuses to install unless the prior adapter
  is the native `challenge.normalize_result`, and it restores that adapter in `finally`.
- **concealed_origin**: `projected()` is byte-for-byte the frozen body after the origin
  classification. It is bypassed only when the window origin is `activate_main_ability`
  or `activate_companion_ability` from M-antlion-02/08 or C-cat_friend. That origin must
  be bound to its live link and to the pinned section hashes. Per 77, I-poop1 answers
  only an opponent's main-removal activation, and neither origin text removes a main.
  Later chain links are still route-checked in `prepared_predicates.public_effect_route`.
  I-bond1 (77: only opponent effects moving the companion to hand or discard) is
  correctly inactive. No concealed identity is read; the exclusion rows include ids for
  the actor's own cards only, as in the frozen code.
- **final_time_round**: per 91, the R10 branch is independent of the main stage
  ("R10ならたまごでも条件可"). The scope admits the unit only when the 121 row's sole
  reason is `required_own_main_absent`, the round is 10, there is no main, and the
  prerequisite and section are re-verified. It then re-raises the native
  `missing_candidate_id_grammar` so the existing single-target grammar (127) assigns the
  ID. Same-name, time and target are still checked independently by
  `hand_predicates.audit_normal` (a disagreement raises "hand activation disposition
  differs") and by `quick.activate` → `hand_candidates`.
- **next_board**: the scope catches only the exact 401 refusal string. Per 72,
  C-cat_friend's ability is an activated own-turn ability with no turn-start trigger,
  and that is all the next-board classification asks about.
- **timing_occurrence**: typed receipts are read as before. A typed-creation route needs
  `creation.audit` with exactly 0 or 1 created effects, and 0 must carry the 474
  `not_applied` status. An E-final-time verdict is recorded as an obligation, and
  `connected_entry.reconstruct` enforces it through `require_deferred`. That is the
  reconstruct path used by `attempt_runner` and `admission`, and a missing obligation
  raises. The intermediate-capture rebinding needs the same seq, source, link and
  verdict on a single trace event that the designated audit verified.
- **positive_window.captured_rows**: deduplicates by `ledger.identity`, which is a
  sha256 over the exact canonical row with a fixed field set. Only byte-identical
  rows collapse, so distinct occurrences are still refused.
- **trigger_window**: the post-chain re-activation (`unresolved_occurrence`) matches
  06 line 56. `ledger.offer` offers only `pending` rows, and `sequential.inventory`
  refuses offers during resolution, so it adds no interrupt during resolution and no
  double offer. A turn change while a group is active goes through `close_turn`, which
  raises on unfinished occurrences. The coverage-audit `except` only adds detail and
  always re-raises.
- **response_group_closure._city_window**: an occurrence counts only when it is re-collected
  through the existing adapter with a bound collection audit and the journal matches it
  exactly. If no occurrence is found, the source is reported as unproved and is never
  certified as a negative. After that, the existing status, receipt and reoffer checks
  still apply.
- **trigger_replay / history_replay actor-origin bridge**: if an event carries
  `trigger_origin_event_seq`, its activation verifies only through the group-record
  path in `trigger_replay.activate`. That path checks the origin against the ledger
  occurrence and replays the full activation. Without a record, the native
  re-activation produces no such field, so `raw == event` fails and verification is
  refused.
- **incarnation_runtime**: the registry fallback accepts only an exact digest of the
  active projection, and disagreeing full records raise. In the `final_comparison`
  wrapper, the frozen 122 `_verify_step` likewise never checks the before-state's own
  continuation hash, so the wrapper does not weaken it. All new patches
  (`legacy_placement`, `_verify_step`, `turn_boundary.prepare/apply_choice`) are
  restored in `finally`.
- **designated_effects**: the relabel applies only to E-final-time, with outer links
  left and a `post_placement_response` before-phase. It mirrors the frozen
  `quick.resolve` projection. A wrong application causes a mismatch, which fails
  closed.
- **board_predicates / prepared_predicates / resolution_choices / trigger_connection
  `start_draw_descriptor`**: the widened allowlists still require exact link binding
  and the pinned catalog and capability rows.
- **current_preflight**: the new report path does not exist yet. `read()` and the
  report checks make the preflight fail closed until a valid report is generated.

## Findings

### F1 (minor): history_replay.scope shadows chain_resolution's history verifier
- Location: `proxy_population_history_replay.py:313` (`end.verify_new_events = base_verify`),
  entered from `proxy_population_incarnation_window.py:42`. The shadowed scope is entered
  first, at `proxy_population_challenge_window.py:142` (`chain.scope()`).
- `history_replay.scope` replaces `end.verify_new_events` instead of chaining onto it.
  `challenge_window.contract_scope` enters `chain_resolution.scope()` before
  `incarnation_window` enters `history_replay.scope()`. As a result, chain_resolution's
  `verify` is not called during the whole positive segment. A read-only snippet
  confirmed this: inside both scopes, `end.verify_new_events is base_verify` and the
  chain verifier is inactive. Both are restored correctly on exit.
- Failure scenario: a historical `resolve_item` (I-c_coin2) or `resolve_play`
  (G-hit-blow) carrying `application_evidence` is no longer re-derived through
  `resolve_top` during history verification. It also gets no provenance row.
  `growth_runtime.first_date_proofs` compensates for E-first-date only.
  `TEXT_REGISTRY` has no `resolve_item` or `resolve_play` rows, so `derive_provenance`
  classifies these events as unknown (`unresolved_effect_provenance`).
- Why minor: every consequence is fail-closed (an unresolved provenance or a stop),
  never a pass. The same resolutions still get independent full-delta checks from
  `quick_reveal.audit` and `first_date.audit` in `trigger_coverage`, which scans every
  transition. The module docstring ("All inventory, event, snapshot and hash
  comparisons remain") overstates what is preserved. The growth_runtime docstring
  ("chain_resolution, when it is not shadowed") shows the shadowing was known. A
  possible liveness cost for matches with coin/hit-blow resolutions before a turn-end
  provenance derivation was not exercised here.

### F2 (minor): start-effect origin check widened from equality to a range
- Location: `proxy_population_trigger_connection.py:65`.
- The exact `ctx.origin_event_seq == captured origin` check became
  `captured origin <= ctx.origin_event_seq <= now`.
- Failure scenario (theoretical): a C-chicken or I-bowtie start link resolved under a
  different window. That would need the same `turn_start` window kind, the same turn
  player in both the game and the context, and the source in the captured start group,
  inside the same `connection.scope(current_proof)`. That combination occurs only for an
  arrival group activated inside the same start window, which is the intended case.
  No concrete wrong-pass path was found. Recorded only because it widens an exact match.

No material findings: no fail-open regression, rule drift, hidden-information read,
approval-gate weakening, unrestored monkeypatch, or frozen-file edit was confirmed.

UNRESOLVED MATERIAL FINDINGS: 0


---

# fixed400 final preflight — review resolution (tested commit f1025fdd)

Independent review of the runtime diff 873e8cd2..f1025fdd (25 files, tests excluded): `UNRESOLVED MATERIAL FINDINGS: 0`.

Two minor findings were reported. Both are fail-closed (they can only stop a match, never let a wrong result pass). They are accepted without a code change, because changing code now would create a new, undiagnosed edition:

- F1 `tools/proxy_population_history_replay.py:313` — the history-replay scope replaces, instead of chaining, the chain-resolution history verifier. Past I-c_coin2 / G-hit-blow resolutions then end as unresolved provenance, which is a stop. Possible liveness cost only. On the diagnosed edition 44d54844 (identical runtime to f1025fdd except the one-line preflight selector), all 400 fixed matches completed, so no fixed-400 row hits that stop.
- F2 `tools/proxy_population_trigger_connection.py:65` — the start-effect origin check is a bounded range bound to the captured start group, the turn player and the turn_start window, instead of exact equality. The reviewer found no path where a wrong result passes.

Neither finding changes a legal candidate set or a game rule. They remain recorded here for later regression work.
