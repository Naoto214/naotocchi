#!/usr/bin/env python3
"""Checkpoint 129: compare conditional growth using existing certain priorities."""
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path

import proxy_r2_candidate_extension_128 as extension_128

DATA=extension_128.DATA
SOURCE_SHA={
 'order-01-a-first':'045a6f918aad07cfeff40e020e6e1ea39954d8d12b2eff35247c21340fc7de0a',
 'order-01-b-first':'373edaa4ce37d6cd4d8a4f2baafb79408ed697fb11f5eb5bff76a26e0c78411e',
 'order-02-a-first':'68fc829b804cf1a0f3615561e974dcbc1439f375ef45de79896b6725a1e430dd',
 'order-02-b-first':'c103d95f25f1ac8747dfbf1634960058f38e363e71d92e8bafb549b7ce69afdf',
}
CONDITIONAL={
 'G-hit-blow':{'reference':'87-play-batch-5-card-text-draft.md#G-hit-blow',
               'condition':'宣言した種類なら','uncertainty_source':'hidden_top_deck'},
 'E-first-date':{'reference':'91-event-21-card-text-draft.md#E-first-date',
                  'condition':'解決時','uncertainty_source':'response_target_departure'},
}
restart_122=extension_128.restart_122
restart_117=extension_128.restart_117
hardening_114=extension_128.hardening_114
response_120=extension_128.response_120
current_126=extension_128.current_126
extension_125=extension_128.extension_125
extension_127=extension_128.extension_127
fallback_116=extension_128.fallback_116


def load_sources(data_dir: Path = DATA) -> dict:
    prior=extension_128.load_sources(data_dir)
    stops={}
    for path,sha in SOURCE_SHA.items():
        raw=(data_dir/'proxy-r2-candidate-stops-128'/f'stop-128-{path}.json').read_bytes()
        if hashlib.sha256(raw).hexdigest()!=sha:
            raise ValueError('128 protected raw SHA differs')
        stop=json.loads(raw)
        if response_120.game_state_sha256(stop['final_state']['game_state'])!=stop['game_state_sha256'] or \
                response_120.continuation_state_sha256(response_120._continuation_payload(stop['final_state']))!=stop['continuation_state_sha256']:
            raise ValueError('128 protected state SHA differs')
        stops[path]=stop
    return {'stops':stops,'candidate_table':prior['candidate_table'],'source_128':prior}


