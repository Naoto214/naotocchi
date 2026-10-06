"""Export existing callback entries for separate local-rule/randomness checking.

Origins and input material remain supplied; only the source-replaying match
adapter may bind this conditional evidence to actual execution. No admission.
"""
import copy,json
from collections import Counter
from proxy_mandatory_policy_contract import canonical
from proxy_mandatory_policy_local import validate_local_record
from proxy_population_policy_bridge import Session


def export(session):
    entries=[]
    for identity,stored in sorted(session.records.items()):
        payload=json.loads(stored['payload']);decoded=json.loads(identity)
        if canonical(payload)!=stored['payload'] or canonical(decoded)!=identity:raise ValueError('callback entry encoding differs')
        if canonical(stored['record']['local_policy_evidence'])!=canonical(payload['local']):raise ValueError('callback local entry differs')
        entries.append(dict(identity=decoded,frame=payload['frame'],local_record=payload['local']))
    return dict(schema='registered_mandatory_policy_entries.v1',entries=entries,origin_authenticated=False,policy_eligible=None,balance_admitted=None)


def audit(journal,decisions,origins,binding,roots):
    errors=[];verified=0
    try:
        if type(journal) is not dict or set(journal)!={'schema','entries','origin_authenticated','policy_eligible','balance_admitted'} or journal['schema']!='registered_mandatory_policy_entries.v1' or journal['origin_authenticated'] is not False or journal['policy_eligible'] is not None or journal['balance_admitted'] is not None or type(journal['entries']) is not list:raise ValueError('policy journal schema differs')
        checker=Session(binding,roots);checker.origins=copy.deepcopy(origins)
        identities=[];locals_=[]
        for row in journal['entries']:
            if type(row) is not dict or set(row)!={'identity','frame','local_record'}:raise ValueError('policy entry fields differ')
            identity=row['identity'];frame=row['frame'];local=row['local_record']
            if type(identity) is not list or len(identity)!=3 or identity[1:]!=[frame['actor'],frame['choice_contract_id']]:raise ValueError('policy occurrence identity differs')
            context=checker.context(identity[0],frame)
            result=validate_local_record(local,frame,roots[frame['actor']],context)
            if not result['local_record_verified']:raise ValueError('local source/candidates/application/randomness differs')
            identities.append(canonical(identity));locals_.append(canonical(local));verified+=1
        if identities!=sorted(set(identities)):raise ValueError('duplicate or unordered policy occurrence')
        active=[]
        for d in decisions:
            if 'local_policy_evidence' in d:
                if d.get('decision_kind')!='mandatory_choice':raise ValueError('policy on undesignated decision kind')
                active.append(canonical(d['local_policy_evidence']))
        if Counter(active)!=Counter(locals_):raise ValueError('actual policy decision coverage differs')
    except (ValueError,TypeError,KeyError,IndexError) as error:errors.append(str(error))
    return dict(schema='registered_mandatory_policy_entry_audit.v1',local_entries_verified=not errors,verified_count=verified if not errors else 0,errors=errors,
        origin_authenticated=False,policy_eligible=None,balance_admitted=None,
        scope='supplied_registered_entries_local_rules_and_randomness',strategic_optimality_proven=False)


def audit_origins(record):
    """Rebuild addresses from every supplied turn boundary/top-link resolution.

    Includes resolutions with no policy choice. The connected adapter supplies
    the trace; this standalone check does not authenticate its initial root.
    """
    from proxy_population_policy_bridge import occurrence_key
    errors=[];count=0
    def current_entry(envelope):
        # Read the actual trace payload; native envelope validation occurred
        # inside its versioned runtime scopes, which have now been restored.
        current=copy.deepcopy(envelope['legacy_continuation'])
        current['last_event_seq']=envelope['event_seq']
        return current
    try:
        binding={k:record['binding'][k] for k in ('protocol_id','group_id','mirror_side')}
        # No random choice is made. Session is reused only as the origin ledger.
        session=Session(binding,{a:'00'*32 for a in 'AB'})
        first=binding['mirror_side'][0];session.turn_start(first,'initial_turn_start')
        for step in record['runtime']['steps']:
            current=current_entry(step['source_envelope']);game=current['game_state']
            if game['turn_player']!=session.owner:raise ValueError('origin turn owner discontinuity')
            if current['response_context']['chain_status']=='resolving' and current['activation_zone']:
                session.effect(occurrence_key(current),game['turn_player']);count+=1
            if len(step['events'])!=len(step['envelopes']):raise ValueError('origin event coverage differs')
            for event,envelope in zip(step['events'],step['envelopes']):
                after=current_entry(envelope);owner=after['game_state']['turn_player']
                if owner!=session.owner:
                    if event['action_type']!='turn_end_completed' or after['game_state']['phase']!='turn_start':raise ValueError('origin turn boundary differs')
                    session.turn_start(owner,occurrence_key(after))
        if canonical(session.origins)!=canonical(record['origin_journal']) or canonical(session.counts)!=canonical(record['turn_counts']):raise ValueError('full origin sequence differs')
    except (ValueError,KeyError,TypeError) as error:errors.append(str(error))
    return dict(schema='runtime_policy_origin_sequence.v1',origin_sequence_verified=not errors,errors=errors,
        resolution_entry_count=count,origin_authenticated=False,all_rule_opportunities_proven=False,
        scope='supplied_actual_turn_boundaries_and_top_link_entries',policy_eligible=None,balance_admitted=None)


