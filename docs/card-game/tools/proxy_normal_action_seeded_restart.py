#!/usr/bin/env python3
"""Checkpoint 122: resume independently from protected checkpoint-120 stops."""
from __future__ import annotations

import copy
import argparse
import hashlib
import json
from pathlib import Path

import proxy_normal_action_candidate_completeness as candidate_121
import proxy_response_window_seeded_restart as response_120
import proxy_normal_decision_hardening as hardening_114


DATA = Path(__file__).resolve().parents[1] / 'data'
PLAN_FILE = 'proxy-normal-action-seeded-restart-plan-122-20260923.json'
EVALUATION_FILE = 'proxy-normal-action-seeded-restart-evaluation-122-20260923.json'
STOP_DIR = 'proxy-normal-action-stops-122'


class RulesStop(Exception):
    def __init__(self, code: str, evidence: dict):
        super().__init__(code)
        self.code = code
        self.evidence = evidence


# Card-text metadata: this is not a card-copy or path-specific action handler.
# Only the continuous discount of M-antlion-01 can be proved to require no
# immediate birth resolution here; the optional M-beetle-01 trigger cannot.
BIRTH_TEXT_EVIDENCE = {
    'M-antlion-01': ('continuous_only', '55-insect-three-lines-card-text-draft.md#M-antlion-01'),
    'M-beetle-01': ('birth_trigger_unhandled', '31-beetle-stagbeetle-card-master-migration.md#M-beetle-01'),
}


def load_sources(data_dir: Path = DATA) -> dict:
    inputs = candidate_121.load_inputs(data_dir)
    return inputs


def resume_from_120(stop: dict) -> dict:
    path = stop['path_id']
    if path not in candidate_121.EXPECTED:
        raise ValueError('unknown protected source')
    expected = candidate_121.EXPECTED[path]
    if (stop.get('game_state_sha256'), stop.get('continuation_state_sha256'),
            stop.get('last_valid_event_seq')) != (expected[2], expected[3], expected[1]):
        raise ValueError('protected source metadata differs')
    if response_120.game_state_sha256(stop['game_state']) != expected[2] or \
            response_120.continuation_state_sha256(stop['continuation_state']) != expected[3]:
        raise ValueError('protected source hash differs')
    result = copy.deepcopy(stop['continuation_state'])
    result['last_event_seq'] = stop['last_valid_event_seq']
    result['continuation_state_sha256'] = stop['continuation_state_sha256']
    result['events'] = []
    result['snapshots'] = [{
        'seq': stop['last_valid_event_seq'],
        'game_state_sha256': stop['game_state_sha256'],
        'continuation_state_sha256': stop['continuation_state_sha256'],
    }]
    return result


def enumerate_opportunity(continuation: dict, history: dict, inputs: dict) -> dict:
    state = continuation['game_state']
    audit = candidate_121.audit_current_normal_action(
        state, continuation, history, inputs['candidate_table'])
    errors = candidate_121.validate_current_normal_action(
        audit, state, continuation, history, inputs['candidate_table'])
    if errors:
        raise ValueError('current candidate audit invalid: ' + '; '.join(errors))
    return {
        'actor': state['turn_player'], 'round': state['round'],
        'phase': 'normal_action', 'decision_kind': 'normal_action',
        'choice_kind': 'normal_action', 'audit': audit,
        'pending_triggers': copy.deepcopy(continuation['pending_triggers']),
        'activation_zone': copy.deepcopy(continuation['activation_zone']),
        'applied_reservations_known_empty': all(
            not p['reservations'] for p in state['players'].values()),
        'legal_candidate_ids': audit['legal_candidate_ids'],
        'legal_candidate_details': audit['legal_candidate_details'],
        'candidate_set_complete': audit['candidate_set_complete'],
        'candidate_set_evidence': {
            'source_ref': candidate_121.build_contract()['contract_version'],
            'state_ref': response_120.game_state_sha256(state),
            'enumeration_rule': 'all twelve current-state checks independently derived',
        },
    }


