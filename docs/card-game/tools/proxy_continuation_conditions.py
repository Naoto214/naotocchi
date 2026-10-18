"""Public necessary-condition proofs, never a target/effect legality certificate.

Only an unmet prerequisite permits exclusion. A possible prerequisite leaves
all target, timing and resolution obligations outstanding. Concealed card
contents are deliberately absent from the observations used by this module.
"""
import hashlib
import re
from contextlib import contextmanager
import proxy_continuation_rules as rules
from proxy_resource_value_selection import canonical_sha256
import proxy_reached_mixed_contracts_401 as reached

CONTRACT='public_prerequisite_v1'
PREREQUISITES={
    'E-final-time':dict(reference='91-event-21-card-text-draft.md#E-final-time',
        fragment='自分のメインが⑧、または現在のラウンドがR10の場合',
        predicate='main_eight_or_round_ten',reason='requires_main_eight_or_r10'),
    'G-archery-3d':dict(reference='79-play-batch-1-card-text-draft.md#G-archery-3d',
        fragment='自分にセカイがある場合',predicate='world_present',reason='requires_own_world'),
    'E-fateful-transform':dict(reference='91-event-21-card-text-draft.md#E-fateful-transform',
        fragment='自分のメインがいる場合',predicate='main_present',reason='requires_own_main'),
    'G-asteroids-classic':dict(reference='83-play-batch-3-card-text-draft.md#G-asteroids-classic',
        fragment='自分の準備枠の時コスト3以上の装備カード1枚',
        predicate='prepared_present',reason='requires_own_prepared_target'),
}


def prove(card,game,actor):
    if card not in PREREQUISITES:return None
    if actor not in ('A','B'):raise ValueError('invalid prerequisite actor')
    if type(game['round']) is not int or not 1<=game['round']<=10:raise ValueError('invalid prerequisite round')
    descriptor=PREREQUISITES[card];body,digest=rules.source_section(descriptor['reference'])
    if descriptor['fragment'] not in body:raise ValueError('canonical prerequisite text changed: '+card)
    board=game['players'][actor]['board'];predicate=descriptor['predicate'];identity_sources={}
    if predicate=='main_eight_or_round_ten':
        stage=None
        if board['main'] is not None:
            allowed={r['card_id'] for r in rules.table()['cards'] if r['card_type']=='main'}
            main_card=game['cards'][board['main']]['card_id']
            _,stage=rules.main_identity(main_card,allowed)
            identity_sources[str(rules.TABLE.relative_to(rules.ROOT))]=hashlib.sha256(rules.TABLE.read_bytes()).hexdigest()
            entry=next(r for r in rules.table()['cards'] if r['card_id']==main_card)
            reference=next(a['source_text_reference'] for a in entry['actions'] if a['action_type']=='play_main')
            identity_body,source_digest=rules.source_section(reference)
            labels=[identity_body.splitlines()[0]]+re.findall(r'^- 表示：(.+)$',identity_body,re.M)
            marks={ch for label in labels for ch in label if ch in '①②③④⑤⑥⑦⑧'}
            if marks!={'①②③④⑤⑥⑦⑧'[stage-1]}:raise ValueError('canonical main stage identity differs')
            identity_sources[reference.split('#',1)[0]]=source_digest
        observations=dict(round=game['round'],main_stage=stage)
        possible=stage==8 or game['round']==10
    else:
        slot=predicate.removesuffix('_present');present=bool(board[slot])
        observations={slot+'_present':present};possible=present
    public=dict(card_id=card,actor=actor,predicate=predicate,observations=observations)
    return dict(contract_id=CONTRACT,**public,status='possible' if possible else 'unmet',
        source_reference=descriptor['reference'],source_raw_sha256=digest,
        public_input_sha256=canonical_sha256(public),identity_sources_sha256=identity_sources,target_and_effect_certified=False)


def validate(proof,card,game,actor):
    try:return [] if canonical_sha256(proof)==canonical_sha256(prove(card,game,actor)) else ['public prerequisite proof replay differs']
    except (ValueError,KeyError,TypeError) as error:return [str(error)]


def exclusion(card,game,actor):
    proof=prove(card,game,actor)
    if proof is None:return None
    if proof['status']!='unmet':raise ValueError('public prerequisite possible; target/effect adapter unavailable: '+card)
    return dict(card_id=card,reason_code=PREREQUISITES[card]['reason'],
        source_reference=proof['source_reference'],condition_proof=proof)


@contextmanager
def scope():
    """Opt-in replacement of the legacy egg-only proof; always restore default."""
    original=reached.conditional.conditional_exclusion
    try:
        reached.conditional.conditional_exclusion=exclusion
        yield
    finally:
        reached.conditional.conditional_exclusion=original
