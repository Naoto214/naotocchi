#!/usr/bin/env python3
"""Audit and replay four reached end, chain, and response opportunities."""
import argparse,copy,hashlib,json,sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_replay_395 as source
import proxy_new_seed_mixed_replay_392 as response_audit
import proxy_new_seed_ability_resolution_196 as chicken
import proxy_new_seed_turn_end_replay_204 as end
import proxy_new_seed_mixed_replay_379 as response_pass
import proxy_new_seed_mixed_replay_290 as end_pass
import proxy_new_seed_chain_pass_172 as snapshots
import proxy_new_seed_mixed_audit_387 as baseline_a
import proxy_new_seed_mixed_audit_294 as baseline_refs
import proxy_new_seed_turn_end_proof_203 as terminal_baseline
import proxy_new_seed_turn_end_audit_163 as board_end
import proxy_turn_end_provenance_restart as precedent
import proxy_new_seed_start_audit_206 as hand
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE_SHA='f5fabf42c091da4c7e1aceef42d9244783cc580f6798857fec6ef1e2d246cfd6'
AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-396-20260929.json'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-396-20260929.json'
def canonical_bytes(value):return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def load_rows():
 raw=source.OUTPUT.read_bytes()
 if hashlib.sha256(raw).hexdigest()!=SOURCE_SHA or raw!=source.canonical_bytes(source.build_reports()[1]):raise ValueError('396 source differs')
 rows=json.loads(raw)['results']
 if len(rows)!=4:raise ValueError('396 routes')
 return rows

def prove_end(row):
    path=row['path_id'];state=row['final_continuation_state']
    if state['game_state']['phase']!='turn_end' or state['return_target']!='turn_end' or state['activation_zone'] or state['pending_triggers']:
        raise ValueError('390 end boundary differs')
    baseline,first=baseline_a,387
    old=next(x for x in json.loads(baseline.OUTPUT.read_bytes())['results'] if x['path_id']==path)
    if not old['turn_end_set_complete'] or old['contract_stop_codes']:
        raise ValueError('390 inherited end proof differs')
    seq=old['source_last_valid_event_seq'];game_hash=old['source_game_state_sha256']
    cont_hash=old['source_continuation_state_sha256']
    events,growth=copy.deepcopy(old['classified_events']),copy.deepcopy(old['growth_trace'])
    counts={}
    for number in range(first,396):
        files=list((ROOT/'data').glob(f'proxy-new-seed-*-{number}-*.json'))
        if not files or len(files)>2:raise ValueError(f'390 checkpoint inventory differs at {number}')
        chosen=next((x for x in files if '-replay-' in x.name),files[0])
        saved=next(x for x in json.loads(chosen.read_bytes())['results'] if x['path_id']==path)
        new_events,shots=saved.get('new_events',[]) or [],saved.get('new_snapshots',[]) or []
        if len(new_events)!=len(shots):raise ValueError(f'390 event/snapshot count differs at {number}')
        counts[str(number)]=len(new_events)
        for event,shot in zip(new_events,shots):
            action=event['action_type']
            if (action not in {**baseline_refs.SOURCE_REFS,'resolve_event':'91-event-21-card-text-draft.md#E-first-date'} or event['seq']!=seq+1 or
                shot['event_seq']!=event['seq'] or
                event['game_state_before_sha256']!=game_hash or
                event['continuation_state_before_sha256']!=cont_hash or
                event['game_state_after_sha256']!=shot['game_state_sha256'] or
                event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or
                start.opening._stop_state_sha256(shot['game_state'])!=shot['game_state_sha256'] or
                start.canonical_sha256(shot['continuation_state'])!=shot['continuation_state_sha256']):
                raise ValueError(f'390 history/hash differs at {number}')
            current={actor:shot['game_state']['players'][actor]['growth'] for actor in 'AB'}
            delta={actor:current[actor]-growth[-1]['growth'][actor] for actor in 'AB'}
            if any(delta.values()) or shot['continuation_state']['pending_triggers']:
                raise ValueError(f'390 unexpected growth/trigger at {number}')
            seq=event['seq'];game_hash=shot['game_state_sha256'];cont_hash=shot['continuation_state_sha256']
            events.append({'seq':seq,'action_type':action,'source_reference':{**baseline_refs.SOURCE_REFS,'resolve_event':'91-event-21-card-text-draft.md#E-first-date'}[action],
                           'growth_delta':delta})
            growth.append({'event_seq':seq,'growth':current})
    if (seq,game_hash,cont_hash)!=(row['last_valid_event_seq'],row['final_game_state_sha256'],row['final_continuation_state_sha256']):
        raise ValueError('390 end history boundary differs')
    original=next(x for x in json.loads(terminal_baseline.OUTPUT.read_bytes())['results'] if x['path_id']==path)
    if not original['turn_end_set_complete'] or original['growth_reach_100'] or original['active_expiring_effects'] or original['unresolved_codes']:
        raise ValueError('390 terminal inherited constraints differ')
    stop={'path_id':path,'last_valid_event_seq':seq,'game_state_sha256':game_hash,
          'continuation_state_sha256':cont_hash,'game_state':state['game_state'],'continuation_state':state}
    proof={'classified_events':events,'growth_trace':growth,'growth_reach_100':original['growth_reach_100'],
           'active_expiring_effects':original['active_expiring_effects'],
           'unresolved_codes':original['unresolved_codes'],'source_event_seq':seq}
    section=hand.source_section('72-companion-26-card-text-draft.md','C-cat_friend')
    if ('自分のターンに、このカードをなかま枠から山札の一番下に置き' not in section or '自分のターン終了時' in section):
        raise ValueError('390 cat friend timing differs')
    registry=board_end.board.turn_end.BOARD_REGISTRY
    box=hand.source_section('72-companion-26-card-text-draft.md','C-box')
    if '> 能力なし。' not in box:
        raise ValueError('390 box source text differs')
    additions={'C-cat_friend':('activated_ability_not_turn_end','72-companion-26-card-text-draft.md#C-cat_friend'),
               'C-box':('no_ability','72-companion-26-card-text-draft.md#C-box')}
    previous={name:registry.get(name) for name in additions}
    if any(previous[name] is not None and previous[name]!=value for name,value in additions.items()):
        raise ValueError('390 board classification conflict')
    try:
        registry.update(additions)
        with board_end.current_board_scope():
            result=precedent.audit_current_turn_end(stop,proof)
    finally:
        for name,value in previous.items():
            if value is None:registry.pop(name,None)
            else:registry[name]=value
    if not result['turn_end_set_complete'] or result['contract_stop_codes'] or not all(result['completeness_checks'].values()):
        raise ValueError('390 six-stage end incomplete: '+repr(result['contract_stop_codes']))
    return {'next_opportunity':'turn_end','turn_end_set_complete':True,
            'stage_inventory':result['stage_inventory'],'completeness_checks':result['completeness_checks'],
            'contract_stop_codes':result['contract_stop_codes'],
            'classified_events':events,'growth_trace':growth,'event_counts_by_checkpoint':counts}
