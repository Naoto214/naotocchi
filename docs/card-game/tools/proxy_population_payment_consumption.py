"""91 transform and74 same-partner consumption over supplied normal transitions."""
import copy,hashlib
import proxy_continuation_batch as batch
import proxy_continuation_payments as payments
import proxy_continuation_state as state
from proxy_mandatory_policy_contract import ROOT,canonical


def relationship(before,after,event):
 cap=batch.classification('P-cliff_goat')
 if cap['timing']!='different_name_world_change':raise ValueError('relationship source timing differs')
 if hashlib.sha256((ROOT/'01-core-rules.md').read_bytes()).hexdigest()!=batch.RELATIONSHIP_SOURCE_SHA:raise ValueError('relationship base source changed')
 payments.validate_effects(before)
 c=before['legacy_continuation'];g=c['game_state'];actor=g['turn_player'];p=g['players'][actor];source=p['board']['partner'];stage=p['board']['partner_stage']
 if event['actor']!=actor or g['phase']!='normal_action' or c['activation_zone'] or c['pending_triggers'] or c['response_context']['chain_status']!='empty' or c['response_context']['chain_links']!=[] or g.get('challenge') is not None:raise ValueError('relationship consumption boundary differs')
 if source is None or not p['board']['main'] or p['relationship_progressed'] or type(stage) is not int or stage not in (0,1,2,3):raise ValueError('relationship progression precondition differs')
 if p['growth']+(10 if stage==3 else 0)>=100:raise ValueError('relationship 100 maintenance boundary requires priority proof')
 if event['source_instance_id']!=source or event['candidate_variant']!=('0-to-1','1-to-2','2-to-3','3-to-marriage')[stage] or event['action_type']!=('relationship_marriage' if stage==3 else 'relationship_progress') or event['source_reference']!='01-core-rules.md':raise ValueError('relationship source/variant differs')
 if type(event['seq']) is not int or event['seq']!=before['event_seq']+1 or after['event_seq']!=event['seq']:raise ValueError('relationship sequence differs')
 rows=before['runtime']['payment_effects'];used=[r for r in rows if r['controller']==actor and r['payment_kind']=='relationship_same_source' and r['source_instance_id']==source]
 if event.get('payment_effect_ids',[])!=sorted(r['effect_id'] for r in used):raise ValueError('relationship consumption receipt differs')
 cost=max(0,1-sum(r['amount'] for r in used))
 if type(event['payment_time']) is not int or event['payment_time']!=cost or p['time']<cost:raise ValueError('relationship actual payment differs')
 expected=copy.deepcopy(before);expected['event_seq']=event['seq'];expected['runtime']['payment_effects']=[r for r in rows if r not in used]
 ec=expected['legacy_continuation'];ep=ec['game_state']['players'][actor]
 ep['board']['partner_stage']='married' if stage==3 else stage+1;ep['time']-=cost;ep['relationship_progressed']=True;ep['growth']+=10 if stage==3 else 0
 ec['game_state']['phase']='post_placement_response';ec['return_target']='normal_action_opportunity'
 ec['response_context']=dict(source_phase='post_placement_response',phase='response_window',window_kind='after_normal_action',origin_event_seq=event['seq'],turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
 if canonical(after)!=canonical(expected):raise ValueError('relationship consumed/retained effects or continuation differ')
 return len(used),cap['reference']


def audit(before,after,event):
 errors=[];count=0;expired=0;movement=event.get('action_type')=='main_movement';relation=event.get('action_type') in ('relationship_progress','relationship_marriage');applicable=movement or relation;reference=None
 try:
  cap=payments.capability('E-fateful-transform');reference=cap['reference']
  if cap['timing']!='next_transform_this_turn' or cap['payment_kind']!='transform':raise ValueError('payment consumption source timing differs')
  ids=event.get('payment_effect_ids',[])
  if relation:
   count,reference=relationship(before,after,event)
  elif not applicable:
   if ids:raise ValueError('payment consumption claimed outside supported movement or relationship')
  else:
   if hashlib.sha256((ROOT/'07-advanced-rules-checkpoint.md').read_bytes()).hexdigest()!='f346005f5f803f725d294e2fdc9f7fe98fac8a016609612c3d4fe9ab76b6874a':raise ValueError('movement target expiry source changed')
   payments.validate_effects(before)
   c=before['legacy_continuation'];g=c['game_state'];actor=g['turn_player'];variant=event['candidate_variant']
   if event['actor']!=actor or g['phase']!='normal_action' or c['activation_zone'] or c['pending_triggers'] or c['response_context']['chain_status']!='empty' or c['response_context']['chain_links']!=[]:raise ValueError('payment consumption movement boundary differs')
   if variant not in ('birth','time_skip','transform'):raise ValueError('payment consumption movement variant unknown')
   source=event['source_instance_id']
   if source not in g['players'][actor]['hand'] or after['legacy_continuation']['game_state']['players'][actor]['board']['main']!=source:raise ValueError('payment consumption movement source differs')
   if type(event['seq']) is not int or event['seq']!=before['event_seq']+1 or after['event_seq']!=event['seq']:raise ValueError('payment consumption sequence differs')
   if g.get('challenge') is not None:raise ValueError('normal movement during challenge')
   old_target=g['players'][actor]['board']['main']
   for family in ('stat_effects','conditional_effects'):
    prior=before['runtime'][family];removed=[r for r in prior if old_target is not None and r['target_instance_id']==old_target];expired+=len(removed)
    if canonical(after['runtime'][family])!=canonical([r for r in prior if r not in removed]):raise ValueError('movement target expiry or retained effects differ')
   rows=before['runtime']['payment_effects'];used=[r for r in rows if variant=='transform' and r['controller']==actor and r['payment_kind']=='transform'];count=len(used)
   if ids!=sorted(r['effect_id'] for r in used):raise ValueError('payment consumption receipt differs')
   expected=[r for r in rows if r not in used]
   if canonical(after['runtime']['payment_effects'])!=canonical(expected):raise ValueError('payment consumption retained effects differ')
 except (ValueError,KeyError,TypeError,IndexError,OSError) as error:errors.append(str(error))
 return dict(schema='typed_payment_consumption.v2',applicable=applicable,payment_consumption_verified=applicable and not errors,errors=errors,
  consumed_effect_count=count,movement_target_expiry_verified=movement and not errors,relationship_payment_verified=relation and not errors,expired_target_effect_count=expired,source_reference=reference,before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),
  payment_amount_proven=False,effect_creation_proven=False,legacy_reservation_closure_proven=False,
  all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)
