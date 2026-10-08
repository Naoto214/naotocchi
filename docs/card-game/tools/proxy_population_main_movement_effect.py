"""02/77 supplied main movement delta, reusing existing price/identity proof.

Discard arrival order for departing main/equipment remains supplied and
unproved; this is conservation plus all other exact state changes, not an
ordering ruling, origin authentication, or whole-rule admission certificate.
"""
import copy
from collections import Counter
import proxy_population_payment_consumption as payment
import proxy_population_start_obligations as starts
import proxy_continuation_state as state
from proxy_population_resolution_semantics import event_digest
from proxy_mandatory_policy_contract import canonical

def audit(before,after,event):
 errors=[];applicable=event.get('action_type') in ('main_movement','play_main_birth');proof=None;departures=[]
 try:
  if applicable:
   starts.catalog() # Existing pinned77 sources;02 is checked by payment below.
   proof=payment.audit(before,after,event)
   if proof['errors'] or not proof['movement_payment_verified'] or not proof['movement_instance_binding_verified']:raise ValueError('main movement prerequisite differs: '+str(proof['errors']))
   c=before['legacy_continuation'];g=c['game_state'];actor=g['turn_player'];p=g['players'][actor];old=p['board']['main'];source=event['source_instance_id'];prior=payment.movement_instance(before,after,event)
   expected=copy.deepcopy(before);expected['event_seq']=event['seq'];ec=expected['legacy_continuation'];ep=ec['game_state']['players'][actor]
   if source not in g['cards']:ec['game_state']['cards'][source]=copy.deepcopy(g['cards'][prior])
   # The existing proof independently validates these complete families.
   for family in ('payment_effects','stat_effects','conditional_effects'):expected['runtime'][family]=copy.deepcopy(after['runtime'][family])
   moved={owner:[] for owner in ('A','B')}
   if old is not None:
    for equipment,row in before['runtime']['attachments'].items():
     if row['target_instance_id']!=old:continue
     owner=row['controller'];public=before['runtime']['public_prepared'][equipment]
     if owner!=actor or public['controller']!=owner or public['face_up'] is not True:raise ValueError('main movement equipment relation differs')
     expected['legacy_continuation']['game_state']['players'][owner]['board']['prepared'].remove(equipment)
     del expected['runtime']['attachments'][equipment];del expected['runtime']['public_prepared'][equipment];moved[owner].append(equipment)
    moved[actor].append(old)
   for owner in ('A','B'):
    previous=g['players'][owner]['discard'];actual=after['legacy_continuation']['game_state']['players'][owner]['discard']
    if actual[:len(previous)]!=previous or Counter(actual[len(previous):])!=Counter(moved[owner]):raise ValueError('main movement discard conservation differs')
    expected['legacy_continuation']['game_state']['players'][owner]['discard']=copy.deepcopy(actual)
    departures.extend(moved[owner])
   ep['hand'].remove(prior);ep['board']['main']=source;ep['time']-=proof['movement_payment']['payment_time']
   ec['game_state']['phase']='post_placement_response';ec['return_target']='normal_action_opportunity'
   ec['response_context']=dict(source_phase='post_placement_response',phase='response_window',window_kind='after_normal_action',origin_event_seq=event['seq'],turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
   if canonical(after)!=canonical(expected):raise ValueError('main movement full delta differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='supplied_main_movement_delta.v1',applicable=applicable,errors=errors,supplied_main_movement_verified=applicable and not errors,payment_and_identity_audit=proof,departed_instance_ids=departures,
  event_sha256=event_digest(event),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),discard_arrival_order_proven=False,incarnation_origin_proven=False,all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
