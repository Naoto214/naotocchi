#!/usr/bin/env python3
"""Read-only 414 shadow audit of every normal decision in saved439.

No transition/action/route execution; actual matches and balance counts stay0.
Run: python reproduce.py --output <directory>
"""
import argparse
import copy
import gzip
import hashlib
import json
from pathlib import Path
import sys

CARD_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(CARD_ROOT / 'tools'))
import proxy_continuation_batch_runner as engine
import proxy_resource_value_evaluation as metrics

SOURCE = CARD_ROOT / 'data/proxy-continuation-batch-439'
BASE_COMMIT = '49f4e528747b0e7606dadd9aeb0dd40a1061289b'
POLICIES = engine.base.old.POLICIES
UNSUPPORTED = {'legacy paid exclusion proof unavailable', 'legacy fallback contract not applicable'}


def canonical(value):
    return engine.saved.canonical(value)


def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def load_source():
    manifest = json.loads((SOURCE / 'manifest.json').read_bytes())
    blob = (SOURCE / 'paired.json.gz').read_bytes()
    raw = gzip.decompress(blob)
    if hashlib.sha256(blob).hexdigest() != manifest['compressed_sha256'] or hashlib.sha256(raw).hexdigest() != manifest['raw_sha256']:
        raise ValueError('439 artifact hash mismatch')
    errors = [p for p, h in manifest['execution_sources_sha256'].items() if hashlib.sha256((CARD_ROOT / p).read_bytes()).hexdigest() != h]
    if errors:
        raise ValueError('439 execution sources changed: ' + str(errors))
    report = json.loads(raw)
    if report['planned'] != 8 or report['completed'] != 8 or report['stopped'] != 0 or report['independent_replay_verified'] != 8:
        raise ValueError('439 completion coverage differs')
    return report, manifest


def planned_rows(report):
    result = []
    for run in report['results']:
        for decision in run['decisions']:
            if 'inventory' not in decision:
                continue
            if decision['context']['decision_kind'] != 'normal_action':
                raise ValueError('non-normal decision in manifest')
            result.append((f"439:{run['run_id']}:normal:{decision['event_seq']}", run, decision))
    ids = [r[0] for r in result]
    if len(ids) != 313 or len(set(ids)) != len(ids):
        raise ValueError('planned normal coverage differs')
    return result


def outcomes(envelope, inventory, context, inputs):
    result = {}
    for policy in POLICIES:
        try:
            selected = engine.batch.candidates.select(envelope, inventory, context, policy, inputs)
            result[policy] = dict(status='selected', selected_candidate=selected['selected_candidate'],
                                  selected_action=selected['selected_action'], choice=selected['choice'],
                                  problem_sha256=digest(selected['problem']))
        except ValueError as error:
            if policy != POLICIES[0] or str(error) not in UNSUPPORTED:
                raise
            result[policy] = dict(status='unsupported', reason=str(error))
    return result


def ordered_variant(envelope, actor, variant):
    changed = copy.deepcopy(envelope)
    players = changed['legacy_continuation']['game_state']['players']
    other = 'B' if actor == 'A' else 'A'
    if variant == 'opponent_hand_order':
        players[other]['hand'].reverse()
    elif variant == 'deck_middle_order':
        # Leave the possibly known top/bottom untouched; reorder only interior.
        for player in players.values():
            player['deck'][1:-1] = list(reversed(player['deck'][1:-1]))
    else:
        raise ValueError('unknown order variant')
    return changed


def summarize(rows):
    compared = [r for r in rows if all(v['status'] == 'selected' for v in r['policies'].values())]
    summary = dict(planned=len(rows), observed_selection_reproduced=len(rows), compared=len(compared),
                   unsupported=len(rows)-len(compared), selected_difference=sum(r['choice_changed'] for r in compared),
                   new_game_decisions=0, new_game_events=0, new_matches=0,
                   independent_balance_sample_count=0, policy_promoted=False,
                   foundation_repairs_counted_as_adoption_evidence=False,
                   unique_public_inputs=len({r['public_input_sha256'] for r in rows}))
    summary['by_observed_policy'] = {}
    for origin in POLICIES:
        subset = [r for r in rows if r['observed_policy'] == origin]
        matched = [r for r in subset if r in compared]
        summary['by_observed_policy'][origin] = dict(planned=len(subset), compared=len(matched),
            unsupported=len(subset)-len(matched), selected_difference=sum(r['choice_changed'] for r in matched))
    summary['policies_on_compared_inputs'] = {}
    for policy in POLICIES:
        records = [dict(selection=r['policies'][policy]['choice']) for r in compared]
        summary['policies_on_compared_inputs'][policy] = metrics._decision_counts(records)
    summary['unsupported_reasons'] = {}
    for row in rows:
        for policy, outcome in row['policies'].items():
            if outcome['status'] == 'unsupported':
                reason = outcome['reason']
                summary['unsupported_reasons'][reason] = summary['unsupported_reasons'].get(reason, 0) + 1
    return summary


