"""Atomic preparation and public-pool proofs for inactive concealed reactions."""
import copy
from contextlib import contextmanager
import proxy_continuation_batch as batch
import proxy_continuation_candidates as candidates
import proxy_continuation_actions as actions
import proxy_continuation_end as end
import proxy_continuation_state as state
import proxy_resource_value_trajectory as old


def concealed_pool():
 rows=[r for r in batch.rules.table()['cards'] if any(a['action_type']=='set_item' for a in r['actions'])]
 caps=[batch.classification(r['card_id']) for r in rows]
 if not caps or any(c['timing']!='opponent_main_removal_activation' for c in caps):
  raise ValueError('concealed public pool contains an unclassified reaction')
 return sorted(c['reference'] for c in caps)


def normal_projection(envelope):
 projected=copy.deepcopy(envelope);g=projected['legacy_continuation']['game_state'];actor=g['turn_player']
 if any(not r['face_up'] for r in envelope['runtime']['public_prepared'].values()):concealed_pool()
 for owner,p in g['players'].items():
  if owner!=actor:
   p['board']['prepared']=[s for s in p['board']['prepared'] if envelope['runtime']['public_prepared'][s]['face_up']]
 return projected


def set_card(envelope,action,history=None):
 inv=candidates.audit(envelope,history or [])
 if action not in inv['legal_candidate_details'] or action['action_type']!='set_item':raise ValueError('set action absent from complete inventory')
 cap=batch.classification(action['card_id'])
 if cap['timing']!='opponent_main_removal_activation':raise ValueError('preparation immediate effects unavailable')
 before=state.current(envelope);g=before['game_state'];actor=g['turn_player'];source=action['source_instance_id'];cost=action['evidence']['payment_time']
 after=copy.deepcopy(envelope);after['event_seq']+=1;p=after['legacy_continuation']['game_state']['players'][actor]
 if source not in p['hand'] or len(p['board']['prepared'])>=3 or p['time']<cost:raise ValueError('set preconditions differ')
 p['hand'].remove(source);p['board']['prepared'].append(source);p['time']-=cost
 after['runtime']['public_prepared'][source]=dict(controller=actor,face_up=False,paid_time=cost,placed_event_seq=after['event_seq'])
 for modifier in action['evidence']['cost_modifiers']:
  if batch.rules.used(envelope,modifier['source_instance_id'],modifier['ability_key']):raise ValueError('preparation discount already used')
  after['runtime']['ability_uses'].append(dict(source_instance_id=modifier['source_instance_id'],ability_key=modifier['ability_key'],turn_player=actor,round=g['round'],count=1))
 actions._placement_window(after,actor);state.validate(after);current=state.current(after)
 event=dict(seq=after['event_seq'],action_type='set_item',actor=actor,selected_candidate=action['candidate_id'],source_instance_id=source,target_instance_ids=[],payment_time=cost,source_reference=cap['reference'],cost_modifiers=copy.deepcopy(action['evidence']['cost_modifiers']),game_state_before_sha256=old.start.opening._stop_state_sha256(g),game_state_after_sha256=old.start.opening._stop_state_sha256(current['game_state']),continuation_state_before_sha256=old.start._hash(before),continuation_state_after_sha256=old.start._hash(current))
 return after,[actions.bind_event(envelope,after,event)]


