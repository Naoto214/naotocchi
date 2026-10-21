"""Source-bound world placement outcomes; future world execution stays unproved.

Opt-in extension of432's complete-candidate contract. No route or copy IDs
appear in semantics. Historical scorers/handlers are restored on scope exit.
"""
import copy
import hashlib
import re
from contextlib import contextmanager
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_continuation_candidates as candidates
import proxy_continuation_actions as actions

CAPABILITIES={
    'W-deepsea':dict(kind='continuous',timing='while_own_hand_at_most_two',
        reference='89-world-13-card-text-draft.md#W-deepsea',payment_time=2,arrival_trigger=False,
        semantic_section_sha256='d42ef3002f697268d8b86ff05819b9b21e7d024b827d61c39d8ef88065db12d2',
        ability_text='自分の手札が2枚以下の間、自分のメインのちから・ちえ+1。',
        fragments=['- 時：2','自分の手札が2枚以下の間、自分のメインのちから・ちえ+1','継続効果','期限付きの一度きりの補正ではない']),
}


def classification(card):
    if card not in CAPABILITIES:raise ValueError('world placement capability unproved: '+card)
    row=copy.deepcopy(CAPABILITIES[card]);body,digest=rules.source_section(row['reference'])
    # Bind every semantic note as well as the printed rule. Source edits must
    # explicitly update this reviewed descriptor before a zero outcome is used.
    if hashlib.sha256(body.encode()).hexdigest()!=row['semantic_section_sha256']:
        raise ValueError('world semantic section changed; classification requires review')
    if not all(fragment in body for fragment in row.pop('fragments')):
        raise ValueError('world placement canonical text changed')
    if re.findall(r'^> (.+)$',body,re.M)!=[row['ability_text']] or re.findall(r'^- 時：(\d+)$',body,re.M)!=[str(row['payment_time'])]:
        raise ValueError('world placement ability/cost text is not the classified rule')
    rows=[r for r in rules.table()['cards'] if r['card_id']==card and r['card_type']=='world']
    if len(rows)!=1:raise ValueError('world outside approved available pool')
    templates=[a for a in rows[0]['actions'] if a['action_type']=='place_world']
    if len(templates)!=1:raise ValueError('world placement template ambiguous')
    template=templates[0]
    if type(template['base_time_cost']) is not int or template['base_time_cost']!=row['payment_time'] or template['source_text_reference']!=row['reference']:
        raise ValueError('world cost/source differs from canonical capability')
    return dict(row,source_raw_sha256=digest)


def _ready(envelope):
    state.validate(envelope);payload=envelope['legacy_continuation'];game=payload['game_state']
    if game['phase']!='normal_action':raise ValueError('world placement outside normal action')
    if payload['activation_zone'] or payload['pending_triggers'] or any(p['growth']>=100 or p['reservations'] for p in game['players'].values()):
        raise ValueError('world placement upper-priority or pending effects unproved')
    # Current coverage proves initial placement only. Never project away an old
    # world to manufacture departure, play-count or continuous-effect evidence.
    if any(p['board']['world'] for p in game['players'].values()):
        raise ValueError('existing world departure/continuous effects unproved')
    return game


def placement_certificate(envelope,action):
    game=_ready(envelope);actor=game['turn_player'];cap=classification(action['card_id'])
    if action['action_type']!='place_world' or cap['arrival_trigger']:
        raise ValueError('world immediate outcome unavailable')
    inventory=candidates.audit(envelope,[])
    if not any(state.canonical_sha256(a)==state.canonical_sha256(action) for a in inventory['legal_candidate_details']):
        raise ValueError('world action differs from full legal inventory')
    source=action['source_instance_id'];owner=game['players'][actor];cost=cap['payment_time']
    if source not in owner['hand'] or game['cards'][source]['card_id']!=action['card_id'] or owner['time']<cost:
        raise ValueError('world source/payment preconditions differ')
    return dict(contract_id='world_immediate_outcome_v1',actor=actor,
        candidate_id=action['candidate_id'],source_instance_id=source,payment_time=cost,
        previous_world_instance_id=None,certain_growth_difference=0,capability=cap,
        source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'],
        view_sha256=state.canonical_sha256(state.visible(envelope,actor)),
        future_continuous_execution_certified=False,safe_free_development_certified=False)


