"""Conservative physical-context closure. Unknown dependencies never vanish."""
import copy
from proxy_equivalence_outcomes import validate_outcome


def _compare_derived(left,right):
 """Internal: caller has just derived both ledgers from the same validated input.

 The complete public context is a conservative dependency superset. This does
 not claim that every component actually depends on every field. Removing an
 edge needs a source-bound noninterference proof; none is guessed here.
 """
 a={r['atom_id']:r for r in left['atoms']};b={r['atom_id']:r for r in right['atoms']}
 unknown=[]
 boundary_equal=left['boundary']==right['boundary']
 if not boundary_equal:unknown.append('continuation_boundary_differs')
 complete=all(d['complete'] for r in (left,right) for d in r['dependencies'])
 opaque=left['opaque_unchanged'] and right['opaque_unchanged']
 # Identical unresolved response operators may cancel only with their whole
 # context, same physical source input and unchanged opaque region references.
 unresolved=set(left['unknowns']+right['unknowns'])-{'unresolved_response'}
 unknown.extend(sorted(unresolved))
 context_equal=(a==b and left['dependencies']==right['dependencies'] and boundary_equal and left['source_view_sha256']==right['source_view_sha256'])
 can_cancel=context_equal and complete and opaque and not unresolved
 if not can_cancel:unknown.append('dependency_unproved')
 matched=sorted(a) if can_cancel else []
 if set(a)!=set(b) or any(a[k]!=b[k] for k in set(a)&set(b)):unknown.append('residual_identity_or_state_differs')
 equal=can_cancel
 return dict(left_id=left['candidate_id'],right_id=right['candidate_id'],status='proved_equal' if equal else 'unknown',
  matched_atom_ids=matched,dependency_closures=copy.deepcopy(left['dependencies']) if equal else [],
  left_residual=sorted(set(a)-set(matched)),right_residual=sorted(set(b)-set(matched)),
  unknowns=sorted(set(unknown)),global_blockers=sorted(set(unknown)),
  relations={c:'equal' if equal else 'incomparable' for c in ('hand','board','reservations')},
  source_refs=['445-public-result-equivalence-design.md','plans/2026-10-03-public-result-equivalence-design-445.md'])


def prove_pair(left: dict, right: dict, equivalence_input: dict) -> dict:
 for r in (left,right):
  errors=validate_outcome(r,equivalence_input)
  if errors:raise ValueError('; '.join(errors))
 return _compare_derived(left,right)


def validate_pair(proof: dict, left: dict, right: dict, equivalence_input: dict) -> list[str]:
 try:return [] if proof==prove_pair(left,right,equivalence_input) else ['pair proof differs from independent recomputation']
 except (ValueError,KeyError,TypeError):return ['invalid pair proof inputs']
