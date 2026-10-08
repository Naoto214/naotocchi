"""06 normal pass is only an end request, never a completed turn boundary."""
import copy,hashlib
import proxy_population_resolution_order as order
import proxy_continuation_state as state
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import ROOT,canonical

def audit(before,after,event):
 errors=[];applicable=event.get('action_type')=='normal_pass_end_request'
 try:
  if applicable:
   if hashlib.sha256((ROOT/order.SOURCE).read_bytes()).hexdigest()!=order.SOURCE_SHA:raise ValueError('normal pass source changed')
   c=before['legacy_continuation'];g=c['game_state'];actor=g['turn_player'];seq=event['seq']
   if event['actor']!=actor or g['phase']!='normal_action' or c['activation_zone'] or c['pending_triggers'] or c['response_context']['chain_status']!='empty' or c['response_context']['chain_links'] or g.get('challenge') is not None:raise ValueError('normal pass boundary differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or event['selected_candidate']!='pass' or event['source_instance_id'] is not None or event['source_reference']!=order.SOURCE+'#ターン終了':raise ValueError('normal pass receipt differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation'];ec['game_state']['phase']='turn_end_response';ec['return_target']='turn_end'
   ec['response_context']=dict(source_phase='normal_action',phase='response_window',window_kind='after_normal_action',origin_event_seq=seq,turn_player=actor,priority_actor='B' if actor=='A' else 'A',chain_status='empty',chain_links=[],consecutive_passes=1,response_opportunity_index=2,decision_kind='response_action',choice_kind='reaction_or_pass')
   if canonical(after)!=canonical(expected):raise ValueError('normal pass full delta differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_normal_pass_delta.v1',applicable=applicable,errors=errors,supplied_normal_pass_verified=applicable and not errors,
  event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),end_obligations_proven=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
