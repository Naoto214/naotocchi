"""Source-bound positive handlers using119 chains and existing typed effects.

These conditional operations require separately proven occurrence production.
They do not turn a supplied occurrence into authenticated history/admission.
"""
import copy
from contextlib import contextmanager
import proxy_population_trigger_latching as latching
import proxy_population_activation_reference as references
import proxy_continuation_state as state
import proxy_continuation_batch as batch
import proxy_continuation_triggers as triggers
import proxy_continuation_payments as payments
import proxy_continuation_choices as choices
from proxy_mandatory_policy_contract import canonical


def activate(envelope,action,occurrence):
 if canonical(action) not in [canonical(a) for a in latching.current_actions(envelope,occurrence)[0]]:raise ValueError('current positive trigger action differs')
 before=state.current(envelope);after=copy.deepcopy(envelope);after['event_seq']+=1;c=after['legacy_continuation'];g=c['game_state'];actor=occurrence['actor'];p=g['players'][actor];source=action['source_instance_id'];card=action['card_id'];cap=batch.classification(card);payment=dict(time=0)
 if card=='M-antlion-06':
  for cost in action['cost_instance_ids']:p['hand'].remove(cost);p['deck'].append(cost)
  payment['revealed_hand_world_to_bottom']=copy.deepcopy(action['cost_instance_ids'])
 after['runtime']['ability_uses'].append(dict(source_instance_id=source,ability_key=cap.get('ability_key',cap['timing']),turn_player=g['turn_player'],round=g['round'],count=1))
 link_id=f"response-link-{after['event_seq']}-{source}"
 link=dict(link_id=link_id,action_type='activate_board_ability',source_zone='board',actor=actor,card_id=card,card_copy_id=action['card_copy_id'],source_instance_id=source,target_instance_ids=copy.deepcopy(action['target_instance_ids']),candidate_variant=None,payment=payment,source_references=action['source_references'])
 c['activation_zone'].append(link)
 #119 owns alternation and activator's next opportunity. Only the06 group
 # owner/origin is bridged; actual before state is retained in all hashes.
 bridged=copy.deepcopy(before);bridged['response_context'].update(priority_actor=actor,origin_event_seq=occurrence['origin_event_seq']);transition=triggers.old.start.seeded._response_transition_context(bridged);transition.update(window_kind='after_normal_action',chain_links=copy.deepcopy(before['response_context']['chain_links']),chain_status=before['response_context']['chain_status'])
 changed=triggers.old.start.seeded.response_119.transition_response_window(transition,dict(kind='activate',actor=actor,link_id=link_id));triggers.old.start.seeded._apply_transition_result(c,changed)
 c['response_context']['origin_event_seq']=occurrence['origin_event_seq'];g['phase']='turn_end_response' if before['response_context']['source_phase']=='turn_end' else 'response_window';link['activation_receipt']=references.receipt(envelope,after,link);state.validate(after)
 event=payments.transition_event(envelope,after,'activate_response',actor,source_instance_id=source,source_zone='board',selected_candidate=action['candidate_id'],chain_link_id=link_id,target_instance_ids=action['target_instance_ids'],payment=payment,trigger_origin_event_seq=occurrence['origin_event_seq'],mandatory=False,source_reference=cap['reference'])
 triggers.old._verify_generated(before,state.current(after),[{k:v for k,v in event.items() if k not in triggers.end.BIND_KEYS}]);return after,[event]


def resolve(envelope,initial):
 before=state.current(envelope);ctx=before['response_context']
 if ctx['chain_status']!='resolving' or not before['activation_zone']:raise ValueError('positive resolution boundary differs')
 link=before['activation_zone'][-1];card=link['card_id'];source=link['source_instance_id'];actor=link['actor']
 if card not in latching.CARDS or link['source_zone']!='board':raise ValueError('unsupported positive board effect')
 cap=batch.classification(card);after=copy.deepcopy(envelope);after['event_seq']+=1;c=after['legacy_continuation'];p=c['game_state']['players'][actor];applied=False;decisions=[];detail={}
 if card in ('M-antlion-06','C-bat'):
  if len(link['target_instance_ids'])!=1:raise ValueError('positive target count differs')
  target=link['target_instance_ids'][0];zone=p['discard'] if card=='M-antlion-06' else p['board']['prepared'];applied=target in zone
  if applied:
   zone.remove(target);p['hand'].append(target)
   if card=='C-bat':after['runtime']['public_prepared'].pop(target);after['runtime']['attachments'].pop(target,None)
  detail=dict(target_instance_id=target,returned_instance_id=target if applied else None)
 elif card=='M-antlion-03' and p['board']['main']==source:
  decision=choices.resolve(initial,before,actor,[dict(parameter='power'),dict(parameter='wisdom')],'board_turn_stat_parameter',link['link_id']);decisions.append(decision)
  parameter=decision['selected_action']['option']['parameter'];payments.add_stat_modifier(after,actor,source,source,parameter);applied=True;detail=dict(parameter=parameter,effect_id=after['runtime']['stat_effects'][-1]['effect_id'])
 elif card=='P-cliff_goat' and p['board']['main'] is not None:
  payments.add_modifier(after,actor,source);applied=True;detail=dict(effect_id=after['runtime']['payment_effects'][-1]['effect_id'])
 c['activation_zone'].pop();c['response_context']['chain_links'].pop()
 if not c['activation_zone']:
  ending=ctx['source_phase']=='turn_end' or before['game_state']['phase']=='turn_end_response';c['response_context'].update(chain_status='empty',consecutive_passes=2 if ending else 0);c['game_state']['phase']='turn_end' if ending else 'normal_action';c['return_target']='turn_end' if ending else 'normal_action_opportunity'
 state.validate(after);event=payments.transition_event(envelope,after,'resolve_board_ability',actor,source_instance_id=source,source_zone='board',chain_link_id=link['link_id'],source_reference=cap['reference'],result=dict(effect_applied=applied,**detail));result=payments.forced_result(envelope,after,event);result['new_decisions']=decisions;return result


