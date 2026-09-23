#!/usr/bin/env python3
"""Checkpoint 132: active board candidate proof and adjacent history contracts."""
from __future__ import annotations

import copy
import hashlib
import json
from contextlib import contextmanager
from pathlib import Path

import proxy_safe_placement_mixed_131 as prior_131

prior_130=prior_131.prior_130
prior_129=prior_131.prior_129
extension_128=prior_131.extension_128
extension_127=prior_131.extension_127
extension_125=prior_131.extension_125
candidate_121=extension_128.candidate_121
restart_122=prior_131.restart_122
restart_117=prior_131.restart_117
response_120=prior_131.response_120
current_126=prior_131.current_126
fallback_116=prior_131.fallback_116
hardening_114=extension_128.hardening_114
DATA=prior_131.DATA
SOURCE_SHA={
 'order-01-a-first':'dcc87bd2e1613389be4ee037c71a729ffad6bd0a7c2da286e9339964fbc458d2',
 'order-01-b-first':'466235e9c0e7e05a70bf609a11e0da238a22351fff04b4206377ef19eed79ad7',
 'order-02-a-first':'cf88b721e68f6255d4e5b0ff6c89f4f34b54ac7bf4dcd9c2acdb2024a4c95e9a',
 'order-02-b-first':'5e21a34314b70608bd3da95d61f3833608adbda4ae19fe2a527eb2eded2d2f60',
}
ACTIVE_BOARD={
 'C-cat_friend':{'kind':'activated_normal_action',
                 'source_text_reference':'72-companion-26-card-text-draft.md#C-cat_friend',
                 'placement_action':'place_companion','placement_growth_delta':0,
                 'placement_duration':'none'},
}


def load_sources(data_dir: Path = DATA) -> dict:
    prior=prior_131.load_sources(data_dir)
    stops={}
    for path,sha in SOURCE_SHA.items():
        raw=(data_dir/'proxy-safe-placement-mixed-stops-131'/f'stop-131-{path}.json').read_bytes()
        if hashlib.sha256(raw).hexdigest()!=sha:raise ValueError('131 protected raw SHA differs')
        stop=json.loads(raw)
        if stop['path_id']!=path or response_120.game_state_sha256(stop['final_state']['game_state'])!=stop['game_state_sha256'] or \
                response_120.continuation_state_sha256(response_120._continuation_payload(stop['final_state']))!=stop['continuation_state_sha256']:
            raise ValueError('131 protected state SHA differs')
        stops[path]=stop
    return {'stops':stops,'candidate_table':prior['candidate_table'],'source_131':prior}


def _active_template(card_id: str, table: dict) -> dict:
    ability=ACTIVE_BOARD[card_id]
    filename,sep,anchor=ability['source_text_reference'].partition('#')
    body=(DATA.parent/filename).read_text()
    if not sep or anchor!=card_id or f'### {anchor} ' not in body or \
            '1ターンに1回' not in body or '自分のターンに' not in body or \
            'なかま枠から' not in body or '対象として発動できる' not in body:
        raise ValueError('active board source text differs')
    source=next((x for x in table['cards'] if x['card_id']==card_id),None)
    if source is None or source['card_type']!='companion':raise ValueError('active board template missing')
    actions=[x for x in source['actions'] if x['timing']=='normal_action_opportunity' and
             x['prerequisites'].startswith('on companion board;')]
    if len(actions)!=1 or actions[0]['action_type']!='activate_companion_ability' or \
            actions[0]['base_time_cost']!=0 or actions[0]['candidate_variants']!=['each_legal_discard_companion'] or \
            actions[0]['source_text_reference']!=ability['source_text_reference'] or \
            'another named companion exists in own discard' not in actions[0]['prerequisites']:
        raise ValueError('active board timing/template differs')
    return actions[0]


