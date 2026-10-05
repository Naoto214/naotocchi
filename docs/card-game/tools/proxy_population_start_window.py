"""Conditional initial response proof bridge. Not a population/game runner."""
import copy
import hashlib
from proxy_mandatory_policy_contract import ROOT,canonical,load_json
from proxy_population_contract import source_path
import proxy_population_first_response as first
import proxy_response_window_contract as response
import proxy_response_window_seeded_restart as legacy

SOURCES='data/proxy-population-start-window-467/sources.json'
SOURCES_SHA='a6d7f764652e15007c59c91bf7e67198be0a18a15e3ebc50a56d51f2884394c6'


def verify_sources(root=ROOT):
    try:
        path=source_path(root,SOURCES)
        if hashlib.sha256(path.read_bytes()).hexdigest()!=SOURCES_SHA:
            raise ValueError('start window source anchor differs')
        for name,digest in load_json(path)['sources_sha256'].items():
            if hashlib.sha256(source_path(root,name).read_bytes()).hexdigest()!=digest:
                raise ValueError('start window source differs: '+name)
    except OSError as error:
        raise ValueError('start window source unavailable') from error


def _context(first_player,actor):
    return dict(source_phase='response_window',phase='response_window',window_kind='turn_start',
                origin_event_seq=2,turn_player=first_player,priority_actor=actor,chain_status='empty',
                chain_links=[],consecutive_passes=0 if actor==first_player else 1,
                response_opportunity_index=1 if actor==first_player else 2,
                decision_kind='response_action',choice_kind='reaction_or_pass')


def assess_initial_response(game,first_player,actor,root=ROOT):
    """Conditional on initial state; second actor additionally assumes first pass.

    Only reconstruct_initial_window authenticates that pass locally; the bundle
    wrapper binds the initial prefix. No arbitrary supplied inventory is accepted.
    """
    verify_sources(root)
    if actor not in ('A','B'):raise ValueError('invalid priority actor')
    inventory=first.enumerate_first_response(game,first_player,root)
    if actor!=first_player:
        rows={r['card_id']:r for r in load_json(source_path(root,'data/proxy-normal-decision-candidate-table-114-20260918.json'))['cards']}
        excluded=[]
        for instance in game['players'][actor]['hand']:
            card=game['cards'][instance]['card_id'];actions=rows[card]['actions']
            if any(a['action_type'] not in first.HAND_TYPES|first.NON_HAND_TYPES for a in actions):
                raise ValueError('unproved second actor action family')
            hand=[a for a in actions if a['action_type'] in first.HAND_TYPES]
            if len(hand)!=1:raise ValueError('unproved second actor hand coverage')
            action=hand[0]
            if action['action_type'] in ('use_play','use_item','use_event'):
                if type(action['base_time_cost']) is not int or action['base_time_cost']<1:
                    raise ValueError('unproved zero-time response')
                reason='insufficient_time'
            else:reason='not_hand_quick_use'
            excluded.append(dict(source_zone='hand',source_instance_id=instance,card_id=card,reason_code=reason))
        excluded.append(dict(source_zone='prepared',source_instance_id=None,card_id=None,reason_code='no_prepared_activation_present'))
        inventory=dict(schema='initial_second_response_inventory_467.v1',actor=actor,
            legal_candidate_ids=['response-pass'],legal_candidate_details=[response.build_response_pass_detail()],
            excluded_candidates=excluded,inspected_information=response._information_snapshot(game,actor),
            forbidden_information_used=[],completeness_scope='initial_zero_time_actor_after_first_pass_only',
            entry_authenticated=False,selection_evaluated=False,policy_eligible=None,balance_admitted=None)
    ids=inventory['legal_candidate_ids'];decision=None
    if ids==['response-pass']:
        opportunity=copy.deepcopy(inventory)
        opportunity.update(response_context=_context(first_player,actor),candidate_set_complete=True)
        # The singleton branch does not access route seeds or compare card values.
        decision=legacy.resolve_response_choice({},opportunity)
        if decision['resolution_mode']!='response_unique' or decision['seed_proof'] is not None:
            raise ValueError('singleton response contract differs')
    return dict(schema='initial_response_assessment_467.v1',inventory=inventory,decision=decision,
                selection_status='existing_contract_unique' if decision is not None else 'unproved',
                strategic_unproven=None if decision is not None else True,entry_authenticated=False,
                origin_assumption='initial_priority' if actor==first_player else 'after_first_actor_pass',
                legacy_fallback_disposition='excluded_if_used',policy_eligible=None,balance_admitted=None)


