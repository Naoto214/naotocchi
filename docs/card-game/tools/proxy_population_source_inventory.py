"""121 source-family/hand-variant coverage for the current normal entry.

Independent of selected candidates and complete flags. Reuses canonical table
and125 empty-source contract. Target predicates, information actually consumed,
selection semantics and whole-rule completeness remain separate obligations.
"""
import hashlib
import proxy_continuation_candidates as candidates
import proxy_continuation_state as state
from proxy_mandatory_policy_contract import ROOT,canonical
from proxy_population_unproved_priority import SOURCES as NORMAL_SOURCES
SOURCES=dict(NORMAL_SOURCES,**{'121-normal-action-candidate-completeness-contract.md':'062ce35cbe0e82d7edc7c3c4bd8b2266afe48e9201e3a0be24ca974ae7763092'})

def audit_normal(envelope,inventory):
 errors=[];sources=[];expected=set();actual=set()
 try:
  for name,digest in SOURCES.items():
   if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=digest:raise ValueError('source inventory contract changed')
  state.validate(envelope);game=envelope['legacy_continuation']['game_state'];actor=game['turn_player']
  projected=candidates.NORMAL_PROJECTION(envelope) if candidates.NORMAL_PROJECTION else envelope
  view=candidates.old.candidates.project_normal_action_information(dict(game_state=projected['legacy_continuation']['game_state'],actor=actor),{})
  sources=candidates.old.normal_audit.board.extension_125.inventory_sources(view)
  wanted={(row['family'],str(source)) for row in sources for source in row['sources']}
  units=inventory['enumeration_units']
  if {(u['source_family'],u['source_id']) for u in units}!=wanted:raise ValueError('six-family current source coverage differs')
  if len({u['enumeration_unit_id'] for u in units})!=len(units):raise ValueError('duplicate enumeration unit')
  table=candidates.rules.table();by_card={r['card_id']:r for r in table['cards']}
  for source in view['players'][actor]['hand']:
   row=by_card[view['cards'][source]['card_id']]
   expected.update(('hand_card_action',source,a['action_type'],variant) for a in row['actions'] for variant in a['candidate_variants'])
  expected.add(('standing_pass','pass','pass','pass'))
  expected.update(('normal_challenge','challenge:'+actor,'challenge',v) for v in ('power','wisdom'))
  stage=view['players'][actor]['board']['partner_stage']
  variant='no_partner' if stage is None else 'terminal' if stage=='married' else ('0-to-1','1-to-2','2-to-3','3-to-marriage')[stage]
  expected.add(('relationship_progress','relationship:'+actor,'relationship',variant))
  checked={'hand_card_action','standing_pass','normal_challenge','relationship_progress'}
  actual={(u['source_family'],u['source_id'],u['action_type'],u['candidate_variant']) for u in units if u['source_family'] in checked}
  if actual!=expected:raise ValueError('source action/variant coverage differs')
  for u in units:
   if u['source_family'] in ('hand_card_action','board_card_action'):
    zone='hand' if u['source_family']=='hand_card_action' else 'board'
    if u['source_zone']!=zone or u['source_instance_id']!=u['source_id'] or u['card_id']!=view['cards'][u['source_id']]['card_id']:raise ValueError('physical source/card/zone binding differs')
   elif u['source_instance_id'] is not None or u['card_id'] is not None:raise ValueError('non-card source has physical identity')
   if u['disposition'] not in ('admitted','excluded'):raise ValueError('unit disposition absent')
   if u['disposition']=='excluded' and (u['candidate_id'] is not None or not u['reason_codes']):raise ValueError('excluded unit lacks explicit reason')
   if u['disposition']=='admitted' and (type(u['candidate_id']) is not str or not u['candidate_id'] or u['reason_codes']):raise ValueError('admitted unit shape differs')
  details=sorted((u for u in units if u['disposition']=='admitted'),key=lambda u:u['candidate_id']);ids=[r['candidate_id'] for r in details]
  if len(ids)!=len(set(ids)) or ids.count('pass')!=1 or canonical(details)!=canonical(inventory['legal_candidate_details']) or ids!=inventory['legal_candidate_ids']:raise ValueError('legal projection differs from all disposition rows')
  if inventory['view_sha256']!=state.canonical_sha256(state.visible(envelope,actor)):raise ValueError('current visible state binding differs')
 except (ValueError,KeyError,TypeError,IndexError,OSError) as error:errors.append(str(error))
 return dict(schema='current_normal_source_inventory_coverage.v1',source_and_variant_coverage_verified=not errors,
  errors=errors,source_inventory=sources,expected_variant_count=len(expected),actual_variant_count=len(actual),source_sha256=dict(SOURCES),
  complete_legal_set_proven=False,target_predicates_proven=False,information_use_proven=False,
  all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)

