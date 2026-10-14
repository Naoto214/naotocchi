"""Source-pinned local rule slices, conditional on an authentic resolution entry.

No activation/origin/history certification, global transition, or game execution.
The supplied game is retained for audit; only permitted candidate IDs reach RNG.
"""
import copy
import hashlib
from proxy_mandatory_policy_contract import ROOT, canonical, load_json
from proxy_population_contract import source_path

SOURCES = 'data/proxy-mandatory-boundary-465/sources.json'
SOURCES_SHA = '18264119de6f71440139e512cbf0e29abd653c7c36a805b76c014f95d330f0bc'
REGISTRY = {
    'egg_exchange_bottom': (),
    'ability_hand_bottom': ('M-beetle-01', 'P-cat_ceo'),
    'ability_draw_then_hand_bottom': ('I-sleepboost1',),
    'ability_topdeck_order': ('W-city', 'M-beetle-02'),
    'final_time_hand_bottom': ('E-final-time',),
}


def source_catalog(root=ROOT):
    try:
        anchor = source_path(root, SOURCES)
        if hashlib.sha256(anchor.read_bytes()).hexdigest() != SOURCES_SHA:
            raise ValueError('boundary source anchor differs')
        for name, digest in load_json(anchor)['sources_sha256'].items():
            if hashlib.sha256(source_path(root, name).read_bytes()).hexdigest() != digest:
                raise ValueError('boundary source differs: '+name)
        rows = load_json(source_path(root, 'data/proxy-normal-decision-candidate-table-114-20260918.json'))['cards']
        return {row['card_id']: row['card_type'] for row in rows}
    except OSError as error:
        raise ValueError('boundary source unavailable') from error


def _validate(frame, catalog):
    canonical(frame)
    if type(frame) is not dict or set(frame) != {'schema','choice_contract_id','actor','entry',
                                               'source_instance_id','target_instance_id','game_state'}:
        raise ValueError('rule slice input fields differ')
    kind = frame['choice_contract_id']; actor = frame['actor']
    if frame['schema'] != 'mandatory_rule_slice_input.v1' or type(kind) is not str or kind not in REGISTRY or actor not in ('A','B'):
        raise ValueError('rule slice scope differs')
    g = frame['game_state']
    try:
        if type(g) is not dict or set(g['players']) != {'A','B'} or g['turn_player'] not in ('A','B') or type(g['round']) is not int or g['round'] < 1:
            raise ValueError('game context differs')
        cards = g['cards']; copies = []
        if type(cards) is not dict:
            raise ValueError('card map differs')
        for instance, card in cards.items():
            if not instance or type(card) is not dict or any(type(card.get(k)) is not str or not card[k] for k in ('card_id','card_copy_id','initial_instance_id')):
                raise ValueError('card identity differs')
            if card['card_id'] not in catalog:
                raise ValueError('unregistered card identity')
            copies.append(card['card_copy_id'])
        if len(copies) != len(set(copies)):
            raise ValueError('duplicate physical copy identity')
        locations = []
        for p in g['players'].values():
            for zone in ('hand','deck','discard'):
                if type(p[zone]) is not list:
                    raise ValueError('zone must be a list')
                locations.extend(p[zone])
            b=p['board']
            for zone in ('main','partner','world'):
                if b[zone] is not None: locations.append(b[zone])
            for zone in ('companions','prepared'):
                if type(b[zone]) is not list: raise ValueError('board zone must be a list')
                locations.extend(b[zone])
        if any(type(s) is not str or s not in cards for s in locations) or len(locations) != len(set(locations)):
            raise ValueError('missing/duplicate located instance')
        source = frame['source_instance_id']; target = frame['target_instance_id']
        if kind == 'egg_exchange_bottom':
            if frame['entry'] != 'after_normal_draw' or source is not None or target is not None or actor != g['turn_player'] or g['players'][actor]['board']['main'] is not None:
                raise ValueError('egg entry differs')
        else:
            if frame['entry'] != 'effect_resolution_start' or type(source) is not str or source not in cards or cards[source]['card_id'] not in REGISTRY[kind]:
                raise ValueError('effect source/entry differs')
            if kind == 'final_time_hand_bottom':
                if type(target) is not str or target not in cards: raise ValueError('target identity absent')
            elif target is not None:
                raise ValueError('unexpected target')
    except (KeyError, TypeError, AttributeError) as error:
        raise ValueError('malformed rule slice game') from error


