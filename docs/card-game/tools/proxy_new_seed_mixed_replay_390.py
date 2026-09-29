#!/usr/bin/env python3
"""Replay active-chain and response passes plus one proven end/draw."""
import argparse,hashlib,json,sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_audit_390 as audit
import proxy_new_seed_mixed_replay_389 as states
import proxy_new_seed_mixed_replay_379 as response
import proxy_new_seed_mixed_replay_305 as chain_pass
import proxy_new_seed_turn_end_replay_204 as end
import proxy_new_seed_mixed_replay_387 as board
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1];OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-390-20260929.json'
STATE_SHA='79d87fc508c036d2488f79e4c59ff9facb1e236d851536f4ef19cb69871efdc2';AUDIT_SHA='a84b7fe06ca7be4baf1b17b3e63f913f44edf6c5a158f8957f2255632e7a58b2'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_390.v1'
def canonical_bytes(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def load_sources():
 a,s=audit.OUTPUT.read_bytes(),states.OUTPUT.read_bytes()
 if hashlib.sha256(a).hexdigest()!=AUDIT_SHA or hashlib.sha256(s).hexdigest()!=STATE_SHA or a!=audit.canonical_bytes(audit.build_report()) or s!=states.canonical_bytes(states.build_report()):raise ValueError('390 protected sources differ')
 rows,proofs=json.loads(s)['results'],json.loads(a)['results']
 if len(rows)!=len(proofs)!=4 or any(audit.audit_route(r)!=p for r,p in zip(rows,proofs)):raise ValueError('390 audited inventory differs')
 return rows,proofs
def run_route(row,proof):
 if row['path_id']=='probe-01-b-first':
  if not proof['turn_end_set_complete'] or proof['contract_stop_codes']:raise ValueError('390 end proof differs')
  old=end.classify_next_board
  try:end.classify_next_board=board.classify_next_board;result=end.run_route(row,proof)
  finally:end.classify_next_board=old
  if [x['action_type'] for x in result['new_events']]!=['turn_end_completed','turn_start_and_egg_draw']:raise ValueError('390 end/draw differs')
  return result
 if proof['candidate_ids']!=['response-pass'] or not proof['candidate_set_complete']:raise ValueError('390 unique pass differs')
 if row['path_id']=='probe-01-a-first':
  selected={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'candidate_ids':proof['candidate_ids'],'selected_candidate':'response-pass','resolution_mode':'response_unique'}
  result=chain_pass.run_route(row,selected,proof)
 else:result=response.run_route(row,proof)
 if row['path_id']=='probe-01-a-first':
  state=result['final_continuation_state']
  if state['response_context']['window_kind']!='turn_start' or state['response_context']['chain_status']!='building' or len(state['activation_zone'])!=1:raise ValueError('390 start chain changed')
 return result
def validate(row,result):
 e,s=result['new_events'],result['new_snapshots'];g=row['final_game_state_sha256'];c=row['final_continuation_state_sha256'];seq=row['last_valid_event_seq']
 if len(e)!=len(s):raise ValueError('390 event/snapshot count differs')
 for event,shot in zip(e,s):
  if event['seq']!=seq+1 or shot['event_seq']!=event['seq'] or event['game_state_before_sha256']!=g or event['continuation_state_before_sha256']!=c or event['game_state_after_sha256']!=shot['game_state_sha256'] or event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or start.opening._stop_state_sha256(shot['game_state'])!=shot['game_state_sha256'] or start.canonical_sha256(shot['continuation_state'])!=shot['continuation_state_sha256']:raise ValueError('390 hash chain differs')
  seq=event['seq'];g=shot['game_state_sha256'];c=shot['continuation_state_sha256']
 if (seq,g,c)!=(result['last_valid_event_seq'],result['final_game_state_sha256'],result['final_continuation_state_sha256']):raise ValueError('390 final boundary differs')
def build_report():
 rows,proofs=load_sources();results=[run_route(r,p) for r,p in zip(rows,proofs)]
 for r,v in zip(rows,results):validate(r,v)
 return {'schema':SCHEMA,'source_raw_sha256':STATE_SHA,'audit_raw_sha256':AUDIT_SHA,'planned':4,'completed':0,'new_decisions':3,'new_events':5,'new_snapshots':5,'independent_balance_sample_count':0,'results':results}
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();raw=canonical_bytes(build_report())
 if args.check:
  if OUTPUT.read_bytes()!=raw:raise SystemExit('390 canonical bytes differ')
 else:OUTPUT.write_bytes(raw)
 print('390: three responses and one end/draw replayed')
if __name__=='__main__':main()
