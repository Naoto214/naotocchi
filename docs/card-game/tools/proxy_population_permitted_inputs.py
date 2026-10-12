"""Compose current read responsibilities, without claiming universal noninterference.

The pinned read review supplies the static current-code boundary; existing fresh
candidate, public-history, comparison and choice audits supply actual bindings.
This is not a saved-certificate verifier or a strategic/policy promotion.
"""
import hashlib
import proxy_continuation_state as state
import proxy_continuation_choices as choices
import proxy_population_opportunity_ledger as ledger
import proxy_population_trigger_sequential as sequential
import proxy_population_trace_obligations as trace
import proxy_population_decision_binding as decisions
import proxy_population_source_responsibilities as sources
from proxy_mandatory_policy_contract import ROOT,canonical

TABLE='data/proxy-population-effective-application/verification/public-read-boundary-review.md'
TABLE_SHA='0fa239ec19c401f5904fa9b8adba176b2613bc97200deaa0ddc4040a35f23f51'


def resolution_binding(step,initial):
 proof=step['resolution_choice_obligation'];route=proof['route']
 if proof.get('schema')!='resolution_choice_route_audit.v1' or proof.get('errors')!=[] or route not in ('designated_465_journal_required','existing_116_resolution_choice','source_proven_no_resolution_choice'):raise ValueError('resolution choice route unproved')
 if route!='designated_465_journal_required' and proof.get('resolution_choice_obligation_verified') is not True:raise ValueError('resolution choice inputs unproved')
 return dict(schema='fresh_resolution_choice_inputs.v1',choice_inputs_bound=True,errors=[],route=route,
  entry_envelope_sha256=state.canonical_sha256(step['source_envelope']),initial_choice_identity_sha256=state.canonical_sha256({k:initial[k] for k in ('path_id','order_id','first_player')}),
  decisions_sha256=state.canonical_sha256(step['mandatory_decisions']),route_audit_sha256=state.canonical_sha256(proof),
  designated_journal_required=route=='designated_465_journal_required',legacy_116_excluded=route=='existing_116_resolution_choice' and bool(step['mandatory_decisions']),
  saved_proofs_authenticated=False,strategic_solution_proven=False,policy_eligible=None,balance_admitted=None)


def require_sequential(record,initial):
 inv=record['inventory'];before=record['before_envelope'];journal=record['before_ledger'];effective=inv['effective_ledger']
 sequential.audit_ledger(journal);sequential.audit_ledger(effective)
 offered=ledger.offer(journal)
 for key in ('actor','category','group_rank'):trace.same(inv[key],offered[key],'sequential offered '+key)
 ids=sorted(canonical(a).decode() for a in inv['legal_candidate_details'])
 trace.same(inv['legal_candidate_ids'],ids,'sequential permitted candidates')
 if len(ids)!=len(set(ids)):raise ValueError('sequential duplicate candidates')
 automatic=not ids or inv['category']=='forced' and len(ids)==1
 if automatic:
  if record['decision'] is not None or record['excluded_by_116'] is not False or record['policy_eligible'] is not None:raise ValueError('sequential rule operation differs')
  return
 group=ledger.offer(effective)
 pending=sorted(k for k,a in group['actions'].items() if a['action']=='activate')
 ordinal=sum(r['operation']=='consume' for r in journal['journal'])
 address=hashlib.sha256(canonical(dict(group=pending,rank=inv['group_rank'],ordinal=ordinal))).hexdigest()
 expected=choices.resolve(initial,before['legacy_continuation'],inv['actor'],inv['legal_candidate_details'],'trigger_group_next_action_A',address)
 trace.same(record['decision'],expected,'sequential actual permitted choice inputs')
 if record['excluded_by_116'] is not True or record['policy_eligible'] is not False or record['strategic_unproven'] is not True:raise ValueError('sequential116 exclusion differs')


def audit(record):
 errors=[];rows=[];resolution_count=0;sequential_count=0
 try:
  if hashlib.sha256((ROOT/TABLE).read_bytes()).hexdigest()!=TABLE_SHA:raise ValueError('permitted read source changed')
  source=sources.audit(record)
  if source['current107_responsibilities_joined'] is not True:raise ValueError('permitted input source responsibilities incomplete')
  trace.same(source,record['source_responsibility_audit'],'permitted source responsibilities')
  initial=dict(path_id=record['binding']['match_id'],order_id=record['binding']['group_id'],first_player=record['opening']['initial']['first_player']);runtime=record['runtime']
  triggers={r['before_envelope']['event_seq']:r for r in runtime['trigger_records']}
  for step in runtime['steps']:
   before=step['source_envelope'];c=before['legacy_continuation'];seq=before['event_seq'];decision=step['decision'];proofs={}
   if seq in triggers:
    require_sequential(triggers[seq],initial);kind='sequential';sequential_count+=1
    proofs['sequential']=state.canonical_sha256(triggers[seq])
   elif decision is not None:
    decisions.require_current_predicates(step)
    normal=decision.get('context',{}).get('decision_kind')=='normal_action';kind='normal' if normal else 'response'
    keys=('normal_allowed_history','normal_comparison_evidence','normal_payment_operands','normal_unit_predicate_coverage') if normal else ('response_source_predicate_coverage','response_comparison_operands')
    proofs={key:state.canonical_sha256(step[key]) for key in keys}
   else:kind='automatic'
   resolving=c['response_context']['chain_status']=='resolving' and bool(c['activation_zone'])
   if resolving:
    expected=resolution_binding(step,initial)
    trace.same(step['resolution_choice_input_binding'],expected,'actual resolution choice inputs')
    if expected['designated_journal_required']:
     for name in ('mandatory_policy_entry_audit','mandatory_origin_audit','mandatory_opportunity_audit'):
      schema,flag=trace.ROOT_PROOFS[name];trace.require(record[name],schema,flag)
      proofs[name]=state.canonical_sha256(record[name])
    proofs['resolution_choice_input_binding']=state.canonical_sha256(expected);resolution_count+=1
   elif 'resolution_choice_input_binding' in step or 'resolution_choice_obligation' in step:raise ValueError('unexpected resolution choice input binding')
   rows.append(dict(event_seq=seq,kind=kind,entry_envelope_sha256=state.canonical_sha256(before),evidence_sha256=proofs))
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='fresh_current_permitted_input_responsibilities.v1',current_permitted_inputs_joined=not errors,errors=errors,
  read_table_sha256=TABLE_SHA,step_count=len(rows),steps=rows,resolution_count=resolution_count,sequential_count=sequential_count,
  scope='current_source_bound_read_review_and_fresh_actual_input_responsibilities',universal_noninterference_proven=False,
  saved_proofs_authenticated=False,strategic_solution_proven=False,preflight_ready=False,policy_eligible=None,balance_admitted=None)