def expand_units(view: dict, table: dict) -> list[dict]:
    inventory=extension_125.inventory_sources(view)
    board=next(x for x in inventory if x['family']=='board_card_action')
    active={x for x in board['sources'] if view['cards'][x]['card_id'] in ACTIVE_BOARD}
    other_extras={x for x in board['sources'] if view['cards'][x]['card_id'] not in candidate_121.BOARD_ABILITY_REGISTRY and x not in active}
    for x in other_extras:extension_128._classify_board(x,view)
    filtered=copy.deepcopy(inventory)
    next(x for x in filtered if x['family']=='board_card_action')['sources']=[x for x in board['sources'] if x not in active|other_extras]
    baseline=candidate_121.expand_units(view,filtered,table)
    by_source={x['source_instance_id']:[x] for x in baseline if x['source_family']=='board_card_action'}
    for source in other_extras:
        card_id=view['cards'][source]['card_id'];ability=extension_128.BOARD_CLASSIFICATION[card_id]
        by_source[source]=[candidate_121._unit('board_card_action','board',source,'board_passive',
            ability['kind'],[],card_id,{'timing':'passive','source_text_reference':ability['source_text_reference']})]
    for source in active:
        card_id=view['cards'][source]['card_id'];template=_active_template(card_id,table)
        if source not in view['players'][view['actor']]['board']['companions']:
            raise ValueError('active board source zone differs')
        if template['target_rule']!=f'one companion in own discard other than {card_id}':
            raise ValueError('active board target rule differs')
        target_rows=candidate_121._targets(template['candidate_variants'][0],view,'board_card_action')
        target_rows=[targets for targets in target_rows if not targets or view['cards'][targets[0]]['card_id']!=card_id]
        if not target_rows:target_rows=[[]]
        by_source[source]=[candidate_121._unit('board_card_action','board',source,template['action_type'],
            template['candidate_variants'][0],targets,card_id,template) for targets in target_rows]
    baseline=[x for x in baseline if x['source_family']!='board_card_action']
    index=next((i for i,x in enumerate(baseline) if x['source_family'] not in ('standing_pass','hand_card_action')),len(baseline))
    baseline[index:index]=[unit for source in sorted(board['sources']) for unit in by_source[source]]
    return baseline


def _verified_recent_uses(route: dict) -> dict[str,list[int]]:
    events=route.get('events')
    if not isinstance(events,list) or not events:
        raise ValueError('missing_state_evidence: board ability event history')
    if events[0]['game_state_before_sha256']!=route.get('source_game_state_sha256') or \
            events[0]['continuation_state_before_sha256']!=route.get('source_continuation_state_sha256') or \
            events[-1]['seq']!=route['last_valid_event_seq'] or \
            events[-1]['game_state_after_sha256']!=route['game_state_sha256'] or \
            events[-1]['continuation_state_after_sha256']!=route['continuation_state_sha256']:
        raise ValueError('missing_state_evidence: board ability event boundary')
    for left,right in zip(events,events[1:]):
        if right['seq']!=left['seq']+1 or \
                right['game_state_before_sha256']!=left['game_state_after_sha256'] or \
                right['continuation_state_before_sha256']!=left['continuation_state_after_sha256']:
            raise ValueError('missing_state_evidence: board ability event chain')
    result={}
    for source in [x for p in route['final_state']['game_state']['players'].values() for x in p['board']['companions']
                   if route['final_state']['game_state']['cards'][x]['card_id'] in ACTIVE_BOARD]:
        placements=[e for e in events if e['action_type']=='place_companion' and e.get('source_instance_id')==source]
        if not placements:continue
        first=max(e['seq'] for e in placements)
        owner=next(p for p,player in route['final_state']['game_state']['players'].items() if source in player['board']['companions'])
        starts=[e['seq'] for e in events if e.get('actor')==owner and e['action_type'] in ('turn_start_and_egg_draw','turn_start_and_draw')]
        since=max(first,max(starts,default=first))
        result[source]=[e['seq'] for e in events if e['seq']>=since and e.get('source_instance_id')==source and
                        e['action_type']=='activate_companion_ability']
    return result


def _active_unit(view: dict, original: dict) -> dict:
    unit={k:copy.deepcopy(v) for k,v in original.items() if k!='template'}
    targets=unit['target_instance_ids'];source=unit['source_instance_id'];card_id=unit['card_id']
    template=original['template']
    if source not in view['players'][view['actor']]['board']['companions'] or \
            source not in view['cards'] or template!=_active_template(card_id,view['_candidate_table']):
        raise ValueError('unresolved_canonical_predicate: board active source')
    evidence={'owner.discard_companion_instance_ids':sorted(x for x in view['players'][view['actor']]['discard']
         if view['cards'][x]['card_id'].startswith('C-') and view['cards'][x]['card_id']!=card_id),
         'source_instance_id':source,'source_zone':'board','template.timing':template['timing']}
    if not targets:
        reasons=['required_target_absent'];identifier=None
    else:
        if len(targets)!=1 or targets[0] not in evidence['owner.discard_companion_instance_ids']:
            raise ValueError('incomplete_target_expansion: board active target')
        use_proof=view.get('_verified_ability_uses',{}).get(source)
        if use_proof is None:
            raise ValueError('missing_state_evidence: board ability once-per-turn usage')
        evidence['activation_event_seqs_this_turn']=use_proof
        reasons=['ability_limit_used'] if use_proof else []
        identifier=None if reasons else f"candidate-{unit['action_type']}-{source}-target-{targets[0]}"
    unit.update({'reason_codes':reasons,'disposition':'excluded' if reasons else 'admitted',
                 'candidate_id':identifier,'evidence':evidence,
                 'source_references':[template['source_text_reference'],
                                      '114-normal-decision-protocol-hardening.md','121-normal-action-candidate-completeness-contract.md']})
    return unit


