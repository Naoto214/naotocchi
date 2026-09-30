#!/usr/bin/env python3
"""Connect existing targeted E-final-time contracts at the reached R10 boundary."""
import argparse
import copy
import hashlib
import json
import proxy_new_seed_mixed_replay_405 as source
import proxy_new_seed_mixed_replay_401 as baseline_source
import proxy_normal_action_candidate_completeness as candidates
import proxy_r2_candidate_extension_127 as targeted

contracts = source.contracts
ROOT = source.ROOT
AUDIT = ROOT / 'data/proxy-new-seed-mixed-audit-406-20260930.json'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-replay-406-20260930.json'
canonical_bytes = contracts.canonical_bytes
SOURCE_SHA = 'b451e46e352cffacd92c16ac749c528d37d0acc846c71a436714f9b3bcff191d'
HISTORY_SHA = {
    401: '78840ee72e3ab907c79cfa74869a52e8d0d633a071850efe38da2bf59e209cdb',
    402: 'c9ab8f8515a1baa4823e088d488b35835809bbd619673e6ed268044f0f21ec2e',
    403: '0c385e99ebc38392b1845e0eda9b34aff640eaf404e14da5b548e6265f76b436',
    404: '567fc388da16f10b7cc036e78dfb78cf7842d9b700e066aa68e9279d0000bdc2',
    405: SOURCE_SHA,
}
BASELINE_FILES_SHA = {
    'proxy-new-seed-mixed-replay-394-20260929.json': '59960ace78b6edb2c3bf5c01d4c2e5c9d5ed0e766fac052066cc54c6d07222aa',
    'proxy-new-seed-mixed-replay-395-20260929.json': 'f5fabf42c091da4c7e1aceef42d9244783cc580f6798857fec6ef1e2d246cfd6',
    'proxy-new-seed-mixed-replay-396-20260929.json': 'cc42ca786df73a506a2bb9d29e126fdd90a230c77990762d586fd2d25ee97268',
    'proxy-new-seed-mixed-replay-397-20260929.json': 'e42a8c66f1c4359297e2db98fef98ebb6c02bf0de41dd8b2af3037cc5c41622c',
    'proxy-new-seed-mixed-replay-398-20260929.json': 'f050b8e2f416d6720a066e25229b8314dae02ca44c459691964ea6ded0743754',
    'proxy-new-seed-mixed-replay-399-20260929.json': 'c1398339b1e67c04006693bfbd4e99b34e59b32e6689950673765814d09bd4e2',
    'proxy-new-seed-mixed-replay-400-20260929.json': 'dd83009fca60289dac8c54a3f7e4316bd886eb326f4baf38375e6ccb790d173a',
    'proxy-new-seed-mixed-audit-394-20260929.json': '4029a3c8549ffc7e1e3abedf926d1f40e92ee9d7ebc5eac00ea27f2695c0be72',
    'proxy-new-seed-mixed-audit-396-20260929.json': 'accddb0a21eb09891b4d08bfe7643839f816b4817fb22318f90d922e07e23c94',
    'proxy-new-seed-mixed-audit-397-20260929.json': '9a1c50fc188344760e021ea3cfc6d15f3b18e6c9253544d52f328a46f2221e7b',
    'proxy-new-seed-mixed-audit-399-20260929.json': '6e0f6873cd96764092699cceeec62fb7ccae53950d5ee7a9e7df1cc4c5b2dc25',
}


def read_checkpoint(number):
    raw = (ROOT / f'data/proxy-new-seed-mixed-replay-{number}-20260930.json').read_bytes()
    data = json.loads(raw)
    if hashlib.sha256(raw).hexdigest() != HISTORY_SHA[number] or raw != canonical_bytes(data):
        raise ValueError('406 saved source raw/canonical differs')
    return data['results']


def load_rows():
    rows = read_checkpoint(405)
    if len(rows) != 4 or len({x['path_id'] for x in rows}) != 4:
        raise ValueError('406 source routes differ')
    return rows


