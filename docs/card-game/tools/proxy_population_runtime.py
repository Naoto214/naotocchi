"""New-input operation port into the unchanged complete runtime edition.

Pure synthetic/conditional reconstruction API; no experiment dispatcher or lock.
Legacy selection records remain legacy, including their exclusion obligations.
"""
import copy
from threading import Lock
import proxy_continuation_batch_runner as engine
from proxy_mandatory_policy_contract import canonical

_LOCK=Lock()
POLICY='legacy_107_114_116'
BIND_KEYS={'execution_contract_id','envelope_before_sha256','envelope_after_sha256'}


def operation(initial,callback):
 """Borrow the original nine scopes AND original forced dispatcher closure.

 The old135 entry is not called or impersonated. This explicit new operation
 boundary replaces only the driver for the duration of this serialized call.
 """
 canonical(initial)
 if not isinstance(initial,dict) or any(type(initial.get(k)) is not str or not initial[k] for k in ('path_id','order_id')) or initial.get('first_player') not in ('A','B'):
  raise ValueError('runtime identity missing')
 if not _LOCK.acquire(blocking=False):raise ValueError('runtime scope reentry/concurrency forbidden')
 original=engine.base.run_route
 try:
  def driver(supplied,policy,forced):
   if supplied is not initial or policy!=POLICY:raise ValueError('runtime scope identity differs')
   # No borrowing historical comparator evidence for new inputs.
   prior=engine.base.candidates._borrow_problem
   prior_response=engine.base.old._generic_response_opportunity
   try:
    engine.base.candidates._borrow_problem=lambda *args:None
    def first_or_general(current,supplied,events):
     if current['last_event_seq']==2 and current['response_context']['window_kind']=='turn_start':
      from proxy_population_start_window import assess_initial_response
      actor=current['response_context']['priority_actor']
      inventory=assess_initial_response(current['game_state'],supplied['first_player'],actor)['inventory']
      return dict(inventory,response_context=copy.deepcopy(current['response_context']),candidate_set_complete=True)
     return prior_response(current,supplied,events)
    engine.base.old._generic_response_opportunity=first_or_general
    return callback(forced)
   finally:
    engine.base.candidates._borrow_problem=prior
    engine.base.old._generic_response_opportunity=prior_response
  engine.base.run_route=driver
  return engine.run_route(initial,POLICY)
 finally:
  engine.base.run_route=original;_LOCK.release()


def _evaluate(decision):
 if decision is None:return dict(legacy_116='not_a_choice',policy_basis=None,policy_eligible=None,balance_admitted=None)
 choices=[decision,decision.get('choice',{})]
 fallback=any(d.get('resolution_mode') in ('seeded_fallback','response_seeded_fallback') or d.get('strategic_unresolved') is True or d.get('seed_proof') is not None for d in choices)
 return dict(legacy_116='excluded' if fallback else 'not_observed_in_this_record',
             policy_basis='designated_supplied_policy' if decision.get('local_policy_evidence') else 'existing_contract_record',
             strategic_unproven=decision.get('strategic_unproven'),policy_eligible=None,balance_admitted=None)


