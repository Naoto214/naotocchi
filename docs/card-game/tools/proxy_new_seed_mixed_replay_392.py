#!/usr/bin/env python3
"""Resolve proven start chain and end response, retaining other two states."""
import argparse,copy,hashlib,json,sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_replay_391 as source
import proxy_new_seed_ability_resolution_196 as chicken
import proxy_new_seed_mixed_replay_290 as passes
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE_SHA='af88cefada0cc9af04d06140b99fe3fa3bb042ba7b634315d52d591362b3d906'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-392-20260929.json'
def canonical_bytes(value):return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def load_rows():
 raw=source.OUTPUT.read_bytes()
 if hashlib.sha256(raw).hexdigest()!=SOURCE_SHA or raw!=source.canonical_bytes(source.build_reports()[1]):raise ValueError('392 source differs')
 rows=json.loads(raw)['results']
 if len(rows)!=4:raise ValueError('392 route count')
 return rows
def before(row):
 state=copy.deepcopy(row['final_continuation_state']);state.update(source_event_seq=row['last_valid_event_seq'],last_event_seq=row['last_valid_event_seq'],source_game_state_sha256=row['final_game_state_sha256'],continuation_state_sha256=row['final_continuation_state_sha256'])
 if start._hash(state)!=row['final_continuation_state_sha256']:raise ValueError('392 source state hash')
 return state
def held(row,reason):
 return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'last_valid_event_seq':row['last_valid_event_seq'],'final_game_state_sha256':row['final_game_state_sha256'],'final_continuation_state_sha256':row['final_continuation_state_sha256'],'final_continuation_state':copy.deepcopy(row['final_continuation_state']),'stop_reason_code':reason,'new_decisions':[],'new_events':[],'new_snapshots':[],'completed':False,'balance_sample_count':0}
def audit_end_response(row):
 import proxy_new_seed_start_audit_206 as hand
 import proxy_new_seed_start_audit_166 as conditional
 import proxy_board_trigger_audit_144 as timing
 state=row['final_continuation_state'];game=state['game_state'];ctx=state['response_context'];actor='B';owner=game['players'][actor]
 projected=copy.deepcopy(state);entries=start.load_candidate_rows();removed=[];excluded=[]
 for instance in owner['hand']:
  card_id=game['cards'][instance]['card_id'];entry=entries.get(card_id)
  if entry is None:raise ValueError('391 unregistered hand card')
  reason=hand.extra_hand_exclusion(card_id,entry,game,actor)
  if reason is None and card_id=='E-boss':
   section=hand.source_section('91-event-21-card-text-draft.md',card_id)
   if actor==game['turn_player'] or owner['board']['main'] is not None or 'このターン、自分のメインが勝負に負けていた場合に発動できる' not in section:raise ValueError('391 boss condition')
   reason={'card_id':card_id,'reason_code':'requires_own_main_battle_loss_this_turn','source_reference':'91-event-21-card-text-draft.md#E-boss'}
  if reason is None and card_id=='G-animal-shogi':
   section=hand.source_section('83-play-batch-3-card-text-draft.md',card_id)
   if '自分の捨て札のなかま1枚を対象' not in section or any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard']):raise ValueError('391 shogi target')
   reason={'card_id':card_id,'reason_code':'requires_own_discarded_companion'}
  action=next((x for x in entry['actions'] if x['action_type'] in ('use_play','use_item','use_event')),None)
  if reason is None and action is not None and owner['time']>=action['base_time_cost']:reason=conditional.conditional_exclusion(card_id,game,actor)
  if reason is None and action is not None and action['target_rule']=='one own main':
   filename,section_id=action['source_text_reference'].split('#',1)
   if section_id!=card_id or '自分のメイン1枚を対象' not in hand.source_section(filename,section_id):raise ValueError('391 main target')
   reason={'card_id':card_id,'reason_code':'requires_own_main_target'}
  if reason:
   projected['game_state']['players'][actor]['hand'].remove(instance);removed.append({'source_instance_id':instance,**reason})
 for instance in owner['board']['companions']:
  card_id=game['cards'][instance]['card_id'];section=hand.source_section('72-companion-26-card-text-draft.md',card_id)
  if card_id=='C-cat_friend':
   if '自分の捨て札の「きまぐれなねこ」以外のなかまカード1枚を対象' not in section or any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard']):raise ValueError('391 cat target')
   reason='requires_other_discarded_companion'
  elif card_id=='C-box':
   if '能力なし。' not in section:raise ValueError('392 box text')
   reason='no_ability'
  elif card_id in ('C-bat','C-chicken'):
   trigger=timing.TRIGGERS.get(card_id)
   if trigger is None or any(fragment not in section for fragment in trigger[1:]) or timing.matches(card_id,ctx['window_kind'],actor,ctx['turn_player'],row['new_events'][0]['action_type'],row['new_events'][0]['actor']):raise ValueError('391 companion timing')
   reason='trigger_condition_not_met'
  else:raise ValueError('391 unclassified companion '+card_id)
  projected['game_state']['players'][actor]['board']['companions'].remove(instance);excluded.append({'source_instance_id':instance,'card_id':card_id,'reason_code':reason})
 partner_instance=owner['board']['partner']
 if partner_instance:
  card_id=game['cards'][partner_instance]['card_id'];section=hand.source_section('74-partner-18-card-text-draft.md',card_id)
  if card_id!='P-cliff_goat' or '初配置・同名上書き' not in section or owner['board']['world'] is not None:raise ValueError('392 partner timing')
  projected['game_state']['players'][actor]['board']['partner']=None;projected['game_state']['players'][actor]['board']['partner_stage']=None
  excluded.append({'source_instance_id':partner_instance,'card_id':card_id,'reason_code':'different_world_replacement_not_met'})
 projected['game_state']['phase']='response_window'
 projected['response_context']['phase']='response_window'
 projected['response_context']['window_kind']='turn_start'
 chance=start.enumerate_opportunity(projected,actor,entries)
 if chance['legal_candidate_ids']!=['response-pass'] or not chance['candidate_set_complete']:raise ValueError('391 response inventory '+repr(chance['legal_candidate_ids']))
 return {'next_opportunity':'response_window','candidate_ids':['response-pass'],'candidate_set_complete':True,'hand_exclusions':removed,'hand_other_exclusions':chance['excluded_candidates'],'board_exclusions':excluded}

