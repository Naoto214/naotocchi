"""Read-only audit of saved 414 fallbacks. No decision rule or value inference.

Sensitivity overrides are deliberately unproved upper-bound probes, never
selection evidence. Action identity is only a narrow sufficient-proof screen.
"""
import copy
import hashlib
import json
from collections import Counter
import proxy_completed_comparison as saved
import proxy_normal_decision_hardening as legacy_priority
import proxy_normal_decision_fallback_contract as fallback
from proxy_resource_value_comparison import compare_problem
from proxy_resource_value_selection import select_problem

OLD, NEW = saved.OLD, saved.NEW
DEVELOPMENT = {'play_main', 'place_companion', 'place_partner', 'place_world', 'attach_item', 'set_item'}


def canonical(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False)+'\n').encode()


def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def pair_responsibility(left, right):
    a, b = left['action_type'], right['action_type']
    if 'pass' in (a, b):
        other = b if a == 'pass' else a
        return 'development_vs_hold' if other in DEVELOPMENT else 'progress_vs_hold' if other == 'relationship' else 'effect_vs_hold'
    if left['source_instance_id'] and left['source_instance_id'] == right['source_instance_id']:
        return 'same_source_target_or_variant'
    if a in DEVELOPMENT and b in DEVELOPMENT:
        return 'competing_development'
    return 'effect_or_progress_vs_other_resources'


def action_identity(action):
    return tuple(json.dumps(action[k], sort_keys=True) for k in
                 ('action_type','candidate_variant','source_instance_id','card_id','target_instance_ids'))


def verify_legacy(problem, result):
    """Recompute supported 114/116 outcomes; never run this for the 72 limits."""
    scores = {x['candidate_id']:dict(x,value_comparison_to={}) for x in problem['candidates']}
    ids = problem['legal_candidate_ids']
    winners = [cid for cid in ids if all(cid==other or legacy_priority.compare_candidates(scores[cid],scores[other])['winner']=='left' for other in ids)]
    if len(winners)==1:
        chosen=winners[0];mode='priority_unique';proof=None
    else:
        certs=[x['safe_placement'] for x in problem['pairs'] if x['kind']=='certified_safe_free_development']
        cert_ids={x['candidate_id'] for x in certs}
        if not certs or any(legacy_priority.compare_candidates(scores[c['candidate_id']],scores[x])['winner']!='left' for c in certs for x in ids if x!='pass' and x not in cert_ids):
            raise ValueError('supported legacy proof unavailable')
        context=copy.deepcopy(problem['seed_context']);context['choice_kind']='zero_cost_person_placement'
        selected=fallback.resolve_safe_free_development(certs,context,ids)
        if 'error' in selected:raise ValueError('legacy safe resolver failed')
        chosen=selected['selected_candidate'];mode=selected['resolution_mode'];proof=selected.get('seed_proof')
    if (result['selected_candidate']!=chosen or result['choice']['selected_candidate']!=chosen or
            result['choice']['resolution_mode']!=mode or result['choice'].get('seed_proof')!=proof):
        raise ValueError('legacy choice replay differs')


