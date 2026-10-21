"""Shared board trigger inventories and source-bound deck effect resolutions."""
import copy
from contextlib import contextmanager
import proxy_continuation_choices as choices
import proxy_continuation_state as state
import proxy_continuation_batch as batch
import proxy_continuation_actions as actions
import proxy_continuation_candidates as candidates
import proxy_continuation_end as end
import proxy_resource_value_trajectory as old

DRAW_EFFECTS={'M-antlion-05':1,'P-desert_scorpion':1}
LOOK_EFFECTS={'W-city','M-beetle-02'}
CYCLE_EFFECTS={'M-beetle-01','P-cat_ceo'}
END_SOURCES={'M-beetle-02','W-countryside','P-desert_scorpion','I-sleepboost1'}
SUPPORTED_EFFECTS=set(DRAW_EFFECTS)|LOOK_EFFECTS|CYCLE_EFFECTS|{'M-antlion-04','W-countryside','I-sleepboost1','M-antlion-07','P-anglerfish'}
_baseline_classifier=batch.response_capability


def mandatory_choice(initial,current,actor,sources,kind):
 g=current['game_state'];fallback=old.shadow.fallback
 details=sorted([dict(candidate_id=g['cards'][s]['card_copy_id'],kind='card_copy',card_id=g['cards'][s]['card_id'],initial_instance_id=s) for s in sources],key=lambda d:d['candidate_id'])
 ids=[d['candidate_id'] for d in details]
 ctx=dict(contract_version=fallback.CONTRACT_VERSION,order_id=initial['order_id'],actor=actor,actor_turn_index=g['round'],round=g['round'],phase=g['phase'],decision_kind='mandatory_choice',choice_kind=kind)
 seed=fallback.build_seed_proof(ctx,ids);selected=seed['selected_candidate']
 record=dict(decision_kind='mandatory_choice',resolution_mode='seeded_fallback',strategic_unresolved=True,reason_code='strategic_unresolved_seeded_fallback',legal_candidates=ids,legal_candidate_details=details,candidate_set_complete=True,
  candidate_set_evidence=dict(source_ref='116-normal-decision-fallback-contract.md',state_ref=old.start._hash(current),enumeration_rule='all legal owner-known copies'),seeded_fallback_candidates=ids,seed_context=ctx,seed_proof=seed,selected_candidate=selected,selected_action=next(d for d in details if d['candidate_id']==selected),runner_up_candidates=[i for i in ids if i!=selected])
 errors=fallback.validate_seeded_resolution(record)
 if errors:raise ValueError('shared mandatory choice invalid: '+str(errors))
 return record


def _since(events,actor):
 return max((e['seq'] for e in events if e['actor']==actor and e['action_type'] in ('turn_start_and_egg_draw','turn_start_and_normal_draw')),default=0)


def _used(current,events,source,card):
 ctx=current['response_context'];since=_since(events,ctx['priority_actor'])
 once_per_turn=card in ('W-city','M-beetle-02','P-desert_scorpion','I-sleepboost1')
 return any(e.get('source_zone')=='board' and e.get('source_instance_id')==source and e['action_type']=='activate_response' and
  (e['seq']>since if once_per_turn else e.get('trigger_origin_event_seq')==ctx['origin_event_seq']) for e in events)


