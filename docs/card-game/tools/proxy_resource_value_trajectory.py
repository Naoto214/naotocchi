"""Opt-in paired executions from 135, with explicit unsupported boundaries.

Historical states are looked up by both hashes, never by round or route label.
A missing adapter stops before payment; it never becomes a policy lottery.
"""
import argparse
import copy
import json
from pathlib import Path
from contextlib import contextmanager
import proxy_independent_seed_probe as probe
import proxy_start_response_138 as start
import proxy_normal_action_candidate_completeness as candidates
import proxy_normal_action_seeded_restart as normal
import proxy_normal_action_extension as extension
import proxy_new_seed_normal_restart_147 as placements
import proxy_new_seed_normal_audit_140 as normal_audit
import proxy_new_seed_normal_audit_156 as partner
import proxy_new_seed_board_partner_audit_179 as goat
import proxy_new_seed_normal_trigger_audit_146 as triggered
import proxy_hit_blow_response_142 as hit
import proxy_reached_mixed_contracts_401 as reached
import proxy_resource_value_shadow as shadow
import proxy_reached_round_ten_405 as terminal
import proxy_new_seed_egg_replay_205 as egg
import proxy_new_seed_egg_restart_165 as first_r2_egg
import proxy_new_seed_next_response_restart_170 as coin_activation
import proxy_new_seed_current_restart_176 as coin_resolution
import proxy_new_seed_chain_resolution_155 as coin_outer_resolution
import proxy_new_seed_mixed_replay_404 as coin_chain_activation
import proxy_resource_value_response as reached_response
from proxy_resource_value_inputs import project_visible, validate_sources
from proxy_resource_value_selection import select_problem, validate_selection, canonical_sha256

DATA=shadow.DATA
INITIAL_SHA=start.SOURCE_RAW_SHA256
POLICIES=('legacy_107_114_116','resource_value_pilot_v1')
PLACEMENT_CLASSIFICATION_ALIASES={
    'C-cat_friend':{'optional_board_ability_no_placement_effect','own_turn_activated_ability_not_placement'},
    'C-chicken':{'future_turn_start_optional_no_placement_effect','turn_start_trigger_not_placement'},
}

def load_initial_routes(data_dir=DATA):
    data_dir=Path(data_dir);raw=(data_dir/start.SOURCE.name).read_bytes()
    import hashlib
    if hashlib.sha256(raw).hexdigest()!=INITIAL_SHA:raise ValueError('135 initial raw differs')
    source=json.loads(raw)
    manifest=probe.build_manifest(probe.load_source(data_dir))
    if manifest!=source['manifest']:raise ValueError('135 initial manifest differs')
    rows=shadow.load_observed_boundaries(data_dir)
    source_manifest={k:v for row in rows for k,v in row['source_raw_sha256'].items()}
    inputs=dict(candidate_table=json.loads((data_dir/'proxy-normal-decision-candidate-table-114-20260918.json').read_text()),
        boundaries=rows,source_raw_sha256=source_manifest,source_root=str(data_dir.parents[2].resolve()))
    historical_response_inventories,audit_manifest=_fresh_response_inventories(data_dir)
    inputs['historical_response_inventories']=historical_response_inventories
    inputs['response_audit_raw_sha256']=audit_manifest
    saved_events={};mandatory_seed_profiles={};response_seed_profiles={}
    for name in source_manifest:
        if not name.endswith('.json') or Path(name).parent!=Path('docs/card-game/data'):continue
        for row in json.loads((data_dir.parents[2]/name).read_text()).get('results',[]):
            ds=row.get('new_decisions',row.get('decisions',[]))
            for decision in ds if isinstance(ds,list) else []:
                ctx=decision.get('seed_context',{})
                if decision.get('decision_kind')=='response_action' and ctx:
                    key=(row['path_id'],decision.get('pre_game_state_sha256',decision.get('source_game_state_sha256')),decision.get('pre_continuation_state_sha256',decision.get('source_continuation_state_sha256')))
                    if key[1] is not None and key[2] is not None:
                        if key in response_seed_profiles and response_seed_profiles[key]!=ctx:raise ValueError('response seed profile alias differs')
                        response_seed_profiles[key]=copy.deepcopy(ctx)
                if decision.get('decision_kind')=='mandatory_choice' and ctx.get('choice_kind')=='egg_exchange_bottom':
                    key=(row['path_id'],ctx['actor'],ctx['round'])
                    index=ctx['actor_turn_index']
                    if key in mandatory_seed_profiles and mandatory_seed_profiles[key]!=index:raise ValueError('mandatory seed profile alias differs')
                    mandatory_seed_profiles[key]=index
            es=row.get('new_events',row.get('events',[]))
            for event in es if isinstance(es,list) else []:
                key=(row.get('path_id'),event['seq'])
                if key in saved_events and saved_events[key]!=event:raise ValueError('saved event alias differs')
                saved_events[key]=event
    results=[]
    for route in manifest['routes']:
        fresh=probe.run_route(route);saved=next(r for r in source['results'] if r['path_id']==route['path_id'])
        if fresh!=saved:raise ValueError('135 prefix differs from independent replay')
        start.verify_source_route(fresh)
        results.append(dict(path_id=route['path_id'],order_id=route['order_id'],first_player=route['first_player'],
            manifest=copy.deepcopy(route),initial_raw_sha256=INITIAL_SHA,initial_manifest_sha256=canonical_sha256(route),
            source_route=fresh,inputs=dict(inputs,path_id=route['path_id'],response_seed_profiles=[dict(game_state_sha256=gh,continuation_state_sha256=ch,seed_context=ctx) for (path,gh,ch),ctx in response_seed_profiles.items() if path==route['path_id']],mandatory_seed_profiles={str(round_)+':'+actor:index for (path,actor,round_),index in mandatory_seed_profiles.items() if path==route['path_id']},saved_events={seq:copy.deepcopy(e) for (path,seq),e in saved_events.items() if path==route['path_id']})))
    if len(results)!=4 or len({r['path_id'] for r in results})!=4:raise ValueError('four initial routes required')
    return results

# These four immutable stages used 120's pass transition. Subsequent
# saved stages use 138's empty-window adapter. This is a source-contract
# compatibility profile, shared by both policies, rather than a round rule.
LEGACY_PASS_SOURCES={
    'proxy-new-seed-response-restart-145-20260925.json',
    'proxy-new-seed-response-restart-148-20260925.json',
    'proxy-new-seed-response-restart-158-20260925.json',
    'proxy-new-seed-current-restart-176-20260925.json',
}

