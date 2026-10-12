"""Reconstruct receipt-bearing activations with existing legal/effect handlers.

A structural receipt alone never authorizes a runtime transition. The exact
before/after state and event are compared, including costs and usage metadata.
"""
import copy
from contextlib import contextmanager
import proxy_continuation_end as end
import proxy_continuation_triggers as triggers
import proxy_continuation_state as state
from proxy_mandatory_policy_contract import canonical


@contextmanager
def scope(records=()):
    original=end.RUNTIME_TRANSITION_VERIFIER;prior_history=end.verify_new_events;prior_activate=triggers.activate
    def activate(before,decision,history,mandatory=False):
        import proxy_population_board_group_effect as group_effect
        import proxy_population_trigger_existing as existing
        from unittest.mock import patch
        action=decision['selected_action']
        if action.get('card_id') not in group_effect.CARDS-group_effect.START:return prior_activate(before,decision,history,mandatory)
        matching=[r for r in records if r['before_envelope']['event_seq']==before['event_seq'] and r.get('chosen',{}).get('action')=='activate' and r['chosen']['activation']['candidate_id']==action['candidate_id']]
        if not matching:return prior_activate(before,decision,history,mandatory)
        if len(matching)!=1:raise ValueError('group provenance activation receipt ambiguous')
        record=matching[0];event=record['events'][0]
        proof=group_effect.audit(before,record['after_envelope'],event,record)
        if proof['errors'] or proof['supplied_board_group_verified'] is not True or mandatory is not event['mandatory']:raise ValueError('group provenance activation receipt differs')
        chosen=record['chosen']['activation'];occurrence=record['before_ledger']['occurrences'][record['chosen']['occurrence_id']]['occurrence']
        projected=copy.deepcopy(action)
        if 'trigger_origin_event_seq' in projected and projected.pop('trigger_origin_event_seq')!=occurrence['origin_event_seq']:raise ValueError('group provenance origin differs')
        canonical_chosen=copy.deepcopy(chosen);canonical_chosen.pop('trigger_origin_event_seq',None)
        if canonical(projected)!=canonical(canonical_chosen):raise ValueError('group provenance action differs')
        # Reuse the actual group adapter's fresh predicate and origin bridge;
        # don't replay a latched action under the older response-window origin.
        with patch.object(triggers,'activate',prior_activate):rebuilt=existing.ExistingAdapter(history).activate(before,chosen,occurrence)
        if canonical(list(rebuilt))!=canonical([record['after_envelope'],record['events']]):raise ValueError('group provenance full activation replay differs')
        return rebuilt
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
        triggers.activate=activate
        end.verify_new_events=verify_history
        end.RUNTIME_TRANSITION_VERIFIER=verify
        yield
    finally:end.RUNTIME_TRANSITION_VERIFIER=original;end.verify_new_events=prior_history;triggers.activate=prior_activate