def response_inventory(envelope,initial,events,delegate):
 if not any(not r['face_up'] for r in envelope['runtime']['public_prepared'].values()):return delegate(envelope,initial,events)
 references=concealed_pool();c=state.current(envelope);ctx=c['response_context'];origin=next((e for e in events if e['seq']==ctx['origin_event_seq']),None)
 if origin is None:raise ValueError('concealed response origin missing')
 # All certified public effects below lack main-removal operations. Unknown
 # activations stop without reading the concealed opponent's card identity.
 if origin['action_type']=='activate_response':
  link=next((l for l in c['activation_zone'] if l['link_id']==origin.get('chain_link_id')),None)
  if link is None or link['card_id'] not in {'G-hit-blow','I-c_coin2','E-final-time'}|batch.CAPABILITIES.keys():raise ValueError('main-removal activation classification unavailable')
  if link['card_id']=='I-poop1':raise ValueError('prepared replacement activation boundary unavailable')
 elif origin['action_type'] not in batch.NORMAL_CARD_EVENTS|{'turn_start_and_egg_draw','turn_start_and_normal_draw','open_turn_end_triggers','relationship_progress','relationship_marriage','normal_pass_end_request','egg_exchange_bottom','challenge_declared','challenge_compared','resolve_board_stat','resolve_payment_modifier','resolve_immediate_effect','resolve_event','resolve_item','resolve_play','resolve_board_ability','resolve_targeted_zone_move'}:
  raise ValueError('concealed response timing unclassified: '+origin['action_type'])
 projected=copy.deepcopy(envelope);exclusions=[];actor=ctx['priority_actor']
 for owner,p in projected['legacy_continuation']['game_state']['players'].items():
  for index,source in enumerate(list(p['board']['prepared'])):
   meta=envelope['runtime']['public_prepared'][source]
   if meta['face_up']:continue
   row=dict(controller=owner,slot=index,reason='public_origin_has_no_opponent_main_removal_activation',source_references=references)
   if owner==actor:row['source_instance_id']=source
   exclusions.append(row);p['board']['prepared'].remove(source);del projected['runtime']['public_prepared'][source]
 # The hand/board classifiers receive the full actual state through the outer
 # batch scope; only independently inactive preparations are projected away.
 previous=batch.RESPONSE_FULL_CURRENT;previous_runtime=batch.RESPONSE_FULL_RUNTIME;batch.RESPONSE_FULL_CURRENT=c;batch.RESPONSE_FULL_RUNTIME=envelope['runtime']
 projected_events=copy.deepcopy(events);current=state.current(projected)
 projected_events[-1]['game_state_after_sha256']=old.start.opening._stop_state_sha256(current['game_state'])
 projected_events[-1]['continuation_state_after_sha256']=old.start._hash(current)
 try:opportunity=delegate(projected,initial,projected_events)
 finally:batch.RESPONSE_FULL_CURRENT=previous;batch.RESPONSE_FULL_RUNTIME=previous_runtime
 return dict(opportunity,preparation_exclusions=exclusions,envelope_sha256=state.state_hash(envelope))