def _fresh_response_profiles(inputs,path_id):
    seeds={};legacy_passes=set();root=Path(inputs['source_root'])
    for name in inputs['source_raw_sha256']:
        if not name.endswith('.json') or Path(name).parent!=Path('docs/card-game/data'):continue
        for row in json.loads((root/name).read_text()).get('results',[]):
            if row.get('path_id')!=path_id:continue
            decisions=row.get('new_decisions',row.get('decisions',[]))
            for decision in decisions if isinstance(decisions,list) else []:
                ctx=decision.get('seed_context',{})
                if decision.get('decision_kind')!='response_action' or not ctx:continue
                key=(decision.get('pre_game_state_sha256',decision.get('source_game_state_sha256')),decision.get('pre_continuation_state_sha256',decision.get('source_continuation_state_sha256')))
                if None in key:continue
                if key in seeds and seeds[key]!=ctx:raise ValueError('response seed profile alias differs')
                seeds[key]=copy.deepcopy(ctx)
            if Path(name).name in LEGACY_PASS_SOURCES:
                events=row.get('new_events',row.get('events',[]))
                for event in events if isinstance(events,list) else []:
                    if event['action_type']=='response_pass':legacy_passes.add((event['game_state_before_sha256'],event['continuation_state_before_sha256']))
    return seeds,legacy_passes

def _fresh_empty_pass_boundaries(inputs,path_id):
    """227 explicitly used 138's empty-window pass, including end requests."""
    name='docs/card-game/data/proxy-new-seed-current-replay-227-20260925.json'
    import hashlib
    raw=(Path(inputs['source_root'])/name).read_bytes()
    if hashlib.sha256(raw).hexdigest()!=inputs['source_raw_sha256'][name]:
        raise ValueError('227 empty-pass source differs')
    boundaries=set()
    for row in json.loads(raw)['results']:
        if row['path_id']!=path_id:continue
        for event in row['new_events']:
            if event['action_type']=='response_pass':
                boundaries.add((event['game_state_before_sha256'],event['continuation_state_before_sha256']))
    return boundaries

def _fresh_mandatory_seed_profiles(initial):
    profiles={};inputs=initial['inputs'];root=Path(inputs['source_root'])
    for name in inputs['source_raw_sha256']:
        if not name.endswith('.json') or Path(name).parent!=Path('docs/card-game/data'):continue
        for row in json.loads((root/name).read_text()).get('results',[]):
            if row.get('path_id')!=initial['path_id']:continue
            decisions=row.get('new_decisions',row.get('decisions',[]))
            for decision in decisions if isinstance(decisions,list) else []:
                ctx=decision.get('seed_context',{})
                if decision.get('decision_kind')!='mandatory_choice' or ctx.get('choice_kind')!='egg_exchange_bottom':continue
                key=str(ctx['round'])+':'+ctx['actor'];index=ctx['actor_turn_index']
                if key in profiles and profiles[key]!=index:raise ValueError('mandatory seed profile alias differs')
                profiles[key]=index
    return profiles

def _fresh_response_inventories(data_dir):
    """Bind historical response inventories without reusing their choices."""
    import hashlib
    data_dir=Path(data_dir);root=data_dir.parents[2]
    raw=(data_dir/'proxy-verification-410-20261001/protected-data-baseline.json').read_bytes()
    if hashlib.sha256(raw).hexdigest()!='917de46a9babf5cdd717618bcef64b2af63c3f3f16a19c296a709da72f519e3a':raise ValueError('protected baseline manifest differs')
    proofs=[];manifest={}
    for name,digest in json.loads(raw).items():
        if 'audit' not in Path(name).name:continue
        source=(root/name).read_bytes()
        if hashlib.sha256(source).hexdigest()!=digest:raise ValueError('response audit raw differs: '+name)
        rows=json.loads(source).get('results',[])
        if not isinstance(rows,list):continue
        for row in rows:
            if not isinstance(row,dict) or row.get('next_opportunity') not in ('response_window','post_placement_response','turn_end_response'):continue
            if row.get('candidate_set_complete') is not True or not isinstance(row.get('candidate_ids'),list):continue
            if not all(row.get(k) for k in ('path_id','source_game_state_sha256','source_continuation_state_sha256')):continue
            proofs.append(dict(path_id=row['path_id'],game_state_sha256=row['source_game_state_sha256'],
                continuation_state_sha256=row['source_continuation_state_sha256'],candidate_ids=sorted(row['candidate_ids']),source_ref=name))
            manifest[name]=digest
    return proofs,manifest

def _current(payload,seq):
    state=copy.deepcopy(payload);state.update(source_event_seq=seq,last_event_seq=seq,
        source_game_state_sha256=start.opening._stop_state_sha256(state['game_state']))
    state['continuation_state_sha256']=start._hash(state)
    return state

def find_boundary(continuation,boundaries):
    gh=start.opening._stop_state_sha256(continuation['game_state']);ch=start._hash(continuation)
    matches=[b for b in boundaries if b['decision'].get('pre_game_state_sha256',b['decision'].get('source_game_state_sha256'))==gh and
        b['decision'].get('pre_continuation_state_sha256',b['decision'].get('source_continuation_state_sha256'))==ch]
    if len(matches)>1:raise ValueError('ambiguous exact source boundary')
    return copy.deepcopy(matches[0]) if matches else None

@contextmanager
def normal_board_scope(table):
    """133 already proves this source is an end trigger, not a normal action."""
    import proxy_cross_restart_133 as end_trigger
    registry=candidates.BOARD_ABILITY_REGISTRY;card='P-desert_scorpion'
    classified=end_trigger.classify_end_trigger(card,table);previous=registry.get(card)
    if previous is not None and previous!=classified:raise ValueError('normal board classification conflict')
    registry[card]=classified
    try:yield
    finally:
        if previous is None:registry.pop(card,None)
        else:registry[card]=previous

def audit_opportunity(continuation,public_history):
    table=json.loads((DATA/'proxy-normal-decision-candidate-table-114-20260918.json').read_text())
    with normal_board_scope(table):return _audit_opportunity(continuation,public_history)

