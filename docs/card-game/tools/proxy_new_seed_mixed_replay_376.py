#!/usr/bin/env python3
"""Apply the four checkpoint-375 selections to protected checkpoint 373."""
import argparse
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_choice_375 as choices
import proxy_new_seed_mixed_audit_374 as audits
import proxy_new_seed_mixed_replay_373 as states
import proxy_new_seed_egg_replay_205 as egg
import proxy_new_seed_mixed_replay_354 as chain
import proxy_new_seed_turn_end_replay_204 as end
import proxy_new_seed_start_audit_206 as hand
import copy
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-376-20260929.json'
SOURCE_RAW_SHA256='bdd369048790591a835b3af1bd0d128a844c23334d6076c66e752e5b4ea69724'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_376.v1'
def canonical_bytes(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
@lru_cache(maxsize=1)
def load_sources():
 raw,audited,saved=choices.OUTPUT.read_bytes(),audits.OUTPUT.read_bytes(),states.OUTPUT.read_bytes()
 if (hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or
     hashlib.sha256(audited).hexdigest()!=choices.SOURCE_RAW_SHA256 or
     hashlib.sha256(saved).hexdigest()!=choices.STATE_RAW_SHA256 or
     raw!=choices.canonical_bytes(choices.build_report()) or
     audited!=audits.canonical_bytes(audits.build_report()) or
     saved!=states.canonical_bytes(states.build_report())):
  raise ValueError('376 protected choice/audit/state differs')
 return json.loads(saved)['results'],json.loads(raw)['results'],json.loads(audited)['results']
ORIGINAL_CLASSIFY=end.classify_next_board
def classify_next_board(game,actor):
 if actor!='B':raise ValueError('376 next actor differs')
 board=game['players'][actor]['board']
 if board['main'] is not None or board['world'] is not None or board['prepared']:
  raise ValueError('376 next board boundary differs')
 companions=[(i,game['cards'][i]['card_id']) for i in board['companions']]
 if [card for _,card in companions] not in (['C-cat_friend'],['C-cat_friend','C-box']):
  raise ValueError('376 companion inventory differs')
 partner=board['partner']
 if partner is None or game['cards'][partner]['card_id']!='P-cliff_goat' or board['partner_stage'] is None:
  raise ValueError('376 partner inventory differs')
 friend=hand.source_section('72-companion-26-card-text-draft.md','C-cat_friend')
 box=hand.source_section('72-companion-26-card-text-draft.md','C-box')
 goat=hand.source_section('74-partner-18-card-text-draft.md','P-cliff_goat')
 if ('自分のターンに、このカードをなかま枠から山札の一番下に置き' not in friend or
     '自分のターン終了時' in friend or '能力なし。' not in box or
     '名前の異なるセカイへ変更した時' not in goat):
  raise ValueError('376 board timing source differs')
 projected=copy.deepcopy(game);projected_board=projected['players'][actor]['board']
 projected_board['companions']=[];projected_board['partner']=None;projected_board['partner_stage']=None
 classified=ORIGINAL_CLASSIFY(projected,actor)
 for instance,card in companions:
  classified.append({'source_instance_id':instance,'card_id':card,
    'trigger_kind':'activated_ability_not_turn_start' if card=='C-cat_friend' else 'none',
    'source_reference':'72-companion-26-card-text-draft.md#'+card})
 classified.append({'source_instance_id':partner,'card_id':'P-cliff_goat',
    'trigger_kind':'event_trigger_not_turn_start',
    'source_reference':'74-partner-18-card-text-draft.md#P-cliff_goat'})
 return classified
def run_route(row,selected,proof):
 path=row['path_id']
 if ((path,row['last_valid_event_seq'],row['final_game_state_sha256'],row['final_continuation_state_sha256'])!=
     (selected['path_id'],selected['source_last_valid_event_seq'],selected['source_game_state_sha256'],
      selected['source_continuation_state_sha256'])):
  raise ValueError('376 selected boundary differs')
 if path=='probe-01-a-first':
  if selected['resolution_mode']!='seeded_fallback' or proof['next_opportunity']!='mandatory_egg_exchange':
   raise ValueError('376 egg choice differs')
  result=egg.run_route(row)
  if (result['new_decisions']!=[selected['selected_decision']] or
      result['new_events'][0]['action_type']!='egg_exchange_bottom'):
   raise ValueError('376 seeded egg replay differs')
 elif path=='probe-01-b-first':
  if selected['selected_candidate']!='resolve_event' or proof['next_opportunity']!='chain_resolution':
   raise ValueError('376 chain resolution choice differs')
  result=chain.run_route({**row,'path_id':'probe-01-a-first'},
       {**selected,'path_id':'probe-01-a-first'}, {**proof,'path_id':'probe-01-a-first'})
 elif path in ('probe-02-a-first','probe-02-b-first'):
  if selected['selected_candidate']!='turn_end' or not proof['turn_end_set_complete']:
   raise ValueError('376 proved end choice differs')
  original=end.classify_next_board
  try:
   end.classify_next_board=classify_next_board
   result=end.run_route(row,proof)
  finally:end.classify_next_board=original
  if [e['action_type'] for e in result['new_events']]!=['turn_end_completed','turn_start_and_egg_draw']:
   raise ValueError('376 end/draw differs')
 else:raise ValueError('376 path differs')
 return {**result,'path_id':path}
def validate_result(result):
 try:
  rows,selected,proofs=load_sources();path=result['path_id']
  row=next(x for x in rows if x['path_id']==path)
  choice=next(x for x in selected if x['path_id']==path)
  proof=next(x for x in proofs if x['path_id']==path)
  if result!=run_route(row,choice,proof) or result['last_valid_event_seq']!=row['last_valid_event_seq']+len(result['new_events']):
   return ['376 replay differs']
  game,continuation=row['final_game_state_sha256'],row['final_continuation_state_sha256']
  for event,shot in zip(result['new_events'],result['new_snapshots']):
   if (event['seq']!=shot['event_seq'] or event['game_state_before_sha256']!=game or
       event['continuation_state_before_sha256']!=continuation or
       event['game_state_after_sha256']!=shot['game_state_sha256'] or
       event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or
       start.opening._stop_state_sha256(shot['game_state'])!=shot['game_state_sha256'] or
       start.canonical_sha256(shot['continuation_state'])!=shot['continuation_state_sha256']):
    return ['376 event/snapshot/hash differs']
   game,continuation=shot['game_state_sha256'],shot['continuation_state_sha256']
  return [] if (game,continuation)==(result['final_game_state_sha256'],result['final_continuation_state_sha256']) else ['376 final hash differs']
 except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]
def build_report():
 rows,selected,proofs=load_sources()
 results=[run_route(r,next(x for x in selected if x['path_id']==r['path_id']),
                    next(x for x in proofs if x['path_id']==r['path_id'])) for r in rows]
 if len(results)!=4 or sum(len(x['new_events']) for x in results)!=6 or any(validate_result(x) for x in results):
  raise ValueError('376 transitions differ: '+repr([validate_result(x) for x in results]))
 return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,'completed':0,
         'new_decisions':sum(len(x['new_decisions']) for x in results),
         'new_events':6,'new_snapshots':6,'independent_balance_sample_count':0,'results':results}
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');a=p.parse_args()
 raw=canonical_bytes(build_report())
 if a.check:
  if OUTPUT.read_bytes()!=raw:raise SystemExit('376 canonical bytes differ')
 else:OUTPUT.write_bytes(raw)
 print('376: seeded egg, chain resolution and two ends replayed')
if __name__=='__main__':main()