def compare_conditional(route: dict, audit: dict, table: dict) -> dict:
    if audit!=extension_128.audit_current(route,table) or not audit['candidate_set_complete']:
        raise ValueError('unproved complete candidate set')
    game=route['final_state']['game_state'];actor=game['turn_player'];owner=game['players'][actor]
    if game['phase']!='normal_action' or any(p['growth']>=100 for p in game['players'].values()) or \
            route['final_state']['pending_triggers'] or route['final_state']['activation_zone']:
        raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'earlier 107 priority'})
    scores={};uncertainty={}
    for item in audit['legal_candidate_details']:
        action=item['action_type'];cid=item['candidate_id'];cost=0
        if action=='play_main' and item['candidate_variant']=='birth':
            card=game['cards'][item['source_instance_id']]
            birth=restart_117._main_birth_detail(item['source_instance_id'],card,table,owner['board'],owner['time'])
            if birth is None or birth['candidate_id']!=cid or item['card_id'] not in restart_122.BIRTH_TEXT_EVIDENCE:
                raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'birth effect'})
            cost=birth['payment_time']
        elif action in ('attach_item','place_world'):
            effect=extension_128.PAID_ACTION_CERTAIN_EFFECTS.get(item['card_id'])
            if effect is None or effect['immediate_growth_delta']!=0 or effect['immediate_time_delta']!=0 or \
                    effect['deferred_condition'] not in (DATA.parent/effect['reference'].split('#')[0]).read_text():
                raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'classified paid effect'})
            template=next(c for c in table['cards'] if c['card_id']==item['card_id'])['actions'][0]
            cost=template['base_time_cost']
        elif action in ('use_play','use_event') and item['card_id'] in CONDITIONAL:
            effect=CONDITIONAL[item['card_id']]
            filename,_,anchor=effect['reference'].partition('#')
            source=(DATA.parent/filename).read_text()
            if anchor!=item['card_id'] or f'### {anchor} ' not in source or effect['condition'] not in source:
                raise ValueError('conditional card text differs')
            if effect['uncertainty_source']=='hidden_top_deck':
                if action!='use_play' or not owner['deck'] or item['target_instance_ids']:
                    raise ValueError('hidden-deck condition differs')
            elif effect['uncertainty_source']=='response_target_departure':
                targets=item['target_instance_ids']
                if action!='use_event' or len(targets)!=1 or targets[0]!=owner['board']['partner'] or \
                        owner['board']['partner_stage']!=0:
                    raise ValueError('response-sensitive condition differs')
            template=next(c for c in table['cards'] if c['card_id']==item['card_id'])['actions'][0]
            cost=template['base_time_cost']
            uncertainty[cid]={'source_card_id':item['card_id'],'source_reference':effect['reference'],
                              'condition':effect['condition'],'uncertainty_source':effect['uncertainty_source'],
                              'certain_growth_difference':0}
        elif action!='pass':
            raise restart_122.RulesStop('missing_next_normal_action_choice_proof',
                {'criterion':'unclassified action','source_card_id':item['card_id']})
        if not isinstance(cost,int) or (action!='pass' and cost<=0) or cost>owner['time']:
            raise ValueError('unproved payment time')
        scores[cid]={'candidate_id':cid,'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,
            'certain_growth_difference':0,'time_after_certain_resolution':owner['time']-cost,
            'payment_time':cost,'consumed_card_count':0,'card_copy_id':item.get('source_instance_id') or '',
            'value_comparison_to':{}}
    if not uncertainty:
        return extension_128.compare_paid_to_pass(route,audit,table)
    if 'pass' not in scores:
        raise ValueError('conditional comparison without pass')
    comparisons={cid:hardening_114.compare_candidates(scores['pass'],score)
                 for cid,score in scores.items() if cid!='pass'}
    if any(x['winner']!='left' or x['decided_at']!='time_after_certain_resolution'
           for x in comparisons.values()):
        raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'107/114 time order'})
    return {'decision_kind':'normal_action','resolution_mode':'priority_unique',
            'strategic_unresolved':False,'reason_code':'time_balance',
            'legal_candidates':copy.deepcopy(audit['legal_candidate_ids']),
            'legal_candidate_details':copy.deepcopy(audit['legal_candidate_details']),
            'candidate_set_complete':True,
            'candidate_set_evidence':{'source_ref':'129.current_state_rederivation',
                'state_ref':route['game_state_sha256'],'enumeration_rule':'all current-state units rederived'},
            'selected_candidate':'pass','selected_action':copy.deepcopy(next(x for x in audit['legal_candidate_details']
                                                                             if x['candidate_id']=='pass')),
            'runner_up_candidates':[x for x in audit['legal_candidate_ids'] if x!='pass'],
            'seed_context':None,
            'priority_basis':{'source_contracts':[107,114], 'scores':scores,'pairwise':comparisons,
                              'conditional_uncertainty':uncertainty},'seed_proof':None}


def audit_turn_end_from_history(path: str, source: dict, prior: dict, current: dict,
                                events: list[dict], snapshots: list[dict]) -> dict:
    if source['snapshots'][-1]!=snapshots[0]:
        raise ValueError('128/129 event boundary differs')
    joined_events=copy.deepcopy(source['events'])+copy.deepcopy(events)
    joined_snapshots=copy.deepcopy(source['snapshots'])+copy.deepcopy(snapshots[1:])
    return extension_128.audit_turn_end_from_history(path,prior['stops'][path],prior['source_127'],
                                                      current,joined_events,joined_snapshots)