def _audit_opportunity(continuation,public_history):
    table=json.loads((DATA/'proxy-normal-decision-candidate-table-114-20260918.json').read_text())
    game=continuation['game_state']
    audit=candidates.audit_current_normal_action(game,continuation,public_history,table)
    errors=candidates.validate_current_normal_action(audit,game,continuation,public_history,table)
    if errors:raise ValueError('fresh normal candidate validation differs: '+str(errors))
    if audit['candidate_set_complete']:return audit
    if any(p['board']['prepared'] for p in game['players'].values()):raise ValueError('hidden prepared legality adapter absent')
    view=candidates.project_normal_action_information(dict(game_state=game,actor=game['turn_player']),public_history)
    view['_verified_ability_uses']={}
    with partner.partner_response_scope(table),goat.partner_response_scope(table),triggered.trigger_scope(table):
        inventory,units,ids,details=normal_audit.board._expected(view,table)
        fresh=dict(opportunity_context=dict(round=game['round'],turn_player=game['turn_player'],actor=game['turn_player'],phase='normal_action',decision_kind='normal_action',choice_kind='normal_action'),
            owner_state=view['players'][game['turn_player']],public_information={p:v for p,v in view['players'].items() if p!=game['turn_player']},
            information_policy='public_and_owner_known_only',forbidden_information_used=[],source_inventory=inventory,enumeration_units=units,
            legal_candidate_ids=ids,legal_candidate_details=details)
        checks=normal_audit.board._checks(fresh,view,table)
        if not all(checks.values()):raise ValueError('extended twelve legality checks incomplete')
        return dict(fresh,candidate_set_complete=True,completeness_checks=checks,contract_stop_codes=[])

def _public_proof_key(state,actor,history):
    """Bind public comparison evidence without hidden identities or order.

    Full hashes remain the execution/replay identity. This separate key only
    establishes whether a previously verified *public* score proof applies.
    Fresh complete legality is checked again before reusing that proof.
    """
    game=state['game_state']
    return canonical_sha256(dict(view=project_visible(state,actor),actor=actor,
        round=game['round'],turn_player=game['turn_player'],phase=game['phase'],challenge=game.get('challenge'),
        flags={p:{k:v[k] for k in ('challenge_used','person_placed','relationship_progressed')} for p,v in game['players'].items()},
        public_counts={p:dict(hand=len(v['hand']),deck=len(v['deck'])) for p,v in game['players'].items()},
        context={k:v for k,v in start._payload(state).items() if k!='game_state'},last_event_seq=state['last_event_seq'],
        history={k:v for k,v in history.items() if k!='source_refs'}))

def _normal_evidence_boundary(state,inputs,history):
    exact=find_boundary(state,inputs['boundaries'])
    if exact is not None:
        if _public_proof_key(state,exact['actor'],history)!=_public_proof_key(_current(exact['continuation'],exact['event_seq']),exact['actor'],exact['public_history']):
            raise ValueError('exact comparison public history differs')
        shadow._verify_legal_inventory(exact)
        return exact
    audit=audit_opportunity(state,history);game=state['game_state'];actor=game['turn_player']
    key=_public_proof_key(state,actor,history)
    matches=[b for b in inputs['boundaries'] if b['path_id']==inputs['path_id'] and b['event_seq']==state['last_event_seq'] and b['actor']==actor
        and _public_proof_key(_current(b['continuation'],b['event_seq']),actor,b['public_history'])==key]
    if len(matches)>1:raise ValueError('ambiguous public comparison evidence')
    if matches:
        boundary=copy.deepcopy(matches[0]);shadow._verify_legal_inventory(boundary)
        # Older serializers omit enumeration metadata, but source/action/
        # variant/targets must bind to the independently regenerated action.
        fields=('candidate_id','action_type','candidate_variant','card_id','source_instance_id','target_instance_ids')
        def actions(details):return sorted(({k:d[k] for k in fields} for d in details),key=lambda d:d['candidate_id'])
        if actions(boundary['decision']['legal_candidate_details'])!=actions(audit['legal_candidate_details']):raise ValueError('public comparison evidence legal details differ')
        errors=validate_sources(boundary['source_raw_sha256'],Path(inputs['source_root']))
        if errors:raise ValueError('public comparison source evidence differs: '+str(errors))
        # Only publicly bound proof metadata is borrowed. Execution state and
        # hidden decks always remain the actual continuation supplied here.
        boundary['continuation']=start._payload(state);boundary['public_history']=copy.deepcopy(history)
        return boundary
    d=dict(legal_candidates=audit['legal_candidate_ids'],legal_candidate_details=audit['legal_candidate_details'],candidate_set_complete=True)
    return dict(path_id=inputs['path_id'],event_seq=state['last_event_seq'],actor=actor,continuation=start._payload(state),
        public_history=history,decision=d,decision_sha256=canonical_sha256(d),source_refs=history['source_refs'],
        source_raw_sha256=inputs['source_raw_sha256'],score_evidence=[])

def _normal_selection(state,initial,policy,history):
    boundary=_normal_evidence_boundary(state,initial['inputs'],history)
    problem=shadow._inputs(boundary)[0]
    details=boundary['decision']['legal_candidate_details']
    if policy==POLICIES[0]:
        old=shadow.legacy_select(boundary,problem)
        if boundary['decision'].get('selected_candidate') is not None:
            if any(old[k]!=boundary['decision'].get(k) for k in old):raise ValueError('legacy source reproduction differs')
            record=copy.deepcopy(boundary['decision'])
        else:
            record=dict(old,decision_kind='normal_action',candidate_set_complete=True,legal_candidates=problem['legal_candidate_ids'],
                legal_candidate_details=details,strategic_unresolved=old['seed_proof'] is not None)
        record['selected_action']=copy.deepcopy(next(x for x in details if x['candidate_id']==old['selected_candidate']))
    else:
        wrapper=select_problem(problem)
        record=dict(decision_kind='normal_action',policy_id=policy,selection=wrapper,problem=problem,
            selected_candidate=wrapper['selected_candidate'],candidate_set_complete=True,
            selected_action=copy.deepcopy(next(x for x in details if x['candidate_id']==wrapper['selected_candidate'])))
    return record

