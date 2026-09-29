#!/usr/bin/env python3
"""Audit and replay four reached opportunities from saved checkpoint 390."""
import argparse,copy,hashlib,json,sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_replay_390 as source
import proxy_new_seed_mixed_audit_340 as eggs
import proxy_new_seed_mixed_audit_381 as normals
import proxy_new_seed_normal_audit_156 as partner
import proxy_new_seed_normal_trigger_audit_146 as table_source
import proxy_new_seed_normal_choice_229 as paid
import proxy_new_seed_normal_restart_157 as free
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_new_seed_mixed_replay_308 as chain
import proxy_new_seed_egg_replay_205 as egg_replay
import proxy_new_seed_mixed_replay_290 as normal_replay
import proxy_normal_action_extension as extension
import proxy_normal_action_seeded_restart as normal
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
STATE_SHA='93d19d3c2e5591ce0a2e1e63603a201c58e0c0944fd9c043a5d6dd8330692473'
AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-391-20260929.json'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-391-20260929.json'
def canonical_bytes(value):return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def load_rows():
 raw=source.OUTPUT.read_bytes()
 if hashlib.sha256(raw).hexdigest()!=STATE_SHA or raw!=source.canonical_bytes(source.build_report()):raise ValueError('391 source raw/canonical mismatch')
 rows=json.loads(raw)['results']
 if len(rows)!=4:raise ValueError('391 route count')
 return rows
def response_proof(row):
 state=row['final_continuation_state'];game=state['game_state'];ctx=state['response_context']
 if (game['phase'],ctx['window_kind'],ctx['priority_actor'],ctx['turn_player'],ctx['chain_status'],ctx['consecutive_passes'],len(state['activation_zone']))!=('response_window','turn_start','B','A','building',1,1):raise ValueError('391 response boundary')
 zone=state['activation_zone'][0]
 if zone['source_instance_id']!='A-015#1' or zone['card_id']!='C-chicken':raise ValueError('391 active chicken')
 # B-chicken is a nonmatching own-turn trigger at A turn start.
 return audit_response_current(row)
def audit_response_current(row):
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
 chance=start.enumerate_opportunity(projected,actor,entries)
 if chance['legal_candidate_ids']!=['response-pass'] or not chance['candidate_set_complete']:raise ValueError('391 response inventory '+repr(chance['legal_candidate_ids']))
 return {'next_opportunity':'response_window','candidate_ids':['response-pass'],'candidate_set_complete':True,'hand_exclusions':removed,'hand_other_exclusions':chance['excluded_candidates'],'board_exclusions':excluded}