def select_decision(opportunity: dict, route_context: dict) -> dict:
    audit = opportunity['audit']
    if (opportunity['candidate_set_complete'] is not True or
            audit['candidate_set_complete'] is not True or
            not all(audit['completeness_checks'].get(name) is True
                    for name in candidate_121.CHECKS) or
            audit['contract_stop_codes'] or
            opportunity['legal_candidate_ids'] != audit['legal_candidate_ids']):
        raise ValueError('incomplete_legal_candidates')
    ids = audit['legal_candidate_ids']
    if ids == ['pass']:
        detail = audit['legal_candidate_details'][0]
        return {'decision_kind': 'normal_action', 'resolution_mode': 'priority_unique',
                'strategic_unresolved': False, 'reason_code': 'pass_no_better_legal_action',
                'legal_candidates': list(ids),
                'legal_candidate_details': copy.deepcopy(audit['legal_candidate_details']),
                'candidate_set_complete': True,
                'candidate_set_evidence': copy.deepcopy(opportunity['candidate_set_evidence']),
                'selected_candidate': 'pass', 'selected_action': copy.deepcopy(detail),
                'runner_up_candidates': [], 'seed_context': None, 'seed_proof': None}
    # The current 121 grammar admits pass and stage-one births. Their certain
    # immediate growth and 100-maintenance outcomes are equal in this R1
    # state. 114 compares certain time balance before speculative card value.
    details = {d['candidate_id']:d for d in audit['legal_candidate_details']}
    owner = audit['owner_state']
    opponent = next(iter(audit['public_information'].values()))
    if (owner['growth'] >= 100 or opponent['growth'] >= 100 or
            owner['board']['main'] is not None or
            opponent['board']['main'] is not None or
            owner['reservations'] or opportunity.get('pending_triggers') != [] or
            opportunity.get('activation_zone') != [] or
            opportunity.get('applied_reservations_known_empty') is not True or
            opportunity['round'] != 1):
        raise RulesStop('legality_not_confirmed', {
            'criterion':'107 priority 1-3 certain zero preconditions'})
    scores = {}
    for candidate_id, detail in details.items():
        if detail['action_type'] == 'pass':
            payment = 0
        elif (detail['action_type'],detail['candidate_variant']) == ('play_main','birth'):
            if detail['card_id'] not in BIRTH_TEXT_EVIDENCE:
                raise RulesStop('legality_not_confirmed', {
                    'criterion':'certain birth outcome', 'card_id':detail['card_id']})
            payment = int(detail['card_id'].rsplit('-',1)[-1])
        else:
            raise RulesStop('legality_not_confirmed', {
                'criterion':'114 comparison input', 'candidate_id':candidate_id})
        scores[candidate_id] = {
            'candidate_id':candidate_id, 'avoid_loss_or_abort':0,
            'maintain_or_prevent_100':0, 'certain_growth_difference':0,
            'time_after_certain_resolution':owner['time']-payment,
            'payment_time':payment, 'consumed_card_count':0,
            'card_copy_id':detail.get('source_instance_id') or '',
            'value_comparison_to':{},
        }
    best = max(score['time_after_certain_resolution'] for score in scores.values())
    leaders = [candidate_id for candidate_id,score in scores.items()
               if score['time_after_certain_resolution']==best]
    if len(leaders)==1:
        selected=leaders[0]
        comparisons=[hardening_114.compare_candidates(scores[selected],scores[other])
                     for other in ids if other!=selected]
        if not all(c['winner']=='left' and
                   c['decided_at']=='time_after_certain_resolution' for c in comparisons):
            raise RulesStop('legality_not_confirmed', {'criterion':'107/114 comparator'})
        return {'decision_kind':'normal_action','resolution_mode':'priority_unique',
                'strategic_unresolved':False,
                'reason_code':'time_balance',
                'legal_candidates':copy.deepcopy(ids),
                'legal_candidate_details':copy.deepcopy(audit['legal_candidate_details']),
                'candidate_set_complete':True,
                'candidate_set_evidence':copy.deepcopy(opportunity['candidate_set_evidence']),
                'selected_candidate':selected,'selected_action':copy.deepcopy(details[selected]),
                'runner_up_candidates':[other for other in ids if other!=selected],
                'comparison_evidence':{'decided_at':'time_after_certain_resolution',
                                       'scores':scores,'pairwise':comparisons},
                'seed_context':None,'seed_proof':None}
    # Equal certain time does not prove 114's Pareto components and tie-breaks
    # incomparable. Without those proofs the 116 lottery is forbidden.
    raise RulesStop('legality_not_confirmed', {
        'criterion':'114 Pareto and limited tie-break evidence',
        'equal_time_candidates':leaders})


