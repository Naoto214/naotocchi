#!/usr/bin/env python3
"""Run the existing six-stage turn-end audit for all four current states."""

import argparse
import copy
import hashlib
import json
from contextlib import contextmanager
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_turn_end_history_162 as history
import proxy_new_seed_end_response_restart_161 as prior
import proxy_new_seed_turn_end_audit_149 as board
import proxy_turn_end_provenance_restart as precedent

ROOT=Path(__file__).resolve().parents[1]
SOURCE=history.OUTPUT
SOURCE_RAW_SHA256='8642f094b08a2370ffc7653de1201c4909f41e8f2e66faa5f4a2a1f9db8324b2'
OUTPUT=ROOT/'data/proxy-new-seed-turn-end-audit-163-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_turn_end_audit_163.v1'
PARTNER_TRIGGERS={
 'P-cliff_goat':'自分が名前の異なるセカイへ変更した時',
 'P-anglerfish':'自分のメインが自分からちょうせんする時',
}


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_source():
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or raw!=history.canonical_bytes(history.build_report()):
        raise ValueError('162 protected raw or replay differs')
    data=json.loads(raw)
    if data['schema']!=history.SCHEMA or any(history.validate_result(x) for x in data['results']):
        raise ValueError('162 historical proof differs')
    return data


@contextmanager
def current_board_scope():
    registry=board.turn_end.BOARD_REGISTRY
    before={key:registry.get(key) for key in PARTNER_TRIGGERS}
    try:
        text=(ROOT/'74-partner-18-card-text-draft.md').read_text()
        with board.board_timing_scope():
            for card,trigger in PARTNER_TRIGGERS.items():
                section=text.split(f'### {card} — ',1)[1].split('\n### ',1)[0]
                if trigger not in section or '発動できる' not in section:
                    raise ValueError('163 partner source text differs')
                classification=('event_trigger_not_turn_end',f'74-partner-18-card-text-draft.md#{card}')
                if before[card] is not None and before[card]!=classification:
                    raise ValueError('163 partner registry conflict')
                registry[card]=classification
            yield
    finally:
        for card,value in before.items():
            if value is None:registry.pop(card,None)
            else:registry[card]=value


def audit_route(proof):
    saved=prior.OUTPUT.read_bytes()
    if saved!=prior.canonical_bytes(prior.build_report()):
        raise ValueError('161 protected replay differs')
    matches=[x for x in json.loads(saved)['results'] if x['path_id']==proof['path_id']]
    if len(matches)!=1:raise ValueError('161 current path differs')
    row=matches[0]
    if (row['last_valid_event_seq'],row['final_game_state_sha256'],
            row['final_continuation_state_sha256'])!=(proof['source_last_valid_event_seq'],
            proof['source_game_state_sha256'],proof['source_continuation_state_sha256']):
        raise ValueError('161/162 state hash boundary differs')
    state=row['final_continuation_state'];game=state['game_state'];actor=game['turn_player']
    if game['phase']!='turn_end' or state['return_target']!='turn_end':
        raise ValueError('163 turn end boundary differs')
    stop={'path_id':row['path_id'],'last_valid_event_seq':row['last_valid_event_seq'],
          'game_state_sha256':row['final_game_state_sha256'],
          'continuation_state_sha256':row['final_continuation_state_sha256'],
          'game_state':game,'continuation_state':state}
    with current_board_scope():
        audit=precedent.audit_current_turn_end(stop,{**proof,'source_event_seq':proof['source_last_valid_event_seq']})
    if not audit['turn_end_set_complete'] or audit['contract_stop_codes'] or \
            not all(audit['completeness_checks'].values()) or game['round']!=1 or \
            any(p['growth']>=100 for p in game['players'].values()):
        raise ValueError('163 current turn-end six-stage proof incomplete')
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'turn_player':actor,'stage_inventory':copy.deepcopy(audit['stage_inventory']),
            'completeness_checks':audit['completeness_checks'],
            'contract_stop_codes':audit['contract_stop_codes'],
            'turn_end_set_complete':audit['turn_end_set_complete'],
            'new_events':0,'completed':False,'balance_sample_count':0}


def validate_result(row):
    try:
        proof=next(x for x in load_source()['results'] if x['path_id']==row['path_id'])
        return [] if row==audit_route(proof) else ['163 independent audit differs']
    except (ValueError,KeyError,TypeError,StopIteration) as e:return [str(e)]


def build_report():
    rows=[audit_route(x) for x in load_source()['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('163 turn-end audit differs')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,'planned':4,
            'completed':0,'new_events':0,'independent_balance_sample_count':0,'results':rows}


def main():
    p=argparse.ArgumentParser();p.add_argument('--check',action='store_true');args=p.parse_args()
    raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('163 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('163: 4 complete six-stage turn ends, 0 events')


if __name__=='__main__':main()
