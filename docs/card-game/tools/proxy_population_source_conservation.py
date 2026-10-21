"""Bind107's physical definitions to every actual lifecycle transition.

Reuses the existing107 source catalogue and100/105 lifecycle. This establishes
conditional trace conservation, not legality, nonreachability, or origin trust.
It reads hidden identities for validation only, never feeds a selector.
"""
import proxy_population_incarnation as life
import proxy_population_opening as opening
import proxy_population_start_obligations as sources
from proxy_mandatory_policy_contract import ROOT,canonical,load_json


def same(actual,expected,message):
 if canonical(actual)!=canonical(expected):raise ValueError(message)


def check_owners(envelope,owners):
 g=life.game(envelope)
 for link in envelope['legacy_continuation']['activation_zone']:
  actor=link['actor']
  if type(actor) is not str or actor not in g['players']:raise ValueError('107 activation actor unknown')
  if owners.get(g['cards'][link['source_instance_id']]['card_copy_id'])!=actor:raise ValueError('107 activation actor differs from physical owner')
 for actor,p in g['players'].items():
  b=p['board'];located=p['hand']+p['deck']+p['discard']+b['companions']+b['prepared']+[b[k] for k in ('main','partner','world') if b[k] is not None]
  for link in envelope['legacy_continuation']['activation_zone']:
   if link['actor']==actor and link.get('source_zone')!='board':located.append(link['source_instance_id'])
  if any(owners.get(g['cards'][s]['card_copy_id'])!=actor for s in located):raise ValueError('107 physical owner changed')
 if any(p['reservations'] for p in g['players'].values()):raise ValueError('legacy reservation introduced into current107 trace')


def audit(record,bundle):
 errors=[];rows=[];physical_count=None;type_count=None;root_hash=None;final_hash=None
 try:
  catalog=sources.catalog();fixture=load_json(ROOT/catalog['fixture_path'])
  expected={};owners={}
  for p in fixture['input']['players']:
   for card in p['deck_order_top_to_bottom']:
    source=card['initial_instance_id'];physical=card['card_copy_id']
    if source in expected or physical in owners:raise ValueError('107 duplicate physical source')
    expected[source]=card;owners[physical]=p['player_id']
  physical_count=len(expected);type_count=len({c['card_id'] for c in expected.values()})
  if physical_count!=80 or type_count!=41:raise ValueError('107 physical/type denominator changed')
  initial=opening.load_match(bundle,record['binding']['match_id'])
  same(record['opening']['initial'],initial,'opening initial input binding differs')
  same(initial['initial_game_state']['cards'],expected,'107 physical source definitions differ')
  runtime=record['runtime'];before=runtime['source_envelope']
  same(life.game(before),life.game(record['opening']['final_envelope']),'opening/runtime game boundary differs')
  same(life.game(before)['cards'],expected,'runtime root source definitions differ')
  if before['event_seq']!=record['opening']['final_envelope']['event_seq']:raise ValueError('opening/runtime sequence differs')
  journal=life.create(before);same(runtime['physical_lifecycle_root'],journal,'actual lifecycle root differs');root_hash=life.digest(journal)
  check_owners(before,owners);flattened=[]
  for step in runtime['steps']:
   same(step['source_envelope'],before,'actual source discontinuity')
   if not step['events'] or len(step['events'])!=len(step['envelopes']):raise ValueError('actual event/envelope cardinality differs')
   for event,after in zip(step['events'],step['envelopes']):
    if type(event['seq']) is not int or type(after['event_seq']) is not int or event['seq']!=before['event_seq']+1 or after['event_seq']!=event['seq']:raise ValueError('actual source sequence differs')
    if event['envelope_before_sha256']!=life.digest(before) or event['envelope_after_sha256']!=life.digest(after):raise ValueError('actual source event binding differs')
    prior=life.digest(journal);journal=life.observe(journal,before,after,event.get('instance_transitions',[]));check_owners(after,owners)
    rows.append(dict(event_seq=event['seq'],event_sha256=life.digest(event),before_envelope_sha256=life.digest(before),after_envelope_sha256=life.digest(after),before_lifecycle_sha256=prior,after_lifecycle_sha256=life.digest(journal)))
    flattened.append(event);before=after
   same(step['final_envelope'],before,'actual step final differs')
  same(runtime['events'],flattened,'actual event projection differs');same(runtime['final_envelope'],before,'actual final envelope differs')
  same(runtime['physical_lifecycle_steps'],rows,'actual lifecycle event journal differs');same(runtime['physical_lifecycle_final'],journal,'actual lifecycle final differs');final_hash=life.digest(journal)
 except (ValueError,KeyError,TypeError,IndexError,AttributeError,OSError) as error:errors.append(str(error))
 return dict(schema='bound107_actual_source_conservation.v1',errors=errors,supplied_source_conservation_verified=not errors,
  physical_copy_count=physical_count,card_type_count=type_count,event_count=len(rows),events=rows,
  source_catalog_sha256=sources.CATALOG_SHA,root_lifecycle_sha256=root_hash,final_lifecycle_sha256=final_hash,
  observed_legacy_reservations_absent=not errors,legacy_reservation_unreachable_proven=False,
  all_handlers_reachable_proven=False,all_rule_opportunities_proven=False,origin_authenticated=False,policy_eligible=None,balance_admitted=None)
