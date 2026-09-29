#!/usr/bin/env python3
"""Complete two proven turns/draws and two unique next-priority responses."""
import argparse,copy,hashlib,json,sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_audit_387 as audit
import proxy_new_seed_mixed_replay_386 as states
import proxy_new_seed_turn_end_replay_204 as end
import proxy_new_seed_mixed_replay_379 as response
import proxy_new_seed_start_audit_206 as hand
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1];OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-387-20260929.json'
AUDIT_SHA='aca39f48302087bc427ca6914949e65aaa83b32d113e48f170e7e7ef1f8cc037'
STATE_SHA='5399e8ab9d9ec16eb750609212d30102a6258cbff6679b6899301b355861c6a9'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_387.v1'
def canonical_bytes(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def load_sources():
 a,s=audit.OUTPUT.read_bytes(),states.OUTPUT.read_bytes()
 if hashlib.sha256(a).hexdigest()!=AUDIT_SHA or hashlib.sha256(s).hexdigest()!=STATE_SHA or a!=audit.canonical_bytes(audit.build_report()) or s!=states.canonical_bytes(states.build_report()):raise ValueError('387 protected sources differ')
 rows,proofs=json.loads(s)['results'],json.loads(a)['results']
 if len(rows)!=len(proofs)!=4 or any(audit.audit_route(r)!=p for r,p in zip(rows,proofs)):raise ValueError('387 audited inventory differs')
 return rows,proofs
ORIGINAL_CLASSIFY=end.classify_next_board
def classify_next_board(game,actor):
 board=game['players'][actor]['board'];ids=[game['cards'][x]['card_id'] for x in board['companions']]
 if actor!='A' or ids!=['C-chicken','C-box'] or board['main'] or board['world'] or board['prepared'] or game['cards'][board['partner']]['card_id']!='P-cat_ceo':raise ValueError('387 box next-board boundary differs')
 section=hand.source_section('72-companion-26-card-text-draft.md','C-box')
 if '能力なし。' not in section:raise ValueError('387 box source differs')
 projected=copy.deepcopy(game);instance=board['companions'][1];projected['players'][actor]['board']['companions'].remove(instance)
 classified=ORIGINAL_CLASSIFY(projected,actor)
 classified.append({'source_instance_id':instance,'card_id':'C-box','trigger_kind':'none','source_reference':'72-companion-26-card-text-draft.md#C-box'})
 return classified
def run_route(row,proof):
 path=row['path_id']
 if path in ('probe-01-a-first','probe-02-a-first'):
  if not proof['turn_end_set_complete'] or proof['contract_stop_codes']:raise ValueError('387 six-stage proof differs')
  if path=='probe-01-a-first':
   old=end.classify_next_board
   try:end.classify_next_board=classify_next_board;result=end.run_route(row,proof)
   finally:end.classify_next_board=old
  else:result=end.run_route(row,proof)
  if [e['action_type'] for e in result['new_events']]!=['turn_end_completed','turn_start_and_egg_draw']:raise ValueError('387 mandatory end/draw differs')
  return result
 if path in ('probe-01-b-first','probe-02-b-first') and proof['candidate_ids']==['response-pass']:return response.run_route(row,proof)
 raise ValueError('387 path differs')
def validate(row,result):
 e,s=result['new_events'],result['new_snapshots'];g=row['final_game_state_sha256'];c=row['final_continuation_state_sha256'];seq=row['last_valid_event_seq']
 if len(e)!=len(s):raise ValueError('387 event/snapshot count differs')
 for event,shot in zip(e,s):
  if (event['seq']!=seq+1 or shot['event_seq']!=event['seq'] or event['game_state_before_sha256']!=g or event['continuation_state_before_sha256']!=c or event['game_state_after_sha256']!=shot['game_state_sha256'] or event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or start.opening._stop_state_sha256(shot['game_state'])!=shot['game_state_sha256'] or start.canonical_sha256(shot['continuation_state'])!=shot['continuation_state_sha256']):raise ValueError('387 event/hash chain differs')
  seq=event['seq'];g=shot['game_state_sha256'];c=shot['continuation_state_sha256']
 if (seq,g,c)!=(result['last_valid_event_seq'],result['final_game_state_sha256'],result['final_continuation_state_sha256']):raise ValueError('387 final boundary differs')
def build_report():
 rows,proofs=load_sources();results=[run_route(r,p) for r,p in zip(rows,proofs)]
 for r,v in zip(rows,results):validate(r,v)
 return {'schema':SCHEMA,'source_raw_sha256':STATE_SHA,'audit_raw_sha256':AUDIT_SHA,'planned':4,'completed':0,'new_decisions':2,'new_events':6,'new_snapshots':6,'independent_balance_sample_count':0,'results':results}
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();raw=canonical_bytes(build_report())
 if args.check:
  if OUTPUT.read_bytes()!=raw:raise SystemExit('387 canonical bytes differ')
 else:OUTPUT.write_bytes(raw)
 print('387: two ends/draws and two response passes replayed')
if __name__=='__main__':main()
