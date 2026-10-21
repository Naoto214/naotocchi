#!/usr/bin/env python3
"""Replay three unique responses and one seeded board response pass."""
import argparse,copy,hashlib,json,sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_audit_386 as audit
import proxy_new_seed_mixed_replay_385 as states
import proxy_new_seed_mixed_replay_290 as end_pass
import proxy_new_seed_mixed_replay_379 as ordinary_pass
import proxy_new_seed_start_choice_188 as board_choice
import proxy_response_window_seeded_restart as response
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_normal_action_seeded_restart as normal
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1];OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-386-20260929.json'
AUDIT_SHA='b2e00651ae5296b37ce17a13c49db84e92bba4913f87a620e1d78f8e581f728a'
STATE_SHA='ebc7c71eda0ee278672d830e17f9cef51e6151885a596776345ffb2c4b92171a'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_386.v1'
def canonical_bytes(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def load_sources():
 a,s=audit.OUTPUT.read_bytes(),states.OUTPUT.read_bytes()
 if hashlib.sha256(a).hexdigest()!=AUDIT_SHA or hashlib.sha256(s).hexdigest()!=STATE_SHA or a!=audit.canonical_bytes(audit.build_report()) or s!=states.canonical_bytes(states.build_report()):raise ValueError('386 source bytes differ')
 rows,proofs=json.loads(s)['results'],json.loads(a)['results']
 if len(rows)!=len(proofs)!=4 or any(audit.audit_route(r)!=p for r,p in zip(rows,proofs)):raise ValueError('386 audited inventory differs')
 return rows,proofs
def seeded_pass(row,proof):
 if row['path_id']!='probe-01-b-first' or proof['candidate_ids']!=['response-activate-ability-B-015#1','response-pass'] or len(proof['board_candidate_details'])!=1:raise ValueError('386 board candidate set differs')
 before=copy.deepcopy(row['final_continuation_state']);before.update(source_event_seq=row['last_valid_event_seq'],last_event_seq=row['last_valid_event_seq'],source_game_state_sha256=row['final_game_state_sha256'],continuation_state_sha256=row['final_continuation_state_sha256'])
 if start._hash(before)!=row['final_continuation_state_sha256']:raise ValueError('386 board prehash differs')
 adapted=copy.deepcopy(proof);adapted['hand_conditional_exclusions']=proof['hand_exclusions'];adapted['hand_candidate_ids']=['response-pass']
 opportunity=board_choice.opportunity(before,adapted)
 order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
 decision=response.resolve_response_choice({'order_id':order,'actor_turn_index':before['game_state']['round'],'round':before['game_state']['round']},opportunity)
 if decision['selected_candidate']!='response-pass' or decision['resolution_mode']!='response_seeded_fallback' or decision['legal_candidate_ids']!=proof['candidate_ids']:raise ValueError('386 seeded board choice differs')
 actor=before['response_context']['priority_actor'];after,event,_=start._pass(before,actor);normal._verify_step(before,after,[event])
 if after['response_context']['consecutive_passes']!=1 or after['response_context']['priority_actor']==actor or after['game_state']['phase']!='response_window':raise ValueError('386 seeded pass next priority differs')
 return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'last_valid_event_seq':after['last_event_seq'],'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),'final_continuation_state_sha256':after['continuation_state_sha256'],'final_continuation_state':start._payload(after),'stop_reason_code':'unproved_next_priority_response_candidates','new_decisions':[decision],'new_events':[event],'new_snapshots':[snapshots.snapshot(after)],'completed':False,'balance_sample_count':0}
def run_route(row,proof):
 path=row['path_id']
 if path=='probe-01-b-first':return seeded_pass(row,proof)
 if proof['candidate_ids']!=['response-pass'] or not proof['candidate_set_complete']:raise ValueError('386 unique response differs')
 if path in ('probe-01-a-first','probe-02-a-first'):
  if proof['next_opportunity']!='turn_end_response':raise ValueError('386 end response differs')
  selected={'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'candidate_ids':proof['candidate_ids'],'selected_candidate':'response-pass','resolution_mode':'response_unique'}
  return end_pass.run_route(row,selected,proof)
 if path=='probe-02-b-first' and proof['next_opportunity']=='response_window':return ordinary_pass.run_route(row,proof)
 raise ValueError('386 path differs')
def validate(row,result):
 if len(result['new_events'])!=len(result['new_snapshots'])!=1:raise ValueError('386 event count differs')
 e,s=result['new_events'][0],result['new_snapshots'][0]
 if (e['seq']!=row['last_valid_event_seq']+1 or e['seq']!=s['event_seq'] or e['game_state_before_sha256']!=row['final_game_state_sha256'] or e['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or e['game_state_after_sha256']!=s['game_state_sha256'] or e['continuation_state_after_sha256']!=s['continuation_state_sha256'] or start.opening._stop_state_sha256(s['game_state'])!=result['final_game_state_sha256'] or start.canonical_sha256(s['continuation_state'])!=result['final_continuation_state_sha256']):raise ValueError('386 event/snapshot/hash differs')
def build_report():
 rows,proofs=load_sources();results=[run_route(r,p) for r,p in zip(rows,proofs)]
 for r,v in zip(rows,results):validate(r,v)
 return {'schema':SCHEMA,'source_raw_sha256':STATE_SHA,'audit_raw_sha256':AUDIT_SHA,'planned':4,'completed':0,'new_decisions':4,'new_events':4,'new_snapshots':4,'independent_balance_sample_count':0,'results':results}
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();raw=canonical_bytes(build_report())
 if args.check:
  if OUTPUT.read_bytes()!=raw:raise SystemExit('386 canonical bytes differ')
 else:OUTPUT.write_bytes(raw)
 print('386: three unique and one seeded response passes replayed')
if __name__=='__main__':main()
