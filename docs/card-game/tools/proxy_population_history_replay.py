"""Current opt-in history replay over frozen 464–468 source contracts.

Only event dispatch and incarnation-finished legacy placement differ from the
frozen verifiers. All inventory, event, snapshot and hash comparisons remain.
No card metadata is inserted into a prior snapshot. No execution authority.
"""
from contextlib import contextmanager
from threading import Lock
import proxy_continuation_quick as quick
import proxy_continuation_triggers as triggers
import proxy_continuation_end as end
import proxy_continuation_actions as actions
import proxy_continuation_candidates as candidates
import proxy_continuation_state as state
import proxy_resource_value_trajectory as old
_LOCK=Lock()


def quick_verifier(verify_original, initial):
    def verify(events, shots, runtime):
        proofs = verify_original(events, shots, runtime)
        byseq = {e['event_seq']: e for e in runtime}
        for event in events:
            if event['action_type'] not in ('activate_response', 'use_item', 'use_play', 'use_event', 'resolve_event'):
                continue
            if event['seq'] - 1 not in byseq:
                continue
            prior = byseq[event['seq'] - 1]
            g = prior['legacy_continuation']['game_state']
            source = event.get('source_instance_id')
            supported = {'E-final-time', 'G-hit-blow', 'I-c_coin2', 'E-first-date'} | quick.payments.QUICK_CARDS.keys()
            if source is None or g['cards'][source]['card_id'] not in supported:
                continue
            card = g['cards'][source]['card_id']
            kind = event['action_type']
            activation = kind in ('activate_response', 'use_item', 'use_play', 'use_event')
            if not activation and (not (card == 'E-final-time' and kind == 'resolve_event')):
                continue
            history = [e for e in events if e['seq'] < event['seq']]
            if activation:
                actor = event['actor']
                normal = g['phase'] == 'normal_action'
                chance = None if normal else actions.response_inventory(prior, initial, history)
                details = quick.batch.candidates.audit(prior, history)['legal_candidate_details'] if normal else chance['legal_candidate_details']
                a = next((d for d in details if d['candidate_id'] == event['selected_candidate']), None)
                if a is None:
                    raise ValueError('historical quick activation absent from complete inventory')
                record = dict(actor=actor, selected_action=a, selected_candidate=a['candidate_id'], candidate_set_evidence=chance)
                expected, generated = quick.activate(prior, record, dict(public_events=history), initial, verify_record=False)
                raw = {k: v for k, v in generated[0].items() if k not in end.BIND_KEYS}
            else:
                if initial is None:
                    raise ValueError('final-time provenance needs signed initial seed')
                result = actions.normalize_resolution_result(prior, quick.resolve(state.current(prior), initial))
                expected = state.advance(prior, result['new_snapshots'][0]['continuation_state'], event['seq'])
                raw = result['new_events'][0]
            if expected != byseq[event['seq']] or raw != event:
                raise ValueError('quick independent provenance replay differs')
            cap = quick.batch.classification(card)
            proofs.append(dict(event_seq=event['seq'], kind=kind, card_id=card, source_reference=cap['reference'], source_raw_sha256=cap['source_raw_sha256'], duration='activation_until_resolution' if activation else 'none'))
        return proofs
    return verify