def _historical_response_opportunity(state,initial,events):
    """Reexecute a versioned source contract, never use a stored choice.

    The profile is bound to raw source bytes, both state hashes and the
    executed public event. It applies identically to either policy.
    """
    import hashlib
    source_ref='docs/card-game/data/proxy-new-seed-mixed-audit-318-20260927.json'
    gh=start.opening._stop_state_sha256(state['game_state']);ch=start._hash(state)
    matches=[p for p in initial['inputs']['historical_response_inventories'] if
        p['source_ref']==source_ref and p['path_id']==initial['path_id'] and
        p['game_state_sha256']==gh and p['continuation_state_sha256']==ch]
    if not matches:return None
    fresh,manifest=_fresh_response_inventories(DATA)
    if matches!=[p for p in fresh if p['source_ref']==source_ref and p['path_id']==initial['path_id'] and p['game_state_sha256']==gh and p['continuation_state_sha256']==ch]:
        raise ValueError('historical response profile inventory differs from protected source')
    if initial['inputs']['response_audit_raw_sha256'].get(source_ref)!=manifest[source_ref]:
        raise ValueError('historical response profile raw hash differs')
    import proxy_new_seed_mixed_audit_318 as profile
    raw=profile.states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=profile.SOURCE_RAW_SHA256:
        raise ValueError('historical response profile public history raw differs')
    source=next(r for r in json.loads(raw)['results'] if r['path_id']==initial['path_id'])
    public_events=source['new_events']
    if not public_events or events[-len(public_events):]!=public_events or (source['final_game_state_sha256'],source['final_continuation_state_sha256'])!=(gh,ch):
        raise ValueError('historical response profile executed public origin differs')
    row=dict(_row(state,initial['path_id']),new_events=copy.deepcopy(public_events))
    proof=profile.audit_response(row)
    if not proof['candidate_set_complete'] or any(proof['candidate_ids']!=p['candidate_ids'] for p in matches):
        raise ValueError('historical response profile independent candidates differ')
    if proof['candidate_ids']!=['response-pass']:
        raise ValueError('historical response profile detail adapter missing')
    actor=state['response_context']['priority_actor']
    return dict(actor=actor,response_context=copy.deepcopy(state['response_context']),
        legal_candidate_ids=proof['candidate_ids'],legal_candidate_details=[start.response.build_response_pass_detail()],
        candidate_set_complete=True,forbidden_information_used=[],
        inspected_information=start.response._information_snapshot(state['game_state'],actor),
        excluded_candidates=proof['hand_exclusions']+proof['hand_other_exclusions']+proof['board_exclusions'],
        source_references=['119-response-window-contract.md',source_ref])

def _response_opportunity(state,initial,events):
    profiled=_historical_response_opportunity(state,initial,events)
    if profiled is not None:return profiled
    return _generic_response_opportunity(state,initial,events)

def _generic_response_opportunity(state,initial,events):
    actor=state['response_context']['priority_actor'];ctx=state['response_context']
    if state['last_event_seq']==2 and ctx['window_kind']=='turn_start' and all(not p['board']['companions'] and p['board']['partner'] is None and
            not p['board']['prepared'] and p['board']['main'] is None for p in state['game_state']['players'].values()):
        return start.enumerate_opportunity(state,actor,start.load_candidate_rows())
    return reached_response.enumerate_opportunity(state,events)

def _activate_normal_coin(before,record):
    """06 normal declaration, reusing 170's payment/link implementation.

    Timing projection is internal to the execution adapter. The original
    normal selection, IDs and wrapper remain intact. Unknown board triggers
    stop before any payment; no hidden deck content is inspected.
    """
    game=before['game_state'];actor=game['turn_player'];action=record['selected_action']
    if game['phase']!='normal_action' or before['activation_zone'] or before['pending_triggers'] or game.get('challenge') is not None:
        raise ValueError('normal coin declaration boundary differs')
    for player in game['players'].values():
        board=player['board']
        if any(board[k] for k in ('main','companions','partner','world','prepared')) or player['reservations']:
            raise normal.RulesStop('legality_not_confirmed',dict(stage='normal_activation_trigger_or_cost_sources'))
    section=(DATA.parent/'06-action-chain-checkpoint.md').read_text()
    if 'すぐつかうは手札から発動領域へ置いて発動し、効果は後で解決する' not in section or '発動したプレイヤーがまず追加発動するか選べる' not in section:
        raise ValueError('normal quick-use declaration contract differs')
    source=action['source_instance_id'];entry=start.load_candidate_rows()[action['card_id']]
    template=next(x for x in entry['actions'] if x['action_type']=='use_item')
    detail=start._hand_detail(game,actor,source,entry,template)
    projected=copy.deepcopy(before);projected['game_state']['phase']='response_window'
    projected['response_context']=dict(source_phase='response_window',phase='response_window',window_kind='turn_start',
        origin_event_seq=before['last_event_seq']+1,turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],
        consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
    projected['return_target']='normal_action_opportunity';projected['continuation_state_sha256']=start._hash(projected)
    after,event=coin_activation.activate_quick_item(projected,dict(selected_candidate=detail['candidate_id'],selected_action=detail))
    after['response_context'].update(source_phase='normal_action',window_kind='after_normal_action',response_opportunity_index=1)
    after['continuation_state_sha256']=start._hash(after)
    event.update(action_type='use_item',selected_candidate=record['selected_candidate'],
        game_state_before_sha256=start.opening._stop_state_sha256(game),continuation_state_before_sha256=start._hash(before),
        game_state_after_sha256=start.opening._stop_state_sha256(after['game_state']),continuation_state_after_sha256=start._hash(after))
    return after,[event]

