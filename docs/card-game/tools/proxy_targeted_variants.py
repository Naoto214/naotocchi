"""Additive explicit-choice programs from441; not normal policy or balance samples."""
import copy
import gzip
import hashlib
import json
import proxy_targeted_execution as x
from proxy_record_validator import canonical_sha256

BASE=x.DATA/'proxy-gap-validation-441'
COMMANDS={'start_turn','main','person','world','prepare','challenge_draw','activate','resolve','resolve_defended','close_opportunity','enter_end','end_turn'}
DEFENSES=('M-penguin-07','M-god-08')


def saved_441():
    blob=(BASE/'targeted.json.gz').read_bytes()
    if hashlib.sha256(blob).hexdigest()!=json.loads((BASE/'manifest.json').read_text())['compressed_sha256']:raise ValueError('441 saved blob differs')
    return json.loads(gzip.decompress(blob))['results']


def compare_441():
    return {row['focus']:row==x.execute_scenario(row['focus']) for row in saved_441()}


def programs():
    rows=[]
    for saved in saved_441():
        focus=saved['focus'];base=saved['commands']
        rows.append(dict(focus=focus,variant='baseline',commands=copy.deepcopy(base)))
        decline=[];skip_resolve=False
        for command in base:
            if command['kind']=='activate' and command['arguments']['card']==focus:
                skip_resolve=True
                if focus=='M-penguin-07':decline.append(dict(kind='close_opportunity',arguments={}))
                continue
            if skip_resolve:
                if command['kind']!='resolve':raise ValueError('unexpected baseline activation sequence')
                skip_resolve=False;continue
            decline.append(copy.deepcopy(command))
        rows.append(dict(focus=focus,variant='decline',commands=decline))
        if focus not in DEFENSES:continue
        attack_index=next(i for i,c in enumerate(base) if c['kind']=='activate' and c['arguments']['card']=='M-dragon-06')
        attack=copy.deepcopy(base[attack_index:attack_index+2])
        expired=copy.deepcopy(base[:attack_index]+base[attack_index+2:])
        final_round=max(c['arguments']['round_number'] for c in base if c['kind']=='start_turn')
        for actor in 'AB':
            start=copy.deepcopy(next(c for c in base if c['kind']=='start_turn' and c['arguments']['actor']==actor))
            start['arguments']['round_number']=final_round+1;expired.append(start)
            if actor=='B':expired+=attack
            expired.append(dict(kind='end_turn',arguments={}))
        rows.append(dict(focus=focus,variant='expired',commands=expired))
        explicit=copy.deepcopy(base)
        reservation=next(e['proof']['details']['consumed'] for e in saved['events'] if e['command']['kind']=='resolve' and e['proof']['card']=='M-dragon-06')
        explicit[attack_index+1]=dict(kind='resolve_defended',arguments=dict(defender='A',reservation_order=[reservation]))
        rows.append(dict(focus=focus,variant='explicit_defense',commands=explicit))
    return rows


def execute(program):
    focus=program['focus'];variant=program['variant'];r=x.load_scenario(focus)
    for command in program['commands']:
        if set(command)!={'kind','arguments'} or command['kind'] not in COMMANDS:raise ValueError('unsupported command')
        getattr(r,command['kind'])(**command['arguments'])
    if r.state['phase']!='ended' or r.state['activation']:raise ValueError('unfinished program')
    resolutions=[e for e in r.events if e['command']['kind'] in ('resolve','resolve_defended')]
    applied=any(e['proof']['card']==focus and e['proof']['effect_applied'] for e in resolutions)
    checks=dict(focus_applied=applied,ended=True)
    if applied!=(variant!='decline'):raise ValueError('unexpected focus outcome')
    if focus in DEFENSES:
        statuses=sorted(z['status'] for z in r.state['reservations'].values() if r.state['cards'][z['source']]['card_id']==focus)
        expected=[] if variant=='decline' else ['expired'] if variant=='expired' else ['consumed']
        if statuses!=expected:raise ValueError('reservation status differs')
        removal=next(e for e in resolutions if e['proof']['card']=='M-dragon-06')
        destination=removal['proof']['details']['destination']
        expected_destination='discard' if variant in ('decline','expired') else None if focus=='M-penguin-07' else 'hand'
        if destination!=expected_destination:raise ValueError('removal outcome differs')
        before=r.snapshots[removal['seq']-1]['players']['B'];after=r.snapshots[removal['seq']]['players']['B']
        if before['time']!=after['time']:raise ValueError('removal refunded time')
        activation=next(e for e in r.events if e['command']['kind']=='activate' and e['proof']['source_reference'].endswith('#M-dragon-06'))
        if activation['proof']['payment_time']!=3 or len(activation['proof']['paid'])!=1 or not activation['proof']['prepared_paid']:raise ValueError('removal costs missing')
        checks.update(defense_statuses=statuses,removal_destination=destination,attacker_costs_retained=True)
    for i,event in enumerate(r.events):
        if event['before_state_sha256']!=canonical_sha256(r.snapshots[i]) or event['after_state_sha256']!=canonical_sha256(r.snapshots[i+1]):raise ValueError('hash chain differs')
    return dict(schema='naotocchi.card_game.targeted_variants.v1',case_id=focus+'/'+variant,focus=focus,variant=variant,program_sha256=canonical_sha256(program),fixture_sha256=canonical_sha256(r.fixture),source_sha256=x.source_hashes(),commands=r.commands,events=r.events,snapshots=r.snapshots,checks=checks,completed_match_count=0,independent_balance_sample_count=0,policy_promoted=False,selection_mode='explicit_cooperative_targeted_choices',legal_inventory_complete=False,winner=None)


def execute_all():return [execute(program) for program in programs()]


def replay(result):
    try:
        program=next(p for p in programs() if (p['focus'],p['variant'])==(result['focus'],result['variant']))
        if execute(program)!=result:raise ValueError('saved variant differs from independent execution')
        return []
    except (ValueError,KeyError,TypeError,StopIteration) as error:return [str(error) or 'unknown program']
