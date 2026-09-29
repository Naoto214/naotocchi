#!/usr/bin/env python3
"""Choose and replay four proved opportunities from the immutable 376 state."""
import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path

sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))
import proxy_new_seed_mixed_audit_377 as audit
import proxy_new_seed_mixed_replay_376 as source
import proxy_new_seed_egg_replay_205 as egg
import proxy_new_seed_normal_restart_157 as free
import proxy_new_seed_normal_choice_229 as paid
import proxy_new_seed_mixed_choice_325 as countryside
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_normal_action_extension as extension
import proxy_normal_action_seeded_restart as normal
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_start_response_138 as start

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-378-20260929.json'
SOURCE_RAW_SHA256 = '2825840a4c117b7084c5e777b3f407d507df96e085fca5e8cb9120db7f631173'
STATE_RAW_SHA256 = '28d83e00893ff02e4785b4a07a1527e18480911e9a6c2faa41ea0538586dbfd2'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_replay_378.v1'

def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()

def load_sources():
    raw, saved = audit.OUTPUT.read_bytes(), source.OUTPUT.read_bytes()
    if (hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or
            hashlib.sha256(saved).hexdigest() != STATE_RAW_SHA256 or
            raw != audit.canonical_bytes(audit.build_report())):
        raise ValueError('378 protected audit/state differs')
    rows, proofs = json.loads(saved)['results'], json.loads(raw)['results']
    if len(rows) != len(proofs) != 4 or any(audit.audit_route(r) != p for r, p in zip(rows, proofs)):
        raise ValueError('378 candidate inventory differs')
    return rows, proofs

def choose_free(row, proof):
    game = row['final_continuation_state']['game_state']
    actor = game['turn_player']
    owner = game['players'][actor]
    details = proof['legal_candidate_details']
    if (row['path_id'] != 'probe-01-b-first' or actor != 'A' or
            [d['action_type'] for d in details] != ['place_companion','place_world','set_item','pass'] or
            [d['card_id'] for d in details[:3]] != ['C-box','W-countryside','I-poop1'] or
            owner['person_placed'] or not proof['candidate_set_complete'] or
            not all(proof['completeness_checks'].values())):
        raise ValueError('378 free placement boundary differs')
    reduced = copy.deepcopy(proof)
    reduced['candidate_ids'] = [details[0]['candidate_id'], 'pass']
    reduced['legal_candidate_details'] = [details[0], details[-1]]
    decision = free.decide(row, reduced)
    if (decision['selected_candidate'] != 'candidate-place-companion-A-012#1' or
            decision['resolution_mode'] != 'safe_free_development' or
            fallback.validate_safe_free_placement(decision['selected_placement'])):
        raise ValueError('378 safe free choice differs')
    order = next(x for x in start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
    context = {'contract_version':fallback.CONTRACT_VERSION, 'order_id':order,
               'actor':actor, 'actor_turn_index':game['round'], 'round':game['round'],
               'phase':'normal_action', 'decision_kind':'normal_action',
               'choice_kind':'zero_cost_person_placement'}
    full = fallback.resolve_safe_free_development([decision['selected_placement']], context, proof['candidate_ids'])
    common = {'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,
              'certain_growth_difference':0,'consumed_card_count':0,'value_comparison_to':{}}
    left = {**common,'candidate_id':details[0]['candidate_id'], 'payment_time':0,
            'time_after_certain_resolution':owner['time'],
            'card_copy_id':game['cards'][details[0]['source_instance_id']]['card_copy_id']}
    comparisons = []
    for action in details[1:3]:
        cost, ref = (countryside.paid_cost_and_effect(row, action) if action['card_id'] == 'W-countryside'
                     else paid.cost_and_effect(row, action))
        score = {**common,'candidate_id':action['candidate_id'], 'payment_time':cost,
                 'time_after_certain_resolution':owner['time']-cost,
                 'card_copy_id':game['cards'][action['source_instance_id']]['card_copy_id']}
        compared = priority.compare_candidates(left, score)
        if compared['winner'] != 'left' or compared['decided_at'] != 'time_after_certain_resolution':
            raise ValueError('378 paid action priority differs')
        comparisons.append({'candidate_id':action['candidate_id'],'source_reference':ref,
                            'score':score,'comparison':compared})
    full.update(selected_action=copy.deepcopy(details[0]), legal_candidate_details=copy.deepcopy(details),
                paid_comparisons=comparisons, source_contracts=[107,114,116],
                pre_game_state_sha256=row['final_game_state_sha256'],
                pre_continuation_state_sha256=row['final_continuation_state_sha256'],
                event_seq=row['last_valid_event_seq'])
    return full

def run_route(row, proof):
    path = row['path_id']
    if ((path,row['last_valid_event_seq'],row['final_game_state_sha256'],row['final_continuation_state_sha256']) !=
            (proof['path_id'],proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],
             proof['source_continuation_state_sha256']) or not proof['candidate_set_complete']):
        raise ValueError('378 audited boundary differs')
    if path in ('probe-02-a-first','probe-02-b-first'):
        if proof['next_opportunity'] != 'mandatory_egg_exchange' or proof['resolution_mode'] != 'seeded_fallback':
            raise ValueError('378 egg candidates differ')
        result = egg.run_route(row)
        decision = result['new_decisions'][0]
        if (decision['legal_candidates'] != proof['candidate_ids'] or
                decision['legal_candidate_details'] != proof['legal_candidate_details'] or
                decision['selected_candidate'] not in proof['candidate_ids']):
            raise ValueError('378 seeded egg choice differs')
        return result
    before = copy.deepcopy(row['final_continuation_state'])
    before.update(source_event_seq=row['last_valid_event_seq'], last_event_seq=row['last_valid_event_seq'],
                  source_game_state_sha256=row['final_game_state_sha256'],
                  continuation_state_sha256=row['final_continuation_state_sha256'])
    if start._hash(before) != row['final_continuation_state_sha256']:
        raise ValueError('378 source state hash differs')
    if path == 'probe-01-a-first':
        if proof['candidate_ids'] != ['response-pass'] or proof['next_opportunity'] != 'response_window':
            raise ValueError('378 unique start response differs')
        actor = before['response_context']['priority_actor']
        after, event, _ = start._pass(before, actor)
        normal._verify_step(before, after, [event])
        decision = {'decision_kind':'response','selected_candidate':'response-pass',
                    'resolution_mode':'response_unique','actor':actor}
        reason = 'unproved_next_priority_response_candidates'
    elif path == 'probe-01-b-first':
        decision = choose_free(row, proof)
        registered = extension.PLACEMENT_TEXT.get('C-box')
        current = ('72-companion-26-card-text-draft.md#C-box','no_ability')
        if registered is not None and registered != current:
            raise ValueError('378 C-box classification conflicts')
        try:
            extension.PLACEMENT_TEXT['C-box'] = current
            after, generated = extension._apply_placement(before, decision)
        finally:
            if registered is None: extension.PLACEMENT_TEXT.pop('C-box',None)
            else: extension.PLACEMENT_TEXT['C-box'] = registered
        normal._verify_step(before, after, generated)
        if (len(generated) != 1 or generated[0]['action_type'] != 'place_companion' or
                after['game_state']['phase'] != 'post_placement_response' or
                'A-012#1' not in after['game_state']['players']['A']['board']['companions']):
            raise ValueError('378 C-box transition differs')
        event = {k:copy.deepcopy(v) for k,v in generated[0].items() if k != '_snapshot_after'}
        reason = 'unproved_post_placement_response_candidates'
    else:
        raise ValueError('378 path differs')
    decision.update(pre_game_state_sha256=row['final_game_state_sha256'],
                    pre_continuation_state_sha256=row['final_continuation_state_sha256'],
                    event_seq=row['last_valid_event_seq'])
    return {'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'last_valid_event_seq':after['last_event_seq'],
            'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),
            'final_continuation_state_sha256':after['continuation_state_sha256'],
            'final_continuation_state':start._payload(after),'stop_reason_code':reason,
            'new_decisions':[decision],'new_events':[event], 'new_snapshots':[snapshots.snapshot(after)],
            'completed':False,'balance_sample_count':0}