def apply_selected(continuation,selection,inputs):
    record=copy.deepcopy(selection)
    if 'selection' in record:
        errors=validate_selection(record['selection'],record['problem'])
        if errors or record['selection']['view_sha256']!=canonical_sha256(project_visible(continuation,continuation['game_state']['turn_player'])):
            raise ValueError('pilot wrapper/current visible boundary differs: '+str(errors))
        if record['selected_candidate']!=record['selection']['selected_candidate']:raise ValueError('pilot execution selection differs')
    action=record['selected_action'];kind=action['action_type']
    if action['candidate_id']!=record['selected_candidate']:raise ValueError('selected action differs')
    if continuation['game_state']['phase']=='normal_action' and kind in ('pass','play_main','place_companion','place_partner','place_world','attach_item','set_item','use_play','use_item','use_event'):
        exact=find_boundary(continuation,inputs['boundaries'])
        history=inputs.get('public_history',exact['public_history'] if exact is not None else None)
        if history is None:raise normal.RulesStop('legality_not_confirmed',dict(stage='execution_public_history'))
        boundary=_normal_evidence_boundary(continuation,inputs,history)
        inventory=boundary['decision']['legal_candidate_details']
        if 'selection' in record and record['problem']!=shadow._inputs(boundary)[0]:raise ValueError('pilot proof differs from public source reconstruction')
        if action not in inventory:raise ValueError('selected execution action not in independently regenerated inventory')
        if 'selection' in record and record['problem']['legal_candidate_ids']!=sorted(x['candidate_id'] for x in inventory):raise ValueError('pilot legal inventory differs at execution')
    try:
        if kind=='use_item' and action['card_id']=='I-c_coin2' and continuation['game_state']['phase']=='normal_action':
            return _activate_normal_coin(continuation,record)
        if kind in ('pass','play_main'):return normal.transition(continuation,record,inputs)
        if kind in ('place_companion','place_partner'):
            with placements.partner_placement_scope():return extension._apply_placement(continuation,record)
        if kind=='response_pass':
            boundary=(start.opening._stop_state_sha256(continuation['game_state']),start._hash(continuation))
            if boundary in inputs.get('legacy_empty_pass_boundaries',set()):
                after,event,_=start._pass(continuation,record['actor'])
                return after,[event]
            if continuation['return_target']=='turn_end' and continuation['response_context']['consecutive_passes']==1:
                row=dict(path_id=inputs['path_id'],last_valid_event_seq=continuation['last_event_seq'],
                    final_game_state_sha256=start.opening._stop_state_sha256(continuation['game_state']),
                    final_continuation_state_sha256=start._hash(continuation),final_continuation_state=start._payload(continuation))
                bound=reached.boundary(row)
                proof=dict(bound,next_opportunity='turn_end_response',candidate_ids=record['legal_candidate_ids'],candidate_set_complete=True)
                selected=dict(bound,candidate_ids=record['legal_candidate_ids'],selected_candidate=record['selected_candidate'],resolution_mode=record['resolution_mode'])
                result=reached.normal_pass.run_route(row,selected,proof)
                return _current(result['final_continuation_state'],result['last_valid_event_seq']),result['new_events']
            if continuation['response_context']['window_kind']=='turn_start':
                if continuation['activation_zone']:after,event=hit.pass_start_chain(continuation,record)
                else:
                    after,event,_=start._pass(continuation,record['actor'])
            elif continuation['game_state']['phase']=='post_placement_response':
                boundary=(start.opening._stop_state_sha256(continuation['game_state']),start._hash(continuation))
                if continuation['return_target'] is None or boundary in inputs.get('legacy_pass_boundaries',set()):after,event=normal.response_120.apply_response_pass(continuation,record)
                else:after,event,_=start._pass(continuation,record['actor'])
            else:after,event=normal.response_120.apply_response_pass(continuation,record)
            return after,[event]
        if kind=='activate_board_ability' and action['card_id']=='C-chicken':
            after,event=reached.activation.activate_board_ability(continuation,record,dict(candidate_ids=[action['candidate_id']],source_instance_id=action['source_instance_id']))
            return after,[event]
        if kind=='use_event' and action['card_id']=='E-first-date' and continuation['game_state']['phase']!='normal_action':
            if 'public_events' not in inputs:raise ValueError('first date execution public history absent')
            def validate_target(before,selected):
                opportunity=reached_response.enumerate_opportunity(before,inputs['public_events'])
                if selected not in opportunity['legal_candidate_details']:raise ValueError('first date execution public target differs')
            handler=hit._turn_start_transition if continuation['response_context']['window_kind']=='turn_start' else None
            after,event=start.seeded.activate_response_candidate(continuation,record,validate_target,transition_handler=handler)
            event['selected_candidate']=record['selected_candidate']
            event.pop('result',None)
            return after,[event]
        if kind=='use_item' and action['card_id']=='I-c_coin2' and continuation['response_context']['window_kind']=='turn_start' and continuation['game_state']['phase']=='response_window':
            if continuation['activation_zone']:after,event=coin_chain_activation.activate_quick_item(continuation,record)
            else:after,event=coin_activation.activate_quick_item(continuation,record,allow_prior_pass=True)
            return after,[event]
        if kind=='use_play' and action['card_id']=='G-hit-blow' and continuation['game_state']['phase']=='response_window':
            after,event=hit.activate(continuation,record,allow_building=True);return after,[event]
    except normal.RulesStop as error:
        code='unsupported_resolution_adapter' if error.code=='effect_resolution_not_defined' else error.code
        raise normal.RulesStop(code,error.evidence) from error
    raise normal.RulesStop('unsupported_resolution_adapter',dict(action_type=kind,source_references=action.get('source_references',[])))

def _snapshot(state):
    return dict(event_seq=state['last_event_seq'],game_state=copy.deepcopy(state['game_state']),game_state_sha256=start.opening._stop_state_sha256(state['game_state']),
        continuation_state=start._payload(state),continuation_state_sha256=start._hash(state))

def _verify_generated(before,after,events):
    extension._verify_extended_step(before,after,events)
    for event in events:event.pop('_snapshot_after',None)

def _source_event_shape(event,after,initial,policy):
    """119 result metadata is optional in historical stage serializers."""
    if policy!=POLICIES[0]:return event
    source=initial['inputs'].get('saved_events',{}).get(event['seq'])
    card=after['game_state']['cards'].get(event.get('source_instance_id'),{}).get('card_id')
    if event['action_type']=='place_companion' and source and card in PLACEMENT_CLASSIFICATION_ALIASES and event.get('source_reference')=='72-companion-26-card-text-draft.md#'+card:
        aliases=PLACEMENT_CLASSIFICATION_ALIASES[card]
        if event.get('effect_classification') in aliases and source.get('effect_classification') in aliases and (event['game_state_after_sha256'],event['continuation_state_after_sha256'])==(source['game_state_after_sha256'],source['continuation_state_after_sha256']):
            event['effect_classification']=source['effect_classification']
        return event
    if event['action_type']!='response_pass':return event
    # Only identical state hashes permit the historical serializer projection.
    source=initial['inputs'].get('saved_events',{}).get(event['seq'])
    if source and event['game_state_after_sha256']==source.get('game_state_after_sha256') and event['continuation_state_after_sha256']==source.get('continuation_state_after_sha256'):
        if 'result' not in source:event.pop('result',None)
        elif 'result' not in event:
            ctx=after['response_context'];event['result']={k:copy.deepcopy(ctx[k]) for k in ('priority_actor','consecutive_passes','chain_status')}
            event['result']['return_target']=after['return_target']
    return event

def _row(state,path_id):
    return dict(path_id=path_id,last_valid_event_seq=state['last_event_seq'],
        final_game_state_sha256=start.opening._stop_state_sha256(state['game_state']),
        final_continuation_state_sha256=start._hash(state),final_continuation_state=start._payload(state))

@contextmanager
def egg_partner_end_scope(state):
    """93 blocks new partner abilities while the owner has no main."""
    registry=reached.board_end.board.turn_end.BOARD_REGISTRY;card='P-desert_scorpion'
    owners=[actor for actor,player in state['game_state']['players'].items()
        if player['board']['partner'] is not None and state['game_state']['cards'][player['board']['partner']]['card_id']==card]
    if not owners:yield;return
    if any(state['game_state']['players'][actor]['board']['main'] is not None for actor in owners):
        raise ValueError('active scorpion end trigger requires separate proof')
    import proxy_cross_restart_133 as end_trigger
    end_trigger.classify_end_trigger(card,json.loads((DATA/'proxy-normal-decision-candidate-table-114-20260918.json').read_text()))
    text=(DATA.parent/'93-cross-type-boundary-audit.md').read_text()
    if 'たまご中は新規発動・継続効果・発動しない修正を止める' not in text:raise ValueError('egg partner suppression contract differs')
    addition=('partner_ability_blocked_while_egg','93-cross-type-boundary-audit.md#V02')
    old=registry.get(card)
    if old is not None and old!=addition:raise ValueError('egg partner end registry conflict')
    registry[card]=addition
    try:yield
    finally:
        if old is None:registry.pop(card,None)
        else:registry[card]=old

