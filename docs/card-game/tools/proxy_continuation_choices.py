"""Complete seeded effect choices under the existing 116 fallback contract."""
import copy
import itertools
import json
import proxy_resource_value_trajectory as old


def resolve(initial, current, actor, options, kind, occurrence):
    fallback = old.shadow.fallback
    encoded = {json.dumps(option, ensure_ascii=False, sort_keys=True,
                          separators=(',', ':')): copy.deepcopy(option)
               for option in options}
    if len(encoded) != len(options) or not encoded or not occurrence:
        raise ValueError('effect choice options or occurrence differ')
    details = [dict(candidate_id=key, kind='effect_choice',
                    action_type='choose_effect_option', option=encoded[key])
               for key in sorted(encoded)]
    ids = [detail['candidate_id'] for detail in details]
    game = current['game_state']
    context = dict(contract_version=fallback.CONTRACT_VERSION,
                   order_id=initial['order_id'], actor=actor,
                   actor_turn_index=game['round'], round=game['round'],
                   phase=game['phase'], decision_kind='mandatory_choice',
                   choice_kind=kind+':'+occurrence)
    proof = fallback.build_seed_proof(context, ids)
    selected = proof['selected_candidate']
    record = dict(decision_kind='mandatory_choice', resolution_mode='seeded_fallback',
                  strategic_unresolved=True, reason_code='strategic_unresolved_seeded_fallback',
                  legal_candidates=ids, legal_candidate_details=details,
                  candidate_set_complete=True,
                  candidate_set_evidence=dict(source_ref='116-normal-decision-fallback-contract.md',
                      state_ref=old.start._hash(current),
                      enumeration_rule='all legal effect options from the permitted information'),
                  seeded_fallback_candidates=ids, seed_context=context,
                  seed_proof=proof, selected_candidate=selected,
                  selected_action=next(d for d in details if d['candidate_id']==selected),
                  runner_up_candidates=[key for key in ids if key!=selected])
    errors = fallback.validate_seeded_resolution(record)
    if errors:
        raise ValueError('effect choice invalid: '+str(errors))
    return record


def revealed_search_options(revealed, eligible, maximum):
    if len(revealed)!=len(set(revealed)) or not set(eligible)<=set(revealed):
        raise ValueError('revealed search identities differ')
    return [dict(take=list(take), bottom=list(bottom))
            for count in range(min(maximum, len(eligible))+1)
            for take in itertools.combinations(sorted(eligible), count)
            for bottom in itertools.permutations(s for s in revealed if s not in take)]