def adjudicate_units(view: dict, baseline: list[dict]) -> list[dict]:
    active=lambda x:x['source_family']=='board_card_action' and x['action_type']=='activate_companion_ability'
    delegated=prior_130.adjudicate_units(view,[x for x in baseline if not active(x)])
    by_id={x['enumeration_unit_id']:x for x in delegated}
    result=[_active_unit(view,x) if active(x) else by_id[x['enumeration_unit_id']] for x in baseline]
    if len({x['enumeration_unit_id'] for x in result})!=len(result) or \
            len({x['candidate_id'] for x in result if x['candidate_id']})!=sum(bool(x['candidate_id']) for x in result):
        raise ValueError('candidate_id_collision')
    return result
def _expected(view: dict, table: dict) -> tuple[list,list,list,list]:
    inventory=extension_127.extension_125.inventory_sources(view)
    view['_candidate_table']=table
    units=adjudicate_units(view,expand_units(view,table))
    admitted=sorted((u for u in units if u['disposition']=='admitted'),key=lambda u:u['candidate_id'])
    if sum(u['candidate_id']=='pass' for u in admitted)!=1:
        raise ValueError('standing pass differs')
    return inventory,units,[u['candidate_id'] for u in admitted],admitted


def _checks(row: dict, view: dict, table: dict) -> dict[str,bool]:
    flags={name:False for name in candidate_121.CHECKS}
    try:
        inventory,units,ids,details=_expected(view,table)
        actor=view['actor']
        flags['opportunity_context_valid']=row.get('opportunity_context')=={
            'round':view['round'],'turn_player':actor,'actor':actor,'phase':'normal_action',
            'decision_kind':'normal_action','choice_kind':'normal_action'}
        flags['source_artifact_integrity_valid']=True
        flags['information_boundary_valid']=row.get('information_policy')=='public_and_owner_known_only' and \
            row.get('owner_state')==view['players'][actor] and \
            row.get('public_information')=={k:v for k,v in view['players'].items() if k!=actor} and \
            row.get('forbidden_information_used')==[]
        flags['required_source_families_present']=[x.get('family') for x in row.get('source_inventory',[])]==list(candidate_121.FAMILIES)
        flags['source_inventory_complete']=row.get('source_inventory')==inventory
        flags['candidate_templates_complete']=True
        actual=row.get('enumeration_units')
        if isinstance(actual,list):
            flags['information_boundary_valid']=flags['information_boundary_valid'] and len(actual)==len(units) and all(
                x.get('evidence')==y['evidence'] and x.get('source_references')==y['source_references']
                for x,y in zip(actual,units))
            flags['candidate_variants_complete']=[(x.get('source_family'),x.get('source_id'),x.get('action_type'),x.get('candidate_variant')) for x in actual]==[(x['source_family'],x['source_id'],x['action_type'],x['candidate_variant']) for x in units]
            flags['target_expansions_complete']=[(x.get('enumeration_unit_id'),x.get('target_instance_ids')) for x in actual]==[(x['enumeration_unit_id'],x['target_instance_ids']) for x in units]
            flags['canonical_predicates_resolved']=True
            flags['dispositions_and_reasons_valid']=actual==units
            flags['stable_candidate_ids_valid']=len(actual)==len(units) and all(x.get('candidate_id')==y['candidate_id'] for x,y in zip(actual,units))
        flags['legal_candidate_projection_exact']=row.get('legal_candidate_ids')==ids and row.get('legal_candidate_details')==details
    except (ValueError,KeyError,TypeError,IndexError):
        pass
    return flags


