#!/usr/bin/env python3
"""Choose a seeded egg, mandatory resolution, and two proved ends."""
import argparse
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_audit_374 as audits
import proxy_new_seed_mixed_replay_373 as states
import proxy_new_seed_egg_replay_205 as egg
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'data/proxy-new-seed-mixed-choice-375-20260929.json'
SOURCE_RAW_SHA256='fccfc33cb7396b86e56d4491c2e80cd8ddd00213501f75f2ca0ae7709f51ecd2'
STATE_RAW_SHA256='62df4729d905f256e37c6373913b936b2744b5b8156eb2de7ede09256d11e70a'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_choice_375.v1'
def canonical_bytes(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
@lru_cache(maxsize=1)
def load_sources():
 raw,saved=audits.OUTPUT.read_bytes(),states.OUTPUT.read_bytes()
 if (hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or
     hashlib.sha256(saved).hexdigest()!=STATE_RAW_SHA256 or
     raw!=audits.canonical_bytes(audits.build_report()) or
     saved!=states.canonical_bytes(states.build_report())):
  raise ValueError('375 protected audit/state differs')
 proofs,rows=json.loads(raw)['results'],json.loads(saved)['results']
 if len(proofs)!=4 or len(rows)!=4 or any(audits.audit_route(r)!=p for r,p in zip(rows,proofs)):
  raise ValueError('375 audited inventory differs')
 return rows,proofs
def choose(row,proof):
 if ((row['path_id'],row['last_valid_event_seq'],row['final_game_state_sha256'],row['final_continuation_state_sha256'])!=
     (proof['path_id'],proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],proof['source_continuation_state_sha256'])):
  raise ValueError('375 source boundary differs')
 path=row['path_id'];base={'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],
  'source_game_state_sha256':row['final_game_state_sha256'],
  'source_continuation_state_sha256':row['final_continuation_state_sha256'],
  'new_events':0,'completed':False,'balance_sample_count':0}
 if path=='probe-01-a-first':
  if proof['next_opportunity']!='mandatory_egg_exchange' or not proof['candidate_set_complete'] or proof['resolution_mode']!='seeded_fallback':
   raise ValueError('375 egg proof differs')
  decision=egg.run_route(row)['new_decisions'][0]
  if (decision['legal_candidates']!=proof['candidate_ids'] or
      decision['legal_candidate_details']!=proof['legal_candidate_details'] or
      decision['resolution_mode']!='seeded_fallback' or decision['selected_candidate'] not in proof['candidate_ids']):
   raise ValueError('375 seeded egg resolution differs')
  return {**base,'candidate_ids':proof['candidate_ids'],'selected_candidate':decision['selected_candidate'],
          'resolution_mode':'seeded_fallback','selected_decision':decision}
 if path=='probe-01-b-first':
  if (proof['next_opportunity']!='chain_resolution' or not proof['candidate_set_complete'] or
      not proof['effect_preconditions_proved'] or proof['source_instance_id']!='A-040#1' or
      proof['target_instance_id']!='A-017#1' or proof['expected_growth_delta']!=5):
   raise ValueError('375 mandatory resolution proof differs')
  return {**base,'candidate_ids':[],'selected_candidate':'resolve_event',
          'resolution_mode':'mandatory_chain_resolution',
          'target_instance_id':proof['target_instance_id'],
          'expected_drawn_instance_id':proof['expected_drawn_instance_id'],
          'source_reference':proof['source_reference'],'paid_comparisons':[]}
 if path not in ('probe-02-a-first','probe-02-b-first') or proof['next_opportunity']!='turn_end' or \
    not proof['turn_end_set_complete'] or proof['contract_stop_codes'] or not all(proof['completeness_checks'].values()):
  raise ValueError('375 mandatory end proof differs')
 return {**base,'selected_candidate':'turn_end','resolution_mode':'mandatory_proved_end',
         'six_stage_checks':proof['completeness_checks']}
def build_report():
 rows,proofs=load_sources();results=[choose(r,p) for r,p in zip(rows,proofs)]
 return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'state_raw_sha256':STATE_RAW_SHA256,
         'planned':4,'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':results}
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');a=p.parse_args()
 raw=canonical_bytes(build_report())
 if a.check:
  if OUTPUT.read_bytes()!=raw:raise SystemExit('375 canonical bytes differ')
 else:OUTPUT.write_bytes(raw)
 print('375: seeded egg, mandatory resolution and two ends selected')
if __name__=='__main__':main()