@contextmanager
def end_only_partner_start_scope():
    """Keep the actual partner; exclude only its nonexistent start trigger."""
    original=reached.ORIGINAL_CLASSIFY
    def classify(game,actor):
        board=game['players'][actor]['board'];instance=board['partner']
        if instance is None or game['cards'][instance]['card_id']!='P-desert_scorpion':return original(game,actor)
        import proxy_cross_restart_133 as end_trigger
        end_trigger.classify_end_trigger('P-desert_scorpion',json.loads((DATA/'proxy-normal-decision-candidate-table-114-20260918.json').read_text()))
        text=reached.hand.source_section('74-partner-18-card-text-draft.md','P-desert_scorpion')
        if '自分のターン終了時' not in text or '自分のターン開始時' in text:raise ValueError('scorpion start timing differs')
        projected=copy.deepcopy(game);projected['players'][actor]['board'].update(partner=None,partner_stage=None)
        return original(projected,actor)+[dict(source_instance_id=instance,card_id='P-desert_scorpion',trigger_kind='own_turn_end_not_turn_start',source_reference='74-partner-18-card-text-draft.md#P-desert_scorpion')]
    reached.ORIGINAL_CLASSIFY=classify
    try:yield
    finally:reached.ORIGINAL_CLASSIFY=original

END_STAGE_INVENTORY_ADAPTER=None

def _end_transition(state,path_id,events,shots):
    """Reclassify executed history through 124, then use the existing end adapter."""
    row=_row(state,path_id)
    stop=dict(path_id=path_id,last_valid_event_seq=state['last_event_seq'],
        game_state_sha256=row['final_game_state_sha256'],continuation_state_sha256=row['final_continuation_state_sha256'],
        game_state=state['game_state'],continuation_state=start._payload(state))
    registry=copy.deepcopy(reached.provenance.TEXT_REGISTRY)
    registry['turn_end_completed']=dict(growth_delta=0,duration='none',reference='64-turn-boundaries-and-victory-timing.md')
    with placements.partner_placement_scope(),reached.end_board_scope(),egg_partner_end_scope(state),end_only_partner_start_scope():
        for event in events:
            if event['action_type'] in ('place_companion','place_partner'):
                card=state['game_state']['cards'][event['source_instance_id']]['card_id']
                known=extension.PLACEMENT_TEXT.get(card)
                classification=event.get('effect_classification')
                if known and card in PLACEMENT_CLASSIFICATION_ALIASES and classification in PLACEMENT_CLASSIFICATION_ALIASES[card] and known[1] in PLACEMENT_CLASSIFICATION_ALIASES[card]:classification=known[1]
                if known is None or (event.get('source_reference'),classification)!=known:
                    raise ValueError('executed placement provenance differs')
                registry.setdefault(event['action_type'],{})[card]=dict(growth_delta=0,duration='none',reference=known[0])
        if len(shots)!=len(events)+1 or [e['seq'] for e in events]!=list(range(1,state['last_event_seq']+1)):
            raise ValueError('executed provenance event/snapshot coverage differs')
        proof=dict(classified_events=[],growth_trace=[dict(event_seq=0,growth={p:shots[0]['game_state']['players'][p]['growth'] for p in 'AB'})],
            growth_reach_100=[],active_expiring_effects=[],unresolved_codes=[],source_event_seq=state['last_event_seq'])
        for event,before,after in zip(events,shots,shots[1:]):
            rules=copy.deepcopy(registry);kind=event['action_type'];instance=event.get('source_instance_id')
            card=state['game_state']['cards'][instance]['card_id'] if instance is not None else None
            refs={'G-hit-blow':'87-play-batch-5-card-text-draft.md#G-hit-blow','I-c_coin2':'77-current-items-card-text-draft.md#I-c_coin2','C-chicken':'72-companion-26-card-text-draft.md#C-chicken'}
            if (kind=='activate_response' and card in refs) or (kind=='use_item' and card=='I-c_coin2'):
                rules.setdefault(kind,{})[card]=dict(growth_delta=0,duration='activation_until_resolution',reference=refs[card])
            elif (kind,card) in (('resolve_play','G-hit-blow'),('resolve_item','I-c_coin2')):
                result=event['result'];delta=result['growth_added']
                if type(delta) is not int or delta not in (0,5):raise ValueError('known public resolution growth invalid')
                matched=result['declaration_matched'] if kind=='resolve_play' else result['revealed_card_type']=='main'
                if delta!=(5 if matched else 0):raise ValueError('known public resolution category/growth differs')
                rules.setdefault(kind,{})[card]=dict(growth_delta=delta,duration='none',reference=refs[card])
            elif kind=='resolve_board_ability' and card=='C-chicken':
                rules.setdefault(kind,{})[card]=dict(growth_delta=0,duration='none',reference=refs[card])
            segment=dict(events=[event],snapshots=[dict(seq=x['event_seq'],state=x['game_state']) for x in (before,after)],
                stop=dict(game_state=after['game_state'],last_valid_event_seq=event['seq']))
            derived=reached.provenance.derive_provenance(segment,rules)
            proof['classified_events'].extend(derived['classified_events']);proof['growth_trace'].extend(derived['growth_trace'][1:])
            for key in ('growth_reach_100','active_expiring_effects','unresolved_codes'):proof[key].extend(derived[key])
        proof['unresolved_codes']=sorted(set(proof['unresolved_codes']))
        audit=terminal.audit_current_turn_end(stop,proof)
        if not audit['turn_end_set_complete'] or audit['contract_stop_codes']:
            raise ValueError('fresh six-stage end proof incomplete: '+repr(dict(codes=audit['contract_stop_codes'],unresolved=proof['unresolved_codes'])))
        if END_STAGE_INVENTORY_ADAPTER is None:
            for stage in audit['stage_inventory']:
                for unit in stage.get('units',[]):
                    if unit.get('card_id')=='P-desert_scorpion':
                        unit['evidence']['predicate']='partner_ability_blocked_while_egg'
                        unit['evidence']['owner.board.main']=None
        else:audit=END_STAGE_INVENTORY_ADAPTER(row,audit,proof)
        bound=dict(reached.boundary(row),next_opportunity='turn_end',turn_end_set_complete=True,
            stage_inventory=audit['stage_inventory'],completeness_checks=audit['completeness_checks'],contract_stop_codes=[],
            classified_events=proof['classified_events'],growth_trace=proof['growth_trace'])
        return terminal.replay_end(row,bound)

