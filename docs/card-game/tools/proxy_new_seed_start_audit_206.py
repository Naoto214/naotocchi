#!/usr/bin/env python3
"""Enumerate reached start response candidates across hand, board and triggers."""

import argparse
import copy
import hashlib
import json
from functools import lru_cache
from pathlib import Path

import proxy_new_seed_egg_replay_205 as states
import proxy_new_seed_turn_end_replay_204 as previous
import proxy_new_seed_start_audit_166 as conditional
import proxy_board_trigger_audit_144 as timing
import proxy_new_seed_turn_end_audit_163 as board
import proxy_board_ability_id_167 as identifiers
import proxy_start_response_138 as start

ROOT=Path(__file__).resolve().parents[1]
SOURCE=states.OUTPUT
SOURCE_RAW_SHA256='cfc016455e5968b7a98b652fd3bdcd96b614f786505594aa2554f19d03953022'
OUTPUT=ROOT/'data/proxy-new-seed-start-audit-206-20260925.json'
SCHEMA='naotocchi.card_game.proxy_new_seed_start_audit_206.v1'


def canonical_bytes(value):
    return (json.dumps(value,ensure_ascii=False,sort_keys=True,indent=2)+'\n').encode()


@lru_cache(maxsize=1)
def load_sources():
    raw=SOURCE.read_bytes();old=previous.OUTPUT.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SOURCE_RAW_SHA256 or \
            hashlib.sha256(old).hexdigest()!=states.SOURCE_RAW_SHA256 or \
            raw!=states.canonical_bytes(states.build_report()):
        raise ValueError('206 protected egg/board raw differs')
    current=json.loads(raw);before=json.loads(old)
    if current['schema']!=states.SCHEMA or before['schema']!=previous.SCHEMA or \
            len(current['results'])!=4 or len(before['results'])!=4 or \
            any(states.validate_result(x) for x in current['results']):
        raise ValueError('206 start source inventory differs')
    return current,before


def source_section(filename,card_id):
    return (ROOT/filename).read_text().split(f'### {card_id} — ',1)[1].split('\n### ',1)[0]


def extra_hand_exclusion(card_id,entry,game,actor):
    actions=entry['actions'];owner=game['players'][actor]
    if len(actions)>1:
        hand=[a for a in actions if not a.get('prerequisites','').startswith('prepared;')]
        prepared=[a for a in actions if a.get('prerequisites','').startswith('prepared;')]
        if len(hand)!=1 or len(prepared)!=1 or \
                hand[0]['action_type']!='set_item' or \
                prepared[0]['action_type']!='trigger_prepared_item' or \
                owner['board']['prepared']:
            raise ValueError('206 hand/prepared source zone ambiguous')
        if 'しかける' not in source_section('77-current-items-card-text-draft.md',card_id):
            raise ValueError('206 prepared-only trigger source text differs')
        return {'card_id':card_id,'reason_code':'not_hand_quick_use',
                'source_reference':hand[0]['source_text_reference']}
    if card_id=='E-big-illness':
        text=source_section('91-event-21-card-text-draft.md',card_id)
        opponent='B' if actor=='A' else 'A'
        if '相手のメイン1枚を対象として' not in text or \
                game['players'][opponent]['board']['main'] is not None:
            raise ValueError('206 opponent main target requires distinct proof')
        return {'card_id':card_id,'reason_code':'no_opponent_main_target',
                'source_reference':'91-event-21-card-text-draft.md#'+card_id}
    if card_id=='G-area-claim':
        text=source_section('85-play-batch-4-card-text-draft.md',card_id)
        b=owner['board'];count=(len(b['companions'])+len(b['prepared'])+
            sum(b[key] is not None for key in ('main','partner','world')))
        if 'たまごを除く自分の場のカードが7枚以上' not in text or count>=7:
            raise ValueError('206 board count requires distinct proof')
        return {'card_id':card_id,'reason_code':'fewer_than_seven_non_egg_board_cards',
                'source_reference':'85-play-batch-4-card-text-draft.md#'+card_id}
    return None


