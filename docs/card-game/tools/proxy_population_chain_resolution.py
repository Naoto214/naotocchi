"""Conditional top-link adapter for bounded reveal effects.

Uses current canonical classification and existing continuation event format.
This does not authenticate the supplied activation or initial root.
"""
import copy
import proxy_resource_value_trajectory as old
import proxy_continuation_batch as batch
import proxy_continuation_triggers as triggers
import proxy_population_effective_application as application
import proxy_population_effect_application_runtime as evidence
from proxy_mandatory_policy_contract import canonical


def resolve_top(before):
 evidence.verify_source()
 links=before['activation_zone'];ctx=before['response_context']
 if before['continuation_state_sha256']!=old.start._hash(before):raise ValueError('continuation hash differs')
 if not links or ctx['chain_status']!='resolving' or ctx['chain_links']!=[l['link_id'] for l in links] or len(set(ctx['chain_links']))!=len(links) or before['pending_triggers']:raise ValueError('closed reverse chain boundary differs')
 link=links[-1];card=link['card_id'];batch.classification(card)
 if card not in ('I-c_coin2','G-hit-blow','E-first-date') or link['action_type']!={'I-c_coin2':'use_item','G-hit-blow':'use_play','E-first-date':'use_event'}[card] or link['payment']!={'time':1}:raise ValueError('unsupported top link')
 if card!='E-first-date' and link['target_instance_ids']!=[]:raise ValueError('unexpected target')
 if (card=='I-c_coin2' and link['candidate_variant'] is not None) or (card=='G-hit-blow' and link['candidate_variant'] not in old.start.VARIANTS):raise ValueError('reveal branch differs')
 actor=link['actor'];source=link['source_instance_id'];g=before['game_state'];physical=g['cards'][source]
 if physical['card_id']!=card or physical['card_copy_id']!=link['card_copy_id']:raise ValueError('source identity differs')
 p=g['players'][actor]
 if any(source in p[z] for z in ('hand','deck','discard')):raise ValueError('activation source duplicated in zone')
 after=copy.deepcopy(before);p=after['game_state']['players'][actor];revealed=None;category=None;drawn=None;requested=0
 native_result=None;original_growth=p['growth']
 if card=='E-first-date':
  # Native119 validates initial_instance_id. Supply a private current-ID
  # view only for an actually present active incarnation; preserve metadata
  # and never rewrite the link's historical target.
  from proxy_population_incarnation_runtime import active_cards
  target=link['target_instance_ids'][0] if len(link['target_instance_ids'])==1 else None
  cards=after['game_state']['cards'];active=active_cards(cards)
  if target==p['board']['partner'] and target in cards and active.get(cards[target]['card_copy_id'])==target:
   after['game_state']['cards']=dict(cards);after['game_state']['cards'][target]=dict(cards[target],initial_instance_id=target)
  try:native_result=old.start.seeded.resolve_first_date(after,copy.deepcopy(link),{})
  finally:after['game_state']['cards']=cards
  requested=native_result['growth_added'];p['growth']=original_growth
 elif card=='G-hit-blow' and p['deck']:
  native_result=old.hit.apply_hit_blow_effect(after,copy.deepcopy(link));revealed=native_result['revealed_instance_id'];category=native_result['revealed_card_type'];drawn=native_result['drawn_instance_id'];requested=native_result['growth_added'];p['growth']=original_growth
 elif p['deck']:
  revealed=p['deck'].pop(0);row=old.start.load_candidate_rows().get(g['cards'][revealed]['card_id'])
  if row is None or row['card_type'] not in old.start.VARIANTS:raise ValueError('revealed category unregistered')
  category=row['card_type'];p['deck'].append(revealed)
  if category=='main':requested=5
  else:drawn=p['deck'].pop(0);p['hand'].append(drawn)
 growth=application.growth(p['growth'],requested);p['growth']=growth['after']
 parts=[growth,dict(operation='public_reveal',instance_id=revealed,status='applied' if revealed is not None else 'not_applied',reason='public_reveal' if revealed is not None else 'empty_deck'),dict(operation='draw',instance_ids=[] if drawn is None else [drawn],status='applied' if drawn is not None else 'not_applied')]
 if card=='E-first-date':
  drawn_ids=native_result['drawn_instance_ids'];parts=[growth,dict(operation='draw',instance_ids=copy.deepcopy(drawn_ids),status='applied' if drawn_ids else 'not_applied')]
 status=application.classify(parts,True)
 proof=dict(contract='effective_application_474.v1',source_sha256=evidence.RULING_SHA,source_instance_id=source,chain_link_id=link['link_id'],resolved=True,activation_reference=dict(chain_link_id=link['link_id'],source_instance_id=source,origin_authenticated=False),parts=parts,parts_complete=True,status=status)
 if native_result is None:p['discard'].append(source);after['activation_zone'].pop()
 after['response_context']['chain_links'].pop()
 if not after['activation_zone']:
  end_return=ctx['source_phase']=='turn_end' or before['game_state']['phase']=='turn_end_response'
  after['response_context'].update(chain_status='empty',consecutive_passes=2 if end_return else 0);after['return_target']='turn_end' if end_return else 'normal_action_opportunity';after['game_state']['phase']='turn_end' if end_return else 'normal_action'
 after['last_event_seq']+=1;after['continuation_state_sha256']=old.start._hash(after)
 result=dict(revealed_instance_id=revealed,revealed_card_type=category,returned_to_deck_bottom=revealed,drawn_instance_id=drawn,growth_added=growth['actual_delta'],growth_requested=requested,source_destination='discard',effect_applied=status=='applied')
 if card=='E-first-date':result=dict(native_result,growth_added=growth['actual_delta'],growth_requested=requested,effect_applied=status=='applied')
 if card=='G-hit-blow':
  result=dict(native_result or dict(declared_type=link['candidate_variant'],revealed_instance_id=None,revealed_card_type=None,declaration_matched=None,drawn_instance_id=None,source_destination='discard'),growth_added=growth['actual_delta'],growth_requested=requested,effect_applied=status=='applied')
 event=triggers._raw_event(before,after,{'I-c_coin2':'resolve_item','G-hit-blow':'resolve_play','E-first-date':'resolve_event'}[card],actor,source_instance_id=source,chain_link_id=link['link_id'],payment=copy.deepcopy(link['payment']),result=result,application_evidence=proof)
 return after,event