def audit_opportunities(record):
    """Enumerate designated local obligations from supplied actual entry states.

    Uses465's source-pinned rule slices, including no-choice outcomes. This is
    independent of which choice callbacks were recorded, not an independent
    rules engine or a proof of every non-designated game opportunity.
    """
    from proxy_mandatory_choice_boundary import REGISTRY,prepare
    from proxy_population_policy_bridge import occurrence_key
    import proxy_population_incarnation as life
    expected={};no_choice=[];errors=[]
    def key(envelope):
        return occurrence_key(dict(envelope['legacy_continuation'],last_event_seq=envelope['event_seq']))
    def require(origin,frame):
        boundary=prepare(frame);identity=canonical([origin,frame['actor'],frame['choice_contract_id']])
        if boundary['candidate_ids']:
            if identity in expected:raise ValueError('duplicate designated rule occurrence')
            expected[identity]=frame
        else:no_choice.append(dict(origin=origin,actor=frame['actor'],choice_contract_id=frame['choice_contract_id'],reason=boundary['no_choice_reason']))
    def frame(kind,actor,game,source=None,target=None):
        return dict(schema='mandatory_rule_slice_input.v1',choice_contract_id=kind,actor=actor,
            entry='after_normal_draw' if kind=='egg_exchange_bottom' else 'effect_resolution_start',
            source_instance_id=source,target_instance_id=target,game_state=copy.deepcopy(game))
    try:
        opening=record['opening'];first=record['binding']['mirror_side'][0]
        require('initial_turn_start',frame('egg_exchange_bottom',first,opening['normal_draw_intermediate']))
        runtime=record['runtime'];registry=copy.deepcopy(runtime['physical_lifecycle_root']);before=runtime['source_envelope']
        life.check(registry,before)
        bycard={card:kind for kind,cards in REGISTRY.items() for card in cards}
        for step in runtime['steps']:
            if canonical(before)!=canonical(step['source_envelope']):raise ValueError('designated entry source discontinuity')
            current=before['legacy_continuation']
            if current['response_context']['chain_status']=='resolving' and current['activation_zone']:
                link=current['activation_zone'][-1];kind=bycard.get(link['card_id'])
                if kind is not None:
                    target=link['target_instance_ids'][0] if kind=='final_time_hand_bottom' else None
                    require(key(before),frame(kind,link['actor'],life.project_game(registry,current['game_state']),link['source_instance_id'],target))
            if len(step['events'])!=len(step['envelopes']):raise ValueError('designated transition coverage differs')
            for event,after in zip(step['events'],step['envelopes']):
                prior_owner=life.game(before)['turn_player']
                registry=life.observe(registry,before,after,event.get('instance_transitions',[]))
                game=life.project_game(registry,life.game(after));actor=game['turn_player']
                if actor!=prior_owner:
                    if event['action_type']!='turn_end_completed' or game['phase']!='turn_start':raise ValueError('designated turn entry differs')
                    if game['players'][actor]['board']['main'] is None:
                        #01 normal start prefix precedes the465 egg rule slice.
                        p=game['players'][actor]
                        p.update(time=game['round'],challenge_used=False,person_placed=False,relationship_progressed=False)
                        if p['deck']:p['hand'].append(p['deck'].pop(0))
                        game['phase']='egg_exchange_choice'
                        require(key(after),frame('egg_exchange_bottom',actor,game))
                before=after
        if canonical(before)!=canonical(runtime['final_envelope']) or canonical(registry)!=canonical(runtime['physical_lifecycle_final']):raise ValueError('designated lifecycle final binding differs')
        actual={}
        for row in runtime['mandatory_policy_journal']['entries']:
            identity=canonical(row['identity'])
            if identity in actual:raise ValueError('duplicate callback occurrence')
            actual[identity]=row['frame']
        if set(actual)!=set(expected) or any(canonical(actual[k])!=canonical(expected[k]) for k in expected):raise ValueError('designated callback opportunity/frame coverage differs')
    except (ValueError,KeyError,TypeError,IndexError) as error:errors.append(str(error))
    return dict(schema='designated_mandatory_opportunity_coverage.v1',designated_opportunities_covered=not errors,
        errors=errors,required_choice_count=len(expected),no_choice_occurrences=no_choice,
        origin_authenticated=False,all_rule_opportunities_proven=False,opportunity_scope='designated_465_rules_given_actual_trace_entries',
        policy_eligible=None,balance_admitted=None)