def _step(envelope,initial,events,shots,runtime,forced,session=None):
 base=engine.base;state=base.state;old=base.old
 e=engine.payments.upgrade(envelope);c=state.current(e);g=c['game_state'];phase=g['phase'];ctx=c['response_context']
 if type(g['round']) is not int or not 1<=g['round']<=10:raise ValueError('round outside1..10')
 record=None;extra=[];completion=None;forced_record=None
 if phase=='normal_action':
  inventory=base.candidates.audit(e,events)
  context=dict(contract_version=old.shadow.fallback.CONTRACT_VERSION,order_id=initial['order_id'],actor=g['turn_player'],actor_turn_index=g['round'],round=g['round'],phase=phase,decision_kind='normal_action',choice_kind='normal_action_resource_frontier')
  record=base.candidates.select(e,inventory,context,POLICY,None)
  after,generated=base.actions.apply(e,record,dict(public_events=events))
  envelopes=[after]
 elif phase in ('response_window','post_placement_response','turn_end_response') and ctx['chain_status']!='resolving' and not c['pending_triggers']:
  inventory=base.actions.response_inventory(e,initial,events)
  record=old.start.seeded.resolve_response_choice(dict(order_id=initial['order_id'],actor_turn_index=g['round'],round=g['round']),inventory)
  after,generated=base.actions.apply(e,record,dict(public_events=events))
  envelopes=[after]
 else:
  if session is not None and ctx['chain_status']=='resolving' and c['activation_zone']:
   from proxy_population_policy_bridge import occurrence_key
   session.effect(occurrence_key(c),g['turn_player'])
  result=forced(e,initial,events,shots,[engine.payments.upgrade(x) for x in runtime])
  forced_record=copy.deepcopy(result)
  generated=result['new_events'];raw_shots=result['new_snapshots'];envelopes=result.get('new_envelopes',[])
  if len(generated)!=len(raw_shots):raise ValueError('forced snapshot coverage differs')
  if not envelopes:
   prior=e
   for shot in raw_shots:
    prior=state.advance(prior,shot['continuation_state'],shot['event_seq']);envelopes.append(prior)
  extra=result.get('new_decisions',[])
  if result.get('completed'):completion=result['result']
 if not generated or len(generated)!=len(envelopes):raise ValueError('step event/envelope coverage differs')
 bound=[];snapshots=[];prior=e
 for event,after in zip(generated,envelopes):
  raw={k:v for k,v in event.items() if k not in BIND_KEYS}
  old._verify_generated(state.current(prior),state.current(after),[raw])
  bound.append(base.actions.bind_event(prior,after,raw));snapshots.append(old._snapshot(state.current(after)));prior=after
 return dict(schema='population_runtime_step_468.v1',source_envelope=e,decision=record,
             mandatory_decisions=copy.deepcopy(extra),forced_record=forced_record,
             judgment_evaluations=[_evaluate(d) for d in ([record] if record is not None else [])+extra],events=bound,snapshots=snapshots,envelopes=envelopes,
             final_envelope=prior,result=completion,evaluation=_evaluate(record),
             policy_eligible=None,balance_admitted=None,ready_for_execution=False)


def step(envelope,initial,events,shots,runtime):
 return operation(initial,lambda forced:_step(envelope,initial,events,shots,runtime,forced))


def segment(envelope,initial,events,shots,runtime,limit,session=None):
 if type(limit) is not int or not 1<=limit<=512:raise ValueError('invalid bounded step limit')
 def reconstruct(forced):
  current=engine.payments.upgrade(envelope);history=copy.deepcopy(events);legacy=copy.deepcopy(shots)
  full=[engine.payments.upgrade(x) for x in runtime];generated=[];decisions=[];steps=[];stop=None;result=None
  for _ in range(limit):
   journal_before=copy.deepcopy(session.__dict__) if session is not None else None
   try:r=_step(current,initial,history,legacy,full,forced,session)
   except (ValueError,engine.base.old.normal.RulesStop) as error:
    if session is not None:session.__dict__.clear();session.__dict__.update(journal_before)
    stop=dict(code='unsupported_contract_boundary',detail=str(error),phase=current['legacy_continuation']['game_state']['phase']);break
   steps.append(r)
   if r['decision'] is not None:decisions.append(r['decision'])
   decisions.extend(r['mandatory_decisions']);generated.extend(r['events'])
   history.extend({k:v for k,v in e.items() if k not in BIND_KEYS} for e in r['events'])
   legacy.extend(r['snapshots']);full.extend(r['envelopes']);current=r['final_envelope'];result=r['result']
   if result is not None:break
  return dict(schema='population_runtime_segment_468.v1',source_envelope=engine.payments.upgrade(envelope),
              final_envelope=current,events=generated,decisions=decisions,steps=steps,stop=stop,result=result,
              completed=result is not None,step_limit_reached=len(steps)==limit and result is None,
              policy_eligible=None,balance_admitted=None,ready_for_execution=False,independent_balance_samples=0)
 def scoped(forced):
  from contextlib import nullcontext
  from proxy_population_policy_bridge import handler_scope
  from proxy_population_turn_boundary import metadata_scope
  with handler_scope(session) if session is not None else nullcontext(), metadata_scope(initial,session) if session is not None else nullcontext():
   return reconstruct(forced)
 return operation(initial,scoped)