def triggers_verifier(original_verify, initial):
    def verify(events, shots, runtime):
        proofs = original_verify(events, shots, runtime)
        byseq = {e['event_seq']: e for e in runtime}
        for event in events:
            if event['action_type'] not in ('place_partner', 'place_companion'):
                continue
            source = event.get('source_instance_id')
            prior = byseq.get(event['seq'] - 1)
            if prior is None or source is None:
                continue
            history = [e for e in events if e['seq'] < event['seq']]
            inv = candidates.audit(prior, history)
            a = next((a for a in inv['legal_candidate_details'] if a['candidate_id'] == event['selected_candidate']), None)
            if a is None:
                raise ValueError('historical person placement absent from complete inventory')
            g = prior['legacy_continuation']['game_state']
            card = g['cards'][a['source_instance_id']]['card_id']
            if card not in triggers.batch.CAPABILITIES:
                continue
            cap = triggers.batch.classification(card)
            if card == 'P-cat_ceo' and g['players'][event['actor']]['board']['main'] is not None:
                raise ValueError('historical placement omits mandatory relationship trigger')
            expected, generated = legacy_placement(prior, dict(selected_action=a, selected_candidate=a['candidate_id']), dict(public_events=history))
            raw = {k: v for k, v in generated[0].items() if k not in end.BIND_KEYS}
            if raw != event:
                raw = old._source_event_shape(raw, state.current(expected), initial, old.POLICIES[0])
            if expected != byseq[event['seq']] or raw != event:
                raise ValueError('historical person placement independent replay differs')
            proofs.append(dict(event_seq=event['seq'], kind=event['action_type'], card_id=card, source_reference=cap['reference'], source_raw_sha256=cap['source_raw_sha256'], certain_growth_difference=0, duration='none'))
        for event in events:
            if event['seq'] - 1 not in byseq:
                continue
            prior = byseq[event['seq'] - 1]
            actual = byseq[event['seq']]
            source = event.get('source_instance_id')
            history = [e for e in events if e['seq'] < event['seq']]
            g = prior['legacy_continuation']['game_state']
            kind = event['action_type']
            cap = None
            if kind == 'open_turn_end_triggers':
                result = triggers.open_end(prior, history)
                if result is None:
                    raise ValueError('historical end window was not required')
                expected = state.advance(prior, result['new_snapshots'][0]['continuation_state'], event['seq'])
                raw = result['new_events'][0]
                card = None
                reference = '64-turn-boundaries-and-victory-timing.md'
                digest = __import__('hashlib').sha256((triggers.batch.rules.ROOT / reference).read_bytes()).hexdigest()
                growth = 0
            elif kind in ('activate_response', 'resolve_board_ability') and event.get('source_zone') == 'board' and (source is not None) and (g['cards'][source]['card_id'] in triggers.SUPPORTED_EFFECTS):
                card = g['cards'][source]['card_id']
                cap = triggers.batch.classification(card)
                reference = cap['reference']
                digest = cap['source_raw_sha256']
                growth = 5 if kind == 'resolve_board_ability' and card == 'W-countryside' else 0
                if kind == 'activate_response':
                    if event.get('mandatory'):
                        result = triggers.mandatory_pending(prior, history)
                        expected = state.advance(prior, result['new_snapshots'][0]['continuation_state'], event['seq'])
                        raw = result['new_events'][0]
                    else:
                        ctx = prior['legacy_continuation']['response_context']
                        actor = ctx['priority_actor']
                        current = state.current(prior)
                        if 'trigger_origin_event_seq' in event:
                            # A source group activation carries its own actor and origin
                            # (the existing adapter's bridge); the window's priority actor
                            # may be the other player, e.g. W-city on the opponent's turn.
                            actor = event['actor']
                            current['response_context'].update(priority_actor=actor, origin_event_seq=event['trigger_origin_event_seq'])
                        board = g['players'][actor]['board']
                        slot = next((s for s in ('main', 'partner', 'world') if board[s] == source), None)
                        if slot is None and source in board['prepared']:
                            slot = 'prepared'
                        details, _ = triggers.board_candidates(current, history, source, slot, prior['runtime'])
                        a = next((d for d in details if d['candidate_id'] == event['selected_candidate']), None)
                        if a is None:
                            raise ValueError('historical board trigger not legal')
                        expected, generated = triggers.activate(prior, dict(selected_action=a), history)
                        raw = {k: v for k, v in generated[0].items() if k not in end.BIND_KEYS}
                else:
                    result = actions.normalize_resolution_result(prior, triggers.resolve(state.current(prior), initial))
                    expected = state.advance(prior, result['new_snapshots'][0]['continuation_state'], event['seq'])
                    raw = result['new_events'][0]
            else:
                continue
            if expected != actual or raw != event:
                raise ValueError('shared trigger independent provenance replay differs')
            proofs.append(dict(event_seq=event['seq'], kind=kind, card_id=card, source_reference=reference, source_raw_sha256=digest, certain_growth_difference=growth, duration='activation_until_resolution' if kind == 'activate_response' else 'none'))
        return proofs
    return verify