def saved_history(path):
    # Event headers (including actor/source IDs) are not themselves included in
    # snapshot hashes. Pin the raw history too, so rewriting a use header cannot
    # evade the same-name predicate while retaining state hash strings.
    for filename, digest in BASELINE_FILES_SHA.items():
        if hashlib.sha256((ROOT / 'data' / filename).read_bytes()).hexdigest() != digest:
            raise ValueError('406 baseline raw history differs')
    baseline, history, baseline_hash = baseline_source.saved_history(path)
    for number in range(401, 406):
        row = next(x for x in read_checkpoint(number) if x['path_id'] == path)
        if len(row['new_events']) != len(row['new_snapshots']):
            raise ValueError('406 source event/snapshot count differs')
        history += list(zip(row['new_events'], row['new_snapshots']))
    return baseline, history, baseline_hash


def verify_history(row, baseline, history):
    original, saved, _ = saved_history(row['path_id'])
    if baseline != original or history[:len(saved)] != saved:
        raise ValueError('406 saved history provenance differs')
    initial = {'last_valid_event_seq': baseline['source_last_valid_event_seq'],
               'final_game_state_sha256': baseline['source_game_state_sha256'],
               'final_continuation_state_sha256': baseline['source_continuation_state_sha256']}
    result = {**row, 'new_events': [e for e, _ in history],
              'new_snapshots': [s for _, s in history]}
    contracts.validate_chain(initial, result)
    # Any newly replayed response event must bind to the previous priority actor.
    for index in range(len(saved), len(history)):
        event, shot = history[index]
        prior = history[index-1][1]['continuation_state']
        if event['action_type'] == 'activate_response' or len(shot['continuation_state']['activation_zone']) > len(prior['activation_zone']):
            verify_activation_history(prior, history[index-1][1]['event_seq'], event, shot)
        if event['action_type'] == 'response_pass' and event['actor'] != prior['response_context']['priority_actor']:
            raise ValueError('406 response actor provenance differs')


def verify_activation_history(prior, prior_seq, event, shot):
    """Reapply each new activation; hash strings alone do not bind its headers."""
    actor = prior['response_context']['priority_actor']
    source_id = event.get('source_instance_id')
    game = prior['game_state']; card = game['cards'].get(source_id, {})
    if event['action_type'] != 'activate_response' or event.get('actor') != actor or card.get('card_id') != 'E-final-time' or source_id not in game['players'][actor]['hand']:
        raise ValueError('406 activation history actor/source differs')
    before = copy.deepcopy(prior)
    before.update(source_event_seq=prior_seq, last_event_seq=prior_seq,
                  source_game_state_sha256=contracts.start.opening._stop_state_sha256(game),
                  continuation_state_sha256=contracts.start.canonical_sha256(prior))
    action = {'action_type': 'use_event', 'card_id': card['card_id'],
              'card_copy_id': card['card_copy_id'], 'source_instance_id': source_id,
              'target_instance_ids': copy.deepcopy(event.get('target_instance_ids')),
              'base_time_cost': 2, 'source_references': ['91-event-21-card-text-draft.md#E-final-time']}
    after, generated = contracts.response.activate_response_candidate(before, {'actor': actor, 'selected_action': action}, validate_final_time_target)
    generated.pop('_snapshot_after', None)
    if generated != event or contracts.start._payload(after) != shot['continuation_state']:
        raise ValueError('406 activation history does not reproduce its event/snapshot')