def audit(paired, shadow, limits):
    # Reuse 443's exact ID coverage, source-chain and unsupported-boundary checks.
    saved.summarize(paired, shadow, limits)
    runs = {r['run_id']: r for r in paired['results']}
    source_decisions = [((r['run_id'],d['event_seq']),d) for r in paired['results']
                        for d in r['decisions'] if 'inventory' in d]
    decisions = dict(source_decisions)
    if len(decisions) != len(source_decisions):
        raise ValueError('duplicate source normal decision')
    shots = {r['run_id']: {s['event_seq']: s for s in r['snapshots']} for r in paired['results']}
    expected = {f'439:{run}:normal:{seq}' for run, seq in decisions}
    if expected != set(shadow['planned_ids']):
        raise ValueError('source normal decision coverage differs')
    rows = []; unsupported = []; transitions = Counter(); groups = Counter()
    responsibility_pairs = Counter(); responsibility_decisions = Counter(); type_pairs = Counter()
    action_decisions = Counter(); variants = Counter(); state_counts = Counter(); reasons = Counter()
    total_pairs = 0; reproduced = 0; compared = 0; old_seeded = 0
    probe_fallback = 0; probe_changed = 0; identity_pairs = 0
    for r in sorted(shadow['results'], key=lambda r: r['shadow_id']):
        run_id, seq = r['source_run_id'], r['source_event_seq']
        d = decisions[(run_id, seq)]; envelope = shots[run_id][seq]
        if (r['shadow_id'] != f'439:{run_id}:normal:{seq}' or
                r['observed_policy'] != runs[run_id]['policy_id'] or
                r['path_id'] != runs[run_id]['path_id'] or
                d['problem'] != r['problem'] or digest(envelope) != r['source_envelope_sha256'] or
                digest(d['inventory']) != r['inventory_sha256'] or d['context'] != r['context']):
            raise ValueError('source decision/problem/snapshot binding differs')
        p = r['problem']; new = r['policies'][NEW]; old = r['policies'][OLD]
        if new['status'] != 'selected' or select_problem(p) != new['choice']:
            raise ValueError('pilot wrapper replay differs')
        action_by_id = {x['candidate_id']:x for x in d['inventory']['legal_candidate_details']}
        for result in r['policies'].values():
            if result['status'] != 'selected': continue
            if result['problem_sha256'] != digest(p):
                raise ValueError('policy problem digest differs')
            selected_id = result['selected_candidate']
            if (selected_id != result['choice']['selected_candidate'] or selected_id not in action_by_id or
                    result['selected_action'] != action_by_id[selected_id]):
                raise ValueError('outer selection/action binding differs')
        reproduced += 1
        if old['status'] == 'unsupported':
            unsupported.append(r['shadow_id']); continue
        if old['status'] != 'selected': raise ValueError('unexpected legacy status')
        verify_legacy(p,old)
        compared += 1; mode = old['choice']['resolution_mode']; basis = new['choice']['selection_basis']
        old_seeded += mode == 'seeded_fallback'; transitions[mode+' -> '+basis] += 1
        if basis != 'seeded_frontier': continue
        group = {'priority_unique':'legacy_time_unique', 'safe_free_development':'legacy_safe_free_unique',
                 'seeded_fallback':'already_seeded'}[mode]
        groups[group] += 1
        report = new['choice']['frontier_report']; frontier = set(report['frontier_ids'])
        actions = {x['candidate_id']: x for x in d['inventory']['legal_candidate_details']}
        scores = {x['candidate_id']: x for x in p['candidates']}
        # Prove the 'time' label instead of assigning it from a resolution-mode name.
        if mode == 'priority_unique':
            chosen = old['selected_candidate']; chosen_score = scores[chosen]
            upper = report['upper_priority_survivors']
            if chosen not in upper or any(chosen_score['time_after_certain_resolution'] <= scores[x]['time_after_certain_resolution'] for x in upper if x != chosen):
                raise ValueError('legacy time uniqueness not established')
        if mode == 'safe_free_development':
            chosen = old['selected_candidate']
            if not any(x['kind']=='certified_safe_free_development' and x['safe_placement']['candidate_id']==chosen for x in p['pairs']):
                raise ValueError('legacy safe certificate absent')
        pair_rows = []; labels = set(); local_types = Counter(); local_reasons = Counter()
        for x in p['pairs']:
            if x['left_id'] not in frontier or x['right_id'] not in frontier: continue
            a,b=x['left_id'],x['right_id']; label=pair_responsibility(actions[a],actions[b])
            labels.add(label);responsibility_pairs[label]+=1
            type_key=' / '.join(sorted((actions[a]['action_type'],actions[b]['action_type'])))
            type_pairs[type_key]+=1;local_types[type_key]+=1;local_reasons[x['reason']]+=1;reasons[x['reason']]+=1
            same=action_identity(actions[a])==action_identity(actions[b]);identity_pairs+=same
            result=next(y for y in report['pair_results'] if y['left_id']==a and y['right_id']==b)
            pair_rows.append(dict(left_id=a,right_id=b,responsibility=label,relations=result['relations'],
                                  relation=result['relation'],exact_action_identity=same))
        total_pairs += len(pair_rows)
        for label in labels: responsibility_decisions[label]+=1
        kinds=sorted({actions[x]['action_type'] for x in frontier})
        for kind in kinds:action_decisions[kind]+=1
        for kind in sorted({actions[x]['action_type']+':'+actions[x]['candidate_variant'] for x in frontier}):variants[kind]+=1
        game=envelope['legacy_continuation']['game_state'];actor=r['context']['actor'];owner=game['players'][actor]
        state=dict(round=game['round'],actor_time=owner['time'],own_egg=owner['board']['main'] is None,
                   opponent_egg=game['players']['B' if actor=='A' else 'A']['board']['main'] is None,
                   own_world=owner['board']['world'] is not None,own_prepared_count=len(owner['board']['prepared']),
                   own_hand_count=len(owner['hand']),own_companion_count=len(owner['board']['companions']),
                   own_partner=owner['board']['partner'] is not None,partner_stage=owner['board']['partner_stage'])
        for key in ('own_egg','opponent_egg','own_world','own_partner'):
            state_counts[key+':'+str(state[key]).lower()]+=1
        state_counts['round:'+str(state['round'])]+=1
        state_counts['actor_time:'+str(state['actor_time'])]+=1
        probe=copy.deepcopy(p)
        for x in probe['pairs']:
            if x['kind']=='ordinary': x['relations'].update(hand='equal',reservations='equal')
        relaxed=compare_problem(probe)
        remains=relaxed['selection_basis']=='seeded_frontier'
        probe_fallback+=remains;probe_changed+=relaxed['frontier_ids']!=report['frontier_ids']
        rows.append(dict(shadow_id=r['shadow_id'],source_run_id=run_id,source_event_seq=seq,
                         source_envelope_sha256=r['source_envelope_sha256'],problem_sha256=digest(p),
                         observed_policy=r['observed_policy'],path_id=r['path_id'],group=group,
                         public_state=state,frontier_ids=report['frontier_ids'],frontier_action_types=kinds,
                         frontier_actions=[actions[x] for x in sorted(frontier)],responsibilities=sorted(labels),
                         pairs=pair_rows,reasons=dict(local_reasons),pair_type_counts=dict(local_types),
                         selected_old=old['selected_candidate'],selected_new=new['selected_candidate'],
                         optimistic_hand_reservation_equal_still_seeded=remains))
    return dict(schema='naotocchi.card_game.fallback_cause_audit.v1',rows=rows,unsupported_ids=unsupported,
                summary=dict(planned=len(shadow['results']),compared=compared,fallback=len(rows),old_fallback=old_seeded,
                    additional_fallback=len(rows)-old_seeded,pilot_wrappers_reproduced=reproduced,legacy_choices_reproduced=compared,
                    groups=dict(groups),transitions=dict(transitions),frontier_pairs=total_pairs,
                    pair_responsibilities=dict(responsibility_pairs),decision_responsibilities_overlapping=dict(responsibility_decisions),
                    pair_type_counts=dict(type_pairs),decision_action_types_overlapping=dict(action_decisions),
                    decision_variants_overlapping=dict(variants),state_conditions_overlapping=dict(state_counts),
                    ordinary_pair_reasons=dict(reasons),exact_action_identity_pairs=identity_pairs,
                    optimistic_hand_reservation_equal=dict(fallback=probe_fallback,changed_frontiers=probe_changed,
                        approved_evidence=False,meaning='unproved sensitivity only; no policy or match use')),
                policy_promoted=False,independent_balance_sample_count=0,new_matches=0,
                semantic_equivalence_exhaustively_proved=False)
