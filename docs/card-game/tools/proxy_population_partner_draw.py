"""Current06/93 suppression of an already activated scorpion draw while egg.

Reuse native draw/chain/event machinery with zero draw operations. Never hide
or change game state, erase activation history, or amend historical source pins.
Other partner mechanisms have their own distinct existing handlers.
"""
import hashlib
from contextlib import contextmanager
from threading import Lock
import proxy_continuation_triggers as triggers
import proxy_population_start_obligations as starts
from proxy_population_resolution_order import SOURCE,SOURCE_SHA
from proxy_mandatory_policy_contract import ROOT

CARD='P-desert_scorpion'
_LOCK=Lock()


def verify_source():
 if hashlib.sha256((ROOT/SOURCE).read_bytes()).hexdigest()!=SOURCE_SHA:raise ValueError('partner suppression06 source changed')
 starts.catalog()


@contextmanager
def scope():
 if not _LOCK.acquire(blocking=False):raise ValueError('partner draw scope concurrency/reentry forbidden')
 original=triggers.resolve
 def resolve(current,initial):
  links=current['activation_zone'];link=links[-1] if links else None
  if not link or link.get('card_id')!=CARD or link.get('source_zone')!='board' or current['game_state']['players'][link['actor']]['board']['main'] is not None:return original(current,initial)
  verify_source();draws=triggers.DRAW_EFFECTS
  if draws.get(CARD)!=1:raise ValueError('native partner one-draw descriptor differs')
  try:
   triggers.DRAW_EFFECTS=dict(draws,**{CARD:0})
   return original(current,initial)
  finally:triggers.DRAW_EFFECTS=draws
 try:
  triggers.resolve=resolve;yield
 finally:triggers.resolve=original;_LOCK.release()
