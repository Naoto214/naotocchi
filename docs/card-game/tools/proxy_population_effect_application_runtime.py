"""Opt-in474 receipts on native growth effects; historical defaults unchanged.

The native handler still performs conditions, draws and source movement.
The wrapper bounds actual growth and rebuilds every event/snapshot hash.
Its validator independently reruns the native adapter from the supplied root;
that conditional root is not authenticated by this helper.
"""
import copy,hashlib
from contextlib import contextmanager
from threading import Lock
import proxy_population_effective_application as contract
import proxy_population_trigger_latching as latching
import proxy_continuation_payments as payments
import proxy_continuation_challenge as challenge
from proxy_mandatory_policy_contract import ROOT,canonical

_LOCK=Lock()
_NATIVE_RESOLVE=payments.resolve
RULING='474-effective-application-ruling.md'
RULING_SHA='8b863326575f41bdcfc1758f75eea489600da0a7b4059a3cbbf9094189aeab5f'

def verify_source():
 if hashlib.sha256((ROOT/RULING).read_bytes()).hexdigest()!=RULING_SHA:raise ValueError('application ruling source changed')

def status(event):
 verify_source()
 proof=event['application_evidence']
 if proof['contract']!='effective_application_474.v1' or proof['source_sha256']!=hashlib.sha256((ROOT/RULING).read_bytes()).hexdigest() or proof['resolved'] is not True or proof['chain_link_id']!=event['chain_link_id'] or proof['source_instance_id']!=event['source_instance_id']:raise ValueError('application evidence binding differs')
 for part in proof['parts']:
  if part.get('operation')=='growth' and canonical(part)!=canonical(contract.growth(part['before'],part['requested_delta'])):raise ValueError('bounded growth evidence differs')
 result=contract.classify(proof['parts'],proof['parts_complete'])
 if result!=proof['status']:raise ValueError('application classification differs')
 return result


def resolve(native,envelope,initial=None):
 verify_source()
 link=envelope['legacy_continuation']['activation_zone'][-1];card=link['card_id']
 if card not in payments.BOARD_COUNT_CARDS and card not in payments.IMMEDIATE_CARDS and card not in payments.TARGETED_CARDS and card not in payments.CONDITIONAL_CARDS and card not in payments.STAT_CARDS:return native(envelope,initial)
 result=native(envelope,initial);after=copy.deepcopy(result['new_envelopes'][0]);event=copy.deepcopy(result['new_events'][0]);receipt=event['created_effect'];actor=link['actor']
 if card in payments.TARGETED_CARDS or card in payments.CONDITIONAL_CARDS or card in payments.STAT_CARDS:
  # The existing source-checked native handler rechecks the selected physical
  # target at resolution. None alone is not proof: verify its exact predicate.
  if len(link['target_instance_ids'])!=1:raise ValueError('target count differs')
  target=link['target_instance_ids'][0];game=envelope['legacy_continuation']['game_state']
  if card in payments.TARGETED_CARDS:
   legal=target in payments.equipment_targets(game,envelope['runtime'],actor,card)
  else:
   owner=actor if card in payments.CONDITIONAL_CARDS or payments.STAT_CARDS[card].get('target_owner')=='own' else 'B' if actor=='A' else 'A'
   legal=target==game['players'][owner]['board']['main']
  if legal:
   if receipt is None:raise ValueError('native target success receipt absent')
   return result
  if receipt is not None or result.get('new_decisions'):raise ValueError('native target failure performed extra effects')
  parts=[dict(operation='target_recheck',target_instance_id=target,status='not_applied',reason='target_no_longer_legal',source_reference=copy.deepcopy(payments.capability(card)['reference']))]
 else:
  before=envelope['legacy_continuation']['game_state']['players'][actor]['growth'];part=contract.growth(before,receipt['growth_added']);parts=[part]
  if after['legacy_continuation']['game_state']['players'][actor]['growth']!=before+receipt['growth_added']:raise ValueError('native growth operation differs')
  after['legacy_continuation']['game_state']['players'][actor]['growth']=part['after']
  if card in payments.IMMEDIATE_CARDS:
   draws=receipt['drawn_instance_ids_by_actor']
   parts.append(dict(operation='draw',actual_instance_ids_by_actor=copy.deepcopy(draws),status='applied' if any(draws.values()) else 'not_applied',reason='actual_draw' if any(draws.values()) else 'empty_decks'))
 proof=dict(contract='effective_application_474.v1',source_sha256=hashlib.sha256((ROOT/RULING).read_bytes()).hexdigest(),source_instance_id=link['source_instance_id'],chain_link_id=link['link_id'],resolved=True,activation_reference=dict(chain_link_id=link['link_id'],source_instance_id=link['source_instance_id'],origin_authenticated=False),parts=parts,parts_complete=True,status=contract.classify(parts,True))
 if receipt is not None:receipt.update(growth_added=part['actual_delta'],growth_requested=part['requested_delta'],effect_applied=proof['status']=='applied')
 extra={k:v for k,v in event.items() if k not in {'seq','action_type','actor','game_state_before_sha256','game_state_after_sha256','continuation_state_before_sha256','continuation_state_after_sha256',*payments.end.BIND_KEYS}}
 extra['application_evidence']=proof
 bound=payments.transition_event(envelope,after,event['action_type'],event['actor'],**extra)
 rebuilt=payments.forced_result(envelope,after,bound);rebuilt['new_decisions']=copy.deepcopy(result.get('new_decisions',[]));return rebuilt


@contextmanager
def scope():
 verify_source()
 if not _LOCK.acquire(blocking=False):raise ValueError('effective application scope concurrency/reentry forbidden')
 native=payments.resolve;prior_latch=latching.applied;prior_history=challenge.quick_effect_applied
 def applied(event):
  if 'application_evidence' not in event:return prior_latch(event)
  result=status(event)
  if result=='unproved':raise ValueError('effect application unproved')
  return result=='applied'
 def history(game,events,actor,since):
  for event in events:
   if event['seq']<=since or event['actor']!=actor or not event['action_type'].startswith('resolve'):continue
   source=event.get('source_instance_id');card=game['cards'].get(source,{}).get('card_id')
   if card not in payments.QUICK_CARDS and card not in ('I-c_coin2','G-hit-blow','E-final-time','E-first-date'):continue
   if 'application_evidence' in event:
    if applied(event):return True
   elif prior_history(game,[event],actor,since):return True
  return False
 try:
  payments.resolve=lambda envelope,initial=None:resolve(native,envelope,initial);latching.applied=applied;challenge.quick_effect_applied=history;yield
 finally:payments.resolve=native;latching.applied=prior_latch;challenge.quick_effect_applied=prior_history;_LOCK.release()


def validate(record,envelope,initial=None):
 try:return [] if canonical(record)==canonical(resolve(_NATIVE_RESOLVE,envelope,initial)) else ['application native reconstruction differs']
 except (ValueError,KeyError,TypeError):return ['application reconstruction failed']
