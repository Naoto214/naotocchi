"""Current source-bound discarded companion recovery, independent of selection."""
import copy,hashlib
import proxy_population_departure_order as departure_order
from contextlib import contextmanager
import proxy_continuation_batch as batch
import proxy_continuation_rules as rules
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers
import proxy_resource_value_response as response

DESCRIPTORS={
 'C-cat_friend':dict(reference='72-companion-26-card-text-draft.md#C-cat_friend',section_sha256='41b133fc4248abc95361a57dda56978e1c017e76af74322ca8cbd92ce9cc8880',source_cost='self_board_to_bottom',exclude_same_card_name=True,top_order_after_return=False),
 'G-animal-shogi':dict(reference='83-play-batch-3-card-text-draft.md#G-animal-shogi',section_sha256='024aa8a62dcea8ff9a571d7e1d52859a54eb9bf590b4dabfc5927c05e59a1dec',source_cost='quick_time_two',exclude_same_card_name=False,top_order_after_return=True)}

def descriptor(card):
 row=copy.deepcopy(DESCRIPTORS[card]);body,digest=rules.source_section(row['reference'])
 if hashlib.sha256(body.encode()).hexdigest()!=row['section_sha256']:raise ValueError('recovery source changed')
 row['source_raw_sha256']=digest;return row

def targets(game,actor,card):
 cap=descriptor(card);companion_ids={r['card_id'] for r in rules.table()['cards'] if r['card_type']=='companion'}
 return sorted(s for s in game['players'][actor]['discard'] if game['cards'][s]['card_id'] in companion_ids and (not cap['exclude_same_card_name'] or game['cards'][s]['card_id']!=card))

