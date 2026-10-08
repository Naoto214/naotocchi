"""01/06/89 full supplied world placement and replacement delta."""
import copy,hashlib,re
import proxy_population_payment_consumption as identity
import proxy_population_start_obligations as starts
import proxy_population_resolution_order as order
import proxy_continuation_batch as batch
import proxy_continuation_rules as rules
import proxy_continuation_state as state
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import ROOT,canonical

CARDS=('W-city','W-countryside','W-deepsea')

def audit(before,after,event):
 errors=[];applicable=event.get('action_type')=='place_world';prior=None;old=None
 try:
  if applicable:
   if hashlib.sha256((ROOT/'01-core-rules.md').read_bytes()).hexdigest()!=batch.RELATIONSHIP_SOURCE_SHA or hashlib.sha256((ROOT/order.SOURCE).read_bytes()).hexdigest()!=order.SOURCE_SHA:raise ValueError('world placement core source changed')
   catalog=starts.catalog()['cards'];c=before['legacy_continuation'];g=c['game_state'];actor=g['turn_player'];p=g['players'][actor];source=event['source_instance_id'];seq=event['seq']
   if event['actor']!=actor or g['phase']!='normal_action' or c['activation_zone'] or c['pending_triggers'] or c['response_context']['chain_status']!='empty' or c['response_context']['chain_links'] or g.get('challenge') is not None:raise ValueError('world placement boundary differs')
   if type(seq) is not int or seq!=before['event_seq']+1 or after['event_seq']!=seq:raise ValueError('world placement sequence differs')
   prior=identity.field_entry_instance(before,after,event,'world');card=g['cards'][prior]['card_id']
   if card not in CARDS:raise ValueError('world source outside current107 scope')
   ref=catalog[card]['reference'];body,_=rules.source_section(ref);old=p['board']['world']
   if re.findall(r'^- 時：(\d+)$',body,re.M)!=['2'] or event['source_reference']!=ref or event.get('candidate_variant')!=('empty_world_slot' if old is None else 'replace_current_world') or event.get('payment_effect_ids',[])!=[]:raise ValueError('world printed payment/source differs')
   if type(event['payment_time']) is not int or event['payment_time']!=2 or type(p['time']) is not int or p['time']<2:raise ValueError('world actual payment differs')
   old=p['board']['world']
   if event.get('previous_world_instance_id')!=old or old is not None and g['cards'][old]['card_id'] not in CARDS:raise ValueError('world previous identity differs')
   expected=copy.deepcopy(before);expected['event_seq']=seq;ec=expected['legacy_continuation'];ep=ec['game_state']['players'][actor]
   if source not in g['cards']:ec['game_state']['cards'][source]=copy.deepcopy(g['cards'][prior])
   if old is not None:ep['discard'].append(old)
   ep['hand'].remove(prior);ep['board']['world']=source;ep['time']-=2
   ec['game_state']['phase']='post_placement_response';ec['return_target']='normal_action_opportunity'
   ec['response_context']=dict(source_phase='post_placement_response',phase='response_window',window_kind='after_normal_action',origin_event_seq=seq,turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
   if canonical(after)!=canonical(expected):raise ValueError('world placement full delta differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_world_placement_delta.v1',applicable=applicable,errors=errors,supplied_world_placement_verified=applicable and not errors,prior_hand_instance_id=prior,previous_world_instance_id=old,
  event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),activation_history_proven=False,incarnation_origin_proven=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