def audit_route(row):
 path=row['path_id'];state=row['final_continuation_state'];game=state['game_state'];ctx=state['response_context']
 if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or start.opening._stop_state_sha256(game)!=row['final_game_state_sha256']:raise ValueError('396 source hashes')
 base={'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256']}
 if path=='probe-01-a-first':return {**base,**prove_end(row)}
 if path=='probe-01-b-first':
  if (game['phase'],ctx['window_kind'],ctx['chain_status'],ctx['consecutive_passes'],len(state['activation_zone']))!=('response_window','turn_start','resolving',2,1):raise ValueError('396 chain resolution boundary')
  return {**base,'next_opportunity':'resolve_board_ability','chain_link_id':state['activation_zone'][0]['link_id'],'source_instance_id':'A-015#1'}
 if path=='probe-02-b-first':
  if (game['phase'],ctx['window_kind'],ctx['priority_actor'],ctx['turn_player'],ctx['chain_status'],ctx['consecutive_passes'])!=('response_window','turn_start','B','B','empty',0):raise ValueError('396 start response boundary')
  proof=response_audit.audit_end_response(row)
  if proof['candidate_ids']!=['response-pass']:raise ValueError('396 start candidates')
  return {**base,**proof}
 if path=='probe-02-a-first':
  if (game['phase'],ctx['window_kind'],ctx['priority_actor'],ctx['consecutive_passes'])!=('turn_end_response','after_normal_action','B',1):raise ValueError('396 end response boundary')
  proof=response_audit.audit_end_response(row)
  if proof['candidate_ids']!=['response-pass']:raise ValueError('396 end candidates')
  return {**base,**proof,'next_opportunity':'turn_end_response'}
 raise ValueError('396 route')