def final_time_inventory(row, baseline, history, actor, normal=False, history_validator=None):
    (history_validator or verify_history)(row, baseline, history)
    game = row['final_continuation_state']['game_state']
    owner = game['players'][actor]
    entry = contracts.start.load_candidate_rows()['E-final-time']
    template = next(x for x in entry['actions'] if x['action_type'] == 'use_event')
    reference = '91-event-21-card-text-draft.md#E-final-time'
    text = contracts.hand.source_section(*reference.split('#'))
    if entry['card_type'] != 'event' or template['base_time_cost'] != 2 or template['candidate_variants'] != ['each_legal_discard_non_main'] or template['source_text_reference'] != reference or any(s not in text for s in ('現在のラウンドがR10', 'メイン以外のカード1枚を対象', '1ターンに1回')):
        raise ValueError('406 registered final-time contract differs')
    if game['round'] != 10 or owner['board']['main'] is not None:
        raise ValueError('406 reached R10 egg predicate differs')
    starts = [e['seq'] for e, _ in history if e['action_type'] == 'turn_start_and_egg_draw']
    if not starts:
        raise ValueError('406 complete current-turn history missing')
    turn_start = max(starts)
    uses = [e['seq'] for e, _ in history if e['seq'] >= turn_start and e.get('actor') == actor and e['action_type'] in ('activate_response', 'use_event') and game['cards'].get(e.get('source_instance_id'), {}).get('card_id') == 'E-final-time']
    # Only actor-owned hand/discard and public current-turn history are inspected.
    view = {'actor': actor, 'players': {actor: {'hand': owner['hand'], 'discard': owner['discard'], 'board': owner['board']}},
            'cards': {i: game['cards'][i] for i in owner['discard']}}
    targets = [x for x in candidates._targets('each_legal_discard_non_main', view, 'hand_card_action') if x]
    details, exclusions = [], []
    for instance in sorted(owner['hand']):
        if game['cards'][instance]['card_id'] != 'E-final-time':
            continue
        reasons = (['insufficient_time'] if owner['time'] < 2 else []) + (['required_target_absent'] if not targets else []) + (['same_name_used_this_turn'] if uses else [])
        if reasons:
            exclusions.append({'source_instance_id': instance, 'card_id': 'E-final-time', 'reason_codes': reasons})
            continue
        for target in targets:
            if normal:
                original = {'source_family': 'hand_card_action', 'source_instance_id': instance, 'action_type': 'use_event', 'candidate_variant': 'each_legal_discard_non_main', 'target_instance_ids': target}
                candidate_id = targeted._single_target_id(view, original)
            else:
                candidate_id = contracts.start.response_id('use_event', instance, target_instance_id=target[0], registered_variants=template['candidate_variants'])
            details.append({'candidate_id': candidate_id, 'candidate_family': 'hand_quick_use' if not normal else 'hand_card_action', 'action_type': 'use_event', 'card_id': 'E-final-time', 'card_copy_id': game['cards'][instance]['card_copy_id'], 'source_instance_id': instance, 'target_instance_ids': target, 'candidate_variant': None if not normal else 'each_legal_discard_non_main', 'base_time_cost': 2, 'source_references': [reference]})
    return {'details': details, 'exclusions': exclusions, 'public_targets': targets,
            'current_turn_start_event_seq': turn_start, 'same_name_use_event_seqs': uses,
            'same_name_history_complete': True, 'source_contracts': [91, 114, 121, 127, 138, 119]}


def projection(row, actor):
    projected = copy.deepcopy(row)
    state = projected['final_continuation_state']
    owner = state['game_state']['players'][actor]
    owner['hand'] = [i for i in owner['hand'] if state['game_state']['cards'][i]['card_id'] != 'E-final-time']
    if state['activation_zone']:
        links = state['activation_zone']
        ctx = state['response_context']
        if state['game_state']['phase'] != 'turn_end_response' or ctx['chain_status'] != 'building' or ctx['chain_links'] != [x['link_id'] for x in links] or any(x['card_id'] != 'E-final-time' or x['payment'] != {'time': 2} or len(x['target_instance_ids']) != 1 for x in links):
            raise ValueError('406 reached event chain differs')
        # Project only for the old ordinary-card enumerator; restore the actual
        # chain and context before applying 119 selection and transitions.
        state['activation_zone'] = []
        ctx.update(chain_links=[], chain_status='empty', consecutive_passes=0)
    projected['final_game_state_sha256'] = contracts.start.opening._stop_state_sha256(state['game_state'])
    projected['final_continuation_state_sha256'] = contracts.start.canonical_sha256(state)
    return projected