def apply_supported_response(continuation: dict, decision: dict,
                             inputs: dict) -> tuple[dict,list[dict]]:
    """Route a proved 119 response; an unsupported effect stops this route."""
    action = decision['selected_action']
    kind = action.get('action_type')
    if kind != 'response_pass' and (kind,action.get('card_id')) not in response_120.ACTION_HANDLERS:
        raise RulesStop('effect_resolution_not_defined', {
            'phase':'response_window', 'action_type':kind,
            'card_id':action.get('card_id')})
    try:
        return response_120.apply_decision(continuation,decision,{
            'response_window_inputs_119':{'candidate_table':inputs['candidate_table']}})
    except response_120.ImplementationError as error:
        if 'unimplemented action handler' not in str(error):
            raise
        raise RulesStop('effect_resolution_not_defined',{
            'phase':'response_window','detail':str(error)}) from error


def transition(continuation: dict, decision: dict, inputs: dict) -> tuple[dict, list[dict]]:
    """Apply a supported normal-action variant atomically, or stop before payment."""
    action = decision['selected_action']
    if decision.get('candidate_set_complete') is not True:
        raise RulesStop('incomplete_legal_candidates', {'stage': 'transition'})
    if action['action_type'] == 'pass':
        actor = continuation['game_state']['turn_player']
        after = copy.deepcopy(continuation)
        after['last_event_seq'] += 1
        after['return_target'] = 'turn_end'
        after['game_state']['phase'] = 'turn_end_response'
        after['response_context'] = {
            'source_phase':'normal_action', 'phase':'response_window',
            'window_kind':'after_normal_action', 'origin_event_seq':after['last_event_seq'],
            'turn_player':actor, 'priority_actor':'B' if actor=='A' else 'A',
            'chain_status':'empty', 'chain_links':[], 'consecutive_passes':1,
            'response_opportunity_index':2, 'decision_kind':'response_action',
            'choice_kind':'reaction_or_pass',
        }
        after['continuation_state_sha256'] = response_120.continuation_state_sha256(
            response_120._continuation_payload(after))
        event = {
            'seq':after['last_event_seq'], 'action_type':'normal_pass_end_request',
            'actor':actor, 'selected_candidate':'pass', 'source_instance_id':None,
            'game_state_before_sha256':response_120.game_state_sha256(continuation['game_state']),
            'game_state_after_sha256':response_120.game_state_sha256(after['game_state']),
            'continuation_state_before_sha256':continuation['continuation_state_sha256'],
            'continuation_state_after_sha256':after['continuation_state_sha256'],
            'source_reference':'06-action-chain-checkpoint.md#ターン終了',
        }
        return after, [event]
    if (action['action_type'], action['candidate_variant']) != ('play_main', 'birth'):
        raise RulesStop('effect_resolution_not_defined', {
            'action_type': action['action_type'], 'candidate_variant': action['candidate_variant']})
    before = continuation['game_state']
    actor = before['turn_player']
    source = action['source_instance_id']
    player = before['players'][actor]
    card = before['cards'].get(source)
    if card is None or source not in player['hand'] or card['card_id'] != action['card_id'] or \
            player['board']['main'] is not None:
        raise RulesStop('legality_not_confirmed', {'source_instance_id': source})
    text_evidence = BIRTH_TEXT_EVIDENCE.get(card['card_id'])
    if not text_evidence or text_evidence[0] != 'continuous_only':
        raise RulesStop('effect_resolution_not_defined', {
            'action_type':'play_main', 'candidate_variant':'birth',
            'source_text_reference': text_evidence[1] if text_evidence else None,
            'unresolved': 'birth-trigger or card-text classification',
        })
    stage = int(card['card_id'].rsplit('-', 1)[-1])
    if stage != 1 or player['time'] < stage:
        raise RulesStop('legality_not_confirmed', {'source_instance_id': source})
    after = copy.deepcopy(continuation)
    owner = after['game_state']['players'][actor]
    owner['time'] -= stage
    owner['hand'].remove(source)
    owner['board']['main'] = source
    after['game_state']['phase'] = 'post_placement_response'
    after['last_event_seq'] = continuation['last_event_seq'] + 1
    after['response_context'] = {
        'source_phase': 'post_placement_response', 'phase': 'response_window',
        'window_kind': 'after_normal_action', 'origin_event_seq': after['last_event_seq'],
        'turn_player': actor, 'priority_actor': actor, 'chain_status': 'empty',
        'chain_links': [], 'consecutive_passes': 0, 'response_opportunity_index': 1,
        'decision_kind': 'response_action', 'choice_kind': 'reaction_or_pass',
    }
    after['continuation_state_sha256'] = response_120.continuation_state_sha256(
        response_120._continuation_payload(after))
    event = {
        'seq': after['last_event_seq'], 'action_type': 'play_main_birth', 'actor': actor,
        'selected_candidate': decision['selected_candidate'], 'source_instance_id': source,
        'payment_time': stage,
        'game_state_before_sha256': response_120.game_state_sha256(before),
        'game_state_after_sha256': response_120.game_state_sha256(after['game_state']),
        'continuation_state_before_sha256': continuation['continuation_state_sha256'],
        'continuation_state_after_sha256': after['continuation_state_sha256'],
        'source_reference': text_evidence[1],
    }
    return after, [event]


