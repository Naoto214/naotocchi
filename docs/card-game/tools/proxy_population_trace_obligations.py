"""Compose fresh current-entry responsibilities against the actual trace.

Call only after the connected entry has computed its audits. This structural
join does not authenticate saved certificates, prove every rule/allowed read,
or upgrade the historical460 readiness or population admission contracts.
"""
import proxy_continuation_state as state
import proxy_population_decision_binding as decisions
import proxy_population_start_obligations as starts
from proxy_mandatory_policy_contract import canonical

ROOT_PROOFS={
 'mandatory_policy_entry_audit':('registered_mandatory_policy_entry_audit.v1','local_entries_verified'),
 'mandatory_origin_audit':('runtime_policy_origin_sequence.v1','origin_sequence_verified'),
 'mandatory_opportunity_audit':('designated_mandatory_opportunity_coverage.v1','designated_opportunities_covered'),
 'resolution_semantics_audit':('supplied_resolution_semantics_join.v1','supplied_resolution_semantics_joined'),
 'nonresolution_semantics_audit':('supplied_nonresolution_semantics_join.v1','supplied_nonresolution_semantics_joined'),
 'decision_projection_audit':('step_decision_projection.v1','decision_projection_verified'),
 'source_conservation_audit':('bound107_actual_source_conservation.v1','supplied_source_conservation_verified'),
 'end_dispatch_obligation_audit':('actual_trace_end_dispatch_obligations.v1','supplied_end_dispatch_obligations_joined')}


def require(proof,schema,flag):
 if type(proof) is not dict or proof.get('schema')!=schema or proof.get(flag) is not True or proof.get('errors')!=[]:raise ValueError('trace obligations incomplete: '+schema)
 return proof


def same(actual,expected,label):
 if canonical(actual)!=canonical(expected):raise ValueError('trace obligations binding differs: '+label)