def base_verify(events, shots, runtime_shots):
    by_seq = {s['event_seq']: s for s in shots}
    envelopes = {e['event_seq']: e for e in runtime_shots}
    if len(by_seq) != len(shots) or len(envelopes) != len(runtime_shots):
        raise ValueError('duplicate history snapshot')
    if len(shots) != len(events) + 1 or [e['seq'] for e in events] != list(range(1, shots[-1]['event_seq'] + 1)):
        raise ValueError('end history event/snapshot coverage differs')
    proofs = []
    for event in events:
        seq = event['seq']
        before = by_seq[seq - 1]
        after = by_seq[seq]
        if old.start.opening._stop_state_sha256(before['game_state']) != event.get('game_state_before_sha256', event.get('state_before_sha256')) or old.start.opening._stop_state_sha256(after['game_state']) != event.get('game_state_after_sha256', event.get('state_after_sha256')):
            raise ValueError('end history game hash differs')
        if seq >= 3:
            if before['continuation_state'] is None or after['continuation_state'] is None or old.start._hash(before['continuation_state']) != event['continuation_state_before_sha256'] or (old.start._hash(after['continuation_state']) != event['continuation_state_after_sha256']):
                raise ValueError('end history continuation hash differs')
        if seq >= 3:
            if seq - 1 not in envelopes or seq not in envelopes:
                raise ValueError('runtime history coverage absent')
            for point, legacy in ((envelopes[seq - 1], before), (envelopes[seq], after)):
                state.validate(point)
                if point['legacy_continuation'] != legacy['continuation_state']:
                    raise ValueError('runtime/legacy history differs')
            if event['action_type'] != 'attach_item' and envelopes[seq - 1]['runtime'] != envelopes[seq]['runtime']:
                if end.RUNTIME_TRANSITION_VERIFIER is None or not end.RUNTIME_TRANSITION_VERIFIER(envelopes[seq - 1], envelopes[seq], event, [e for e in events if e['seq'] < seq]):
                    raise ValueError('unclassified runtime change in history')
        if event['action_type'] == 'turn_start_and_normal_draw':
            continuation, generated, _ = end.start_regular(state.current(envelopes[seq - 1]))
            if state.advance(envelopes[seq - 1], continuation, seq) != envelopes[seq] or generated != event:
                raise ValueError('ordinary draw provenance replay differs')
        if event['action_type'] not in ('play_main_birth', 'attach_item'):
            continue
        if seq - 1 not in envelopes or seq not in envelopes:
            raise ValueError('runtime history coverage absent')
        prior = envelopes[seq - 1]
        actual = envelopes[seq]
        state.validate(prior)
        state.validate(actual)
        if prior['legacy_continuation'] != before['continuation_state'] or actual['legacy_continuation'] != after['continuation_state']:
            raise ValueError('runtime/legacy history differs')
        history = [e for e in events if e['seq'] < seq]
        inventory = candidates.audit(prior, history)
        action = next((a for a in inventory['legal_candidate_details'] if a['candidate_id'] == event['selected_candidate']), None)
        if action is None:
            raise ValueError('history action not in full legal inventory')
        cap = end.rules.classification(action['card_id']) if event['action_type'] == 'attach_item' else end.end_classification(action['card_id'])
        if event['action_type'] == 'attach_item':
            expected, generated = actions.attach(prior, action, history)
        else:
            if cap['kind'] != 'cost_modifier':
                raise ValueError('birth arrival capability unproved')
            expected, generated = legacy_placement(prior, dict(selected_action=action, selected_candidate=action['candidate_id'], candidate_set_complete=True), dict(public_events=history))
        raw = {k: v for k, v in generated[0].items() if k not in end.BIND_KEYS}
        if expected != actual or raw != event:
            raise ValueError('new placement provenance replay differs')
        proofs.append(dict(event_seq=seq, card_id=action['card_id'], kind=event['action_type'], source_reference=cap['reference'], source_raw_sha256=cap['source_raw_sha256'], envelope_before_sha256=state.state_hash(prior), envelope_after_sha256=state.state_hash(actual)))
    return proofs

def native_placement(envelope, record, inputs):
    """Same native placement for live application and exact historical replay.

    Incarnation scope finishes this boundary; callers must still compare the
    entire event and after-envelope, never substitute a successor in the past.
    """
    kind = record['selected_action']['action_type']
    current = state.current(envelope)
    if kind == 'play_main':
        after, events = old.normal.transition(current, record, inputs)
    elif kind in ('place_companion', 'place_partner'):
        candidates.placement_certificate(envelope, record['selected_action'])
        with old.placements.partner_placement_scope():
            after, events = old.extension._apply_placement(current, record)
    else:
        raise ValueError('legacy placement action differs')
    if len(events) != 1:
        raise ValueError('multi-event placement needs full envelope snapshots')
    result = state.advance(envelope, after, after['last_event_seq'])
    return (result, [actions.bind_event(envelope, result, events[0])])

# Connection.scope supplies the same lifecycle finisher as live placement.
legacy_placement = native_placement

@contextmanager
def scope():
    if not _LOCK.acquire(blocking=False):
        raise ValueError('history replay scope reentry/concurrency forbidden')
    original_base, original_quick, original_triggers = end.verify_new_events, quick.scope, triggers.scope
    @contextmanager
    def quick_scope(initial=None):
        prior = end.verify_new_events
        with original_quick(initial) as value:
            end.verify_new_events = quick_verifier(prior, initial)
            yield value
    @contextmanager
    def trigger_scope(initial):
        prior = end.verify_new_events
        with original_triggers(initial) as value:
            end.verify_new_events = triggers_verifier(prior, initial)
            yield value
    try:
        end.verify_new_events = base_verify
        quick.scope, triggers.scope = quick_scope, trigger_scope
        yield
    finally:
        end.verify_new_events, quick.scope, triggers.scope = original_base, original_quick, original_triggers
        _LOCK.release()
