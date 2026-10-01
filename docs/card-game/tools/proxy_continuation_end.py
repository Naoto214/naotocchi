"""Source-bound end bridge; legacy six-stage audits and handlers remain authoritative."""
import copy
from contextlib import contextmanager
import proxy_continuation_state as state
import proxy_continuation_rules as rules
import proxy_continuation_candidates as candidates
import proxy_continuation_actions as actions
import proxy_continuation_runner as runner
import proxy_resource_value_trajectory as old

COVERAGE='continuation_end_bridge_v1'
BIND_KEYS={'execution_contract_id','envelope_before_sha256','envelope_after_sha256'}


def end_classification(card):
    cap=rules.classification(card)
    if (cap['kind'],cap['timing']) not in (('cost_modifier','set_item_payment'),('triggered','own_turn_start')):
        raise ValueError('end timing/expiration capability unavailable: '+card)
    # These source-bound capabilities have no end trigger or turn-duration effect.
    return cap


def start_regular(current):
    """01/02/64: one ordinary draw for an existing main, no egg exchange."""
    game=current['game_state'];actor=game['turn_player'];owner=game['players'][actor]
    core=(rules.ROOT/'01-core-rules.md').read_text();main=(rules.ROOT/'02-main-system.md').read_text()
    if 'ターン開始時1枚ドロー' not in core or '通常ドロー後もたまごならさらに1枚引き' not in main:
        raise ValueError('ordinary start draw canonical rule differs')
    if game['phase']!='turn_start' or owner['board']['main'] is None or owner['reservations'] or current['pending_triggers'] or current['activation_zone']:
        raise ValueError('ordinary start boundary unproved')
    inventory=old.reached.classify_next_board(game,actor)
    after=copy.deepcopy(current);p=after['game_state']['players'][actor]
    p.update(time=game['round'],challenge_used=False,person_placed=False,relationship_progressed=False)
    if p['deck']:p['hand'].append(p['deck'].pop(0))
    after['game_state']['phase']='response_window';after['return_target']='normal_action_opportunity'
    after['response_context']=dict(source_phase='response_window',phase='response_window',window_kind='turn_start',
        origin_event_seq=current['last_event_seq']+1,turn_player=actor,priority_actor=actor,
        chain_status='empty',chain_links=[],consecutive_passes=0,response_opportunity_index=1,
        decision_kind='response_action',choice_kind='reaction_or_pass')
    generated=[];old.reached.provenance._append_transition(current,after,generated,[],'turn_start_and_normal_draw',actor)
    old._verify_generated(current,after,generated)
    return after,generated[0],inventory


def replay_regular_start(row,proof,initial):
    if not proof['turn_end_set_complete'] or proof['contract_stop_codes'] or not all(proof['completeness_checks'].values()):
        raise ValueError('ordinary next start needs complete six-stage proof')
    current=old.reached.current(row);game=current['game_state'];actor=game['turn_player'];next_actor='B' if actor=='A' else 'A'
    if game['round']==10 and actor!=initial['first_player']:raise ValueError('R10 must compare instead of start')
    after=copy.deepcopy(current);after['game_state'].update(turn_player=next_actor,phase='turn_start')
    if actor!=initial['first_player']:after['game_state']['round']+=1
    after['return_target']=None;events=[];shots=[]
    old.reached.provenance._append_transition(current,after,events,[],'turn_end_completed',actor)
    old._verify_generated(current,after,events);shots.append(old._snapshot(after))
    final,event,inventory=start_regular(after);events.append(event);shots.append(old._snapshot(final))
    return dict(final_continuation_state=old.start._payload(final),last_valid_event_seq=final['last_event_seq'],
        new_events=events,new_snapshots=shots,new_decisions=[],completed=False,next_actor_board_inventory=inventory)