def validate_activation(after,events,before,action,occurrence):
 try:
  expected,generated=activate(before,action,occurrence)
  return [] if canonical([expected,generated])==canonical([after,events]) else ['positive activation replay differs']
 except (ValueError,KeyError,TypeError):return ['invalid positive activation']


@contextmanager
def scope():
 import proxy_continuation_candidates as candidates
 old_unit=candidates.UNIT_ADJUDICATOR;old_outcome=batch.outcome;old_transition=batch.transition
 old_stats=payments.STAT_CARDS;old_payment=payments.PAYMENT_CARDS;old_cap=payments.capability
 descriptors={}
 for card in ('M-antlion-03','P-cliff_goat'):
  cap=batch.classification(card);descriptors[card]=dict(reference=cap['reference'],semantic_section_sha256=batch.CAPABILITIES[card]['semantic_section_sha256'])
 descriptors['M-antlion-03'].update(kind='stat_modifier',timing='this_main_this_turn',choose_parameter=True,amount=1)
 # The existing source_instance_id is precisely the same partner identity; no
 # extra target or global relationship discount is introduced.
 descriptors['P-cliff_goat'].update(kind='payment_modifier',timing='next_same_partner_relationship_this_turn',payment_kind='relationship_same_source',amount=1)
 def capability(card):
  if card not in descriptors:return old_cap(card)
  cap=batch.classification(card);return dict(descriptors[card],source_raw_sha256=cap['source_raw_sha256'])
 def relationship_effects(envelope):
  g=envelope['legacy_continuation']['game_state'];actor=g['turn_player'];partner=g['players'][actor]['board']['partner']
  return [r for r in envelope['runtime']['payment_effects'] if r['controller']==actor and r['payment_kind']=='relationship_same_source' and r['source_instance_id']==partner]
 def adjudicate(envelope,unit):
  modifiers=relationship_effects(envelope)
  if unit['action_type']!='relationship' or not modifiers:return old_unit(envelope,unit) if old_unit else None
  g=envelope['legacy_continuation']['game_state'];actor=g['turn_player'];p=g['players'][actor];b=p['board'];reasons=[]
  if b['partner'] is None:reasons.append('relationship_partner_absent')
  if b['main'] is None:reasons.append('relationship_blocked_while_egg')
  if p['relationship_progressed']:reasons.append('relationship_limit_used')
  stage=b['partner_stage']
  if stage=='married':reasons.append('relationship_state_terminal')
  elif type(stage) is not int or stage not in (0,1,2,3) or unit['candidate_variant']!=('0-to-1','1-to-2','2-to-3','3-to-marriage')[stage]:raise ValueError('relationship variant differs')
  cost=max(0,1-sum(r['amount'] for r in modifiers))
  return [candidates._detail(unit,reasons,f"candidate-relationship-{actor}-{unit['candidate_variant']}",payment_time=cost,payment_effect_ids=sorted(r['effect_id'] for r in modifiers))]
 def project_payment(envelope,action):
  modified=copy.deepcopy(envelope);g=modified['legacy_continuation']['game_state'];g['players'][g['turn_player']]['time']+=1-action['evidence']['payment_time'];return modified
 def outcome(envelope,action,history=None):
  if action['action_type']!='relationship' or not relationship_effects(envelope):return old_outcome(envelope,action,history)
  # The old literal handler requires printed time1. A private call projection
  # supplies that precondition; actual discounted payment and before hashes
  # are checked/bound on the real envelope, never published as extra time.
  state.validate(envelope);batch.ready(envelope,action,history);cost=action['evidence']['payment_time'];p=envelope['legacy_continuation']['game_state']['players'][envelope['legacy_continuation']['game_state']['turn_player']]
  if p['time']<cost:raise ValueError('relationship discounted payment unavailable')
  proof=old_outcome(project_payment(envelope,action),action,history);proof.update(payment_time=cost,view_sha256=state.canonical_sha256(state.visible(envelope,proof['actor'])));return proof
 def transition(envelope,action,history=None):
  if action['action_type']!='relationship' or not relationship_effects(envelope):return old_transition(envelope,action,history)
  proof=outcome(envelope,action,history);after,events=old_transition(project_payment(envelope,action),action,history);ids=action['evidence']['payment_effect_ids'];after['runtime']['payment_effects']=[r for r in after['runtime']['payment_effects'] if r['effect_id'] not in ids];state.validate(after)
  return after,[batch._event(envelope,after,action,proof,events[0]['action_type'])]
 try:
  candidates.UNIT_ADJUDICATOR=adjudicate;batch.outcome=outcome;batch.transition=transition
  payments.STAT_CARDS=dict(old_stats,**{'M-antlion-03':descriptors['M-antlion-03']});payments.PAYMENT_CARDS=dict(old_payment,**{'P-cliff_goat':descriptors['P-cliff_goat']});payments.capability=capability
  with references.scope():yield
 finally:
  payments.STAT_CARDS=old_stats;payments.PAYMENT_CARDS=old_payment;payments.capability=old_cap
  candidates.UNIT_ADJUDICATOR=old_unit;batch.outcome=old_outcome;batch.transition=old_transition