def replay(row):
 path=row['path_id'];state=before(row)
 if path=='probe-01-a-first':
  if state['response_context']['window_kind']!='turn_start' or state['response_context']['chain_status']!='resolving' or state['response_context']['consecutive_passes']!=2:raise ValueError('392 chain boundary')
  after,event=chicken.resolve_board_ability(state)
  if event['source_instance_id']!='A-015#1' or after['game_state']['phase']!='normal_action':raise ValueError('392 chicken result')
  reason='unproved_current_normal_action_candidates';decisions=[]
 elif path=='probe-02-b-first':
  if state['game_state']['phase']!='turn_end_response' or state['response_context']['window_kind']!='after_normal_action' or state['response_context']['priority_actor']!='B' or state['response_context']['consecutive_passes']!=1 or state['activation_zone'] or state['pending_triggers']:raise ValueError('392 end response boundary')
  current=audit_end_response(row)
  if current['candidate_ids']!=['response-pass'] or not current['candidate_set_complete']:raise ValueError('392 response inventory')
  proof={'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],**current,'next_opportunity':'turn_end_response'}
  selected={**proof,'selected_candidate':'response-pass','resolution_mode':'response_unique'}
  result=passes.run_route(row,selected,proof)
  if result['final_continuation_state']['game_state']['phase']!='turn_end':raise ValueError('392 end response result')
  result['response_audit']=current
  return result
 else:return held(row,'pending_current_response_candidate_audit')
 return {'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'last_valid_event_seq':after['last_event_seq'],'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),'final_continuation_state_sha256':after['continuation_state_sha256'],'final_continuation_state':start._payload(after),'stop_reason_code':reason,'new_decisions':decisions,'new_events':[event],'new_snapshots':[snapshots.snapshot(after)],'completed':False,'balance_sample_count':0}
def validate(row,result):
 events=result['new_events'];shots=result['new_snapshots'];seq=row['last_valid_event_seq'];g=row['final_game_state_sha256'];c=row['final_continuation_state_sha256']
 if len(events)!=len(shots):raise ValueError('392 event/snapshot count')
 for e,s in zip(events,shots):
  if e['seq']!=seq+1 or s['event_seq']!=e['seq'] or e['game_state_before_sha256']!=g or e['continuation_state_before_sha256']!=c or e['game_state_after_sha256']!=s['game_state_sha256'] or e['continuation_state_after_sha256']!=s['continuation_state_sha256'] or start.opening._stop_state_sha256(s['game_state'])!=s['game_state_sha256'] or start.canonical_sha256(s['continuation_state'])!=s['continuation_state_sha256']:raise ValueError('392 hash chain')
  seq=e['seq'];g=s['game_state_sha256'];c=s['continuation_state_sha256']
 if (seq,g,c)!=(result['last_valid_event_seq'],result['final_game_state_sha256'],result['final_continuation_state_sha256']):raise ValueError('392 final hash')
def build_report():
 rows=load_rows();results=[replay(r) for r in rows]
 for r,v in zip(rows,results):validate(r,v)
 if sum(len(r['new_events']) for r in results)!=2:raise ValueError('392 event inventory')
 return {'schema':'naotocchi.card_game.proxy_new_seed_mixed_replay_392.v1','source_raw_sha256':SOURCE_SHA,'planned':4,'completed':0,'new_decisions':1,'new_events':2,'new_snapshots':2,'independent_balance_sample_count':0,'results':results}
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();raw=canonical_bytes(build_report())
 if args.check:
  if OUTPUT.read_bytes()!=raw:raise SystemExit('392 canonical mismatch')
 else:OUTPUT.write_bytes(raw)
 print('392: chain resolution and end response replayed')
if __name__=='__main__':main()
