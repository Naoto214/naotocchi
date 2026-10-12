"""Reconstruct receipt-bearing activations with existing legal/effect handlers.

A structural receipt alone never authorizes a runtime transition. The exact
before/after state and event are compared, including costs and usage metadata.
"""
from contextlib import contextmanager
import proxy_continuation_end as end
import proxy_continuation_triggers as triggers
import proxy_continuation_state as state
from proxy_mandatory_policy_contract import canonical


@contextmanager
def scope(records=()):
    original=end.RUNTIME_TRANSITION_VERIFIER;prior_history=end.verify_new_events
    def verify(before,after,event,history=None):
        links=after['legacy_continuation']['activation_zone']
        if event.get('action_type')=='activate_response' and event.get('source_zone')=='board' and links and 'activation_receipt' in links[-1]:
            try:
                current=state.current(before);source=event['source_instance_id'];actor=current['response_context']['priority_actor'];board=current['game_state']['players'][actor]['board']
                slot=next((name for name in ('main','partner','world') if board[name]==source),None)
                if source in board['companions']:slot='companions'
                if source in board['prepared']:slot='prepared'
                actions,_=triggers.board_candidates(current,history or [],source,slot,before['runtime'])
                action=next(a for a in actions if a['candidate_id']==event['selected_candidate'])
                expected,generated=triggers.activate(before,dict(selected_action=action),history or [])
                raw={k:v for k,v in generated[0].items() if k not in end.BIND_KEYS}
                return canonical(expected)==canonical(after) and canonical(raw)==canonical(event)
            except (ValueError,KeyError,TypeError,StopIteration,IndexError):return False
        return original(before,after,event,history) if original else False
    def verify_history(events,shots,runtime):
        import proxy_population_trigger_closure_effect as closure
        proofs=prior_history(events,shots,runtime);boundaries={e['event_seq']:e for e in runtime}
        if len(boundaries)!=len(runtime):raise ValueError('closure provenance duplicate boundary')
        for event in events:
            if event['action_type'] not in closure.KINDS:continue
            seq=event['seq'];matching=[r for r in records if len(r['events'])==1 and r['events'][0]['seq']==seq]
            if len(matching)!=1 or seq-1 not in boundaries or seq not in boundaries:raise ValueError('closure provenance actual receipt/boundary absent or ambiguous')
            proof=closure.audit(boundaries[seq-1],boundaries[seq],event,matching[0])
            if proof['errors'] or proof['supplied_trigger_closure_verified'] is not True:raise ValueError('closure provenance full delta differs: '+str(proof['errors']))
            proofs.append(dict(event_seq=seq,card_id=None,kind=event['action_type'],source_reference=closure.order.SOURCE,source_raw_sha256=closure.order.SOURCE_SHA,certain_growth_difference=0,duration='none',closure_delta_audit=proof))
        return proofs
    try:
        end.verify_new_events=verify_history
        end.RUNTIME_TRANSITION_VERIFIER=verify
        yield
    finally:end.RUNTIME_TRANSITION_VERIFIER=original;end.verify_new_events=prior_history
