"""Join the pinned41-source responsibility table to fresh current107 traces.

The existing source-specific audits remain the authorities. This module neither
replays card effects nor authenticates saved proof dictionaries. It closes the
native-outside accounting and joins overlapping typed/hand obligations; it does
not prove arbitrary future executions, permitted selection or experiment input.
"""
import hashlib
from collections import Counter
import proxy_continuation_state as state
import proxy_population_start_obligations as starts
import proxy_population_trigger_predicates as predicates
import proxy_population_trace_obligations as trace
import proxy_population_source_root as source_root
import proxy_population_typed_resolution as typed
from proxy_mandatory_policy_contract import ROOT,canonical

TABLE='data/proxy-population-effective-application/verification/current-source-responsibilities.md'
TABLE_SHA='91ff6c806a1792324037132662391f3d505681875b6c3dc3a086cd0c3b96b587'
COUNTS=dict(native=11,start=2,latched=4,activated=3,passive=4,replacement=2,quick=15)
TYPED={'typed_payment':{'E-fateful-transform','P-cliff_goat'},'typed_stat':{'E-big-illness','G-air-hockey','G-baseball-batting','G-beach-volley','M-antlion-03','M-antlion-07','P-anglerfish'},'typed_conditional':{'G-basketball-3d'}}
ROUTES={'native':'native_source_collections','start':'start_source_collections','latched':'timing_occurrence_audits','activated':'ordinary_source_predicates','passive':'ordinary_source_predicates_and_full_delta','replacement':'ordinary_prepared_predicates_and_source_invariants','quick':'ordinary_hand_predicates_and_full_delta'}


def responsibilities():
 raw=(ROOT/TABLE).read_bytes()
 if hashlib.sha256(raw).hexdigest()!=TABLE_SHA:raise ValueError('responsibility source changed')
 result={};catalog=starts.catalog()['cards']
 for line in raw.decode().splitlines():
  cells=[s.strip() for s in line.split('|')[1:-1]]
  if len(cells)!=4 or cells[1] not in COUNTS:continue
  card,primary,_,_=cells
  if card in result:raise ValueError('duplicate responsibility source')
  result[card]=dict(primary=primary,additional=(['hand_timing'] if card=='G-air-hockey' else [])+[kind for kind,cards in TYPED.items() if card in cards],source_reference=catalog[card]['reference'],route=ROUTES[primary])
 if set(result)!=set(catalog) or Counter(r['primary'] for r in result.values())!=COUNTS:raise ValueError('responsibility catalog coverage differs')
 if {c for c,r in result.items() if r['primary']=='start'}!={c for c,r in catalog.items() if r['start_kind']!='none'}:raise ValueError('responsibility start scope differs')
 if set.union(*TYPED.values())!=typed.CARDS:raise ValueError('responsibility typed scope differs')
 return result


def audit(record):
 errors=[];rows=[];assignments=[];transition_count=0;table={}
 try:
  table=responsibilities();runtime=record['runtime'];coverage=runtime['supported_trigger_coverage']
  fresh=trace.require_actual_trace(record)
  if canonical(fresh)!=canonical(record['trace_obligations_audit']):raise ValueError('responsibility fresh trace join differs')
  expected_scope=dict(native=sorted(c for c,r in table.items() if r['primary']=='native'),latched=sorted(c for c,r in table.items() if r['primary']=='latched'),hand_optional=['G-air-hockey'],start_catalog_sha256=starts.CATALOG_SHA)
  if canonical(coverage['source_scope'])!=canonical(expected_scope):raise ValueError('responsibility runtime source scope differs')
  boundaries=[runtime['source_envelope']];events=[];before=boundaries[0]
  for step in runtime['steps']:
   for event,after in zip(step['events'],step['envelopes']):
    source_root.check_transition(before,after,event)
    events.append(event);boundaries.append(after);before=after
  scans=[coverage['initial_source_collection']]+coverage['native_source_collections']
  if len(scans)!=len(boundaries):raise ValueError('responsibility scan coverage differs')
  for boundary,scan in zip(boundaries,scans):
   public=starts.public_sources(boundary);predicates._public_sources(boundary,public)
   bound=state.canonical_sha256(boundary)
   if scan['current_envelope_sha256']!=bound:raise ValueError('responsibility scan boundary differs')
   classified=scan['classifications'];outside=scan['unproved_sources'];all_rows=classified+outside
   if len(all_rows)!=len(public) or {r['source_instance_id'] for r in all_rows}!=set(public):raise ValueError('responsibility public denominator differs')
   for group,native in ((classified,True),(outside,False)):
    for row in group:
     source=row['source_instance_id'];actual=public[source];card=actual['card_id'];role=table[card]
     if (role['primary']=='native') is not native:raise ValueError('responsibility public source assignment differs')
     if native:
      if row['proof']['current_predicate_audit']['source_reference']!=role['source_reference']:raise ValueError('responsibility native source reference differs')
     elif row['card_id']!=card:raise ValueError('responsibility outside source identity differs')
     if not native:
      if row['reason']!='outside_existing_trigger_adapter_scope':raise ValueError('responsibility native-outside reason differs')
      assignments.append(dict(event_seq=boundary['event_seq'],source_instance_id=source,card_id=card,primary=role['primary'],route=role['route'],source_reference=role['source_reference']))
   rows.append(dict(event_seq=boundary['event_seq'],envelope_sha256=bound,public_source_count=len(public),native_count=len(classified),other_responsibility_count=len(outside)))
  transition_count=len(events)
  for name,schema,flag in (
   ('typed_effect_creation_audits','source_typed_effect_creation.v1','typed_creation_verified'),
   ('typed_effect_expiry_audits','typed_turn_end_expiry.v1','typed_expiry_verified'),
   ('payment_consumption_audits','typed_payment_consumption.v2','payment_consumption_verified'),
   ('challenge_lifetime_audits','typed_challenge_lifetime.v1','supplied_challenge_lifetime_verified')):
   proofs=coverage[name]
   if type(proofs) is not list or len(proofs)!=transition_count:raise ValueError('responsibility typed transition coverage differs')
   for proof,before,after in zip(proofs,boundaries,boundaries[1:]):
    if proof.get('schema')!=schema or proof.get('errors')!=[] or type(proof.get('applicable')) is not bool or proof.get(flag) is not proof['applicable']:raise ValueError('responsibility typed verification differs: '+name)
    if proof['before_envelope_sha256']!=state.canonical_sha256(before) or proof['after_envelope_sha256']!=state.canonical_sha256(after):raise ValueError('responsibility typed boundary differs')
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='fresh_current107_source_responsibilities.v1',current107_responsibilities_joined=not errors,errors=errors,source_count=len(table),primary_counts=dict(COUNTS),source_table_sha256=TABLE_SHA,source_catalog_sha256=starts.CATALOG_SHA,
  responsibilities=table,boundary_count=len(rows),boundaries=rows,non_native_assignments=assignments,transition_count=transition_count,
  scope='current107_fresh_source_bound_responsibilities_and_actual_transition_invariants',saved_proofs_authenticated=False,all_future_executions_proven=False,information_use_proven=False,selection_basis_proven=False,input_provenance_verified=False,preflight_ready=False,policy_eligible=None,balance_admitted=None)
