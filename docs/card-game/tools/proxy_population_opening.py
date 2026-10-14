"""Source-bound reconstruction of the planned 107 initial/first-turn boundary.

Offline validation API only. No sampling, population runner, or admission grant.
"""
import copy
import hashlib
from proxy_mandatory_policy_contract import ROOT, canonical, load_json
from proxy_population_contract import source_path
from proxy_mandatory_population_input import audit_input_bundle
import proxy_normal_decision_seeded_restart as opening

SOURCES='data/proxy-population-opening-466/sources.json'
SOURCES_SHA='200cd56e3959869b5920529e8998b3b148de3d19ee188d5f8ab8521821c4d71f'


def verify_sources(root=ROOT):
    try:
        path=source_path(root,SOURCES)
        if hashlib.sha256(path.read_bytes()).hexdigest()!=SOURCES_SHA:
            raise ValueError('opening source anchor differs')
        for name,digest in load_json(path)['sources_sha256'].items():
            if hashlib.sha256(source_path(root,name).read_bytes()).hexdigest()!=digest:
                raise ValueError('opening source differs: '+name)
    except OSError as error:
        raise ValueError('opening source unavailable') from error


def load_match(bundle,match_id,root=ROOT):
    verify_sources(root)
    checked=audit_input_bundle(bundle,root)
    if not checked['structure_verified']:
        raise ValueError('supplied bundle invalid: '+'; '.join(checked['errors']))
    rows=[row for row in bundle['matches'] if row['match_id']==match_id]
    if len(rows)!=1:raise ValueError('planned match absent')
    row=rows[0];group=next(g for g in bundle['groups'] if g['group_id']==row['group_id'])
    route=dict(players=[dict(player_id=a,deck_order_top_to_bottom=copy.deepcopy(group['full_order_'+a])) for a in 'AB'])
    game=opening.build_initial_state(route)
    errors=opening._stop_state_integrity_errors(game)
    if errors:raise ValueError('initial state invalid: '+'; '.join(errors))
    return dict(schema='planned_initial_state_466.v1',match_id=match_id,group_id=row['group_id'],
                first_player=row['first_player'],policy_input_sha256=row['policy_input_sha256'],
                supplied_bundle_sha256=hashlib.sha256(canonical(bundle)).hexdigest(),
                source_manifest_sha256=SOURCES_SHA,initial_game_state=game,
                initial_game_state_sha256=opening._stop_state_sha256(game),
                initial_full_state_sha256=hashlib.sha256(canonical(game)).hexdigest(),
                input_lock_verified=False,balance_admitted=None,policy_eligible=None)


