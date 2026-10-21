"""Bind the existing first-date/pass comparison to supplied public premises.

No new scores, future-response assumption, general legality or admission proof.
The five/zero values remain the existing comparison's conditional operands;
a current target can still change before resolution. Other routes stay unproved.
"""
import proxy_continuation_state as state
import proxy_population_response_predicates as predicates
import proxy_population_selection_basis as computation
from proxy_mandatory_policy_contract import canonical


def audit(envelope,events,record):
 errors=[];premises=[];values={};verified=False;applicable=False;unproved=[]
 try:
  inventory=record['candidate_set_evidence'];rows=inventory['legal_candidate_details']
  applicable=any(r.get('card_id')=='E-first-date' for r in rows)
  proof=predicates.audit(envelope,events,inventory)
  if proof['errors']:raise ValueError('response operand source predicates differ: '+str(proof['errors']))
  actor=envelope['legacy_continuation']['response_context']['priority_actor']
  if record['actor']!=actor or canonical(record['legal_candidate_details'])!=canonical(rows) or record['legal_candidate_ids']!=inventory['legal_candidate_ids']:raise ValueError('response operand record projection differs')
  for row in rows:
   if row.get('card_id')=='E-first-date':
    source=row['source_instance_id']
    if source not in proof['verified_source_ids']:raise ValueError('response operand source not covered by current hand proof')
    premises.append(dict(candidate_id=row['candidate_id'],**row['resolution_condition_evidence']))
  if record['resolution_mode']=='priority_unique':
   # The pure existing audit checks source pins, candidate coverage and the
   # complete computation record, including comparison values and selection.
   calculation=computation.audit(record)
   if calculation['errors'] or not calculation['selection_computation_verified']:raise ValueError('existing response computation differs: '+str(calculation['errors']))
   if not applicable:raise ValueError('response comparison outside first-date premises')
   for row in rows:
    if row['candidate_id']=='response-pass' and row['action_type']=='response_pass':values[row['candidate_id']]=0
    elif row.get('card_id')=='E-first-date' and row['resolution_condition_evidence']['legacy_five_growth_premises'] is True:values[row['candidate_id']]=5
    else:raise ValueError('response operand outside existing conditional comparison')
   verified=True
  else:unproved.append('no_existing_priority_comparison_in_this_record')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error));values={}
 return dict(schema='supplied_response_comparison_operands.v1',applicable=applicable,
  supplied_resolution_premises_verified=applicable and not errors,
  existing_comparison_operands_verified=verified and not errors,errors=errors,
  resolution_premises=premises,comparison_values=values,unproved=unproved,
  before_envelope_sha256=state.canonical_sha256(envelope),
  source_sha256=dict(predicates.hand.SOURCES,**computation.RESPONSE_SOURCES),
  future_resolution_proven=False,operand_provenance_verified=False,complete_legal_set_proven=False,
  information_use_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)