def run_route(initial,policy_id):
    if policy_id not in POLICIES:raise ValueError('unknown opt-in policy')
    if initial['initial_raw_sha256']!=INITIAL_SHA or canonical_sha256(initial['manifest'])!=initial['initial_manifest_sha256']:
        raise ValueError('initial identity differs')
    errors=validate_sources(initial['inputs']['source_raw_sha256'],Path(initial['inputs']['source_root']))
    if errors:raise ValueError('; '.join(errors))
    if initial['inputs']['mandatory_seed_profiles']!=_fresh_mandatory_seed_profiles(initial):raise ValueError('mandatory seed profiles differ from fresh sources')
    seeds,legacy_passes=_fresh_response_profiles(initial['inputs'],initial['path_id'])
    expected_profiles=[dict(game_state_sha256=g,continuation_state_sha256=c,seed_context=ctx) for (g,c),ctx in seeds.items()]
    if sorted(initial['inputs']['response_seed_profiles'],key=canonical_sha256)!=sorted(expected_profiles,key=canonical_sha256):raise ValueError('response seed profiles differ from fresh sources')
    response_inventories,audit_manifest=_fresh_response_inventories(DATA)
    if initial['inputs']['historical_response_inventories']!=response_inventories or initial['inputs']['response_audit_raw_sha256']!=audit_manifest:raise ValueError('response inventories differ from fresh protected sources')
    execution_inputs=dict(initial['inputs'],legacy_pass_boundaries=legacy_passes,legacy_empty_pass_boundaries=_fresh_empty_pass_boundaries(initial['inputs'],initial['path_id']))
    source_root=Path(initial['inputs']['source_root'])
    import hashlib
    initial_raw=(source_root/'docs/card-game/data'/start.SOURCE.name).read_bytes()
    if hashlib.sha256(initial_raw).hexdigest()!=INITIAL_SHA:raise ValueError('fresh initial raw differs')
    manifest_routes=json.loads(initial_raw)['manifest']['routes']
    official=next((r for r in manifest_routes if r['path_id']==initial['path_id']),None)
    if official!=initial['manifest'] or initial['first_player']!=official['first_player'] or initial['order_id']!=official['order_id']:
        raise ValueError('initial manifest is not one of the signed 135 routes')
    prefix=probe.run_route(initial['manifest'])
    if prefix!=initial['source_route']:raise ValueError('initial prefix differs from independent replay')
    state=start.build_resume_state(prefix);events=copy.deepcopy(prefix['events']);decisions=copy.deepcopy(prefix['decisions'])
    shots=[]
    for shot in prefix['snapshots']:
        game=copy.deepcopy(shot['state']);game['cards']=copy.deepcopy(prefix['final_state']['cards'])
        shots.append(dict(event_seq=shot['seq'],game_state=game,game_state_sha256=shot['state_sha256'],continuation_state=None,continuation_state_sha256=None))
    shots[-1]=_snapshot(state);reason=None;stop_evidence=None;completion=None
    for _ in range(512):
        game=state['game_state'];phase=game['phase'];context=state['response_context']
        if game['round']>10:raise ValueError('R11 forbidden')
        try:
            handler_result=None
            if phase=='turn_end':
                try:handler_result=_end_transition(state,initial['path_id'],events,shots)
                except (ValueError,KeyError,TypeError) as error:raise normal.RulesStop('legality_not_confirmed',dict(stage='turn_end_provenance',detail=str(error))) from error
                after=_current(handler_result['final_continuation_state'],handler_result['last_valid_event_seq'])
                generated=handler_result['new_events'];record=None
            elif phase=='egg_exchange_choice':
                index=initial['inputs']['mandatory_seed_profiles'].get(str(game['round'])+':'+game['turn_player'])
                if index is None:raise normal.RulesStop('legality_not_confirmed',dict(stage='mandatory_seed_profile'))
                if index not in (1,game['round']):raise normal.RulesStop('unsupported_resolution_adapter',dict(stage='mandatory_seed_profile',actor_turn_index=index))
                egg_handler=first_r2_egg if index==1 and game['round']<=2 else egg
                handler_result=egg_handler.run_route(_row(state,initial['path_id']))
                after=_current(handler_result['final_continuation_state'],handler_result['last_valid_event_seq'])
                generated=handler_result['new_events'];record=None
            elif context['chain_status']=='resolving':
                if not state['activation_zone']:raise normal.RulesStop('unsupported_resolution_adapter',dict(stage='chain_resolution'))
                link=state['activation_zone'][-1];card=link['card_id']
                if card=='G-hit-blow':after,event=hit.resolve_link(state,allow_outer_links=True)
                elif card=='C-chicken' and len(state['activation_zone'])==1:after,event=reached.resolution.resolve_board_ability(state)
                elif card=='I-c_coin2':
                    if len(state['activation_zone'])==2:after,event=coin_outer_resolution.resolve_item(state)
                    elif len(state['activation_zone'])==1:after,event=coin_resolution.resolve_item(state,dict(chain_link_id=link['link_id'],source_instance_id=link['source_instance_id']))
                    else:raise normal.RulesStop('unsupported_resolution_adapter',dict(stage='coin_resolution_outer_links'))
                elif card=='E-first-date' and len(state['activation_zone'])==1:
                    after,generated=start.seeded.resolve_chain(state,{})
                    if len(generated)!=1:raise ValueError('first date single-link event coverage differs')
                    event=generated[0]
                else:raise normal.RulesStop('unsupported_resolution_adapter',dict(stage='chain_resolution',card_id=card))
                generated=[event];record=None
            elif phase=='normal_action':
                history=dict(normal_challenge_losses_by_actor=[],last_valid_event_seq=state['last_event_seq'],source_refs=sorted(initial['inputs']['source_raw_sha256']))
                if any('challenge' in e['action_type'] for e in events):raise normal.RulesStop('legality_not_confirmed',dict(stage='challenge_history_adapter'))
                try:record=_normal_selection(state,initial,policy_id,history)
                except (ValueError,KeyError,TypeError) as error:raise normal.RulesStop('legality_not_confirmed',dict(stage='normal_candidate_or_comparison_proof',detail=str(error))) from error
                after,generated=apply_selected(state,record,dict(execution_inputs,public_history=history))
            elif phase in ('response_window','post_placement_response','turn_end_response'):
                try:opportunity=_response_opportunity(state,initial,events)
                except (ValueError,KeyError,TypeError) as error:raise normal.RulesStop('legality_not_confirmed',dict(stage='response_inventory',detail=str(error))) from error
                gh=start.opening._stop_state_sha256(game);ch=start._hash(state)
                saved_inventories=[p for p in response_inventories if p['path_id']==initial['path_id'] and p['game_state_sha256']==gh and p['continuation_state_sha256']==ch]
                if any(p['candidate_ids']!=sorted(opportunity['legal_candidate_ids']) for p in saved_inventories):
                    trigger_event=next((e for e in events if e['seq']==context['origin_event_seq']),None)
                    if trigger_event is None:raise ValueError('response origin event absent from executed history')
                    raise normal.RulesStop('legality_not_confirmed',dict(stage='historical_response_inventory_scope',
                        fresh_candidate_ids=opportunity['legal_candidate_ids'],historical_inventories=saved_inventories,
                        trigger_event={k:trigger_event[k] for k in ('seq','action_type','actor')},
                        window_kind=context['window_kind'],response_opportunity_index=context['response_opportunity_index'],
                        source_contract_refs=['144-board-trigger-response-audit.md','318-new-seed-mixed-audit.md']))
                profiles=[p['seed_context'] for p in initial['inputs']['response_seed_profiles'] if p['game_state_sha256']==gh and p['continuation_state_sha256']==ch]
                if len(profiles)>1:raise ValueError('response seed source boundary ambiguous')
                index=profiles[0]['actor_turn_index'] if profiles else game['round']
                record=start.seeded.resolve_response_choice(dict(order_id=initial['order_id'],actor_turn_index=index,round=game['round']),opportunity)
                record.update(event_seq=state['last_event_seq'],pre_game_state_sha256=start.opening._stop_state_sha256(game),pre_continuation_state_sha256=start._hash(state))
                after,generated=apply_selected(state,record,dict(execution_inputs,public_events=events))
            else:
                raise normal.RulesStop('unsupported_resolution_adapter',dict(stage=phase,source_references=['123-turn-end-source-inventory.md','124-turn-end-provenance-restart.md']))
            if handler_result is not None:
                generated_shots=handler_result.get('new_snapshots',[])
                if not generated_shots and len(generated)==1:generated_shots=[_snapshot(after)]
                checked=dict(handler_result,new_snapshots=generated_shots)
                reached.validate_chain(_row(state,initial['path_id']),checked)
                if len(generated)!=len(generated_shots):raise ValueError('handler event/snapshot coverage differs')
                current=state
                for event,shot in zip(generated,generated_shots):
                    intermediate=_current(shot['continuation_state'],shot['event_seq'])
                    _verify_generated(current,intermediate,[event])
                    events.append(_source_event_shape(copy.deepcopy(event),intermediate,initial,policy_id))
                    shots.append(_snapshot(intermediate));current=intermediate
                if start._payload(current)!=start._payload(after):raise ValueError('handler final snapshot differs')
                decisions.extend(copy.deepcopy(handler_result.get('new_decisions',[])))
                state=after
                if handler_result.get('completed'):
                    completion=copy.deepcopy(handler_result['result']);reason=handler_result['stop_reason_code'];break
            else:
                _verify_generated(state,after,generated)
                if len(generated)!=1:raise ValueError('multi-event handler needs snapshots for each event')
                if record is not None:decisions.append(copy.deepcopy(record))
                events.extend(_source_event_shape(copy.deepcopy(e),after,initial,policy_id) for e in generated);shots.append(_snapshot(after));state=after
        except normal.RulesStop as error:
            reason=error.code;stop_evidence=copy.deepcopy(error.evidence);break
    else:raise ValueError('finite route bound exceeded')
    return dict(schema='naotocchi.card_game.resource_value_trajectory.v1',run_id=policy_id+':'+initial['path_id'],policy_id=policy_id,path_id=initial['path_id'],
        initial_raw_sha256=INITIAL_SHA,initial_manifest_sha256=initial['initial_manifest_sha256'],completed=completion is not None,status='completed' if completion is not None else 'stopped',
        result=completion or dict(winner=None,growth={p:state['game_state']['players'][p]['growth'] for p in 'AB'}),stop_reason_code=reason,stop_evidence=stop_evidence,
        last_valid_event_seq=state['last_event_seq'],final_game_state_sha256=start.opening._stop_state_sha256(state['game_state']),final_continuation_state_sha256=start._hash(state),
        final_continuation_state=start._payload(state),events=events,snapshots=shots,decisions=decisions,independent_balance_sample_count=0)

