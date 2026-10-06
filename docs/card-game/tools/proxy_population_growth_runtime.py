"""Native challenge reward plus canonical bounded-growth evidence.

A win remains a win when its reward is capped. This evidence describes the
reward operation, not whether an entire challenge or card effect applied.
"""
import copy
from contextlib import contextmanager
from threading import Lock
import proxy_continuation_challenge as challenge
import proxy_continuation_payments as payments
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


@contextmanager
def scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('bounded reward scope concurrency/reentry forbidden')
 prior=challenge.compare
 try:challenge.compare=lambda envelope:compare(prior,envelope);yield
 finally:challenge.compare=prior;_LOCK.release()


def audit_challenge(record,envelope):
 try:return [] if canonical(record)==canonical(compare(_NATIVE_COMPARE,envelope)) else ['bounded challenge reconstruction differs']
 except (ValueError,KeyError,TypeError):return ['bounded challenge reconstruction failed']