def verify_new_events(events, shots, runtime_shots):
    by_seq={s['event_seq']:s for s in shots};envelopes={e['event_seq']:e for e in runtime_shots}
    if len(by_seq)!=len(shots) or len(envelopes)!=len(runtime_shots):raise ValueError('duplicate history snapshot')
    if len(shots)!=len(events)+1 or [e['seq'] for e in events]!=list(range(1,shots[-1]['event_seq']+1)):
        raise ValueError('end history event/snapshot coverage differs')
    proofs=[]
    for event in events:
        seq=event['seq'];before=by_seq[seq-1];after=by_seq[seq]
        if old.start.opening._stop_state_sha256(before['game_state'])!=event.get('game_state_before_sha256',event.get('state_before_sha256')) or \
                old.start.opening._stop_state_sha256(after['game_state'])!=event.get('game_state_after_sha256',event.get('state_after_sha256')):
            raise ValueError('end history game hash differs')
        if seq>=3:
            if before['continuation_state'] is None or after['continuation_state'] is None or \
                    old.start._hash(before['continuation_state'])!=event['continuation_state_before_sha256'] or \
                    old.start._hash(after['continuation_state'])!=event['continuation_state_after_sha256']:
                raise ValueError('end history continuation hash differs')
        if seq>=3:
            if seq-1 not in envelopes or seq not in envelopes:raise ValueError('runtime history coverage absent')
            for point,legacy in ((envelopes[seq-1],before),(envelopes[seq],after)):
                state.validate(point)
                if point['legacy_continuation']!=legacy['continuation_state']:raise ValueError('runtime/legacy history differs')
            if event['action_type']!='attach_item' and envelopes[seq-1]['runtime']!=envelopes[seq]['runtime']:
                raise ValueError('unclassified runtime change in history')
        if event['action_type']=='turn_start_and_normal_draw':
            continuation,generated,_=start_regular(state.current(envelopes[seq-1]))
            if state.advance(envelopes[seq-1],continuation,seq)!=envelopes[seq] or generated!=event:
                raise ValueError('ordinary draw provenance replay differs')
        if event['action_type'] not in ('play_main_birth','attach_item'):continue
        if seq-1 not in envelopes or seq not in envelopes:raise ValueError('runtime history coverage absent')
        prior=envelopes[seq-1];actual=envelopes[seq];state.validate(prior);state.validate(actual)
        if prior['legacy_continuation']!=before['continuation_state'] or actual['legacy_continuation']!=after['continuation_state']:
            raise ValueError('runtime/legacy history differs')
        inventory=candidates.audit(prior,[])
        action=next((a for a in inventory['legal_candidate_details'] if a['candidate_id']==event['selected_candidate']),None)
        if action is None:raise ValueError('history action not in full legal inventory')
        cap=end_classification(action['card_id'])
        if event['action_type']=='attach_item':expected,generated=actions.attach(prior,action)
        else:
            if cap['kind']!='cost_modifier':raise ValueError('birth arrival capability unproved')
            continuation,generated=old.normal.transition(state.current(prior),dict(selected_action=action,selected_candidate=action['candidate_id'],candidate_set_complete=True),{})
            expected=state.advance(prior,continuation,seq)
        raw={k:v for k,v in generated[0].items() if k not in BIND_KEYS}
        if expected!=actual or raw!=event:raise ValueError('new placement provenance replay differs')
        proofs.append(dict(event_seq=seq,card_id=action['card_id'],kind=event['action_type'],
            source_reference=cap['reference'],source_raw_sha256=cap['source_raw_sha256'],
            envelope_before_sha256=state.state_hash(prior),envelope_after_sha256=state.state_hash(actual)))
    return proofs


@contextmanager
def end_scope(envelope, events, shots, runtime_shots):
    """Add only independently classified sources, then restore all legacy registries."""
    state.validate(envelope);game=envelope['legacy_continuation']['game_state']
    board=old.reached.provenance.contract_123.BOARD_REGISTRY;registry=old.reached.provenance.TEXT_REGISTRY
    originals=(copy.deepcopy(board),copy.deepcopy(registry),old.reached.ORIGINAL_CLASSIFY)
    try:
        for p in game['players'].values():
            for source in [p['board']['main'],*p['board']['prepared']]:
                if not source:continue
                if source in p['board']['prepared'] and not envelope['runtime']['public_prepared'][source]['face_up']:
                    raise ValueError('concealed preparation end proof unavailable')
                card=game['cards'][source]['card_id'];cap=end_classification(card)
                board[card]=('not_end_trigger',cap['reference'])

        def classify_next(game, actor):
            projected=copy.deepcopy(game);b=projected['players'][actor]['board'];extra=[]
            sources=[b['main'],*b['prepared']]
            for source in sources:
                if not source:continue
                card=game['cards'][source]['card_id'];cap=end_classification(card)
                if source==b['main']:
                    if cap['kind']!='cost_modifier':raise ValueError('next main start trigger unavailable')
                    b['main']=None;kind='not_turn_start_trigger'
                else:
                    if source not in envelope['runtime']['attachments']:raise ValueError('unproved start equipment relation')
                    b['prepared'].remove(source);kind='own_turn_start_after_draw_and_egg'
                extra.append(dict(source_instance_id=source,card_id=card,trigger_kind=kind,source_reference=cap['reference']))
            return originals[2](projected,actor)+extra
        old.reached.ORIGINAL_CLASSIFY=classify_next
        registry['turn_start_and_normal_draw']=dict(growth_delta=0,duration='none',reference='01-core-rules.md')
        for proof in verify_new_events(events,shots,runtime_shots) if events else []:
            registry.setdefault(proof['kind'],{})[proof['card_id']]=dict(growth_delta=0,duration='none',reference=proof['source_reference'])

        yield
    finally:
        board.clear();board.update(originals[0]);registry.clear();registry.update(originals[1])
        old.reached.ORIGINAL_CLASSIFY=originals[2]


def forced(envelope, initial, events, shots, runtime_shots):
    state.validate(envelope)
    if not runtime_shots or runtime_shots[-1]!=envelope:raise ValueError('current runtime history boundary differs')
    phase=envelope['legacy_continuation']['game_state']['phase'];capture={}
    original=old.terminal.replay_end
    def replay(row,proof):
        g=row['final_continuation_state']['game_state'];actor=g['turn_player'];next_actor='B' if actor=='A' else 'A'
        if g['players'][next_actor]['board']['main'] is not None and not (g['round']==10 and actor!=initial['first_player']):
            result=replay_regular_start(row,proof,initial)
        else:result=original(row,proof)
        capture.update(copy.deepcopy(proof));return result
    with end_scope(envelope,events,shots,runtime_shots):
        try:
            if phase=='turn_end':old.terminal.replay_end=replay
            # Standard end, draw, mandatory choice and existing resolutions.
            # Every returned intermediate state must preserve the exact runtime.
            result=runner._forced(state.current(envelope),initial,events,shots)
            previous=envelope
            for shot in result['new_snapshots']:
                previous=state.advance(previous,shot['continuation_state'],shot['event_seq'])
            if phase=='turn_end':
                result['end_evidence']=dict(capture,envelope_sha256=state.state_hash(envelope),
                    new_event_proofs=verify_new_events(events,shots,runtime_shots))
            return result
        finally:old.terminal.replay_end=original
