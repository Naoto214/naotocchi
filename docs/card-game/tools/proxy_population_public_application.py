"""Conditional public companion application from complete state/event history.

The runtime supplies authenticated transitions separately. This component never
reconstructs board presence from an incomplete list of placement event names.
"""
import copy,hashlib
from contextlib import contextmanager
from threading import Lock
import proxy_continuation_batch as batch
import proxy_continuation_public_history as history_api
from proxy_normal_decision_seeded_restart import _stop_state_sha256 as game_hash
from proxy_mandatory_policy_contract import canonical


def companion_applied(game,events,shots,actor):
 if actor not in ('A','B') or len(shots)!=len(events)+1 or [s['event_seq'] for s in shots]!=list(range(len(shots))) or [e['seq'] for e in events]!=list(range(1,len(shots))):raise ValueError('public application complete history coverage differs')
 for event,before,after in zip(events,shots,shots[1:]):
  for side,shot in [('before',before),('after',after)]:
   value=event.get('game_state_'+side+'_sha256',event.get('state_'+side+'_sha256'))
   if value!=game_hash(shot['game_state']):raise ValueError('public application history hash differs')
 # Callers may carry an owner-information projection; compare precisely the
 # public fields used here, not hidden hand/deck contents or concealed slots.
 def public(g):return dict(round=g['round'],turn_player=g['turn_player'],boards={a:{k:g['players'][a]['board'][k] for k in ('main','world','companions')} for a in 'AB'})
 if canonical(public(game))!=canonical(public(shots[-1]['game_state'])):raise ValueError('current public application boundary differs')
 current=(game['round'],game['turn_player']);start=len(shots)-1
 while start and (shots[start-1]['game_state']['round'],shots[start-1]['game_state']['turn_player'])==current:start-=1
 applications=[]
 for shot in shots[start:]:
  g=shot['game_state'];own=g['players'][actor]['board'];other=g['players']['B' if actor=='A' else 'A']['board']
  if own['main'] and own['world'] and other['world']:
   for source in own['companions']:
    if g['cards'][source]['card_id']=='C-chameleon':
     cap=batch.classification('C-chameleon');applications.append(dict(event_seq=shot['event_seq'],source_instance_id=source,source_reference=cap['reference'],application_kind='actual_public_continuous_stat_adjustment',game_state_sha256=game_hash(g)))
 for event in events:
  if event['seq']<start or event['actor']!=actor or event['action_type'] not in ('resolve_board_trigger','resolve_board_ability'):continue
  source=event.get('source_instance_id');g=shots[event['seq']-1]['game_state'];card=g['cards'].get(source,{}).get('card_id')
  if not card or not card.startswith('C-'):continue
  cap=batch.classification(card);receipt=event.get('result',{})
  if card=='C-cat_friend':
   from proxy_population_discard_recovery import targets
   target=receipt.get('target_instance_id');met=receipt.get('returned_to_hand')
   if type(target) is not str or type(met) is not bool:raise ValueError('recovery application receipt untyped')
   if met!=(target in targets(g,actor,card)):raise ValueError('recovery application condition differs')
   prior=g['players'][actor];after=shots[event['seq']]['game_state']['players'][actor]
   hand=copy.deepcopy(prior['hand']);discard=copy.deepcopy(prior['discard'])
   if met:discard.remove(target);hand.append(target)
   if canonical(hand)!=canonical(after['hand']) or canonical(discard)!=canonical(after['discard']):raise ValueError('recovery actual public movement differs')
  elif 'effect_applied' in receipt:

   if type(receipt['effect_applied']) is not bool:raise ValueError('companion application verdict is untyped')
   met=receipt['effect_applied']
  elif card=='C-chicken' and any(k in receipt for k in ('revealed_instance_id','revealed_card_id')):met=any(receipt.get(k) is not None for k in ('revealed_instance_id','revealed_card_id'))
  else:raise ValueError('companion resolution application unproved')
  if met:applications.append(dict(event_seq=event['seq'],source_instance_id=source,source_reference=cap['reference'],application_kind='resolved_ability'))
 refs=['72-companion-26-card-text-draft.md','85-play-batch-4-card-text-draft.md']
 return dict(contract_id='actual_public_companion_application.v1',actor=actor,condition_met=bool(applications),applications=applications,source_raw_sha256={ref:hashlib.sha256((batch.rules.ROOT/ref).read_bytes()).hexdigest() for ref in refs},origin_authenticated=False)

_LOCK=Lock()
@contextmanager
def scope(events,shots):
 if not _LOCK.acquire(blocking=False):raise ValueError('public application history scope reentry/concurrency forbidden')
 prior=history_api.companion_applied
 def checked(game,supplied,actor):
  n=len(supplied)
  if [e['seq'] for e in supplied]!=list(range(1,n+1)) or n>len(events):raise ValueError('public application supplied prefix differs')
  # Supplied history can be the existing public projection, but cannot change
  # event identity/action/actor. Read receipts only from actual runtime events.
  if any(any(e.get(k)!=events[i].get(k) for k in ('seq','action_type','actor')) for i,e in enumerate(supplied)):raise ValueError('public application event identity differs')
  return companion_applied(game,events[:n],shots[:n+1],actor)
 try:history_api.companion_applied=checked;yield
 finally:history_api.companion_applied=prior;_LOCK.release()