def run_route(path: str, inputs: dict) -> dict:
    source=inputs['stops'][path]
    if source['path_id']!=path or \
            response_120.game_state_sha256(source['final_state']['game_state'])!=source['game_state_sha256'] or \
            response_120.continuation_state_sha256(response_120._continuation_payload(source['final_state']))!=source['continuation_state_sha256']:
        raise ValueError('128 source state hash differs')
    current=copy.deepcopy(source['final_state'])
    snapshots=[{'seq':source['last_valid_event_seq'],'game_state_sha256':source['game_state_sha256'],
                'continuation_state_sha256':source['continuation_state_sha256']}]
    audits=[];decisions=[];events=[];reason=None
    for _ in range(64):
        try:
            game=current['game_state'];route=extension_127._current_route(path,current)
            decision=None;audit=None
            if game['phase']=='normal_action':
                audit=extension_128.audit_current(route,inputs['candidate_table'])
                audits.append(audit)
                if audit!=extension_128.audit_current(route,inputs['candidate_table']):
                    raise ValueError('128 independent current candidate audit differs')
                if not audit['candidate_set_complete']:
                    raise restart_122.RulesStop('incomplete_legal_candidates',{
                        'contract_stop_codes':audit['contract_stop_codes']})
                if any(d['action_type'] in ('place_companion','place_partner') for d in audit['legal_candidate_details']):
                    decision=extension_128.compare_mixed(route,audit,inputs['candidate_table'])
                    after,generated=extension_125._apply_placement(current,decision)
                else:
                    decision=compare_conditional(route,audit,inputs['candidate_table'])
                    after,generated=restart_122.transition(current,decision,inputs)
                kind='normal_action'
            elif current['response_context']['phase']=='response_window' and \
                    current['response_context']['consecutive_passes']<2:
                actor=current['response_context']['priority_actor']
                opportunity=response_120.enumerate_response_opportunity(current,actor,inputs['candidate_table'])
                if opportunity['candidate_set_complete'] is not True:
                    raise restart_122.RulesStop('incomplete_legal_candidates',{'phase':'response_window'})
                decision=response_120.resolve_response_choice({
                    'order_id':current_126.restart_124.load_sources()['stops'][path][0]['order_id'],
                    'actor_turn_index':game['round'],
                    'round':game['round']},opportunity)
                after,generated=restart_122.apply_supported_response(current,decision,inputs)
                if current['return_target']=='turn_end' and decision['selected_candidate']=='response-pass' and \
                        current['response_context']['consecutive_passes']==1 and \
                        after['response_context']['consecutive_passes']==2 and \
                        not current['response_context']['chain_links']:
                    after['game_state']['phase']='turn_end'
                    after['return_target']='turn_end'
                    after['continuation_state_sha256']=response_120.continuation_state_sha256(
                        response_120._continuation_payload(after))
                    generated[-1]['game_state_after_sha256']=response_120.game_state_sha256(after['game_state'])
                    generated[-1]['continuation_state_after_sha256']=after['continuation_state_sha256']
                    generated[-1]['_snapshot_after']=response_120._build_snapshot(after,after['last_event_seq'])
                audit=None;kind='response_action'
            elif game['phase']=='turn_end':
                if 'source_128' not in inputs:
                    raise restart_122.RulesStop('missing_current_turn_end_provenance',{
                        'phase':game['phase'],'last_valid_event_seq':current['last_event_seq']})
                proof=audit_turn_end_from_history(path,source,inputs['source_128'],current,events,snapshots)
                audits.append(proof)
                if not proof['turn_end_set_complete']:
                    raise restart_122.RulesStop('incomplete_turn_end_sources',{
                        'contract_stop_codes':proof['contract_stop_codes']})
                actor=game['turn_player'];other='B' if actor=='A' else 'A'
                # The saved 117 route fixes first-player identity independently of
                # current turn order; do not derive it from a path suffix.
                original=current_126.restart_124.load_sources()['plan_117']
                first=current_126.restart_124._find_route(original,path)['first_player']
                after=copy.deepcopy(current)
                after['game_state']['turn_player']=other
                if actor!=first:
                    after['game_state']['round']+=1
                after['game_state']['phase']='turn_start'
                after['return_target']=None
                generated=[];new_snapshots=[]
                current_126.restart_124._append_transition(current,after,generated,new_snapshots,
                                                            'turn_end_completed',actor)
                kind='turn_end'
            elif game['phase']=='turn_start':
                actor=game['turn_player'];owner=game['players'][actor]
                if current['pending_triggers'] or current['activation_zone'] or \
                        any(p['reservations'] for p in game['players'].values()):
                    raise restart_122.RulesStop('missing_turn_start_source_proof',{'criterion':'pending effects'})
                board_ids=[game['cards'][x]['card_id'] for p in game['players'].values()
                           for x in (p['board']['companions']+p['board']['prepared']+
                                     [z for z in (p['board']['main'],p['board']['partner'],p['board']['world']) if z])]
                if any(x not in extension_128.BOARD_CLASSIFICATION for x in board_ids):
                    raise restart_122.RulesStop('missing_turn_start_source_proof',{'criterion':'board trigger classification'})
                n=2 if owner['board']['main'] is None else 1
                if len(owner['deck'])<n:
                    raise restart_122.RulesStop('missing_turn_start_draw_evidence',{'draw_count':n})
                after=copy.deepcopy(current);player=after['game_state']['players'][actor]
                player['time']=game['round'];player['challenge_used']=False
                player['person_placed']=False;player['relationship_progressed']=False
                player['hand'].extend(player['deck'][:n]);del player['deck'][:n]
                after['game_state']['phase']='egg_exchange_choice' if n==2 else 'normal_action'
                generated=[];new_snapshots=[]
                current_126.restart_124._append_transition(current,after,generated,new_snapshots,
                    'turn_start_and_egg_draw' if n==2 else 'turn_start_and_draw',actor)
                kind='turn_start'
            elif game['phase']=='egg_exchange_choice':
                actor=game['turn_player'];owner=game['players'][actor]
                hand=[{'card_copy_id':game['cards'][x]['card_copy_id'],
                       'card_id':game['cards'][x]['card_id'],'initial_instance_id':x}
                      for x in owner['hand']]
                original=current_126.restart_124.load_sources()['stops'][path][0]
                decision=restart_117.build_mandatory_choice_decision(
                    {'order_id':original['order_id']},actor,game['round'],game['round'],hand)
                after=copy.deepcopy(current);player=after['game_state']['players'][actor]
                instance=decision['selected_action']['initial_instance_id']
                player['hand'].remove(instance);player['deck'].append(instance)
                after['game_state']['phase']='normal_action'
                generated=[];new_snapshots=[]
                current_126.restart_124._append_transition(current,after,generated,new_snapshots,
                                                            'egg_exchange_bottom',actor,decision['selected_candidate'])
                kind='mandatory_choice'
            else:
                raise restart_122.RulesStop('missing_current_turn_end_provenance',{
                    'phase':game['phase'],'last_valid_event_seq':current['last_event_seq']})
            extension_125._verify_extended_step(current,after,generated)
            for event in generated:
                events.append({k:copy.deepcopy(v) for k,v in event.items() if k!='_snapshot_after'})
                snapshots.append({'seq':event['seq'],'game_state_sha256':event['game_state_after_sha256'],
                                  'continuation_state_sha256':event['continuation_state_after_sha256']})
            if decision is not None:
                decisions.append({'kind':kind,'selected_candidate':decision['selected_candidate'],
                              'legal_candidates':copy.deepcopy(decision.get('legal_candidates',
                                  opportunity['legal_candidate_ids'] if kind=='response_action' else [])),
                              'resolution_mode':decision['resolution_mode'],
                              'seed_proof':copy.deepcopy(decision.get('seed_proof')),
                              'priority_basis':copy.deepcopy(decision.get('priority_basis',decision.get('comparison_evidence'))),
                                  'audit':copy.deepcopy(audit),'event_seqs':[e['seq'] for e in generated]})
            current=after
        except restart_122.RulesStop as error:
            reason={'code':error.code,'evidence':error.evidence}
            if error.code=='incomplete_legal_candidates':
                reason['contract_stop_codes']=error.evidence.get('contract_stop_codes',[])
            break
    else:
        reason={'code':'unsupported_continuation_bound','limit':64}
    return {'path_id':path,'source_stop_sha256':SOURCE_SHA[path],
            'source_game_state_sha256':source['game_state_sha256'],
            'source_continuation_state_sha256':source['continuation_state_sha256'],
            'status':'stopped_rules_adjudication','reason':reason,
            'last_valid_event_seq':current['last_event_seq'],
            'game_state_sha256':response_120.game_state_sha256(current['game_state']),
            'continuation_state_sha256':response_120.continuation_state_sha256(response_120._continuation_payload(current)),
            'final_state':current,'audits':audits,'decisions':decisions,'events':events,
            'snapshots':snapshots,'winner':None,
            'seeded_fallback_used':source['seeded_fallback_used'] or any(d['resolution_mode']=='seeded_fallback' for d in decisions),
            'counts_as_independent_balance_sample':False}



