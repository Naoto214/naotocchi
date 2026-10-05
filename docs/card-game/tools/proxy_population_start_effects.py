"""Reuse196's source-bound reveal operation without dropping outer links.

Conditional resolver only: activation and origin authentication are separate.
The existing06 partial-resolution rule permits an empty deck; it does not
create a draw, a loss, or another choice. No experiment policy is installed.
"""
import copy
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers
import proxy_population_start_obligations as obligations
from proxy_mandatory_policy_contract import canonical


def resolve_chicken(current,initial):
    obligations.catalog()
    old=triggers.old;ctx=current['response_context'];links=current['activation_zone']
    if (ctx['chain_status']!='resolving' or not links or
            ctx['chain_links']!=[link['link_id'] for link in links] or current['pending_triggers']):
        raise ValueError('start reveal chain differs')
    link=links[-1];actor=link['actor'];owner=current['game_state']['players'][actor]
    if (link['card_id']!='C-chicken' or link['action_type']!='activate_board_ability' or
            link['source_zone']!='board' or canonical(link['payment'])!=canonical({'time':0}) or
            link['target_instance_ids'] or link['candidate_variant'] is not None or
            link['source_instance_id'] not in owner['board']['companions'] or
            current['game_state']['cards'][link['source_instance_id']]['card_id']!='C-chicken' or
            ctx['window_kind']!='turn_start' or current['game_state']['phase']!='response_window'):
        raise ValueError('start reveal activated source differs')
    after=copy.deepcopy(current)
    if owner['deck']:
        projected=copy.deepcopy(current)
        projected['activation_zone']=projected['activation_zone'][-1:]
        projected['response_context']['chain_links']=projected['response_context']['chain_links'][-1:]
        #196's legacy single-link location check cannot represent physical
        # outer quick cards. Park only those in its private discard projection.
        # The pinned effect reads only the revealed deck card/type and moves it
        # deck->hand; projected discard is never copied into actual state.
        for outer in links[:-1]:
            if outer.get('source_zone')!='board':
                projected['game_state']['players'][outer['actor']]['discard'].append(outer['source_instance_id'])
        projected['continuation_state_sha256']=old.start._hash(projected)
        resolved,event=old.reached.resolution.resolve_board_ability(projected)
        for zone in ('deck','hand'):
            after['game_state']['players'][actor][zone]=copy.deepcopy(resolved['game_state']['players'][actor][zone])
        receipt=copy.deepcopy(event['result'])
    else:
        receipt=dict(revealed_instance_id=None,revealed_card_type=None,
                     drawn_instance_id=None,source_destination='board')
    after['activation_zone'].pop();after['response_context']['chain_links'].pop()
    if not after['activation_zone']:
        after['response_context'].update(chain_status='empty',consecutive_passes=0)
        after['return_target']='normal_action_opportunity';after['game_state']['phase']='normal_action'
    after['last_event_seq']=current['last_event_seq']+1
    after['continuation_state_sha256']=old.start._hash(after)
    event=triggers._raw_event(current,after,'resolve_board_ability',actor,
        source_instance_id=link['source_instance_id'],source_zone='board',
        chain_link_id=link['link_id'],payment=copy.deepcopy(link['payment']),result=receipt)
    old._verify_generated(current,after,[event])
    return dict(final_continuation_state=old.start._payload(after),last_valid_event_seq=after['last_event_seq'],
                new_events=[event],new_snapshots=[old._snapshot(after)],new_decisions=[],completed=False)
