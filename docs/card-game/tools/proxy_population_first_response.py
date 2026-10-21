"""Complete local first-response inventory for the fixed 107 deck edition.

No response selection, MRP dispatch, or proof of later opportunities.
"""
import copy
import hashlib
from proxy_mandatory_policy_contract import ROOT,canonical,load_json
from proxy_population_contract import source_path
from proxy_population_opening import verify_sources,reconstruct_opening
import proxy_normal_decision_seeded_restart as opening
import proxy_start_response_138 as start
import proxy_response_window_contract as response

HAND_TYPES={'play_main','place_companion','place_partner','place_world','attach_item','set_item',
            'use_play','use_item','use_event'}
NON_HAND_TYPES={'activate_companion_ability','trigger_prepared_item'}
ABSENT_TARGETS={'E-first-date':'no_own_partner_target','G-asteroids-classic':'no_own_prepared_equipment',
                'G-basketball-3d':'no_own_main_target','G-beach-volley':'no_own_main_target'}
ABSENT_CHALLENGE={'G-air-hockey','G-baseball-batting'}


def enumerate_first_response(game,actor,root=ROOT):
    verify_sources(root);canonical(game)
    try:
        if actor not in ('A','B') or game['turn_player']!=actor or type(game['round']) is not int or game['round']!=1 or game['phase']!='response_window':
            raise ValueError('first response game context differs')
        errors=opening._stop_state_integrity_errors(game)
        if errors:raise ValueError('first response state invalid: '+'; '.join(errors))
        empty=dict(main=None,companions=[],partner=None,partner_stage=None,world=None,prepared=[])
        for owner,p in game['players'].items():
            expected_time=1 if owner==actor else 0
            if type(p['time']) is not int or p['time']!=expected_time or type(p['growth']) is not int or p['growth']!=20 or canonical(p['board'])!=canonical(empty) or p['discard'] or p['reservations'] or any(p[k] is not False for k in ('challenge_used','person_placed','relationship_progressed')):
                raise ValueError('first response initial resources/board differ')
            if len(p['hand'])!=(6 if owner==actor else 5) or len(p['deck'])!=(34 if owner==actor else 35):
                raise ValueError('first response initial zones differ')
        fixture=load_json(source_path(root,'data/proxy-fixtures-107/fixture-107-normal-decision-a-first.json'))
        allowed={c['card_id'] for p in fixture['input']['players'] for c in p['deck_order_top_to_bottom']}
        if any(c['card_id'] not in allowed for c in game['cards'].values()):
            raise ValueError('card outside fixed 107 edition')
        rows={r['card_id']:r for r in load_json(source_path(root,'data/proxy-normal-decision-candidate-table-114-20260918.json'))['cards']}
        legal=[response.build_response_pass_detail()];excluded=[];p=game['players'][actor]
        for instance in p['hand']:
            card=game['cards'][instance]['card_id'];row=rows[card]
            if any(a['action_type'] not in HAND_TYPES|NON_HAND_TYPES for a in row['actions']):
                raise ValueError('unproved action family')
            actions=[a for a in row['actions'] if a['action_type'] in HAND_TYPES]
            if len(actions)!=1:raise ValueError('hand family coverage differs')
            action=actions[0];kind=action['action_type'];reason=None
            if kind not in ('use_play','use_item','use_event'):reason='not_hand_quick_use'
            elif type(action['base_time_cost']) is not int or action['base_time_cost']<0:raise ValueError('unproved response cost')
            elif p['time']<action['base_time_cost']:reason='insufficient_time'
            elif card in ABSENT_TARGETS:reason=ABSENT_TARGETS[card]
            elif card in ABSENT_CHALLENGE:reason='no_active_challenge'
            elif card=='G-hit-blow':
                if action['candidate_variants']!=list(start.VARIANTS) or action['target_rule']!='declare one of seven card types; no card target':raise ValueError('declaration contract differs')
                legal.extend(start._hand_detail(game,actor,instance,row,action,v) for v in start.VARIANTS)
            elif card=='I-c_coin2':
                if action['candidate_variants']!=['single_no_target'] or action['target_rule']!='no target; reveal deck top if present':raise ValueError('coin contract differs')
                legal.append(start._hand_detail(game,actor,instance,row,action))
            else:raise ValueError('affordable first response condition unproved: '+card)
            if reason:excluded.append(dict(source_zone='hand',source_instance_id=instance,card_id=card,reason_code=reason))
        excluded.append(dict(source_zone='prepared',source_instance_id=None,card_id=None,reason_code='no_prepared_activation_present'))
        legal.sort(key=lambda d:d['candidate_id']);ids=[d['candidate_id'] for d in legal]
        if len(ids)!=len(set(ids)):raise ValueError('response stable ID collision')
        return dict(schema='first_response_inventory_466.v1',actor=actor,legal_candidate_ids=ids,
                    legal_candidate_details=legal,excluded_candidates=excluded,
                    inspected_information=response._information_snapshot(game,actor),forbidden_information_used=[],
                    completeness_scope='first_107_response_given_supplied_initial_boundary',
                    entry_authenticated=False,selection_evaluated=False,policy_eligible=None,balance_admitted=None)
    except (KeyError,TypeError,AttributeError) as error:
        raise ValueError('malformed first response state') from error


def build_first_response(bundle,match_id,root=ROOT):
    prefix=reconstruct_opening(bundle,match_id,root)
    envelope=prefix['final_envelope'];g=envelope['legacy_continuation']['game_state'];actor=g['turn_player']
    inventory=enumerate_first_response(g,actor,root)
    return dict(schema='planned_first_response_record_466.v1',decision_kind='response_action',
                match_id=match_id,supplied_bundle_sha256=prefix['initial']['supplied_bundle_sha256'],
                reconstructed_prefix_sha256=hashlib.sha256(canonical(prefix)).hexdigest(),
                envelope_sha256=prefix['final_envelope_sha256'],inventory=inventory,
                candidate_count=len(inventory['legal_candidate_ids']),
                selection_basis='not_evaluated',selected_candidate=None,policy_eligible=None,balance_admitted=None)


def audit_first_response(record,bundle,match_id,root=ROOT):
    errors=[]
    try:
        expected=build_first_response(bundle,match_id,root)
        if canonical(record)!=canonical(expected):errors.append('first response inventory/binding differs')
    except ValueError as error:errors.append(str(error))
    return dict(candidate_binding_verified=not errors,errors=errors,policy_eligible=None,balance_admitted=None,
                checks_scope='first_response_candidates_given_supplied_bundle_only',
                gaps=['input_lock_unauthenticated','response_selection_unproved','later_opportunity_coverage_unverified',
                      'whole_match_and_population_unverified'],ready_for_execution=False)