def response_opportunity(row, base, inventory, projected_row=None):
    state = contracts.current(row)
    ctx = state['response_context']; actor = ctx['priority_actor']
    projected = copy.deepcopy((projected_row or projection(row, actor))['final_continuation_state'])
    owner = projected['game_state']['players'][actor]
    for exclusion in base['hand_exclusions']:
        owner['hand'].remove(exclusion['source_instance_id'])
    owner['board']['companions'] = []
    owner['board'].update(partner=None, partner_stage=None)
    projected['game_state']['phase'] = 'response_window'
    projected['response_context'].update(phase='response_window', window_kind='turn_start')
    chance = contracts.start.enumerate_opportunity(projected, actor, contracts.start.load_candidate_rows())
    if chance['legal_candidate_ids'] != base['hand_candidate_ids'] or chance['excluded_candidates'] != base['hand_other_exclusions']:
        raise ValueError('406 ordinary response inventory differs')
    chance['legal_candidate_details'] += inventory['details']
    for detail in base['board_candidate_details']:
        chance['legal_candidate_details'].append({**detail, 'card_copy_id': state['game_state']['cards'][detail['source_instance_id']]['card_copy_id'], 'target_instance_ids': [], 'candidate_variant': None, 'base_time_cost': 0})
    chance['legal_candidate_details'].sort(key=lambda x: x['candidate_id'])
    chance['legal_candidate_ids'] = [x['candidate_id'] for x in chance['legal_candidate_details']]
    if len(chance['legal_candidate_ids']) != len(set(chance['legal_candidate_ids'])):
        raise ValueError('406 response ID collision')
    chance.update(response_context=copy.deepcopy(ctx),
                  inspected_information=contracts.board_choice.contract._information_snapshot(state['game_state'], actor),
                  board_exclusions=base['board_exclusions'],
                  hand_conditional_exclusions=base['hand_exclusions'] + inventory['exclusions'])
    return chance


def audit_response(row, baseline, history):
    actor = row['final_continuation_state']['response_context']['priority_actor']
    inventory = final_time_inventory(row, baseline, history, actor)
    origin = next((e for e, _ in history if e['seq'] == row['final_continuation_state']['response_context']['origin_event_seq']), None)
    base = source.source.audit_response(projection(row, actor), origin)
    chance = response_opportunity(row, base, inventory)
    return {**base, **contracts.boundary(row), 'candidate_ids': chance['legal_candidate_ids'],
            'legal_candidate_details': chance['legal_candidate_details'],
            'final_time_inventory': inventory, 'candidate_set_complete': True,
            'opportunity': chance}


