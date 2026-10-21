#!/usr/bin/env python3
"""Replay proven ends and unique response while preserving an unresolved normal choice."""
import argparse
import copy
import hashlib
import json
import sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_audit_383 as audit
import proxy_new_seed_mixed_replay_382 as source
import proxy_new_seed_turn_end_replay_204 as end
import proxy_new_seed_turn_end_replay_185 as original_board
import proxy_new_seed_mixed_replay_379 as response
import proxy_new_seed_start_audit_206 as hand
import proxy_board_trigger_audit_144 as timing
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-384-20260929.json'
AUDIT_SHA='a77496019987b62cc716170a01e912189379712babe1ae8b70db33bffad5f124'
STATE_SHA='deebc73285e12d16829060c7f76457a171df10b9b3c28af51df18482817c8faa'
SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_384.v1'
def canonical_bytes(value):return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def classify_board(game,actor):
 board=game['players'][actor]['board'];companions=[(i,game['cards'][i]['card_id']) for i in board['companions']]
 partner=board['partner'];partner_card=game['cards'][partner]['card_id'] if partner else None
 expected={('B',('C-bat','C-cat_friend','C-chicken'),'P-cat_ceo'),('A',('C-box',),'P-cliff_goat')}
 if (actor,tuple(card for _,card in companions),partner_card) not in expected or board['main'] or board['world'] or board['prepared'] or board['partner_stage'] is None:
  raise ValueError('384 next board boundary differs')
 projected=copy.deepcopy(game);b=projected['players'][actor]['board'];b['companions']=[];b['partner']=None;b['partner_stage']=None
 classified=original_board.classify_next_board(projected,actor)
 for instance,card in companions:
  section=hand.source_section('72-companion-26-card-text-draft.md',card)
  if card in ('C-bat','C-chicken') and all(x in section for x in timing.TRIGGERS[card][1:]):kind='event_trigger_not_turn_start' if card=='C-bat' else 'turn_start_trigger'
  elif card=='C-cat_friend' and '自分のターンに、このカードをなかま枠から山札の一番下に置き' in section:kind='activated_ability_not_turn_start'
  elif card=='C-box' and '能力なし。' in section:kind='none'
  else:raise ValueError('384 companion timing differs')
  classified.append({'source_instance_id':instance,'card_id':card,'trigger_kind':kind,'source_reference':'72-companion-26-card-text-draft.md#'+card})
 section=hand.source_section('74-partner-18-card-text-draft.md',partner_card)
 if partner_card=='P-cat_ceo' and '交際を始めた時、発動する' in section:kind='event_trigger_not_turn_start'
 elif partner_card=='P-cliff_goat' and '名前の異なるセカイへ変更した時' in section:kind='event_trigger_not_turn_start'
 else:raise ValueError('384 partner timing differs')
 classified.append({'source_instance_id':partner,'card_id':partner_card,'trigger_kind':kind,'source_reference':'74-partner-18-card-text-draft.md#'+partner_card})
 return classified
def load_sources():
 a,s=audit.OUTPUT.read_bytes(),source.OUTPUT.read_bytes()
 if hashlib.sha256(a).hexdigest()!=AUDIT_SHA or hashlib.sha256(s).hexdigest()!=STATE_SHA or a!=audit.canonical_bytes(audit.build_report()):raise ValueError('384 source bytes differ')
 rows,proofs=json.loads(s)['results'],json.loads(a)['results']
 if len(rows)!=4 or len(proofs)!=4 or any(audit.audit_route(r)!=p for r,p in zip(rows,proofs)):raise ValueError('384 source proof differs')
 return rows,proofs
def run_route(row,proof):
 path=row['path_id']
 if path=='probe-01-a-first':
  if proof['next_opportunity']!='normal_action' or len(proof['candidate_ids'])!=4:raise ValueError('384 preserved choice differs')
  return {**copy.deepcopy(row),'new_decisions':[],'new_events':[],'new_snapshots':[],'preserved_candidate_ids':proof['candidate_ids']}
 if path=='probe-02-a-first':
  if proof['candidate_ids']!=['response-pass']:raise ValueError('384 unique response differs')
  return response.run_route(row,proof)
 if path not in ('probe-01-b-first','probe-02-b-first') or not proof['turn_end_set_complete']:raise ValueError('384 end choice differs')
 old=end.classify_next_board
 try:
  end.classify_next_board=classify_board
  result=end.run_route(row,proof)
 finally:end.classify_next_board=old
 return result
def validate(row,result):
 events,shots=result['new_events'],result['new_snapshots'];g=row['final_game_state_sha256'];c=row['final_continuation_state_sha256'];seq=row['last_valid_event_seq']
 if len(events)!=len(shots):raise ValueError('384 event/snapshot count differs')
 for e,s in zip(events,shots):
  if e['seq']!=seq+1 or s['event_seq']!=e['seq'] or e['game_state_before_sha256']!=g or e['continuation_state_before_sha256']!=c or e['game_state_after_sha256']!=s['game_state_sha256'] or e['continuation_state_after_sha256']!=s['continuation_state_sha256'] or start.opening._stop_state_sha256(s['game_state'])!=s['game_state_sha256'] or start.canonical_sha256(s['continuation_state'])!=s['continuation_state_sha256']:raise ValueError('384 event/hash chain differs')
  seq=e['seq'];g=s['game_state_sha256'];c=s['continuation_state_sha256']
 if (seq,g,c)!=(result['last_valid_event_seq'],result['final_game_state_sha256'],result['final_continuation_state_sha256']):raise ValueError('384 final boundary differs')
def build_report():
 rows,proofs=load_sources();results=[run_route(r,p) for r,p in zip(rows,proofs)]
 for row,result in zip(rows,results):validate(row,result)
 return {'schema':SCHEMA,'source_raw_sha256':AUDIT_SHA,'state_raw_sha256':STATE_SHA,'planned':4,'completed':0,'new_decisions':1,'new_events':5,'new_snapshots':5,'independent_balance_sample_count':0,'results':results}
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();raw=canonical_bytes(build_report())
 if args.check:
  if OUTPUT.read_bytes()!=raw:raise SystemExit('384 canonical bytes differ')
 else:OUTPUT.write_bytes(raw)
 print('384: two ends/draws and one response pass replayed')
if __name__=='__main__':main()
