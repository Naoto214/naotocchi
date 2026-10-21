#!/usr/bin/env python3
"""Audit and replay four independently proved next opportunities at 399."""
import argparse, copy, hashlib, json, sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_replay_399 as source
import proxy_new_seed_mixed_audit_381 as normals
import proxy_new_seed_mixed_audit_340 as eggs
import proxy_new_seed_mixed_choice_325 as paid_world
import proxy_new_seed_mixed_replay_388 as deepsea
import proxy_new_seed_normal_choice_229 as paid
import proxy_normal_decision_hardening as priority
import proxy_new_seed_mixed_replay_290 as normal_replay
import proxy_new_seed_egg_replay_205 as egg_replay
import proxy_new_seed_mixed_replay_379 as response_pass
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE_SHA='c1398339b1e67c04006693bfbd4e99b34e59b32e6689950673765814d09bd4e2'
AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-400-20260929.json'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-400-20260929.json'
def canonical_bytes(x):return (json.dumps(x,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def load_rows():
 raw=source.OUTPUT.read_bytes()
 if hashlib.sha256(raw).hexdigest()!=SOURCE_SHA or raw!=source.canonical_bytes(source.build_reports()[1]):raise ValueError('400 source raw/canonical differs')
 rows=json.loads(raw)['results']
 if len(rows)!=4:raise ValueError('400 route count')
 return rows
def audit_route(row):
 path=row['path_id'];state=row['final_continuation_state'];game=state['game_state'];ctx=state['response_context']
 if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or start.opening._stop_state_sha256(game)!=row['final_game_state_sha256']:raise ValueError('400 source hashes')
 base={'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256']}
 if path=='probe-01-a-first':
  projected=copy.deepcopy(row);projected['path_id']='probe-02-a-first';proof=normals.audit_route(projected)
  if proof['candidate_ids']!=['candidate-place_world-B-020#1','candidate-place_world-B-022#1','pass'] or not all(proof['completeness_checks'].values()):raise ValueError('400 normal inventory')
  return {**base,**{k:proof[k] for k in ('next_opportunity','candidate_ids','candidate_set_complete','legal_candidate_details','completeness_checks','board_exclusions')}}
 if path=='probe-01-b-first':return {**base,**eggs.audit_egg(row)}
 if path in ('probe-02-a-first','probe-02-b-first'):
  if (ctx['priority_actor'],ctx['turn_player'],ctx['chain_status'],ctx['consecutive_passes'])!=('A','B','empty',1) or state['activation_zone'] or state['pending_triggers']:raise ValueError('400 response boundary')
  if path=='probe-02-b-first' and (game['phase'],ctx['window_kind'])!=('post_placement_response','after_normal_action'):raise ValueError('400 placement boundary')
  if path=='probe-02-a-first' and (game['phase'],ctx['window_kind'])!=('response_window','turn_start'):raise ValueError('400 start boundary')
  # Reuse the turn-start inventory projection only for timing-free quick cards;
  # the actual response window and hashes remain untouched for the transition.
  projected=copy.deepcopy(row);projected['path_id']='probe-01-a-first'
  if path=='probe-02-b-first':
   projected['final_continuation_state']['game_state']['phase']='response_window'
   projected['final_continuation_state']['response_context'].update(phase='response_window',window_kind='turn_start')
  proof=source.audit_response(projected)
  if proof['candidate_ids']!=['response-pass'] or not proof['candidate_set_complete']:raise ValueError('400 response inventory')
  return {**base,**proof,'next_opportunity':game['phase'],'projection_kind':'candidate_inventory_only' if path=='probe-02-b-first' else 'none'}
 raise ValueError('400 route')
def choose_normal(row,proof):
 game=row['final_continuation_state']['game_state'];owner=game['players']['B'];details=proof['legal_candidate_details']
 if [x['action_type'] for x in details]!=['place_world','place_world','pass'] or [x['candidate_id'] for x in details]!=proof['candidate_ids']:raise ValueError('400 normal details')
 common={'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,'certain_growth_difference':0,'consumed_card_count':0,'value_comparison_to':{}}
 passed={**common,'candidate_id':'pass','payment_time':0,'time_after_certain_resolution':owner['time'],'card_copy_id':''};comparisons=[]
 for action in details[:-1]:
  cost,ref=deepsea.cost_and_effect(row,action) if action['card_id']=='W-deepsea' else paid.cost_and_effect(row,action)
  score={**common,'candidate_id':action['candidate_id'],'payment_time':cost,'time_after_certain_resolution':owner['time']-cost,'card_copy_id':game['cards'][action['source_instance_id']]['card_copy_id']}
  result=priority.compare_candidates(passed,score)
  if result['winner']!='left' or result['decided_at']!='time_after_certain_resolution':raise ValueError('400 107/114 comparison')
  comparisons.append({'candidate_id':action['candidate_id'],'source_reference':ref,'score':score,'comparison':result})
 return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'candidate_ids':proof['candidate_ids'],'selected_candidate':'pass','resolution_mode':'priority_unique','pass_score':passed,'paid_comparisons':comparisons,'source_contracts':[107,114]}
def run_route(row,proof):
 path=row['path_id']
 if path=='probe-01-a-first':return normal_replay.run_route(row,choose_normal(row,proof),proof)
 if path=='probe-01-b-first':return egg_replay.run_route(row)
 return response_pass.run_route(row,proof)
def validate(row,result):
 seq=row['last_valid_event_seq'];g=row['final_game_state_sha256'];c=row['final_continuation_state_sha256']
 if len(result['new_events'])!=1 or len(result['new_snapshots'])!=1:raise ValueError('400 event count')
 for event,shot in zip(result['new_events'],result['new_snapshots']):
  if event['seq']!=seq+1 or shot['event_seq']!=event['seq'] or event['game_state_before_sha256']!=g or event['continuation_state_before_sha256']!=c or event['game_state_after_sha256']!=shot['game_state_sha256'] or event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or start.opening._stop_state_sha256(shot['game_state'])!=shot['game_state_sha256'] or start.canonical_sha256(shot['continuation_state'])!=shot['continuation_state_sha256']:raise ValueError('400 event/snapshot/hash chain')
  seq=event['seq'];g=shot['game_state_sha256'];c=shot['continuation_state_sha256']
 if (seq,g,c)!=(result['last_valid_event_seq'],result['final_game_state_sha256'],result['final_continuation_state_sha256']):raise ValueError('400 final hash')
def build_reports():
 rows=load_rows();proofs=[audit_route(row) for row in rows];results=[run_route(row,proof) for row,proof in zip(rows,proofs)]
 for row,result in zip(rows,results):validate(row,result)
 return ({'schema':'naotocchi.card_game.proxy_new_seed_mixed_audit_400.v1','source_raw_sha256':SOURCE_SHA,'planned':4,'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':proofs},{'schema':'naotocchi.card_game.proxy_new_seed_mixed_replay_400.v1','source_raw_sha256':SOURCE_SHA,'planned':4,'completed':0,'new_decisions':4,'new_events':4,'new_snapshots':4,'independent_balance_sample_count':0,'results':results})
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();a,r=build_reports()
 for path,value in ((AUDIT,a),(OUTPUT,r)):
  raw=canonical_bytes(value)
  if args.check:
   if path.read_bytes()!=raw:raise SystemExit('400 canonical mismatch '+str(path))
  else:path.write_bytes(raw)
 print('400: four routes audited/replayed')
if __name__=='__main__':main()
