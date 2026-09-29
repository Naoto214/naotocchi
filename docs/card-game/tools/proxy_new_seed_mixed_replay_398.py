#!/usr/bin/env python3
"""Audit and replay four reached response, placement and egg choices."""
import argparse,copy,hashlib,json,sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_replay_397 as source
import proxy_new_seed_mixed_audit_340 as eggs
import proxy_new_seed_mixed_audit_381 as normals
import proxy_new_seed_normal_restart_157 as free
import proxy_new_seed_normal_choice_229 as paid
import proxy_new_seed_mixed_choice_325 as countryside
import proxy_normal_decision_fallback_contract as fallback
import proxy_normal_decision_hardening as priority
import proxy_new_seed_start_choice_188 as board_choice
import proxy_response_window_seeded_restart as response
import proxy_new_seed_mixed_replay_290 as end_pass
import proxy_new_seed_egg_replay_205 as egg_replay
import proxy_normal_action_extension as extension
import proxy_normal_action_seeded_restart as normal
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE_SHA='e42a8c66f1c4359297e2db98fef98ebb6c02bf0de41dd8b2af3037cc5c41622c'
AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-398-20260929.json'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-398-20260929.json'
def canonical_bytes(value):return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def load_rows():
 raw=source.OUTPUT.read_bytes()
 if hashlib.sha256(raw).hexdigest()!=SOURCE_SHA or raw!=source.canonical_bytes(source.build_reports()[1]):raise ValueError('398 source differs')
 rows=json.loads(raw)['results']
 if len(rows)!=4:raise ValueError('398 route count')
 return rows