@contextmanager
def scope():
 original_projection=candidates.NORMAL_PROJECTION;original_apply=actions.apply;original_response=actions.response_inventory;original_verify=end.verify_new_events;original_runtime=end.RUNTIME_TRANSITION_VERIFIER;original_attachment=actions.PLACEMENT_CAPABILITY_VALIDATOR;original_reaction=actions.PREPARED_REACTION_CLASSIFIER;original_end_prepared=end.CONCEALED_PREPARATION_CLASSIFIER
 try:
  def end_prepared(e,source):
   concealed_pool();card=e['legacy_continuation']['game_state']['cards'][source]['card_id'];entry=old.start.load_candidate_rows()[card]
   if not any(a['action_type']=='set_item' for a in entry['actions']):raise ValueError('concealed card lacks certified preparation method')
  end.CONCEALED_PREPARATION_CLASSIFIER=end_prepared
  candidates.NORMAL_PROJECTION=normal_projection
  def placement_validator(e,a,cap):
   if cap['timing'] not in ('own_turn_start','own_turn_end','companion_departure'):raise ValueError('equipment placement capability unavailable')
   for p in e['legacy_continuation']['game_state']['players'].values():
    if p['board']['world']:batch.classification(e['legacy_continuation']['game_state']['cards'][p['board']['world']]['card_id'])
  actions.PLACEMENT_CAPABILITY_VALIDATOR=placement_validator
  def reaction_classifier(e,owner,source,h):
   c=state.current(e);origin=next((x for x in h if x['seq']==c['response_context']['origin_event_seq']),None)
   if origin is None:raise ValueError('replacement trigger origin unavailable')
   if origin['action_type']=='activate_response':
    link=next((l for l in c['activation_zone'] if l['link_id']==origin.get('chain_link_id')),None)
    if link is None or link['card_id'] not in batch.CAPABILITIES:raise ValueError('replacement activation semantic capability unavailable')
    batch.classification(link['card_id'])
   elif origin['action_type'] not in batch.NORMAL_CARD_EVENTS|{'normal_pass_end_request','turn_start_and_egg_draw','turn_start_and_normal_draw','egg_exchange_bottom','open_turn_end_triggers','relationship_progress','relationship_marriage','challenge_declared','challenge_compared','resolve_board_stat','resolve_payment_modifier','resolve_immediate_effect','resolve_event','resolve_item','resolve_play','resolve_board_ability','resolve_targeted_zone_move'}:raise ValueError('replacement origin effect unclassified')
   return dict(source_instance_id=source,source_reference=batch.rules.classification(c['game_state']['cards'][source]['card_id'])['reference'],reason='certified_origin_does_not_move_an_opponent_companion')
  actions.PREPARED_REACTION_CLASSIFIER=reaction_classifier
  def apply(envelope,record,inputs):
   if record.get('selected_action',{}).get('action_type')=='set_item':
    rebuilt=candidates.select(envelope,record['inventory'],record['context'],record['policy_id'],inputs)
    if rebuilt!=record:raise ValueError('set decision reconstruction differs')
    return set_card(envelope,record['selected_action'],inputs.get('public_events'))
   return original_apply(envelope,record,inputs)
  actions.apply=apply
  def prepared_response(e,i,h):
   opportunity=response_inventory(e,i,h,original_response)
   import proxy_continuation_triggers as triggers
   c=state.current(e);actor=c['response_context']['priority_actor'];additions=[];exclusions=[]
   for source in c['game_state']['players'][actor]['board']['prepared']:
    if source not in e['runtime']['attachments']:continue
    card=c['game_state']['cards'][source]['card_id']
    if card not in triggers.SUPPORTED_EFFECTS:continue
    details,reason=triggers.board_candidates(c,h,source,'prepared',e['runtime']);additions.extend(details);exclusions.append(reason)
   details=sorted(opportunity['legal_candidate_details']+additions,key=lambda d:d['candidate_id']);ids=[d['candidate_id'] for d in details]
   if len(ids)!=len(set(ids)):raise ValueError('prepared trigger candidate collision')
   return dict(opportunity,legal_candidate_details=details,legal_candidate_ids=ids,prepared_trigger_classifications=exclusions)
  actions.response_inventory=prepared_response
  def runtime_verify(prior,actual,event,history=None):
   if event['action_type']!='set_item':return original_runtime(prior,actual,event,history) if original_runtime else False
   inv=candidates.audit(prior,history or []);a=next((a for a in inv['legal_candidate_details'] if a['candidate_id']==event['selected_candidate']),None)
   if a is None:return False
   expected,generated=set_card(prior,a,history);raw={k:v for k,v in generated[0].items() if k not in end.BIND_KEYS}
   if expected!=actual or raw!=event:raise ValueError('preparation independent replay differs')
   return True
  end.RUNTIME_TRANSITION_VERIFIER=runtime_verify
  def verify(events,shots,runtime):
   proofs=original_verify(events,shots,runtime)
   for event in events:
    if event['action_type']=='set_item':
     cap=batch.classification(next(e for e in runtime if e['event_seq']==event['seq'])['legacy_continuation']['game_state']['cards'][event['source_instance_id']]['card_id'])
     proofs.append(dict(event_seq=event['seq'],card_id=next(e for e in runtime if e['event_seq']==event['seq'])['legacy_continuation']['game_state']['cards'][event['source_instance_id']]['card_id'],kind='set_item',source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'],certain_growth_difference=0,duration='none'))
   return proofs
  end.verify_new_events=verify
  yield
 finally:
  candidates.NORMAL_PROJECTION=original_projection;actions.apply=original_apply;actions.response_inventory=original_response;end.verify_new_events=original_verify;end.RUNTIME_TRANSITION_VERIFIER=original_runtime;actions.PLACEMENT_CAPABILITY_VALIDATOR=original_attachment;actions.PREPARED_REACTION_CLASSIFIER=original_reaction;end.CONCEALED_PREPARATION_CLASSIFIER=original_end_prepared
