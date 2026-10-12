"""Current P11 normal comparison evidence, distinct from legality and policy.

No comparison horizon is inferred from an atomic transition. Existing source
predicate audits prove payments/identity, not the upper comparison operands.
The ordered comparison kernel accepts proved values, and stops at the first
unknown rank; a lower payment can never fill that gap. Runtime evidence is
reconstructed, never accepted as a caller-supplied certificate. Historical
selectors and saved results are outside this opt-in current execution scope.
"""
import copy
import hashlib
import itertools
from contextlib import contextmanager
from threading import Lock
import proxy_continuation_candidates as candidates
import proxy_continuation_state as state
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_population_payment_operands as payments
from proxy_population_unproved_priority import SOURCES as LEGACY_SOURCES
from proxy_mandatory_policy_contract import ROOT,canonical

SOURCES={**LEGACY_SOURCES,'plans/2026-10-12-approved-normal-comparison-evidence.md':'0a69dfc7fcab6adf3b4b4a5ca4fcf49d42fe29b64c7876c2c20a7cf255c49c0e'}
CONTRACT='current_normal_comparison_evidence.v1'
PRIORITIES=tuple(priority.PRIORITY_ORDER[:4])
_LOCK=Lock()


def compare(left,right):
 """Conditional lexicographic arithmetic; provenance belongs to operands().

 Known earlier inequality is decisive even if a later rank is unknown.
 Equal known ranks continue; unknown is neither zero nor equal to unknown.
 Resource values are not invented when all four scalar ranks tie.
 """
 for key in PRIORITIES:
  pair=(left.get(key),right.get(key))
  for value in pair:
   if type(value) is not dict or value.get('status') not in ('known','unknown') or (value['status']=='known' and type(value.get('value')) is not int) or (value['status']=='unknown' and value.get('value','absent') is not None):raise ValueError('comparison operand evidence malformed')
  if any(v['status']=='unknown' for v in pair):return dict(winner='unresolved',decided_at=key,reason='comparison_operand_unproved')
  a,b=(v['value'] for v in pair)
  if a!=b:return dict(winner='left' if a>b else 'right',decided_at=key,reason=key)
 return dict(winner='unresolved',decided_at='hand_board_reservation_value',reason='unresolved_canonical_text')


def operands(envelope,inventory):
 """Check current candidate sources; retain exactly what those proofs prove.

 The current core/hand/board contracts certify neither general upper values
 nor an action's whole certain-resolution time balance. In particular, source
 classification, an atomic growth delta and absence of pending effects do not
 supply those proofs. Record this candidate-specific gap instead of importing
 the historical score constructors' literals. No class of cards is assigned
 an assumed value and no secret-state outcome is simulated to decide a value.
 """
 facts=payments.source_payments(envelope,inventory['public_history'],inventory)
 rows={}
 for action in inventory['legal_candidate_details']:
  cid=action['candidate_id'];payment=facts[cid]
  gap=dict(candidate_id=cid,enumeration_unit_id=action['enumeration_unit_id'],action_type=action['action_type'],source_instance_id=action['source_instance_id'],source_references=copy.deepcopy(action['source_references']))
  values={key:dict(status='unknown',value=None,reason='source_predicates_do_not_prove_comparison_operand',evidence=dict(gap,operand=key)) for key in PRIORITIES}
  rows[cid]=dict(operands=values,payment=payment)
 return dict(schema=CONTRACT,view_sha256=inventory['view_sha256'],public_history_sha256=hashlib.sha256(canonical(inventory['public_history'])).hexdigest(),candidates=rows,source_sha256=dict(SOURCES),comparison_horizon=None)