def audit_response(row):
    state = row['final_continuation_state']
    game, ctx = state['game_state'], state['response_context']
    path, actor = row['path_id'], ctx['priority_actor']
    expected = {'probe-01-a-first': ('response_window','turn_start','B','B','empty',0,0)}
    if (path not in expected or
            (game['phase'], ctx['window_kind'], actor, ctx['turn_player'], ctx['chain_status'],
             ctx['consecutive_passes'], len(state['activation_zone'])) != expected[path] or
            state['pending_triggers']):
        raise ValueError('389 response boundary differs')
    owner = game['players'][actor]
    board = owner['board']
    projected = copy.deepcopy(state)
    entries = start.load_candidate_rows()
    removed = []
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        entry = entries.get(card_id)
        if entry is None:
            raise ValueError('389 unregistered hand card')
        exclusion = hand.extra_hand_exclusion(card_id, entry, game, actor)
        if exclusion is None and card_id == 'E-boss':
            section = hand.source_section('91-event-21-card-text-draft.md', card_id)
            if (board['main'] is not None or
                    'このターン、自分のメインが勝負に負けていた場合に発動できる' not in section):
                raise ValueError('389 boss opponent-turn condition differs')
            exclusion = {'card_id':card_id,'reason_code':'requires_own_main_battle_loss_this_turn',
                         'source_reference':'91-event-21-card-text-draft.md#E-boss'}
        if exclusion is None and card_id == 'G-animal-shogi':
            section = hand.source_section('83-play-batch-3-card-text-draft.md', card_id)
            if ('自分の捨て札のなかま1枚を対象' not in section or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('389 animal shogi target differs')
            exclusion = {'card_id':card_id,'reason_code':'requires_own_discarded_companion'}
        action = next((x for x in entry['actions'] if x['action_type'] in ('use_play','use_item','use_event')), None)
        if exclusion is None and action is not None and owner['time'] >= action['base_time_cost']:
            exclusion = conditional.conditional_exclusion(card_id, game, actor)
        if exclusion is None and action is not None and action['target_rule'] == 'one own main':
            filename, section_id = action['source_text_reference'].split('#', 1)
            if section_id != card_id or '自分のメイン1枚を対象' not in hand.source_section(filename, section_id):
                raise ValueError('389 own main target text differs')
            exclusion = {'card_id':card_id,'reason_code':'requires_own_main_target'}
        if exclusion:
            projected['game_state']['players'][actor]['hand'].remove(instance)
            removed.append({'source_instance_id':instance, **exclusion})
    excluded = []
    board_candidates = []
    for instance in board['companions']:
        card_id = game['cards'][instance]['card_id']
        section = hand.source_section('72-companion-26-card-text-draft.md', card_id)
        if card_id == 'C-cat_friend':
            if ('自分の捨て札の「きまぐれなねこ」以外のなかまカード1枚を対象' not in section or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('389 cat friend target differs')
            reason = 'requires_other_discarded_companion'
        elif card_id == 'C-box':
            if '能力なし。' not in section:
                raise ValueError('389 box text differs')
            reason = 'no_ability'
        elif card_id == 'C-chicken' and path == 'probe-01-a-first':
            trigger=timing.TRIGGERS.get(card_id)
            if (not owner['deck'] or trigger is None or any(fragment not in section for fragment in trigger[1:]) or
                    row['new_events'][0]['action_type']!='egg_exchange_bottom' or
                    ctx['origin_event_seq']!=row['last_valid_event_seq'] or
                    not timing.matches(card_id,'turn_start',actor,ctx['turn_player'],'turn_start',actor)):
                raise ValueError('389 chicken start trigger differs')
            board_candidates.append({'candidate_id':'response-activate-ability-'+instance,
                'candidate_family':'triggered_ability','action_type':'activate_board_ability',
                'source_instance_id':instance,'card_id':card_id,
                'source_references':['72-companion-26-card-text-draft.md#'+card_id]})
            reason=None
        elif card_id in ('C-bat','C-chicken'):
            trigger = timing.TRIGGERS.get(card_id)
            if trigger is None or any(fragment not in section for fragment in trigger[1:]):
                raise ValueError('389 board trigger text differs')
            if timing.matches(card_id,ctx['window_kind'],actor,ctx['turn_player'],
                              row['new_events'][0]['action_type'],row['new_events'][0]['actor']):
                raise ValueError('389 board trigger unexpectedly met')
            reason = 'trigger_condition_not_met'
        else:
            raise ValueError('389 unclassified companion')
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
        if reason:excluded.append({'source_instance_id':instance,'card_id':card_id,'reason_code':reason})
    partner = board['partner']
    if partner:
        card_id = game['cards'][partner]['card_id']
        section = hand.source_section('74-partner-18-card-text-draft.md',card_id)
        if card_id == 'P-cat_ceo' and '交際を始めた時、発動する' in section:
            reason = 'relationship_start_event_not_met'
        elif card_id == 'P-cliff_goat' and '初配置・同名上書き' in section and board['world'] is None:
            reason = 'different_world_replacement_not_met'
        elif card_id == 'P-anglerfish' and '自分のメインが自分からちょうせんする時' in section:
            reason = 'trigger_condition_not_met'
        else:
            raise ValueError('389 partner response timing differs')
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
        excluded.append({'source_instance_id':partner,'card_id':card_id,'reason_code':reason})
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    chance = start.enumerate_opportunity(projected,actor,entries)
    ids = sorted(chance['legal_candidate_ids']+[x['candidate_id'] for x in board_candidates])
    expected_ids=['response-activate-ability-B-015#1','response-pass'] if path=='probe-01-a-first' else ['response-pass']
    if ids != expected_ids or len(ids)!=len(set(ids)) or not chance['candidate_set_complete']:
        raise ValueError('389 response candidates require further proof: ' + repr(ids))
    return {'next_opportunity':game['phase'],'candidate_ids':ids,'candidate_set_complete':True,
            'hand_exclusions':removed,'hand_other_exclusions':chance['excluded_candidates'],
            'board_exclusions':excluded,'board_candidate_details':board_candidates}

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
def audit_route(row):
 path=row['path_id'];state=row['final_continuation_state'];game=state['game_state'];ctx=state['response_context']
 if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or start.opening._stop_state_sha256(game)!=row['final_game_state_sha256']:raise ValueError('398 source hashes')
 base={'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256']}
 if path=='probe-01-a-first':return {**base,**audit_response(row)}
 if path=='probe-01-b-first':
  if (game['phase'],ctx['window_kind'],ctx['priority_actor'],ctx['consecutive_passes'])!=('turn_end_response','after_normal_action','B',1):raise ValueError('398 end boundary')
  proof=audit_end_response(row)
  if proof['candidate_ids']!=['response-pass']:raise ValueError('398 end candidates')
  return {**base,**proof,'next_opportunity':'turn_end_response'}
 if path=='probe-02-b-first':return {**base,**normals.audit_route(row)}
 if path=='probe-02-a-first':return {**base,**eggs.audit_egg(row)}
 raise ValueError('398 route')
def choose_response(row,proof):
 if proof['candidate_ids']!=['response-activate-ability-B-015#1','response-pass'] or len(proof['board_candidate_details'])!=1:raise ValueError('398 board set')
 state=copy.deepcopy(row['final_continuation_state']);state.update(source_event_seq=row['last_valid_event_seq'],last_event_seq=row['last_valid_event_seq'],source_game_state_sha256=row['final_game_state_sha256'],continuation_state_sha256=row['final_continuation_state_sha256'])
 if start._hash(state)!=row['final_continuation_state_sha256']:raise ValueError('398 response prehash')
 adapted=copy.deepcopy(proof);adapted['hand_conditional_exclusions']=proof['hand_exclusions'];adapted['hand_candidate_ids']=['response-pass']
 chance=board_choice.opportunity(state,adapted);order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id']
 decision=response.resolve_response_choice({'order_id':order,'actor_turn_index':state['game_state']['round'],'round':state['game_state']['round']},chance)
 if decision['selected_candidate']!='response-pass' or decision['resolution_mode']!='response_seeded_fallback' or decision['legal_candidate_ids']!=proof['candidate_ids']:raise ValueError('398 seeded response choice')
 decision.update(pre_game_state_sha256=row['final_game_state_sha256'],pre_continuation_state_sha256=row['final_continuation_state_sha256'],event_seq=row['last_valid_event_seq'])
 return state,decision
def choose_free(row,proof):
 game=row['final_continuation_state']['game_state'];owner=game['players']['B'];details=proof['legal_candidate_details']
 if [x['action_type'] for x in details]!=['place_companion','place_world','play_main','pass'] or [x['card_id'] for x in details[:3]]!=['C-chameleon','W-countryside','M-antlion-01'] or not all(proof['completeness_checks'].values()) or owner['person_placed']:raise ValueError('398 free inventory')
 reduced=copy.deepcopy(proof);reduced['candidate_ids']=[details[0]['candidate_id'],'pass'];reduced['legal_candidate_details']=[details[0],details[-1]]
 decision=free.decide(row,reduced)
 if decision['selected_candidate']!='candidate-place-companion-B-014#1' or decision['resolution_mode']!='safe_free_development' or fallback.validate_safe_free_placement(decision['selected_placement']):raise ValueError('398 safe placement')
 order=next(x for x in start.load_source()['results'] if x['path_id']==row['path_id'])['order_id'];context={'contract_version':fallback.CONTRACT_VERSION,'order_id':order,'actor':'B','actor_turn_index':game['round'],'round':game['round'],'phase':'normal_action','decision_kind':'normal_action','choice_kind':'zero_cost_person_placement'}
 full=fallback.resolve_safe_free_development([decision['selected_placement']],context,proof['candidate_ids'])
 if full.get('error') or full['selected_candidate']!=details[0]['candidate_id']:raise ValueError('398 full fallback')
 common={'avoid_loss_or_abort':0,'maintain_or_prevent_100':0,'certain_growth_difference':0,'consumed_card_count':0,'value_comparison_to':{}}
 left={**common,'candidate_id':details[0]['candidate_id'],'payment_time':0,'time_after_certain_resolution':owner['time'],'card_copy_id':game['cards'][details[0]['source_instance_id']]['card_copy_id']};comparisons=[]
 for action in details[1:3]:
  cost,ref=countryside.paid_cost_and_effect(row,action) if action['card_id']=='W-countryside' else paid.cost_and_effect(row,action)
  right={**common,'candidate_id':action['candidate_id'],'payment_time':cost,'time_after_certain_resolution':owner['time']-cost,'card_copy_id':game['cards'][action['source_instance_id']]['card_copy_id']}
  compared=priority.compare_candidates(left,right)
  if compared['winner']!='left' or compared['decided_at']!='time_after_certain_resolution':raise ValueError('398 paid comparison')
  comparisons.append({'candidate_id':action['candidate_id'],'source_reference':ref,'score':right,'comparison':compared})
 full.update(selected_action=copy.deepcopy(details[0]),legal_candidate_details=copy.deepcopy(details),paid_comparisons=comparisons,source_contracts=[107,114,116],pre_game_state_sha256=row['final_game_state_sha256'],pre_continuation_state_sha256=row['final_continuation_state_sha256'],event_seq=row['last_valid_event_seq'])
 return full
def place_free(row,decision):
 before=copy.deepcopy(row['final_continuation_state']);before.update(source_event_seq=row['last_valid_event_seq'],last_event_seq=row['last_valid_event_seq'],source_game_state_sha256=row['final_game_state_sha256'],continuation_state_sha256=row['final_continuation_state_sha256'])
 if start._hash(before)!=row['final_continuation_state_sha256']:raise ValueError('398 free prehash')
 after,generated=extension._apply_placement(before,decision);normal._verify_step(before,after,generated)
 if len(generated)!=1 or generated[0]['action_type']!='place_companion' or 'B-014#1' not in after['game_state']['players']['B']['board']['companions'] or after['game_state']['players']['B']['board']['partner']!='B-018#1':raise ValueError('398 chameleon placement')
 event={k:copy.deepcopy(v) for k,v in generated[0].items() if k!='_snapshot_after'}
 return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'last_valid_event_seq':after['last_event_seq'],'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),'final_continuation_state_sha256':after['continuation_state_sha256'],'final_continuation_state':start._payload(after),'stop_reason_code':'unproved_post_placement_response_candidates','new_decisions':[decision],'new_events':[event],'new_snapshots':[snapshots.snapshot(after)],'completed':False,'balance_sample_count':0}
def run_route(row,proof):
 path=row['path_id']
 if path=='probe-01-a-first':
  before,decision=choose_response(row,proof);actor=before['response_context']['priority_actor'];after,event,_=start._pass(before,actor);normal._verify_step(before,after,[event])
  if after['response_context']['consecutive_passes']!=1 or after['response_context']['priority_actor']!='A':raise ValueError('398 first response pass')
  return {'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'last_valid_event_seq':after['last_event_seq'],'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),'final_continuation_state_sha256':after['continuation_state_sha256'],'final_continuation_state':start._payload(after),'stop_reason_code':'unproved_next_priority_response_candidates','new_decisions':[decision],'new_events':[event],'new_snapshots':[snapshots.snapshot(after)],'completed':False,'balance_sample_count':0}
 if path=='probe-01-b-first':
  selected={'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'candidate_ids':proof['candidate_ids'],'selected_candidate':'response-pass','resolution_mode':'response_unique'}
  return end_pass.run_route(row,selected,proof)
 if path=='probe-02-b-first':return place_free(row,choose_free(row,proof))
 if path=='probe-02-a-first':return egg_replay.run_route(row)
 raise ValueError('398 route')
def validate(row,result):
 events=result['new_events'];shots=result['new_snapshots'];g=row['final_game_state_sha256'];c=row['final_continuation_state_sha256'];seq=row['last_valid_event_seq']
 if len(events)!=len(shots) or len(events)!=1:raise ValueError('398 count')
 for event,shot in zip(events,shots):
  if event['seq']!=seq+1 or shot['event_seq']!=event['seq'] or event['game_state_before_sha256']!=g or event['continuation_state_before_sha256']!=c or event['game_state_after_sha256']!=shot['game_state_sha256'] or event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or start.opening._stop_state_sha256(shot['game_state'])!=shot['game_state_sha256'] or start.canonical_sha256(shot['continuation_state'])!=shot['continuation_state_sha256']:raise ValueError('398 hash chain')
  seq=event['seq'];g=shot['game_state_sha256'];c=shot['continuation_state_sha256']
 if (seq,g,c)!=(result['last_valid_event_seq'],result['final_game_state_sha256'],result['final_continuation_state_sha256']):raise ValueError('398 final hash')
def build_reports():
 rows=load_rows();proofs=[audit_route(r) for r in rows];results=[run_route(r,p) for r,p in zip(rows,proofs)]
 for r,v in zip(rows,results):validate(r,v)
 return ({'schema':'naotocchi.card_game.proxy_new_seed_mixed_audit_398.v1','source_raw_sha256':SOURCE_SHA,'planned':4,'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':proofs},{'schema':'naotocchi.card_game.proxy_new_seed_mixed_replay_398.v1','source_raw_sha256':SOURCE_SHA,'planned':4,'completed':0,'new_decisions':4,'new_events':4,'new_snapshots':4,'independent_balance_sample_count':0,'results':results})
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();a,r=build_reports()
 for path,value in ((AUDIT,a),(OUTPUT,r)):
  raw=canonical_bytes(value)
  if args.check:
   if path.read_bytes()!=raw:raise SystemExit('398 canonical mismatch '+str(path))
  else:path.write_bytes(raw)
 print('398: four candidate decisions and transitions verified')
if __name__=='__main__':main()