def require_actual_trace(record):
 """Require the fresh evidence bundle, while retaining all separate gaps."""
 for key,(schema,flag) in ROOT_PROOFS.items():require(record.get(key),schema,flag)
 runtime=record['runtime'];coverage=runtime['supported_trigger_coverage'];steps=runtime['steps']
 if coverage.get('schema')!='supported_trigger_coverage.v1' or coverage.get('covered') is not True or coverage.get('missing_occurrence_ids')!=[] or coverage.get('extra_occurrence_ids')!=[]:raise ValueError('trace obligations trigger coverage incomplete')
 same(coverage['expected_count'],coverage['recorded_count'],'occurrence denominator')
 order=coverage['processing_order']
 if order.get('schema')!='source_obligation_processing_order.v1' or order.get('phase_order_verified') is not True or order.get('supplied_closure_execution_bound') is not True:raise ValueError('trace obligations processing order incomplete')
 same(order['pending_count'],coverage['pending_count'],'pending obligations')
 if runtime['completed'] is True:same(coverage['pending_count'],0,'completed pending obligations')
 trigger_by_seq={r['before_envelope']['event_seq']:r for r in runtime['trigger_records']}
 if len(trigger_by_seq)!=len(runtime['trigger_records']):raise ValueError('trace obligations duplicate trigger boundary')
 counts=dict(ordinary_normal_count=0,ordinary_response_count=0,automatic_step_count=0,sequential_trigger_step_count=0)
 transitions=[];used=set();step_rows=[]
 for step in steps:
  before=step['source_envelope'];seq=before['event_seq'];decision=step['decision']
  if seq in trigger_by_seq:
   trigger=trigger_by_seq[seq];used.add(seq);kind='sequential_trigger_step_count'
   for key,target in (('before_envelope','source_envelope'),('after_envelope','final_envelope'),('events','events'),('decision','decision')):same(trigger[key],step[target],'trigger '+key)
  elif decision is None:
   kind='automatic_step_count'
   proof=require(step.get('automatic_output_binding'),'automatic_output_transition_binding.v1','automatic_output_binding_verified')
   if proof.get('ordinary_opportunity_handoffs_verified') is not True:raise ValueError('trace obligations automatic handoff incomplete')
   same(proof['identity']['entry_envelope_sha256'],state.canonical_sha256(before),'automatic boundary')
   same(proof['identity']['event_count'],len(step['events']),'automatic events')
  else:
   normal=decision.get('context',{}).get('decision_kind')=='normal_action'
   response=decision.get('decision_kind')=='response_action'
   if normal==response:raise ValueError('trace obligations ordinary decision kind differs')
   kind='ordinary_normal_count' if normal else 'ordinary_response_count'
   proof=require(step.get('ordinary_entry_binding'),'ordinary_entry_transition_binding.v1','entry_and_transition_binding_verified')
   same(proof['identity']['entry_envelope_sha256'],state.canonical_sha256(before),'ordinary boundary')
   same(proof['identity']['decision_sha256'],state.canonical_sha256(decision),'ordinary decision')
   require(step.get('decision_source_inventory'),'current_normal_source_inventory_coverage.v1' if normal else 'current_response_source_inventory_coverage.v1','source_and_variant_coverage_verified' if normal else 'source_coverage_verified')
   require(step.get('normal_candidate_expansions' if normal else 'response_candidate_expansions'),'normal_registered_candidate_expansions.v1' if normal else 'registered_response_candidate_expansions.v1','registered_expansions_verified')
   # The closed sequential-group contribution has already been composed here.
   # Reuse its predicate/comparison gate; do not invent stronger operand claims.
   decisions.require_current_predicates(step)
  counts[kind]+=1;step_rows.append(dict(event_seq=seq,kind=kind,entry_envelope_sha256=state.canonical_sha256(before)))
  if len(step['events'])!=len(step['envelopes']):raise ValueError('trace obligations transition count differs')
  for event,after in zip(step['events'],step['envelopes']):
   raw={k:v for k,v in event.items() if k not in ('execution_contract_id','envelope_before_sha256','envelope_after_sha256')}
   transitions.append(dict(event_seq=event['seq'],before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),event_sha256=state.canonical_sha256(raw)))
   before=after
 same(sorted(used),sorted(trigger_by_seq),'trigger step coverage')
 for name,count in counts.items():same(order[name],count,name)
 same(coverage['transitions'],transitions,'transition order')
 timing=coverage['timing_occurrence_audits']
 if type(timing) is not list or len(timing)!=len(transitions):raise ValueError('trace obligations timing coverage differs')
 for proof,boundary in zip(timing,transitions):
  require(proof,'supplied_four_source_timing_occurrences.v1','supplied_timing_occurrences_verified')
  hand=require(proof.get('hand_timing_audit'),'supplied_hand_timing_occurrences.v1','supplied_hand_timing_occurrences_verified')
  for row in (proof,hand):
   for field in ('before_envelope_sha256','after_envelope_sha256','event_sha256'):same(row[field],boundary[field],'timing '+field)
   same(row['source_catalog_sha256'],starts.CATALOG_SHA,'timing catalog')
  same(proof['scope'],['C-bat','M-antlion-03','M-antlion-06','P-cliff_goat'],'four timing sources')
  same(hand['scope'],['G-air-hockey'],'hand timing source')
 events=len(transitions);source=record['source_conservation_audit']
 same(source['physical_copy_count'],80,'physical source denominator');same(source['card_type_count'],41,'source type denominator')
 same(source['event_count'],events,'source transitions')
 same(record['end_dispatch_obligation_audit']['transition_count'],events,'end dispatch transitions')
 same(record['resolution_semantics_audit']['resolution_count']+record['nonresolution_semantics_audit']['event_count'],events,'full delta partition')
 same(record['decision_projection_audit']['decision_count'],len(runtime['decisions']),'exported judgments')
 return dict(schema='fresh_population_trace_obligations.v1',fresh_trace_responsibilities_joined=True,errors=[],
  step_count=len(steps),transition_count=events,step_counts=counts,steps=step_rows,
  root_evidence_sha256={key:state.canonical_sha256(record[key]) for key in ROOT_PROOFS},
  scope='fresh_connected_entry_existing_responsibilities_only',saved_proofs_authenticated=False,
  all_rule_opportunities_proven=False,information_use_proven=False,comparison_operand_provenance_verified=False,
  generation_provenance_verified=False,preflight_ready=False,policy_eligible=None,balance_admitted=None)
