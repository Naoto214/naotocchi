"""Opt-in conditional start-window integration into the unchanged468 loop.

This is a reconstruction unit entry, not a400-game entry or authenticated
turn-origin loader. Full source and lifecycle coverage remain separate gates.
"""
import copy
from contextlib import contextmanager
from threading import get_ident
import proxy_population_runtime as base
import proxy_population_runtime_completion as completion
import proxy_population_departure as departure
import proxy_population_discard_recovery as recovery
import proxy_population_instance_boundary as instances
import proxy_population_activation_reference as references
import proxy_population_trigger_sequential as sequential
import proxy_population_trigger_existing as existing
import proxy_population_boundary_response as boundary
import proxy_population_trigger_connection as connection
import proxy_population_trigger_replay as replay
import proxy_population_trigger_observation as observation
import proxy_population_opportunity_ledger as ledger
import proxy_population_start_obligations as starts
import proxy_continuation_triggers as triggers
import proxy_continuation_actions as actions
import proxy_continuation_state as state
import proxy_resource_value_response as response
from proxy_mandatory_policy_contract import canonical


OBSERVED_EVENTS=frozenset(('main_movement','relationship_start','person_placement','place_world','attach_item','set_item','use_item','use_play','use_event','activate_response'))

@contextmanager
def resolution_boundaries(bindings):
    """Use actual execution bindings for both driver and old provenance replay.

    This mapping is internal to one reconstruction, not accepted as evidence
    from a saved event's processing_boundary field.
    """
    original=actions.RESOLUTION_RESULT_ADAPTER
    def normalize(envelope,result):
        result=original(envelope,result) if original else result
        bound=bindings.get(state.canonical_sha256(envelope))
        return boundary.normalize(envelope,result,bound) if bound else result
    try:
        actions.RESOLUTION_RESULT_ADAPTER=normalize
        yield
    finally:actions.RESOLUTION_RESULT_ADAPTER=original


@contextmanager
def closed_start():
    original_matches=response.reached.timing.matches;original_attached=actions.start_attachments
    def matches(card,*args,**kwargs):
        if card=='C-chicken':return False
        return original_matches(card,*args,**kwargs)
    try:
        response.reached.timing.matches=matches
        actions.start_attachments=lambda envelope,actor:[]
        yield
    finally:response.reached.timing.matches=original_matches;actions.start_attachments=original_attached


