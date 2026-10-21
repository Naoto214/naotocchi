"""Complete public candidate inventory and fail-closed certain-result proofs."""
import copy
import itertools
from contextlib import ExitStack, contextmanager
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_resource_value_trajectory as old
import proxy_resource_value_shadow as shadow
from proxy_resource_value_comparison import validate_problem
from proxy_resource_value_selection import select_problem, canonical_sha256

UNIT_ADJUDICATOR=None
ADMITTED_ID_ADAPTER=None
NORMAL_PROJECTION=None
MAIN_TRANSITION_ADAPTER=None
HISTORY_ADAPTER=None
PUBLIC_HISTORY_PROJECTION=None


@contextmanager
def classification_scope(envelope, table):
    registry=old.candidates.BOARD_ABILITY_REGISTRY
    original=copy.deepcopy(registry)
    try:
        with ExitStack() as stack:
            for scope in (old.normal_board_scope,old.partner.partner_response_scope,old.goat.partner_response_scope,old.triggered.trigger_scope):
                stack.enter_context(scope(table))
            game=envelope['legacy_continuation']['game_state']
            for p in game['players'].values():
                for source in [p['board']['main'],*p['board']['prepared']]:
                    if not source: continue
                    card=game['cards'][source]['card_id']; cap=rules.classification(card)
                    registry[card]=dict(kind=cap['kind'],source_text_reference=cap['reference'])
                world=p['board']['world']
                if world and game['cards'][world]['card_id'] in rules.CAPABILITIES:
                    card=game['cards'][world]['card_id'];cap=rules.classification(card)
                    registry[card]=dict(kind=cap['kind'],source_text_reference=cap['reference'])
            yield
    finally:
        registry.clear();registry.update(original)


def _detail(unit, reasons, identifier, **extra):
    row={k:copy.deepcopy(v) for k,v in unit.items() if k!='template'}
    row.update(reason_codes=list(reasons),disposition='excluded' if reasons else 'admitted',
        candidate_id=None if reasons else identifier,evidence=extra,
        source_references=[unit['template']['source_text_reference']] if unit['template'] else ['01-core-rules.md'])
    return row


def audit(envelope, history):
    state.validate(envelope);game=envelope['legacy_continuation']['game_state'];actor=game['turn_player']
    if game['phase']!='normal_action': raise ValueError('not a normal opportunity')
    if HISTORY_ADAPTER is None and any('challenge' in e.get('action_type','') for e in history): raise ValueError('challenge history not certified')
    # Current candidate adapters cannot inspect concealed preparation. Equipment
    # is fully public and has a source-bound independent-action classification.
    if NORMAL_PROJECTION is None and any(not r['face_up'] for r in envelope['runtime']['public_prepared'].values()):
        raise ValueError('concealed preparation candidate adapter unavailable')
    projected=NORMAL_PROJECTION(envelope) if NORMAL_PROJECTION is not None else envelope
    game=projected['legacy_continuation']['game_state']
    table=rules.table();player=game['players'][actor];board=player['board']
    public_history=dict(normal_challenge_losses_by_actor=HISTORY_ADAPTER(game,history) if HISTORY_ADAPTER else [],last_valid_event_seq=envelope['event_seq'],source_refs=['01-core-rules.md'])
    view=old.candidates.project_normal_action_information(dict(game_state=game,actor=actor),public_history)
    view['_candidate_table']=table
    view['_verified_ability_uses']={s:[1] if rules.used(envelope,s,'activated_normal_action') else [] for s in board['companions']}
    allowed={r['card_id'] for r in table['cards'] if r['card_type']=='main'}
    with classification_scope(projected,table):
        units=old.normal_audit.board.expand_units(view,table)
        result=[]
        for unit in units:
            if UNIT_ADJUDICATOR is not None:
                admitted=UNIT_ADJUDICATOR(envelope,unit)
                if admitted is not None:result.extend(admitted);continue
            kind=unit['action_type'];variant=unit['candidate_variant'];source=unit['source_instance_id']
            if kind=='play_main':
                current=game['cards'][board['main']]['card_id'] if board['main'] else None
                proof=rules.main_transition(current,unit['card_id'],variant,player['time'],allowed)
                if MAIN_TRANSITION_ADAPTER is not None:proof=MAIN_TRANSITION_ADAPTER(envelope,unit,proof)
                result.append(_detail(unit,proof['reason_codes'],f'candidate-play-main-{source}-{variant}',**proof))
            elif kind in ('attach_item','set_item'):
                targets=unit['target_instance_ids'];template=unit['template']
                reasons=[]
                if kind=='attach_item' and not targets: reasons.append('required_target_absent')
                if len(board['prepared'])>=3: reasons.append('preparation_slots_full')
                for option in rules.cost_options(envelope,unit,template['base_time_cost']):
                    excluded=reasons+(['insufficient_time'] if option['payment_time']>player['time'] else [])
                    cid=f'candidate-{kind}-{source}'+(''.join('-target-'+s for s in targets))
                    if option['cost_modifiers']:cid+='-discount-'+option['cost_modifiers'][0]['source_instance_id']
                    row=_detail(unit,excluded,cid,**option)
                    row['enumeration_unit_id'] += ':'+canonical_sha256(option)
                    result.append(row)
            elif kind in ('challenge','relationship'):
                try: result.extend(old.candidates.adjudicate_units(view,[unit],{}))
                except ValueError as error:
                    if str(error)!='missing_candidate_id_grammar: legal action':raise
                    result.append(_detail(unit,[],f'candidate-{kind}-{actor}-{variant}'))
            else:
                try: result.extend(old.normal_audit.board.adjudicate_units(view,[unit]))
                except ValueError as error:
                    # A legal challenge/relationship must remain visible even
                    # when its certain-result/execution proof is unsupported.
                    if str(error)!='missing_candidate_id_grammar: legal action' or kind not in ('challenge','relationship'): raise
                    result.append(_detail(unit,[],f'candidate-{kind}-{actor}-{variant}'))
    if ADMITTED_ID_ADAPTER is not None:result=ADMITTED_ID_ADAPTER(envelope,result,history)
    details=sorted((r for r in result if r['disposition']=='admitted'),key=lambda r:r['candidate_id'])
    ids=[r['candidate_id'] for r in details]
    if len(ids)!=len(set(ids)) or ids.count('pass')!=1: raise ValueError('candidate identity collision')
    return dict(candidate_set_complete=True,legal_candidate_ids=ids,legal_candidate_details=details,
        enumeration_units=result,public_history=[PUBLIC_HISTORY_PROJECTION(e,actor) if PUBLIC_HISTORY_PROJECTION else {k:e[k] for k in ('seq','action_type','actor') if k in e} for e in history],
        view_sha256=canonical_sha256(state.visible(envelope,actor)))


