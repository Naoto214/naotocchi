#!/usr/bin/env python3
"""Checkpoint 121: read-only normal-action candidate completeness proof."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from proxy_response_window_seeded_restart import game_state_sha256, continuation_state_sha256

DATA = Path(__file__).resolve().parents[1] / 'data'
FAMILIES = ('standing_pass', 'hand_card_action', 'board_card_action', 'reservation_action', 'normal_challenge', 'relationship_progress')
REASONS = ('timing_not_normal_action', 'insufficient_time', 'main_transition_not_legal', 'person_placement_limit_used', 'partner_slot_occupied', 'required_own_main_absent', 'required_history_absent', 'required_target_absent', 'passive_not_separate_action', 'no_reservation_source', 'reservation_not_due', 'challenge_participant_missing', 'challenge_limit_used', 'relationship_partner_absent', 'relationship_blocked_while_egg', 'relationship_limit_used', 'relationship_state_terminal')
STOPS = ('missing_candidate_template', 'duplicate_candidate_template', 'unsupported_source_family', 'unresolved_canonical_predicate', 'missing_state_evidence', 'incomplete_target_expansion', 'missing_exclusion_reason', 'missing_candidate_id_grammar', 'candidate_id_collision', 'forbidden_information_required')
CHECKS = ('opportunity_context_valid', 'source_artifact_integrity_valid', 'information_boundary_valid', 'required_source_families_present', 'source_inventory_complete', 'candidate_templates_complete', 'candidate_variants_complete', 'target_expansions_complete', 'canonical_predicates_resolved', 'dispositions_and_reasons_valid', 'stable_candidate_ids_valid', 'legal_candidate_projection_exact')
REASON_EVIDENCE = {
 'timing_not_normal_action': (('phase','template.timing'), ('06-action-chain-checkpoint.md',)),
 'insufficient_time': (('owner.time','template.base_time_cost'), ('01-core-rules.md',)),
 'main_transition_not_legal': (('owner.board.main','card_id','candidate_variant'), ('02-main-system.md',)),
 'person_placement_limit_used': (('owner.person_placed',), ('01-core-rules.md',)),
 'partner_slot_occupied': (('owner.board.partner',), ('01-core-rules.md',)),
 'required_own_main_absent': (('owner.board.main',), ('01-core-rules.md',)),
 'required_history_absent': (('owner.discard','public_history'), ('114-normal-decision-protocol-hardening.md',)),
 'required_target_absent': (('target_instance_ids','template.target_rule'), ('114-normal-decision-protocol-hardening.md',)),
 'passive_not_separate_action': (('source_zone','template.timing'), ('06-action-chain-checkpoint.md',)),
 'no_reservation_source': (('owner.reservations',), ('01-core-rules.md',)),
 'reservation_not_due': (('owner.reservations','phase'), ('01-core-rules.md',)),
 'challenge_participant_missing': (('owner.board.main','opponent.board.main'), ('01-core-rules.md',)),
 'challenge_limit_used': (('owner.challenge_used',), ('01-core-rules.md',)),
 'relationship_partner_absent': (('owner.board.partner',), ('01-core-rules.md',)),
 'relationship_blocked_while_egg': (('owner.board.main',), ('02-main-system.md',)),
 'relationship_limit_used': (('owner.relationship_progressed',), ('01-core-rules.md',)),
 'relationship_state_terminal': (('owner.board.partner_stage',), ('01-core-rules.md',)),
}
BOARD_ABILITY_REGISTRY = {
 'C-chameleon': {'kind':'continuous','source_text_reference':'72-companion-26-card-text-draft.md#C-chameleon'},
 'P-cat_ceo': {'kind':'past_trigger','source_text_reference':'74-partner-18-card-text-draft.md#P-cat_ceo'},
}
PATH_ORDER = ('order-01-a-first', 'order-01-b-first', 'order-02-a-first', 'order-02-b-first')
EXPECTED = {
 'order-01-a-first': ('cf22f9171b5a6f2ef5f60e83c00ef1e9bf6dd89e84aaa8d55be33d300637cf08', 7, '641e77bb932b2a3b4d4214b0cd12306076ec86a990e13110c9e4bc4cf8f94d80', 'a698227f6c2c851c3012b64ba27cf9db77d8a0eeb13d583902efda03ac600a00'),
 'order-01-b-first': ('b0f77de2b82574a144a4742ee0d55e830400e44f8ca9b8eeb33c76def7bc6e9d', 5, '6462c0cb11bc0cb26aeb055a4b969578a3f9bd05ff8963584fe629ac00ff3616', 'cbda8acffc3a36ceb14b98a2cb36cd9649796444599ed02da4abfdcfc8403467'),
 'order-02-a-first': ('a2c617130f85360577014568309ab23a819ad10adb6c9710058f2651fccd421d', 5, 'edbc2844074b27462439c1efe85f0c021b826cf75a51bdd115858029dfc2ff89', 'b325d7802cf9e9e621765f420727f33c16a52e0ea10a989bb1dd38376aa717ea'),
 'order-02-b-first': ('1705a9ce7cc19e34e78730da8716ec9c12f33a7a284bef8fe68176b36d79f688', 5, 'c934f656ed14f0a73b2c70f714470e7bbdad98626ce4a4078fe96888aa426473', 'f4eaf9452682fd1c5ff2ecf7ed4dfb9a3ccd34fb3dba707cff7bff870b3accf5'),
}

def load_inputs(data_dir: Path = DATA) -> dict:
    root = Path(data_dir)
    stops = {}
    for path in PATH_ORDER:
        raw = (root / 'proxy-response-window-stops-120' / f'stop-120-{path}.json').read_bytes()
        stop = json.loads(raw)
        verify_source_artifact(stop, raw, EXPECTED[path])
        stops[path] = (stop, raw)
    return {'stops': stops, 'candidate_table': json.loads((root / 'proxy-normal-decision-candidate-table-114-20260918.json').read_text())}

def verify_source_artifact(stop: dict, raw: bytes, expected: tuple) -> None:
    if hashlib.sha256(raw).hexdigest() != expected[0]:
        raise ValueError('120 raw bytes differ')
    if (stop.get('last_valid_event_seq'), stop.get('game_state_sha256'), stop.get('continuation_state_sha256')) != expected[1:]:
        raise ValueError('120 stop metadata differs')
    if stop.get('phase') != 'normal_action' or stop.get('reason_code') != 'incomplete_legal_candidates':
        raise ValueError('120 stop opportunity differs')
    if game_state_sha256(stop['game_state']) != expected[2] or continuation_state_sha256(stop['continuation_state']) != expected[3]:
        raise ValueError('120 state hash differs')
    cards = stop['game_state']['cards']
    visible = set()
    for p in stop['game_state']['players'].values():
        b = p['board']
        visible.update(p['hand'] + p['discard'] + b['companions'] + b['prepared'])
        visible.update(z for z in (b['main'], b['partner'], b['world']) if z)
    if not visible <= cards.keys() or any(cards[z]['initial_instance_id'] != z for z in visible):
        raise ValueError('instance mapping differs')

def build_contract() -> dict:
    return dict(schema='naotocchi.card_game.proxy_normal_action_candidate_completeness_contract.v1', checkpoint=121, contract_version='naotocchi.card_game.proxy_normal_action_candidate_completeness_contract.v1', status='protocol_only_no_match_progress', source_contracts=['01-core-rules.md','02-main-system.md','06-action-chain-checkpoint.md','107-normal-decision-protocol.md','114-normal-decision-protocol-hardening.md','116-normal-decision-fallback-contract.md','119-response-window-contract.md','120-response-window-seeded-restart.md','data/proxy-normal-decision-candidate-table-114-20260918.json','data/proxy-normal-decision-hardening-114-20260918.json'], protected_sha256={p: v[0] for p,v in EXPECTED.items()}, information_policy='public_and_owner_known_only', source_family_registry=[{'family':family,'order':index+1,'empty_evidence_required':True} for index,family in enumerate(FAMILIES)], enumeration_unit_schema={'fields':['enumeration_unit_id','source_family','source_id','source_zone','source_instance_id','card_id','action_type','candidate_variant','target_instance_ids','disposition','candidate_id','reason_codes','evidence','source_references'],'dispositions':['admitted','excluded']}, reason_code_registry=[{'code':code,'required_evidence_fields':list(REASON_EVIDENCE[code][0]),'canonical_references':list(REASON_EVIDENCE[code][1])} for code in REASONS], candidate_id_registry=[{'code':'pass','grammar':'pass'},{'code':'birth','grammar':'candidate-play-main-{source_instance_id}-birth'}], completeness_requirements=list(CHECKS), contract_stop_codes=list(STOPS), scope={'planned':0,'completed':0,'stopped':0,'decision':0,'event':0,'snapshot':0,'winner':0,'independent_balance_sample':0})


PLAN_RAW_SHA256 = {
 '117': '2502320582b2cf6b05731bd7d23e37e62a7437f1b4b48361fd8e591ba53583d2',
 '120': '59e72d77fe4cd8b4ddc52c4349d1ba5615ae6dc99ce4b278c1898f720a21c95f',
}

def _public_history_from_saved_plans(stop: dict) -> dict:
    filenames = {'117':'proxy-normal-decision-seeded-restart-plan-117-20260919.json',
                 '120':'proxy-response-window-seeded-restart-plan-120-20260922.json'}
    routes=[]
    for checkpoint, filename in filenames.items():
        raw=(DATA/filename).read_bytes()
        if hashlib.sha256(raw).hexdigest()!=PLAN_RAW_SHA256[checkpoint]:
            raise ValueError('120/117 plan raw integrity error')
        plan=json.loads(raw)
        matches=[r for r in plan['routes'] if r['path_id']==stop['path_id']]
        if len(matches)!=1:
            raise ValueError('missing_state_evidence: public history route')
        routes.append(matches[0])
    old,new=routes
    if old['terminal']['last_valid_event_seq'] != 3 or old['terminal']['last_valid_state_sha256'] != new['source_state_sha256']:
        raise ValueError('missing_state_evidence: 117 source continuity')
    if new['resume_event_seq']+len(new['steps'])>stop['last_valid_event_seq'] or any(new['terminal'][key]!=stop[key] for key in new['terminal']):
        raise ValueError('missing_state_evidence: 120 terminal continuity')
    steps=old['steps']+new['steps']
    if any(step['phase'] not in ('egg_exchange_choice','normal_action','response_window') or 'challenge' in str(step.get('selected_candidate','')) for step in steps):
        raise ValueError('unresolved_canonical_predicate: challenge loss history')
    return {'normal_challenge_losses_by_actor': [],'last_valid_event_seq':stop['last_valid_event_seq'],
            'source_refs':list(filenames.values())}

def project_normal_action_information(stop: dict, public_history: dict | None = None) -> dict:
    """Expose only current owner knowledge and public evidence."""
    state = stop['game_state']
    if set(state) != {'round','turn_player','phase','players','cards'}:
        raise ValueError('unknown game state field')
    for player in state['players'].values():
        if set(player) != {'time','growth','hand','deck','discard','board','reservations','challenge_used','person_placed','relationship_progressed'}:
            raise ValueError('unknown player state field')
    actor = stop['actor']
    if actor != state['turn_player'] or state['phase'] != 'normal_action':
        raise ValueError('invalid normal action opportunity')
    players = {}
    visible = set()
    for ident, player in state['players'].items():
        allowed = ('time', 'growth', 'hand', 'discard', 'board', 'reservations', 'challenge_used', 'person_placed', 'relationship_progressed') if ident == actor else ('time', 'growth', 'discard', 'board', 'challenge_used', 'person_placed', 'relationship_progressed')
        players[ident] = {key: json.loads(json.dumps(player[key])) for key in allowed}
        if ident == actor:
            visible.update(player['hand'])
        visible.update(player['discard'])
        board = player['board']
        visible.update(board['companions'] + board['prepared'])
        visible.update(x for x in (board['main'], board['partner'], board['world']) if x)
    return {'round': state['round'], 'turn_player': state['turn_player'], 'phase': state['phase'], 'actor': actor, 'players': players, 'cards': {key: dict(state['cards'][key]) for key in sorted(visible)}, 'public_history':public_history if public_history is not None else _public_history_from_saved_plans(stop)}


def inventory_sources(view: dict) -> list[dict]:
    actor = view['actor']
    owner = view['players'][actor]
    board = owner['board']
    sources = [
        ['pass'], list(owner['hand']),
        [x for x in [board['main'], *board['companions'], board['partner'], board['world'], *board['prepared']] if x],
        list(owner['reservations']), [f'challenge:{actor}'], [f'relationship:{actor}'],
    ]
    if not sources[1] or not sources[2]:
        raise ValueError('missing_exclusion_reason: empty hand/board family has no canonical reason code')
    references = ('114-normal-decision-protocol-hardening.md', '114-normal-decision-protocol-hardening.md', '01-core-rules.md', '01-core-rules.md', '01-core-rules.md', '01-core-rules.md')
    fields = ('phase', f'players.{actor}.hand', f'players.{actor}.board', f'players.{actor}.reservations', 'players.*.board', f'players.{actor}.board.partner')
    return [{'family': family, 'sources': rows, 'count': len(rows), 'empty_reason_code': 'no_reservation_source' if family == 'reservation_action' and not rows else None, 'source_reference': reference, 'inspected_state_field': field} for family, rows, reference, field in zip(FAMILIES, sources, references, fields)]


def _targets(variant: str, view: dict, family: str) -> list[list[str]]:
    owner = view['players'][view['actor']]
    board = owner['board']
    own_person = [x for x in [board['main'], *board['companions'], board['partner']] if x]
    targetless = {'birth', 'time_skip', 'transform', 'start_relationship_stage_zero', 'single_no_target', 'single_no_card_target', 'set_face_down', 'empty_slot', 'empty_world_slot', 'seven_or_eight_cards', 'nine_or_more_cards', 'main', 'companion', 'partner', 'world', 'play', 'item', 'event', 'power', 'wisdom'}
    if variant in targetless:
        return [[]]
    if variant in ('single_own_main', 'single_own_participant', 'each_threatened_own_main'):
        return [[board['main']]] if board['main'] else [[]]
    if variant == 'each_legal_own_person':
        return [[x] for x in sorted(own_person)] or [[]]
    if variant in ('each_legal_own_companion', 'replace_each_legal_companion'):
        return [[x] for x in sorted(board['companions'])] or [[]]
    if variant == 'replace_current_world':
        return [[board['world']]] if board['world'] else [[]]
    if variant == 'each_legal_stage_zero_partner':
        return [[board['partner']]] if board['partner'] and board['partner_stage'] == 0 else [[]]
    if variant in ('each_legal_discard_non_main', 'each_legal_discard_companion'):
        return [[x] for x in sorted(owner['discard']) if (variant.endswith('non_main') and not view['cards'][x]['card_id'].startswith('M-')) or (variant.endswith('companion') and view['cards'][x]['card_id'].startswith('C-'))] or [[]]
    if variant in ('each_legal_prepared_attachment', 'each_legal_prepared_equipment'):
        return [[x] for x in sorted(board['prepared'])] or [[]]
    if variant == 'each_legal_opponent_main':
        other = next(i for i in view['players'] if i != view['actor'])
        main = view['players'][other]['board']['main']
        return [[main]] if main else [[]]
    raise ValueError('unresolved_canonical_predicate: unknown variant')


def _unit(family: str, zone: str, source: str, action: str, variant: str, targets: list[str], card_id: str | None = None, template: dict | None = None) -> dict:
    identity = [family, zone, source, action, variant, sorted(targets)]
    return {'enumeration_unit_id': json.dumps(identity, ensure_ascii=False, separators=(',', ':')), 'source_family': family, 'source_zone': zone, 'source_id': source, 'source_instance_id': source if zone in ('hand', 'board') else None, 'card_id': card_id, 'action_type': action, 'candidate_variant': variant, 'target_instance_ids': sorted(targets), 'template': template}


def expand_units(view: dict, inventory: list[dict], templates: dict) -> list[dict]:
    by_card = {}
    for card in templates['cards']:
        cid = card['card_id']
        if cid in by_card:
            raise ValueError('duplicate_candidate_template')
        by_card[cid] = card
    units = [_unit('standing_pass','synthetic','pass','pass','pass',[])]
    for row in inventory:
        family = row['family']
        if family in ('hand_card_action', 'board_card_action'):
            for source in row['sources']:
                card_id = view['cards'][source]['card_id']
                template = by_card.get(card_id)
                if family == 'hand_card_action' and template is None:
                    raise ValueError('missing_candidate_template')
                if family == 'board_card_action':
                    ability=BOARD_ABILITY_REGISTRY.get(card_id)
                    if ability is None:
                        raise ValueError('unresolved_canonical_predicate: board ability classification')
                    units.append(_unit(family,'board',source,'board_passive',ability['kind'],[],card_id,{'timing':'passive','source_text_reference':ability['source_text_reference']}))
                    continue
                for action in template['actions']:
                    required={'action_type','timing','base_time_cost','prerequisites','target_rule','candidate_variants','legal_when','not_legal_when','source_text_reference'}
                    if set(action)!=required or not action['candidate_variants']:
                        raise ValueError('unresolved_canonical_predicate: template schema')
                    if action['action_type']=='play_main' and (action['base_time_cost']!='stage_or_positive_stage_difference' or action['candidate_variants']!=['birth','time_skip','transform']):
                        raise ValueError('unresolved_canonical_predicate: main transition template')
                    reference=action.get('source_text_reference','')
                    filename,separator,anchor=reference.partition('#')
                    source_path=(DATA.parent/filename)
                    if not separator or anchor!=card_id or not source_path.is_file() or anchor not in source_path.read_text(encoding='utf-8'):
                        raise ValueError('unresolved_canonical_predicate: template source reference')
                    for variant in action['candidate_variants']:
                        for targets in _targets(variant, view, family):
                            units.append(_unit(family, 'hand' if family == 'hand_card_action' else 'board', source, action['action_type'], variant, targets, card_id, action))
        elif family == 'reservation_action':
            for source in row['sources']:
                units.append(_unit(family,'reservation',str(source),'reservation','due',[]))
        elif family == 'normal_challenge':
            for variant in ('power','wisdom'):
                units.append(_unit(family,'synthetic',row['sources'][0],'challenge',variant,[]))
        elif family == 'relationship_progress':
            stage=view['players'][view['actor']]['board']['partner_stage']
            if stage in (0,1,2,3):
                variant=('0-to-1','1-to-2','2-to-3','3-to-marriage')[stage]
            elif stage is None:
                variant='no_partner'
            elif stage=='married':
                variant='terminal'
            else:
                raise ValueError('unresolved_canonical_predicate: relationship state')
            units.append(_unit(family,'synthetic',row['sources'][0],'relationship',variant,[]))
    if len({u['enumeration_unit_id'] for u in units}) != len(units):
        raise ValueError('candidate_id_collision')
    return units


def adjudicate_units(view: dict, units: list[dict], registry: dict) -> list[dict]:
    """Resolve only predicates supported by the 114 table and core rules."""
    owner = view['players'][view['actor']]
    board = owner['board']
    opponent = next(p for name,p in view['players'].items() if name != view['actor'])
    result = []
    for original in units:
        unit = {k: v for k,v in original.items() if k != 'template'}
        reasons = set()
        family, action, variant = unit['source_family'], unit['action_type'], unit['candidate_variant']
        template = original['template']
        if family == 'board_card_action':
            # 114 describes hand plays. A board source's hand-play template is not an active board ability.
            reasons.add('passive_not_separate_action')
        elif family == 'hand_card_action':
            if template['timing'] != 'normal_action_opportunity':
                reasons.add('timing_not_normal_action')
            cost = template['base_time_cost']
            if action == 'play_main':
                stage = int(unit['card_id'].rsplit('-',1)[-1])
                cost = stage
                if variant == 'birth':
                    if stage != 1 or board['main'] is not None:
                        reasons.add('main_transition_not_legal')
                elif board['main'] is None:
                    reasons.add('main_transition_not_legal')
                else:
                    raise ValueError('unresolved_canonical_predicate: main transition requires lineage proof')
            if action == 'activate_companion_ability':
                raise ValueError('missing_exclusion_reason: board-only action from hand')
            if variant in ('seven_or_eight_cards','nine_or_more_cards'):
                raise ValueError('missing_exclusion_reason: board-count predicate has no approved reason')
            if isinstance(cost,int) and owner['time'] < cost:
                reasons.add('insufficient_time')
            if action in ('place_companion','place_partner'):
                if owner['person_placed']:
                    reasons.add('person_placement_limit_used')
                if action == 'place_partner' and board['partner']:
                    reasons.add('partner_slot_occupied')
                if action == 'place_companion':
                    if variant == 'empty_slot' and len(board['companions']) >= 3:
                        reasons.add('required_target_absent')
                    if variant == 'replace_each_legal_companion' and len(board['companions']) < 3:
                        reasons.add('required_target_absent')
            if action in ('attach_item','use_play','use_event','use_item','activate_companion_ability'):
                if variant in ('single_own_main','single_own_participant') and not board['main']:
                    reasons.add('required_own_main_absent')
                if 'own main' in template.get('prerequisites','') and not board['main'] and action != 'attach_item':
                    reasons.add('required_own_main_absent')
                if variant.startswith('each_legal_') and not unit['target_instance_ids']:
                    reasons.add('required_target_absent')
                if action == 'use_event' and 'lost a challenge this turn' in template.get('prerequisites','') and view['actor'] not in view['public_history']['normal_challenge_losses_by_actor']:
                    reasons.add('required_history_absent')
            if action == 'place_world':
                if variant == 'empty_world_slot' and board['world']:
                    reasons.add('required_target_absent')
                if variant == 'replace_current_world' and not board['world']:
                    reasons.add('required_target_absent')
            if not reasons and action != 'play_main' and action not in ('place_companion','place_partner','attach_item','use_play','use_event','use_item','set_item','place_world','activate_companion_ability'):
                raise ValueError('unresolved_canonical_predicate: action')
        elif family == 'reservation_action':
            raise ValueError('unresolved_canonical_predicate: reservation timing')
        elif family == 'normal_challenge':
            if not board['main'] or not opponent['board']['main']:
                reasons.add('challenge_participant_missing')
            if owner['challenge_used']:
                reasons.add('challenge_limit_used')
        elif family == 'relationship_progress':
            if not board['partner']:
                reasons.add('relationship_partner_absent')
            if not board['main']:
                reasons.add('relationship_blocked_while_egg')
            if owner['relationship_progressed']:
                reasons.add('relationship_limit_used')
            if owner['time'] < 1:
                reasons.add('insufficient_time')
            stage = board['partner_stage']
            if stage == 'married':
                reasons.add('relationship_state_terminal')
            if stage not in (0,1,2,3,'married',None):
                raise ValueError('unresolved_canonical_predicate: relationship stage')
            if stage in (0,1,2,3) and variant != ('0-to-1','1-to-2','2-to-3','3-to-marriage')[stage]:
                raise ValueError('unresolved_canonical_predicate: stage variant mismatch')
        elif family != 'standing_pass':
            raise ValueError('unsupported_source_family')
        unit['reason_codes'] = [reason for reason in REASONS if reason in reasons]
        unit['disposition'] = 'excluded' if reasons else 'admitted'
        unit['candidate_id'] = None
        if not reasons:
            if family == 'standing_pass':
                unit['candidate_id'] = 'pass'
            elif action == 'play_main' and variant == 'birth':
                unit['candidate_id'] = f"candidate-play-main-{unit['source_instance_id']}-birth"
            else:
                raise ValueError('missing_candidate_id_grammar: legal action')
        evidence_values={
            'phase':view['phase'], 'template.timing':template.get('timing') if template else None,
            'owner.time':owner['time'], 'template.base_time_cost':template.get('base_time_cost') if template else 0,
            'owner.board.main':board['main'], 'opponent.board.main':opponent['board']['main'],
            'card_id':unit['card_id'], 'candidate_variant':variant,
            'owner.person_placed':owner['person_placed'], 'owner.board.partner':board['partner'],
            'owner.discard':owner['discard'], 'public_history':view['public_history'],
            'target_instance_ids':unit['target_instance_ids'], 'template.target_rule':template.get('target_rule') if template else None,
            'source_zone':unit['source_zone'], 'owner.reservations':owner['reservations'],
            'owner.challenge_used':owner['challenge_used'],
            'owner.relationship_progressed':owner['relationship_progressed'],
            'owner.board.partner_stage':board['partner_stage'],
        }
        unit['evidence']={field:evidence_values[field] for reason in unit['reason_codes'] for field in REASON_EVIDENCE[reason][0]}
        unit['source_references'] = [template['source_text_reference'] if template else '01-core-rules.md', *[ref for reason in unit['reason_codes'] for ref in REASON_EVIDENCE[reason][1]]]
        result.append(unit)
    return result


def derive_legal_candidates(units: list[dict]) -> tuple[list[str], list[dict]]:
    admitted = [u for u in units if u['disposition']=='admitted']
    ids = [u['candidate_id'] for u in admitted]
    if ids.count('pass') != 1 or len(set(ids)) != len(ids) or any(not x or x in ('candidate-pass','response-pass') for x in ids):
        raise ValueError('candidate ID invalid')
    for unit in admitted:
        expected = 'pass' if unit['source_family']=='standing_pass' else f"candidate-play-main-{unit['source_instance_id']}-birth" if unit['action_type']=='play_main' and unit['candidate_variant']=='birth' else None
        if unit['candidate_id'] != expected:
            raise ValueError('candidate grammar mismatch')
    return sorted(ids), sorted(admitted,key=lambda u:u['candidate_id'])


def build_audits(inputs: dict) -> dict:
    rows=[]
    for path in PATH_ORDER:
        stop, raw = inputs['stops'][path]
        verify_source_artifact(stop,raw,EXPECTED[path])
        view=project_normal_action_information(stop)
        inventory=[];units=[];ids=[];details=[];stop_codes=[]
        try:
            inventory=inventory_sources(view)
            units=adjudicate_units(view,expand_units(view,inventory,inputs['candidate_table']),build_contract())
            ids,details=derive_legal_candidates(units)
        except ValueError as error:
            code=str(error).split(':',1)[0]
            if code not in STOPS:
                raise
            stop_codes=[code]
        checks={name:False for name in CHECKS}
        row=dict(path_id=path,source_stop_file=f'data/proxy-response-window-stops-120/stop-120-{path}.json',source_stop_sha256=EXPECTED[path][0],game_state_sha256=EXPECTED[path][2],continuation_state_sha256=EXPECTED[path][3],last_valid_event_seq=EXPECTED[path][1],opportunity_context={'round':view['round'],'turn_player':view['turn_player'],'actor':view['actor'],'phase':view['phase'],'decision_kind':stop['decision_kind'],'choice_kind':stop['choice_kind']},owner_state=view['players'][view['actor']],public_information={k:v for k,v in view['players'].items() if k!=view['actor']},information_policy='public_and_owner_known_only',source_inventory=inventory,enumeration_units=units,legal_candidate_ids=ids,legal_candidate_details=details,forbidden_information_used=[],completeness_checks=checks,candidate_set_complete=False,contract_stop_codes=stop_codes,source_references=['01-core-rules.md','114-normal-decision-protocol-hardening.md'])
        row['completeness_checks']=recompute_completeness(row,stop,raw,inputs['candidate_table'])
        row['candidate_set_complete']=all(row['completeness_checks'].values()) and not row['contract_stop_codes']
        rows.append(row)
    return dict(schema='naotocchi.card_game.proxy_normal_action_candidate_completeness_audit.v1',checkpoint=121,contract_version='naotocchi.card_game.proxy_normal_action_candidate_completeness_contract.v1',status='protocol_only_no_match_progress',source_files=['data/proxy-normal-decision-candidate-table-114-20260918.json'],protected_sha256={p:v[0] for p,v in EXPECTED.items()},path_order=list(PATH_ORDER),audits=rows,summary={'planned':0,'completed':0,'stopped':0,'decision':0,'event':0,'snapshot':0,'winner':0,'independent_balance_sample':0},scope='protocol_only_no_match_progress')


def validate_audit(audit: dict, inputs: dict) -> list[str]:
    """Never use stored units, flags or candidate IDs to derive expected values."""
    try:
        expected=build_audits(inputs)
    except (ValueError,KeyError,TypeError) as error:
        return [f'input integrity: {error}']
    errors=[]
    if list(audit)!=list(expected):
        errors.append('audit top-level schema/order')
    for key, value in expected.items():
        if key != 'audits' and (key not in audit or audit[key]!=value):
            errors.append(f'audit {key}')
    if not isinstance(audit.get('audits'),list) or len(audit['audits'])!=len(expected['audits']):
        return errors+['audit rows count']
    for actual, canonical in zip(audit['audits'],expected['audits']):
        if list(actual)!=list(canonical):
            errors.append(f"{canonical['path_id']}: key order")
        stop, raw=inputs['stops'][canonical['path_id']]
        derived=recompute_completeness(actual,stop,raw,inputs['candidate_table'])
        if actual.get('completeness_checks')!=derived or actual.get('candidate_set_complete')!=(all(derived.values()) and not actual.get('contract_stop_codes')):
            errors.append(f"{canonical['path_id']}: independently derived completeness")
        for key, value in canonical.items():
            if key not in actual or actual[key]!=value:
                errors.append(f"{canonical['path_id']}: {key}")
    return errors


def validate_contract(contract: dict) -> list[str]:
    expected=build_contract()
    return [key for key in expected if key not in contract or contract[key]!=expected[key]] + (['key order'] if list(contract)!=list(expected) else [])


def recompute_completeness(row: dict, stop: dict, raw: bytes, templates: dict) -> dict[str,bool]:
    """Recompute each of the twelve requirements without reading stored checks/boolean."""
    flags={name:False for name in CHECKS}
    try:
        verify_source_artifact(stop,raw,EXPECTED[stop['path_id']])
        flags['source_artifact_integrity_valid']=True
        view=project_normal_action_information(stop)
        context={'round':view['round'],'turn_player':view['turn_player'],'actor':view['actor'],'phase':view['phase'],'decision_kind':stop['decision_kind'],'choice_kind':stop['choice_kind']}
        flags['opportunity_context_valid']=row.get('opportunity_context')==context and context['decision_kind']=='normal_action' and context['choice_kind']=='normal_action'
        owner=view['players'][view['actor']]
        public={k:v for k,v in view['players'].items() if k!=view['actor']}
        flags['information_boundary_valid']=(row.get('owner_state')==owner and row.get('public_information')==public and row.get('forbidden_information_used')==[] and row.get('information_policy')=='public_and_owner_known_only')
        inventory=inventory_sources(view)
        saved_inventory=row.get('source_inventory')
        flags['required_source_families_present']=isinstance(saved_inventory,list) and [i.get('family') for i in saved_inventory]==list(FAMILIES)
        flags['source_inventory_complete']=saved_inventory==inventory
        unit_baseline=expand_units(view,inventory,templates)
        flags['candidate_templates_complete']=True
        actual=row.get('enumeration_units')
        expected=adjudicate_units(view,unit_baseline,build_contract())
        if isinstance(actual,list):
            flags['information_boundary_valid'] = flags['information_boundary_valid'] and len(actual)==len(expected) and all(a.get('evidence')==e['evidence'] and a.get('source_references')==e['source_references'] for a,e in zip(actual,expected))
            identities=lambda collection: [(u.get('source_family'),u.get('source_id'),u.get('action_type'),u.get('candidate_variant')) for u in collection]
            flags['candidate_variants_complete']=identities(actual)==identities(expected)
            targets=lambda collection: [(u.get('enumeration_unit_id'),u.get('target_instance_ids')) for u in collection]
            flags['target_expansions_complete']=targets(actual)==targets(expected)
            flags['canonical_predicates_resolved']=True
            flags['dispositions_and_reasons_valid']=actual==expected
            flags['stable_candidate_ids_valid']=all(u.get('candidate_id')==e['candidate_id'] for u,e in zip(actual,expected)) and len(actual)==len(expected)
        ids,details=derive_legal_candidates(expected)
        flags['legal_candidate_projection_exact']=row.get('legal_candidate_ids')==ids and row.get('legal_candidate_details')==details and ids.count('pass')==1
    except (ValueError,KeyError,TypeError,IndexError):
        pass
    return flags


def canonical_bytes(value: dict) -> bytes:
    return (json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode('utf-8')


def check_materialized(folder: Path, inputs: dict) -> list[str]:
    expected={'contract.json':build_contract(),'audit.json':build_audits(inputs)}
    errors=[]
    for filename, value in expected.items():
        path=Path(folder)/filename
        if not path.is_file() or path.read_bytes()!=canonical_bytes(value):
            errors.append(filename.split('.')[0]+' bytes')
    return errors


def main() -> int:
    import argparse
    parser=argparse.ArgumentParser(description=__doc__)
    mode=parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--write',action='store_true')
    mode.add_argument('--check',action='store_true')
    args=parser.parse_args()
    inputs=load_inputs()
    folder=DATA
    files={'contract.json':'proxy-normal-action-candidate-completeness-contract-121-20260923.json','audit.json':'proxy-normal-action-candidate-completeness-audit-121-20260923.json'}
    if args.write:
        (folder/files['contract.json']).write_bytes(canonical_bytes(build_contract()))
        (folder/files['audit.json']).write_bytes(canonical_bytes(build_audits(inputs)))
    else:
        for short,long in files.items():
            actual=folder/long
            expected=canonical_bytes(build_contract() if short=='contract.json' else build_audits(inputs))
            if not actual.is_file() or actual.read_bytes()!=expected:
                raise ValueError(f'{long}: builder bytes differ')
        if validate_contract(json.loads((folder/files['contract.json']).read_bytes())) or validate_audit(json.loads((folder/files['audit.json']).read_bytes()),inputs):
            raise ValueError('validator rejected saved JSON')
    return 0

if __name__=='__main__':
    raise SystemExit(main())
