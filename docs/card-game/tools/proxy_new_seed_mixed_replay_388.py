#!/usr/bin/env python3
"""Audit and replay two eggs, paid-action pass and safe free companion."""
import argparse,copy,hashlib,json,sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_replay_387 as states
import proxy_new_seed_mixed_audit_381 as normal_audit
import proxy_new_seed_mixed_audit_340 as egg_audit
import proxy_new_seed_egg_replay_205 as egg
import proxy_new_seed_normal_choice_229 as paid
import proxy_new_seed_normal_restart_157 as free
import proxy_new_seed_mixed_replay_290 as normal_pass
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_normal_action_extension as extension
import proxy_normal_action_seeded_restart as normal
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_new_seed_start_audit_206 as hand
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256='27509eee70483c9b48b7a063d546312715de2bbaa2325f50a7e3debe5235165d'
AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-388-20260929.json';OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-388-20260929.json'
AUDIT_SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_audit_388.v1';SCHEMA='naotocchi.card_game.proxy_new_seed_mixed_replay_388.v1'
def canonical_bytes(v):return (json.dumps(v,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def load_source():
 raw=states.OUTPUT.read_bytes()
 if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or raw!=states.canonical_bytes(states.build_report()):raise ValueError('388 protected 387 source differs')
 rows=json.loads(raw)['results']
 if len(rows)!=4:raise ValueError('388 four routes differ')
 return rows
PAID_COST=paid.cost_and_effect
def cost_and_effect(row,action):
 if action['action_type']!='place_world' or action['card_id']!='W-deepsea':return PAID_COST(row,action)
 game=row['final_continuation_state']['game_state'];owner=game['players'][game['turn_player']]
 section=hand.source_section('89-world-13-card-text-draft.md','W-deepsea')
 template=next(x for x in start.load_candidate_rows()['W-deepsea']['actions'] if x['action_type']=='place_world')
 if (game['turn_player']!='B' or action['source_instance_id'] not in owner['hand'] or owner['board']['world'] is not None or
     owner['board']['main'] is not None or len(owner['hand'])-1!=7 or template['base_time_cost']!=2 or
     '自分の手札が2枚以下の間、自分のメインのちから・ちえ+1' not in section):raise ValueError('388 deepsea cost/effect differs')
 return 2,'89-world-13-card-text-draft.md#W-deepsea'
def choose_pass(row,proof):
 original=paid.cost_and_effect
 try:paid.cost_and_effect=cost_and_effect;selected=paid.audit_route(row,proof)
 finally:paid.cost_and_effect=original
 if selected['selected_candidate']!='pass' or len(selected['paid_comparisons'])!=2 or any(x['comparison']['decided_at']!='time_after_certain_resolution' for x in selected['paid_comparisons']):raise ValueError('388 paid normal choice differs')
 return selected
def choose_free(row,proof):
 game=row['final_continuation_state']['game_state'];actor=game['turn_player'];owner=game['players'][actor];details=proof['legal_candidate_details']
 if (row['path_id']!='probe-02-b-first' or actor!='A' or [x['action_type'] for x in details]!=['place_companion','place_world','pass'] or
     [x['card_id'] for x in details[:2]]!=['C-chicken','W-city'] or owner['person_placed'] or len(owner['board']['companions'])!=1 or
     owner['board']['partner']!='A-018#1' or not proof['candidate_set_complete'] or not all(proof['completeness_checks'].values())):raise ValueError('388 safe placement boundary differs')
 reduced=copy.deepcopy(proof);reduced['candidate_ids']=[details[0]['candidate_id'],'pass'];reduced['legal_candidate_details']=[details[0],details[-1]]
 decision=free.decide(row,reduced)
 if decision['selected_candidate']!='candidate-place-companion-A-015#1' or fallback.validate_safe_free_placement(decision['selected_placement']):raise ValueError('388 safe chicken differs')
 order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
 context={'contract_version':fallback.CONTRACT_VERSION,'order_id':order,'actor':actor,'actor_turn_index':game['round'],'round':game['round'],'phase':'normal_action','decision_kind':'normal_action','choice_kind':'zero_cost_person_placement'}
 full=fallback.resolve_safe_free_development([decision['selected_placement']],context,proof['candidate_ids'])
 if full.get('error') or full['selected_candidate']!=details[0]['candidate_id']:raise ValueError('388 full safe set differs')
 cost,ref=paid.cost_and_effect(row,details[1]);common={'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,'certain_growth_difference':0,'consumed_card_count':0,'value_comparison_to':{}}
 left={**common,'candidate_id':details[0]['candidate_id'],'payment_time':0,'time_after_certain_resolution':owner['time'],'card_copy_id':'A-015'}
 right={**common,'candidate_id':details[1]['candidate_id'],'payment_time':cost,'time_after_certain_resolution':owner['time']-cost,'card_copy_id':'A-020'}
 comparison=priority.compare_candidates(left,right)
 if comparison['winner']!='left' or comparison['decided_at']!='time_after_certain_resolution':raise ValueError('388 paid world comparison differs')
 full.update(selected_action=copy.deepcopy(details[0]),legal_candidate_details=copy.deepcopy(details),paid_comparisons=[{'candidate_id':details[1]['candidate_id'],'source_reference':ref,'score':right,'comparison':comparison}],source_contracts=[107,114,116],pre_game_state_sha256=row['final_game_state_sha256'],pre_continuation_state_sha256=row['final_continuation_state_sha256'],event_seq=row['last_valid_event_seq'])
 return full
def audit_route(row):
 state=row['final_continuation_state'];game=state['game_state'];path=row['path_id']
 if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or start.opening._stop_state_sha256(game)!=row['final_game_state_sha256']:raise ValueError('388 state hash differs')
 base={'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'new_events':0,'completed':False,'balance_sample_count':0}
 if path in ('probe-01-a-first','probe-02-a-first'):
  proof=egg_audit.audit_egg(row);decision=egg.run_route(row)['new_decisions'][0]
  if proof['candidate_ids']!=decision['legal_candidates'] or proof['legal_candidate_details']!=decision['legal_candidate_details'] or fallback.validate_seeded_resolution({k:v for k,v in decision.items() if k not in ('pre_game_state_sha256','pre_continuation_state_sha256','event_seq')}):raise ValueError('388 seeded egg proof differs')
  return {**base,**proof,'selected_candidate':decision['selected_candidate'],'selected_decision':decision}
 proof=normal_audit.audit_route(row)
 if path=='probe-01-b-first':
  selected=choose_pass(row,proof)
  return {**base,**{key:proof[key] for key in ('next_opportunity','candidate_ids','candidate_set_complete','legal_candidate_details','completeness_checks','board_exclusions')},'selected_candidate':'pass','resolution_mode':'priority_unique','evaluated_contracts':[107,114,116],'fallback_applied':False,'selected':selected}
 if path=='probe-02-b-first':
  decision=choose_free(row,proof)
  return {**base,**{key:proof[key] for key in ('next_opportunity','candidate_ids','candidate_set_complete','legal_candidate_details','completeness_checks','board_exclusions')},'selected_candidate':decision['selected_candidate'],'resolution_mode':decision['resolution_mode'],'selected_decision':decision}
 raise ValueError('388 path differs')
def build_audit():return {'schema':AUDIT_SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':[audit_route(r) for r in load_source()]}
def apply_free(row,proof):
 before=copy.deepcopy(row['final_continuation_state']);before.update(source_event_seq=row['last_valid_event_seq'],last_event_seq=row['last_valid_event_seq'],source_game_state_sha256=row['final_game_state_sha256'],continuation_state_sha256=row['final_continuation_state_sha256'])
 if start._hash(before)!=row['final_continuation_state_sha256']:raise ValueError('388 placement source differs')
 decision=copy.deepcopy(proof['selected_decision']);section=hand.source_section('72-companion-26-card-text-draft.md','C-chicken')
 if '自分のターン開始時に発動できる' not in section or '後から登場して同じ開始へ遡らない' not in section:raise ValueError('388 chicken start timing differs')
 current=('72-companion-26-card-text-draft.md#C-chicken','turn_start_trigger_not_placement');old=extension.PLACEMENT_TEXT.get('C-chicken')
 if old is not None and old!=current:raise ValueError('388 placement classification conflict')
 try:extension.PLACEMENT_TEXT['C-chicken']=current;after,generated=extension._apply_placement(before,decision)
 finally:
  if old is None:extension.PLACEMENT_TEXT.pop('C-chicken',None)
  else:extension.PLACEMENT_TEXT['C-chicken']=old
 normal._verify_step(before,after,generated)
 if len(generated)!=1 or generated[0]['action_type']!='place_companion' or after['game_state']['phase']!='post_placement_response' or 'A-015#1' not in after['game_state']['players']['A']['board']['companions'] or after['pending_triggers']:raise ValueError('388 placement transition differs')
 event={k:copy.deepcopy(v) for k,v in generated[0].items() if k!='_snapshot_after'}
 return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'last_valid_event_seq':after['last_event_seq'],'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),'final_continuation_state_sha256':after['continuation_state_sha256'],'final_continuation_state':start._payload(after),'stop_reason_code':'unproved_post_placement_response_candidates','new_decisions':[decision],'new_events':[event],'new_snapshots':[snapshots.snapshot(after)],'completed':False,'balance_sample_count':0}
def run_route(row,proof):
 if row['path_id'] in ('probe-01-a-first','probe-02-a-first'):
  result=egg.run_route(row)
  if result['new_decisions']!=[proof['selected_decision']]:raise ValueError('388 egg choice differs')
  return result
 if row['path_id']=='probe-01-b-first':return normal_pass.run_route(row,proof['selected'],proof)
 if row['path_id']=='probe-02-b-first':return apply_free(row,proof)
 raise ValueError('388 path differs')
def validate(row,result):
 if len(result['new_events'])!=len(result['new_snapshots'])!=1:raise ValueError('388 event count differs')
 e,s=result['new_events'][0],result['new_snapshots'][0]
 if e['seq']!=row['last_valid_event_seq']+1 or s['event_seq']!=e['seq'] or e['game_state_before_sha256']!=row['final_game_state_sha256'] or e['continuation_state_before_sha256']!=row['final_continuation_state_sha256'] or e['game_state_after_sha256']!=s['game_state_sha256'] or e['continuation_state_after_sha256']!=s['continuation_state_sha256'] or start.opening._stop_state_sha256(s['game_state'])!=result['final_game_state_sha256'] or start.canonical_sha256(s['continuation_state'])!=result['final_continuation_state_sha256']:raise ValueError('388 event/snapshot/hash differs')
def build_report():
 a=build_audit();rows=load_source();results=[run_route(r,p) for r,p in zip(rows,a['results'])]
 for r,v in zip(rows,results):validate(r,v)
 return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'audit_raw_sha256':hashlib.sha256(canonical_bytes(a)).hexdigest(),'planned':4,'completed':0,'new_decisions':4,'new_events':4,'new_snapshots':4,'independent_balance_sample_count':0,'results':results}
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();a=canonical_bytes(build_audit());b=canonical_bytes(build_report())
 if args.check:
  if AUDIT.read_bytes()!=a or OUTPUT.read_bytes()!=b:raise SystemExit('388 canonical bytes differ')
 else:AUDIT.write_bytes(a);OUTPUT.write_bytes(b)
 print('388: two seeded eggs, paid pass and free chicken replayed')
if __name__=='__main__':main()
