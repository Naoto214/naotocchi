"""Compose freshly computed response predicates by the acting player's sources.

No proof authentication, candidate expansion, information-use or whole-rule
claim. Another local audit may cover a source left unproved by one component;
only a source covered nowhere remains in the explicit missing-source list.
"""
from proxy_mandatory_policy_contract import canonical

FAMILIES={
 'response_hand_predicates':('response_hand_activation_predicates.v1','response_hand_predicates_verified','hand'),
 'response_reaction_predicates':('ordinary_response_reaction_predicates.v1','response_reaction_predicates_verified','hand'),
 'response_board_predicates':('response_board_activation_predicates.v1','response_board_predicates_verified','board'),
 'response_prepared_predicates':('concealed_current_public_effect_predicates.v1',None,'prepared')}

def audit(envelope,inventory,proofs,group_closure=None):
 errors=[];covered={};wanted={};missing=[]
 try:
  c=envelope['legacy_continuation'];g=c['game_state'];ctx=c['response_context'];actor=ctx['priority_actor'];p=g['players'][actor];board=p['board']
  if actor not in ('A','B') or g['phase'] not in ('response_window','post_placement_response','turn_end_response') or ctx['chain_status'] not in ('empty','building') or c['pending_triggers']:raise ValueError('not an ordinary response composition entry')
  if inventory['actor']!=actor or canonical(inventory['response_context'])!=canonical(ctx):raise ValueError('response composition identity differs')
  sources=[(s,'hand') for s in p['hand']]+[(s,'board') for s in [board['main'],board['partner'],board['world'],*board['companions']] if s is not None]+[(s,'prepared') for s in board['prepared']]
  wanted=dict(sources)
  if len(wanted)!=len(sources):raise ValueError('duplicate response physical source')
  if set(proofs)!=set(FAMILIES):raise ValueError('response predicate family coverage differs')
  def claim(source,name,zone):
   if source not in wanted or wanted[source] not in (('board','prepared') if zone=='board' else (zone,)):raise ValueError('foreign response predicate source or zone')
   if source in covered:raise ValueError('overlapping response predicate source')
   covered[source]=name
  for name,(schema,flag,zone) in FAMILIES.items():
   proof=proofs[name]
   if proof['schema']!=schema or proof['errors']:raise ValueError('response predicate audit failed')
   if flag:
    if proof[flag] is not True:raise ValueError('response predicate verification absent')
    if type(proof['verified_source_ids']) is not list:raise ValueError('response verified source list differs')
    for source in proof['verified_source_ids']:claim(source,name,zone)
   else:
    # The prepared audit can verify I-bond rows while other public equipment
    # stays unproved. Its verified rows are local partial evidence, not a true
    # global-equipment flag inferred from an empty errors list.
    if any(type(proof[k]) is not bool for k in ('prepared_predicates_verified','equipment_predicates_verified')):raise ValueError('prepared predicate verification type differs')
    if not proof['prepared_predicates_verified'] and proof['verified_preparations']:raise ValueError('unproved preparations claimed verified')
    for key in ('verified_preparations','verified_equipment'):
     if type(proof[key]) is not list:raise ValueError('prepared verified source list differs')
     for row in proof[key]:
      if row['controller'] not in ('A','B'):raise ValueError('prepared predicate controller differs')
      if row['controller']==actor:claim(row['source_instance_id'],name,'prepared')
  if group_closure is not None:
   proof=group_closure
   if proof['schema']!='response_closed_group_predicates.v1' or proof['errors'] or proof['response_group_closure_verified'] is not True:raise ValueError('response group closure audit failed')
   import proxy_continuation_state as state
   if proof['current_envelope_sha256']!=state.canonical_sha256(envelope) or type(proof['verified_source_ids']) is not list:raise ValueError('response group closure binding differs')
   for source in proof['verified_source_ids']:claim(source,'response_group_closure','board')
  missing=sorted(set(wanted)-set(covered))
 except (ValueError,KeyError,TypeError,IndexError,AttributeError) as error:errors.append(str(error))
 return dict(schema='response_source_predicate_coverage.v1',supplied_response_source_predicates_covered=not errors and not missing,errors=errors,
  source_count=len(wanted),covered_source_count=len(covered),source_audit_families=covered,unproved_source_ids=missing,
  scope='current_priority_actor_card_source_predicates_only',caller_proofs_authenticated=False,complete_legal_set_proven=False,information_use_proven=False,history_authenticated=False,
  all_rule_opportunities_proven=False,policy_eligible=None,balance_admitted=None)
