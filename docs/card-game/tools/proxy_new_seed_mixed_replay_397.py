#!/usr/bin/env python3
"""Audit and replay egg, normal, response and proven end at 396."""
import argparse,copy,hashlib,json,sys
from pathlib import Path
sys.setrecursionlimit(max(sys.getrecursionlimit(),4000))
import proxy_new_seed_mixed_replay_396 as source
import proxy_new_seed_mixed_audit_340 as eggs
import proxy_new_seed_mixed_audit_381 as normals
import proxy_new_seed_mixed_choice_325 as choice_normal
import proxy_new_seed_mixed_replay_290 as normal_replay
import proxy_new_seed_egg_replay_205 as egg_replay
import proxy_new_seed_mixed_replay_379 as response_pass
import proxy_new_seed_turn_end_replay_204 as end
import proxy_new_seed_mixed_replay_394 as board
import proxy_new_seed_mixed_audit_387 as baseline_a
import proxy_new_seed_mixed_audit_294 as baseline_refs
import proxy_new_seed_turn_end_proof_203 as terminal_baseline
import proxy_new_seed_turn_end_audit_163 as board_end
import proxy_turn_end_provenance_restart as precedent
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_start_response_138 as start
ROOT=Path(__file__).resolve().parents[1]
SOURCE_SHA='cc42ca786df73a506a2bb9d29e126fdd90a230c77990762d586fd2d25ee97268'
AUDIT=ROOT/'data/proxy-new-seed-mixed-audit-397-20260929.json'
OUTPUT=ROOT/'data/proxy-new-seed-mixed-replay-397-20260929.json'
def canonical_bytes(value):return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()
def load_rows():
 raw=source.OUTPUT.read_bytes()
 if hashlib.sha256(raw).hexdigest()!=SOURCE_SHA or raw!=source.canonical_bytes(source.build_reports()[1]):raise ValueError('397 source differs')
 rows=json.loads(raw)['results']
 if len(rows)!=4:raise ValueError('397 route count')
 return rows

