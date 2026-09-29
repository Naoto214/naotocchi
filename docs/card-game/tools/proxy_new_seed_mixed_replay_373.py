#!/usr/bin/env python3
"""Apply the four checkpoint-372 selections to protected checkpoint 370."""
import argparse
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_choice_372 as choices
import proxy_new_seed_mixed_audit_371 as audits
import proxy_new_seed_mixed_replay_370 as states
import proxy_new_seed_mixed_replay_339 as end
import proxy_new_seed_mixed_replay_351 as chain
import proxy_new_seed_mixed_replay_357 as response
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-373-20260929.json'
SOURCE_RAW_SHA256='af55c3a32955c9d858e746e04904cc86b3b7b5d4d56567711eb167ca971f6c16'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_373.v1'
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
  raise ValueError('373 protected choice/audit/state differs')
 return json.loads(saved)['results'],json.loads(raw)['results'],json.loads(audited)['results']
def run_route(row,selected,proof):
 path=row['path_id']
 if ((path,row['last_valid_event_seq'],row['final_game_state_sha256'],row['final_continuation_state_sha256'])!=
     (selected['path_id'],selected['source_last_valid_event_seq'],selected['source_game_state_sha256'],
      selected['source_continuation_state_sha256'])):
  raise ValueError('373 selected boundary differs')
 if path=='probe-01-a-first':
  if (selected['selected_candidate']!='turn_end' or selected['resolution_mode']!='mandatory_proved_end' or
      selected['six_stage_checks']!=proof['completeness_checks'] or not proof['turn_end_set_complete']):
   raise ValueError('373 end choice differs')
  result=end.run_route(row,selected,proof)
 elif path=='probe-01-b-first':
  if selected['selected_candidate']!='response-pass' or proof['candidate_ids']!=['response-pass']:
   raise ValueError('373 chain choice differs')
  result=chain.run_route({**row,'path_id':'probe-01-a-first'},
       {**selected,'path_id':'probe-01-a-first'}, {**proof,'path_id':'probe-01-a-first'})
 elif path in ('probe-02-a-first','probe-02-b-first'):
  if selected['selected_candidate']!='response-pass' or proof['candidate_ids']!=['response-pass']:
   raise ValueError('373 end response choice differs')
  result=response.run_route({**row,'path_id':'probe-01-b-first'},
       {**selected,'path_id':'probe-01-b-first'}, {**proof,'path_id':'probe-01-b-first'})
 else:raise ValueError('373 path differs')
 return {**result,'path_id':path}
def validate_result(result):
 try:
  rows,selected,proofs=load_sources();path=result['path_id']
  row=next(x for x in rows if x['path_id']==path)
  choice=next(x for x in selected if x['path_id']==path)
  proof=next(x for x in proofs if x['path_id']==path)
  if result!=run_route(row,choice,proof) or result['last_valid_event_seq']!=row['last_valid_event_seq']+len(result['new_events']):
   return ['373 replay differs']
  game,continuation=row['final_game_state_sha256'],row['final_continuation_state_sha256']
  for event,shot in zip(result['new_events'],result['new_snapshots']):
   if (event['seq']!=shot['event_seq'] or event['game_state_before_sha256']!=game or
       event['continuation_state_before_sha256']!=continuation or
       event['game_state_after_sha256']!=shot['game_state_sha256'] or
       event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or
       start.opening._stop_state_sha256(shot['game_state'])!=shot['game_state_sha256'] or
       start.canonical_sha256(shot['continuation_state'])!=shot['continuation_state_sha256']):
    return ['373 event/snapshot/hash differs']
   game,continuation=shot['game_state_sha256'],shot['continuation_state_sha256']
  return [] if (game,continuation)==(result['final_game_state_sha256'],result['final_continuation_state_sha256']) else ['373 final hash differs']
 except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]
def build_report():
 rows,selected,proofs=load_sources()
 results=[run_route(r,next(x for x in selected if x['path_id']==r['path_id']),
                    next(x for x in proofs if x['path_id']==r['path_id'])) for r in rows]
 if len(results)!=4 or sum(len(x['new_events']) for x in results)!=5 or any(validate_result(x) for x in results):
  raise ValueError('373 transitions differ: '+repr([validate_result(x) for x in results]))
 return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,'completed':0,
         'new_decisions':sum(len(x['new_decisions']) for x in results),
         'new_events':5,'new_snapshots':5,'independent_balance_sample_count':0,'results':results}
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');a=p.parse_args()
 raw=canonical_bytes(build_report())
 if a.check:
  if OUTPUT.read_bytes()!=raw:raise SystemExit('373 canonical bytes differ')
 else:OUTPUT.write_bytes(raw)
 print('373: proved end, chain pass and two end response passes replayed')
if __name__=='__main__':main()
