"""Opt-in existing paid draw activation; no new selector or card valuation."""
import copy
from contextlib import contextmanager
import proxy_continuation_triggers as triggers
import proxy_continuation_batch as batch
import proxy_continuation_rules as rules
import proxy_continuation_state as state
from proxy_mandatory_policy_contract import canonical

DESCRIPTORS={'M-antlion-02':'own_facedown_to_bottom','M-antlion-08':'distinct_set_and_quick_discard_to_bottom'}
QUICK={'use_item','use_play','use_event'}

def cost_options(game,actor,card,runtime):
 p=game['players'][actor]
 if card=='M-antlion-02':return [[s] for s in sorted(p['board']['prepared']) if runtime['public_prepared'][s]['face_up'] is False]
 methods={r['card_id']:{a['action_type'] for a in r['actions']} for r in rules.table()['cards']};options=set()
 for set_source in p['discard']:
  if 'set_item' not in methods[game['cards'][set_source]['card_id']]:continue
  for quick in p['discard']:
   if quick!=set_source and methods[game['cards'][quick]['card_id']]&QUICK:options.update(((set_source,quick),(quick,set_source)))
 return [list(row) for row in sorted(options)]

def board_candidates(current,history,source,slot=None,runtime=None):
 game=(batch.RESPONSE_FULL_CURRENT or current)['game_state'];actor=current['response_context']['priority_actor'];card=game['cards'][source]['card_id'];cap=batch.classification(card);runtime=runtime if runtime is not None else batch.RESPONSE_FULL_RUNTIME
 if game['players'][actor]['board']['main']!=source or runtime is None:raise ValueError('paid draw source/runtime differs')
 used=rules.used(dict(legacy_continuation=dict(game_state=game),runtime=runtime),source,'activated_normal_action')
 options=cost_options(game,actor,card,runtime) if actor==game['turn_player'] and not used else []
 rows=[dict(candidate_id='response-activate-ability-'+source+'-cost-'+'-'.join(costs),candidate_family='triggered_ability',action_type='activate_board_ability',source_instance_id=source,card_id=card,card_copy_id=game['cards'][source]['card_copy_id'],target_instance_ids=[],candidate_variant=None,base_time_cost=0,source_references=[cap['reference']],cost_instance_ids=costs) for costs in options]
 reason='enumerated_paid_draw' if rows else 'own_turn_required' if actor!=game['turn_player'] else 'already_used_this_turn' if used else 'no_legal_cost'
 return rows,dict(source_instance_id=source,card_id=card,reason_code=reason,source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'])

def activate_normal(envelope,action,history):
 before=state.current(envelope);game,_=batch.ready(envelope,action,history)
 if action['card_id'] not in DESCRIPTORS or action['action_type']!='activate_main_ability':raise ValueError('paid normal action differs')
 bridge=copy.deepcopy(envelope);triggers.actions._placement_window(bridge,game['turn_player']);bridge['legacy_continuation']['response_context'].update(source_phase='normal_action',origin_event_seq=envelope['event_seq']+1)
 rows,_=board_candidates(state.current(bridge),history,action['source_instance_id'],runtime=bridge['runtime']);chosen=next((r for r in rows if r['cost_instance_ids']==action['cost_instance_ids']),None)
 if chosen is None:raise ValueError('normal paid costs differ')
 after,_=triggers.activate(bridge,dict(selected_action=chosen),history);after['legacy_continuation']['response_context']['response_opportunity_index']=1
 link=after['legacy_continuation']['activation_zone'][-1]
 if 'activation_receipt' in link:
  from proxy_population_activation_reference import receipt
  link['activation_receipt']=receipt(envelope,after,link)
 current=state.current(after);event=triggers._raw_event(before,current,'activate_main_ability',game['turn_player'],source_instance_id=action['source_instance_id'],source_zone='board',selected_candidate=action['candidate_id'],chain_link_id=link['link_id'],target_instance_ids=[],payment=link['payment'],trigger_origin_event_seq=current['response_context']['origin_event_seq'],mandatory=False,source_reference=batch.classification(action['card_id'])['reference'])
 triggers.old._verify_generated(before,current,[event]);return after,[triggers.actions.bind_event(envelope,after,event)]

@contextmanager
def scope():
 import proxy_continuation_candidates as candidates
 import proxy_continuation_actions as actions
 import proxy_continuation_end as end
 import proxy_population_departure as departure
 import proxy_population_discard_recovery as recovery
 old_adjudicator=candidates.UNIT_ADJUDICATOR;old_select=candidates.select;old_apply=actions.apply;old_runtime=end.RUNTIME_TRANSITION_VERIFIER;old_verify=end.verify_new_events
 old_boards=triggers.board_candidates;old_activate=triggers.activate;old_draws=triggers.DRAW_EFFECTS;old_supported=triggers.SUPPORTED_EFFECTS
 def adjudicate(envelope,unit):
  if unit.get('source_family')=='board_card_action' and unit.get('card_id') in DESCRIPTORS:
   current=state.current(envelope);current['response_context']['priority_actor']=current['game_state']['turn_player'];rows,reason=board_candidates(current,[],unit['source_instance_id'],runtime=envelope['runtime'])
   if not rows:return [candidates._detail(unit,[reason['reason_code']],None)]
   result=[]
   for row in rows:
    detail=candidates._detail(dict(unit,action_type='activate_main_ability',candidate_variant=None),[],row['candidate_id'].replace('response-','candidate-',1));detail.update(cost_instance_ids=row['cost_instance_ids'],base_time_cost=0);detail['enumeration_unit_id']+=':cost:'+state.canonical_sha256(row['cost_instance_ids']);result.append(detail)
   return result
  return old_adjudicator(envelope,unit) if old_adjudicator else None
 def boards(current,history,source,slot=None,runtime=None):
  if current['game_state']['cards'][source]['card_id'] in DESCRIPTORS:return board_candidates(current,history,source,slot,runtime)
  return old_boards(current,history,source,slot,runtime)
 def activate(envelope,record,history,mandatory=False):
  action=record['selected_action'];card=action.get('card_id')
  if card not in DESCRIPTORS:return old_activate(envelope,record,history,mandatory)
  if mandatory or action not in board_candidates(state.current(envelope),history,action['source_instance_id'],runtime=envelope['runtime'])[0]:raise ValueError('paid draw action unavailable')
  after,generated=old_activate(envelope,record,history,False);after=copy.deepcopy(after);actor=state.current(envelope)['response_context']['priority_actor'];game=after['legacy_continuation']['game_state'];p=game['players'][actor];costs=action['cost_instance_ids']
  for source in costs:
   if card=='M-antlion-02':p['board']['prepared'].remove(source);del after['runtime']['public_prepared'][source]
   else:p['discard'].remove(source)
  p['deck'].extend(costs);after['runtime']['ability_uses'].append(dict(source_instance_id=action['source_instance_id'],ability_key='activated_normal_action',turn_player=game['turn_player'],round=game['round'],count=1))
  payment=dict(time=0,**{('prepared_to_deck_bottom' if card=='M-antlion-02' else 'discard_to_deck_bottom'):costs});after['legacy_continuation']['activation_zone'][-1]['payment']=payment;state.validate(after)
  before=state.current(envelope);current=state.current(after);raw={k:v for k,v in generated[0].items() if k not in end.BIND_KEYS};raw.update(payment=payment,game_state_after_sha256=triggers.old.start.opening._stop_state_sha256(current['game_state']),continuation_state_after_sha256=triggers.old.start._hash(current));triggers.old._verify_generated(before,current,[raw]);return after,[actions.bind_event(envelope,after,raw)]
 def select(envelope,inventory,context,policy,inputs=None):
  details=inventory['legal_candidate_details'];paid=[a for a in details if a['action_type']=='activate_main_ability' and a['card_id'] in DESCRIPTORS]
  if not paid or policy!='legacy_107_114_116':return old_select(envelope,inventory,context,policy,inputs)
  if canonical(candidates.audit(envelope,inventory['public_history']))!=canonical(inventory):raise ValueError('paid normal inventory differs')
  for a in paid:activate_normal(envelope,a,inventory['public_history'])
  cats=[a for a in details if a['action_type']=='activate_companion_ability' and a['card_id']=='C-cat_friend']
  for a in cats:recovery.activate_normal(envelope,a,inventory['public_history'])
  game=envelope['legacy_continuation']['game_state'];replacements=[a for a in details if a['action_type']=='place_companion' and len(game['players'][game['turn_player']]['board']['companions'])==3]
  for a in replacements:departure.replace_companion(envelope,a,inventory['public_history'])
  return departure.select_verified_zero_immediate(envelope,inventory,context,policy,paid+cats+replacements,'existing_own_turn_paid_draw',batch.classification(paid[0]['card_id'])['source_raw_sha256'])
 def apply(envelope,record,inputs):
  action=record.get('selected_action',{})
  combined=any(a.get('card_id') in DESCRIPTORS and a.get('action_type')=='activate_main_ability' for a in record.get('inventory',{}).get('legal_candidate_details',[]))
  if combined:
   if canonical(select(envelope,record['inventory'],record['context'],record['policy_id'],inputs))!=canonical(record):raise ValueError('paid choice changed')
   if action.get('card_id') in DESCRIPTORS and action.get('action_type')=='activate_main_ability':return activate_normal(envelope,action,inputs['public_events'])
   if action.get('card_id')=='C-cat_friend' and action.get('action_type')=='activate_companion_ability':return recovery.activate_normal(envelope,action,inputs['public_events'])
   game=envelope['legacy_continuation']['game_state']
   if action.get('action_type')=='place_companion' and len(game['players'][game['turn_player']]['board']['companions'])==3:
    result=departure.replace_companion(envelope,action,inputs['public_events']);return result['envelope'],result['events']
  return old_apply(envelope,record,inputs)
 def runtime_verify(before,after,event,history=None):
  if before['legacy_continuation']['game_state']['cards'].get(event.get('source_instance_id'),{}).get('card_id') in DESCRIPTORS and event.get('action_type') in ('activate_response','activate_main_ability'):
   try:
    if event['action_type']=='activate_response':
     rows,_=board_candidates(state.current(before),history or [],event['source_instance_id'],runtime=before['runtime']);action=next(a for a in rows if a['candidate_id']==event['selected_candidate']);expected,generated=triggers.activate(before,dict(selected_action=action),history or [])
    else:
     inventory=candidates.audit(before,history or []);action=next(a for a in inventory['legal_candidate_details'] if a['candidate_id']==event['selected_candidate']);expected,generated=activate_normal(before,action,history or [])
    return canonical(expected)==canonical(after) and canonical({k:v for k,v in generated[0].items() if k not in end.BIND_KEYS})==canonical(event)
   except (ValueError,KeyError,TypeError,StopIteration):return False
  return old_runtime(before,after,event,history) if old_runtime else False
 def verify(events,snapshots,envelopes):
  proofs=old_verify(events,snapshots,envelopes);byseq={e['event_seq']:e for e in envelopes}
  for event in events:
   if event.get('action_type')!='activate_main_ability' or event['seq']-1 not in byseq:continue
   previous=byseq[event['seq']-1]
   if previous['legacy_continuation']['game_state']['cards'].get(event.get('source_instance_id'),{}).get('card_id') not in DESCRIPTORS:continue
   raw={k:v for k,v in event.items() if k not in end.BIND_KEYS}
   if not runtime_verify(previous,byseq[event['seq']],raw,[e for e in events if e['seq']<event['seq']]):raise ValueError('paid activation replay differs')
   cap=batch.classification(previous['legacy_continuation']['game_state']['cards'][event['source_instance_id']]['card_id']);proofs.append(dict(event_seq=event['seq'],kind='paid_draw_activation',source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'],certain_growth_difference=0,duration='activation_until_resolution'))
  return proofs
 try:
  candidates.UNIT_ADJUDICATOR=adjudicate;candidates.select=select;actions.apply=apply;end.RUNTIME_TRANSITION_VERIFIER=runtime_verify;end.verify_new_events=verify;triggers.board_candidates=boards;triggers.activate=activate;triggers.DRAW_EFFECTS=dict(old_draws,**{c:1 for c in DESCRIPTORS});triggers.SUPPORTED_EFFECTS=old_supported|set(DESCRIPTORS)
  yield
 finally:
  candidates.UNIT_ADJUDICATOR=old_adjudicator;candidates.select=old_select;actions.apply=old_apply;end.RUNTIME_TRANSITION_VERIFIER=old_runtime;end.verify_new_events=old_verify;triggers.board_candidates=old_boards;triggers.activate=old_activate;triggers.DRAW_EFFECTS=old_draws;triggers.SUPPORTED_EFFECTS=old_supported