def run_all(inputs: dict) -> dict:
    return {path:run_route(path,inputs) for path in SOURCE_SHA}

PLAN_FILE='proxy-conditional-growth-plan-129-20260923.json'
EVALUATION_FILE='proxy-conditional-growth-evaluation-129-20260923.json'
STOP_FOLDER='proxy-conditional-growth-stops-129'
canonical_bytes=extension_128.canonical_bytes


def build_plan(outcomes: dict) -> dict:
    return {'schema':'naotocchi.card_game.proxy_conditional_growth_plan.v1',
            'checkpoint':129,'protected_128_stop_raw_sha256':SOURCE_SHA,
            'source_contracts':[107,114,116,117,121,123,126,127,128],
            'conditional_sources':CONDITIONAL,
            'routes':[{'path_id':path,'source_stop_sha256':SOURCE_SHA[path],
                       'source_game_state_sha256':row['source_game_state_sha256'],
                       'source_continuation_state_sha256':row['source_continuation_state_sha256'],
                       'last_valid_event_seq':row['last_valid_event_seq'],
                       'game_state_sha256':row['game_state_sha256'],
                       'continuation_state_sha256':row['continuation_state_sha256'],
                       'status':row['status'],'reason':row['reason'],
                       'decision_count':len(row['decisions']),'event_count':len(row['events']),
                       'snapshot_count':len(row['snapshots']),
                       'seeded_fallback_used':row['seeded_fallback_used'],
                       'counts_as_independent_balance_sample':row['counts_as_independent_balance_sample'],
                       'stop_file':f'{STOP_FOLDER}/stop-129-{path}.json'}
                      for path,row in outcomes.items()]}


