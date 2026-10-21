"""Read-only457 linkage audit; no policy execution or balance admission.

Checks recorded hashes/edges and explicit top-level decision anchors. Does not
validate state-transition rules, legal sets, nested view semantics, or absent
choice opportunities. A self-consistently rewritten run is not authenticated by
this function; use the source-pinned saved loader at the artifact boundary.
"""
from collections import Counter
from proxy_judgment_evidence_audit import canonical, sha
from proxy_resource_value_selection import canonical_sha256
from proxy_normal_decision_seeded_restart import _stop_state_sha256

SCHEMAS = {
    'continuation_contract_v1': 'naotocchi.card_game.continuation_envelope.v1',
    'continuation_contract_v2': 'naotocchi.card_game.continuation_envelope.v2',
}


def _sequence(value):
    if type(value) is not int or value < 0:
        raise ValueError('invalid sequence')
    return value


def _hashes(snapshot, contract):
    if type(snapshot) is not dict or snapshot.get('schema') != SCHEMAS[contract] or snapshot.get('execution_contract_id') != contract:
        raise ValueError('snapshot contract differs')
    _sequence(snapshot.get('event_seq'))
    payload = snapshot['legacy_continuation']
    if type(payload) is not dict or set(payload) != {'game_state', 'response_context', 'activation_zone', 'pending_triggers', 'return_target'}:
        raise ValueError('continuation payload differs')
    if type(snapshot.get('runtime')) is not dict or type(payload['game_state']) is not dict:
        raise ValueError('state/runtime missing')
    return {'envelope': canonical_sha256(snapshot),
            'continuation_state': canonical_sha256(payload),
            'game_state': _stop_state_sha256(payload['game_state'])}


def audit_record(run):
    """Return structural evidence, or ValueError; never repair source records."""
    try:
        return _audit_record(run)
    except (KeyError, TypeError, IndexError) as error:
        raise ValueError('malformed record: '+str(error)) from error


def _audit_record(run):
    if type(run) is not dict or run.get('schema') != 'naotocchi.card_game.continuation_run.v1':
        raise ValueError('unsupported run schema')
    contract = run.get('execution_contract_id')
    if type(contract) is not str or contract not in SCHEMAS:
        raise ValueError('unsupported execution contract')
    for key in ('run_id', 'policy_id', 'path_id'):
        if type(run.get(key)) is not str or not run[key]:
            raise ValueError('run identity missing')
    for key in ('events', 'snapshots', 'decisions'):
        if type(run.get(key)) is not list:
            raise ValueError('record inventory missing')
    events, shots = run['events'], run['snapshots']
    if len(shots) != len(events)+1:
        raise ValueError('event/snapshot cardinality differs')
    if canonical(run['initial_envelope']) != canonical(shots[0]) or canonical(run['final_envelope']) != canonical(shots[-1]):
        raise ValueError('initial/final snapshot differs')
    if _sequence(run['last_valid_event_seq']) != _sequence(shots[-1]['event_seq']):
        raise ValueError('final sequence differs')
    hashes = [_hashes(shot, contract) for shot in shots]
    for index, event in enumerate(events):
        if type(event) is not dict or event.get('execution_contract_id') != contract:
            raise ValueError('event contract differs')
        before, after = shots[index], shots[index+1]
        if _sequence(event['seq']) != after['event_seq'] or after['event_seq'] != before['event_seq']+1:
            raise ValueError('nonconsecutive edge')
        for side, digest in (('before', hashes[index]), ('after', hashes[index+1])):
            for prefix, expected in digest.items():
                if event.get(prefix+'_'+side+'_sha256') != expected:
                    raise ValueError('event '+prefix+' '+side+' hash differs')
    # Only explicit pre-event anchors are interpreted. Intra-resolution choices
    # without event_seq require a future source-grounded microstep contract.
    by_seq = {s['event_seq']: h for s, h in zip(shots[:-1], hashes[:-1])}
    anchors = []
    for index, decision in enumerate(run['decisions']):
        if type(decision) is not dict:
            raise ValueError('decision not an object')
        row = dict(decision_index=index, decision_sha256=sha(decision))
        if 'event_seq' not in decision:
            row.update(status='missing_event_seq', event_seq=None, pre_state_hashes_checked=None)
        else:
            seq = _sequence(decision['event_seq'])
            if seq not in by_seq:
                raise ValueError('decision anchor has no outgoing recorded event')
            checked = []
            for name in ('game_state', 'continuation_state'):
                key = 'pre_'+name+'_sha256'
                if key in decision:
                    if decision[key] != by_seq[seq][name]:
                        raise ValueError('decision pre-state hash differs')
                    checked.append(key)
            status = ('sequence_only', 'partial_state_hash_checked', 'state_hash_checked')[len(checked)]
            row.update(status=status, event_seq=seq, pre_state_hashes_checked=checked)
        anchors.append(row)
    return dict(schema='record_integrity_evidence_457.v1', run_id=run['run_id'],
                policy_id=run['policy_id'], path_id=run['path_id'], run_sha256=sha(run),
                event_count=len(events), snapshot_count=len(shots), decision_count=len(anchors),
                recorded_chain_integrity='verified', decision_anchors=anchors,
                explicit_anchor_counts=dict(sorted(Counter(r['status'] for r in anchors).items())),
                source_authenticity='requires_source_bound_loader',
                state_schema_semantics='not_certified', rule_transition_legality='not_certified',
                legal_candidate_completeness='not_certified', selection_strategy='not_certified',
                opportunity_coverage='not_certified', opportunity_scope='existing_executor_only',
                balance_admitted=None)
