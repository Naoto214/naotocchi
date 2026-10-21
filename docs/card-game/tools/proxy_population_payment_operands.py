"""Current normal comparison payment binding, not a general value proof.

Reuse source-pinned core/hand/board predicate costs. Only supported admitted rows
are certified; physical-card costs, other priority values and historical origin
remain separate obligations. Supplied copy IDs bind to the candidate source;
upper-only source-cost rows do not invent an unused tie-break operand.
No selector, executor or value is changed.
"""
import proxy_continuation_state as state
import proxy_population_core_predicates as core
import proxy_population_hand_predicates as hand
import proxy_population_board_predicates as board
from proxy_mandatory_policy_contract import canonical

ZERO_IMMEDIATE_CONTRACTS=frozenset(('own_companion_replacement_470','source_cost_discard_recovery_470','existing_own_turn_paid_draw'))


def source_payments(envelope,events,inventory):
 """Source-certified payment/identity facts, without upper-value promotion."""
 state.validate(envelope);g=envelope['legacy_continuation']['game_state'];actor=g['turn_player']
 proofs=[core.audit_normal(envelope,inventory),hand.audit_normal(envelope,events,inventory),board.audit_normal(envelope,inventory)]
 if any(p['errors'] for p in proofs):raise ValueError('normal payment operands differ: source predicates')
 costs={}
 for proof in proofs:
  for unit in proof['verified_units']:
   key=unit['enumeration_unit_id'];cost=0 if unit.get('action_type') in ('pass','challenge') else unit.get('payment_time')
   if key in costs and costs[key]!=cost:raise ValueError('normal payment operands differ: source disagreement')
   costs[key]=cost
 rows={}
 for unit in inventory['legal_candidate_details']:
  cid=unit['candidate_id'];cost=costs.get(unit['enumeration_unit_id']);source=unit['source_instance_id']
  if type(cost) is not int or cost<0:raise ValueError('normal payment operands differ: uncertified payment '+cid)
  if unit['action_type'] in ('relationship','challenge'):source=g['players'][actor]['board']['partner' if unit['action_type']=='relationship' else 'main']
  rows[cid]=dict(candidate_id=cid,payment_time=cost,time_after_certain_resolution=g['players'][actor]['time']-cost,card_copy_id=g['cards'][source]['card_copy_id'] if source is not None else '')
 return rows