@contextmanager
def closed_native(journal,event_seq):
    original=triggers.board_candidates
    closed={r['occurrence']['source_instance_id'] for r in journal['occurrences'].values() if r['status'] in ('activated','declined','ineligible')}
    def boards(current,events,source,slot=None,runtime=None):
        if current['last_event_seq']==event_seq and source in closed:
            card=current['game_state']['cards'][source]['card_id'];cap=base.engine.batch.classification(card)
            return [],dict(source_instance_id=source,card_id=card,reason_code='initial_trigger_occurrence_closed',source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'])
        return original(current,events,source,slot,runtime)
    try:triggers.board_candidates=boards;yield
    finally:triggers.board_candidates=original


def _step_record(record):
    decision=record['decision'];evaluation=base._evaluate(decision)
    return dict(schema='population_runtime_step_468.v1',source_envelope=record['before_envelope'],decision=decision,
        mandatory_decisions=[],forced_record=None,judgment_evaluations=[evaluation],events=record['events'],
        snapshots=record['snapshots'],envelopes=[record['after_envelope']],final_envelope=record['after_envelope'],
        result=None,evaluation=evaluation,policy_eligible=False,balance_admitted=None,ready_for_execution=False)


def segment(envelope,initial,events,shots,runtime,limit,proof,session=None):
    original_operation=base.operation;original_step=base._step
    current_ledger=ledger.observe(ledger.create(proof['capture']['turn_player']),proof['occurrences'],'empty')
    records=[];closed_turns=[];active=True;current_proof=copy.deepcopy(proof);mode=proof.get('group_kind','start');start_proofs=[copy.deepcopy(proof)] if mode=='start' else [];other_proofs=[];boundaries={}
    if not completion._EXTENSION_LOCK.acquire(blocking=False):raise ValueError('extension scope reentry/concurrency forbidden')
    def scoped(forced):
        if mode=='start':connection.validate_opening(envelope,proof)
        elif canonical(existing.ExistingAdapter(events).proof(envelope))!=canonical(proof):raise ValueError('existing trigger group binding differs')
        owner=get_ident()
        def reuse(supplied,callback):
            if get_ident()!=owner or supplied is not initial:raise ValueError('runtime scope identity differs')
            return callback(forced)
        def observe_existing(result,before,prior_history):
            nonlocal current_ledger,active,current_proof,mode
            history=copy.deepcopy(prior_history);previous=before
            for event,after in zip(result['events'],result['envelopes']):
                raw={k:v for k,v in event.items() if k not in base.BIND_KEYS};history.append(raw)
                kind=event['action_type']
                if kind in OBSERVED_EVENTS or kind.startswith('resolve'):
                    status=previous['legacy_continuation']['response_context']['chain_status']
                    observed,source_proof=observation.observe(current_ledger,after,raw,history,status)
                    current_ledger=observed;other_proofs.append(source_proof)
                    if source_proof['new_occurrences'] and not active:
                        current_proof=source_proof;active=True;mode='arrival'
                    if after['legacy_continuation']['activation_zone']==[] and any(row['status']=='deferred' for row in current_ledger['occurrences'].values()):
                        current_ledger=ledger.release(current_ledger,[])
                previous=after
            return result
        def observe_start(result,prior_history,before):
            nonlocal current_ledger,active,current_proof,mode
            finals=result['final_envelope'];c=finals['legacy_continuation'];ctx=c['response_context']
            if any(event['action_type']=='open_turn_end_triggers' for event in result['events']):
                history=prior_history+[{k:v for k,v in event.items() if k not in base.BIND_KEYS} for event in result['events']]
                current_proof=existing.ExistingAdapter(history).proof(finals);current_ledger=ledger.observe(current_ledger,[row for row in current_proof['occurrences'] if ledger.identity(row) not in current_ledger['occurrences']],'empty');active=True;mode='end';other_proofs.append(copy.deepcopy(current_proof));return result
            if c['game_state']['phase']!='response_window' or ctx['window_kind']!='turn_start':return observe_existing(result,before,prior_history)
            if not any(event['action_type'] in ('turn_start_and_normal_draw','egg_exchange_bottom') for event in result['events']):return result
            captures=[e for e in result['envelopes'] if e['legacy_continuation']['game_state']['phase']=='turn_start']
            if len(captures)!=1:raise ValueError('actual start source-capture coverage differs')
            new_proof=starts.collect(starts.capture(captures[0]),finals)
            closed_turns.append(sequential.close_turn(current_ledger,before))
            new_ledger=ledger.observe(ledger.create(c['game_state']['turn_player']),new_proof['occurrences'],'empty')
            current_proof=new_proof;current_ledger=new_ledger;active=True;mode='start';start_proofs.append(copy.deepcopy(new_proof))
            return result
        def step_body(e,i,history,legacy,full,original_forced,supplied_session=None):
            nonlocal current_ledger,active
            if not active:return observe_start(original_step(e,i,history,legacy,full,original_forced,supplied_session),history,e)
            if ledger.offer(current_ledger) is not None:
                record=sequential.step(e,i,current_ledger,observation.Adapter(history))
                current_ledger=record['after_ledger'];records.append(copy.deepcopy(record))
                return _step_record(record)
            def resolve_or_delegate(before,*args):
                c=state.current(before)
                if mode=='start' and c['response_context']['chain_status']=='resolving' and c['activation_zone'][-1]['card_id'] in ('C-chicken','I-bowtie'):
                    with connection.scope(current_proof):return connection.resolve(before,i)
                if c['response_context']['chain_status']=='resolving' and mode in ('start','end'):
                    boundaries[state.canonical_sha256(before)]=dict(kind=mode,turn_player=current_proof['capture']['turn_player'],origin_event_seq=current_proof['origin_event_seq'])
                return original_forced(before,*args)
            with closed_start() if mode=='start' else closed_native(current_ledger,e['event_seq']):r=original_step(e,i,history,legacy,full,resolve_or_delegate,supplied_session)
            if r['final_envelope']['legacy_continuation']['game_state']['phase']==('turn_end' if mode=='end' else 'normal_action'):active=False
            return observe_existing(r,e,history)
        def step(*args,**kwargs):
            nonlocal current_ledger,active,current_proof,mode
            before=copy.deepcopy((current_ledger,active,current_proof,mode,boundaries))
            lengths=(len(records),len(start_proofs),len(other_proofs),len(closed_turns))
            try:return step_body(*args,**kwargs)
            except Exception:
                current_ledger,active,current_proof,mode,saved_boundaries=before
                boundaries.clear();boundaries.update(saved_boundaries)
                del records[lengths[0]:];del start_proofs[lengths[1]:];del other_proofs[lengths[2]:];del closed_turns[lengths[3]:]
                raise
        with departure.scope(),recovery.scope(),instances.scope(),references.scope(),replay.scope(),resolution_boundaries(boundaries):
            try:
                base.operation=reuse;base._step=step
                result=base.segment(envelope,initial,events,shots,runtime,limit,session)
                if result['completed']:closed_turns.append(sequential.close_turn(current_ledger,result['final_envelope']))
                result.update(connection_revision='conditional_sequential_start_window_A',trigger_records=records,trigger_ledger=current_ledger,start_occurrence_proofs=start_proofs,other_occurrence_proofs=other_proofs,
                    closed_turn_trigger_ledgers=closed_turns,origin_authenticated=False,opportunity_completeness_proven=False)
                return result
            finally:base.operation=original_operation;base._step=original_step
    try:return original_operation(initial,scoped)
    finally:completion._EXTENSION_LOCK.release()


def validate(record,envelope,initial,events,shots,runtime,limit,proof):
    try:return [] if canonical(record)==canonical(segment(envelope,initial,events,shots,runtime,limit,proof)) else ['full conditional start reconstruction differs']
    except (ValueError,KeyError,TypeError):return ['conditional start reconstruction failed']
