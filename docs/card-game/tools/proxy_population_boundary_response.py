"""06 start/end response restart after an existing resolver finishes its chain.

The caller must authenticate the processing boundary from the origin ledger.
This conditional adapter does not prove the origin or infer pending triggers.
It never invents a turn-start/end event or reruns an effect/mandatory choice.
"""
import copy
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers
from proxy_mandatory_policy_contract import canonical
from proxy_population_opportunity_ledger import create


def normalize(envelope,result,boundary):
    before=state.current(envelope);actor=before['game_state']['turn_player']
    if type(boundary) is not dict or set(boundary)!={'kind','turn_player','origin_event_seq'} or boundary['kind'] not in ('start','end') or boundary['turn_player']!=actor or type(boundary['origin_event_seq']) is not int or not 0<boundary['origin_event_seq']<=envelope['event_seq']:
        raise ValueError('start/end processing boundary differs')
    create(actor)  # Verify the immutable06/119 rules, not an occurrence claim.
    if before['response_context']['chain_status']!='resolving' or not before['activation_zone']:
        raise ValueError('boundary restart requires an actual resolving chain')
    out=copy.deepcopy(result);events=out['new_events'];shots=out['new_snapshots']
    if len(events)!=len(shots) or not events:raise ValueError('resolution event/snapshot coverage differs')
    for index,(event,shot) in enumerate(zip(events,shots)):
        after=shot['continuation_state']
        if after['activation_zone']:continue
        if index!=len(events)-1 or not event['action_type'].startswith('resolve'):
            raise ValueError('chain completion event differs')
        # Effects/choices were resolved once by the existing handler. Only the
        #06 continuation boundary changes; ordinary reactions follow pending
        # post-chain trigger groups, which the caller processes first.
        seq=event['seq'];ending=boundary['kind']=='end'
        after['game_state']['phase']='turn_end_response' if ending else 'response_window'
        after['return_target']='turn_end' if ending else 'normal_action_opportunity'
        after['response_context']=dict(source_phase='turn_end' if ending else 'response_window',phase='response_window',window_kind='after_normal_action',origin_event_seq=seq,turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
        current=dict(after,last_event_seq=seq)
        out['new_snapshots'][index]=triggers.old._snapshot(current)
        event['game_state_after_sha256']=triggers.old.start.opening._stop_state_sha256(after['game_state']);event['continuation_state_after_sha256']=triggers.old.start._hash(after)
        event['processing_boundary']=copy.deepcopy(boundary)
        if isinstance(event.get('result'),dict) and 'return_target' in event['result']:
            event['result']['return_target']=after['return_target']
        if 'new_envelopes' in out:
            out['new_envelopes'][index]['legacy_continuation']=copy.deepcopy(after)
        out['final_continuation_state']=copy.deepcopy(after)
        if 'final_game_state_sha256' in out:out['final_game_state_sha256']=event['game_state_after_sha256']
        if 'final_continuation_state_sha256' in out:out['final_continuation_state_sha256']=event['continuation_state_after_sha256']
    canonical(out)
    return out
