"""Public100 maintenance history, conditional on authentic input transitions.

This does not finish a turn, select an action, or authorize an early victory.
All six end stages, source execution, and full history remain separate proofs.
"""
import copy,hashlib
from proxy_mandatory_policy_contract import ROOT,canonical
from proxy_normal_decision_seeded_restart import _stop_state_sha256 as game_hash

SOURCES = {'01-core-rules.md': 'd95ee407ec1fb853a8da1102bf933a5e972e3bc6ecc0b78cfb20831e8c45ec71', '06-action-chain-checkpoint.md': '7ac6d6141095d1139b8a8e072bc1523d621b7f100a57e292c08bbc97a7618c67', '64-turn-boundaries-and-victory-timing.md': '00f9845b5b79774c48bac002e26f6b08096563a4bf1611f408aed0e2c9089a64'}


def _game(g):
    if set(g['players'])!={'A','B'} or g['turn_player'] not in ('A','B') or type(g['round']) is not int or not 1<=g['round']<=10:
        raise ValueError('victory turn context differs')
    if any(type(p['growth']) is not int or not 0<=p['growth']<=100 or p['growth']%5 for p in g['players'].values()):
        raise ValueError('growth outside canonical01 range')


def create(game,event_seq,first_player):
    _game(game)
    if type(event_seq) is not int or event_seq<0 or first_player not in ('A','B'):
        raise ValueError('victory history root differs')
    if any(p['growth']==100 for p in game['players'].values()):
        raise ValueError('initial100 maintenance history is unknown')
    for path,digest in SOURCES.items():
        if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=digest:raise ValueError('victory source changed')
    return dict(schema='public100_maintenance_history.v1',source_sha256=copy.deepcopy(SOURCES),first_player=first_player,
        last_event_seq=event_seq,current_game_sha256=game_hash(game),round=game['round'],turn_player=game['turn_player'],
        turn_ordinal=0,maintenance={'A':None,'B':None},history_authenticated=False,balance_admitted=None)


def observe(record,before,after,event):
    _game(before);_game(after)
    if type(event.get('seq')) is not int or event['seq']!=record['last_event_seq']+1 or record['current_game_sha256']!=game_hash(before) or event.get('game_state_before_sha256')!=game_hash(before) or event.get('game_state_after_sha256')!=game_hash(after):
        raise ValueError('victory history event/hash discontinuity')
    if (before['round'],before['turn_player'])!=(record['round'],record['turn_player']):raise ValueError('victory history turn binding differs')
    out=copy.deepcopy(record);changed=(before['round'],before['turn_player'])!=(after['round'],after['turn_player'])
    if changed:
        other='B' if before['turn_player']=='A' else 'A'
        round_number=before['round']+(before['turn_player']!=record['first_player'])
        if event['action_type']!='turn_end_completed' or after['phase']!='turn_start' or (after['round'],after['turn_player'])!=(round_number,other):raise ValueError('actual next-turn boundary differs')
        if any(before['players'][a]['growth']!=after['players'][a]['growth'] for a in 'AB'):raise ValueError('turn opening cannot bundle unobserved growth changes')
        out['turn_ordinal']+=1
        for actor,row in out['maintenance'].items():
            if row is not None and row['opponent_turn_start_event_seq'] is None and actor!=after['turn_player']:
                row.update(opponent_turn_start_event_seq=event['seq'],opponent_turn_ordinal=out['turn_ordinal'])
    for actor in 'AB':
        prior=before['players'][actor]['growth'];now=after['players'][actor]['growth']
        if now<100:out['maintenance'][actor]=None
        elif prior<100:
            out['maintenance'][actor]=dict(reached_event_seq=event['seq'],opponent_turn_start_event_seq=None,opponent_turn_ordinal=None)
        elif out['maintenance'][actor] is None:raise ValueError('100 maintenance lacks a reaching event')
    out.update(last_event_seq=event['seq'],current_game_sha256=game_hash(after),round=after['round'],turn_player=after['turn_player'])
    return out


def assess_end(record,game):
    _game(game)
    if game_hash(game)!=record['current_game_sha256'] or game['phase']!='turn_end':raise ValueError('victory assessment state differs')
    candidates=[]
    if game['round']<10:
        for actor,row in record['maintenance'].items():
            if row is not None and actor!=game['turn_player'] and row['opponent_turn_ordinal']==record['turn_ordinal'] and game['players'][actor]['growth']==100:
                candidates.append(actor)
    return dict(early_winner_candidates=candidates,history_authenticated=False,end_processing_complete=False,
                strategic_proof=False,policy_eligible=None,balance_admitted=None,ready_for_execution=False)


def audit(record,initial_game,event_seq,first_player,transitions):
    try:
        expected=create(initial_game,event_seq,first_player)
        for row in transitions:expected=observe(expected,row['before'],row['after'],row['event'])
        return [] if canonical(expected)==canonical(record) else ['public100 history reconstruction differs']
    except (ValueError,KeyError,TypeError):return ['invalid public100 history']
