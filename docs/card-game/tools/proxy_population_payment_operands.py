"""Current normal comparison payment binding, not a general value proof.

Reuse source-pinned core/hand predicate costs. Only supported admitted rows
are certified; physical-card costs, other priorities and historical origin
remain separate obligations. No selector, executor or value is changed.
"""
import proxy_continuation_state as state
import proxy_population_core_predicates as core
import proxy_population_hand_predicates as hand
from proxy_mandatory_policy_contract import canonical


def audit_normal(envelope,events,decision):
 errors=[];verified=[];unproved=[];applicable=decision.get('problem') is not None
 try:
  state.validate(envelope);g=envelope['legacy_continuation']['game_state'];actor=g['turn_player'];time=g['players'][actor]['time']
  if type(time) is not int or time<0:raise ValueError('normal payment actor time unproved')
  if decision.get('context',{}).get('decision_kind')!='normal_action':raise ValueError('not a normal payment comparison')
  if applicable:
   inventory=decision['inventory'];problem=decision['problem'];ids=inventory['legal_candidate_ids'];rows=problem['candidates']
   if ids!=sorted(set(ids)) or ids!=problem['legal_candidate_ids'] or len(rows)!=len(ids) or {r['candidate_id'] for r in rows}!=set(ids):raise ValueError('payment comparison coverage differs')
   units=inventory['enumeration_units'];details=inventory['legal_candidate_details']
   unit_ids=[r['enumeration_unit_id'] for r in units]
   if len(unit_ids)!=len(set(unit_ids)):raise ValueError('payment enumeration identity duplicated')
   admitted=[r for r in units if r['disposition']=='admitted']
   if len(admitted)!=len(ids) or {r['candidate_id'] for r in admitted}!=set(ids):raise ValueError('payment admitted coverage differs')
   ordered=lambda items:sorted(items,key=lambda r:r['candidate_id'])
   if canonical(ordered(admitted))!=canonical(ordered(details)):raise ValueError('payment candidate projection differs')
   proofs=[core.audit_normal(envelope,inventory),hand.audit_normal(envelope,events,inventory)]
   for proof in proofs:
    if proof['errors']:raise ValueError('payment source predicates differ: '+str(proof['errors']))
   costs={}
   for proof in proofs:
    for unit in proof['verified_units']:
     key=unit['enumeration_unit_id'];cost=unit['payment_time']
     #01/02 standing pass and challenge declaration spend no time. Their
     #core predicate intentionally has no charged payment field.
     if unit.get('action_type') in ('pass','challenge'):cost=0
     if key in costs and costs[key]!=cost:raise ValueError('payment source proofs disagree')
     costs[key]=cost
   byid={r['candidate_id']:r for r in admitted}
   for row in rows:
    unit=byid[row['candidate_id']];key=unit['enumeration_unit_id'];cost=costs.get(key)
    if type(cost) is not int or cost<0:
     unproved.append(dict(candidate_id=row['candidate_id'],reason='payment_source_not_in_core_or_hand_scope'));continue
    if type(row.get('payment_time')) is not int or row['payment_time']!=cost:raise ValueError('comparison payment differs: '+row['candidate_id'])
    remaining=time-cost
    if remaining<0 or type(row.get('time_after_certain_resolution')) is not int or row['time_after_certain_resolution']!=remaining:raise ValueError('comparison remaining time differs: '+row['candidate_id'])
    verified.append(dict(candidate_id=row['candidate_id'],enumeration_unit_id=key,payment_time=cost,time_after_certain_resolution=remaining,source_references=unit['source_references']))
 except (ValueError,KeyError,TypeError,IndexError,AttributeError) as error:errors.append(str(error))
 return dict(schema='normal_comparison_payment_operands.v1',applicable=applicable,
  supported_payment_operands_verified=applicable and not errors and bool(verified),errors=errors,
  verified_candidates=verified,unproved_candidates=unproved,source_sha256=dict(core.SOURCES,**hand.SOURCES),
  operand_provenance_verified=False,other_priority_operands_proven=False,information_use_proven=False,
  origin_authenticated=False,policy_eligible=None,balance_admitted=None)
