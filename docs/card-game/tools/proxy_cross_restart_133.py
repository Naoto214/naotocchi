#!/usr/bin/env python3
"""Checkpoint 133: independent prepared setup, end trigger and R10 contracts."""
from __future__ import annotations

import copy
import hashlib
import json
from contextlib import contextmanager
from pathlib import Path

import proxy_board_active_132 as prior

DATA=prior.DATA
SOURCE_FOLDER=prior.STOP_FOLDER
SOURCE_SHA={
 'order-01-a-first':'252394f19656f535f424261a1237f85b07c6c31519b1d42ba4965cfe3ef243c5',
 'order-01-b-first':'1f9250d930bdeaa02a0157fc76c687d07c063e51d20d26b4fee378620086548b',
 'order-02-a-first':'22cc2bfbf3e2f2b123b9aa1ef8ef924ae425ad8a2a7e5cca48cff97afedb0960',
 'order-02-b-first':'1200ac21f7b36fe1b179977bb44b11e640a782bd989d44c86e880fbf77a19884',
}
SCORPION={'kind':'triggered','source_text_reference':'74-partner-18-card-text-draft.md#P-desert_scorpion',
          'placement_action':'place_partner','placement_growth_delta':0,'placement_duration':'none'}
PLAN_FILE='proxy-cross-restart-plan-133-20260923.json'
EVALUATION_FILE='proxy-cross-restart-evaluation-133-20260923.json'
STOP_FOLDER='proxy-cross-restart-stops-133'


def load_sources(data_dir: Path=DATA) -> dict:
    earlier=prior.load_sources(data_dir)
    if prior.check_outputs(data_dir,earlier):raise ValueError('132 canonical outputs differ')
    stops={}
    for path,sha in SOURCE_SHA.items():
        raw=(data_dir/SOURCE_FOLDER/f'stop-132-{path}.json').read_bytes()
        if hashlib.sha256(raw).hexdigest()!=sha:raise ValueError('132 protected raw SHA differs')
        stop=json.loads(raw)
        if stop['path_id']!=path or stop['last_valid_event_seq']!=stop['events'][-1]['seq'] or \
           prior.response_120.game_state_sha256(stop['final_state']['game_state'])!=stop['game_state_sha256'] or \
           prior.response_120.continuation_state_sha256(prior.response_120._continuation_payload(stop['final_state']))!=stop['continuation_state_sha256']:
            raise ValueError('132 protected state/hash/event differs')
        stops[path]=stop
    return {'stops':stops,'candidate_table':earlier['candidate_table'],
            'source_131':earlier['source_131'],'source_132':earlier}


def prove_prepared_setup(item: dict, state: dict, table: dict) -> int:
    """Classify paid face-down placement without scoring an untriggered response."""
    action=item['action_type'];source=item['source_instance_id'];actor=state['turn_player']
    row=next((x for x in table['cards'] if x['card_id']==state['cards'][source]['card_id']),None)
    template=next((x for x in row['actions'] if x['action_type']==action),None) if row else None
    if action!='set_item' or source not in state['players'][actor]['hand'] or \
       item['card_id']!=state['cards'][source]['card_id'] or not template or \
       template['timing']!='normal_action_opportunity' or \
       template['candidate_variants']!=['set_face_down'] or \
       not isinstance(template['base_time_cost'],int) or template['base_time_cost']<=0 or \
       item['target_instance_ids'] or state['players'][actor]['time']<template['base_time_cost']:
        raise ValueError('unproved prepared placement')
    reference=template['source_text_reference'];filename,separator,anchor=reference.partition('#')
    source_path=DATA.parent/filename
    if not separator or anchor!=item['card_id'] or not source_path.is_file():
        raise ValueError('prepared setup source reference differs')
    section=source_path.read_text().split(f'### {anchor} ',1)
    if len(section)!=2 or '使用方法: しかける' not in section[1].split('\n### ',1)[0] or \
       '配置自体は原則カードの発動ではない' not in (DATA.parent/'06-action-chain-checkpoint.md').read_text():
        raise ValueError('prepared setup source text differs')
    return template['base_time_cost']


