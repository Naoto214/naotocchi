"""Owner/public event projection and source-bound companion application trace."""
import copy,hashlib
import proxy_continuation_batch as batch

PUBLIC_RESULT_KEYS={'challenge_id','declaring_actor','participants','parameter','outcome','values','winner','loser','growth_added','revealed_instance_id','revealed_card_id','revealed_type','target_instance_id','returned_instance_id','effect_applied'}


def event_projection(event,actor):
 result={k:copy.deepcopy(event[k]) for k in ('seq','action_type','actor','source_zone','participants','parameter','declaring_actor') if k in event}
 concealed=event['action_type']=='set_item' and event['actor']!=actor
 if not concealed:
  for key in ('source_instance_id','previous_world_instance_id'):
   if key in event:result[key]=event[key]
 if isinstance(event.get('result'),dict):
  public={k:copy.deepcopy(v) for k,v in event['result'].items() if k in PUBLIC_RESULT_KEYS}
  if public:result['result']=public
 return result


def companion_applied(game,events,actor):
 boards={o:dict(main=None,world=None,companions=[]) for o in ('A','B')};since=max((e['seq'] for e in events if e['action_type'] in ('turn_start_and_egg_draw','turn_start_and_normal_draw')),default=0);applied=[]
 for event in events:
  owner=event['actor'];source=event.get('source_instance_id');kind=event['action_type'];card=game['cards'].get(source,{}).get('card_id')
  if kind in ('main_movement','play_main_birth'):boards[owner]['main']=source
  elif kind=='place_world':boards[owner]['world']=source
  elif kind in ('place_companion','person_placement') and card and card.startswith('C-'):boards[owner]['companions'].append(source)
  elif kind=='activate_companion_ability' and source in boards[owner]['companions']:boards[owner]['companions'].remove(source)
  if event['seq']<since:continue
  if card and card.startswith('C-') and owner==actor and kind in ('resolve_board_trigger','resolve_board_ability'):
   cap=batch.classification(card);result=event.get('result',{})
   if card=='C-chicken':met=bool(result.get('revealed_instance_id') or result.get('revealed_card_id'))
   elif 'effect_applied' in result:met=result['effect_applied'] is True
   else:raise ValueError('companion resolution applied-effect classification unavailable: '+card)
   if met:applied.append(dict(event_seq=event['seq'],source_instance_id=source,source_reference=cap['reference'],application_kind='resolved_ability'))
  own=boards[actor];other=boards['B' if actor=='A' else 'A']
  if own['main'] and own['world'] and other['world']:
   for s in own['companions']:
    if game['cards'][s]['card_id']=='C-chameleon':
     cap=batch.classification('C-chameleon');applied.append(dict(event_seq=event['seq'],source_instance_id=s,source_reference=cap['reference'],application_kind='continuous_stat_adjustment'))
 # Current public application is sufficient even when a unit caller supplies
 # only the current opportunity's public history rather than the whole prefix.
 own=game['players'][actor]['board'];other=game['players']['B' if actor=='A' else 'A']['board']
 if own['main'] and own['world'] and other['world']:
  for s in own['companions']:
   if game['cards'][s]['card_id']=='C-chameleon':
    cap=batch.classification('C-chameleon');applied.append(dict(event_seq=events[-1]['seq'] if events else 0,source_instance_id=s,source_reference=cap['reference'],application_kind='current_continuous_stat_adjustment'))
 refs=['72-companion-26-card-text-draft.md','85-play-batch-4-card-text-draft.md']
 return dict(contract_id='public_companion_application_v1',actor=actor,condition_met=bool(applied),applications=applied,source_raw_sha256={ref:hashlib.sha256((batch.rules.ROOT/ref).read_bytes()).hexdigest() for ref in refs})