ORIGINAL_CLASSIFY=end.classify_next_board
def classify_next_board_396(game,actor):
 board=game['players'][actor]['board'];ids=[game['cards'][x]['card_id'] for x in board['companions']]
 if actor!='B' or ids!=['C-bat','C-cat_friend','C-chicken'] or game['cards'][board['partner']]['card_id']!='P-cat_ceo':raise ValueError('396 next board')
 section=hand.source_section('72-companion-26-card-text-draft.md','C-cat_friend')
 if '自分のターンに、このカードをなかま枠から山札の一番下に置き' not in section or '自分のターン終了時' in section:raise ValueError('396 cat timing')
 projected=copy.deepcopy(game);projected['players'][actor]['board']['companions'].remove(board['companions'][1])
 result=ORIGINAL_CLASSIFY(projected,actor)
 result.append({'source_instance_id':board['companions'][1],'card_id':'C-cat_friend','trigger_kind':'activated_ability_not_turn_start','source_reference':'72-companion-26-card-text-draft.md#C-cat_friend'})
 return result
def run_route(row,proof):
 path=row['path_id']
 if path=='probe-01-a-first':
  if not proof['turn_end_set_complete'] or proof['contract_stop_codes']:raise ValueError('396 end proof')
  old=end.classify_next_board
  try:end.classify_next_board=classify_next_board_396;result=end.run_route(row,proof)
  finally:end.classify_next_board=old
  if [x['action_type'] for x in result['new_events']]!=['turn_end_completed','turn_start_and_egg_draw']:raise ValueError('396 end/draw')
  return result
 if path=='probe-01-b-first':
  if proof['source_instance_id']!='A-015#1':raise ValueError('396 active source')
  before=copy.deepcopy(row['final_continuation_state']);before.update(source_event_seq=row['last_valid_event_seq'],last_event_seq=row['last_valid_event_seq'],source_game_state_sha256=row['final_game_state_sha256'],continuation_state_sha256=row['final_continuation_state_sha256'])
  if start._hash(before)!=row['final_continuation_state_sha256']:raise ValueError('396 chain source hash')
  after,event=chicken.resolve_board_ability(before)
  return {'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'last_valid_event_seq':after['last_event_seq'],'final_game_state_sha256':start.opening._stop_state_sha256(after['game_state']),'final_continuation_state_sha256':after['continuation_state_sha256'],'final_continuation_state':start._payload(after),'stop_reason_code':'unproved_current_normal_action_candidates','new_decisions':[],'new_events':[event],'new_snapshots':[snapshots.snapshot(after)],'completed':False,'balance_sample_count':0}
 if path=='probe-02-b-first':return response_pass.run_route(row,proof)
 if path=='probe-02-a-first':
  selected={'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256'],'candidate_ids':proof['candidate_ids'],'selected_candidate':'response-pass','resolution_mode':'response_unique'}
  return end_pass.run_route(row,selected,proof)
 raise ValueError('396 route')
def validate(row,result):
 events=result['new_events'];shots=result['new_snapshots'];g=row['final_game_state_sha256'];c=row['final_continuation_state_sha256'];seq=row['last_valid_event_seq']
 if len(events)!=len(shots):raise ValueError('396 count')
 for event,shot in zip(events,shots):
  if event['seq']!=seq+1 or shot['event_seq']!=event['seq'] or event['game_state_before_sha256']!=g or event['continuation_state_before_sha256']!=c or event['game_state_after_sha256']!=shot['game_state_sha256'] or event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or start.opening._stop_state_sha256(shot['game_state'])!=shot['game_state_sha256'] or start.canonical_sha256(shot['continuation_state'])!=shot['continuation_state_sha256']:raise ValueError('396 hash chain')
  seq=event['seq'];g=shot['game_state_sha256'];c=shot['continuation_state_sha256']
 if (seq,g,c)!=(result['last_valid_event_seq'],result['final_game_state_sha256'],result['final_continuation_state_sha256']):raise ValueError('396 final hash')
def build_reports():
 rows=load_rows();proofs=[audit_route(r) for r in rows];results=[run_route(r,p) for r,p in zip(rows,proofs)]
 for r,v in zip(rows,results):validate(r,v)
 if sum(len(x['new_events']) for x in results)!=5:raise ValueError('396 event count')
 return ({'schema':'naotocchi.card_game.proxy_new_seed_mixed_audit_396.v1','source_raw_sha256':SOURCE_SHA,'planned':4,'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':proofs},{'schema':'naotocchi.card_game.proxy_new_seed_mixed_replay_396.v1','source_raw_sha256':SOURCE_SHA,'planned':4,'completed':0,'new_decisions':2,'new_events':5,'new_snapshots':5,'independent_balance_sample_count':0,'results':results})
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();a,r=build_reports()
 for path,value in ((AUDIT,a),(OUTPUT,r)):
  raw=canonical_bytes(value)
  if args.check:
   if path.read_bytes()!=raw:raise SystemExit('396 canonical mismatch '+str(path))
  else:path.write_bytes(raw)
 print('396: end/draw, chain resolution and two response passes verified')
if __name__=='__main__':main()