def classify_end_trigger(card_id: str, table: dict) -> dict:
    if card_id!='P-desert_scorpion':raise ValueError('unclassified end trigger')
    body=(DATA.parent/'74-partner-18-card-text-draft.md').read_text()
    section=body.split('### P-desert_scorpion —',1)[1].split('\n### ',1)[0]
    if not all(text in section for text in ('1ターンに1回','自分のターン終了時',
        '「あそび」と「あいてむ」','表向きでプレイ','1枚引く')):
        raise ValueError('end trigger source changed')
    row=next(x for x in table['cards'] if x['card_id']==card_id)
    if row['card_type']!='partner' or any(x['action_type']!='place_partner' for x in row['actions']):
        raise ValueError('end trigger normal-action template changed')
    return copy.deepcopy(SCORPION)


def final_round_result(game: dict, first: str) -> dict | None:
    if first not in ('A','B') or game['round']!=10 or game['phase']!='turn_end':
        raise ValueError('invalid final round boundary')
    if game['turn_player']==first:return None
    if game['turn_player'] not in ('A','B'):raise ValueError('invalid actor')
    scores={player:game['players'][player]['growth'] for player in ('A','B')}
    if any(not isinstance(x,int) or x<0 or x>100 for x in scores.values()):
        raise ValueError('unproved growth score')
    return {'winner':max(scores,key=scores.get) if scores['A']!=scores['B'] else None,
            'result':'winner' if scores['A']!=scores['B'] else 'draw'}


def _first(path: str) -> str:
    plan=prior.current_126.restart_124.load_sources()['plan_117']
    return prior.current_126.restart_124._find_route(plan,path)['first_player']


def _no_due_scorpion(current: dict, events: list) -> bool:
    game=current['game_state'];actor=game['turn_player']
    source=game['players'][actor]['board']['partner']
    if source is None or game['cards'][source]['card_id']!='P-desert_scorpion':return True
    starts=[e['seq'] for e in events if e['actor']==actor and e['action_type'] in
            ('turn_start_and_egg_draw','turn_start_and_draw')]
    if not starts:raise ValueError('missing turn start history')
    played=[e for e in events if e['seq']>max(starts) and e['actor']==actor and
            e['action_type'] in ('use_play','use_item','attach_item','set_item')]
    return not (any(e['action_type']=='use_play' for e in played) and
                any(e['action_type'] in ('use_item','attach_item') for e in played))


@contextmanager
def replay_contracts(inputs: dict):
    board=prior.extension_128.BOARD_CLASSIFICATION;old_board=board.get('P-desert_scorpion')
    old_cost=prior.prior_131._paid_cost;old_audit=prior.audit_turn_end_from_history
    old_sha=prior.SOURCE_SHA
    if old_board is not None and old_board!=SCORPION:raise ValueError('board classification conflict')
    classify_end_trigger('P-desert_scorpion',inputs['candidate_table'])
    def cost(item,game,owner,table):
        if item['action_type']=='set_item':return prove_prepared_setup(item,game,table),None
        return old_cost(item,game,owner,table)
    def audit(path,source,earlier,current,events,snapshots):
        older=inputs['source_132']['stops'][path]
        if older['snapshots'][-1]!=source['snapshots'][0]:raise ValueError('131/132 boundary differs')
        joined=older['events']+source['events']+events
        if not _no_due_scorpion(current,joined):
            raise prior.restart_122.RulesStop('incomplete_turn_end_sources',
                {'contract_stop_codes':['unresolved_end_trigger']})
        proof=old_audit(path,older,earlier,current,source['events']+events,source['snapshots']+snapshots[1:])
        game=current['game_state']
        if game['round']==10 and proof['contract_stop_codes']==[]:
            flags=proof['completeness_checks']
            if not all(value for name,value in flags.items() if name not in
                       ('victory_history_sufficient','transition_handlers_proven')):return proof
            history=proof['provenance_evidence']
            if history['unresolved_codes'] or not history['growth_trace'] or \
               history['growth_trace'][-1]['event_seq']!=current['last_event_seq'] or \
               any(value>=100 for row in history['growth_trace'] for value in row['growth'].values()):
                return proof
            flags['victory_history_sufficient']=True
            if final_round_result(game,_first(path)) is None:flags['transition_handlers_proven']=True
            proof['turn_end_set_complete']=all(flags.values())
        return proof
    try:
        board['P-desert_scorpion']=copy.deepcopy(SCORPION)
        prior.prior_131._paid_cost=cost;prior.audit_turn_end_from_history=audit;prior.SOURCE_SHA=SOURCE_SHA
        yield
    finally:
        if old_board is None:board.pop('P-desert_scorpion',None)
        else:board['P-desert_scorpion']=old_board
        prior.prior_131._paid_cost=old_cost;prior.audit_turn_end_from_history=old_audit;prior.SOURCE_SHA=old_sha


