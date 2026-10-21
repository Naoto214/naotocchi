"""Shared independent expected chain delta for supplied effect audits.

This is an audit helper, not an executor/adapter or boundary-origin authority.
The caller reconstructs its effect delta first, then compares the entire state.
"""
import hashlib
from proxy_population_resolution_order import SOURCE,SOURCE_SHA
from proxy_mandatory_policy_contract import ROOT


def finish(expected,before,event):
 if hashlib.sha256((ROOT/SOURCE).read_bytes()).hexdigest()!=SOURCE_SHA:raise ValueError('resolution delta source changed')
 c=before['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];seq=event['seq'];ec=expected['legacy_continuation']
 ec['activation_zone'].pop();ec['response_context']['chain_links'].pop()
 if not ec['activation_zone']:
  ending=ctx['source_phase']=='turn_end' or g['phase']=='turn_end_response'
  ec['response_context'].update(chain_status='empty',consecutive_passes=2 if ending else 0)
  ec['game_state']['phase']='turn_end' if ending else 'normal_action'
  ec['return_target']='turn_end' if ending else 'normal_action_opportunity'
  battle=g.get('challenge')
  if battle is not None and not ending:
   ec['game_state']['phase']='response_window';ec['return_target']='challenge_comparison' if battle['status']=='comparing' else 'challenge_end'
   ec['response_context']=dict(source_phase='challenge_declaration' if battle['status']=='comparing' else 'challenge_result',phase='response_window',window_kind='after_normal_action',origin_event_seq=seq,turn_player=g['turn_player'],priority_actor=g['turn_player'],chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
 if 'processing_boundary' in event:
  # Existing06 adapter reopens ordinary reactions after the last link.
  # Validate its supplied shape/delta, not the origin ledger's authority.
  boundary=event['processing_boundary']
  if type(boundary) is not dict:raise ValueError('resolution processing boundary differs')
  origin=boundary.get('origin_event_seq')
  if set(boundary)!={'kind','turn_player','origin_event_seq'} or boundary['kind'] not in ('start','end') or boundary['turn_player']!=g['turn_player'] or type(origin) is not int or not 0<origin<=before['event_seq'] or ec['activation_zone']:raise ValueError('resolution processing boundary differs')
  ending=boundary['kind']=='end'
  ec['game_state']['phase']='turn_end_response' if ending else 'response_window'
  ec['return_target']='turn_end' if ending else 'normal_action_opportunity'
  ec['response_context']=dict(source_phase='turn_end' if ending else 'response_window',phase='response_window',window_kind='after_normal_action',origin_event_seq=seq,turn_player=g['turn_player'],priority_actor=g['turn_player'],chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