def select(envelope,inventory,context,policy,inputs=None):
 for path,digest in SOURCES.items():
  if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=digest:raise ValueError('114/116 source changed')
 state.validate(envelope);c=envelope['legacy_continuation'];g=c['game_state']
 if policy!='legacy_107_114_116' or g['phase']!='normal_action' or c['activation_zone'] or c['pending_triggers'] or any(p['reservations'] for p in g['players'].values()):raise ValueError('comparison evidence outside complete normal boundary')
 if context['actor']!=g['turn_player'] or context['round']!=g['round'] or context['actor_turn_index']!=g['round'] or context['phase']!='normal_action' or context['decision_kind']!='normal_action' or canonical(candidates.audit(envelope,inventory['public_history']))!=canonical(inventory):raise ValueError('comparison fresh inventory/context differs')
 evidence=operands(envelope,inventory);ids=inventory['legal_candidate_ids'];pairs=[];excluded=[]
 for left,right in itertools.combinations(ids,2):
  comparison=compare(evidence['candidates'][left]['operands'],evidence['candidates'][right]['operands'])
  pairs.append(dict(left_id=left,right_id=right,comparison=comparison))
  if comparison['winner'] in ('left','right'):excluded.append(dict(candidate_id=right if comparison['winner']=='left' else left,dominated_by=left if comparison['winner']=='left' else right,comparison=copy.deepcopy(comparison)))
 frontier=sorted(set(ids)-{r['candidate_id'] for r in excluded})
 if not frontier:raise ValueError('normal comparison frontier empty')
 winners=[cid for cid in ids if len(ids)>1 and all(cid==other or compare(evidence['candidates'][cid]['operands'],evidence['candidates'][other]['operands'])['winner']=='left' for other in ids)]
 if len(winners)==1:
  selected=winners[0]
  choice=dict(decision_kind='normal_action',resolution_mode='priority_unique',strategic_unresolved=False,reason_code='source_proved_priority_unique',legal_candidates=copy.deepcopy(ids),selected_candidate=selected,runner_up_candidates=[cid for cid in ids if cid!=selected])
 else:
  # Even a singleton with unknown operands does not acquire strategic proof.
  seed=fallback.build_seed_proof(context,frontier);selected=seed['selected_candidate']
  choice=dict(decision_kind='normal_action',resolution_mode='seeded_fallback',strategic_unresolved=True,reason_code='strategic_unresolved_seeded_fallback',legal_candidates=copy.deepcopy(ids),seeded_fallback_candidates=frontier,candidate_set_complete=True,candidate_set_evidence=dict(source_ref='116-normal-decision-fallback-contract.md',state_ref=inventory['view_sha256'],enumeration_rule='fresh current107 complete legal inventory; source-bound comparison evidence'),seed_context=copy.deepcopy(context),seed_proof=seed,selected_candidate=selected,runner_up_candidates=[cid for cid in frontier if cid!=selected])
  errors=fallback.validate_seeded_resolution(choice)
  if errors:raise ValueError(str(errors))
 return dict(policy_id=policy,selected_candidate=selected,choice=choice,problem=None,selected_action=copy.deepcopy(next(a for a in inventory['legal_candidate_details'] if a['candidate_id']==selected)),candidate_set_complete=True,inventory=copy.deepcopy(inventory),context=copy.deepcopy(context),execution_evidence=dict(contract=CONTRACT,comparison_operands=evidence,pairs=pairs,dominance_exclusions=excluded,strategic_proof=False,policy_eligible=False,balance_admitted=None))


def require_operand_provenance(decision):
 """Independent acceptance boundary; replaying the producer is insufficient.

 There is no source-derived upper-value/whole-resolution-time certifier in
 the current predicate contracts. This verifies each explicit gap against its
 actual inventory unit. A future known operand needs a source/state verifier
 here as well as a producer; a supplied known label cannot authorize itself.
 """
 inventory=decision['inventory'];evidence=decision['execution_evidence']['comparison_operands']
 rows=evidence['candidates']
 if type(rows) is not dict or set(rows)!=set(inventory['legal_candidate_ids']):raise ValueError('comparison operand source coverage differs')
 for action in inventory['legal_candidate_details']:
  cid=action['candidate_id'];values=rows[cid]['operands']
  if set(values)!=set(PRIORITIES):raise ValueError('comparison operand priority coverage differs')
  for key,value in values.items():
   expected=dict(status='unknown',value=None,reason='source_predicates_do_not_prove_comparison_operand',evidence=dict(candidate_id=cid,enumeration_unit_id=action['enumeration_unit_id'],action_type=action['action_type'],source_instance_id=action['source_instance_id'],source_references=action['source_references'],operand=key))
   if canonical(value)!=canonical(expected):raise ValueError('comparison operand source proof unavailable: '+cid+':'+key)


def audit(envelope,decision):
 errors=[]
 try:
  require_operand_provenance(decision)
  expected=select(envelope,decision['inventory'],decision['context'],decision['policy_id'])
  if canonical(expected)!=canonical(decision):raise ValueError('current comparison evidence or selection differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema=CONTRACT,comparison_evidence_verified=not errors,errors=errors,decision_sha256=hashlib.sha256(canonical(decision)).hexdigest(),entry_envelope_sha256=state.state_hash(envelope),strategic_proof=False,policy_eligible=False,balance_admitted=None)


def require_actual(step):
 # Join the fresh in-scope audit after native scopes have been restored. The
 # typed v2 envelope cannot be re-validated by the restored historical v1 API.
 # As with the surrounding trace joins, this is not a saved-proof verifier.
 decision=step['decision']
 proof=dict(schema=CONTRACT,comparison_evidence_verified=True,errors=[],decision_sha256=hashlib.sha256(canonical(decision)).hexdigest(),entry_envelope_sha256=state.canonical_sha256(step['source_envelope']),strategic_proof=False,policy_eligible=False,balance_admitted=None)
 if decision.get('execution_evidence',{}).get('contract')!=CONTRACT or canonical(proof)!=canonical(step.get('normal_comparison_evidence')):raise ValueError('current normal comparison evidence incomplete')


@contextmanager
def scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('comparison evidence scope concurrency/reentry forbidden')
 prior=candidates.select
 try:candidates.select=select;yield
 finally:candidates.select=prior;_LOCK.release()