def choose_response(row, proof, baseline, history):
    if proof != audit_response(row, baseline, history):
        raise ValueError('406 response proof differs from regenerated complete inventory')
    order = next(x for x in contracts.start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
    game = row['final_continuation_state']['game_state']
    decision = contracts.response.resolve_response_choice({'order_id': order, 'actor_turn_index': game['round'], 'round': game['round']}, proof['opportunity'])
    decision.update(pre_game_state_sha256=row['final_game_state_sha256'], pre_continuation_state_sha256=row['final_continuation_state_sha256'], event_seq=row['last_valid_event_seq'])
    return {**contracts.boundary(row), 'candidate_ids': proof['candidate_ids'],
            'selected_candidate': decision['selected_candidate'],
            'resolution_mode': decision['resolution_mode'], 'comparison': decision}


def audit_normal(row, baseline, history):
    actor = row['final_continuation_state']['game_state']['turn_player']
    inventory = final_time_inventory(row, baseline, history, actor, normal=True)
    base = contracts.audit_normal(projection(row, actor))
    details = sorted(base['legal_candidate_details'] + inventory['details'], key=lambda x: x['candidate_id'])
    return {**base, **contracts.boundary(row), 'candidate_ids': [x['candidate_id'] for x in details], 'legal_candidate_details': details, 'final_time_inventory': inventory}


def choose_normal(row, proof, baseline, history):
    if proof != audit_normal(row, baseline, history):
        raise ValueError('406 normal proof differs from regenerated inventory')
    original = contracts.paid.cost_and_effect
    def cost_and_effect(source_row, action):
        if action['card_id'] == 'E-final-time':
            if action not in proof['final_time_inventory']['details']:
                raise ValueError('406 paid final-time detail differs')
            return 2, '91-event-21-card-text-draft.md#E-final-time'
        return original(source_row, action)
    try:
        contracts.paid.cost_and_effect = cost_and_effect
        result = source.choose_normal(row, proof)
    finally:
        contracts.paid.cost_and_effect = original
    return result


def validate_final_time_target(before, action):
    ctx = before['response_context']; game = before['game_state']
    owner = game['players'][ctx['priority_actor']]
    targets = action.get('target_instance_ids', [])
    if action.get('card_id') != 'E-final-time' or action.get('base_time_cost') != 2 or game['round'] != 10 or len(targets) != 1 or targets[0] not in owner['discard'] or contracts.start.load_candidate_rows()[game['cards'][targets[0]]['card_id']]['card_type'] == 'main':
        raise ValueError('406 final-time activation target differs')


def activate_final_time(row, proof, selected, baseline, history):
    if selected != choose_response(row, proof, baseline, history) or selected['selected_candidate'] == 'response-pass':
        raise ValueError('406 final-time activation selection differs')
    before = contracts.current(row)
    if before['game_state']['phase'] != 'turn_end_response':
        raise ValueError('406 event activation return boundary differs')
    after, event = contracts.response.activate_response_candidate(before, selected['comparison'], validate_final_time_target)
    event.pop('_snapshot_after', None)
    verify_transition(row, after, event)
    return contracts.result_from_state(row, after, event, [selected['comparison']])


def pass_response(row, proof, selected):
    before = contracts.current(row)
    if before['game_state']['phase'] != 'turn_end_response':
        return source.source.replay_response(row, proof, selected)
    after, event = contracts.response.apply_response_pass(before, selected['comparison'])
    if not after['activation_zone'] and after['response_context']['consecutive_passes'] == 2:
        after['game_state']['phase'] = 'turn_end'
        after['return_target'] = 'turn_end'
        after['continuation_state_sha256'] = contracts.start._hash(after)
        event['game_state_after_sha256'] = contracts.start.opening._stop_state_sha256(after['game_state'])
        event['continuation_state_after_sha256'] = after['continuation_state_sha256']
        event['result']['return_target'] = 'turn_end'
    event.pop('_snapshot_after', None)
    verify_transition(row, after, event)
    return contracts.result_from_state(row, after, event, [selected['comparison']])


def hand_bottom_decision(row, actor, hand, game):
    fallback = source.fallback
    order = next(x for x in contracts.start.load_source()['results'] if x['path_id'] == row['path_id'])['order_id']
    context = {'contract_version': fallback.CONTRACT_VERSION, 'order_id': order,
               'actor': actor, 'actor_turn_index': game['round'], 'round': game['round'],
               'phase': row['final_continuation_state']['game_state']['phase'], 'decision_kind': 'mandatory_choice',
               'choice_kind': 'final_time_hand_bottom'}
    details = sorted([{'candidate_id': game['cards'][i]['card_copy_id'], 'kind': 'card_copy', 'card_id': game['cards'][i]['card_id'], 'initial_instance_id': i} for i in hand], key=lambda x: x['candidate_id'])
    ids = [d['candidate_id'] for d in details]
    seed = fallback.build_seed_proof(context, ids)
    selected = seed['selected_candidate']
    decision = {'decision_kind': 'mandatory_choice', 'resolution_mode': 'seeded_fallback',
                'strategic_unresolved': True, 'reason_code': 'strategic_unresolved_seeded_fallback',
                'legal_candidates': ids, 'legal_candidate_details': details,
                'candidate_set_complete': True,
                'candidate_set_evidence': {'source_ref': '91-event-21-card-text-draft.md#E-final-time',
                                           'state_ref': f"R{game['round']}:resolve_event:{actor}:{row['last_valid_event_seq']}",
                                           'enumeration_rule': 'all card copies in actor hand after target move and draw'},
                'seeded_fallback_candidates': ids, 'seed_context': context, 'seed_proof': seed,
                'selected_candidate': selected, 'selected_action': next(d for d in details if d['candidate_id'] == selected),
                'runner_up_candidates': [i for i in ids if i != selected]}
    errors = fallback.validate_seeded_resolution(decision)
    if errors:
        raise ValueError('406 mandatory bottom seed differs: ' + '; '.join(errors))
    return decision


def verify_transition(row, after, event):
    result = contracts.result_from_state(row, after, event)
    contracts.validate_chain(row, result)
    shot = result['new_snapshots'][0]
    shot = copy.deepcopy(shot)
    for link in list(shot['continuation_state']['activation_zone']):
        if link.get('source_zone') == 'board':
            game=shot['game_state'];owner=game['players'][link['actor']]
            if link['card_id']!='C-chicken' or link['action_type']!='activate_board_ability' or link['source_instance_id'] not in owner['board']['companions'] or game['cards'][link['source_instance_id']]['card_id']!=link['card_id']:
                raise ValueError('406 active board source identity differs')
            # Board-source abilities retain the card on board (190); only
            # hand-card activations count as an additional physical zone.
            shot['continuation_state']['activation_zone'].remove(link)
    errors = contracts.response._snapshot_instance_errors(shot)
    if errors:
        raise ValueError('406 instance zones differ: ' + '; '.join(errors))


def resolve_final_time(row, return_phase='turn_end'):
    before = contracts.current(row); ctx = before['response_context']; links = before['activation_zone']
    allowed_phase='response_window' if return_phase=='normal_action' else 'turn_end_response'
    if return_phase not in ('normal_action','turn_end') or before['game_state']['phase'] != allowed_phase or ctx['chain_status'] != 'resolving' or not links or ctx['chain_links'] != [x['link_id'] for x in links] or before['pending_triggers']:
        raise ValueError('406 final-time reverse resolution boundary differs')
    link = links[-1]
    if link['action_type'] != 'use_event' or link['card_id'] != 'E-final-time' or link['payment'] != {'time': 2} or len(link['target_instance_ids']) != 1:
        raise ValueError('406 final-time resolution link differs')
    after = copy.deepcopy(before); actor = link['actor']; game = after['game_state']; owner = game['players'][actor]
    target = link['target_instance_ids'][0]
    valid = target in owner['discard'] and contracts.start.load_candidate_rows()[game['cards'][target]['card_id']]['card_type'] != 'main'
    drawn, bottom, decision = [], None, None
    if valid:
        owner['discard'].remove(target); owner['deck'].append(target)
        for _ in range(min(2, len(owner['deck']))):
            instance = owner['deck'].pop(0); owner['hand'].append(instance); drawn.append(instance)
        if owner['hand']:
            decision = hand_bottom_decision(row, actor, owner['hand'], game)
            bottom = decision['selected_action']['initial_instance_id']
            owner['hand'].remove(bottom); owner['deck'].append(bottom)
    owner['discard'].append(link['source_instance_id'])
    after['activation_zone'].pop(); after['response_context']['chain_links'].pop()
    if not after['activation_zone']:
        # The two passes already closed this end-response window. Resolving
        # its last link returns to the requested end without opening a new one.
        after['response_context'].update(chain_status='empty')
        after['game_state']['phase'] = return_phase
        after['return_target'] = 'normal_action_opportunity' if return_phase=='normal_action' else 'turn_end'
        if return_phase=='normal_action':after['response_context']['consecutive_passes']=0
    after['last_event_seq'] += 1; after['continuation_state_sha256'] = contracts.start._hash(after)
    event = {'seq': after['last_event_seq'], 'action_type': 'resolve_event', 'actor': actor,
             'source_instance_id': link['source_instance_id'], 'chain_link_id': link['link_id'],
             'payment': copy.deepcopy(link['payment']),
             'result': {'target_instance_id': target, 'target_valid_at_resolution': valid,
                        'returned_discard_to_deck_bottom': target if valid else None,
                        'drawn_instance_ids': drawn, 'hand_bottom_instance_id': bottom,
                        'source_destination': 'discard', 'growth_added': 0},
             'game_state_before_sha256': contracts.start.opening._stop_state_sha256(before['game_state']),
             'game_state_after_sha256': contracts.start.opening._stop_state_sha256(game),
             'continuation_state_before_sha256': before['continuation_state_sha256'],
             'continuation_state_after_sha256': after['continuation_state_sha256']}
    verify_transition(row, after, event)
    return contracts.result_from_state(row, after, event, [decision] if decision else [])


def run_route(initial):
    row = copy.deepcopy(initial)
    row.pop('rules_stop', None)
    events, shots, decisions, steps = [], [], [], []
    baseline, history, baseline_hash = saved_history(row['path_id'])
    for _ in range(24):
        state = row['final_continuation_state']; game = state['game_state']; phase = game['phase']
        if phase == 'egg_exchange_choice':
            break
        current_history = history + list(zip(events, shots))
        if phase == 'normal_action':
            proof = audit_normal(row, baseline, current_history)
            selected = choose_normal(row, proof, baseline, current_history)
            if selected['selected_candidate'] != 'pass':
                raise ValueError('406 reached normal selection requires further adapter')
            result = contracts.normal_pass.run_route(row, selected, proof)
        elif phase == 'turn_end':
            proof = contracts.extend_end_proof(row, baseline, current_history, source.terminal.audit_current_turn_end)
            selected = None; result = source.terminal.replay_end(row, proof)
        elif state['response_context']['chain_status'] == 'resolving':
            proof = {**contracts.boundary(row), 'next_opportunity': 'resolve_event',
                     'resolution_order': list(reversed(state['response_context']['chain_links'])),
                     'source_reference': '91-event-21-card-text-draft.md#E-final-time'}
            selected = None; result = resolve_final_time(row)
        else:
            proof = audit_response(row, baseline, current_history)
            selected = choose_response(row, proof, baseline, current_history)
            result = pass_response(row, proof, selected) if selected['selected_candidate'] == 'response-pass' else activate_final_time(row, proof, selected, baseline, current_history)
            result['new_decisions'] = [selected['comparison']]
        contracts.validate_chain(row, result)
        steps.append({'audit': proof, 'selection': selected, 'event_seqs': [e['seq'] for e in result['new_events']]})
        events += result['new_events']; shots += result['new_snapshots']; decisions += result['new_decisions']; row = result
    else:
        raise ValueError('406 scoped batch exceeded expected steps')
    game = row['final_continuation_state']['game_state']
    if (game['round'], game['turn_player'], game['phase']) != (10, 'A', 'egg_exchange_choice'):
        raise ValueError('406 final boundary differs')
    next_audit = {**contracts.boundary(row), **source.eggs.audit_egg(row)}
    result = {**row, **contracts.boundary(initial), 'stop_reason_code': 'checkpoint_boundary_next_egg_exchange', 'new_events': events, 'new_snapshots': shots, 'new_decisions': decisions}
    contracts.validate_chain(initial, result)
    return ({'path_id': row['path_id'], 'baseline_raw_sha256': baseline_hash, 'steps': steps, 'next_opportunity_audit': next_audit}, result)


def build_reports():
    pairs = [run_route(row) for row in load_rows()]
    audits, results = [p[0] for p in pairs], [p[1] for p in pairs]
    count = sum(len(x['new_events']) for x in results)
    common = {'source_raw_sha256': SOURCE_SHA, 'planned': 4, 'completed': 0, 'rules_stopped': 0, 'independent_balance_sample_count': 0}
    return ({**common, 'schema': 'naotocchi.card_game.proxy_new_seed_mixed_audit_406.v1', 'results': audits},
            {**common, 'schema': 'naotocchi.card_game.proxy_new_seed_mixed_replay_406.v1', 'new_events': count, 'new_snapshots': count, 'new_decisions': sum(len(x['new_decisions']) for x in results), 'results': results})


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--check', action='store_true'); args = parser.parse_args()
    audit, replay = build_reports()
    for path, value in ((AUDIT, audit), (OUTPUT, replay)):
        raw = canonical_bytes(value)
        if args.check:
            if path.read_bytes() != raw:
                raise SystemExit('406 canonical mismatch ' + str(path))
        else:
            path.write_bytes(raw)
    print(f"406: four routes, {replay['new_events']} event/snapshot pairs verified")


if __name__ == '__main__':
    main()