def run_route(path: str, inputs: dict) -> dict:
    with replay_contracts(inputs):outcome=prior.run_route(path,inputs)
    game=outcome['final_state']['game_state']
    if game['round']!=10 or game['phase']!='turn_end' or game['turn_player']==_first(path) or \
       outcome['reason']['code']!='incomplete_turn_end_sources':return outcome
    result=final_round_result(game,_first(path));proof=outcome['audits'][-1]
    if proof['contract_stop_codes'] or not all(v for name,v in proof['completeness_checks'].items()
                                            if name!='transition_handlers_proven') or \
       not _no_due_scorpion(outcome['final_state'],inputs['source_132']['stops'][path]['events']+outcome['events']):
        return outcome
    current=outcome['final_state'];after=copy.deepcopy(current)
    after['game_state']['phase']='completed';after['return_target']=None
    generated=[];snapshots=[]
    prior.current_126.restart_124._append_transition(current,after,generated,snapshots,
                                                       'final_round_completed',game['turn_player'])
    prior.extension_125._verify_extended_step(current,after,generated)
    outcome['events'].extend({k:copy.deepcopy(v) for k,v in e.items() if k!='_snapshot_after'} for e in generated)
    outcome['snapshots'].extend({'seq':e['seq'],'game_state_sha256':e['game_state_after_sha256'],
                                'continuation_state_sha256':e['continuation_state_after_sha256']} for e in generated)
    outcome.update(status='completed',reason=None,final_state=after,last_valid_event_seq=after['last_event_seq'],
                   game_state_sha256=prior.response_120.game_state_sha256(after['game_state']),
                   continuation_state_sha256=after['continuation_state_sha256'],winner=result['winner'],
                   result=result['result'],counts_as_independent_balance_sample=False)
    return outcome


def run_all(inputs: dict) -> dict:
    return {path:run_route(path,inputs) for path in SOURCE_SHA}


def expected_outputs(inputs: dict | None=None) -> dict[str,bytes]:
    inputs=inputs if inputs is not None else load_sources();outcomes=run_all(inputs)
    routes=[{'path_id':path,'source_stop_sha256':SOURCE_SHA[path],
             'game_state_sha256':row['game_state_sha256'],
             'continuation_state_sha256':row['continuation_state_sha256'],
             'last_valid_event_seq':row['last_valid_event_seq'],
             'status':row['status'],'reason':row['reason'],'winner':row['winner'],
             'decision_count':len(row['decisions']),'event_count':len(row['events']),
             'snapshot_count':len(row['snapshots']),
             'file':f'{STOP_FOLDER}/stop-133-{path}.json'} for path,row in outcomes.items()]
    plan={'schema':'naotocchi.card_game.proxy_cross_restart_plan.v1','checkpoint':133,
          'source_stop_raw_sha256':SOURCE_SHA,'routes':routes}
    evaluation={'schema':'naotocchi.card_game.proxy_cross_restart_evaluation.v1','checkpoint':133,
                'planned':4,'completed':sum(x['status']=='completed' for x in routes),
                'rules_stop':sum(x['status']=='stopped_rules_adjudication' for x in routes),
                'decision':sum(x['decision_count'] for x in routes),
                'event':sum(x['event_count'] for x in routes),
                'snapshot':sum(x['snapshot_count'] for x in routes),
                'independent_balance_sample':0}
    canonical=prior.canonical_bytes
    return {PLAN_FILE:canonical(plan),EVALUATION_FILE:canonical(evaluation),
            **{f'{STOP_FOLDER}/stop-133-{path}.json':canonical(outcome)
               for path,outcome in outcomes.items()}}


def write_outputs(data_dir: Path=DATA,inputs: dict | None=None):
    for name,raw in expected_outputs(inputs).items():
        target=data_dir/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)


def check_outputs(data_dir: Path=DATA,inputs: dict | None=None) -> list[str]:
    return [f'canonical bytes differ: {name}' for name,raw in expected_outputs(inputs).items()
            if not (data_dir/name).is_file() or (data_dir/name).read_bytes()!=raw]


if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();group=parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--write',action='store_true');group.add_argument('--check',action='store_true')
    args=parser.parse_args()
    if args.write:write_outputs()
    else:
        errors=check_outputs()
        if errors:parser.exit(1,'\n'.join(errors)+'\n')
