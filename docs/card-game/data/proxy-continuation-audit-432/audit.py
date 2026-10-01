"""Read-only 431 replay and next-scope diagnosis; never executes 112 fixtures.

Run from repository root. Writes only this checkpoint's evidence.json.
This is investigation code, not a new engine/trajectory implementation.
"""
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'docs/card-game/tools'))
import proxy_resource_value_integration as saved
import proxy_resource_value_trajectory as trajectory


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    data = saved.load_saved()
    initials = trajectory.load_initial_routes(trajectory.DATA)
    baseline = {r['run_id']: r for r in data['paired']['results']}
    sources = {str(p.relative_to(ROOT)): digest(p)
               for p in (ROOT / 'docs/card-game').rglob('*') if p.is_file()
               and 'proxy-continuation-audit-432' not in p.parts}
    rows = []
    for initial in initials:
        for policy in trajectory.POLICIES:
            fresh = trajectory.run_route(initial, policy)
            fresh['legacy_prefix_validation'] = (trajectory.compare_legacy_prefix(fresh, initial)
                if policy == trajectory.POLICIES[0] else None)
            old = baseline[fresh['run_id']]
            if fresh != old:
                raise ValueError('431 independent replay differs: ' + fresh['run_id'])
            state = trajectory._current(fresh['final_continuation_state'], fresh['last_valid_event_seq'])
            game = state['game_state']
            actor = game['turn_player']
            owner = game['players'][actor]
            lineage = []
            table = initial['inputs']['candidate_table']
            if owner['board']['main']:
                history = {'normal_challenge_losses_by_actor': [],
                           'last_valid_event_seq': state['last_event_seq'], 'source_refs': []}
                view = trajectory.candidates.project_normal_action_information(
                    {'game_state': game, 'actor': actor}, history)
                for source in owner['hand']:
                    card = game['cards'][source]['card_id']
                    if not card.startswith('M-'):
                        continue
                    template = next(x for x in table['cards'] if x['card_id'] == card)
                    action = next(x for x in template['actions'] if x['action_type'] == 'play_main')
                    for variant in ('time_skip', 'transform'):
                        unit = trajectory.candidates._unit('hand_card_action', 'hand', source,
                            'play_main', variant, [], card, action)
                        try:
                            trajectory.candidates.adjudicate_units(view, [unit], {})
                            observed = 'resolved'
                        except ValueError as error:
                            observed = str(error)
                        lineage.append({'card_id': card, 'source_instance_id': source,
                                        'variant': variant, 'observed': observed})
            row = {k: fresh[k] for k in ('run_id', 'path_id', 'policy_id', 'last_valid_event_seq',
                   'stop_reason_code', 'stop_evidence', 'final_game_state_sha256',
                   'final_continuation_state_sha256', 'completed', 'independent_balance_sample_count')}
            row.update(saved_431_exact_replay=True, winner=fresh['result']['winner'],
                actor=actor, main_card_id=game['cards'][owner['board']['main']]['card_id']
                if owner['board']['main'] else None, board=owner['board'],
                isolated_lineage_predicate_probe=lineage)
            rows.append(row)
            print(f"Verified {fresh['run_id']} seq={fresh['last_valid_event_seq']}", flush=True)
    changed = [name for name, sha in sources.items() if digest(ROOT / name) != sha]
    if changed:
        raise ValueError('read-only sources changed: ' + str(changed))
    evidence = dict(schema='naotocchi.card_game.continuation_scope_audit.v1',
        source_commit='741c2518b39a6f859e2ba7dacb365bd140897524',
        source_tree='be395b755579c7a93543ff4cea10ed03fa9c1710',
        purpose='read-only reproduction and design scope; no new continued run',
        planned=8, independently_replayed=8, exact_saved_matches=8,
        completed=sum(r['completed'] for r in rows), stopped=sum(not r['completed'] for r in rows),
        new_continued_runs=0, fixtures_112_executed=0, independent_balance_sample_count=0,
        source_file_count=len(sources), changed_source_files=changed,
        caveat='isolated predicate probes do not certify a complete legal inventory',
        source_raw_sha256=data['source_raw_sha256'], results=rows)
    Path(__file__).with_name('evidence.json').write_bytes(saved.canonical(evidence))
    print('8/8 exact saved replays; no continued runs; all source files unchanged', flush=True)


if __name__ == '__main__':
    main()
