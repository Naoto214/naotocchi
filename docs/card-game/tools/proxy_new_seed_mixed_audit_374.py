#!/usr/bin/env python3
"""Audit two responses and two normal actions at the immutable 348 boundary."""
import argparse
import copy
import hashlib
import json
import sys
from functools import lru_cache
from pathlib import Path

sys.setrecursionlimit(max(sys.getrecursionlimit(), 4000))
import proxy_new_seed_mixed_replay_373 as states
import proxy_new_seed_start_audit_206 as hand
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_start_response_138 as start
import proxy_new_seed_board_partner_audit_179 as normal
import proxy_new_seed_mixed_audit_337 as baseline_a
import proxy_new_seed_mixed_audit_291 as baseline_b
import proxy_new_seed_mixed_audit_294 as baseline_refs
import proxy_new_seed_turn_end_proof_203 as terminal_baseline
import proxy_new_seed_turn_end_audit_163 as board_end
import proxy_turn_end_provenance_restart as precedent

ROOT = Path(__file__).resolve().parents[1]
SOURCE_RAW_SHA256 = '62df4729d905f256e37c6373913b936b2744b5b8156eb2de7ede09256d11e70a'
OUTPUT = ROOT / 'data/proxy-new-seed-mixed-audit-374-20260929.json'
SCHEMA = 'naotocchi.card_game.proxy_new_seed_mixed_audit_374.v1'

def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()

@lru_cache(maxsize=1)
def load_source():
    raw = states.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest() != SOURCE_RAW_SHA256 or raw != states.canonical_bytes(states.build_report()):
        raise ValueError('374 protected 373 replay differs')
    rows = json.loads(raw)['results']
    if len(rows) != 4 or any(states.validate_result(x) for x in rows):
        raise ValueError('374 saved state/event inventory differs')
    return rows

import proxy_new_seed_mixed_audit_340 as eggs
import proxy_response_window_seeded_restart as resolver
def prove_end(row):
    path=row['path_id'];state=row['final_continuation_state']
    if state['game_state']['phase']!='turn_end' or state['return_target']!='turn_end' or state['activation_zone'] or state['pending_triggers']:
        raise ValueError('374 end boundary differs')
    baseline,first=(baseline_a,338) if path=='probe-02-a-first' else (baseline_b,292)
    old=next(x for x in json.loads(baseline.OUTPUT.read_bytes())['results'] if x['path_id']==path)
    if not old['turn_end_set_complete'] or old['contract_stop_codes']:
        raise ValueError('374 inherited end proof differs')
    seq=old['source_last_valid_event_seq'];game_hash=old['source_game_state_sha256']
    cont_hash=old['source_continuation_state_sha256']
    events,growth=copy.deepcopy(old['classified_events']),copy.deepcopy(old['growth_trace'])
    counts={}
    for number in range(first,374):
        files=list((ROOT/'data').glob(f'proxy-new-seed-*-{number}-*.json'))
        if len(files)!=1:raise ValueError(f'374 checkpoint inventory differs at {number}')
        saved=next(x for x in json.loads(files[0].read_bytes())['results'] if x['path_id']==path)
        new_events,shots=saved.get('new_events',[]) or [],saved.get('new_snapshots',[]) or []
        if len(new_events)!=len(shots):raise ValueError(f'374 event/snapshot count differs at {number}')
        counts[str(number)]=len(new_events)
        for event,shot in zip(new_events,shots):
            action=event['action_type']
            if (action not in baseline_refs.SOURCE_REFS or event['seq']!=seq+1 or
                shot['event_seq']!=event['seq'] or
                event['game_state_before_sha256']!=game_hash or
                event['continuation_state_before_sha256']!=cont_hash or
                event['game_state_after_sha256']!=shot['game_state_sha256'] or
                event['continuation_state_after_sha256']!=shot['continuation_state_sha256'] or
                start.opening._stop_state_sha256(shot['game_state'])!=shot['game_state_sha256'] or
                start.canonical_sha256(shot['continuation_state'])!=shot['continuation_state_sha256']):
                raise ValueError(f'374 history/hash differs at {number}')
            current={actor:shot['game_state']['players'][actor]['growth'] for actor in 'AB'}
            delta={actor:current[actor]-growth[-1]['growth'][actor] for actor in 'AB'}
            if any(delta.values()) or shot['continuation_state']['pending_triggers']:
                raise ValueError(f'374 unexpected growth/trigger at {number}')
            seq=event['seq'];game_hash=shot['game_state_sha256'];cont_hash=shot['continuation_state_sha256']
            events.append({'seq':seq,'action_type':action,'source_reference':baseline_refs.SOURCE_REFS[action],
                           'growth_delta':delta})
            growth.append({'event_seq':seq,'growth':current})
    if (seq,game_hash,cont_hash)!=(row['last_valid_event_seq'],row['final_game_state_sha256'],row['final_continuation_state_sha256']):
        raise ValueError('374 end history boundary differs')
    original=next(x for x in json.loads(terminal_baseline.OUTPUT.read_bytes())['results'] if x['path_id']==path)
    if not original['turn_end_set_complete'] or original['growth_reach_100'] or original['active_expiring_effects'] or original['unresolved_codes']:
        raise ValueError('374 terminal inherited constraints differ')
    stop={'path_id':path,'last_valid_event_seq':seq,'game_state_sha256':game_hash,
          'continuation_state_sha256':cont_hash,'game_state':state['game_state'],'continuation_state':state}
    proof={'classified_events':events,'growth_trace':growth,'growth_reach_100':original['growth_reach_100'],
           'active_expiring_effects':original['active_expiring_effects'],
           'unresolved_codes':original['unresolved_codes'],'source_event_seq':seq}
    section=hand.source_section('72-companion-26-card-text-draft.md','C-cat_friend')
    if ('自分のターンに、このカードをなかま枠から山札の一番下に置き' not in section or '自分のターン終了時' in section):
        raise ValueError('374 cat friend timing differs')
    registry=board_end.board.turn_end.BOARD_REGISTRY
    box=hand.source_section('72-companion-26-card-text-draft.md','C-box')
    if '> 能力なし。' not in box:
        raise ValueError('374 box source text differs')
    additions={'C-cat_friend':('activated_ability_not_turn_end','72-companion-26-card-text-draft.md#C-cat_friend'),
               'C-box':('no_ability','72-companion-26-card-text-draft.md#C-box')}
    previous={name:registry.get(name) for name in additions}
    if any(previous[name] is not None and previous[name]!=value for name,value in additions.items()):
        raise ValueError('374 board classification conflict')
    try:
        registry.update(additions)
        with board_end.current_board_scope():
            result=precedent.audit_current_turn_end(stop,proof)
    finally:
        for name,value in previous.items():
            if value is None:registry.pop(name,None)
            else:registry[name]=value
    if not result['turn_end_set_complete'] or result['contract_stop_codes'] or not all(result['completeness_checks'].values()):
        raise ValueError('374 six-stage end incomplete: '+repr(result['contract_stop_codes']))
    return {'next_opportunity':'turn_end','turn_end_set_complete':True,
            'stage_inventory':result['stage_inventory'],'completeness_checks':result['completeness_checks'],
            'contract_stop_codes':result['contract_stop_codes'],
            'classified_events':events,'growth_trace':growth,'event_counts_by_checkpoint':counts}

