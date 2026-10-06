"""Native challenge reward plus canonical bounded-growth evidence.

A win remains a win when its reward is capped. This evidence describes the
reward operation, not whether an entire challenge or card effect applied.
"""
import copy
from contextlib import contextmanager
from threading import Lock
import proxy_continuation_challenge as challenge
import proxy_continuation_payments as payments
import proxy_continuation_triggers as triggers
import proxy_continuation_end as end
import proxy_continuation_state as state
import proxy_population_effective_application as application
import proxy_population_effect_application_runtime as ruling
from proxy_mandatory_policy_contract import canonical
_NATIVE_COMPARE=challenge.compare
_LOCK=Lock()


def compare(native,envelope):
 ruling.verify_source();result=native(envelope);after=copy.deepcopy(result['new_envelopes'][0]);event=copy.deepcopy(result['new_events'][0]);receipt=event['result'];winner=receipt['winner']
 if winner is None:return result
 before=envelope['legacy_continuation']['game_state']['players'][winner]['growth'];part=application.growth(before,receipt['growth_added'])
 if after['legacy_continuation']['game_state']['players'][winner]['growth']!=before+receipt['growth_added']:raise ValueError('native challenge reward differs')
 receipt.update(growth_added=part['actual_delta'],growth_requested=part['requested_delta']);after['legacy_continuation']['game_state']['players'][winner]['growth']=part['after'];after['legacy_continuation']['game_state']['challenge']['result']=copy.deepcopy(receipt)
 event=payments.transition_event(envelope,after,'challenge_compared',event['actor'],result=receipt,source_reference=event['source_reference'],growth_evidence=dict(contract='bounded_growth_474.v1',source_sha256=ruling.RULING_SHA,actor=winner,operation=part))
 return payments.forced_result(envelope,after,event)


def resolve_board(native,current,initial):
 link=current['activation_zone'][-1]
 if link['card_id']!='W-countryside':return native(current,initial)
 ruling.verify_source();result=copy.deepcopy(native(current,initial));event=result['new_events'][0];actor=link['actor'];receipt=event['result'];part=application.growth(current['game_state']['players'][actor]['growth'],receipt['growth_added'])
 shot=result['new_snapshots'][0];after=copy.deepcopy(shot['continuation_state']);after['last_event_seq']=event['seq']
 if after['game_state']['players'][actor]['growth']!=part['before']+part['requested_delta']:raise ValueError('native board growth differs')
 after['game_state']['players'][actor]['growth']=part['after'];after['continuation_state_sha256']=triggers.old.start._hash(after)
 receipt.update(growth_added=part['actual_delta'],growth_requested=part['requested_delta'],effect_applied=part['status']=='applied')
 evidence=dict(contract='effective_application_474.v1',source_sha256=ruling.RULING_SHA,source_instance_id=link['source_instance_id'],chain_link_id=link['link_id'],resolved=True,activation_reference=dict(chain_link_id=link['link_id'],source_instance_id=link['source_instance_id'],origin_authenticated=False),parts=[part],parts_complete=True,status=part['status'])
 event=triggers._raw_event(current,after,'resolve_board_ability',actor,source_instance_id=link['source_instance_id'],source_zone='board',chain_link_id=link['link_id'],source_reference=event['source_reference'],result=receipt,application_evidence=evidence)
 result.update(final_continuation_state=triggers.old.start._payload(after),new_events=[event],new_snapshots=[triggers.old._snapshot(after)]);return result


def expire(native,envelope):
 g=envelope['legacy_continuation']['game_state']
 if not any(p['growth']==100 for p in g['players'].values()):return native(envelope)
 # Expiration is stage4, before the stage6 victory predicate (64). The
 # canonical typed lifetimes remain mandatory; no state projection is used.
 import hashlib
 from proxy_population_victory_history import SOURCES
 if hashlib.sha256((ruling.ROOT/'64-turn-boundaries-and-victory-timing.md').read_bytes()).hexdigest()!=SOURCES['64-turn-boundaries-and-victory-timing.md']:raise ValueError('expiration source changed')
 state.validate(envelope);payments.validate_effects(envelope);c=state.current(envelope)
 if g['phase']!='turn_end' or c['return_target']!='turn_end' or c['activation_zone'] or c['pending_triggers'] or c['response_context']['consecutive_passes']!=2 or 'challenge' in g or any(p['reservations'] or type(p['growth']) is not int or not 0<=p['growth']<=100 for p in g['players'].values()):raise ValueError('closed bounded expiration boundary unproved')
 names=('payment_effects','stat_effects','conditional_effects');effects=[r for name in names for r in envelope['runtime'][name]]
 if not effects:return None
 after=copy.deepcopy(envelope);after['event_seq']+=1
 for name in names:after['runtime'][name]=[]
 event=payments.transition_event(envelope,after,'expire_payment_modifiers',g['turn_player'],expired_effect_ids=sorted(r['effect_id'] for r in effects),source_reference='64-turn-boundaries-and-victory-timing.md')
 return payments.forced_result(envelope,after,event)


@contextmanager
def scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('bounded reward scope concurrency/reentry forbidden')
 prior=challenge.compare;prior_board=triggers.resolve;prior_verify=end.verify_new_events;prior_expire=payments.expire
 def verify(events,shots,runtime):
  proofs=prior_verify(events,shots,runtime);events_by_seq={e['seq']:e for e in events};byseq={e['event_seq']:e for e in runtime}
  for proof in proofs:
   event=events_by_seq[proof['event_seq']]
   if proof.get('card_id')!='W-countryside' or event['action_type']!='resolve_board_ability' or 'application_evidence' not in event:continue
   prior_envelope=byseq[event['seq']-1];result=resolve_board(prior_board,state.current(prior_envelope),None);result=triggers.actions.normalize_resolution_result(prior_envelope,result)
   if canonical(result['new_events'][0])!=canonical(event) or canonical(state.advance(prior_envelope,result['new_snapshots'][0]['continuation_state'],event['seq']))!=canonical(byseq[event['seq']]):raise ValueError('bounded board provenance differs')
   ruling.status(event);proof['certain_growth_difference']=event['result']['growth_added']
  return proofs
 try:
  payments.expire=lambda envelope:expire(prior_expire,envelope)
  challenge.compare=lambda envelope:compare(prior,envelope);triggers.resolve=lambda current,initial:resolve_board(prior_board,current,initial);end.verify_new_events=verify;yield
 finally:payments.expire=prior_expire;challenge.compare=prior;triggers.resolve=prior_board;end.verify_new_events=prior_verify;_LOCK.release()


def audit_challenge(record,envelope):
 try:return [] if canonical(record)==canonical(compare(_NATIVE_COMPARE,envelope)) else ['bounded challenge reconstruction differs']
 except (ValueError,KeyError,TypeError):return ['bounded challenge reconstruction failed']