def _audit_normal(envelope,events,decision):
 errors=[];verified=[];unproved=[]
 contract=decision.get('execution_evidence',{}).get('contract')
 if contract=='current_normal_comparison_evidence.v1':
  import copy
  try:
   if any(decision.get(k) is not None for k in ('problem','upper_priority_problem','fallback_priority_problem')):raise ValueError('conflicting normal payment route')
   rows=decision['execution_evidence']['comparison_operands']['candidates']
   projected=copy.deepcopy(decision);projected['execution_evidence']={}
   projected['problem']=dict(legal_candidate_ids=decision['inventory']['legal_candidate_ids'],candidates=[row['payment'] for row in rows.values()])
   return _audit_normal(envelope,events,projected)
  except (ValueError,KeyError,TypeError,AttributeError) as error:
   return dict(schema='normal_comparison_payment_operands.v1',applicable=True,supported_payment_operands_verified=False,errors=[str(error)],verified_candidates=[],unproved_candidates=[])
 partial=contract=='existing116_unproved_upper_comparison.v1'
 fallback=contract in ZERO_IMMEDIATE_CONTRACTS and decision.get('choice',{}).get('resolution_mode')=='seeded_fallback'
 applicable=partial or fallback or any(decision.get(k) is not None for k in ('problem','upper_priority_problem','fallback_priority_problem'))
 try:
  state.validate(envelope);g=envelope['legacy_continuation']['game_state'];actor=g['turn_player'];time=g['players'][actor]['time']
  if type(time) is not int or time<0:raise ValueError('normal payment actor time unproved')
  if decision.get('context',{}).get('decision_kind')!='normal_action':raise ValueError('not a normal payment comparison')
  if applicable:
   inventory=decision['inventory'];ids=inventory['legal_candidate_ids']
   if ids!=sorted(set(ids)):raise ValueError('payment comparison candidate identity differs')
   if partial:
    evidence=decision['execution_evidence']['candidate_comparison_evidence'];proved=evidence['proved_scores'];unknown=evidence['unproved']
    if any(decision.get(k) is not None for k in ('problem','upper_priority_problem','fallback_priority_problem')) or decision['choice']['resolution_mode']!='seeded_fallback':raise ValueError('partial payment comparison route differs')
    if type(proved) is not dict or type(unknown) is not dict or set(proved)&set(unknown) or set(proved)|set(unknown)!=set(ids):raise ValueError('partial payment comparison coverage differs')
    if any(row['candidate_id']!=key for key,row in proved.items()) or any(type(reason) is not str or not reason for reason in unknown.values()):raise ValueError('partial payment comparison identity differs')
    rows=list(proved.values())
    unproved.extend(dict(candidate_id=cid,reason='comparison_operand_unproved',comparison_reason=unknown[cid]) for cid in sorted(unknown))
   else:
    if fallback:
     if decision.get('problem') is not None or decision.get('upper_priority_problem') is not None:raise ValueError('fallback payment comparison route differs')
     problem=decision['fallback_priority_problem']
    else:
     if decision.get('fallback_priority_problem') is not None:raise ValueError('unexpected fallback payment comparison')
     problem=decision['upper_priority_problem'] if decision.get('upper_priority_problem') is not None else decision['problem']
    rows=problem['candidates']
    if ids!=problem['legal_candidate_ids'] or len(rows)!=len(ids) or {r['candidate_id'] for r in rows}!=set(ids):raise ValueError('payment comparison coverage differs')
   units=inventory['enumeration_units'];details=inventory['legal_candidate_details']
   unit_ids=[r['enumeration_unit_id'] for r in units]
   if len(unit_ids)!=len(set(unit_ids)):raise ValueError('payment enumeration identity duplicated')
   admitted=[r for r in units if r['disposition']=='admitted']
   if len(admitted)!=len(ids) or {r['candidate_id'] for r in admitted}!=set(ids):raise ValueError('payment admitted coverage differs')
   ordered=lambda items:sorted(items,key=lambda r:r['candidate_id'])
   if canonical(ordered(admitted))!=canonical(ordered(details)):raise ValueError('payment candidate projection differs')
   proofs=[core.audit_normal(envelope,inventory),hand.audit_normal(envelope,events,inventory),board.audit_normal(envelope,inventory)]
   for proof in proofs:
    if proof['errors']:raise ValueError('payment source predicates differ: '+str(proof['errors']))
   costs={}
   for proof in proofs:
    for unit in proof['verified_units']:
     key=unit['enumeration_unit_id'];cost=unit.get('payment_time')
     #01/02 standing pass and challenge declaration spend no time. Their
     #core predicate intentionally has no charged payment field.
     if unit.get('action_type') in ('pass','challenge'):cost=0
     if key in costs and costs[key]!=cost:raise ValueError('payment source proofs disagree')
     costs[key]=cost
   byid={r['candidate_id']:r for r in admitted}
   for row in rows:
    unit=byid[row['candidate_id']];key=unit['enumeration_unit_id'];cost=costs.get(key)
    if type(cost) is not int or cost<0:
     if partial or fallback:raise ValueError('proved comparison payment unverified: '+row['candidate_id'])
     unproved.append(dict(candidate_id=row['candidate_id'],reason='payment_source_not_in_certified_predicate_scope'));continue
    if type(row.get('payment_time')) is not int or row['payment_time']!=cost:raise ValueError('comparison payment differs: '+row['candidate_id'])
    remaining=time-cost
    if remaining<0 or type(row.get('time_after_certain_resolution')) is not int or row['time_after_certain_resolution']!=remaining:raise ValueError('comparison remaining time differs: '+row['candidate_id'])
    source=unit['source_instance_id']
    #Existing batch outcome identifies the current partner for relationship
    #and own main for challenge; standing inventory units have no card field.
    if unit['action_type'] in ('relationship','challenge'):source=g['players'][actor]['board']['partner' if unit['action_type']=='relationship' else 'main']
    copy_id=g['cards'][source]['card_copy_id'] if source is not None else ''
    #107/114 tie-break names the actual candidate's physical card copy. The
    #three upper-only helper contracts intentionally omit unused tie fields
    #for their source-cost/placement rows; do not invent them here.
    upper_only=decision.get('problem') is None and (fallback or decision.get('upper_priority_problem') is not None) and contract in ZERO_IMMEDIATE_CONTRACTS and row['candidate_id'] in decision['execution_evidence'].get('verified_immediate_candidates',[])
    copy_bound='card_copy_id' in row
    if copy_bound:
     if type(row['card_copy_id']) is not str or row['card_copy_id']!=copy_id:raise ValueError('comparison card copy differs: '+row['candidate_id'])
    elif not upper_only:raise ValueError('comparison card copy absent: '+row['candidate_id'])
    verified.append(dict(candidate_id=row['candidate_id'],enumeration_unit_id=key,payment_time=cost,time_after_certain_resolution=remaining,source_references=unit['source_references'],card_copy_identity_verified=copy_bound,card_copy_id=copy_id if copy_bound else None))
 except (ValueError,KeyError,TypeError,IndexError,AttributeError) as error:errors.append(str(error))
 return dict(schema='normal_comparison_payment_operands.v1',applicable=applicable,
  supported_payment_operands_verified=applicable and not errors and bool(verified),errors=errors,
  verified_candidates=verified,unproved_candidates=unproved,source_sha256={**core.SOURCES,**hand.SOURCES,**board.SOURCES},
  operand_provenance_verified=False,other_priority_operands_proven=False,information_use_proven=False,
  origin_authenticated=False,policy_eligible=None,balance_admitted=None)