def audit_response(row):
    state = row['final_continuation_state']
    game, ctx = state['game_state'], state['response_context']
    path, actor = row['path_id'], ctx['priority_actor']
    expected = {'probe-02-b-first': ('response_window','turn_start','A','B','empty',1,0)}
    if (path not in expected or
            (game['phase'], ctx['window_kind'], actor, ctx['turn_player'], ctx['chain_status'],
             ctx['consecutive_passes'], len(state['activation_zone'])) != expected[path] or
            state['pending_triggers']):
        raise ValueError('390 response boundary differs')
    owner = game['players'][actor]
    board = owner['board']
    if path=='probe-01-a-first':
        zone=state['activation_zone']
        if (len(zone)!=1 or zone[0]['source_instance_id']!='A-015#1' or zone[0]['card_id']!='C-chicken' or zone[0]['source_zone']!='board' or ctx['chain_links']!=[zone[0]['link_id']]):
            raise ValueError('390 active chicken link differs')
    projected = copy.deepcopy(state)
    entries = start.load_candidate_rows()
    removed = []
    for instance in owner['hand']:
        card_id = game['cards'][instance]['card_id']
        entry = entries.get(card_id)
        if entry is None:
            raise ValueError('390 unregistered hand card')
        exclusion = hand.extra_hand_exclusion(card_id, entry, game, actor)
        if exclusion is None and card_id == 'E-boss':
            section = hand.source_section('91-event-21-card-text-draft.md', card_id)
            if (actor == game['turn_player'] or board['main'] is not None or
                    'このターン、自分のメインが勝負に負けていた場合に発動できる' not in section):
                raise ValueError('390 boss opponent-turn condition differs')
            exclusion = {'card_id':card_id,'reason_code':'requires_own_main_battle_loss_this_turn',
                         'source_reference':'91-event-21-card-text-draft.md#E-boss'}
        if exclusion is None and card_id == 'E-boss':
            section=hand.source_section('91-event-21-card-text-draft.md',card_id)
            if (actor==game['turn_player'] or board['main'] is not None or
                    'このターン、自分のメインが勝負に負けていた場合に発動できる' not in section):
                raise ValueError('390 boss condition differs')
            exclusion={'card_id':card_id,'reason_code':'requires_own_main_battle_loss_this_turn',
                       'source_reference':'91-event-21-card-text-draft.md#E-boss'}
        if exclusion is None and card_id == 'G-animal-shogi':
            section = hand.source_section('83-play-batch-3-card-text-draft.md', card_id)
            if ('自分の捨て札のなかま1枚を対象' not in section or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('390 animal shogi target differs')
            exclusion = {'card_id':card_id,'reason_code':'requires_own_discarded_companion'}
        action = next((x for x in entry['actions'] if x['action_type'] in ('use_play','use_item','use_event')), None)
        if exclusion is None and action is not None and owner['time'] >= action['base_time_cost']:
            exclusion = conditional.conditional_exclusion(card_id, game, actor)
        if exclusion is None and action is not None and action['target_rule'] == 'one own main':
            filename, section_id = action['source_text_reference'].split('#', 1)
            if section_id != card_id or '自分のメイン1枚を対象' not in hand.source_section(filename, section_id):
                raise ValueError('390 own main target text differs')
            exclusion = {'card_id':card_id,'reason_code':'requires_own_main_target'}
        if exclusion:
            projected['game_state']['players'][actor]['hand'].remove(instance)
            removed.append({'source_instance_id':instance, **exclusion})
    excluded = []
    for instance in board['companions']:
        card_id = game['cards'][instance]['card_id']
        section = hand.source_section('72-companion-26-card-text-draft.md', card_id)
        if card_id == 'C-cat_friend':
            if ('自分の捨て札の「きまぐれなねこ」以外のなかまカード1枚を対象' not in section or
                    any(game['cards'][x]['card_id'].startswith('C-') for x in owner['discard'])):
                raise ValueError('390 cat friend target differs')
            reason = 'requires_other_discarded_companion'
        elif card_id == 'C-box':
            if '能力なし。' not in section:
                raise ValueError('390 box text differs')
            reason = 'no_ability'
        elif path=='probe-01-a-first' and card_id=='C-chicken':
            trigger=timing.TRIGGERS.get(card_id)
            if trigger is None or any(fragment not in section for fragment in trigger[1:]) or instance!='A-015#1':raise ValueError('390 active chicken source differs')
            reason='ability_already_active_this_turn'
        elif card_id in ('C-bat','C-chicken'):
            trigger = timing.TRIGGERS.get(card_id)
            if trigger is None or any(fragment not in section for fragment in trigger[1:]):
                raise ValueError('390 board trigger text differs')
            if timing.matches(card_id,ctx['window_kind'],actor,ctx['turn_player'],
                              row['new_events'][0]['action_type'],row['new_events'][0]['actor']):
                raise ValueError('390 board trigger unexpectedly met')
            reason = 'trigger_condition_not_met'
        else:
            raise ValueError('390 unclassified companion')
        projected['game_state']['players'][actor]['board']['companions'].remove(instance)
        excluded.append({'source_instance_id':instance,'card_id':card_id,'reason_code':reason})
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
            raise ValueError('390 partner response timing differs')
        projected['game_state']['players'][actor]['board']['partner'] = None
        projected['game_state']['players'][actor]['board']['partner_stage'] = None
        excluded.append({'source_instance_id':partner,'card_id':card_id,'reason_code':reason})
    projected['game_state']['phase'] = 'response_window'
    projected['response_context']['phase'] = 'response_window'
    projected['response_context']['window_kind'] = 'turn_start'
    chance = start.enumerate_opportunity(projected,actor,entries)
    ids = chance['legal_candidate_ids']
    if ids != ['response-pass'] or not chance['candidate_set_complete']:
        raise ValueError('390 response candidates require further proof: ' + repr(ids))
    return {'next_opportunity':game['phase'],'candidate_ids':ids,'candidate_set_complete':True,
            'hand_exclusions':removed,'hand_other_exclusions':chance['excluded_candidates'],
            'board_exclusions':excluded}

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
    for number in range(first,397):
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
 path=row['path_id'];state=row['final_continuation_state']
 if start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or start.opening._stop_state_sha256(state['game_state'])!=row['final_game_state_sha256']:raise ValueError('397 source hashes')
 base={'path_id':path,'source_last_valid_event_seq':row['last_valid_event_seq'],'source_game_state_sha256':row['final_game_state_sha256'],'source_continuation_state_sha256':row['final_continuation_state_sha256']}
 if path=='probe-01-a-first':return {**base,**eggs.audit_egg(row)}
 if path=='probe-01-b-first':
  projected=copy.deepcopy(row);projected['path_id']='probe-02-a-first';proof=normals.audit_route(projected)
  if proof['candidate_ids']!=['candidate-place_world-A-021#1','candidate-set_item-A-034#1','pass'] or not all(proof['completeness_checks'].values()):raise ValueError('397 normal inventory')
  return {**base,**{k:proof[k] for k in ('next_opportunity','candidate_ids','candidate_set_complete','legal_candidate_details','completeness_checks','board_exclusions')}}
 if path=='probe-02-b-first':return {**base,**audit_response(row)}
 if path=='probe-02-a-first':return {**base,**prove_end(row)}
 raise ValueError('397 route')
def run_route(row,proof):
 path=row['path_id']
 if path=='probe-01-a-first':return egg_replay.run_route(row)
 if path=='probe-01-b-first':return normal_replay.run_route(row,choice_normal.choose(row,proof),proof)
 if path=='probe-02-b-first':return response_pass.run_route(row,proof)
 if path=='probe-02-a-first':
  if not proof['turn_end_set_complete'] or proof['contract_stop_codes']:raise ValueError('397 end proof')
  old=end.classify_next_board
  try:end.classify_next_board=board.classify_next_board_394;result=end.run_route(row,proof)
  finally:end.classify_next_board=old
  if [e['action_type'] for e in result['new_events']]!=['turn_end_completed','turn_start_and_egg_draw']:raise ValueError('397 end/draw')
  return result
 raise ValueError('397 route')
def validate(row,result):
 events=result['new_events'];shots=result['new_snapshots'];g=row['final_game_state_sha256'];c=row['final_continuation_state_sha256'];seq=row['last_valid_event_seq']
 if len(events)!=len(shots):raise ValueError('397 count')
 for event,shot in zip(events,shots):
  if event['seq']!=seq+1 or shot['event_seq']!=event['seq'] or event['game_state_before_sha256']!=g or event['continuation_state_before_sha256']!=c or event['game_state_after_sha256']!=shot['game_state_sha256'] or event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or start.opening._stop_state_sha256(shot['game_state'])!=shot['game_state_sha256'] or start.canonical_sha256(shot['continuation_state'])!=shot['continuation_state_sha256']:raise ValueError('397 hash chain')
  seq=event['seq'];g=shot['game_state_sha256'];c=shot['continuation_state_sha256']
 if (seq,g,c)!=(result['last_valid_event_seq'],result['final_game_state_sha256'],result['final_continuation_state_sha256']):raise ValueError('397 final hash')
def build_reports():
 rows=load_rows();proofs=[audit_route(r) for r in rows];results=[run_route(r,p) for r,p in zip(rows,proofs)]
 for r,v in zip(rows,results):validate(r,v)
 if sum(len(x['new_events']) for x in results)!=5:raise ValueError('397 event count')
 return ({'schema':'naotocchi.card_game.proxy_new_seed_mixed_audit_397.v1','source_raw_sha256':SOURCE_SHA,'planned':4,'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':proofs},{'schema':'naotocchi.card_game.proxy_new_seed_mixed_replay_397.v1','source_raw_sha256':SOURCE_SHA,'planned':4,'completed':0,'new_decisions':3,'new_events':5,'new_snapshots':5,'independent_balance_sample_count':0,'results':results})
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args();a,r=build_reports()
 for path,value in ((AUDIT,a),(OUTPUT,r)):
  raw=canonical_bytes(value)
  if args.check:
   if path.read_bytes()!=raw:raise SystemExit('397 canonical mismatch '+str(path))
  else:path.write_bytes(raw)
 print('397: egg, normal, response and end/draw verified')
if __name__=='__main__':main()