def audit_current(route: dict, table: dict, strict_usage: bool = False) -> dict:
    view=extension_127.extension_125.project(route)
    if strict_usage or route.get('events'):
        view['_verified_ability_uses']=_verified_recent_uses(route)
    else:
        view['_verified_ability_uses']={}
    inventory=[];units=[];ids=[];details=[];codes=[]
    try:
        inventory,units,ids,details=_expected(view,table)
    except ValueError as error:
        code=str(error).split(':',1)[0]
        if code not in candidate_121.STOPS:
            raise
        codes=[code]
    actor=view['actor']
    row={'opportunity_context':{'round':view['round'],'turn_player':actor,'actor':actor,
             'phase':view['phase'],'decision_kind':'normal_action','choice_kind':'normal_action'},
            'owner_state':view['players'][actor],
            'public_information':{k:v for k,v in view['players'].items() if k!=actor},
            'information_policy':'public_and_owner_known_only','source_inventory':inventory,
            'enumeration_units':units,'legal_candidate_ids':ids,'legal_candidate_details':details,
            'forbidden_information_used':[],'completeness_checks':{},'candidate_set_complete':False,
            'contract_stop_codes':codes}
    row['completeness_checks']=_checks(row,view,table)
    row['candidate_set_complete']=all(row['completeness_checks'].values()) and not codes
    return row





def compare_paid(route: dict, audit: dict, table: dict) -> dict:
    if audit!=audit_current(route,table) or not audit['candidate_set_complete']:
        raise ValueError('unproved complete candidate set')
    game=route['final_state']['game_state'];actor=game['turn_player'];owner=game['players'][actor]
    if game['phase']!='normal_action' or any(p['growth']>=100 for p in game['players'].values()) or \
            route['final_state']['pending_triggers'] or route['final_state']['activation_zone']:
        raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'earlier 107 priority'})
    scores={};uncertainty={}
    for item in audit['legal_candidate_details']:
        cid=item['candidate_id'];action=item['action_type'];cost=0;effect=None
        if action=='pass':pass
        elif action=='activate_companion_ability':
            raise restart_122.RulesStop('missing_next_normal_action_choice_proof',
                {'criterion':'active board activation not yet selected','candidate_id':cid})
        elif action in ('place_companion','place_partner'):
            raise restart_122.RulesStop('missing_next_normal_action_choice_proof',
                {'criterion':'free placement needs 116 proof'})
        else:
            cost,effect=prior_131._paid_cost(item,game,owner,table)
            if effect is not None:uncertainty[cid]={'source_card_id':item['card_id'],**effect,
                                                    'certain_growth_difference':0}
        scores[cid]={'candidate_id':cid,'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,
            'certain_growth_difference':0,'time_after_certain_resolution':owner['time']-cost,
            'payment_time':cost,'consumed_card_count':0,'card_copy_id':item.get('source_instance_id') or '',
            'value_comparison_to':{}}
    if 'pass' not in scores or len(scores)<2:raise ValueError('no comparable paid candidates')
    comparisons={cid:hardening_114.compare_candidates(scores['pass'],score)
                 for cid,score in scores.items() if cid!='pass'}
    if any(x['winner']!='left' or x['decided_at']!='time_after_certain_resolution' for x in comparisons.values()):
        raise restart_122.RulesStop('missing_next_normal_action_choice_proof',{'criterion':'107/114 time order'})
    return {'decision_kind':'normal_action','resolution_mode':'priority_unique',
            'strategic_unresolved':False,'reason_code':'time_balance',
            'legal_candidates':copy.deepcopy(audit['legal_candidate_ids']),
            'legal_candidate_details':copy.deepcopy(audit['legal_candidate_details']),
            'candidate_set_complete':True,
            'candidate_set_evidence':{'source_ref':'132.current_state_rederivation',
                'state_ref':route['game_state_sha256'],'enumeration_rule':'all current-state units rederived'},
            'selected_candidate':'pass','selected_action':copy.deepcopy(next(x for x in audit['legal_candidate_details']
                                                                             if x['candidate_id']=='pass')),
            'runner_up_candidates':[x for x in audit['legal_candidate_ids'] if x!='pass'],
            'seed_context':None,'priority_basis':{'source_contracts':[107,114],
                'scores':scores,'pairwise':comparisons,'conditional_uncertainty':uncertainty},'seed_proof':None}


@contextmanager
def active_board_provenance_scope():
    registry=extension_128.BOARD_CLASSIFICATION
    original={card:registry.get(card) for card in ACTIVE_BOARD}
    try:
        for card,ability in ACTIVE_BOARD.items():
            if original[card] is not None and original[card]!=ability:
                raise ValueError('active board classification conflict')
            registry[card]=ability
        yield
    finally:
        for card,entry in original.items():
            if entry is None:registry.pop(card,None)
            else:registry[card]=entry