def place(envelope,action):
    proof=placement_certificate(envelope,action);actor=proof['actor'];source=proof['source_instance_id']
    after=copy.deepcopy(envelope);after['event_seq']+=1
    owner=after['legacy_continuation']['game_state']['players'][actor]
    owner['time']-=proof['payment_time'];owner['hand'].remove(source);owner['board']['world']=source
    actions._placement_window(after,actor);state.validate(after)
    before_c=state.current(envelope);after_c=state.current(after)
    event=dict(seq=after['event_seq'],action_type='place_world',actor=actor,
        selected_candidate=action['candidate_id'],source_instance_id=source,
        payment_time=proof['payment_time'],source_reference=proof['source_reference'],
        effect_classification='continuous_world_initial_placement',
        game_state_before_sha256=actions.old.start.opening._stop_state_sha256(before_c['game_state']),
        game_state_after_sha256=actions.old.start.opening._stop_state_sha256(after_c['game_state']),
        continuation_state_before_sha256=actions.old.start._hash(before_c),
        continuation_state_after_sha256=actions.old.start._hash(after_c))
    return after,[actions.bind_event(envelope,after,event)]


@contextmanager
def scope(evidence=None):
    original_scores=candidates._scores;original_apply=actions.apply;original_response=actions.response_inventory
    try:
        for card in CAPABILITIES:classification(card)
        def scores(envelope,inventory):
            extra=[a for a in inventory['legal_candidate_details'] if a['action_type']=='place_world' and a['card_id'] in CAPABILITIES]
            proofs=[placement_certificate(envelope,a) for a in extra]
            if evidence is not None:evidence.extend(dict(event_seq=envelope['event_seq'],proof=proof) for proof in proofs)
            delegated=copy.deepcopy(inventory)
            delegated['legal_candidate_details']=[a for a in delegated['legal_candidate_details'] if a not in extra]
            existing,certs=original_scores(envelope,delegated)
            by_id={s['candidate_id']:s for s in existing};g=envelope['legacy_continuation']['game_state'];owner=g['players'][g['turn_player']]
            for action,proof in zip(extra,proofs):
                by_id[action['candidate_id']]=dict(candidate_id=action['candidate_id'],avoid_loss_or_abort=0,
                    maintain_or_prevent_100=0,certain_growth_difference=0,time_after_certain_resolution=owner['time']-proof['payment_time'],
                    payment_time=proof['payment_time'],consumed_card_count=0,card_copy_id=g['cards'][action['source_instance_id']]['card_copy_id'])
            return [by_id[a['candidate_id']] for a in inventory['legal_candidate_details']],certs
        def apply(envelope,record,inputs):
            action=record.get('selected_action',{})
            if action.get('action_type')!='place_world' or action.get('card_id') not in CAPABILITIES:return original_apply(envelope,record,inputs)
            rebuilt=candidates.select(envelope,record['inventory'],record['context'],record['policy_id'],inputs)
            if state.canonical_sha256(rebuilt)!=state.canonical_sha256(record):raise ValueError('world normal decision changed before execution')
            return place(envelope,action)
        def response(envelope,initial,events):
            if any(p['board']['world'] for p in envelope['legacy_continuation']['game_state']['players'].values()):
                raise ValueError('world continuous response adapter unavailable')
            return original_response(envelope,initial,events)
        candidates._scores=scores;actions.apply=apply;actions.response_inventory=response
        yield
    finally:
        candidates._scores=original_scores;actions.apply=original_apply;actions.response_inventory=original_response