def audit(after,event,before):
 try:return [] if canonical([after,event])==canonical(list(resolve_top(before))) else ['top-link reconstruction differs']
 except (ValueError,KeyError,TypeError):return ['top-link reconstruction failed']


from contextlib import contextmanager
from threading import Lock
import proxy_continuation_runner as runner
import proxy_continuation_end as end
import proxy_continuation_state as state
_LOCK=Lock()

@contextmanager
def scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('bounded chain scope concurrency/reentry forbidden')
 prior=runner._forced;prior_verify=end.verify_new_events
 def forced(current,initial,events,shots):
  if current['response_context']['chain_status']!='resolving' or not current['activation_zone'] or current['activation_zone'][-1]['card_id'] not in ('I-c_coin2','G-hit-blow','E-first-date'):return prior(current,initial,events,shots)
  after,event=resolve_top(current)
  return dict(final_continuation_state=old.start._payload(after),last_valid_event_seq=after['last_event_seq'],new_events=[event],new_snapshots=[old._snapshot(after)],new_decisions=[])
 def verify(events,shots,runtime):
  proofs=prior_verify(events,shots,runtime);byseq={e['event_seq']:e for e in runtime}
  for event in events:
   if event['action_type'] not in ('resolve_item','resolve_play','resolve_event') or 'application_evidence' not in event:continue
   before=state.current(byseq[event['seq']-1]);actual=state.current(byseq[event['seq']]);link=before['activation_zone'][-1]
   if link['card_id'] not in ('I-c_coin2','G-hit-blow','E-first-date'):continue
   raw={k:v for k,v in event.items() if k not in end.BIND_KEYS}
   expected,generated=resolve_top(before)
   # Normalization restores the enclosing response/turn-end continuation.
   result=runner.actions.normalize_resolution_result(byseq[event['seq']-1],dict(final_continuation_state=old.start._payload(expected),last_valid_event_seq=expected['last_event_seq'],new_events=[generated],new_snapshots=[old._snapshot(expected)],new_decisions=[]))
   if canonical(result['new_snapshots'][0]['continuation_state'])!=canonical(old.start._payload(actual)) or canonical({k:v for k,v in result['new_events'][0].items() if k not in end.BIND_KEYS})!=canonical(raw):raise ValueError('bounded chain provenance reconstruction differs')
   cap=batch.classification(link['card_id']);proofs.append(dict(event_seq=event['seq'],kind=event['action_type'],card_id=link['card_id'],source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'],certain_growth_difference=event['result']['growth_added'],duration='none'))
  return proofs
 try:runner._forced=forced;end.verify_new_events=verify;yield
 finally:runner._forced=prior;end.verify_new_events=prior_verify;_LOCK.release()
