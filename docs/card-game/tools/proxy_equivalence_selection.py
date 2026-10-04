"""Explicit 445A policy. 114/414/116 schemas and seed material are unchanged."""
import copy
from proxy_equivalence_inputs import validate_input
from proxy_equivalence_outcomes import derive_outcomes
from proxy_equivalence_proofs import _compare_derived
from proxy_resource_value_selection import select_problem, canonical_sha256 as sha

POLICY_ID='public_result_equivalence_pilot_v1'
SCHEMA='naotocchi.card_game.public_result_equivalence.v1'


def select_equivalence(equivalence_input: dict, *, enable_proofs: bool=True) -> dict:
 if type(enable_proofs) is not bool:raise ValueError('invalid proof switch')
 errors=validate_input(equivalence_input)
 if errors:raise ValueError('; '.join(errors))
 x=equivalence_input;baseline=select_problem(x['baseline_problem']);effective=copy.deepcopy(x['baseline_problem'])
 outcomes=derive_outcomes(x);by_id={o['candidate_id']:o for o in outcomes};proofs=[]
 for pair in effective['pairs']:
  proof=_compare_derived(by_id[pair['left_id']],by_id[pair['right_id']]);proofs.append(proof)
  if not enable_proofs or pair['kind']=='certified_safe_free_development':continue
  if proof['status']=='proved_equal':
   pair['relations']=copy.deepcopy(proof['relations']);pair['reason']='physical-context equality independently derived';pair['source_refs']=proof['source_refs']
  elif proof['global_blockers']:
   pair['relations']={c:'incomparable' for c in ('hand','board','reservations')}
 choice=select_problem(effective);selected=choice['selected_candidate']
 return dict(schema=SCHEMA,policy_id=POLICY_ID,input_sha256=sha(x),proofs_enabled=enable_proofs,
  baseline_selection=baseline,outcomes=outcomes,pair_proofs=proofs,effective_problem=effective,
  evidence_sha256=sha(dict(outcomes=outcomes,pairs=proofs)),frontier_report=choice['frontier_report'],
  selected_candidate=selected,selected_action=copy.deepcopy(next(a for a in x['actions'] if a['candidate_id']==selected)),
  selection_basis=choice['selection_basis'],decision_record=choice['decision_record'])


def validate_equivalence(wrapper: dict, equivalence_input: dict) -> list[str]:
 try:return [] if wrapper==select_equivalence(equivalence_input,enable_proofs=wrapper['proofs_enabled']) else ['equivalence wrapper/action/seed differs from recomputation']
 except (ValueError,KeyError,TypeError):return ['invalid equivalence selection input']
