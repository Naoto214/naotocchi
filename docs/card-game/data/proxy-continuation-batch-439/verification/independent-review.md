## Senior Code Review — continuation439

**Disposition: resolve the two Important findings before saving439 as complete.** No Critical findings. Neither finding was observed in the fixed eight saved trajectories; both violate the requested fail-closed behavior for nearby conditions.

Read-only review of the tracked diff, nine new implementation modules, eight new test modules, relevant source clauses, plan, report, and saved artifact. No repository, index, HEAD, or branch mutations.

### Strengths

- Shared transitions reconstruct candidate legality, payment, targets, state, and generated events. Verification extends beyond checking hashes.
- Whole-section capability hashes prevent selected source fragments from concealing additional semantics.
- Typed payment, turn-stat, challenge-stat, and conditional-reward effects have explicit identity, consumption, and expiration checks.
- Preparation projections and public event projections deliberately restrict concealed identities and private choices.
- Scoped adapters restore previous defaults; the end-inventory canonicalizer is explicitly opt-in.
- Fixed-route observations remain separated from adoption evidence: balance sample count0 and promotionfalse.

### Critical

None found.

### Important I1 — Actual card plays inside a response window can lose their trigger opportunities

**Locations**

- `docs/card-game/tools/proxy_continuation_batch.py:120–126`
- `docs/card-game/tools/proxy_continuation_triggers.py:47–53`
- `docs/card-game/tools/proxy_continuation_quick.py:91–95`

The classifiers inspect the event identified by `response_context.origin_event_seq`. A quick card activated inside an existing window preserves that window’s original anchor. Consequently, the actual triggering card play can be newer than the inspected event.

This silently returns `trigger_condition_not_met` for:

- **M-antlion-03:** source55, lines220–223 permits activation when the opponent quick-plays a card on their turn while the owner has concealed preparation. Board ability activations, equipment placement, and later trap activations are explicitly excluded.
- **W-city:** source89, line52 counts qualifying card plays, including action cards. Its second qualifying card can be played inside an already open response window.

**Minimal reproduction executed**

Under `batch.scope()`:

```python
history = [
    dict(seq=1, actor='A', action_type='turn_start_and_normal_draw'),
    dict(seq=2, actor='A', action_type='place_world'),
    dict(seq=3, actor='A', action_type='activate_response',
         source_zone='hand'),
]
context = dict(priority_actor='A', origin_event_seq=2)
```

Give A `W-city` on their board and call:

```python
triggers.board_candidates(current, history, city_source, 'world')
```

Observed: `turn_card_count(..., through=3) == 2`, but the inventory is empty with `trigger_condition_not_met`.

For M3, use the same history, `priority_actor='B'`, B’s main `M-antlion-03`, and B’s own concealed preparation. Set `batch.RESPONSE_FULL_RUNTIME` to that preparation metadata. `batch.response_capability(...)` also returns `trigger_condition_not_met`; it examines the world-placement anchor instead of A’s quick play.

**Effect:** a legal optional opportunity disappears without execution or an unsupported-contract stop. Replaying the same omission reproduces it successfully.

**Fix:** separate the response-window anchor from source-bound triggering occurrences. Enumerate the actual eligible card-play event within the current window, bind trigger use/provenance to that occurrence, and retain M3’s source-specific exclusions. Add red tests for both reproductions, repeated enumeration/use, and non-card board activations.

**Actual8 reachability:** no M3 positive condition or W-city second qualifying response play was found in the saved eight. This finding does not establish an incorrect saved winner or growth total.

### Important I2 — Last-link quick resolution bypasses M6’s positive unsupported obligation

**Locations**

- `docs/card-game/tools/proxy_continuation_payments.py:226–228`
- `docs/card-game/tools/proxy_continuation_batch.py:127–135`
- `docs/card-game/tools/proxy_continuation_batch_runner.py:16–39`

A last-link quick resolution returns directly to `normal_action` with no pending trigger. M6’s positive-condition check exists in the response classifier, which is not reached at that boundary.

Source55, lines244–247 permits M6’s ability when an own quick-played card’s effect applies during the owner’s turn, with a hand world available for payment and a discard world available as target. Its unsupported resolution may remain outside this edition, but eligible conditions must stop instead of disappearing.

**Concrete reproduction executed**

Starting from saved439 `results[1].snapshots` at `event_seq == 88`, construct an ordinary resolving boundary:

1. Remove `game_state.challenge`; use B as turn player.
2. Move B’s `M-antlion-06` from its current ordinary zone to B’s main slot; move the replaced main to discard.
3. Move B’s `W-city` to hand and `W-countryside` to discard.
4. Retain the resolving `E-big-illness` link and its valid opposing main target.
5. Under `payments.scope(), batch.scope(), preparation.scope()`, validate the envelope, then call `payments.resolve(envelope)`.

Observed:

```text
quick effect applied: True
after phase: normal_action
pending triggers: []
next normal inventory candidate_set_complete: True
```

The envelope and resulting envelope pass `state.validate`. No positive M6 obligation is checked.

**Effect:** continuation accepts a successfully applied own quick effect and proceeds past an eligible unsupported ability. The current resolver and replay share this omission.

**Fix:** add a shared post-resolution obligation check before accepting continuation. For a positive unsupported M6 condition, fail closed with source-bound evidence. This does not require inventing a new response-window rule. Apply the check to all quick-resolution paths, including legacy delegated resolvers, and independently recheck it during provenance replay. Test positive, insufficient-resource, opponent-turn, and no-effect-applied cases.

**Actual8 reachability:** no saved own quick resolution with M6 plus both required world resources was found. This finding concerns nearby fail-closed coverage.

### Minor

None identified separately.

### Verification performed

- Independently ran the eight new test modules: **93 tests PASS**.
- Confirmed artifact compressed/raw hashes match the manifest.
- Confirmed **350 execution-source hashes** match current files.
- Read saved results: **8 completed, 0 stopped**, final sequences181,340,182,284,169,313,181,283; balance0 and promotionfalse.
- Scanned saved events/snapshots for the positive conditions described above; neither finding was reached.
- Executed the focused reproductions above. No reproduction script was persisted.

### Recommendations

Resolve I1 through shared occurrence/history contracts and I2 through a shared post-resolution obligation guard, using targeted red tests first. Preserve the existing window anchor and historical defaults. Recheck focused tests, compatibility, and artifact/source integrity after changes; regenerate affected evidence if execution sources change.

The root’s proposed repair scope matches these recommendations and does not require new game rules, rulings, numerical values, or protected-source edits.

### Declined to judge

- **Full505 engine completeness and board incarnation re-entry:** outside this edition; unsupported cases must still fail closed.
- **Balance, policy adoption, or112 outcomes:** no independent balance sample or112 execution was supplied; foundation repairs are not adoption evidence.
- **Remote PR259 state:** no remote API inspection performed. This review authorizes neither merge nor promotion.
- **Fresh full329/npm406/dual-generation execution:** reviewed the supplied gate evidence; did not rerun those broad gates.
- **Independent byte comparison of all833 historical data files:** tracked status shows no historical data modifications, but I did not perform a separate833-file baseline comparison.