def audit_turn_end_from_history(path: str, source: dict, prior: dict, current: dict,
                                events: list[dict], snapshots: list[dict]) -> dict:
    if source['snapshots'][-1]!=snapshots[0]:raise ValueError('131/132 event boundary differs')
    joined_events=copy.deepcopy(source['events'])+copy.deepcopy(events)
    joined_snapshots=copy.deepcopy(source['snapshots'])+copy.deepcopy(snapshots[1:])
    with active_board_provenance_scope():
        return prior_131.audit_turn_end_from_history(path,prior['stops'][path],prior['source_130'],
                                                     current,joined_events,joined_snapshots)


@contextmanager
def mixed_audit_scope():
    original=prior_131.audit_current
    try:
        prior_131.audit_current=audit_current
        yield
    finally:
        prior_131.audit_current=original


def compare_current(route: dict, audit: dict, table: dict) -> dict:
    if any(x['action_type'] in ('place_companion','place_partner') for x in audit['legal_candidate_details']):
        with mixed_audit_scope():return prior_131.compare_mixed(route,audit,table)
    return compare_paid(route,audit,table)

def _run_route(path: str, inputs: dict) -> dict:
    source=inputs['stops'][path]
    if source['path_id']!=path or \
            response_120.game_state_sha256(source['final_state']['game_state'])!=source['game_state_sha256'] or \
            response_120.continuation_state_sha256(response_120._continuation_payload(source['final_state']))!=source['continuation_state_sha256']:
        raise ValueError('131 source state hash differs')
    current=copy.deepcopy(source['final_state'])
    snapshots=[{'seq':source['last_valid_event_seq'],'game_state_sha256':source['game_state_sha256'],
                'continuation_state_sha256':source['continuation_state_sha256']}]
    audits=[];decisions=[];events=[];reason=None
    for _ in range(64):
        try:
            game=current['game_state'];route=extension_127._current_route(path,current)
            route['events']=copy.deepcopy(source['events']+events)
            route['source_game_state_sha256']=source['source_game_state_sha256']
            route['source_continuation_state_sha256']=source['source_continuation_state_sha256']
            decision=None;audit=None
            if game['phase']=='normal_action':
                audit=audit_current(route,inputs['candidate_table'])
                audits.append(audit)
                if audit!=audit_current(route,inputs['candidate_table']):
                    raise ValueError('131 independent current candidate audit differs')
                if not audit['candidate_set_complete']:
                    raise restart_122.RulesStop('incomplete_legal_candidates',{
                        'contract_stop_codes':audit['contract_stop_codes']})
                if any(d['action_type'] in ('place_companion','place_partner') for d in audit['legal_candidate_details']):
                    decision=compare_current(route,audit,inputs['candidate_table'])
                    with prior_131.placement_scope():
                        after,generated=extension_125._apply_placement(current,decision)
                else:
                    decision=compare_current(route,audit,inputs['candidate_table'])
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
                if 'source_131' not in inputs:
                    raise restart_122.RulesStop('missing_current_turn_end_provenance',{
                        'phase':game['phase'],'last_valid_event_seq':current['last_event_seq']})
                proof=audit_turn_end_from_history(path,source,inputs['source_131'],current,events,snapshots)
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





def run_route(path: str, inputs: dict) -> dict:
    with active_board_provenance_scope():
        return _run_route(path,inputs)


def run_all(inputs: dict) -> dict:
    return {path:run_route(path,inputs) for path in SOURCE_SHA}

PLAN_FILE='proxy-board-active-plan-132-20260923.json'
EVALUATION_FILE='proxy-board-active-evaluation-132-20260923.json'
STOP_FOLDER='proxy-board-active-stops-132'
canonical_bytes=extension_128.canonical_bytes


def build_plan(outcomes: dict) -> dict:
    return {'schema':'naotocchi.card_game.proxy_board_active_plan.v1',
            'checkpoint':132,'protected_131_stop_raw_sha256':SOURCE_SHA,
            'source_contracts':[107,114,116,117,121,123,126,127,128,129,130,131],
            'active_board_registry':ACTIVE_BOARD,
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
                       'stop_file':f'{STOP_FOLDER}/stop-132-{path}.json'}
                      for path,row in outcomes.items()]}


def build_evaluation(plan: dict) -> dict:
    routes=plan['routes']
    return {'schema':'naotocchi.card_game.proxy_board_active_evaluation.v1',
            'checkpoint':132,'planned':len(routes),
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
    output.update({f'{STOP_FOLDER}/stop-132-{path}.json':canonical_bytes(row)
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
