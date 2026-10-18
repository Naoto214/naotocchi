"""Source-bound semantic capabilities shared by candidate and execution adapters."""
import copy
import hashlib
import json
import re
from pathlib import Path
import proxy_continuation_state as state

ROOT = Path(__file__).resolve().parents[1]
TABLE = ROOT / 'data/proxy-normal-decision-candidate-table-114-20260918.json'
# Semantics belong to card text, never to a route/copy/event ID.
CAPABILITIES = {
    'M-antlion-01': dict(kind='cost_modifier', timing='set_item_payment', ability_key='set_discount',
        reference='55-insect-three-lines-card-text-draft.md#M-antlion-01',
        fragments=['1ターンに1回','そのカードをプレイするための時を1少なく','任意に適用']),
    'I-bowtie': dict(kind='triggered',timing='own_turn_start',ability_key='start_draw',
        reference='77-current-items-card-text-draft.md#I-bowtie',
        fragments=['メイン・なかま・こいびとのいずれかにみにつける','手札が2枚以下','1枚引く']),
    'I-bond1': dict(kind='replacement',timing='companion_departure',ability_key='protect_companion',
        reference='77-current-items-card-text-draft.md#I-bond1',fragments=['そのなかまが相手の効果で']),
}


def table():
    return json.loads(TABLE.read_text())


def source_section(reference):
    name, anchor = reference.split('#',1)
    path = ROOT / name
    text = path.read_text()
    match = re.search(r'^#{2,3} '+re.escape(anchor)+r'(?:\s|$).*?(?=^#{2,3} |\Z)', text, re.M|re.S)
    if not match: raise ValueError('canonical source heading absent: '+reference)
    return match.group(), hashlib.sha256(path.read_bytes()).hexdigest()


def classification(card_id):
    if card_id not in CAPABILITIES:
        raise ValueError('unproved ability capability: '+card_id)
    row = copy.deepcopy(CAPABILITIES[card_id]); body, digest = source_section(row['reference'])
    if not all(s in body for s in row.pop('fragments')): raise ValueError('capability text changed')
    return dict(row, source_raw_sha256=digest)


def main_identity(card_id, allowed):
    if card_id not in allowed: raise ValueError('main card not in approved available pool')
    match = re.fullmatch(r'M-(.+)-(0[1-8])', card_id)
    rows = [r for r in table()['cards'] if r['card_id']==card_id and r['card_type']=='main']
    if not match or len(rows)!=1: raise ValueError('unproved main identity')
    action = next(a for a in rows[0]['actions'] if a['action_type']=='play_main')
    source_section(action['source_text_reference'])
    return match[1], int(match[2])


def main_transition(current, destination, variant, time, allowed):
    if type(time) is not int or time < 0: raise ValueError('invalid remaining time')
    species, stage = main_identity(destination, allowed)
    previous = main_identity(current, allowed) if current else None
    cost = 0; legal = False
    if variant == 'birth':
        legal = previous is None; cost = stage if legal else 0
    elif variant == 'time_skip':
        legal = previous is not None and previous[0]==species and previous[1]<stage
        cost = stage-previous[1] if legal else 0
    elif variant == 'transform':
        legal = previous is not None and previous[0]!=species; cost=stage if legal else 0
    else: raise ValueError('unknown main transition')
    reasons = [] if legal else ['main_transition_not_legal']
    if legal and time < cost: reasons.append('insufficient_time')
    return dict(legal=not reasons,payment_time=cost,reason_codes=reasons,
                species=species,stage=stage,source_reference='02-main-system.md')


def used(envelope, source, key):
    g=envelope['legacy_continuation']['game_state']
    return any(r['source_instance_id']==source and r['ability_key']==key and
               r['turn_player']==g['turn_player'] and r['round']==g['round']
               for r in envelope['runtime']['ability_uses'])


def cost_options(envelope, action, base_cost):
    state.validate(envelope)
    if type(base_cost) is not int or base_cost < 0: raise ValueError('unproved cost')
    g=envelope['legacy_continuation']['game_state']; p=g['players'][g['turn_player']]
    options=[dict(payment_time=base_cost,cost_modifiers=[])]
    if action['action_type']=='set_item' and p['board']['main']:
        source=p['board']['main']; capability=classification(g['cards'][source]['card_id'])
        if capability['kind']=='cost_modifier' and capability['timing']=='set_item_payment' and not used(envelope,source,capability['ability_key']):
            options.append(dict(payment_time=max(0,base_cost-1),cost_modifiers=[dict(
                source_instance_id=source,ability_key=capability['ability_key'],source_reference=capability['reference'])]))
    return options