def audit_normal(envelope,events,decision):
 return _audit_normal(envelope,events,decision)


def require_actual_comparison(step):
 """Join a fresh payment audit on every current normal comparison route.

 Legacy partial payment rows remain unknown when unproved; an all-unknown
 legacy payment partition cannot be certified. The current comparison route
 proves payment rows separately from unknown upper comparison operands.
 """
 decision=step['decision'];proof=step.get('normal_payment_operands',{})
 try:
  ids=decision['inventory']['legal_candidate_ids']
  if ids!=sorted(set(ids)):raise ValueError('candidate partition')
  if decision.get('execution_evidence',{}).get('contract')=='current_normal_comparison_evidence.v1':
   known=ids;expected_unknown=[]
  elif decision.get('execution_evidence',{}).get('contract')=='existing116_unproved_upper_comparison.v1':
   evidence=decision['execution_evidence']['candidate_comparison_evidence']
   known=sorted(evidence['proved_scores']);unknown=sorted(evidence['unproved'])
   if set(known)&set(unknown) or sorted(known+unknown)!=ids:raise ValueError('partial partition')
   expected_unknown=[dict(candidate_id=cid,reason='comparison_operand_unproved',comparison_reason=evidence['unproved'][cid]) for cid in unknown]
  else:
   problems=[decision[k] for k in ('problem','upper_priority_problem','fallback_priority_problem') if decision.get(k) is not None]
   if len(problems)!=1 or problems[0]['legal_candidate_ids']!=ids:raise ValueError('comparison route')
   known=ids;expected_unknown=[]
  rows=proof.get('verified_candidates')
  if proof.get('schema')!='normal_comparison_payment_operands.v1' or proof.get('errors')!=[] or proof.get('applicable') is not True or proof.get('supported_payment_operands_verified') is not bool(known):raise ValueError('payment proof')
  if type(rows) is not list or sorted(r['candidate_id'] for r in rows)!=known:raise ValueError('verified partition')
  unknown_rows=proof.get('unproved_candidates')
  if type(unknown_rows) is not list or canonical(sorted(unknown_rows,key=lambda r:r['candidate_id']))!=canonical(expected_unknown):raise ValueError('unknown partition')
 except (ValueError,KeyError,TypeError,AttributeError) as error:
  raise ValueError('current comparison payment coverage incomplete') from error