def _snapshot(continuation: dict) -> dict:
    return {
        'seq': continuation['last_event_seq'],
        'game_state_sha256': response_120.game_state_sha256(continuation['game_state']),
        'continuation_state_sha256': continuation['continuation_state_sha256'],
    }


def _verify_step(before: dict, after: dict, events: list[dict]) -> None:
    if not events or after['last_event_seq'] != before['last_event_seq'] + len(events):
        raise response_120.RouteIntegrityStop(
            'sequence_discontinuity', _snapshot(before), {'events': events})
    for key, computed in (
        ('continuation_state_sha256', response_120.continuation_state_sha256(
            response_120._continuation_payload(after))),
    ):
        if after[key] != computed:
            raise response_120.RouteIntegrityStop(
                'event_hash_discontinuity', _snapshot(before), {'field': key})
    last_game = response_120.game_state_sha256(before['game_state'])
    last_continuation = before['continuation_state_sha256']
    for seq, event in enumerate(events, before['last_event_seq'] + 1):
        if (event['seq'] != seq or event['game_state_before_sha256'] != last_game or
                event['continuation_state_before_sha256'] != last_continuation):
            raise response_120.RouteIntegrityStop(
                'event_hash_discontinuity', _snapshot(before), {'seq': seq})
        last_game = event['game_state_after_sha256']
        last_continuation = event['continuation_state_after_sha256']
    if (last_game != response_120.game_state_sha256(after['game_state']) or
            last_continuation != after['continuation_state_sha256']):
        raise response_120.RouteIntegrityStop(
            'event_hash_discontinuity', _snapshot(before), {'final_seq': after['last_event_seq']})
    for player_id, player in after['game_state']['players'].items():
        board = player['board']
        instances = player['hand'] + player['deck'] + player['discard'] + \
            board['companions'] + board['prepared'] + \
            [x for x in (board['main'], board['partner'], board['world']) if x]
        expected = {i for i in after['game_state']['cards'] if i.startswith(player_id + '-')}
        if len(instances) != len(set(instances)) or set(instances) != expected:
            raise response_120.RouteIntegrityStop(
                'instance_zone_duplicate_or_missing', _snapshot(before), {'player': player_id})