def _identity(g, instance):
    card = g['cards'][instance]
    return dict(instance_id=instance,card_copy_id=card['card_copy_id'],card_id=card['card_id'])


def _draw(p, count, operations):
    for _ in range(min(count,len(p['deck']))):
        s=p['deck'].pop(0);p['hand'].append(s)
        operations.append(dict(operation='draw',instance_id=s))


def prepare(frame, root=ROOT):
    """Derive complete local choices; the caller's entry is NOT authenticated."""
    catalog=source_catalog(root);_validate(frame,catalog)
    kind=frame['choice_contract_id'];actor=frame['actor']
    g=copy.deepcopy(frame['game_state']);p=g['players'][actor]
    source=frame['source_instance_id'];card=g['cards'][source]['card_id'] if source else None
    operations=[];no_choice=None
    if kind == 'egg_exchange_bottom':
        _draw(p,1,operations)
    elif card == 'P-cat_ceo' and p['board']['main'] is None:
        no_choice='partner_suppressed_while_egg'
    elif kind == 'ability_draw_then_hand_bottom':
        _draw(p,2,operations)
    elif kind == 'final_time_hand_bottom':
        target=frame['target_instance_id']
        if target not in p['discard'] or catalog[g['cards'][target]['card_id']] == 'main':
            no_choice='target_invalid_at_resolution'
        else:
            p['discard'].remove(target);p['deck'].append(target)
            operations.append(dict(operation='discard_to_bottom',instance_id=target))
            _draw(p,2,operations)
    details=[];looked=None
    if no_choice is None:
        if kind == 'ability_topdeck_order':
            if p['deck']:
                looked=_identity(g,p['deck'][0])
                details=[dict(candidate_id=canonical(dict(position=pos)).decode(),kind='effect_choice',
                              action_type='choose_effect_option',option=dict(position=pos)) for pos in ('bottom','top')]
            else: no_choice='empty_deck'
        else:
            details=sorted([dict(candidate_id=g['cards'][s]['card_copy_id'],kind='card_copy',
                          owner=actor,zone='hand',**_identity(g,s)) for s in p['hand']],key=lambda d:d['candidate_id'])
            if not details: no_choice='empty_hand'
    view=dict(owner=actor,own_hand=[_identity(g,s) for s in p['hand']],looked_top=looked)
    return dict(schema='mandatory_rule_slice_boundary.v1',choice_contract_id=kind,actor=actor,
                candidate_ids=[d['candidate_id'] for d in details],candidate_details=details,
                choice_game_state=g,permitted_view=view,prefix_operations=operations,
                no_choice_reason=no_choice,source_manifest_sha256=SOURCES_SHA,
                completeness_scope='local_rule_given_supplied_entry',origin_authenticated=False,
                policy_eligible=None,balance_admitted=None)


def apply_choice(frame, selected, root=ROOT):
    """Apply only this rule slice, never chain cleanup or instance rebinding."""
    boundary=prepare(frame,root)
    ids=boundary['candidate_ids']
    if (ids and (type(selected) is not str or selected not in ids)) or (not ids and selected is not None):
        raise ValueError('selection does not match local legal set')
    g=copy.deepcopy(boundary['choice_game_state']);p=g['players'][frame['actor']]
    operations=[];kind=frame['choice_contract_id']
    if ids:
        detail=next(d for d in boundary['candidate_details'] if d['candidate_id']==selected)
        if kind=='ability_topdeck_order':
            if detail['option']['position']=='bottom':
                instance=p['deck'].pop(0);p['deck'].append(instance)
                operations.append(dict(operation='top_to_bottom',instance_id=instance))
        else:
            instance=detail['instance_id'];p['hand'].remove(instance);p['deck'].append(instance)
            operations.append(dict(operation='hand_to_bottom',instance_id=instance))
    if kind=='ability_hand_bottom' and boundary['no_choice_reason']!='partner_suppressed_while_egg':
        card=g['cards'][frame['source_instance_id']]['card_id']
        if card=='M-beetle-01' or selected is not None:
            _draw(p,1,operations)
    return dict(schema='mandatory_rule_slice_application.v1',boundary=boundary,
                selected_candidate=selected,suffix_operations=operations,local_after_game_state=g,
                global_transition_verified=False,instance_rebinding_verified=False,
                policy_eligible=None,balance_admitted=None)
