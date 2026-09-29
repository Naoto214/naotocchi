#!/usr/bin/env python3
"""Audit and replay four response, egg, and normal opportunities at 394."""
import argparse,copy,hashlib,json,sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_replay_394 as source
import proxy_new_seed_mixed_replay_391 as earlier
import proxy_new_seed_mixed_audit_340 as eggs
import proxy_new_seed_mixed_audit_381 as normals
import proxy_new_seed_normal_audit_156 as partner
import proxy_new_seed_normal_trigger_audit_146 as table_source
import proxy_new_seed_normal_choice_229 as choice_normal
import proxy_new_seed_mixed_replay_290 as normal_replay
import proxy_new_seed_egg_replay_205 as egg_replay
import proxy_hit_blow_response_142 as chain
import proxy_response_window_seeded_restart as response
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_start_response_138 as start
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
  elif card_id in ('C-bat','C-chicken'):
   trigger=timing.TRIGGERS.get(card_id)
   if trigger is None or any(fragment not in section for fragment in trigger[1:]) or timing.matches(card_id,ctx['window_kind'],actor,ctx['turn_player'],row['new_events'][0]['action_type'],row['new_events'][0]['actor']):raise ValueError('391 companion timing')
   reason='trigger_condition_not_met'
  else:raise ValueError('391 unclassified companion '+card_id)
  projected['game_state']['players'][actor]['board']['companions'].remove(instance);excluded.append({'source_instance_id':instance,'card_id':card_id,'reason_code':reason})
 partner_instance=owner['board']['partner']
 if partner_instance:
  card_id=game['cards'][partner_instance]['card_id'];section=hand.source_section('74-partner-18-card-text-draft.md',card_id)
  if card_id!='P-cat_ceo' or '交際を始めた時、発動する' not in section:raise ValueError('391 partner timing')
  projected['game_state']['players'][actor]['board']['partner']=None;projected['game_state']['players'][actor]['board']['partner_stage']=None
  excluded.append({'source_instance_id':partner_instance,'card_id':card_id,'reason_code':'relationship_start_event_not_met'})
 projected['game_state']['phase']='response_window'
 projected['response_context']['phase']='response_window'
 projected['response_context']['window_kind']='turn_start'
 chance=start.enumerate_opportunity(projected,actor,entries)
 if chance['legal_candidate_ids']!=['response-pass'] or not chance['candidate_set_complete']:raise ValueError('391 response inventory '+repr(chance['legal_candidate_ids']))
 return {'next_opportunity':'response_window','candidate_ids':['response-pass'],'candidate_set_complete':True,'hand_exclusions':removed,'hand_other_exclusions':chance['excluded_candidates'],'board_exclusions':excluded}

ROOT=Path(__file__).resolve().parents[1]
SOURCE_SHA='59960ace78b6edb2c3bf5c01d4c2e5c9d5ed0e766fac052066cc54c6d07222aa'
AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-395-20260929.json'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-395-20260929.json'
def canonical_bytes(value):return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def load_rows():
 raw=source.OUTPUT.read_bytes()
 if hashlib.sha256(raw).hexdigest()!=SOURCE_SHA or raw!=source.canonical_bytes(source.build_reports()[1]):raise ValueError('395 source differs')
 rows=json.loads(raw)['results']
 if len(rows)!=4:raise ValueError('395 route count')
 return rows
def audit_route(row):
 path=row['path_id'];state=row['final_continuation_state'];game=state['game_state'];ctx=state['response_context']
 if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or start.opening._stop_state_sha256(game)!=row['final_game_state_sha256']:raise ValueError('395 source hashes')
 base={'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256']}
 if path=='probe-01-a-first':
  if (game['phase'],ctx['window_kind'],ctx['priority_actor'],ctx['consecutive_passes'])!=('turn_end_response','after_normal_action','B',1):raise ValueError('395 end response boundary')
  proof=audit_end_response(row)
  if proof['candidate_ids']!=['response-pass']:raise ValueError('395 end candidates')
  return {**base,**proof,'next_opportunity':'turn_end_response'}
 if path=='probe-01-b-first':
  if (game['phase'],ctx['window_kind'],ctx['priority_actor'],ctx['turn_player'],ctx['chain_status'],ctx['consecutive_passes'],len(state['activation_zone']))!=('response_window','turn_start','B','A','building',1,1):raise ValueError('395 chain boundary')
  proof=earlier.audit_response_current(row)
  if proof['candidate_ids']!=['response-pass']:raise ValueError('395 chain candidates')
  return {**base,**proof}
 if path=='probe-02-b-first':return {**base,**eggs.audit_egg(row)}
 if path=='probe-02-a-first':
  with partner.partner_response_scope(table_source.normal.candidate.load_inputs()['candidate_table']):proof=normals.audit_route(row)
  return {**base,**proof}
 raise ValueError('395 route')