def derive_public_history(seed: dict, events: list[dict], last_event_seq: int) -> dict:
    """Prove current public history from the 117/120 chain plus committed 122 events."""
    known = {'normal_pass_end_request','response_pass','play_main_birth',
             'event_activation','event_resolution'}
    if seed.get('normal_challenge_losses_by_actor') != []:
        raise RulesStop('legality_not_confirmed', {'criterion':'seed challenge history'})
    refs = list(seed['source_refs'])
    for index, event in enumerate(events, seed['last_valid_event_seq']+1):
        if event.get('seq') != index or not isinstance(event.get('event_id'),str):
            raise response_120.RouteIntegrityStop(
                'sequence_discontinuity', {'last_valid_event_seq':index-1},
                {'history_event':event})
        if event.get('action_type') not in known:
            raise RulesStop('legality_not_confirmed', {
                'criterion':'public challenge history', 'event_id':event['event_id'],
                'action_type':event.get('action_type')})
        refs.append(event['event_id'])
    if last_event_seq != seed['last_valid_event_seq']+len(events):
        raise response_120.RouteIntegrityStop(
            'sequence_discontinuity', {'last_valid_event_seq':last_event_seq},
            {'history_event_count':len(events)})
    return {'normal_challenge_losses_by_actor':[],
            'last_valid_event_seq':last_event_seq, 'source_refs':refs}


def run_route(stop: dict, inputs: dict) -> dict:
    """Replay one route; persist only transitions proved against its current state."""
    current = resume_from_120(stop)
    current['source_event_seq'] = stop['last_valid_event_seq']
    snapshots = [_snapshot(current)]
    decisions: list[dict] = []
    events: list[dict] = []
    seed_history = candidate_121._public_history_from_saved_plans(stop)
    route_context = {'order_id': stop['order_id'], 'actor_turn_index': 1,
                     'round': stop['round']}
    terminal = None
    for _ in range(128):
        decision = None
        try:
            history=derive_public_history(seed_history,events,current['last_event_seq'])
            state = current['game_state']
            if state['phase'] == 'turn_end':
                raise RulesStop('effect_resolution_not_defined', {
                    'stage':'turn_end_reservations_triggers_victory',
                    'source_references':['06-action-chain-checkpoint.md#ターン終了',
                                         '64-turn-boundaries-and-victory-timing.md'],
                })
            if state['phase'] == 'normal_action':
                opportunity = enumerate_opportunity(current, history, inputs)
                audit = opportunity['audit']
                if not audit['candidate_set_complete']:
                    raise RulesStop('incomplete_legal_candidates', {
                        'contract_stop_codes': audit['contract_stop_codes'],
                        'completeness_checks': audit['completeness_checks']})
                decision = select_decision(opportunity, route_context)
                after, generated = transition(current, decision, inputs)
                kind = 'normal_action'
            elif current['response_context']['phase'] == 'response_window' and \
                    current['response_context']['chain_status'] in ('empty', 'building') and \
                    current['response_context']['consecutive_passes'] < 2:
                actor = current['response_context']['priority_actor']
                opportunity = response_120.enumerate_response_opportunity(
                    current, actor, inputs['candidate_table'])
                decision = response_120.resolve_response_choice(route_context, opportunity)
                after, generated = apply_supported_response(current,decision,inputs)
                if (current['return_target'] == 'turn_end' and
                        decision['selected_candidate'] == 'response-pass' and
                        current['response_context']['consecutive_passes'] == 1 and
                        after['response_context']['consecutive_passes'] == 2 and
                        not current['response_context']['chain_links']):
                    # 119 closes the empty window; 06 sends this particular
                    # normal-pass request to the existing turn-end boundary.
                    after['game_state']['phase'] = 'turn_end'
                    after['return_target'] = 'turn_end'
                    after['continuation_state_sha256'] = response_120.continuation_state_sha256(
                        response_120._continuation_payload(after))
                    generated[-1]['game_state_after_sha256'] = response_120.game_state_sha256(
                        after['game_state'])
                    generated[-1]['continuation_state_after_sha256'] = after[
                        'continuation_state_sha256']
                    generated[-1]['_snapshot_after'] = response_120._build_snapshot(
                        after, after['last_event_seq'])
                audit = None
                kind = 'response_action'
            else:
                raise RulesStop('canonical_rule_not_defined', {
                    'phase': state['phase'], 'response_context': current['response_context']})
            _verify_step(current, after, generated)
            decision_id = f"decision-122-{stop['path_id']}-{len(decisions)+1:03d}"
            for offset, event in enumerate(generated):
                recorded = {key: copy.deepcopy(value) for key, value in event.items()
                            if key != '_snapshot_after'}
                recorded['event_id'] = f"event-122-{stop['path_id']}-{event['seq']:03d}"
                recorded['decision_id'] = decision_id if offset == 0 else None
                events.append(recorded)
                if '_snapshot_after' in event:
                    snap = event['_snapshot_after']
                    snapshots.append({'seq': event['seq'],
                                      'game_state_sha256': snap['game_state_sha256'],
                                      'continuation_state_sha256': snap['continuation_state_sha256']})
                else:
                    snapshots.append(_snapshot(after))
            decisions.append({'decision_id': decision_id, 'kind': kind,
                              'selected_candidate': decision['selected_candidate'],
                              'legal_candidates': copy.deepcopy(opportunity['legal_candidate_ids']),
                              'resolution_mode': decision['resolution_mode'],
                              'reason_code': decision['reason_code'],
                              'runner_up_candidates': copy.deepcopy(decision['runner_up_candidates']),
                              'seed_context': copy.deepcopy(decision.get('seed_context')),
                              'seed_proof': copy.deepcopy(decision.get('seed_proof')),
                              'audit': copy.deepcopy(audit),
                              'event_seqs': [event['seq'] for event in generated]})
            current = after
        except RulesStop as failure:
            evidence = copy.deepcopy(failure.evidence)
            if decision is not None:
                evidence['unexecuted_choice'] = {
                    'selected_candidate': decision['selected_candidate'],
                    'resolution_mode': decision['resolution_mode'],
                    'legal_candidates': copy.deepcopy(
                        decision.get('legal_candidates', decision.get('legal_candidate_ids'))),
                    'seed_context': copy.deepcopy(decision.get('seed_context')),
                    'seed_proof': copy.deepcopy(decision.get('seed_proof')),
                }
            terminal = {'reason_code': failure.code, 'evidence': evidence}
            status = 'stopped_rules_adjudication'
            break
        except response_120.RouteIntegrityStop as failure:
            terminal = {'reason_code': failure.reason_code, 'detected': failure.detected}
            status = 'stopped_record_integrity'
            break
        except ValueError as failure:
            terminal = {'reason_code': 'legality_not_confirmed', 'evidence': {'detail': str(failure)}}
            status = 'stopped_rules_adjudication'
            break
    else:
        terminal = {'reason_code': 'canonical_rule_not_defined',
                    'evidence': {'detail': 'bounded replay lacks a proved terminal'}}
        status = 'stopped_rules_adjudication'
    return {'path_id': stop['path_id'], 'status': status,
            'terminal': terminal, 'last_valid_event_seq': current['last_event_seq'],
            'game_state': copy.deepcopy(current['game_state']),
            'continuation_state': response_120._continuation_payload(current),
            'game_state_sha256': response_120.game_state_sha256(current['game_state']),
            'continuation_state_sha256': current['continuation_state_sha256'],
            'decisions': decisions, 'events': events, 'snapshots': snapshots,
            'winner': None, 'counts_as_completed_match': False,
            'counts_as_independent_balance_sample': False}


