"""Current normal entry for source-registered public-loss rewards.

Reuse the existing response condition/payment enumerator. A past main loss is
not a present-main target requirement. This changes no historical adapter and
supplies no strategic comparison operand or new selection policy.
"""
import copy
from contextlib import contextmanager
from threading import Lock
import proxy_continuation_candidates as candidates
import proxy_continuation_payments as payments
import proxy_continuation_state as state

_LOCK=Lock()

@contextmanager
def scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('loss reward scope concurrency/reentry forbidden')
 prior=candidates.ADMITTED_ID_ADAPTER
 def qualify(envelope,rows,history=None):
  result=prior(envelope,rows,history) if prior is not None else copy.deepcopy(rows)
  current=state.current(envelope);game=current['game_state'];actor=game['turn_player'];table=payments.old.start.load_candidate_rows()
  for row in result:
   card=row['card_id']
   if row['source_family']!='hand_card_action' or card not in payments.IMMEDIATE_CARDS or row['action_type']!='use_event':continue
   if history is None or candidates.HISTORY_ADAPTER is None:raise ValueError('public loss history unavailable')
   descriptor=payments.IMMEDIATE_CARDS[card]
   if descriptor['timing']!='after_own_main_loss_this_turn':raise ValueError('loss reward registered mechanism differs')
   if row['target_instance_ids'] or row['candidate_variant']!='single_no_target':raise ValueError('loss reward is not a current main target')
   details,proof=payments.hand_candidates(current,actor,row['source_instance_id'],table[card],history,envelope['runtime'])
   if len(details)>1:raise ValueError('loss reward candidate multiplicity differs')
   reasons=[]
   if actor not in candidates.HISTORY_ADAPTER(game,history):reasons.append('required_history_absent')
   if game['players'][actor]['time']<descriptor['base_time_cost']:reasons.append('insufficient_time')
   if bool(details)==bool(reasons):raise ValueError('loss reward existing predicate disagrees')
   row.update(disposition='excluded' if reasons else 'admitted',reason_codes=reasons,candidate_id=None if reasons else 'candidate-'+details[0]['candidate_id'].removeprefix('response-'),evidence=dict(payment_time=descriptor['base_time_cost'],activation_condition_proof=proof),source_references=[descriptor['reference']])
  return result
 try:candidates.ADMITTED_ID_ADAPTER=qualify;yield
 finally:candidates.ADMITTED_ID_ADAPTER=prior;_LOCK.release()