def close_chain(row,proof):
 if proof['candidate_ids']!=['response-pass'] or not proof['candidate_set_complete']:raise ValueError('395 chain unique')
 before=copy.deepcopy(row['final_continuation_state']);before.update(source_event_seq=row['last_valid_event_seq'],last_event_seq=row['last_valid_event_seq'],source_game_state_sha256=row['final_game_state_sha256'],continuation_state_sha256=row['final_continuation_state_sha256'])
 if start._hash(before)!=row['final_continuation_state_sha256']:raise ValueError('395 chain prehash')
 actor=before['response_context']['priority_actor'];transitioned=chain._turn_start_transition(before,{'kind':'response_pass','actor':actor})
 if transitioned['chain_status']!='resolving' or transitioned['resolution_order']!=before['response_context']['chain_links'][::-1]:raise ValueError('395 chain closure')
 after=copy.deepcopy(before);response._apply_transition_result(after,transitioned);after['last_event_seq']=before['last_event_seq']+1;after['continuation_state_sha256']=start._hash(after)
 if after['response_context']['window_kind']!='turn_start' or len(after['activation_zone'])!=1:raise ValueError('395 activation zone')
 event={'seq':after['last_event_seq'],'action_type':'response_pass','actor':actor,'selected_candidate':'response-pass','game_state_before_sha256':row['final_game_state_sha256'],'game_state_after_sha256':start.opening._stop_state_sha256(after['game_state']),'continuation_state_before_sha256':row['final_continuation_state_sha256'],'continuation_state_after_sha256':after['continuation_state_sha256']}
 decision={'decision_kind':'response','selected_candidate':'response-pass','resolution_mode':'response_unique','actor':actor,'pre_game_state_sha256':row['final_game_state_sha256'],'pre_continuation_state_sha256':row['final_continuation_state_sha256'],'event_seq':row['last_valid_event_seq']}
 return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'last_valid_event_seq':after['last_event_seq'],'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),'final_continuation_state_sha256':after['continuation_state_sha256'],'final_continuation_state':start._payload(after),'stop_reason_code':'unproved_current_chicken_chain_resolution','new_decisions':[decision],'new_events':[event],'new_snapshots':[snapshots.snapshot(after)],'completed':False,'balance_sample_count':0}
def run_route(row,proof):
 path=row['path_id']
 if path=='probe-01-a-first':
  selected={'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'candidate_ids':proof['candidate_ids'],'selected_candidate':'response-pass','resolution_mode':'response_unique'}
  return normal_replay.run_route(row,selected,proof)
 if path=='probe-01-b-first':return close_chain(row,proof)
 if path=='probe-02-b-first':return egg_replay.run_route(row)
 if path=='probe-02-a-first':return normal_replay.run_route(row,choice_normal.audit_route(row,proof),proof)
 raise ValueError('395 route')
def validate(row,result):
 events=result['new_events'];shots=result['new_snapshots'];g=row['final_game_state_sha256'];c=row['final_continuation_state_sha256'];seq=row['last_valid_event_seq']
 if len(events)!=len(shots) or len(events)!=1:raise ValueError('395 count')
 for event,shot in zip(events,shots):
  if event['seq']!=seq+1 or shot['event_seq']!=event['seq'] or event['game_state_before_sha256']!=g or event['continuation_state_before_sha256']!=c or event['game_state_after_sha256']!=shot['game_state_sha256'] or event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or start.opening._stop_state_sha256(shot['game_state'])!=shot['game_state_sha256'] or start.canonical_sha256(shot['continuation_state'])!=shot['continuation_state_sha256']:raise ValueError('395 hash chain')
  seq=event['seq'];g=shot['game_state_sha256'];c=shot['continuation_state_sha256']
 if (seq,g,c)!=(result['last_valid_event_seq'],result['final_game_state_sha256'],result['final_continuation_state_sha256']):raise ValueError('395 final hash')
def build_reports():
 rows=load_rows();proofs=[audit_route(r) for r in rows];results=[run_route(r,p) for r,p in zip(rows,proofs)]
 for r,v in zip(rows,results):validate(r,v)
 return ({'schema':'naotocchi.card_game.proxy_new_seed_mixed_audit_395.v1','source_raw_sha256':SOURCE_SHA,'planned':4,'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':proofs},{'schema':'naotocchi.card_game.proxy_new_seed_mixed_replay_395.v1','source_raw_sha256':SOURCE_SHA,'planned':4,'completed':0,'new_decisions':4,'new_events':4,'new_snapshots':4,'independent_balance_sample_count':0,'results':results})
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();a,r=build_reports()
 for path,value in ((AUDIT,a),(OUTPUT,r)):
  raw=canonical_bytes(value)
  if args.check:
   if path.read_bytes()!=raw:raise SystemExit('395 canonical mismatch '+str(path))
  else:path.write_bytes(raw)
 print('395: four candidate sets and transitions verified')
if __name__=='__main__':main()
