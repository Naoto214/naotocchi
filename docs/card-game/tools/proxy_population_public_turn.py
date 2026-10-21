"""06 current-turn history boundaries, including the non-turn player's plays.

Opt-in89 second-own-card enumeration; native activation/effect and policy stay
unchanged. Public history remains supplied until the full entry authenticates it.
"""
import hashlib
from contextlib import contextmanager
from threading import Lock
import proxy_continuation_batch as batch
import proxy_continuation_triggers as triggers
from proxy_mandatory_policy_contract import ROOT

SOURCES={'06-action-chain-checkpoint.md':'7ac6d6141095d1139b8a8e072bc1523d621b7f100a57e292c08bbc97a7618c67',
 '89-world-13-card-text-draft.md':'19babfc75a43ed494a10d7be3a78f7586e1319ffc4314853689781ac74dc8269'}
STARTS={'turn_start_and_egg_draw','turn_start_and_normal_draw'}
PER_TURN_NATIVE={'W-city','M-beetle-02','P-desert_scorpion','I-sleepboost1'}
_LOCK=Lock()


def boundary(game,events):
 if game['turn_player'] not in ('A','B'):raise ValueError('current turn owner absent')
 rows=[e for e in events if e['action_type'] in STARTS|{'turn_end_completed'}]
 if not rows:raise ValueError('current public turn boundary absent')
 if any(type(e['seq']) is not int or e['seq']<1 for e in rows) or [e['seq'] for e in rows]!=sorted({e['seq'] for e in rows}):raise ValueError('turn boundaries unordered or duplicate')
 last=rows[-1]
 if last['action_type'] in STARTS:
  if last['actor']!=game['turn_player']:raise ValueError('latest public start is not current turn')
 elif game['phase']!='turn_start' or last['actor'] not in ('A','B') or last['actor']==game['turn_player']:raise ValueError('turn switch requires next start evidence')
 return last['seq']


def card_count(game,events,actor,through=None):
 if actor not in ('A','B'):raise ValueError('card-play owner absent')
 lower=boundary(game,events);upper=events[-1]['seq'] if through is None else through
 if type(upper) is not int:raise ValueError('card count boundary type differs')
 return sum(e['actor']==actor and lower<e['seq']<=upper and e['action_type'] in batch.NORMAL_CARD_EVENTS and e.get('source_zone') not in ('board','prepared') for e in events)


@contextmanager
def scope():
 for name,digest in SOURCES.items():
  if hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=digest:raise ValueError('current-turn source changed')
 if not _LOCK.acquire(blocking=False):raise ValueError('public turn scope concurrency/reentry forbidden')
 prior_count=batch.turn_card_count;prior_board=triggers.board_candidates;prior_used=triggers._used
 def used(current,events,source,card):
  if card not in PER_TURN_NATIVE:return prior_used(current,events,source,card)
  game=(batch.RESPONSE_FULL_CURRENT or current)['game_state'];since=boundary(game,events)
  return any(e['seq']>since and e['action_type']=='activate_response' and e.get('source_zone')=='board' and e.get('source_instance_id')==source for e in events)
 def boards(current,events,source,slot,runtime=None):
  game=(batch.RESPONSE_FULL_CURRENT or current)['game_state'];card=game['cards'][source]['card_id']
  if card!='W-city':return prior_board(current,events,source,slot,runtime)
  cap=batch.classification(card);actor=current['response_context']['priority_actor']
  if cap['timing']!='second_own_card' or game['players'][actor]['board']['world']!=source:raise ValueError('second-card public source differs')
  occurrences=[e for e in batch.response_play_occurrences(current,events,actor) if card_count(game,events,actor,e['seq'])==2]
  eligible=bool(occurrences) and not used(current,events,source,card);rows=[]
  if eligible:
   origin=occurrences[0]
   row=dict(candidate_id='response-activate-ability-'+source,candidate_family='triggered_ability',action_type='activate_board_ability',source_instance_id=source,card_id=card,card_copy_id=game['cards'][source]['card_copy_id'],target_instance_ids=[],candidate_variant=None,base_time_cost=0,source_references=[cap['reference']])
   if origin['seq']!=current['response_context']['origin_event_seq']:row['trigger_origin_event_seq']=origin['seq']
   rows.append(row)
  return rows,dict(source_instance_id=source,card_id=card,reason_code='enumerated_triggered_ability' if rows else 'trigger_condition_not_met',source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'])
 try:
  batch.turn_card_count=card_count;triggers.board_candidates=boards;triggers._used=used
  yield
 finally:batch.turn_card_count=prior_count;triggers.board_candidates=prior_board;triggers._used=prior_used;_LOCK.release()
