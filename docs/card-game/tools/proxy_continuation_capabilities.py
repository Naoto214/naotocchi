"""Opt-in source-bound future-trigger classification and immediate main evidence.

A placement certificate never certifies the future trigger's execution. Scope
contains all new semantics; historical435/434 adapters remain default.
"""
import copy
import re
from contextlib import contextmanager
import proxy_continuation_rules as rules
import proxy_continuation_candidates as candidates
import proxy_continuation_state as state
import proxy_continuation_board_links as board_links

CAPABILITIES={
    'M-beetle-02':dict(kind='triggered',timing='own_turn_end',ability_key='end_topdeck_order',
        reference='31-beetle-stagbeetle-card-master-migration.md#M-beetle-02',
        fragments=['1ターンに1回','自分のターン終了時','このターンこのメインがときおくりでこの段階になっていない場合','発動できる','山札上1枚を見て、一番上か一番下に置く'],
        optional=True,uses_per_instance_turn=1,arrival_trigger=False),
    'M-antlion-06':dict(kind='triggered',timing='after_own_quick_effect_applied',ability_key='quick_world_exchange',
        reference='55-insect-three-lines-card-text-draft.md#M-antlion-06',
        fragments=['1ターンに1回','自分のターンに','「すぐつかう」でプレイした自分のカードの効果が適用された時','発動できる','自分の捨て札のセカイ1枚を対象'],
        optional=True,uses_per_instance_turn=1,arrival_trigger=False),
}


def classification(card):
    if card not in CAPABILITIES:raise ValueError('future-trigger capability unproved: '+card)
    row=copy.deepcopy(CAPABILITIES[card]);body,digest=rules.source_section(row['reference'])
    if not all(fragment in body for fragment in row.pop('fragments')):
        raise ValueError('future-trigger canonical text changed')
    allowed={r['card_id'] for r in rules.table()['cards'] if r['card_type']=='main'}
    _,stage=rules.main_identity(card,allowed)
    labels=[body.splitlines()[0]]+re.findall(r'^- 表示：(.+)$',body,re.M)
    marks={ch for label in labels for ch in label if ch in '①②③④⑤⑥⑦⑧'}
    if marks!={'①②③④⑤⑥⑦⑧'[stage-1]}:raise ValueError('future-trigger canonical stage differs')
    return dict(row,source_raw_sha256=digest)


def arrival_certificate(envelope,action):
    state.validate(envelope);game=envelope['legacy_continuation']['game_state'];actor=game['turn_player'];owner=game['players'][actor]
    cap=classification(action['card_id'])
    if action['action_type']!='play_main' or cap['arrival_trigger']:
        raise ValueError('main arrival classification unavailable')
    if any(p['board']['world'] for p in game['players'].values()):
        raise ValueError('main arrival world triggers unproved')
    if envelope['legacy_continuation']['pending_triggers'] or envelope['legacy_continuation']['activation_zone']:
        raise ValueError('main arrival pending effects unproved')
    # Verify exact action identity, lineage, target and payment with the complete
    # current public inventory; caller-supplied payment evidence is not authority.
    with scope():inventory=candidates.audit(envelope,[])
    if not any(state.canonical_sha256(a)==state.canonical_sha256(action) for a in inventory['legal_candidate_details']):
        raise ValueError('main arrival action differs from full legal inventory')
    current=owner['board']['main'];departure=None
    if current:
        if any(r['target_instance_id']==current for r in envelope['runtime']['attachments'].values()):
            raise ValueError('main departure equipment effects unproved')
        card=game['cards'][current]['card_id'];departure=rules.classification(card)
        if (departure['kind'],departure['timing'])!=('cost_modifier','set_item_payment') and card not in CAPABILITIES:
            raise ValueError('main departure effects unproved')
    return dict(contract_id='main_immediate_outcome_v1',actor=actor,
        candidate_id=action['candidate_id'],source_instance_id=action['source_instance_id'],
        current_main_instance_id=current,payment_time=action['evidence']['payment_time'],
        certain_growth_difference=0,source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'],
        capability=cap,departure_capability=departure,view_sha256=state.canonical_sha256(state.visible(envelope,actor)),
        effect_execution_certified=False,future_trigger_execution_certified=False)


@contextmanager
def scope(evidence=None):
    """Share truthful classification and delegate unchanged non-main scoring."""
    original_registry=copy.deepcopy(rules.CAPABILITIES);original_scores=candidates._scores
    try:
        for card in CAPABILITIES:classification(card)
        rules.CAPABILITIES.update(copy.deepcopy(CAPABILITIES))
        def scores(envelope,inventory):
            extra=[a for a in inventory['legal_candidate_details'] if a['action_type']=='play_main' and a['card_id'] in CAPABILITIES]
            proofs=[arrival_certificate(envelope,a) for a in extra]
            delegated=copy.deepcopy(inventory)
            delegated['legal_candidate_details']=[a for a in delegated['legal_candidate_details'] if a not in extra]
            # This is an internal scoring partition, never a legal inventory
            # output. Every original candidate is returned exactly once.
            existing,certs=original_scores(envelope,delegated)
            by_id={s['candidate_id']:s for s in existing};g=envelope['legacy_continuation']['game_state'];owner=g['players'][g['turn_player']]
            for action,proof in zip(extra,proofs):
                cost=proof['payment_time'];source=action['source_instance_id']
                by_id[action['candidate_id']]=dict(candidate_id=action['candidate_id'],avoid_loss_or_abort=0,
                    maintain_or_prevent_100=0,certain_growth_difference=0,time_after_certain_resolution=owner['time']-cost,
                    payment_time=cost,consumed_card_count=0,card_copy_id=g['cards'][source]['card_copy_id'])
                if evidence is not None:evidence.append(dict(event_seq=envelope['event_seq'],proof=proof))
            return [by_id[a['candidate_id']] for a in inventory['legal_candidate_details']],certs
        candidates._scores=scores
        with board_links.scope():yield
    finally:
        rules.CAPABILITIES.clear();rules.CAPABILITIES.update(original_registry);candidates._scores=original_scores