def placement_certificate(envelope, action):
    """A slot/cost certificate alone does not establish arrival-effect safety."""
    game=envelope['legacy_continuation']['game_state'];owner=game['players'][game['turn_player']]
    source=action['source_instance_id']
    with old.placements.partner_placement_scope():
        entry=old.extension.PLACEMENT_TEXT.get(action['card_id'])
        if entry is None:raise ValueError('placement trigger classification unavailable')
        reference,kind=entry;rules.source_section(reference)
        if 'while_egg_suppressed' in kind and owner['board']['main'] is not None:
            raise ValueError('placement trigger requires non-egg resolution adapter')
        if any(p['board']['world'] for p in game['players'].values()):
            raise ValueError('placement trigger from world not certified')
        cert=old.start.opening._placement_for_card(source,game['cards'][source],rules.table(),owner['board'])
        if cert is None or cert['candidate_id']!=action['candidate_id']:
            raise ValueError('placement certain-effect proof unavailable')
        return cert


def _scores(envelope, inventory):
    game=envelope['legacy_continuation']['game_state'];actor=game['turn_player'];owner=game['players'][actor]
    if any(p['growth']>=100 or p['reservations'] for p in game['players'].values()) or \
            envelope['legacy_continuation']['pending_triggers'] or envelope['legacy_continuation']['activation_zone']:
        raise ValueError('upper-priority or pending-effect proof unavailable')
    scores=[];certificates=[];table=rules.table()
    with old.placements.partner_placement_scope():
        for action in inventory['legal_candidate_details']:
            cid=action['candidate_id'];kind=action['action_type'];cost=0;source=action['source_instance_id']
            if kind=='pass': pass
            elif kind in ('place_companion','place_partner'):
                cert=placement_certificate(envelope,action)
                certificates.append(cert)
            elif kind=='attach_item':
                rules.classification(action['card_id'])
                cost=action['evidence']['payment_time']
            elif kind=='set_item':
                # Existing I-poop1 text establishes no immediate growth effect.
                body,_=rules.source_section(action['source_references'][0])
                if action['card_id']!='I-poop1' or '相手がメインを除去する効果を発動した時' not in body:
                    raise ValueError('set effect proof unavailable')
                cost=action['evidence']['payment_time']
            elif kind=='play_main':
                cap=rules.classification(action['card_id'])
                if cap['kind']!='cost_modifier': raise ValueError('main arrival effects unproved')
                cost=action['evidence']['payment_time']
            else: raise ValueError('certain-result proof unavailable: '+kind)
            scores.append(dict(candidate_id=cid,avoid_loss_or_abort=0,maintain_or_prevent_100=0,
                certain_growth_difference=0,time_after_certain_resolution=owner['time']-cost,
                payment_time=cost,consumed_card_count=0,card_copy_id=game['cards'][source]['card_copy_id'] if source else ''))
    return scores,certificates