def audit_chain(row):
    state=row['final_continuation_state'];ctx=state['response_context'];zone=state['activation_zone'];game=state['game_state']
    if (row['path_id']!='probe-01-b-first' or game['phase']!='response_window' or
        ctx['window_kind']!='turn_start' or ctx['chain_status']!='resolving' or
        ctx['consecutive_passes']!=2 or len(zone)!=1 or
        ctx['chain_links']!=[zone[0]['link_id']] or state['pending_triggers'] or
        zone[0]['card_id']!='E-first-date' or zone[0]['action_type']!='use_event' or
        zone[0]['source_instance_id']!='A-040#1' or zone[0]['target_instance_ids']!=['A-017#1'] or
        zone[0]['payment']!={'time':1}):
        raise ValueError('374 first date resolving boundary differs')
    owner=game['players']['A'];target=owner['board']['partner']
    section=hand.source_section('91-event-21-card-text-draft.md','E-first-date')
    if (target!='A-017#1' or owner['board']['partner_stage']!=0 or not owner['deck'] or
        '対象が自分のこいびと枠にいて、その交際段階が0の場合、1枚引き、自分のそだち+5' not in section or
        '0→1には進めず' not in section or '反応中に対象が離れたら不成立' not in section or
        ('use_event','E-first-date') not in resolver.ACTION_HANDLERS):
        raise ValueError('374 first date target/text/handler differs')
    return {'next_opportunity':'chain_resolution','candidate_ids':[],
            'candidate_set_complete':True,'effect_preconditions_proved':True,
            'target_instance_id':target,'source_instance_id':zone[0]['source_instance_id'],
            'expected_drawn_instance_id':owner['deck'][0],
            'expected_growth_delta':5,'expected_relationship_stage':0,
            'source_reference':'91-event-21-card-text-draft.md#E-first-date'}
def audit_route(row):
 state=row['final_continuation_state']
 if (start.canonical_sha256(state)!=row['final_continuation_state_sha256'] or
     start.opening._stop_state_sha256(state['game_state'])!=row['final_game_state_sha256']):
  raise ValueError('374 source state/hash differs')
 base={'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
       'source_game_state_sha256':row['final_game_state_sha256'],
       'source_continuation_state_sha256':row['final_continuation_state_sha256'],
       'new_events':0,'completed':False,'balance_sample_count':0}
 if row['path_id']=='probe-01-a-first':return {**base,**eggs.audit_egg(row)}
 if row['path_id']=='probe-01-b-first':return {**base,**audit_chain(row)}
 if row['path_id'] in ('probe-02-a-first','probe-02-b-first'):return {**base,**prove_end(row)}
 raise ValueError('374 path differs')
def build_report():
 results=[audit_route(r) for r in load_source()]
 if len(results)!=4:raise ValueError('374 inventory differs')
 return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
         'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':results}
def main():
 p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');a=p.parse_args()
 raw=canonical_bytes(build_report())
 if a.check:
  if OUTPUT.read_bytes()!=raw:raise SystemExit('374 canonical bytes differ')
 else:OUTPUT.write_bytes(raw)
 print('374: egg, chain and two turn ends audited')
if __name__=='__main__':main()
