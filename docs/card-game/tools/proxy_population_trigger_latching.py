"""Conditional timing capture, separate from complete *current* legal actions.

No execution authenticity is inferred from caller-supplied state/event pairs.
Only four current107 timings are connected; other timings remain outside scope.
"""
import copy
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_continuation_batch as batch
import proxy_continuation_triggers as triggers
import proxy_population_start_obligations as sources
import proxy_population_opportunity_ledger as ledger
from proxy_mandatory_policy_contract import canonical

CARDS={'M-antlion-03','M-antlion-06','C-bat','P-cliff_goat'}
QUICK={'use_item','use_play','use_event'}


def applied(event):
 receipt=event.get('created_effect',event.get('result',{}))
 if 'effect_applied' in receipt:
  if type(receipt['effect_applied']) is not bool:raise ValueError('effect application must be typed')
  return receipt['effect_applied']
 # These positive receipts represent actual source-bound operations. Targets
 # alone do not prove success; absence is UNKNOWN, not a negative receipt.
 if receipt.get('effect_id') or receipt.get('growth_added',0)>0 or any(receipt.get(k) for k in ('drawn_instance_id','drawn_instance_ids','drawn_instance_ids_by_actor','revealed_card_type','revealed_card_id','revealed_instance_id','returned_discard_to_deck_bottom','returned_instance_id')):return True
 raise ValueError('effect application unproved')


def capture(before,after,event):
 state.validate(before);state.validate(after)
 if type(event.get('seq')) is not int or event['seq']!=after['event_seq'] or after['event_seq']!=before['event_seq']+1:raise ValueError('timing event sequence differs')
 prior=state.current(before);current=state.current(after)
 for suffix,value in (('before',prior),('after',current)):
  if event.get('game_state_'+suffix+'_sha256')!=triggers.old.start.opening._stop_state_sha256(value['game_state']) or event.get('continuation_state_'+suffix+'_sha256')!=triggers.old.start._hash(value):raise ValueError('timing event hash differs')
 rows=[];classified=[];public=sources.public_sources(before)
 for source,entry in sorted(public.items()):
  card=entry['card_id']
  if card not in CARDS:continue
  cap=batch.classification(card);actor=entry['actor'];met=False;reason='timing_not_met'
  if card=='M-antlion-06' and event['action_type'].startswith('resolve') and event['actor']==actor==prior['game_state']['turn_player']:
   links=[l for l in prior['activation_zone'] if l['link_id']==event.get('chain_link_id') and l['source_instance_id']==event.get('source_instance_id')]
   if len(links)!=1:raise ValueError('quick application provenance absent')
   link=links[0]
   if link['actor']==actor and link['action_type'] in QUICK and link.get('source_zone','hand')=='hand':
    met=applied(event);reason='own_quick_effect_applied' if met else 'effect_not_applied'
  if card in ('M-antlion-03','C-bat') and actor!=prior['game_state']['turn_player']:
   played=event.get('source_instance_id');entry_card=prior['game_state']['cards'].get(played,{}).get('card_id');entry=next((r for r in rules.table()['cards'] if r['card_id']==entry_card),None)
   quick=event['action_type'] in QUICK|{'activate_response'} and event.get('source_zone') not in ('board','prepared') and entry is not None and any(a['action_type'] in QUICK for a in entry['actions'])
   met=quick and event['actor']==(prior['game_state']['turn_player'] if card=='M-antlion-03' else actor);reason='quick_play_occurred' if met else 'timing_not_met'
  if card=='P-cliff_goat' and event['action_type']=='place_world' and event['actor']==actor:
   previous=prior['game_state']['players'][actor]['board']['world'];new=current['game_state']['players'][actor]['board']['world']
   if event.get('previous_world_instance_id')!=previous or event.get('source_instance_id')!=new:raise ValueError('world change receipt differs')
   met=previous is not None and new is not None and prior['game_state']['cards'][previous]['card_id']!=current['game_state']['cards'][new]['card_id'];reason='different_world_change' if met else 'not_different_world_change'
  classified.append(dict(source_instance_id=source,reason=reason,source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256']))
  if met:
   row=dict(origin_event_seq=event['seq'],source_instance_id=source,actor=actor,category='optional',ability_key=cap['timing'],source_reference=cap['reference']);ledger.identity(row);rows.append(row)
 return dict(schema='conditional_trigger_timing_capture.v1',scope=sorted(CARDS),before_envelope_sha256=state.canonical_sha256(before),after_envelope_sha256=state.canonical_sha256(after),event_sha256=state.canonical_sha256(event),occurrences=rows,classifications=classified,origin_authenticated=False,opportunity_completeness_proven=False)


def current_actions(envelope,occurrence):
 ledger.identity(occurrence);state.validate(envelope);game=envelope['legacy_continuation']['game_state'];source=occurrence['source_instance_id'];actor=occurrence['actor'];card=game['cards'].get(source,{}).get('card_id')
 if card not in CARDS:raise ValueError('unsupported latched source')
 cap=batch.classification(card)
 if occurrence['ability_key']!=cap['timing'] or occurrence['source_reference']!=cap['reference'] or occurrence['category']!='optional':raise ValueError('latched source contract differs')
 proof=dict(complete=True,source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'],origin_authenticated=False)
 public=sources.public_sources(envelope)
 if source not in public or public[source]['actor']!=actor:return [],dict(proof,reason='original_source_departed')
 if rules.used(envelope,source,cap.get('ability_key',cap['timing'])):return [],dict(proof,reason='usage_condition_unmet')
 p=game['players'][actor];combinations=[]
 if card=='M-antlion-06' and actor==game['turn_player']:
  worlds={r['card_id'] for r in rules.table()['cards'] if r['card_type']=='world'};costs=sorted(s for s in p['hand'] if game['cards'][s]['card_id'] in worlds);targets=sorted(s for s in p['discard'] if game['cards'][s]['card_id'] in worlds)
  combinations=[([cost],[target]) for cost in costs for target in targets]
 elif card=='M-antlion-03' and actor!=game['turn_player'] and any(envelope['runtime']['public_prepared'][s]['face_up'] is False for s in p['board']['prepared']):combinations=[([],[])]
 elif card=='C-bat' and actor!=game['turn_player']:combinations=[([],[target]) for target in sorted(p['board']['prepared'])]
 elif card=='P-cliff_goat' and p['board']['main'] is not None:combinations=[([],[])]
 rows=[dict(candidate_id='response-activate-ability-'+source+''.join('-cost-'+c for c in costs)+''.join('-target-'+t for t in targets),candidate_family='triggered_ability',action_type='activate_board_ability',source_instance_id=source,card_id=card,card_copy_id=game['cards'][source]['card_copy_id'],target_instance_ids=targets,cost_instance_ids=costs,candidate_variant=None,base_time_cost=0,source_references=[cap['reference']]) for costs,targets in combinations]
 return rows,dict(proof,reason='enumerated_current_cost_target_product' if rows else 'current_condition_cost_or_target_absent')



def validate(record,before,after,event):
 try:return [] if canonical(record)==canonical(capture(before,after,event)) else ['timing capture reconstruction differs']
 except (ValueError,KeyError,TypeError):return ['invalid timing capture']