def _borrow_problem(envelope, inventory, inputs):
    if inputs is None or any(envelope['runtime'].values()):return None
    game=envelope['legacy_continuation']['game_state']
    if game['players'][game['turn_player']]['board']['main'] is not None:return None
    if any(p['board']['world'] for p in game['players'].values()):return None
    history=dict(normal_challenge_losses_by_actor=[],last_valid_event_seq=envelope['event_seq'],
        source_refs=sorted(inputs['source_raw_sha256']))
    try:
        boundary=old._normal_evidence_boundary(state.current(envelope),inputs,history)
        prior=shadow._inputs(boundary)[0]
    except ValueError as error:
        # A historical target scope mismatch is an expected coverage boundary;
        # integrity errors and unknown source mutations must not be swallowed.
        if str(error)!='historical scoped inventory differs from fresh adapter; comparison held':raise
        return None
    fields=('candidate_id','action_type','candidate_variant','source_instance_id','card_id','target_instance_ids')
    identity=lambda ds:[{k:d[k] for k in fields} for d in ds]
    if identity(boundary['decision']['legal_candidate_details'])!=identity(inventory['legal_candidate_details']):return None
    return prior,boundary


def problem(envelope,inventory,context,inputs=None):
    fresh=audit(envelope,inventory['public_history'])
    if fresh!=inventory: raise ValueError('candidate inventory differs from fresh reconstruction')
    game=envelope['legacy_continuation']['game_state']
    if context['actor']!=game['turn_player'] or context['round']!=game['round']:raise ValueError('choice context differs')
    borrowed=_borrow_problem(envelope,inventory,inputs)
    if borrowed:
        result=copy.deepcopy(borrowed[0]);result['view_sha256']=inventory['view_sha256']
        for pair in result['pairs']:pair['view_sha256']=result['view_sha256']
        result['candidate_set_evidence']['state_ref']=result['view_sha256']
        return result
    scores,certs=_scores(envelope,inventory);vh=inventory['view_sha256'];pairs=[]
    upper_keys=('avoid_loss_or_abort','maintain_or_prevent_100','certain_growth_difference')
    best=max(tuple(s[k] for k in upper_keys) for s in scores)
    upper=sorted(s['candidate_id'] for s in scores if tuple(s[k] for k in upper_keys)==best)
    for left,right in itertools.combinations(upper,2):
        row=dict(left_id=left,right_id=right,view_sha256=vh,kind='ordinary',
            relations=dict(hand='incomparable',board='incomparable',reservations='incomparable'),
            reason='source-bound action effects; future resource advantage not ordered',source_refs=['01-core-rules.md','02-main-system.md'])
        cert=next((c for c in certs if {left,right}=={'pass',c['candidate_id']}),None)
        if cert: row.update(kind='certified_safe_free_development',safe_placement=cert)
        pairs.append(row)
    result=dict(view_sha256=vh,legal_candidate_ids=inventory['legal_candidate_ids'],
        candidate_set_evidence=dict(candidate_set_complete=True,source_ref='01-core-rules.md',state_ref=vh,
            enumeration_rule=state.CONTRACT+' complete source units from current public view'),
        candidates=scores,pairs=pairs,seed_context=copy.deepcopy(context))
    errors=validate_problem(result)
    if errors:raise ValueError('; '.join(errors))
    return result


def select(envelope,inventory,context,policy,inputs=None):
    p=problem(envelope,inventory,context,inputs)
    if policy=='public_result_equivalence_pilot_v1':
        from proxy_equivalence_trajectory import select_normal
        choice=select_normal(envelope,inventory,p)['choice'];chosen=choice['selected_candidate']
    elif policy==old.POLICIES[1]:
        choice=select_problem(p);chosen=choice['selected_candidate']
    elif policy==old.POLICIES[0] and _borrow_problem(envelope,inventory,inputs):
        prior,boundary=_borrow_problem(envelope,inventory,inputs)
        choice=shadow.legacy_select(boundary,prior);chosen=choice['selected_candidate']
    elif policy==old.POLICIES[0]:
        scores,certs=_scores(envelope,inventory);ids=p['legal_candidate_ids']
        scores={s['candidate_id']:dict(s,value_comparison_to={}) for s in scores}
        winners=[cid for cid in ids if all(cid==other or shadow.priority.compare_candidates(scores[cid],scores[other])['winner']=='left' for other in ids)]
        if len(winners)==1:chosen=winners[0];choice=dict(selected_candidate=chosen,resolution_mode='priority_unique')
        elif certs:
            if any(shadow.priority.compare_candidates(scores[c['candidate_id']],scores[cid])['winner']!='left'
                   for c in certs for cid in ids if cid!='pass' and cid not in {c['candidate_id'] for c in certs}):
                raise ValueError('legacy paid exclusion proof unavailable')
            seed=copy.deepcopy(context);seed['choice_kind']='zero_cost_person_placement'
            choice=shadow.fallback.resolve_safe_free_development(certs,seed,ids)
            if 'error' in choice:raise ValueError(str(choice))
            chosen=choice['selected_candidate']
        else:raise ValueError('legacy fallback contract not applicable')
    else:raise ValueError('unknown policy')
    return dict(policy_id=policy,selected_candidate=chosen,choice=choice,problem=p,
        selected_action=copy.deepcopy(next(d for d in inventory['legal_candidate_details'] if d['candidate_id']==chosen)),
        candidate_set_complete=True,inventory=copy.deepcopy(inventory),context=copy.deepcopy(context))
