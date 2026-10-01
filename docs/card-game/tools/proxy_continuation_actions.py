"""Shared atomic equipment placement and explicit legacy handler boundaries."""
import copy
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_continuation_candidates as candidates
import proxy_resource_value_trajectory as old


def bind_event(before, after, event):
    state.validate(before);state.validate(after)
    if after['event_seq']!=before['event_seq']+1 or event['seq']!=after['event_seq']:
        raise ValueError('nonconsecutive envelope transition')
    result=copy.deepcopy(event)
    result.update(execution_contract_id=state.CONTRACT,
        envelope_before_sha256=state.state_hash(before),envelope_after_sha256=state.state_hash(after))
    return result


def _placement_window(after, actor):
    seq=after['event_seq'];c=after['legacy_continuation']
    c['game_state']['phase']='post_placement_response';c['return_target']='normal_action'
    c['response_context']=dict(source_phase='post_placement_response',phase='response_window',
        window_kind='after_normal_action',origin_event_seq=seq,turn_player=actor,priority_actor=actor,
        chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,
        decision_kind='response_action',choice_kind='reaction_or_pass')


def attach(envelope, action):
    inventory=candidates.audit(envelope,[])
    if action not in inventory['legal_candidate_details'] or action['action_type']!='attach_item':
        raise ValueError('attachment action differs from current legal inventory')
    game=envelope['legacy_continuation']['game_state'];actor=game['turn_player'];p=game['players'][actor]
    # A world may react to card plays. Do not erase it to manufacture a proof.
    if any(player['board']['world'] for player in game['players'].values()):
        raise ValueError('equipment placement world triggers not certified')
    capability=rules.classification(action['card_id'])
    if capability['timing'] not in ('own_turn_start','companion_departure'):
        raise ValueError('equipment placement trigger classification unavailable')
    if envelope['legacy_continuation']['activation_zone'] or envelope['legacy_continuation']['pending_triggers']:
        raise ValueError('pending effects forbid placement')
    source=action['source_instance_id'];targets=action['target_instance_ids'];cost=action['evidence']['payment_time']
    if len(targets)!=1 or len(p['board']['prepared'])>=3 or p['time']<cost:raise ValueError('attachment preconditions differ')
    after=copy.deepcopy(envelope);after['event_seq']+=1
    owner=after['legacy_continuation']['game_state']['players'][actor]
    owner['time']-=cost;owner['hand'].remove(source);owner['board']['prepared'].append(source)
    after['runtime']['attachments'][source]=dict(controller=actor,target_instance_id=targets[0],attached_event_seq=after['event_seq'])
    after['runtime']['public_prepared'][source]=dict(controller=actor,face_up=True,paid_time=cost,placed_event_seq=after['event_seq'])
    _placement_window(after,actor);state.validate(after)
    before_c=state.current(envelope);after_c=state.current(after)
    event=dict(seq=after['event_seq'],action_type='attach_item',actor=actor,selected_candidate=action['candidate_id'],
        source_instance_id=source,target_instance_ids=targets,payment_time=cost,source_reference=capability['reference'],
        game_state_before_sha256=old.start.opening._stop_state_sha256(game),
        game_state_after_sha256=old.start.opening._stop_state_sha256(after_c['game_state']),
        continuation_state_before_sha256=old.start._hash(before_c),continuation_state_after_sha256=old.start._hash(after_c))
    return after,[bind_event(envelope,after,event)]


def start_attachments(envelope, actor):
    state.validate(envelope);game=envelope['legacy_continuation']['game_state'];result=[]
    if actor not in ('A','B'):raise ValueError('invalid actor')
    for source,relation in sorted(envelope['runtime']['attachments'].items()):
        if relation['controller']!=actor:continue
        cap=rules.classification(game['cards'][source]['card_id'])
        if cap['timing']!='own_turn_start':continue
        if game['turn_player']!=actor or len(game['players'][actor]['hand'])>2 or rules.used(envelope,source,cap['ability_key']):continue
        result.append(dict(source_instance_id=source,ability_key=cap['ability_key'],optional=True,
            controller=actor,source_reference=cap['reference']))
    return result


def response_inventory(envelope, initial, events):
    current=state.current(envelope);ctx=current['response_context'];actor=ctx['priority_actor']
    if not envelope['runtime']['public_prepared']:
        return old._response_opportunity(current,initial,events)
    excluded=[];projected=copy.deepcopy(current)
    for owner,p in projected['game_state']['players'].items():
        for source in p['board']['prepared']:
            metadata=envelope['runtime']['public_prepared'][source]
            if not metadata['face_up']:raise ValueError('concealed prepared response adapter unavailable')
            cap=rules.classification(projected['game_state']['cards'][source]['card_id'])
            if cap['timing']=='companion_departure':raise ValueError('replacement response boundary not certified')
            if ctx['window_kind']=='turn_start' and start_attachments(envelope,owner):
                raise ValueError('equipment start activation/resolution adapter unavailable')
            excluded.append(dict(source_instance_id=source,source_reference=cap['reference'],reason='trigger_condition_not_met'))
        p['board']['prepared']=[]
    # Projection excludes ONLY independently classified, inactive equipment.
    # Real state and returned evidence stay bound to the full envelope.
    projected['continuation_state_sha256']=old.start._hash(projected)
    projected_events=copy.deepcopy(events)
    projected_events[-1]['game_state_after_sha256']=old.start.opening._stop_state_sha256(projected['game_state'])
    projected_events[-1]['continuation_state_after_sha256']=old.start._hash(projected)
    opportunity=old._generic_response_opportunity(projected,initial,projected_events)
    return dict(opportunity,equipment_exclusions=excluded,envelope_sha256=state.state_hash(envelope))


def apply(envelope, record, inputs):
    if envelope['legacy_continuation']['game_state']['phase']=='normal_action':
        rebuilt=candidates.select(envelope,record['inventory'],record['context'],record['policy_id'],inputs)
        if rebuilt!=record:raise ValueError('normal decision changed before execution')
        action=record['selected_action'];kind=action['action_type']
        if kind=='attach_item':return attach(envelope,action)
        c=state.current(envelope)
        if kind in ('pass','play_main'):
            after,events=old.normal.transition(c,record,inputs)
        elif kind=='use_item' and action['card_id']=='I-c_coin2':
            after,events=old._activate_normal_coin(c,record)
        elif kind in ('place_companion','place_partner'):
            candidates.placement_certificate(envelope,action)
            with old.placements.partner_placement_scope():after,events=old.extension._apply_placement(c,record)
        else:raise ValueError('normal resolution adapter unavailable: '+kind)
    else:
        after,events=old.apply_selected(state.current(envelope),record,inputs)
    if len(events)!=1:raise ValueError('multi-event adapter needs full envelope snapshots')
    result=state.advance(envelope,after,after['last_event_seq'])
    return result,[bind_event(envelope,result,events[0])]
