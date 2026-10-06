"""91/87 activation conditions are separate from resolution success.

Opt-in current edition only. Reuse the native119 transition, placement window,
state/event binding and existing resolution handlers. No value comparison.
"""
import copy,json
from contextlib import contextmanager
from threading import Lock
import proxy_continuation_quick as quick
import proxy_continuation_candidates as candidates
import proxy_continuation_batch as batch
import proxy_continuation_state as state
from proxy_mandatory_policy_contract import canonical

CARDS={'E-first-date','G-hit-blow'}
_LOCK=Lock()

def hand_candidates(current,events,actor,source,entry):
 g=current['game_state'];p=g['players'][actor];card=g['cards'][source]['card_id'];cap=batch.classification(card)
 if card not in CARDS or source not in p['hand']:raise ValueError('activation source differs')
 action=next(a for a in entry['actions'] if a['action_type'] in ('use_event','use_play'))
 if action['base_time_cost']!=1 or action['source_text_reference']!=cap['reference']:raise ValueError('activation registered source/payment differs')
 target=p['board']['partner'] if card=='E-first-date' else None
 variants=[None] if card=='E-first-date' else list(quick.old.start.VARIANTS)
 if card=='G-hit-blow' and action['candidate_variants']!=variants:raise ValueError('declaration variants differ')
 reason='insufficient_time' if p['time']<1 else 'required_partner_absent' if card=='E-first-date' and target is None else 'enumerated_current_activation'
 rows=[]
 if reason=='enumerated_current_activation':
  for variant in variants:
   rows.append(dict(candidate_id=quick.old.start.response_id(action['action_type'],source,target_instance_id=target,variant=variant,registered_variants=action['candidate_variants']),candidate_family='hand_quick_use',action_type=action['action_type'],card_id=card,card_copy_id=g['cards'][source]['card_copy_id'],source_instance_id=source,target_instance_ids=[target] if target else [],candidate_variant=variant,base_time_cost=1,source_references=[cap['reference']]))
 for row in rows:
  if card=='E-first-date':row['resolution_condition_evidence']=dict(partner_stage=p['board']['partner_stage'],growth=p['growth'],legacy_five_growth_premises=p['board']['partner_stage']==0 and p['growth']<=95)
 return rows,dict(card_id=card,reason_code=reason,source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'],activation_condition_scope='current_target_and_payment_only')


def activate(envelope,record,inputs,initial=None,verify_record=True):
 current=state.current(envelope);g=current['game_state'];normal=g['phase']=='normal_action';action=record['selected_action'];actor=g['turn_player'] if normal else current['response_context']['priority_actor'];source=action['source_instance_id'];card=action['card_id']
 fresh=candidates.audit(envelope,inputs['public_events']) if normal else quick.actions.response_inventory(envelope,initial,inputs['public_events'])
 if canonical(action) not in [canonical(a) for a in fresh['legal_candidate_details']]:raise ValueError('activation absent from fresh complete inventory')
 if normal and verify_record:
  if canonical(candidates.select(envelope,record['inventory'],record['context'],record['policy_id'],inputs))!=canonical(record):raise ValueError('activation selection evidence differs')
 elif not normal and canonical(fresh)!=canonical(record['candidate_set_evidence']):raise ValueError('response activation evidence differs')
 details,proof=hand_candidates(current,inputs['public_events'],actor,source,quick.old.start.load_candidate_rows()[card])
 if current['pending_triggers'] or not any(a['target_instance_ids']==action['target_instance_ids'] and a['candidate_variant']==(None if card=='E-first-date' else action['candidate_variant']) for a in details):raise ValueError('activation target/declaration differs')
 # Native quick.activate combines this atomic operation with legacy legality
 # guards. Reuse its shared119/placement/state primitives without fake states
 # or changing its protected historical edition.
 after=copy.deepcopy(current);seq=current['last_event_seq']+1;after['last_event_seq']=seq
 if normal:
  wrapper=state.advance(envelope,after,seq);quick.actions._placement_window(wrapper,actor);after=state.current(wrapper);after['response_context']['source_phase']='normal_action';after['game_state']['phase']='response_window'
 owner=after['game_state']['players'][actor];owner['time']-=1;owner['hand'].remove(source);link_id=f'response-link-{seq}-{source}'
 link=dict(link_id=link_id,action_type=action['action_type'],actor=actor,card_id=card,card_copy_id=g['cards'][source]['card_copy_id'],source_instance_id=source,target_instance_ids=copy.deepcopy(action['target_instance_ids']),candidate_variant=None if card=='E-first-date' else action['candidate_variant'],payment=dict(time=1),source_references=[proof['source_reference']])
 after['activation_zone'].append(link);transition=quick.old.start.seeded._response_transition_context(after);transition['window_kind']='after_normal_action'
 changed=quick.old.start.seeded.response_119.transition_response_window(transition,dict(kind='activate',actor=actor,link_id=link_id));quick.old.start.seeded._apply_transition_result(after,changed)
 if normal:after['response_context']['response_opportunity_index']=1
 after['continuation_state_sha256']=quick.old.start._hash(after)
 event=dict(seq=seq,action_type=action['action_type'] if normal else 'activate_response',actor=actor,selected_candidate=action['candidate_id'],source_instance_id=source,candidate_variant=link['candidate_variant'],payment=dict(time=1),target_instance_ids=link['target_instance_ids'],chain_link_id=link_id,source_reference=proof['source_reference'],game_state_before_sha256=quick.old.start.opening._stop_state_sha256(g),game_state_after_sha256=quick.old.start.opening._stop_state_sha256(after['game_state']),continuation_state_before_sha256=quick.old.start._hash(current),continuation_state_after_sha256=quick.old.start._hash(after))
 result=state.advance(envelope,after,seq);return result,[quick.actions.bind_event(envelope,result,event)]

@contextmanager
def scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('activation legality scope reentry/concurrency forbidden')
 prior_hand=quick.hand_candidates;prior_activate=quick.activate;prior_unit=candidates.UNIT_ADJUDICATOR;prior_select=quick.old.start.seeded.resolve_response_choice
 def hand(c,events,actor,source,entry):
  return hand_candidates(c,events,actor,source,entry) if c['game_state']['cards'][source]['card_id'] in CARDS else prior_hand(c,events,actor,source,entry)
 def apply(e,r,i,initial=None,verify_record=True):
  return activate(e,r,i,initial,verify_record) if r['selected_action']['card_id'] in CARDS else prior_activate(e,r,i,initial,verify_record)
 def unit(e,u):
  if u['card_id']!='E-first-date' or u['source_family']!='hand_card_action':return prior_unit(e,u) if prior_unit else None
  c=state.current(e);g=c['game_state'];actor=g['turn_player'];source=u['source_instance_id'];details,proof=hand_candidates(c,[],actor,source,quick.old.start.load_candidate_rows()['E-first-date']);target=g['players'][actor]['board']['partner'];row=copy.deepcopy(u);row['target_instance_ids']=[target] if target else []
  row['enumeration_unit_id']=json.dumps([row['source_family'],row['source_zone'],row['source_id'],row['action_type'],row['candidate_variant'],row['target_instance_ids']],ensure_ascii=False,separators=(',',':'))
  reasons=[] if details else [proof['reason_code']]
  return [candidates._detail(row,reasons,f'candidate-use_event-{source}-target-{target}',payment_time=1,activation_condition_proof=proof)]
 def select(route,opportunity):
  details=opportunity['legal_candidate_details'];ids=opportunity['legal_candidate_ids']
  if len(ids)==1 or not any(a.get('card_id')=='E-first-date' and a.get('resolution_condition_evidence',{}).get('legacy_five_growth_premises') is False for a in details):return prior_select(route,opportunity)
  # Do not apply the old unconditional +5 lookup to a newly legal case.
  # Unknown comparison remains119/116-excluded; it is not463 policy choice.
  from proxy_population_opportunity_ledger import create
  create(opportunity['actor']) # verifies immutable06/119 source anchors
  seeded=quick.old.start.seeded;seeded._validate_response_opportunity(opportunity);ctx=opportunity['response_context']
  context=dict(contract_version=seeded.response_119.CONTRACT_VERSION,order_id=route['order_id'],actor=opportunity['actor'],actor_turn_index=route['actor_turn_index'],round=route['round'],**{k:ctx[k] for k in ('origin_event_seq','response_opportunity_index','phase','decision_kind','choice_kind')})
  seed=seeded.response_119.build_response_seed_proof(context,ids);selected=seed['selected_candidate']
  return dict(decision_kind='response_action',choice_kind='reaction_or_pass',actor=opportunity['actor'],phase='response_window',response_opportunity_index=ctx['response_opportunity_index'],legal_candidate_ids=copy.deepcopy(ids),legal_candidate_details=copy.deepcopy(details),candidate_set_evidence=copy.deepcopy(opportunity),resolution_mode='response_seeded_fallback',reason_code='strategic_unresolved_response_seeded_fallback',selected_candidate=selected,selected_action=copy.deepcopy(next(a for a in details if a['candidate_id']==selected)),runner_up_candidates=sorted(i for i in ids if i!=selected),comparison_evidence=None,seed_context=context,seed_proof=seed,comparison_gap='legacy_five_growth_premises_not_satisfied',strategic_unproven=True,policy_eligible=False)
 try:quick.hand_candidates=hand;quick.activate=apply;candidates.UNIT_ADJUDICATOR=unit;quick.old.start.seeded.resolve_response_choice=select;yield
 finally:quick.hand_candidates=prior_hand;quick.activate=prior_activate;candidates.UNIT_ADJUDICATOR=prior_unit;quick.old.start.seeded.resolve_response_choice=prior_select;_LOCK.release()