def board_candidates(current,events,source):
 g=current['game_state'];ctx=current['response_context'];actor=ctx['priority_actor'];p=g['players'][actor];card=g['cards'][source]['card_id'];cap=descriptor(card)
 if cap['source_cost']!='self_board_to_bottom' or source not in p['board']['companions']:raise ValueError('recovery board source differs')
 since=triggers._since(events,actor)
 used=any(e['seq']>since and e.get('source_zone')=='board' and e.get('source_instance_id')==source and e['action_type'] in ('activate_response','activate_companion_ability') for e in events)
 options=targets(g,actor,card);rows=[]
 if actor==g['turn_player'] and not used:
  for target in options:
   rows.append(dict(candidate_id='response-activate-ability-'+source+'-target-'+target,candidate_family='triggered_ability',action_type='activate_board_ability',source_instance_id=source,card_id=card,card_copy_id=g['cards'][source]['card_copy_id'],target_instance_ids=[target],candidate_variant=None,base_time_cost=0,source_references=[cap['reference']]))
 reason='enumerated_discard_recovery' if rows else 'own_turn_required' if actor!=g['turn_player'] else 'already_used_this_turn' if used else 'requires_other_discarded_companion'
 return rows,dict(source_instance_id=source,card_id=card,reason_code=reason,source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'])

def activate(envelope,record,events,mandatory=False):
 if mandatory:raise ValueError('recovery is optional activation')
 before=state.current(envelope);action=record['selected_action'];source=action['source_instance_id'];actor=before['response_context']['priority_actor']
 if action not in board_candidates(before,events,source)[0] or rules.used(envelope,source,'activated_normal_action'):raise ValueError('recovery action unavailable')
 cap=descriptor(action['card_id']);seq=before['last_event_seq']+1
 # Costs are paid before opening the chain. Equipment departure is the same
 # physical movement contract; no card value or replacement preference exists.
 for item,row in envelope['runtime']['attachments'].items():
  if row['target_instance_id']!=source:continue
  card=before['game_state']['cards'][item]['card_id'];equipment=batch.classification(card) if card in batch.CAPABILITIES else rules.classification(card)
  body,_=rules.source_section(equipment['reference'])
  if equipment['timing']=='companion_departure':
   if '自分による交代・コスト支払い・山札への移動を防がない' not in body:raise ValueError('source cost equipment obligation unproved')
  elif equipment['timing'] not in ('own_turn_start','own_turn_end'):raise ValueError('source cost equipment timing unproved')
 paid=state.detach_target(envelope,source);after=state.current(paid);p=after['game_state']['players'][actor];p['board']['companions'].remove(source);p['deck'].append(source)
 for key in ('stat_effects','conditional_effects'):
  if key in paid['runtime']:paid['runtime'][key]=[r for r in paid['runtime'][key] if r['target_instance_id']!=source]
 paid['runtime']['ability_uses'].append(dict(source_instance_id=source,ability_key='activated_normal_action',turn_player=after['game_state']['turn_player'],round=after['game_state']['round'],count=1))
 link_id=f'response-link-{seq}-{source}';payment=dict(time=0,source_to_deck_bottom=source)
 receipt=dict(contract='discard_recovery_source_cost_470',paid_event_seq=seq,actor=actor,source_instance_id=source,card_copy_id=action['card_copy_id'])
 link=dict(link_id=link_id,action_type='activate_board_ability',source_zone='board',actor=actor,card_id=action['card_id'],card_copy_id=action['card_copy_id'],source_instance_id=source,target_instance_ids=action['target_instance_ids'],candidate_variant=action['candidate_variant'],payment=payment,source_references=action['source_references'],source_cost_receipt=receipt)
 after['activation_zone'].append(link);ctx=before['response_context'];transition=triggers.old.start.seeded._response_transition_context(after);transition.update(window_kind='after_normal_action',chain_links=copy.deepcopy(ctx['chain_links']),chain_status=ctx['chain_status'])
 changed=triggers.old.start.seeded.response_119.transition_response_window(transition,dict(kind='activate',actor=actor,link_id=link_id));triggers.old.start.seeded._apply_transition_result(after,changed)
 after['last_event_seq']=seq;after['game_state']['phase']='turn_end_response' if ctx['source_phase']=='turn_end' else 'response_window';after['continuation_state_sha256']=triggers.old.start._hash(after)
 # Install the complete atomic after state before validation: there is no valid
 # intermediate envelope with a detached source and an unpaid board reference.
 result=copy.deepcopy(paid);result.update(legacy_continuation=triggers.old.start._payload(after),event_seq=seq);state.validate(result)
 ordered=departure_order.prepare(envelope,result);after=state.current(result)
 event=triggers._raw_event(before,after,'activate_response',actor,source_instance_id=source,source_zone='board',selected_candidate=action['candidate_id'],chain_link_id=link_id,target_instance_ids=action['target_instance_ids'],payment=payment,trigger_origin_event_seq=ctx['origin_event_seq'],mandatory=False,source_reference=cap['reference'])
 if ordered is not None:event['departure_order']=ordered
 return result,[triggers.actions.bind_event(envelope,result,event)]

def activate_normal(envelope,action,events):
 before=state.current(envelope);g,p=batch.ready(envelope,action,events)
 if action['card_id']!='C-cat_friend' or action['action_type']!='activate_companion_ability':raise ValueError('normal recovery action differs')
 bridge=copy.deepcopy(envelope);triggers.actions._placement_window(bridge,g['turn_player']);bridge['legacy_continuation']['response_context'].update(source_phase='normal_action',origin_event_seq=envelope['event_seq']+1)
 rows,_=board_candidates(state.current(bridge),events,action['source_instance_id']);chosen=next((a for a in rows if a['target_instance_ids']==action['target_instance_ids']),None)
 if chosen is None:raise ValueError('normal recovery target differs')
 after,_=activate(bridge,dict(selected_action=chosen),events);after['legacy_continuation']['response_context']['response_opportunity_index']=1
 # The bridge is only a call adapter. Its artificial pre-window is absent from
 # the saved event; all before hashes bind the actual normal state.
 current=state.current(after);link=current['activation_zone'][-1]
 event=triggers._raw_event(before,current,'activate_companion_ability',g['turn_player'],source_instance_id=action['source_instance_id'],source_zone='board',selected_candidate=action['candidate_id'],chain_link_id=link['link_id'],target_instance_ids=action['target_instance_ids'],payment=link['payment'],trigger_origin_event_seq=current['response_context']['origin_event_seq'],mandatory=False,source_reference=descriptor(action['card_id'])['reference'])
 if departure_order.ENABLED:event['departure_order']=departure_order.receipt(envelope,after)
 return after,[triggers.actions.bind_event(envelope,after,event)]

def resolve(current,initial):
 ctx=current['response_context'];links=current['activation_zone']
 if ctx['chain_status']!='resolving' or not links or links[-1]['card_id']!='C-cat_friend':raise ValueError('recovery resolution boundary differs')
 link=links[-1];cap=descriptor(link['card_id']);actor=link['actor'];after=copy.deepcopy(current);p=after['game_state']['players'][actor]
 if len(link['target_instance_ids'])!=1:raise ValueError('recovery target count')
 target=link['target_instance_ids'][0];returned=target in targets(after['game_state'],actor,link['card_id'])
 if returned:p['discard'].remove(target);p['hand'].append(target)
 after['activation_zone'].pop();after['response_context']['chain_links'].pop()
 if not after['activation_zone']:
  ending=ctx['source_phase']=='turn_end' or current['game_state']['phase']=='turn_end_response';after['response_context'].update(chain_status='empty',consecutive_passes=2 if ending else 0);after['game_state']['phase']='turn_end' if ending else 'normal_action';after['return_target']='turn_end' if ending else 'normal_action_opportunity'
 after['last_event_seq']=current['last_event_seq']+1;after['continuation_state_sha256']=triggers.old.start._hash(after)
 event=triggers._raw_event(current,after,'resolve_board_ability',actor,source_instance_id=link['source_instance_id'],source_zone='board',chain_link_id=link['link_id'],source_reference=cap['reference'],result=dict(target_instance_id=target,returned_to_hand=returned,growth_added=0))
 return dict(final_continuation_state=triggers.old.start._payload(after),last_valid_event_seq=after['last_event_seq'],new_events=[event],new_snapshots=[triggers.old._snapshot(after)],new_decisions=[],completed=False)

def hand_candidates(current,actor,source,entry,events=None,runtime=None):
 g=(batch.RESPONSE_FULL_CURRENT or current)['game_state'];cap=descriptor('G-animal-shogi');p=g['players'][actor]
 template=next(a for a in entry['actions'] if a['action_type']=='use_play')
 if template['base_time_cost']!=2 or template['source_text_reference']!=cap['reference']:raise ValueError('recovery registered payment/source differs')
 options=targets(g,actor,'G-animal-shogi');rows=[]
 if p['time']>=2:
  for target in options:
   row=triggers.old.start._hand_detail(g,actor,source,entry,template);row.update(candidate_id=triggers.old.start.response_id('use_play',source,target_instance_id=target,registered_variants=template['candidate_variants']),target_instance_ids=[target]);rows.append(row)
 reason='enumerated_discard_recovery' if rows else 'insufficient_time' if p['time']<2 else 'requires_discarded_companion'
 return rows,dict(card_id='G-animal-shogi',reason_code=reason,source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'])

def resolve_quick(envelope,initial):
 import proxy_continuation_payments as payments
 import proxy_continuation_choices as choices
 current=state.current(envelope);ctx=current['response_context'];link=current['activation_zone'][-1]
 if ctx['chain_status']!='resolving' or link['card_id']!='G-animal-shogi' or link['action_type']!='use_play' or len(link['target_instance_ids'])!=1:raise ValueError('quick recovery boundary differs')
 cap=descriptor(link['card_id']);after=copy.deepcopy(envelope);after['event_seq']+=1;c=after['legacy_continuation'];p=c['game_state']['players'][link['actor']];target=link['target_instance_ids'][0];returned=target in targets(c['game_state'],link['actor'],link['card_id']);decisions=[];position=None
 if returned:
  p['discard'].remove(target);p['hand'].append(target)
  if p['deck']:
   if initial is None:raise ValueError('quick recovery requires existing seed context')
   choice=choices.resolve(initial,current,link['actor'],[dict(position='top'),dict(position='bottom')],'ability_topdeck_order',link['link_id']);decisions.append(choice);position=choice['selected_action']['option']['position']
   if position=='bottom':p['deck'].append(p['deck'].pop(0))
 c['activation_zone'].pop();c['response_context']['chain_links'].pop();p['discard'].append(link['source_instance_id'])
 if not c['activation_zone']:
  ending=ctx['source_phase']=='turn_end' or current['game_state']['phase']=='turn_end_response';c['response_context'].update(chain_status='empty',consecutive_passes=2 if ending else 0);c['game_state']['phase']='turn_end' if ending else 'normal_action';c['return_target']='turn_end' if ending else 'normal_action_opportunity'
 state.validate(after);event=payments.transition_event(envelope,after,'resolve_targeted_zone_move',link['actor'],source_instance_id=link['source_instance_id'],chain_link_id=link['link_id'],source_reference=cap['reference'],created_effect=dict(target_instance_id=target,effect_applied=returned,topdeck_position=position))
 result=payments.forced_result(envelope,after,event);result['new_decisions']=decisions;return result

@contextmanager
def scope():
 import proxy_population_departure as departure
 import proxy_continuation_candidates as candidates
 import proxy_continuation_actions as actions
 from proxy_mandatory_policy_contract import canonical
 import proxy_continuation_payments as payments
 import proxy_continuation_board_links as board_links
 import proxy_continuation_end as end
 old_select=candidates.select;old_apply=actions.apply
 old_hands=payments.hand_candidates;old_payment_resolve=payments.resolve;old_quicks=payments.QUICK_CARDS;old_caps=copy.deepcopy(batch.CAPABILITIES)
 quick_descriptor=dict(kind='targeted_zone_move',timing='discard_companion_recovery',base_time_cost=2,action_type='use_play',reference=DESCRIPTORS['G-animal-shogi']['reference'],semantic_section_sha256=DESCRIPTORS['G-animal-shogi']['section_sha256'])
 def hands(current,actor,source,entry,events=None,runtime=None):
  if (batch.RESPONSE_FULL_CURRENT or current)['game_state']['cards'][source]['card_id']=='G-animal-shogi':return hand_candidates(current,actor,source,entry,events,runtime)
  return old_hands(current,actor,source,entry,events,runtime)
 def payment_resolve(envelope,initial=None):
  if envelope['legacy_continuation']['activation_zone'][-1]['card_id']=='G-animal-shogi':return resolve_quick(envelope,initial)
  return old_payment_resolve(envelope,initial)
 original=batch.response_enumerator;old_board=triggers.board_candidates;old_activate=triggers.activate;old_resolve=triggers.resolve;old_refs=board_links.validate_board_references;old_supported=triggers.SUPPORTED_EFFECTS;old_runtime=end.RUNTIME_TRANSITION_VERIFIER;old_verify=end.verify_new_events
 def select(envelope,inventory,context,policy,inputs=None):
  details=inventory['legal_candidate_details'];cats=[a for a in details if a['action_type']=='activate_companion_ability' and a['card_id']=='C-cat_friend']
  if policy!='legacy_107_114_116' or not cats:return old_select(envelope,inventory,context,policy,inputs)
  if canonical(candidates.audit(envelope,inventory['public_history']))!=canonical(inventory):raise ValueError('recovery complete normal inventory differs')
  for a in cats:activate_normal(envelope,a,inventory['public_history'])
  g=envelope['legacy_continuation']['game_state'];replacements=[a for a in details if a['action_type']=='place_companion' and len(g['players'][g['turn_player']]['board']['companions'])==3]
  for a in replacements:departure.replace_companion(envelope,a,inventory['public_history'])
  return departure.select_verified_zero_immediate(envelope,inventory,context,policy,cats+replacements,'source_cost_discard_recovery_470',descriptor('C-cat_friend')['source_raw_sha256'])
 def apply(envelope,record,inputs):
  a=record.get('selected_action',{})
  if a.get('card_id')=='C-cat_friend' and a.get('action_type')=='activate_companion_ability':
   if canonical(candidates.select(envelope,record['inventory'],record['context'],record['policy_id'],inputs))!=canonical(record):raise ValueError('normal recovery choice changed')
   return activate_normal(envelope,a,inputs['public_events'])
  return old_apply(envelope,record,inputs)
 def boards(current,events,source,slot=None,runtime=None):
  if current['game_state']['cards'][source]['card_id']=='C-cat_friend':return board_candidates(current,events,source)
  return old_board(current,events,source,slot,runtime)
 def activation(envelope,record,events,mandatory=False):
  return activate(envelope,record,events,mandatory) if record['selected_action'].get('card_id')=='C-cat_friend' else old_activate(envelope,record,events,mandatory)
 def resolution(current,initial):
  return resolve(current,initial) if current['activation_zone'][-1]['card_id']=='C-cat_friend' else old_resolve(current,initial)
 def references(envelope):
  projected=copy.deepcopy(envelope);g=envelope['legacy_continuation']['game_state'];refs=[]
  for link in envelope['legacy_continuation']['activation_zone']:
   if 'source_cost_receipt' not in link:continue
   source=link['source_instance_id'];actor=link['actor'];receipt=link['source_cost_receipt'];card=g['cards'][source];p=g['players'][actor];seq=receipt.get('paid_event_seq')
   expected=dict(contract='discard_recovery_source_cost_470',paid_event_seq=seq,actor=actor,source_instance_id=source,card_copy_id=card['card_copy_id'])
   if type(seq) is not int or not 0<seq<=envelope['event_seq'] or receipt!=expected or link['link_id']!=f'response-link-{seq}-{source}' or link['source_zone']!='board' or link['action_type']!='activate_board_ability' or link['card_id']!='C-cat_friend' or card['card_id']!=link['card_id'] or card['card_copy_id']!=link['card_copy_id'] or canonical(link['payment'])!=canonical(dict(time=0,source_to_deck_bottom=source)) or source not in p['deck']+p['hand']+p['discard']:raise ValueError('invalid paid source reference')
   refs.append(link)
  projected['legacy_continuation']['activation_zone']=[l for l in projected['legacy_continuation']['activation_zone'] if 'source_cost_receipt' not in l]
  identifiers=[l['link_id'] for l in envelope['legacy_continuation']['activation_zone']]
  if len(identifiers)!=len(set(identifiers)):raise ValueError('duplicate activation link ID')
  return old_refs(projected)+refs
 def runtime_verify(before,after,event,history=None):
  if event.get('action_type')=='activate_companion_ability' and before['legacy_continuation']['game_state']['cards'].get(event.get('source_instance_id'),{}).get('card_id')=='C-cat_friend':
   try:
    inv=candidates.audit(before,history or []);a=next(a for a in inv['legal_candidate_details'] if a['candidate_id']==event['selected_candidate']);expected,generated=activate_normal(before,a,history or []);raw={k:v for k,v in generated[0].items() if k not in end.BIND_KEYS}
    return canonical(expected)==canonical(after) and canonical(raw)==canonical(event)
   except (ValueError,KeyError,TypeError,StopIteration):return False
  if event.get('action_type')=='activate_response' and before['legacy_continuation']['game_state']['cards'].get(event.get('source_instance_id'),{}).get('card_id')=='C-cat_friend':
   try:
    rows,_=board_candidates(state.current(before),history or [],event['source_instance_id']);a=next(a for a in rows if a['candidate_id']==event['selected_candidate']);expected,generated=activate(before,dict(selected_action=a),history or []);raw={k:v for k,v in generated[0].items() if k not in end.BIND_KEYS}
    return canonical(expected)==canonical(after) and canonical(raw)==canonical(event)
   except (ValueError,KeyError,TypeError,StopIteration):return False
  return old_runtime(before,after,event,history) if old_runtime else False
 def verify(events,shots,envelopes):
  proofs=old_verify(events,shots,envelopes);byseq={e['event_seq']:e for e in envelopes}
  for event in events:
   if event['action_type']!='activate_companion_ability' or event['seq']-1 not in byseq:continue
   before=byseq[event['seq']-1]
   if before['legacy_continuation']['game_state']['cards'].get(event.get('source_instance_id'),{}).get('card_id')!='C-cat_friend':continue
   if not runtime_verify(before,byseq[event['seq']],event,[e for e in events if e['seq']<event['seq']]):raise ValueError('normal recovery provenance differs')
   cap=descriptor('C-cat_friend');proofs.append(dict(event_seq=event['seq'],kind=event['action_type'],card_id='C-cat_friend',source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'],certain_growth_difference=0,duration='activation_until_resolution'))
  return proofs
 def enumerate(current,events,capability_classifier=None,hand_classifier=None):
  additions=[];proofs=[];old_reason=response.reached.board_reason
  def reason(game,actor,source,context=None,active=()):
   if game['cards'][source]['card_id'] not in DESCRIPTORS or DESCRIPTORS[game['cards'][source]['card_id']]['source_cost']!='self_board_to_bottom':return old_reason(game,actor,source,context,active)
   local=dict(current,game_state=game,response_context=context);rows,proof=board_candidates(local,events,source);additions.extend(rows);proofs.append(proof);return proof
  try:
   response.reached.board_reason=reason
   result=original(current,events,capability_classifier=capability_classifier,hand_classifier=hand_classifier)
  finally:response.reached.board_reason=old_reason
  details=sorted(result['legal_candidate_details']+additions,key=lambda r:r['candidate_id']);ids=[r['candidate_id'] for r in details]
  if len(ids)!=len(set(ids)):raise ValueError('recovery target ID collision')
  return dict(result,legal_candidate_ids=ids,legal_candidate_details=details,discard_recovery_classifications=proofs)
 try:
  candidates.select=select;actions.apply=apply
  payments.hand_candidates=hands;payments.resolve=payment_resolve;payments.QUICK_CARDS=dict(old_quicks,**{'G-animal-shogi':quick_descriptor});batch.CAPABILITIES['G-animal-shogi']=quick_descriptor
  batch.response_enumerator=enumerate;triggers.board_candidates=boards;triggers.activate=activation;triggers.resolve=resolution;board_links.validate_board_references=references;triggers.SUPPORTED_EFFECTS=old_supported|{'C-cat_friend'};end.RUNTIME_TRANSITION_VERIFIER=runtime_verify;end.verify_new_events=verify
  yield
 finally:
  candidates.select=old_select;actions.apply=old_apply
  payments.hand_candidates=old_hands;payments.resolve=old_payment_resolve;payments.QUICK_CARDS=old_quicks;batch.CAPABILITIES.clear();batch.CAPABILITIES.update(old_caps)
  batch.response_enumerator=original;triggers.board_candidates=old_board;triggers.activate=old_activate;triggers.resolve=old_resolve;board_links.validate_board_references=old_refs;triggers.SUPPORTED_EFFECTS=old_supported;end.RUNTIME_TRANSITION_VERIFIER=old_runtime;end.verify_new_events=old_verify