def audit_route(row):
 state=row['final_continuation_state']
 if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or start.opening._stop_state_sha256(state['game_state'])!=row['final_game_state_sha256']:raise ValueError('391 source hash')
 path=row['path_id']
 if path=='probe-01-a-first':proof=response_proof(row)
 elif path=='probe-01-b-first':proof=eggs.audit_egg(row)
 elif path=='probe-02-a-first':
  with partner.partner_response_scope(table_source.normal.candidate.load_inputs()['candidate_table']):proof=normals.audit_route(row)
 else:proof=normals.audit_route(row)
 return {'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],**proof}
def choose_free(row,proof):
 details=proof['legal_candidate_details'];game=row['final_continuation_state']['game_state'];owner=game['players']['A']
 if row['path_id']!='probe-02-a-first' or [d['action_type'] for d in details]!=['attach_item','place_companion','place_world','play_main','pass'] or [d['card_id'] for d in details[:4]]!=['I-bowtie','C-chicken','W-city','M-beetle-01'] or owner['board']['partner']!='A-016#1' or not all(proof['completeness_checks'].values()):raise ValueError('391 free placement inventory')
 chosen=details[1];reduced=copy.deepcopy(proof);reduced['candidate_ids']=[chosen['candidate_id'],'pass'];reduced['legal_candidate_details']=[chosen,details[-1]]
 decision=free.decide(row,reduced)
 if decision['selected_candidate']!=chosen['candidate_id'] or decision['resolution_mode']!='safe_free_development' or fallback.validate_safe_free_placement(decision['selected_placement']):raise ValueError('391 free choice')
 order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
 context={'contract_version':fallback.CONTRACT_VERSION,'order_id':order,'actor':'A','actor_turn_index':game['round'],'round':game['round'],'phase':'normal_action','decision_kind':'normal_action','choice_kind':'zero_cost_person_placement'}
 full=fallback.resolve_safe_free_development([decision['selected_placement']],context,proof['candidate_ids'])
 if full.get('error') or full['selected_candidate']!=chosen['candidate_id']:raise ValueError('391 full fallback')
 common={'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,'certain_growth_difference':0,'consumed_card_count':0,'value_comparison_to':{}}
 left={**common,'candidate_id':chosen['candidate_id'],'payment_time':0,'time_after_certain_resolution':owner['time'],'card_copy_id':game['cards'][chosen['source_instance_id']]['card_copy_id']}
 comparisons=[]
 for action in (details[0],details[2],details[3]):
  cost,ref=paid.cost_and_effect(row,action)
  right={**common,'candidate_id':action['candidate_id'],'payment_time':cost,'time_after_certain_resolution':owner['time']-cost,'card_copy_id':game['cards'][action['source_instance_id']]['card_copy_id']}
  compared=priority.compare_candidates(left,right)
  if compared['winner']!='left' or compared['decided_at']!='time_after_certain_resolution':raise ValueError('391 paid priority')
  comparisons.append({'candidate_id':action['candidate_id'],'source_reference':ref,'score':right,'comparison':compared})
 full.update(selected_action=copy.deepcopy(chosen),legal_candidate_details=copy.deepcopy(details),paid_comparisons=comparisons,source_contracts=[107,114,116],pre_game_state_sha256=row['final_game_state_sha256'],pre_continuation_state_sha256=row['final_continuation_state_sha256'],event_seq=row['last_valid_event_seq'])
 return full
def replay_free(row,decision):
 before=copy.deepcopy(row['final_continuation_state']);before.update(source_event_seq=row['last_valid_event_seq'],last_event_seq=row['last_valid_event_seq'],source_game_state_sha256=row['final_game_state_sha256'],continuation_state_sha256=row['final_continuation_state_sha256'])
 if start._hash(before)!=row['final_continuation_state_sha256']:raise ValueError('391 free source hash')
 current=('72-companion-26-card-text-draft.md#C-chicken','turn_start_trigger_not_placement');registered=extension.PLACEMENT_TEXT.get('C-chicken')
 if registered is not None and registered!=current:raise ValueError('391 chicken classification')
 try:
  extension.PLACEMENT_TEXT['C-chicken']=current;after,generated=extension._apply_placement(before,decision)
 finally:
  if registered is None:extension.PLACEMENT_TEXT.pop('C-chicken',None)
  else:extension.PLACEMENT_TEXT['C-chicken']=registered
 normal._verify_step(before,after,generated)
 if len(generated)!=1 or generated[0]['action_type']!='place_companion' or after['game_state']['players']['A']['board']['partner']!='A-016#1' or 'A-015#1' not in after['game_state']['players']['A']['board']['companions']:raise ValueError('391 placement result')
 event={k:copy.deepcopy(v) for k,v in generated[0].items() if k!='_snapshot_after'}
 return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'last_valid_event_seq':after['last_event_seq'],'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),'final_continuation_state_sha256':after['continuation_state_sha256'],'final_continuation_state':start._payload(after),'stop_reason_code':'unproved_post_placement_response_candidates','new_decisions':[decision],'new_events':[event],'new_snapshots':[snapshots.snapshot(after)],'completed':False,'balance_sample_count':0}
def run_route(row,proof):
 path=row['path_id']
 if path=='probe-01-a-first':
  selected={'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'candidate_ids':proof['candidate_ids'],'selected_candidate':'response-pass','resolution_mode':'response_unique'}
  return chain.run_route(row,selected,proof)
 if path=='probe-01-b-first':return egg_replay.run_route(row)
 if path=='probe-02-a-first':return replay_free(row,choose_free(row,proof))
 return normal_replay.run_route(row,paid.audit_route(row,proof),proof)
def validate(row,result):
 events=result['new_events'];shots=result['new_snapshots'];g=row['final_game_state_sha256'];c=row['final_continuation_state_sha256'];seq=row['last_valid_event_seq']
 if len(events)!=len(shots) or len(events)!=1:raise ValueError('391 event count')
 for e,s in zip(events,shots):
  if e['seq']!=seq+1 or s['event_seq']!=e['seq'] or e['game_state_before_sha256']!=g or e['continuation_state_before_sha256']!=c or e['game_state_after_sha256']!=s['game_state_sha256'] or e['continuation_state_after_sha256']!=s['continuation_state_sha256'] or start.opening._stop_state_sha256(s['game_state'])!=s['game_state_sha256'] or start.canonical_sha256(s['continuation_state'])!=s['continuation_state_sha256']:raise ValueError('391 event/snapshot/hash')
  seq=e['seq'];g=s['game_state_sha256'];c=s['continuation_state_sha256']
 if (seq,g,c)!=(result['last_valid_event_seq'],result['final_game_state_sha256'],result['final_continuation_state_sha256']):raise ValueError('391 final hash')
def build_reports():
 rows=load_rows();proofs=[audit_route(r) for r in rows];results=[run_route(r,p) for r,p in zip(rows,proofs)]
 for r,v in zip(rows,results):validate(r,v)
 return ({'schema':'naotocchi.card_game.proxy_new_seed_mixed_audit_391.v1','source_raw_sha256':STATE_SHA,'planned':4,'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':proofs},{'schema':'naotocchi.card_game.proxy_new_seed_mixed_replay_391.v1','source_raw_sha256':STATE_SHA,'planned':4,'completed':0,'new_decisions':4,'new_events':4,'new_snapshots':4,'independent_balance_sample_count':0,'results':results})
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args();a,r=build_reports()
 for path,value in ((AUDIT,a),(OUTPUT,r)):
  raw=canonical_bytes(value)
  if args.check:
   if path.read_bytes()!=raw:raise SystemExit('391 canonical mismatch: '+str(path))
  else:path.write_bytes(raw)
 print('391: four audits and transitions verified')
if __name__=='__main__':main()