def validate_result(result, source_row, proof):
    if result != run_route(source_row, proof) or result['last_valid_event_seq'] != source_row['last_valid_event_seq'] + 1:
        raise ValueError('378 independent replay differs')
    game, continuation = source_row['final_game_state_sha256'], source_row['final_continuation_state_sha256']
    for event, shot in zip(result['new_events'], result['new_snapshots']):
        if (event['seq'] != shot['event_seq'] or event['game_state_before_sha256'] != game or
                event['continuation_state_before_sha256'] != continuation or
                event['game_state_after_sha256'] != shot['game_state_sha256'] or
                event['continuation_state_after_sha256'] != shot['continuation_state_sha256'] or
                start.opening._stop_state_sha256(shot['game_state']) != shot['game_state_sha256'] or
                start.canonical_sha256(shot['continuation_state']) != shot['continuation_state_sha256']):
            raise ValueError('378 event/snapshot/hash differs')
        game, continuation = shot['game_state_sha256'], shot['continuation_state_sha256']
    if (game, continuation) != (result['final_game_state_sha256'],result['final_continuation_state_sha256']):
        raise ValueError('378 final hash differs')

def build_report():
    rows, proofs = load_sources()
    results = [run_route(row, proof) for row, proof in zip(rows,proofs)]
    if len(results) != 4: raise ValueError('378 route inventory differs')
    for result,row,proof in zip(results,rows,proofs): validate_result(result,row,proof)
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'state_raw_sha256':STATE_RAW_SHA256,'planned':4,'completed':0,
            'new_decisions':4,'new_events':4,'new_snapshots':4,
            'independent_balance_sample_count':0,'results':results}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes() != raw: raise SystemExit('378 canonical bytes differ')
    else: OUTPUT.write_bytes(raw)
    print('378: unique response, safe free placement and two seeded eggs replayed')

if __name__ == '__main__': main()
