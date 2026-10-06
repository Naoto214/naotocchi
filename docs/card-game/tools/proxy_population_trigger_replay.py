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
def scope():
    original=end.RUNTIME_TRANSITION_VERIFIER
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
    try:
        end.RUNTIME_TRANSITION_VERIFIER=verify
        yield
    finally:end.RUNTIME_TRANSITION_VERIFIER=original