def run(output):
    source, source_manifest = load_source()
    source_digest = digest(source)
    planned = planned_rows(source)
    initials = {r['path_id']: r for r in engine.base.old.load_initial_routes()}
    inputs_by_path = {p: copy.deepcopy(i['inputs']) for p, i in initials.items()}
    rows = []
    for run in source['results']:
        initial = initials[run['path_id']]
        inputs = inputs_by_path[run['path_id']]
        inputs_digest = digest(inputs)
        raw_events = copy.deepcopy(initial['source_route']['events']) + [
            {k: copy.deepcopy(v) for k, v in e.items() if k not in engine.end.BIND_KEYS} for e in run['events']]
        snapshots = {e['event_seq']: e for e in run['snapshots']}
        with engine.payments.scope(initial), engine.conditions.scope(), engine.caps.scope(), engine.worlds.scope(), \
                engine.batch.scope(), engine.quick.scope(initial), engine.triggers.scope(initial), \
                engine.preparation.scope(), engine.challenge.scope(initial):
            for shadow_id, _, decision in [r for r in planned if r[1]['run_id'] == run['run_id']]:
                seq = decision['event_seq']
                envelope = copy.deepcopy(snapshots[seq])
                engine.base.state.validate(envelope)
                before_hash = digest(envelope)
                history = [e for e in raw_events if e['seq'] <= seq]
                history_hash = digest(history)
                context = copy.deepcopy(decision['context'])
                inventory = engine.batch.candidates.audit(envelope, history)
                if inventory != decision['inventory']:
                    raise ValueError('observed inventory reproduction differs: ' + shadow_id)
                selected = engine.batch.candidates.select(envelope, inventory, context, run['policy_id'], inputs)
                if selected != {k: v for k, v in decision.items() if k != 'event_seq'}:
                    raise ValueError('observed selection reproduction differs: ' + shadow_id)
                result = outcomes(envelope, inventory, context, inputs)
                if any(v['status'] == 'selected' and v['problem_sha256'] != digest(decision['problem']) for v in result.values()):
                    raise ValueError('two policies received different problems')
                perturbations = {}
                for variant in ('opponent_hand_order', 'deck_middle_order'):
                    mutant = ordered_variant(envelope, context['actor'], variant)
                    if mutant == envelope:
                        perturbations[variant] = dict(status='not_applicable')
                        continue
                    engine.base.state.validate(mutant)
                    fresh = engine.batch.candidates.audit(mutant, history)
                    # Enumeration unit order may change; public legal details may not.
                    for key in ('legal_candidate_ids', 'legal_candidate_details', 'public_history', 'view_sha256'):
                        if fresh[key] != inventory[key]:
                            raise ValueError('order variant changed public inventory ' + variant + ' ' + shadow_id)
                    alternate = outcomes(mutant, fresh, context, inputs)
                    if alternate != result:
                        raise ValueError('order variant changed choice/proof ' + variant + ' ' + shadow_id)
                    perturbations[variant] = dict(status='passed', altered_envelope_sha256=digest(mutant))
                if digest(envelope) != before_hash or digest(history) != history_hash:
                    raise ValueError('read-only analysis mutated input')
                supported = all(v['status'] == 'selected' for v in result.values())
                row = dict(shadow_id=shadow_id, source_run_id=run['run_id'], path_id=run['path_id'],
                           observed_policy=run['policy_id'], source_event_seq=seq,
                           source_envelope_sha256=before_hash, context=context,
                           public_input_sha256=digest(dict(view=inventory['view_sha256'],
                               candidates=inventory['legal_candidate_details'], context=decision['problem']['seed_context'])),
                           inventory_sha256=digest(inventory), problem=copy.deepcopy(decision['problem']),
                           policies=result, observed_selection_reproduced=True,
                           choice_changed=result[POLICIES[0]]['selected_candidate'] != result[POLICIES[1]]['selected_candidate'] if supported else None,
                           order_invariance=perturbations)
                rows.append(row)
            if digest(inputs) != inputs_digest:
                raise ValueError('read-only analysis mutated policy inputs')
        print(run['run_id'], 'normal shadows', sum(r['source_run_id'] == run['run_id'] for r in rows), flush=True)
    if sorted(r['shadow_id'] for r in rows) != sorted(r[0] for r in planned) or digest(source) != source_digest:
        raise ValueError('coverage/read-only integrity differs')
    load_source()  # Verify350 execution-source hashes again at the exit boundary.
    result = dict(schema='naotocchi.card_game.completed_shadow_evaluation.v1', source_commit=BASE_COMMIT,
                  source_439_raw_sha256=source_manifest['raw_sha256'], planned_ids=sorted(r[0] for r in planned),
                  results=rows, summary=summarize(rows))
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    raw = canonical(result)
    blob = gzip.compress(raw, mtime=0)
    (output / 'shadow.json.gz').write_bytes(blob)
    (output / 'summary.json').write_bytes(canonical(result['summary']))
    manifest = dict(source_commit=BASE_COMMIT, source_439_raw_sha256=source_manifest['raw_sha256'],
                    planned_ids=result['planned_ids'], raw_sha256=hashlib.sha256(raw).hexdigest(),
                    compressed_sha256=hashlib.sha256(blob).hexdigest(),
                    analysis_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                    execution_sources_sha256=source_manifest['execution_sources_sha256'])
    (output / 'manifest.json').write_bytes(canonical(manifest))
    print(json.dumps(result['summary'], ensure_ascii=False, indent=2), flush=True)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    run(parser.parse_args().output)