def reconstruct_initial_window(game,first_player,root=ROOT):
    """Rebuild a local response prefix, never execute a new match.

    Origin is conditional here. Full lookup is preserved in the envelope and
    whole-record audit; the legacy game hash alone intentionally omits it.
    """
    import proxy_continuation_state as continuation
    import proxy_start_response_138 as start
    from proxy_record_validator import canonical_sha256
    assessment=assess_initial_response(game,first_player,first_player,root)
    payload=dict(game_state=copy.deepcopy(game),response_context=_context(first_player,first_player),
                 activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity')
    envelope=continuation.create(payload,2)
    if envelope['schema']!='naotocchi.card_game.continuation_envelope.v1' or envelope['execution_contract_id']!='continuation_contract_v1':
        raise ValueError('start window requires unmodified continuation v1 scope')
    source=copy.deepcopy(envelope);current=continuation.current(envelope)
    snapshots=[dict(event_seq=2,game_state=copy.deepcopy(game),
                    game_state_sha256=start.opening._stop_state_sha256(game),
                    continuation_state=start._payload(current),continuation_state_sha256=current['continuation_state_sha256'])]
    opportunities=[];events=[]
    for actor in (first_player,'B' if first_player=='A' else 'A'):
        if actor!=first_player:assessment=assess_initial_response(current['game_state'],first_player,actor,root)
        # No caller context can skip an opportunity or impersonate the other side.
        if canonical(current['response_context'])!=canonical(_context(first_player,actor)):
            raise ValueError('initial response opportunity context differs')
        opportunities.append(assessment)
        if assessment['decision'] is None:break
        current,event,snapshot=start._pass(current,actor)
        events.append(event);snapshots.append(snapshot)
        envelope=continuation.advance(envelope,current,current['last_event_seq'])
    closed=current['game_state']['phase']=='normal_action'
    return dict(schema='initial_response_window_467.v1',source_envelope=source,
                source_envelope_sha256=canonical_sha256(source),opportunities=opportunities,
                events=events,snapshots=snapshots,final_envelope=envelope,
                final_envelope_sha256=canonical_sha256(envelope),
                stop_reason='normal_action_not_audited' if closed else 'response_selection_unproved',
                next_opportunity=dict(kind='normal_action' if closed else 'response_action',
                    actor=first_player,status='unproved'),
                window_closed=closed,entry_authenticated=False,
                checks_scope='initial_107_empty_response_window_given_local_boundary',
                completed=False,policy_promoted=False,policy_eligible=None,balance_admitted=None,
                ready_for_input_generation=False,ready_for_execution=False,independent_balance_samples=0)


def build_start_window(bundle,match_id,root=ROOT):
    from proxy_population_opening import reconstruct_opening
    verify_sources(root)
    prefix=reconstruct_opening(bundle,match_id,root)
    game=prefix['final_envelope']['legacy_continuation']['game_state']
    window=reconstruct_initial_window(game,prefix['initial']['first_player'],root)
    if canonical(window['source_envelope'])!=canonical(prefix['final_envelope']):
        raise ValueError('opening-to-window state binding differs')
    return dict(schema='planned_start_window_record_467.v1',match_id=match_id,
                supplied_bundle_sha256=prefix['initial']['supplied_bundle_sha256'],
                opening_sha256=hashlib.sha256(canonical(prefix)).hexdigest(),source_manifest_sha256=SOURCES_SHA,
                window=window,input_lock_verified=False,policy_eligible=None,balance_admitted=None,
                ready_for_input_generation=False,ready_for_execution=False,independent_balance_samples=0)


def audit_start_window(record,bundle,match_id,root=ROOT):
    errors=[];expected=None
    try:
        expected=build_start_window(bundle,match_id,root)
        if canonical(record)!=canonical(expected):errors.append('start window reconstruction differs')
    except (ValueError,OSError) as error:errors.append(str(error))
    verified=not errors
    closed=expected['window']['window_closed'] if verified else None
    gaps=['input_lock_unauthenticated','policy_root_provenance_unverified',
          'historical_input_registry_unverified','execution_source_edition_unfixed',
          'later_opportunity_coverage_unverified','whole_match_and_population_unverified']
    gaps.append('normal_action_not_audited' if closed is True else 'response_selection_unproved')
    return dict(schema='planned_start_window_audit_467.v1',record_verified=verified,errors=errors,
                window_closed=closed,checks_scope='initial_response_prefix_given_supplied_bundle_only',
                input_lock_verified=False,policy_eligible=None,balance_admitted=None,gaps=gaps,
                ready_for_input_generation=False,ready_for_execution=False,independent_balance_samples=0)


def main():
    import argparse
    from pathlib import Path
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bundle',type=Path,required=True)
    parser.add_argument('--record',type=Path,required=True)
    parser.add_argument('--match',required=True)
    args=parser.parse_args()
    try:
        result=audit_start_window(load_json(args.record),load_json(args.bundle),args.match)
        code=1 if result['record_verified'] else 2
    except (ValueError,OSError,UnicodeError) as error:
        result=dict(record_verified=False,errors=[str(error)],policy_eligible=None,balance_admitted=None,
                    ready_for_input_generation=False,ready_for_execution=False)
        code=2
    print(canonical(result).decode())
    return code


if __name__=='__main__':raise SystemExit(main())