def board_candidates(current,events,source,slot,runtime=None):
 runtime=runtime or batch.RESPONSE_FULL_RUNTIME
 g=(batch.RESPONSE_FULL_CURRENT or current)['game_state'];ctx=current['response_context'];actor=ctx['priority_actor'];p=g['players'][actor];card=g['cards'][source]['card_id'];cap=batch.classification(card)
 origin=next((e for e in events if e['seq']==ctx['origin_event_seq']),None)
 if origin is None:raise ValueError('board trigger origin unavailable')
 eligible=False;targets=[[]]
 if card in ('M-antlion-07','P-anglerfish'):
  import proxy_continuation_challenge as challenge
  return challenge.board_candidates(current,events,source)
 if card=='W-city':
  occurrences=[e for e in batch.response_play_occurrences(current,events,actor) if batch.turn_card_count(g,events,actor,e['seq'])==2]
  eligible=actor==g['turn_player'] and bool(occurrences)
  if eligible:origin=occurrences[0]
 elif card=='M-antlion-05':eligible=origin['action_type']=='main_movement' and origin.get('source_instance_id')==source and origin.get('candidate_variant')=='time_skip' and not p['board']['prepared']
 elif card=='M-antlion-04':
  quick={r['card_id'] for r in old.start.load_candidate_rows().values() if any(a['action_type'] in ('use_play','use_item','use_event') for a in r['actions'])}
  targets=[[s] for s in p['discard'] if g['cards'][s]['card_id'] in quick]
  eligible=origin['action_type']=='main_movement' and origin.get('source_instance_id')==source and not any(not runtime['public_prepared'][s]['face_up'] for s in p['board']['prepared']) and bool(targets)
 elif card=='M-beetle-01':eligible=origin['action_type']=='main_movement' and origin.get('source_instance_id')==source and origin.get('candidate_variant')=='birth'
 elif card=='P-cat_ceo':
  if origin['action_type']=='relationship_start' and origin.get('source_instance_id')==source and p['board']['main'] is not None and not _used(current,events,source,card):raise ValueError('mandatory relationship trigger has not been activated')
  eligible=False
 elif card in END_SOURCES:eligible=origin['action_type']=='open_turn_end_triggers' and actor==origin['actor'] and source in origin['eligible_source_instance_ids']
 else:return [],_baseline_classifier(current,events,source,slot)
 if _used(current,events,source,card):eligible=False
 details=[]
 if eligible:
  for target in targets:
   identifier='response-activate-ability-'+source+(''.join('-target-'+s for s in target))
   details.append(dict(candidate_id=identifier,candidate_family='triggered_ability',action_type='activate_board_ability',source_instance_id=source,card_id=card,card_copy_id=g['cards'][source]['card_copy_id'],target_instance_ids=target,candidate_variant=None,base_time_cost=0,source_references=[cap['reference']]))
 if eligible and origin['seq']!=ctx['origin_event_seq']:
  for detail in details:detail['trigger_origin_event_seq']=origin['seq']
 reason=dict(source_instance_id=source,card_id=card,reason_code='enumerated_triggered_ability' if details else 'trigger_condition_not_met',source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'])
 return details,reason


def _raw_event(before,after,kind,actor,**extra):
 return dict(seq=after['last_event_seq'],action_type=kind,actor=actor,game_state_before_sha256=old.start.opening._stop_state_sha256(before['game_state']),game_state_after_sha256=old.start.opening._stop_state_sha256(after['game_state']),continuation_state_before_sha256=old.start._hash(before),continuation_state_after_sha256=old.start._hash(after),**extra)


def activate(envelope,record,events,mandatory=False):
 before=state.current(envelope);ctx=before['response_context'];actor=ctx['priority_actor'];action=record['selected_action'];source=action['source_instance_id'];cap=batch.classification(action['card_id'])
 if not mandatory:
  slot=next((slot for slot in ('main','partner','world') if before['game_state']['players'][actor]['board'][slot]==source),None)
  if slot is None and source in before['game_state']['players'][actor]['board']['prepared']:slot='prepared'
  if slot is None:raise ValueError('board trigger source not on controller board')
  details,_=board_candidates(before,events,source,slot,envelope['runtime'])
  if action not in details:raise ValueError('board ability not in fresh complete trigger inventory')
 else:
  if action['card_id']!='P-cat_ceo' or before['pending_triggers']!=[f"mandatory:{ctx['origin_event_seq']}:{source}"]:raise ValueError('mandatory relationship trigger differs')
 after=copy.deepcopy(before);seq=before['last_event_seq']+1;after['pending_triggers']=[]
 link_id=f'response-link-{seq}-{source}'
 link=dict(link_id=link_id,action_type='activate_board_ability',source_zone='board',actor=actor,card_id=action['card_id'],card_copy_id=action['card_copy_id'],source_instance_id=source,target_instance_ids=action['target_instance_ids'],candidate_variant=action['candidate_variant'],payment=dict(time=0),source_references=action['source_references'])
 after['activation_zone'].append(link)
 transition=old.start.seeded._response_transition_context(after);transition['window_kind']='after_normal_action';transition['chain_links']=copy.deepcopy(ctx['chain_links']);transition['chain_status']=ctx['chain_status']
 changed=old.start.seeded.response_119.transition_response_window(transition,dict(kind='activate',actor=actor,link_id=link_id));old.start.seeded._apply_transition_result(after,changed)
 if mandatory:after['response_context']['response_opportunity_index']=1
 after['last_event_seq']=seq;after['game_state']['phase']='turn_end_response' if ctx['source_phase']=='turn_end' else 'response_window';after['continuation_state_sha256']=old.start._hash(after)
 event=_raw_event(before,after,'activate_response',actor,source_instance_id=source,source_zone='board',selected_candidate=action['candidate_id'],chain_link_id=link_id,target_instance_ids=action['target_instance_ids'],payment=dict(time=0),trigger_origin_event_seq=action.get('trigger_origin_event_seq',ctx['origin_event_seq']),mandatory=mandatory,source_reference=cap['reference'])
 result=state.advance(envelope,after,seq);return result,[actions.bind_event(envelope,result,event)]


def resolve(current,initial):
 ctx=current['response_context'];links=current['activation_zone']
 if ctx['chain_status']!='resolving' or not links or links[-1].get('source_zone')!='board':raise ValueError('shared board resolution boundary differs')
 link=links[-1];card=link['card_id'];cap=batch.classification(card);actor=link['actor'];after=copy.deepcopy(current);g=after['game_state'];p=g['players'][actor];decisions=[];drawn=[];bottom=None;target=None
 if card=='I-sleepboost1':
  for _ in range(min(2,len(p['deck']))):drawn.append(p['deck'].pop(0))
  p['hand'].extend(drawn)
  if p['hand']:
   choice=mandatory_choice(initial,after,actor,p['hand'],'ability_draw_then_hand_bottom');decisions.append(choice);bottom=choice['selected_action']['initial_instance_id'];p['hand'].remove(bottom);p['deck'].append(bottom)
 elif card in CYCLE_EFFECTS:
  if p['hand']:
   choice=mandatory_choice(initial,current,actor,p['hand'],'ability_hand_bottom');decisions.append(choice);bottom=choice['selected_action']['initial_instance_id'];p['hand'].remove(bottom);p['deck'].append(bottom)
  if (card=='M-beetle-01' or bottom is not None) and p['deck']:drawn.append(p['deck'].pop(0));p['hand'].extend(drawn)
 elif card in DRAW_EFFECTS:
  for _ in range(min(DRAW_EFFECTS[card],len(p['deck']))):drawn.append(p['deck'].pop(0))
  p['hand'].extend(drawn)
 elif card in LOOK_EFFECTS:
  if p['deck']:
   decision=choices.resolve(initial,current,actor,[dict(position='top'),dict(position='bottom')],'ability_topdeck_order',link['link_id']);decisions.append(decision)
   if decision['selected_action']['option']['position']=='bottom':bottom=p['deck'].pop(0);p['deck'].append(bottom)
 elif card=='M-antlion-04':
  if len(link['target_instance_ids'])!=1:raise ValueError('discard-top ability target count differs')
  target=link['target_instance_ids'][0]
  if target in p['discard']:
   p['discard'].remove(target);p['deck'].insert(0,target)
 elif card=='W-countryside':p['growth']+=5
 else:raise ValueError('board effect contract unavailable: '+card)
 after['activation_zone'].pop();after['response_context']['chain_links'].pop()
 if not after['activation_zone']:
  end_return=ctx['source_phase']=='turn_end' or current['game_state']['phase']=='turn_end_response'
  after['response_context'].update(chain_status='empty',consecutive_passes=2 if end_return else 0)
  after['game_state']['phase']='turn_end' if end_return else 'normal_action';after['return_target']='turn_end' if end_return else 'normal_action_opportunity'
 after['last_event_seq']=current['last_event_seq']+1;after['continuation_state_sha256']=old.start._hash(after)
 event=_raw_event(current,after,'resolve_board_ability',actor,source_instance_id=link['source_instance_id'],source_zone='board',chain_link_id=link['link_id'],source_reference=cap['reference'],result=dict(drawn_instance_ids=drawn,hand_bottom_instance_id=bottom,target_instance_id=target,growth_added=5 if card=='W-countryside' else 0))
 return dict(final_continuation_state=old.start._payload(after),last_valid_event_seq=after['last_event_seq'],new_events=[event],new_snapshots=[old._snapshot(after)],new_decisions=decisions,completed=False)


def end_inventory(envelope,events):
 c=state.current(envelope);g=c['game_state'];actor=g['turn_player'];p=g['players'][actor];eligible=[];classified=[];since=_since(events,actor)
 board=p['board'];sources=[board['main'],board['world'],board['partner'],*board['prepared']]
 for source in sources:
  if not source:continue
  card=g['cards'][source]['card_id']
  if card not in END_SOURCES:continue
  cap=batch.classification(card);met=False
  if card=='I-sleepboost1':met=source in envelope['runtime']['attachments'] and envelope['runtime']['attachments'][source]['target_instance_id']==board['main'] and not p['challenge_used'] and p['time']>=2
  if card=='M-beetle-02':met=not any(e['seq']>since and e['actor']==actor and e['action_type']=='main_movement' and e.get('source_instance_id')==source and e.get('candidate_variant')=='time_skip' for e in events)
  if card in ('W-countryside','P-desert_scorpion'):
   plays=[g['cards'][e['source_instance_id']]['card_id'] for e in events if e['seq']>since and e['actor']==actor and e['action_type'] in ('attach_item','set_item','use_item','use_play','use_event','activate_response') and e.get('source_zone') not in ('board','prepared') and e.get('source_instance_id')]
   if card=='W-countryside':met=len(plays)==1
   else:met=board['main'] is not None and any(s.startswith('G-') for s in plays) and any(s.startswith('I-') for s in plays) # face-down sets filtered below
   if card=='P-desert_scorpion':met=met and any(e['seq']>since and e['actor']==actor and e['action_type'] in ('attach_item','use_item','activate_response') and e.get('source_zone') not in ('board','prepared') and g['cards'].get(e.get('source_instance_id'),{}).get('card_id','').startswith('I-') for e in events)
  if met:eligible.append(source)
  classified.append(dict(source_instance_id=source,card_id=card,condition_met=met,source_reference=cap['reference']))
 return eligible,classified


def open_end(envelope,events):
 before=state.current(envelope);g=before['game_state'];actor=g['turn_player'];eligible,proofs=end_inventory(envelope,events)
 since=_since(events,actor)
 if not eligible or any(e['seq']>since and e['actor']==actor and e['action_type']=='open_turn_end_triggers' for e in events):return None
 after=copy.deepcopy(before);after['last_event_seq']+=1;after['game_state']['phase']='turn_end_response';after['return_target']='turn_end'
 after['response_context']=dict(source_phase='turn_end',phase='response_window',window_kind='after_normal_action',origin_event_seq=after['last_event_seq'],turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass')
 after['continuation_state_sha256']=old.start._hash(after);event=_raw_event(before,after,'open_turn_end_triggers',actor,eligible_source_instance_ids=eligible,end_source_classifications=proofs,source_reference='64-turn-boundaries-and-victory-timing.md')
 return dict(final_continuation_state=old.start._payload(after),last_valid_event_seq=after['last_event_seq'],new_events=[event],new_snapshots=[old._snapshot(after)],new_decisions=[],completed=False)


def mandatory_pending(envelope,events):
 c=state.current(envelope);ctx=c['response_context'];actor=ctx['priority_actor'];board=c['game_state']['players'][actor]['board'];source=board['partner']
 if source is None or c['game_state']['cards'][source]['card_id']!='P-cat_ceo' or board['main'] is None:raise ValueError('mandatory pending source unavailable')
 cap=batch.classification('P-cat_ceo');g=c['game_state'];a=dict(candidate_id='response-activate-ability-'+source,candidate_family='triggered_ability',action_type='activate_board_ability',source_instance_id=source,card_id='P-cat_ceo',card_copy_id=g['cards'][source]['card_copy_id'],target_instance_ids=[],candidate_variant=None,base_time_cost=0,source_references=[cap['reference']])
 after,generated=activate(envelope,dict(selected_action=a),events,mandatory=True);raw={k:v for k,v in generated[0].items() if k not in end.BIND_KEYS};continuation=state.current(after)
 return dict(final_continuation_state=old.start._payload(continuation),last_valid_event_seq=after['event_seq'],new_events=[raw],new_snapshots=[old._snapshot(continuation)],new_decisions=[],completed=False)


def register_end_boundary(envelope,events,proofs):
 c=state.current(envelope);g=c['game_state'];actor=g['turn_player'];eligible,classified=end_inventory(envelope,events);since=_since(events,actor)
 opened=any(e['seq']>since and e['actor']==actor and e['action_type']=='open_turn_end_triggers' for e in events)
 if eligible and not opened:raise ValueError('end triggers require a completed shared response window')
 if c['activation_zone'] or c['pending_triggers'] or g['phase']!='turn_end':raise ValueError('end trigger boundary not closed')
 proofs.clear()
 for owner,p in g['players'].items():
  for source in [p['board']['main'],p['board']['world'],p['board']['partner'],*p['board']['prepared']]:
   if source is None:continue
   card=g['cards'][source]['card_id']
   if card not in END_SOURCES:continue
   proofs.setdefault(card,[]).append(dict(source_instance_id=source,controller=owner,own_end_condition_checked=owner==actor,trigger_window_completed=opened if owner==actor else False,own_end_of_other_actor=owner!=actor,current_event_seq=envelope['event_seq']))


@contextmanager
def scope(initial):
 original_classifier=batch.response_capability;original_apply=actions.apply;original_verify=end.verify_new_events;raw_enumerator=batch.response_enumerator;original_endclass=end.end_classification;original_partner_end=old.egg_partner_end_scope
 current_end_proofs={}
 try:
  def classifier(current,events,source,slot):
   details,reason=board_candidates(current,events,source,slot)
   return dict(reason,legal_candidate_details=details)
  # board_candidates delegates unrelated capabilities to the captured classifier.
  global _baseline_classifier
  _baseline_classifier=original_classifier
  batch.response_capability=classifier
  def apply(envelope,record,inputs):
   action=record.get('selected_action',{})
   if action.get('action_type')=='activate_board_ability' and action.get('card_id') in SUPPORTED_EFFECTS:return activate(envelope,record,inputs['public_events'])
   after,events=original_apply(envelope,record,inputs)
   c=envelope['legacy_continuation'];ctx=c['response_context']
   if action.get('action_type')=='response_pass' and ctx['source_phase']=='turn_end' and not after['legacy_continuation']['activation_zone'] and after['legacy_continuation']['response_context']['consecutive_passes']==2:
    target=after['legacy_continuation'];target['game_state']['phase']='turn_end';target['return_target']='turn_end'
    raw=events[0];raw['game_state_after_sha256']=old.start.opening._stop_state_sha256(target['game_state']);raw['continuation_state_after_sha256']=old.start._hash(target)
    if 'result' in raw:raw['result']['return_target']='turn_end'
    events=[actions.bind_event(envelope,after,raw)]
   return after,events
  actions.apply=apply
  def endclass(card):
   if card in current_end_proofs:return dict(batch.classification(card),end_boundary_proofs=copy.deepcopy(current_end_proofs[card]))
   return original_endclass(card)
  end.end_classification=endclass
  @contextmanager
  def partner_end(current):
   active=[s for p in current['game_state']['players'].values() for s in [p['board']['partner']] if s and current['game_state']['cards'][s]['card_id']=='P-desert_scorpion']
   bound=current_end_proofs.get('P-desert_scorpion',[])
   active_main=any(p['board']['partner'] in active and p['board']['main'] is not None for p in current['game_state']['players'].values())
   if active and all(any(row['source_instance_id']==s and row['current_event_seq']==current['last_event_seq'] for row in bound) for s in active):yield
   else:
    with original_partner_end(current):yield
  old.egg_partner_end_scope=partner_end
  def verify(events,shots,runtime):
   proofs=original_verify(events,shots,runtime);byseq={e['event_seq']:e for e in runtime}
   for event in events:
    if event['action_type'] not in ('place_partner','place_companion'):continue
    source=event.get('source_instance_id');prior=byseq.get(event['seq']-1)
    if prior is None or source is None:continue
    g=prior['legacy_continuation']['game_state'];card=g['cards'][source]['card_id']
    if card not in batch.CAPABILITIES:continue
    cap=batch.classification(card)
    if card=='P-cat_ceo' and g['players'][event['actor']]['board']['main'] is not None:raise ValueError('historical placement omits mandatory relationship trigger')
    inv=candidates.audit(prior,[e for e in events if e['seq']<event['seq']]);a=next((a for a in inv['legal_candidate_details'] if a['candidate_id']==event['selected_candidate']),None)
    if a is None:raise ValueError('historical person placement absent from complete inventory')
    with old.placements.partner_placement_scope():continuation,generated=old.extension._apply_placement(state.current(prior),dict(selected_action=a,selected_candidate=a['candidate_id']))
    raw=generated[0];expected=state.advance(prior,continuation,event['seq'])
    if raw!=event:raw=old._source_event_shape(raw,continuation,initial,old.POLICIES[0])
    if expected!=byseq[event['seq']] or raw!=event:raise ValueError('historical person placement independent replay differs')
    proofs.append(dict(event_seq=event['seq'],kind=event['action_type'],card_id=card,source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'],certain_growth_difference=0,duration='none'))
   for event in events:
    if event['seq']-1 not in byseq:continue
    prior=byseq[event['seq']-1];actual=byseq[event['seq']];source=event.get('source_instance_id');history=[e for e in events if e['seq']<event['seq']];g=prior['legacy_continuation']['game_state'];kind=event['action_type'];cap=None
    if kind=='open_turn_end_triggers':
     result=open_end(prior,history)
     if result is None:raise ValueError('historical end window was not required')
     expected=state.advance(prior,result['new_snapshots'][0]['continuation_state'],event['seq']);raw=result['new_events'][0];card=None;reference='64-turn-boundaries-and-victory-timing.md';digest=__import__('hashlib').sha256((batch.rules.ROOT/reference).read_bytes()).hexdigest();growth=0
    elif source is not None and g['cards'][source]['card_id'] in SUPPORTED_EFFECTS and event.get('source_zone')=='board' and kind in ('activate_response','resolve_board_ability'):
     card=g['cards'][source]['card_id'];cap=batch.classification(card);reference=cap['reference'];digest=cap['source_raw_sha256'];growth=5 if kind=='resolve_board_ability' and card=='W-countryside' else 0
     if kind=='activate_response':
      if event.get('mandatory'):result=mandatory_pending(prior,history);expected=state.advance(prior,result['new_snapshots'][0]['continuation_state'],event['seq']);raw=result['new_events'][0]
      else:
       ctx=prior['legacy_continuation']['response_context'];actor=ctx['priority_actor'];board=g['players'][actor]['board'];slot=next((s for s in ('main','partner','world') if board[s]==source),None)
       if slot is None and source in board['prepared']:slot='prepared'
       details,_=board_candidates(state.current(prior),history,source,slot,prior['runtime']);a=next((d for d in details if d['candidate_id']==event['selected_candidate']),None)
       if a is None:raise ValueError('historical board trigger not legal')
       expected,generated=activate(prior,dict(selected_action=a),history);raw={k:v for k,v in generated[0].items() if k not in end.BIND_KEYS}
     else:result=actions.normalize_resolution_result(prior,resolve(state.current(prior),initial));expected=state.advance(prior,result['new_snapshots'][0]['continuation_state'],event['seq']);raw=result['new_events'][0]
    else:continue
    if expected!=actual or raw!=event:raise ValueError('shared trigger independent provenance replay differs')
    proofs.append(dict(event_seq=event['seq'],kind=kind,card_id=card,source_reference=reference,source_raw_sha256=digest,certain_growth_difference=growth,duration='activation_until_resolution' if kind=='activate_response' else 'none'))
   return proofs
  end.verify_new_events=verify
  yield current_end_proofs
 finally:batch.response_capability=original_classifier;actions.apply=original_apply;end.end_classification=original_endclass;end.verify_new_events=original_verify;_baseline_classifier=original_classifier;old.egg_partner_end_scope=original_partner_end