def audit_response(envelope,opportunity):
 """119 current owner's sources must all be considered, including exclusions.

 Sidecar equipment/preparation classifications are retained. Their predicates
 and target expansion still need separate semantic proofs; presence is not one.
 """
 from proxy_population_opportunity_ledger import create
 import proxy_response_window_contract as response
 errors=[];wanted={};seen=set()
 try:
  state.validate(envelope);current=state.current(envelope);g=current['game_state'];ctx=current['response_context'];actor=ctx['priority_actor'];create(actor)
  if g['phase'] not in ('response_window','post_placement_response','turn_end_response') or ctx['chain_status'] not in ('empty','building') or current['pending_triggers']:raise ValueError('not an ordinary response source entry')
  if opportunity['actor']!=actor or canonical(opportunity['response_context'])!=canonical(ctx):raise ValueError('response opportunity identity differs')
  p=g['players'][actor];board=p['board'];wanted={s:'hand' for s in p['hand']}
  wanted.update({s:'board' for s in [board['main'],board['partner'],board['world'],*board['companions']] if s})
  wanted.update({s:'prepared' for s in board['prepared']})
  details=opportunity['legal_candidate_details'];ids=[r['candidate_id'] for r in details]
  if ids!=sorted(set(ids)) or ids!=opportunity['legal_candidate_ids'] or ids.count('response-pass')!=1:raise ValueError('response legal projection differs')
  for row in details:
   if row['candidate_id']=='response-pass':
    if canonical(row)!=canonical(response.build_response_pass_detail()):raise ValueError('response pass grammar differs')
    continue
   source=row['source_instance_id']
   if source not in wanted or row['card_id']!=g['cards'][source]['card_id'] or row['card_copy_id']!=g['cards'][source]['card_copy_id']:raise ValueError('response physical source/card differs')
   seen.add(source)
  for field in ('excluded_candidates','equipment_exclusions','preparation_exclusions','prepared_trigger_classifications'):
   rows=opportunity[field] if field=='excluded_candidates' else opportunity.get(field,[])
   for row in rows:
    source=row.get('source_instance_id')
    if source is None:continue # Empty-family or concealed opponent slot record.
    if source not in wanted:
     if field not in ('equipment_exclusions','preparation_exclusions'):raise ValueError('response exclusion source not owned')
     continue
    if not(row.get('reason_code') or row.get('reason')):raise ValueError('source classification reason absent')
    if 'card_id' in row and row['card_id']!=g['cards'][source]['card_id']:raise ValueError('exclusion card binding differs')
    if row.get('source_zone') is not None and row['source_zone']!=wanted[source] and not(wanted[source]=='prepared' and row['source_zone']=='board'):raise ValueError('exclusion zone binding differs')
    seen.add(source)
  if seen!=set(wanted):raise ValueError('response source omitted from candidates and classifications')
 except (ValueError,KeyError,TypeError,OSError) as error:errors.append(str(error))
 return dict(schema='current_response_source_inventory_coverage.v1',source_coverage_verified=not errors,
  errors=errors,source_inventory=[dict(source_instance_id=s,zone=z) for s,z in sorted(wanted.items())],covered_source_ids=sorted(seen),
  complete_legal_set_proven=False,target_predicates_proven=False,information_use_proven=False,
  all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)
