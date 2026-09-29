#!/usr/bin/env python3
"""Apply the 107/114/116 pipeline and replay four reached opportunities."""
import argparse
import hashlib
import json
import sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_replay_384 as states
import proxy_new_seed_mixed_audit_383 as old_audit
import proxy_new_seed_mixed_audit_381 as normal_audit
import proxy_new_seed_mixed_audit_340 as egg_audit
import proxy_new_seed_normal_choice_229 as paid
import proxy_new_seed_mixed_replay_290 as normal_pass
import proxy_new_seed_egg_replay_205 as egg
import proxy_normal_decision_fallback_contract as fallback
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256='ec301d504f1e5d3bba191000a11c4e1e6ff9bedd5a9404e0dac6748d4c7136b2'
AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-385-20260929.json'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-385-20260929.json'
AUDIT_SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_audit_385.v1'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_385.v1'
def canonical_bytes(value):return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def load_source():
 raw=states.OUTPUT.read_bytes()
 if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or raw!=states.canonical_bytes(states.build_report()):raise ValueError('385 protected 384 state differs')
 rows=json.loads(raw)['results']
 if len(rows)!=4:raise ValueError('385 four route inventory differs')
 return rows
PAID_COST_AND_EFFECT=paid.cost_and_effect
def cost_and_effect(row,action):
 if action['action_type']!='place_world' or action['card_id']!='W-deepsea':return PAID_COST_AND_EFFECT(row,action)
 game=row['final_continuation_state']['game_state'];actor=game['turn_player'];owner=game['players'][actor]
 section=(ROOT/'89-world-13-card-text-draft.md').read_text().split('### W-deepsea — ',1)[1].split('\n### ',1)[0]
 entry=start.load_candidate_rows()['W-deepsea'];template=next(x for x in entry['actions'] if x['action_type']=='place_world')
 if (actor!='B' or action['source_instance_id'] not in owner['hand'] or owner['board']['world'] is not None or
     owner['board']['main'] is not None or len(owner['hand'])-1!=6 or template['base_time_cost']!=2 or
     '自分の手札が2枚以下の間、自分のメインのちから・ちえ+1' not in section):
  raise ValueError('385 deepsea current cost/effect differs')
 return 2,'89-world-13-card-text-draft.md#W-deepsea'
def select_normal(row,proof):
 original=paid.cost_and_effect
 try:
  paid.cost_and_effect=cost_and_effect
  selected=paid.audit_route(row,proof)
 finally:paid.cost_and_effect=original
 if selected['selected_candidate']!='pass' or len(selected['paid_comparisons'])!=len(proof['candidate_ids'])-1 or any(x['comparison']['decided_at']!='time_after_certain_resolution' for x in selected['paid_comparisons']):raise ValueError('385 priority comparison differs')
 return selected
def audit_route(row):
 game=row['final_continuation_state']['game_state'];path=row['path_id']
 if start.canonical_sha256(row['final_continuation_state'])!=row['final_continuation_state_sha256'] or start.opening._stop_state_sha256(game)!=row['final_game_state_sha256']:raise ValueError('385 source hash differs')
 base={'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'new_events':0,'completed':False,'balance_sample_count':0}
 if path=='probe-01-a-first':
  proof=next(x for x in json.loads(old_audit.OUTPUT.read_bytes())['results'] if x['path_id']==path)
  if (proof['source_last_valid_event_seq'],proof['source_game_state_sha256'],proof['source_continuation_state_sha256'])!=(row['last_valid_event_seq'],row['final_game_state_sha256'],row['final_continuation_state_sha256']) or not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values()):raise ValueError('385 preserved full set differs')
  selected=select_normal(row,proof)
  if fallback.canonical_candidate_ids(proof['candidate_ids'])!=sorted(proof['candidate_ids']):raise ValueError('385 fallback ID completeness differs')
  pipeline={'evaluated_contracts':[107,114,116],'selected_candidate':selected['selected_candidate'],'resolution_mode':selected['resolution_mode'],'paid_comparisons':selected['paid_comparisons'],'fallback_applied':False,'fallback_reason':'107_114_priority_unique','fallback_preconditions':{'complete_legal_candidates':True,'stable_canonical_candidate_ids':True,'permitted_information_only':True,'resolution_can_continue':True,'record_integrity_preserved':True},'fallback_needed_if_unresolved':True}
  return {**base,**{key:proof[key] for key in ('next_opportunity','candidate_ids','candidate_set_complete','legal_candidate_details','completeness_checks')},'decision_pipeline':pipeline,'selected':selected}
 if path=='probe-02-a-first':
  proof=normal_audit.audit_route(row);selected=select_normal(row,proof)
  return {**base,**{key:proof[key] for key in ('next_opportunity','candidate_ids','candidate_set_complete','legal_candidate_details','completeness_checks','board_exclusions')},'selected':selected}
 if path in ('probe-01-b-first','probe-02-b-first'):
  proof=egg_audit.audit_egg(row);decision=egg.run_route(row)['new_decisions'][0]
  if proof['candidate_ids']!=decision['legal_candidates'] or proof['legal_candidate_details']!=decision['legal_candidate_details'] or fallback.validate_seeded_resolution({k:v for k,v in decision.items() if k not in ('pre_game_state_sha256','pre_continuation_state_sha256','event_seq')}):raise ValueError('385 seeded egg candidate/decision differs')
  return {**base,**proof,'selected_candidate':decision['selected_candidate'],'selected_decision':decision}
 raise ValueError('385 path differs')
def build_audit():
 rows=[audit_route(r) for r in load_source()]
 return {'schema':AUDIT_SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':rows}
def run_route(row,proof):
 path=row['path_id']
 if path in ('probe-01-a-first','probe-02-a-first'):
  selected=proof['selected'];result=normal_pass.run_route(row,selected,proof)
 else:
  result=egg.run_route(row)
  if result['new_decisions']!=[proof['selected_decision']] or result['new_events'][0]['action_type']!='egg_exchange_bottom':raise ValueError('385 seeded egg replay differs')
 return result
def validate(row,result):
 if len(result['new_events'])!=len(result['new_snapshots']) or len(result['new_events'])!=1:raise ValueError('385 event/snapshot count differs')
 event,shot=result['new_events'][0],result['new_snapshots'][0]
 if (event['seq']!=row['last_valid_event_seq']+1 or event['seq']!=shot['event_seq'] or
  event['game_state_before_sha256']!=row['final_game_state_sha256'] or event['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or
  event['game_state_after_sha256']!=shot['game_state_sha256'] or event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or
  start.opening._stop_state_sha256(shot['game_state'])!=result['final_game_state_sha256'] or start.canonical_sha256(shot['continuation_state'])!=result['final_continuation_state_sha256']):raise ValueError('385 event/snapshot/hash differs')
def build_report():
 audit=build_audit();rows=load_source();results=[run_route(r,p) for r,p in zip(rows,audit['results'])]
 for r,v in zip(rows,results):validate(r,v)
 return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'audit_raw_sha256':hashlib.sha256(canonical_bytes(audit)).hexdigest(),'planned':4,'completed':0,'new_decisions':4,'new_events':4,'new_snapshots':4,'independent_balance_sample_count':0,'results':results}
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();a=canonical_bytes(build_audit());b=canonical_bytes(build_report())
 if args.check:
  if AUDIT.read_bytes()!=a or OUTPUT.read_bytes()!=b:raise SystemExit('385 canonical bytes differ')
 else:AUDIT.write_bytes(a);OUTPUT.write_bytes(b)
 print('385: 107/114/116 pipeline and four decisions replayed')
if __name__=='__main__':main()