def build_outputs(inputs: dict) -> dict:
    """Deterministic checkpoint-122 artifacts, with protected inputs as immutable roots."""
    if list(inputs['stops']) != list(candidate_121.PATH_ORDER):
        raise ValueError('120 source path order differs')
    routes = []
    stops = {}
    for path, (stop, raw) in inputs['stops'].items():
        candidate_121.verify_source_artifact(stop, raw, candidate_121.EXPECTED[path])
        route = run_route(stop, inputs)
        routes.append({
            'path_id': path, 'order_id': stop['order_id'],
            'source_stop_file': f'proxy-response-window-stops-120/stop-120-{path}.json',
            'source_stop_sha256': hashlib.sha256(raw).hexdigest(),
            'source_event_seq': stop['last_valid_event_seq'],
            'source_game_state_sha256': stop['game_state_sha256'],
            'source_continuation_state_sha256': stop['continuation_state_sha256'],
            **route,
        })
        if route['status'].startswith('stopped_'):
            stops[path] = {
                'schema':'naotocchi.card_game.proxy_normal_action_stop.v1',
                'checkpoint':122, 'path_id':path, 'order_id':stop['order_id'],
                'source_stop_sha256':hashlib.sha256(raw).hexdigest(),
                'status':route['status'], 'reason_code':route['terminal']['reason_code'],
                'evidence':copy.deepcopy(route['terminal']),
                'last_valid_event_seq':route['last_valid_event_seq'],
                'game_state':copy.deepcopy(route['game_state']),
                'game_state_sha256':route['game_state_sha256'],
                'continuation_state':copy.deepcopy(route['continuation_state']),
                'continuation_state_sha256':route['continuation_state_sha256'],
                'winner':None, 'counts_as_completed_match':False,
                'counts_as_independent_balance_sample':False,
            }
    summary = {'planned':len(routes),
               'completed':sum(r['status']=='completed' for r in routes),
               'rules_stop':sum(r['status']=='stopped_rules_adjudication' for r in routes),
               'integrity_stop':sum(r['status']=='stopped_record_integrity' for r in routes),
               'decision':sum(len(r['decisions']) for r in routes),
               'event':sum(len(r['events']) for r in routes),
               'snapshot':sum(len(r['snapshots']) for r in routes),
               'winner':sum(r['winner'] is not None for r in routes),
               'independent_balance_sample':sum(r['counts_as_independent_balance_sample']
                                                for r in routes)}
    return {
        'plan':{'schema':'naotocchi.card_game.proxy_normal_action_seeded_restart_plan.v1',
                'checkpoint':122, 'source_checkpoint':120,
                'candidate_contract_checkpoint':121,
                'route_order':list(candidate_121.PATH_ORDER), 'routes':routes},
        'evaluation':{'schema':'naotocchi.card_game.proxy_normal_action_seeded_restart_evaluation.v1',
                      'checkpoint':122, 'summary':summary,
                      'route_statuses':[{ 'path_id':r['path_id'], 'status':r['status'],
                                          'reason_code':r['terminal']['reason_code'],
                                          'last_valid_event_seq':r['last_valid_event_seq']}
                                        for r in routes],
                      'independent_balance_note':'seeded fallback paths are excluded'},
        'stops':stops,
    }


