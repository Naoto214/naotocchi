"""Shared targeted quick-use inventory and existing final-time resolution."""
import copy,hashlib
from contextlib import contextmanager
import proxy_continuation_rules as rules
import proxy_continuation_conditions as conditions
import proxy_continuation_state as state
import proxy_continuation_actions as actions
import proxy_resource_value_trajectory as old
import proxy_continuation_batch as batch
import proxy_continuation_end as end
import proxy_continuation_payments as payments
import proxy_new_seed_mixed_replay_406 as final_time

FINAL_SECTION_SHA='53903bdea55bc89432f49328db3116882aaaaa95c0afd07b2e1ef9df557351eb'


def final_capability():
 body,digest=rules.source_section('91-event-21-card-text-draft.md#E-final-time')
 if hashlib.sha256(body.encode()).hexdigest()!=FINAL_SECTION_SHA:raise ValueError('final-time canonical semantic section changed')
 return dict(reference='91-event-21-card-text-draft.md#E-final-time',source_raw_sha256=digest)


def hand_candidates(current,events,actor,source,entry):
 g=(batch.RESPONSE_FULL_CURRENT or current)['game_state'];p=g['players'][actor];card=g['cards'][source]['card_id']
 if card=='E-boss' and batch.candidates.HISTORY_ADAPTER is not None:
  losses=batch.candidates.HISTORY_ADAPTER(g,events)
  if actor not in losses:return [],dict(card_id=card,reason_code='requires_own_main_battle_loss_this_turn',source_reference=entry['actions'][0]['source_text_reference'])
 if card in payments.QUICK_CARDS:return payments.hand_candidates(current,actor,source,entry,events)
 if card!='E-final-time':
  if not any(a['action_type'] in ('use_play','use_item','use_event') for a in entry['actions']):
   refs=sorted({a['source_text_reference'] for a in entry['actions']})
   for ref in refs:rules.source_section(ref)
   return [],dict(card_id=card,reason_code='no_quick_use_method_from_hand',source_reference=refs[0])
  if card=='G-asteroids-classic':
   cap=conditions.prove(card,g,actor);entries=old.start.load_candidate_rows()
   targets=[s for s in p['board']['prepared'] if any(a['action_type']=='attach_item' and a['base_time_cost']>=3 for a in entries[g['cards'][s]['card_id']]['actions'])]
   if not targets:return [],dict(card_id=card,reason_code='required_equipment_target_absent',source_reference=cap['source_reference'],condition_proof=cap)
  action=next((a for a in entry['actions'] if a['action_type'] in ('use_play','use_item','use_event')),None)
  if action is not None and action['target_rule']=='one own main' and p['board']['main'] is None:
   body,_=rules.source_section(action['source_text_reference'])
   if '自分のメイン1枚を対象' not in body:raise ValueError('own main target source differs')
   return [],dict(card_id=card,reason_code='required_own_main_target_absent',source_reference=action['source_text_reference'])
  proof=conditions.prove(card,g,actor)
  if proof is not None and proof['status']=='unmet':return [],dict(card_id=card,reason_code=conditions.PREREQUISITES[card]['reason'],source_reference=proof['source_reference'],condition_proof=proof)
  return [],None
 cap=final_capability();proof=conditions.prove(card,g,actor);reason=None
 if proof['status']=='unmet':return [],dict(card_id=card,reason_code='requires_main_eight_or_r10',source_reference=cap['reference'],condition_proof=proof)
 starts=[e['seq'] for e in events if e['action_type'] in ('turn_start_and_egg_draw','turn_start_and_normal_draw')]
 if not starts:raise ValueError('final-time actor turn history unavailable')
 used=any(e['seq']>=max(starts) and e['actor']==actor and e['action_type'] in ('activate_response','use_event') and e.get('source_zone')!='board' and g['cards'].get(e.get('source_instance_id'),{}).get('card_id')==card for e in events)
 template=next(a for a in entry['actions'] if a['action_type']=='use_event')
 if template['base_time_cost']!=2 or template['source_text_reference']!=cap['reference']:raise ValueError('final-time registered payment/source differs')
 targets=[s for s in p['discard'] if old.start.load_candidate_rows()[g['cards'][s]['card_id']]['card_type']!='main']
 reason='same_name_used_this_turn' if used else 'insufficient_time' if p['time']<2 else 'required_target_absent' if not targets else 'enumerated_targeted_quick_action'
 details=[]
 if reason=='enumerated_targeted_quick_action':
  for target in targets:
   details.append(dict(candidate_id=old.start.response_id('use_event',source,target_instance_id=target,registered_variants=template['candidate_variants']),candidate_family='hand_quick_use',action_type='use_event',card_id=card,card_copy_id=g['cards'][source]['card_copy_id'],source_instance_id=source,target_instance_ids=[target],candidate_variant=None,base_time_cost=2,source_references=[cap['reference']]))
 return sorted(details,key=lambda d:d['candidate_id']),dict(card_id=card,reason_code=reason,source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'])


def activate(envelope,record,inputs,initial=None,verify_record=True):
 current=state.current(envelope);g=current['game_state'];normal=g['phase']=='normal_action';action=record['selected_action'];card=action['card_id']
 actor=g['turn_player'] if normal else current['response_context']['priority_actor'];p=g['players'][actor];source=action['source_instance_id']
 if normal:
  if action not in batch.candidates.audit(envelope,inputs['public_events'])['legal_candidate_details']:raise ValueError('normal quick action absent from complete inventory')
  if verify_record:
   rebuilt=batch.candidates.select(envelope,record['inventory'],record['context'],record['policy_id'],inputs)
   if rebuilt!=record:raise ValueError('normal quick decision differs from fresh complete inventory')
 else:
  chance=actions.response_inventory(envelope,initial,inputs['public_events'])
  if chance!=record['candidate_set_evidence'] or action not in chance['legal_candidate_details']:raise ValueError('quick response differs from fresh complete inventory')
 cap=batch.classification(card);cost=payments.QUICK_CARDS[card]['base_time_cost'] if card in payments.QUICK_CARDS else 2 if card=='E-final-time' else 1
 if source not in p['hand'] or g['cards'][source]['card_id']!=card or p['time']<cost or current['pending_triggers']:raise ValueError('quick source/payment differs')
 if card=='E-final-time':
  details,_=hand_candidates(current,inputs['public_events'],actor,source,old.start.load_candidate_rows()[card])
  if not any(d['target_instance_ids']==action['target_instance_ids'] for d in details):raise ValueError('final-time target not legal at activation')
 elif card=='G-hit-blow':
  if action['candidate_variant'] not in old.start.VARIANTS or action['target_instance_ids'] or not p['deck']:raise ValueError('declared quick action differs')
 elif card=='E-first-date':
  if p['board']['partner_stage']!=0 or action['target_instance_ids']!=[p['board']['partner']]:raise ValueError('relationship quick target not legal at activation')
 elif card in payments.QUICK_CARDS:
  details,_=payments.hand_candidates(current,actor,source,old.start.load_candidate_rows()[card],inputs['public_events'],envelope['runtime'])
  if not any(d['target_instance_ids']==action['target_instance_ids'] and (not payments.QUICK_CARDS[card].get('choose_parameter') or d.get('candidate_variant')==action.get('candidate_variant')) for d in details):raise ValueError('payment modifier activation condition differs')
 elif card!='I-c_coin2':raise ValueError('quick activation effect capability unavailable')
 after=copy.deepcopy(current);seq=current['last_event_seq']+1;after['last_event_seq']=seq
 if normal:
  wrapper=state.advance(envelope,after,seq);actions._placement_window(wrapper,actor);after=state.current(wrapper);after['response_context']['source_phase']='normal_action';after['game_state']['phase']='response_window'
 owner=after['game_state']['players'][actor];owner['time']-=cost;owner['hand'].remove(source);link_id=f'response-link-{seq}-{source}'
 link=dict(link_id=link_id,action_type=action['action_type'],actor=actor,card_id=card,card_copy_id=g['cards'][source]['card_copy_id'],source_instance_id=source,target_instance_ids=copy.deepcopy(action['target_instance_ids']),candidate_variant=action['candidate_variant'] if card=='G-hit-blow' or payments.STAT_CARDS.get(card,{}).get('choose_parameter') else None,payment=dict(time=cost),source_references=[cap['reference']])
 after['activation_zone'].append(link);transition=old.start.seeded._response_transition_context(after);transition['window_kind']='after_normal_action'
 changed=old.start.seeded.response_119.transition_response_window(transition,dict(kind='activate',actor=actor,link_id=link_id));old.start.seeded._apply_transition_result(after,changed)
 if normal:after['response_context']['response_opportunity_index']=1
 after['continuation_state_sha256']=old.start._hash(after)
 event=dict(seq=seq,action_type=action['action_type'] if normal else 'activate_response',actor=actor,selected_candidate=action['candidate_id'],source_instance_id=source,candidate_variant=link['candidate_variant'],payment=dict(time=cost),target_instance_ids=link['target_instance_ids'],chain_link_id=link_id,source_reference=cap['reference'],game_state_before_sha256=old.start.opening._stop_state_sha256(g),game_state_after_sha256=old.start.opening._stop_state_sha256(after['game_state']),continuation_state_before_sha256=old.start._hash(current),continuation_state_after_sha256=old.start._hash(after))
 result=state.advance(envelope,after,seq);return result,[actions.bind_event(envelope,result,event)]


def response_pass(envelope,record,initial,events):
 current=state.current(envelope);ctx=current['response_context']
 opportunity=actions.response_inventory(envelope,initial,events)
 if opportunity!=record['candidate_set_evidence'] or record['selected_action'] not in opportunity['legal_candidate_details'] or record['selected_candidate']!='response-pass':raise ValueError('response pass differs from fresh complete inventory')
 transition=old.start.seeded._response_transition_context(current);transition['window_kind']='after_normal_action'
 changed=old.start.seeded.response_119.transition_response_window(transition,dict(kind='response_pass',actor=record['actor']))
 after=copy.deepcopy(current);old.start.seeded._apply_transition_result(after,changed)
 if changed['chain_status']=='empty' and changed['consecutive_passes']==1:after['return_target']=current['return_target']
 if changed['chain_status']=='empty' and changed['consecutive_passes']==2:
  end_return=current['game_state']['phase']=='turn_end_response' or ctx['source_phase']=='turn_end'
  after['game_state']['phase']='turn_end' if end_return else 'normal_action';after['return_target']='turn_end' if end_return else 'normal_action_opportunity'
 after['last_event_seq']+=1;after['continuation_state_sha256']=old.start._hash(after)
 event=dict(seq=after['last_event_seq'],action_type='response_pass',actor=record['actor'],selected_candidate='response-pass',game_state_before_sha256=old.start.opening._stop_state_sha256(current['game_state']),game_state_after_sha256=old.start.opening._stop_state_sha256(after['game_state']),continuation_state_before_sha256=old.start._hash(current),continuation_state_after_sha256=old.start._hash(after),result={k:copy.deepcopy(after['response_context'][k]) for k in ('priority_actor','consecutive_passes','chain_status')})
 event['result']['return_target']=after['return_target'];result=state.advance(envelope,after,after['last_event_seq'])
 return result,[actions.bind_event(envelope,result,event)]


def resolve(current,initial):
 final_capability();original=final_time.hand_bottom_decision;before=copy.deepcopy(current)
 # Reuse406's tested target recheck, conditional two draws and seeded hand
 # choice. The registered seed order comes from the signed initial, not a route
 # switch or any hidden content.
 def choose(row,actor,hand,game):
  return original(dict(row,path_id=initial['path_id']),actor,hand,game)
 try:
  final_time.hand_bottom_decision=choose
  end_return=before['game_state']['phase']=='turn_end_response'
  projected=copy.deepcopy(before);projected['game_state']['phase']='turn_end_response' if end_return else 'response_window'
  projected['continuation_state_sha256']=old.start._hash(projected)
  row=old._row(projected,initial['path_id']);result=final_time.resolve_final_time(row,return_phase='turn_end' if end_return else 'normal_action')
  event=result['new_events'][0];event['game_state_before_sha256']=old.start.opening._stop_state_sha256(before['game_state']);event['continuation_state_before_sha256']=old.start._hash(before)
  return result
 finally:final_time.hand_bottom_decision=original


@contextmanager
def scope(initial=None):
 original=actions.apply;enumerate_original=old.reached_response.enumerate_opportunity;verify_original=end.verify_new_events
 # Batch's classifier bridge is already installed. Call its underlying
 # original adapter with both semantic extension hooks to retain the full board.
 try:
  def enumerate_opportunity(current,events):
   # The underlying function object is captured by batch scope; expose it there
   # rather than layer a second internal board projection.
   return batch.response_enumerator(current,events,capability_classifier=batch.response_capability,hand_classifier=hand_candidates)
  old.reached_response.enumerate_opportunity=enumerate_opportunity
  def apply(envelope,record,inputs):
   action=record.get('selected_action',{})
   if action.get('action_type')=='response_pass':return response_pass(envelope,record,initial,inputs['public_events'])
   if action.get('card_id') in {'E-final-time','G-hit-blow','I-c_coin2','E-first-date'}|payments.QUICK_CARDS.keys() and action.get('action_type') in ('use_event','use_play','use_item'):return activate(envelope,record,inputs,initial)
   return original(envelope,record,inputs)
  def verify(events,shots,runtime):
   proofs=verify_original(events,shots,runtime);byseq={e['event_seq']:e for e in runtime}
   for event in events:
    if event['seq']-1 not in byseq:continue
    prior=byseq[event['seq']-1];g=prior['legacy_continuation']['game_state'];source=event.get('source_instance_id')
    supported={'E-final-time','G-hit-blow','I-c_coin2','E-first-date'}|payments.QUICK_CARDS.keys()
    if source is None or g['cards'][source]['card_id'] not in supported:continue
    card=g['cards'][source]['card_id'];kind=event['action_type'];activation=kind in ('activate_response','use_item','use_play','use_event')
    if not activation and not(card=='E-final-time' and kind=='resolve_event'):continue
    history=[e for e in events if e['seq']<event['seq']]
    if activation:
     actor=event['actor'];normal=g['phase']=='normal_action'
     chance=None if normal else actions.response_inventory(prior,initial,history)
     details=batch.candidates.audit(prior,history)['legal_candidate_details'] if normal else chance['legal_candidate_details']
     a=next((d for d in details if d['candidate_id']==event['selected_candidate']),None)
     if a is None:raise ValueError('historical quick activation absent from complete inventory')
     record=dict(actor=actor,selected_action=a,selected_candidate=a['candidate_id'],candidate_set_evidence=chance)
     expected,generated=activate(prior,record,dict(public_events=history),initial,verify_record=False);raw={k:v for k,v in generated[0].items() if k not in end.BIND_KEYS}
    else:
     if initial is None:raise ValueError('final-time provenance needs signed initial seed')
     result=actions.normalize_resolution_result(prior,resolve(state.current(prior),initial));expected=state.advance(prior,result['new_snapshots'][0]['continuation_state'],event['seq']);raw=result['new_events'][0]
    if expected!=byseq[event['seq']] or raw!=event:raise ValueError('quick independent provenance replay differs')
    cap=batch.classification(card);proofs.append(dict(event_seq=event['seq'],kind=kind,card_id=card,source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'],duration='activation_until_resolution' if activation else 'none'))
   return proofs
  actions.apply=apply;end.verify_new_events=verify;yield
 finally:actions.apply=original;old.reached_response.enumerate_opportunity=enumerate_original;end.verify_new_events=verify_original
