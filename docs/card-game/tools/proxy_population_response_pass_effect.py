"""06 current quick.scope response-pass state machine, with challenge/end tails."""
import copy,hashlib
import proxy_population_resolution_order as order
import proxy_population_challenge_lifetime as lifetime
import proxy_continuation_state as state
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import ROOT,canonical

def audit(before,after,event):
 errors=[];applicable=event.get('action_type')=='response_pass'
 try:
  if applicable:
   for path,digest in ((order.SOURCE,order.SOURCE_SHA),(lifetime.REFERENCE,lifetime.SOURCE_SHA)):
    if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=digest:raise ValueError('response pass source changed')
   c=before['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];actor=event['actor'];seq=event['seq'];passes=ctx['consecutive_passes'];links=[row['link_id'] for row in c['activation_zone']]
   if actor not in ('A','B') or actor!=ctx['priority_actor'] or ctx['turn_player']!=g['turn_player'] or g['phase'] not in ('response_window','post_placement_response','turn_end_response') or c['pending_triggers']:raise ValueError('response pass boundary differs')
   if type(passes) is not int or passes not in (0,1) or type(ctx['response_opportunity_index']) is not int or ctx['response_opportunity_index']<1 or ctx['chain_status']!=('building' if links else 'empty') or ctx['chain_links']!=links or len(links)!=len(set(links)):raise ValueError('response pass stack/counter differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq or event['selected_candidate']!='response-pass':raise ValueError('response pass receipt differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation'];out=ec['response_context'];out['consecutive_passes']=passes+1;out['response_opportunity_index']+=1
   if passes==0:out['priority_actor']='B' if actor=='A' else 'A'
   if links:
    ec['return_target']=None
    if passes==1:out['chain_status']='resolving'
   elif passes==1:
    battle=g.get('challenge')
    if battle is not None:
     if battle['status'] not in ('comparing','resolved'):raise ValueError('response challenge status differs')
     target='challenge_comparison' if battle['status']=='comparing' else 'challenge_end'
    else:target='turn_end' if g['phase']=='turn_end_response' or ctx['source_phase']=='turn_end' else 'normal_action_opportunity'
    ec['return_target']=target;ec['game_state']['phase']='normal_action' if target=='normal_action_opportunity' else target
   receipt={k:out[k] for k in ('priority_actor','consecutive_passes','chain_status')};receipt['return_target']=ec['return_target']
   if canonical(event['result'])!=canonical(receipt):raise ValueError('response pass result receipt differs')
   if canonical(after)!=canonical(expected):raise ValueError('response pass full delta differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_response_pass_delta.v1',applicable=applicable,errors=errors,supplied_response_pass_verified=applicable and not errors,
  event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),pending_opportunity_closure_proven=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