def canonical_bytes(value: dict) -> bytes:
    return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode('utf-8')


def validate_outputs(outputs: dict, inputs: dict) -> list[str]:
    try:
        expected=build_outputs(inputs)
    except (KeyError,TypeError,ValueError) as error:
        return [f'protected source integrity: {error}']
    return [key for key in ('plan','evaluation','stops')
            if key not in outputs or canonical_bytes(outputs[key])!=canonical_bytes(expected[key])]


def _artifact_paths(outputs: dict, data_dir: Path):
    yield data_dir/PLAN_FILE, outputs['plan']
    yield data_dir/EVALUATION_FILE, outputs['evaluation']
    for path in candidate_121.PATH_ORDER:
        if path in outputs['stops']:
            yield data_dir/STOP_DIR/f'stop-122-{path}.json', outputs['stops'][path]


def write_outputs(outputs: dict, data_dir: Path = DATA) -> None:
    for path, value in _artifact_paths(outputs,Path(data_dir)):
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_bytes(canonical_bytes(value))


def check_outputs(data_dir: Path = DATA, inputs: dict | None = None) -> list[str]:
    data_dir=Path(data_dir)
    inputs=inputs if inputs is not None else load_sources()
    expected=build_outputs(inputs)
    errors=[]
    for path, value in _artifact_paths(expected,data_dir):
        if not path.is_file() or path.read_bytes()!=canonical_bytes(value):
            errors.append(f'canonical bytes differ: {path.name}')
    actual_stops={p.name for p in (data_dir/STOP_DIR).glob('*.json')}
    expected_stops={f'stop-122-{path}.json' for path in expected['stops']}
    if actual_stops!=expected_stops:
        errors.append('stop artifact set differs')
    return errors


def main() -> int:
    parser=argparse.ArgumentParser()
    action=parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--write',action='store_true')
    action.add_argument('--check',action='store_true')
    args=parser.parse_args()
    inputs=load_sources()
    if args.write:
        write_outputs(build_outputs(inputs))
        return 0
    errors=check_outputs(DATA,inputs)
    if errors:
        print('\n'.join(errors))
        return 1
    print('checkpoint 122 canonical bytes valid')
    return 0


if __name__=='__main__':
    raise SystemExit(main())