def audit_route(row,old):
    state=copy.deepcopy(row['final_continuation_state']);game=state['game_state'];ctx=state['response_context']
    actor=ctx['priority_actor'];owner=game['players'][actor];on_board=owner['board']
    if old['path_id']!=row['path_id'] or \
            game['phase']!='response_window' or ctx['window_kind']!='turn_start' or \
            ctx['turn_player']!=actor or ctx['origin_event_seq']!=row['last_valid_event_seq'] or \
            row['new_events'][0]['action_type']!='egg_exchange_bottom' or \
            state['activation_zone'] or state['pending_triggers'] or \
            on_board['main'] is not None or on_board['world'] is not None or on_board['prepared'] or \
            on_board!=old['final_continuation_state']['game_state']['players'][actor]['board']:
        raise ValueError('206 start response board/source boundary differs')
    projected=copy.deepcopy(state);removed=[];board_excluded=[];board_legal=[]
    entries=start.load_candidate_rows()
    for instance in owner['hand']:
        card_id=game['cards'][instance]['card_id'];entry=entries.get(card_id)
        if entry is None:raise ValueError('206 missing hand registration')
        exclusion=extra_hand_exclusion(card_id,entry,game,actor)
        if exclusion is None:
            action=next((a for a in entry['actions'] if a['action_type'] in
                         ('use_play','use_item','use_event')),None)
            if action is not None and owner['time']>=action['base_time_cost']:
                exclusion=conditional.conditional_exclusion(card_id,game,actor)
        if exclusion is not None:
            removed.append({'source_instance_id':instance,**exclusion})
            projected['game_state']['players'][actor]['hand'].remove(instance)
    for instance in on_board['companions']:
        card_id=game['cards'][instance]['card_id']
        if card_id not in timing.TRIGGERS or \
                any(fragment not in source_section('72-companion-26-card-text-draft.md',card_id)
                    for fragment in timing.TRIGGERS[card_id][1:]):
            raise ValueError('206 board companion timing unclassified')
        if timing.matches(card_id,'turn_start',actor,actor,'turn_start',actor):
            board_legal.append({'candidate_family':'triggered_ability','card_id':card_id,
                                'source_instance_id':instance,
                                'source_reference':'72-companion-26-card-text-draft.md#'+card_id})
        else:board_excluded.append({'source_instance_id':instance,'card_id':card_id,
                                    'reason_code':'trigger_condition_not_met'})
    projected['game_state']['players'][actor]['board']['companions']=[]
    partner=on_board['partner']
    if partner is not None:
        card_id=game['cards'][partner]['card_id']
        section=source_section('74-partner-18-card-text-draft.md',card_id)
        if card_id in board.PARTNER_TRIGGERS:
            if board.PARTNER_TRIGGERS[card_id] not in section or '発動できる' not in section:
                raise ValueError('206 partner event trigger text differs')
        elif 'このこいびとと交際を始めた時、発動する' not in section:
            raise ValueError('206 partner start timing unclassified')
        board_excluded.append({'source_instance_id':partner,'card_id':card_id,
                               'reason_code':'trigger_condition_not_met'})
        projected['game_state']['players'][actor]['board']['partner']=None
        projected['game_state']['players'][actor]['board']['partner_stage']=None
    chance=start.enumerate_opportunity(projected,actor,entries)
    if not chance['candidate_set_complete']:
        raise ValueError('206 hand response completeness differs')
    grouped={}
    for ability in board_legal:
        grouped.setdefault(ability['source_instance_id'],[]).append(ability)
    details=[]
    for instance,abilities in grouped.items():
        details.append({'candidate_id':identifiers.board_ability_response_id(instance,len(abilities)),
            'candidate_family':'triggered_ability','action_type':'activate_board_ability',
            'source_instance_id':instance,'card_id':abilities[0]['card_id'],
            'source_references':[abilities[0]['source_reference']]})
    ids=sorted(chance['legal_candidate_ids']+[x['candidate_id'] for x in details])
    if len(ids)!=len(set(ids)):
        raise ValueError('206 response namespace collision')
    return {'path_id':row['path_id'],'source_last_valid_event_seq':row['last_valid_event_seq'],
            'source_game_state_sha256':row['final_game_state_sha256'],
            'source_continuation_state_sha256':row['final_continuation_state_sha256'],
            'candidate_ids':ids,'hand_candidate_ids':chance['legal_candidate_ids'],
            'hand_conditional_exclusions':removed,'hand_other_exclusions':chance['excluded_candidates'],
            'board_candidate_details':details,'board_exclusions':board_excluded,
            'candidate_set_complete':True,'new_events':0,'completed':False,
            'balance_sample_count':0}


def validate_result(result):
    try:
        current,previous=load_sources()
        row=next(x for x in current['results'] if x['path_id']==result['path_id'])
        old=next(x for x in previous['results'] if x['path_id']==result['path_id'])
        return [] if result==audit_route(row,old) else ['206 independent start audit differs']
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error)]


def build_report():
    current,previous=load_sources()
    rows=[audit_route(row,next(x for x in previous['results'] if x['path_id']==row['path_id']))
          for row in current['results']]
    if len(rows)!=4 or any(validate_result(x) for x in rows):
        raise ValueError('206 four start opportunities differ')
    return {'schema':SCHEMA,'source_raw_sha256':SOURCE_RAW_SHA256,
            'planned':4,'completed':0,'new_events':0,
            'independent_balance_sample_count':0,'results':rows}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true')
    args=parser.parse_args();raw=canonical_bytes(build_report())
    if args.check:
        if OUTPUT.read_bytes()!=raw:raise SystemExit('206 canonical bytes differ')
    else:OUTPUT.write_bytes(raw)
    print('206: four start opportunities; one board ability plus pass')


if __name__=='__main__':main()