def reconstruct_opening(bundle,match_id,root=ROOT):
    """Reconstruct only the first-turn boundary from supplied, unlocked inputs.

    No historical route loader, saved choice, previous response seed profile,
    or caller-provided origin address is accepted by this API.
    """
    from proxy_mandatory_population_input import build_bound_local_record
    import proxy_continuation_state as continuation
    from proxy_record_validator import canonical_sha256
    initial=load_match(bundle,match_id,root)
    actor=initial['first_player'];game=copy.deepcopy(initial['initial_game_state'])
    evidence=dict(events=[],snapshots=[dict(seq=0,state_sha256=opening._stop_state_sha256(game),
                                          state=opening._canonical_stop_state(game))])
    game.update(round=1,turn_player=actor,phase='egg_exchange_choice')
    player=game['players'][actor]
    player.update(time=1,challenge_used=False,person_placed=False,relationship_progressed=False)
    # 107 fixes a complete forty-card initial deck, with five initially dealt.
    # Consequently the first ordinary draw and egg draw each have a card.
    ordinary=player['deck'].pop(0);player['hand'].append(ordinary)
    intermediate=copy.deepcopy(game)
    frame=dict(schema='mandatory_rule_slice_input.v1',choice_contract_id='egg_exchange_bottom',
               actor=actor,entry='after_normal_draw',source_instance_id=None,target_instance_id=None,
               game_state=intermediate)
    address=[actor,1,actor,'turn_start',0,'egg_exchange_bottom','selection',0]
    record=build_bound_local_record(bundle,match_id,frame,address,root)
    application=record['local_record']['application'];boundary=application['boundary']
    before_choice=boundary['choice_game_state']
    opening._append_replay_event(evidence,before_choice,'turn_start_and_egg_draw',actor)
    selected=next(d for d in boundary['candidate_details'] if d['candidate_id']==application['selected_candidate'])
    final_game=copy.deepcopy(application['local_after_game_state']);final_game['phase']='response_window'
    opening._append_replay_event(evidence,final_game,'egg_exchange_bottom',actor,
                                match_id+':first-egg-choice',selected['instance_id'])
    errors=opening._stop_state_integrity_errors(final_game)
    if errors:raise ValueError('opening final state invalid: '+'; '.join(errors))
    payload=dict(game_state=final_game,activation_zone=[],pending_triggers=[],return_target='normal_action_opportunity',
                 response_context=dict(source_phase='response_window',phase='response_window',window_kind='turn_start',
                    origin_event_seq=2,turn_player=actor,priority_actor=actor,chain_status='empty',chain_links=[],
                    consecutive_passes=0,response_opportunity_index=1,decision_kind='response_action',choice_kind='reaction_or_pass'))
    envelope=continuation.create(payload,2)
    if envelope['schema']!='naotocchi.card_game.continuation_envelope.v1' or envelope['execution_contract_id']!='continuation_contract_v1':
        raise ValueError('opening requires unmodified continuation v1 scope')
    ledger=dict(schema='initial_turn_obligations_466.v1',scope='107_initial_prefix_only',
                rules=['01-core-rules.md','02-main-system.md','64-turn-boundaries-and-victory-timing.md'],
                turn_counts={a:1 if a==actor else 0 for a in 'AB'},
                steps=[dict(kind='first_turn_reset',actor=actor,time=1),
                       dict(kind='ordinary_draw',actor=actor,instance_id=ordinary),
                       dict(kind='egg_additional_draw',actor=actor,instance_id=boundary['prefix_operations'][0]['instance_id']),
                       dict(kind='mandatory_choice',address=address,candidate_ids=boundary['candidate_ids']),
                       dict(kind='response_boundary',actor=actor,event_seq=2)],
                opening_reservations=[],opening_board_trigger_sources=[])
    return dict(schema='planned_opening_reconstruction_466.v1',initial=initial,
                normal_draw_intermediate=intermediate,mandatory_record=record,opening_obligations=ledger,
                events=evidence['events'],snapshots=evidence['snapshots'],final_envelope=envelope,
                final_envelope_sha256=canonical_sha256(envelope),
                next_opportunity=dict(kind='response_action',actor=actor,status='unproved',
                                      reason='response_candidates_selection_and_continuation_not_audited'),
                completed=False,policy_promoted=False,policy_eligible=None,balance_admitted=None,
                independent_balance_samples=0,input_lock_verified=False,
                checks_scope='source_bound_first_turn_reconstruction_given_supplied_bundle')


def audit_opening(record,bundle,match_id,root=ROOT):
    errors=[]
    try:
        expected=reconstruct_opening(bundle,match_id,root)
        if canonical(record)!=canonical(expected):
            errors.append('opening record differs from source-bound input reconstruction')
    except (ValueError,OSError) as error:
        errors.append(str(error))
    verified=not errors
    return dict(schema='planned_opening_audit_466.v1',opening_verified=verified,
                first_turn_obligation_binding_verified=verified,
                first_mandatory_candidate_binding_verified=verified,
                errors=errors,checks_scope='107_initial_prefix_given_supplied_bundle_only',
                gaps=['input_lock_unauthenticated','policy_root_provenance_unverified',
                      'historical_input_registry_unverified','execution_source_edition_unfixed',
                      'first_response_and_continuation_unverified','later_opportunity_coverage_unverified',
                      'whole_match_and_population_unverified'],
                input_lock_verified=False,policy_eligible=None,balance_admitted=None,
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
        result=audit_opening(load_json(args.record),load_json(args.bundle),args.match)
        code=1 if result['opening_verified'] else 2
    except (OSError,ValueError,UnicodeError) as error:
        result=dict(errors=[str(error)],policy_eligible=None,balance_admitted=None,
                    ready_for_input_generation=False,ready_for_execution=False)
        code=2
    print(canonical(result).decode())
    return code


if __name__=='__main__':raise SystemExit(main())