def build_evaluation(plan: dict) -> dict:
    routes=plan['routes']
    return {'schema':'naotocchi.card_game.proxy_conditional_growth_evaluation.v1',
            'checkpoint':129,'planned':len(routes),
            'completed':sum(x['status']=='completed' for x in routes),
            'rules_stop':sum(x['status']=='stopped_rules_adjudication' for x in routes),
            'decision':sum(x['decision_count'] for x in routes),
            'event':sum(x['event_count'] for x in routes),
            'snapshot':sum(x['snapshot_count'] for x in routes),
            'winner':0,'independent_balance_sample':sum(x['counts_as_independent_balance_sample'] for x in routes),
            'stop_codes':{code:sum(x['reason']['code']==code for x in routes)
                          for code in sorted({x['reason']['code'] for x in routes})}}


def expected_outputs(inputs: dict | None = None) -> dict[str,bytes]:
    inputs=inputs if inputs is not None else load_sources()
    outcomes=run_all(inputs);plan=build_plan(outcomes)
    output={PLAN_FILE:canonical_bytes(plan),EVALUATION_FILE:canonical_bytes(build_evaluation(plan))}
    output.update({f'{STOP_FOLDER}/stop-129-{path}.json':canonical_bytes(row)
                   for path,row in outcomes.items() if row['status']!='completed'})
    return output


def write_outputs(data_dir: Path = DATA, inputs: dict | None = None) -> None:
    for name,raw in expected_outputs(inputs).items():
        path=data_dir/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)


def check_outputs(data_dir: Path = DATA, inputs: dict | None = None) -> list[str]:
    return [f'canonical bytes differ: {name}' for name,raw in expected_outputs(inputs).items()
            if not (data_dir/name).is_file() or (data_dir/name).read_bytes()!=raw]

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser()
    mode=parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write',action='store_true');mode.add_argument('--check',action='store_true')
    args=parser.parse_args()
    if args.write:write_outputs()
    else:
        errors=check_outputs()
        if errors:parser.exit(1,'\n'.join(errors)+'\n')
