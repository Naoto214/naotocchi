"""Conditional current107 start group effects, using existing resolvers.

A supplied opening proof is checked for binding, not authenticated as a real
turn start. The runtime must construct that origin from actual transitions.
"""
import copy
from contextlib import contextmanager
import proxy_population_start_obligations as starts
import proxy_population_start_effects as effects
import proxy_population_boundary_response as boundary
import proxy_continuation_batch as batch
import proxy_continuation_state as state
import proxy_continuation_triggers as triggers
import proxy_continuation_rules as rules
from proxy_mandatory_policy_contract import canonical

_ACTIVE=None


def start_draw_descriptor(link):
    """77 I-bowtie: own-turn-start single draw with no target, variant or cost.

    The frozen batch registry has no row for this card. Its capability is the
    pinned current107 start catalog row (section + raw sha, re-verified on every
    call) joined with the frozen rules fragments -- the same facts scope()
    installs around the actual resolution. Activation legality and effect
    execution keep their own audits; this only closes the resolution-time
    choice obligation.
    """
    if link.get('card_id')!='I-bowtie' or link.get('source_zone')!='board' or link.get('action_type')!='activate_board_ability':raise ValueError('start draw link differs')
    if canonical(link.get('payment'))!=canonical(dict(time=0)) or link.get('target_instance_ids')!=[] or link.get('candidate_variant') is not None:raise ValueError('start draw activated link differs')
    row=starts.catalog()['cards']['I-bowtie']
    if row['start_kind']!='own_start_hand_at_most_two_draw':raise ValueError('start equipment source contract differs')
    cap=rules.classification('I-bowtie')
    if cap['kind']!='triggered' or cap['timing']!='own_turn_start' or cap['ability_key']!='start_draw' or cap['reference']!=row['reference'] or cap['source_raw_sha256']!=row['source_raw_sha256']:raise ValueError('start draw capability differs')
    return dict(kind='triggered',timing='own_turn_start',reference=row['reference'],source_raw_sha256=row['source_raw_sha256'],semantic_section_sha256=row['section_sha256'],draw_count=1)

def validate_opening(envelope,proof):
    expected=starts.collect(proof['capture'],envelope)
    if canonical(proof)!=canonical(expected):raise ValueError('start occurrence proof binding differs')
    return dict(origin_authenticated=False,conditional_source_binding_verified=True)


@contextmanager
def scope(proof):
    global _ACTIVE
    if _ACTIVE is not None:raise ValueError('start connection reentry forbidden')
    catalog=starts.catalog();original=triggers.DRAW_EFFECTS;original_caps=copy.deepcopy(batch.CAPABILITIES);_ACTIVE=copy.deepcopy(proof)
    try:
        #77 I-bowtie is exactly one draw; reuse the existing draw handler.
        triggers.DRAW_EFFECTS=dict(original,**{'I-bowtie':1})
        row=catalog['cards']['I-bowtie']
        batch.CAPABILITIES['I-bowtie']=dict(kind='triggered',timing='own_turn_start',reference=row['reference'],semantic_section_sha256=row['section_sha256'])
        yield
    finally:
        triggers.DRAW_EFFECTS=original;batch.CAPABILITIES.clear();batch.CAPABILITIES.update(original_caps);_ACTIVE=None


def resolve(envelope,initial):
    if _ACTIVE is None:raise ValueError('start occurrence connection absent')
    current=state.current(envelope);ctx=current['response_context'];link=current['activation_zone'][-1]
    if current['game_state']['turn_player']!=_ACTIVE['capture']['turn_player'] or ctx['window_kind']!='turn_start' or ctx['origin_event_seq']!=_ACTIVE['origin_event_seq']:
        raise ValueError('start effect processing origin differs')
    occurrences=[o for o in _ACTIVE['occurrences'] if o['source_instance_id']==link['source_instance_id']]
    if len(occurrences)!=1 or link['card_id'] not in ('C-chicken','I-bowtie') or link['source_zone']!='board' or link['action_type']!='activate_board_ability':raise ValueError('start effect source outside captured group')
    if link['card_id']=='C-chicken':result=effects.resolve_chicken(current,initial)
    else:
        if canonical(link['payment'])!=canonical(dict(time=0)) or link['target_instance_ids'] or link['candidate_variant'] is not None:raise ValueError('start draw activated link differs')
        result=triggers.resolve(current,initial)
    return boundary.normalize(envelope,result,dict(kind='start',turn_player=current['game_state']['turn_player'],origin_event_seq=_ACTIVE['origin_event_seq']))