def validate_route(result,initial,policy_id):
    try:
        replay=run_route(initial,policy_id)
        return [] if replay==result else ['route differs from independent initial/choice/transition replay']
    except (ValueError,KeyError,TypeError,normal.RulesStop) as error:return [str(error)]

def compare_legacy_prefix(result,initial):
    """Compare reached canonical events/states; stopped suffixes remain missing."""
    decisions,shots=shadow.load_history(DATA,shadow.source_manifest(DATA));saved_events={}
    for name in shadow.source_manifest(DATA):
        for row in json.loads((shadow.ROOT/name).read_text()).get('results',[]):
            if row.get('path_id')!=initial['path_id']:continue
            es=row.get('new_events',row.get('events',[]))
            for event in es if isinstance(es,list) else []:saved_events[event['seq']]=event
    errors=[]
    for event in result['events']:
        if event!=saved_events[event['seq']]:errors.append('historical event differs: '+str(event['seq']))
    for shot in result['snapshots']:
        prior=shots[initial['path_id']][shot['event_seq']]
        if shot['game_state_sha256']!=prior['game_state_sha256'] or (shot['continuation_state'] is not None and shot['continuation_state']!=prior['continuation_state']):errors.append('historical snapshot differs: '+str(shot['event_seq']))
    saved_decisions=decisions[initial['path_id']]
    for d in result['decisions']:
        if canonical_sha256(d) not in saved_decisions and d.get('decision_kind')=='normal_action':errors.append('historical normal decision differs')
    return errors

def run_paired(data_dir,output_dir):
    initials=load_initial_routes(data_dir);results=[]
    for initial in initials:
        for policy in POLICIES:
            result=run_route(initial,policy);errors=validate_route(result,initial,policy)
            if errors:raise ValueError('; '.join(errors))
            result['legacy_prefix_validation']=compare_legacy_prefix(result,initial) if policy==POLICIES[0] else None
            results.append(result)
    report=dict(schema='naotocchi.card_game.resource_value_paired.v1',planned=8,planned_ids=sorted(r['run_id'] for r in results),results=results,
        completed=sum(r['completed'] for r in results),stopped=sum(not r['completed'] for r in results),not_executed=0,policy_promoted=False,independent_balance_sample_count=0)
    output_dir=Path(output_dir);output_dir.mkdir(parents=True,exist_ok=True)
    (output_dir/'paired.json').write_text(json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n')
    return report

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--data-dir',type=Path,default=DATA);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();report=run_paired(args.data_dir,args.output);print(json.dumps({k:report[k] for k in ('planned','completed','stopped','not_executed')}))
if __name__=='__main__':main()
