#!/usr/bin/env python3
"""Replay a seeded start ability and three unique response passes."""
import argparse,copy,hashlib,json,sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_audit_389 as audit
import proxy_new_seed_mixed_replay_388 as states
import proxy_new_seed_mixed_replay_302 as board_activation
import proxy_new_seed_mixed_replay_290 as end_pass
import proxy_new_seed_mixed_replay_379 as ordinary_pass
import proxy_new_seed_start_choice_188 as board_choice
import proxy_response_window_seeded_restart as response
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1];OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-389-20260929.json'
STATE_SHA='3c3d5c70ff1b38c740a6278866e15f7d2fd8ec6b2bc0eec2fa53160901018974'
AUDIT_SHA='3bf47665c9d69d34ed2284eaef3f76266616cc964221e43a275bfe5d1d32e18c';SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_389.v1'
def canonical_bytes(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def load_sources():
 a,s=audit.OUTPUT.read_bytes(),states.OUTPUT.read_bytes()
 if hashlib.sha256(a).hexdigest()!=AUDIT_SHA or hashlib.sha256(s).hexdigest()!=STATE_SHA or a!=audit.canonical_bytes(audit.build_report()) or s!=states.canonical_bytes(states.build_report()):raise ValueError('389 protected sources differ')
 rows,proofs=json.loads(s)['results'],json.loads(a)['results']
 if len(rows)!=len(proofs)!=4 or any(audit.audit_route(r)!=p for r,p in zip(rows,proofs)):raise ValueError('389 audited inventory differs')
 return rows,proofs
def choose_board(row,proof):
 if proof['candidate_ids']!=['response-activate-ability-A-015#1','response-pass'] or len(proof['board_candidate_details'])!=1:raise ValueError('389 board candidate set differs')
 state=copy.deepcopy(row['final_continuation_state']);state.update(source_event_seq=row['last_valid_event_seq'],last_event_seq=row['last_valid_event_seq'],source_game_state_sha256=row['final_game_state_sha256'],continuation_state_sha256=row['final_continuation_state_sha256'])
 if start._hash(state)!=row['final_continuation_state_sha256']:raise ValueError('389 board prehash differs')
 adapted=copy.deepcopy(proof);adapted['hand_conditional_exclusions']=proof['hand_exclusions'];adapted['hand_candidate_ids']=['response-pass']
 opportunity=board_choice.opportunity(state,adapted);order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
 decision=response.resolve_response_choice({'order_id':order,'actor_turn_index':state['game_state']['round'],'round':state['game_state']['round']},opportunity)
 if decision['selected_candidate']!='response-activate-ability-A-015#1' or decision['resolution_mode']!='response_seeded_fallback' or decision['legal_candidate_ids']!=proof['candidate_ids']:raise ValueError('389 seeded choice differs')
 return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'candidate_ids':proof['candidate_ids'],'selected_candidate':decision['selected_candidate'],'resolution_mode':'response_seeded_fallback','comparison':decision}
def run_route(row,proof):
 path=row['path_id']
 if path=='probe-01-a-first':return board_activation.run_route(row,choose_board(row,proof),proof)
 if proof['candidate_ids']!=['response-pass'] or not proof['candidate_set_complete']:raise ValueError('389 unique response differs')
 if path=='probe-01-b-first':
  selected={'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'candidate_ids':proof['candidate_ids'],'selected_candidate':'response-pass','resolution_mode':'response_unique'}
  return end_pass.run_route(row,selected,proof)
 if path in ('probe-02-a-first','probe-02-b-first'):return ordinary_pass.run_route(row,proof)
 raise ValueError('389 path differs')
def validate(row,result):
 if len(result['new_events'])!=len(result['new_snapshots'])!=1:raise ValueError('389 event count differs')
 e,s=result['new_events'][0],result['new_snapshots'][0]
 if e['seq']!=row['last_valid_event_seq']+1 or s['event_seq']!=e['seq'] or e['game_state_before_sha256']!=row['final_game_state_sha256'] or e['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or e['game_state_after_sha256']!=s['game_state_sha256'] or e['continuation_state_after_sha256']!=s['continuation_state_sha256'] or start.opening._stop_state_sha256(s['game_state'])!=result['final_game_state_sha256'] or start.canonical_sha256(s['continuation_state'])!=result['final_continuation_state_sha256']:raise ValueError('389 event/snapshot/hash differs')
def build_report():
 rows,proofs=load_sources();results=[run_route(r,p) for r,p in zip(rows,proofs)]
 for r,v in zip(rows,results):validate(r,v)
 return {'schema':SCHEMA,'source_raw_sha256':STATE_SHA,'audit_raw_sha256':AUDIT_SHA,'planned':4,'completed':0,'new_decisions':3,'new_events':4,'new_snapshots':4,'independent_balance_sample_count':0,'results':results}
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();raw=canonical_bytes(build_report())
 if args.check:
  if OUTPUT.read_bytes()!=raw:raise SystemExit('389 canonical bytes differ')
 else:OUTPUT.write_bytes(raw)
 print('389: seeded board activation and three passes replayed')
if __name__=='__main__':main()
