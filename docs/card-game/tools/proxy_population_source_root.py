"""Bind the supplied connected root to pinned107 physical identities.

Reuse466's source anchor and existing incarnation.create. This is structural
binding, not input provenance, lock authentication or whole-rule closure.
"""
import copy
import proxy_population_opening as opening
import proxy_population_incarnation as life
from proxy_mandatory_policy_contract import ROOT,canonical,load_json

FIXTURE='data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json'

def empty_reservations(game):
 if set(game['players'])!={'A','B'} or any(type(p['reservations']) is not list or p['reservations'] for p in game['players'].values()):raise ValueError('107 supplied trace contains unproved legacy reservations')

def check_transition(before,after,event):
 """Necessary invariants of supplied107 events, never all-opportunity proof."""
 prior=life.game(before);current=life.game(after);empty_reservations(prior);empty_reservations(current)
 actor=event['actor']
 if actor not in ('A','B'):raise ValueError('source invariant event actor differs')
 other='B' if actor=='A' else 'A';old=prior['players'][other]['board'];new=current['players'][other]['board']
 if old['main']!=new['main'] or sorted(old['companions'])!=sorted(new['companions']):raise ValueError('107 supplied event changes opponent main or companions')
 # Own-person movement, equipment removal, typed modifiers and resources are
 # checked by their existing full-delta audits, not inferred from this guard.


def bind(record):
 opening.verify_sources()
 players=load_json(ROOT/FIXTURE)['input']['players']
 originals={p['player_id']:p['deck_order_top_to_bottom'] for p in players}
 expected={r['initial_instance_id']:r for rows in originals.values() for r in rows}
 if set(originals)!={'A','B'} or len(expected)!=80 or any(len(rows)!=40 for rows in originals.values()):raise ValueError('107 physical inventory differs')
 prefix=record['opening'];runtime=record['runtime'];source=runtime['source_envelope']
 initial=prefix['initial']['initial_game_state'];finished=prefix['final_envelope']
 for game in (initial,life.game(finished)):
  empty_reservations(game)
  if set(game['players'])!={'A','B'}:raise ValueError('107 initial players differ')
  if canonical(game['cards'])!=canonical(expected):raise ValueError('107 initial physical definitions differ')
  for actor,p in game['players'].items():
   board=p['board'];located=p['hand']+p['deck']+p['discard']+board['companions']+board['prepared']+[board[k] for k in ('main','partner','world') if board[k] is not None]
   if sorted(located)!=sorted(r['initial_instance_id'] for r in originals[actor]):raise ValueError('107 initial owner physical locations differ')
 if source['event_seq']!=finished['event_seq'] or canonical(source['legacy_continuation'])!=canonical(finished['legacy_continuation']):raise ValueError('physical runtime root differs from opening prefix')
 root=life.create(source)
 if canonical(root)!=canonical(runtime['physical_lifecycle_root']):raise ValueError('physical lifecycle root differs from actual initial boundary')
 return copy.deepcopy(root)
