"""Opt-in, source-bound execution edition; historical 431 runner stays untouched."""
import argparse
import copy
import hashlib
import json
import gzip
from collections import defaultdict, deque
from pathlib import Path
import proxy_resource_value_trajectory as old
import proxy_resource_value_integration as saved
import proxy_continuation_state as state
import proxy_continuation_candidates as candidates
import proxy_continuation_actions as actions


def _legacy_inputs(initial):
    inputs=copy.deepcopy(initial['inputs'])
    _,passes=old._fresh_response_profiles(inputs,initial['path_id'])
    inputs.update(legacy_pass_boundaries=passes,
        legacy_empty_pass_boundaries=old._fresh_empty_pass_boundaries(inputs,initial['path_id']))
    return inputs


def _forced(current,initial,events,shots):
    phase=current['game_state']['phase'];context=current['response_context']
    if phase=='turn_end':return old._end_transition(current,initial['path_id'],events,shots)
    if phase=='egg_exchange_choice':
        g=current['game_state'];index=initial['inputs']['mandatory_seed_profiles'].get(str(g['round'])+':'+g['turn_player'])
        if index is None:raise ValueError('mandatory seed profile unavailable')
        handler=old.first_r2_egg if index==1 and g['round']<=2 else old.egg
        return handler.run_route(old._row(current,initial['path_id']))
    if context['chain_status']=='resolving':
        link=current['activation_zone'][-1];card=link['card_id']
        if card=='G-hit-blow':after,event=old.hit.resolve_link(current,allow_outer_links=True)
        elif card=='C-chicken' and len(current['activation_zone'])==1:after,event=old.reached.resolution.resolve_board_ability(current)
        elif card=='I-c_coin2':
            if len(current['activation_zone'])==2:after,event=old.coin_outer_resolution.resolve_item(current)
            elif len(current['activation_zone'])==1:after,event=old.coin_resolution.resolve_item(current,dict(chain_link_id=link['link_id'],source_instance_id=link['source_instance_id']))
            else:raise ValueError('coin outer resolution unavailable')
        elif card=='E-first-date' and len(current['activation_zone'])==1:
            after,generated=old.start.seeded.resolve_chain(current,{})
            if len(generated)!=1:raise ValueError('unexpected event coverage')
            event=generated[0]
        else:raise ValueError('chain resolution adapter unavailable: '+card)
        return dict(final_continuation_state=old.start._payload(after),last_valid_event_seq=after['last_event_seq'],
            new_events=[event],new_snapshots=[old._snapshot(after)],new_decisions=[])
    raise ValueError('unsupported forced phase: '+phase)


def run_route(initial,policy,forced_adapter=None):
    if policy not in old.POLICIES:raise ValueError('unknown policy')
    # Use the same signed source loader and independent initial reconstruction.
    if initial['initial_raw_sha256']!=old.INITIAL_SHA or state.canonical_sha256(initial['manifest'])!=initial['initial_manifest_sha256']:
        raise ValueError('initial identity differs')
    errors=old.validate_sources(initial['inputs']['source_raw_sha256'],Path(initial['inputs']['source_root']))
    if errors:raise ValueError(str(errors))
    raw=(Path(initial['inputs']['source_root'])/'docs/card-game/data'/old.start.SOURCE.name).read_bytes()
    if hashlib.sha256(raw).hexdigest()!=old.INITIAL_SHA:raise ValueError('135 source raw differs')
    official=next(r for r in json.loads(raw)['manifest']['routes'] if r['path_id']==initial['path_id'])
    if official!=initial['manifest']:raise ValueError('135 manifest differs')
    if initial['first_player']!=official['first_player'] or initial['order_id']!=official['order_id']:
        raise ValueError('initial order identity differs')
    seeds,_=old._fresh_response_profiles(initial['inputs'],initial['path_id'])
    expected=[dict(game_state_sha256=g,continuation_state_sha256=c,seed_context=ctx) for (g,c),ctx in seeds.items()]
    if sorted(initial['inputs']['response_seed_profiles'],key=state.canonical_sha256)!=sorted(expected,key=state.canonical_sha256):
        raise ValueError('response seed profiles differ')
    inventories,manifest=old._fresh_response_inventories(old.DATA)
    if initial['inputs']['historical_response_inventories']!=inventories or initial['inputs']['response_audit_raw_sha256']!=manifest:
        raise ValueError('response inventories differ')
    if initial['inputs']['mandatory_seed_profiles']!=old._fresh_mandatory_seed_profiles(initial):raise ValueError('mandatory seed profiles differ')
    prefix=old.probe.run_route(initial['manifest'])
    if prefix!=initial['source_route']:raise ValueError('initial prefix differs')
    current=old.start.build_resume_state(prefix)
    envelope=state.create(current,current['last_event_seq']);first=copy.deepcopy(envelope)
    legacy_events=copy.deepcopy(prefix['events']);legacy_shots=[]
    for shot in prefix['snapshots']:
        game=copy.deepcopy(shot['state']);game['cards']=copy.deepcopy(prefix['final_state']['cards'])
        legacy_shots.append(dict(event_seq=shot['seq'],game_state=game,game_state_sha256=shot['state_sha256'],
            continuation_state=None,continuation_state_sha256=None))
    legacy_shots[-1]=old._snapshot(current)
    events=[];shots=[copy.deepcopy(envelope)];decisions=[];completion=None;reason=None;end_evidence=[]
    inputs=_legacy_inputs(initial)
    for _ in range(512):
        current=state.current(envelope);game=current['game_state'];phase=game['phase'];ctx=current['response_context']
        if game['round']>10:raise ValueError('R11 forbidden')
        try:
            forced=None;record=None
            if phase in ('turn_end','egg_exchange_choice','challenge_comparison','challenge_end') or ctx['chain_status']=='resolving' or (current['pending_triggers'] and forced_adapter is not None):
                if forced_adapter is None:
                    if any(envelope['runtime'].values()):raise ValueError('runtime-aware forced boundary adapter unavailable: '+phase)
                    forced=_forced(current,initial,legacy_events,legacy_shots)
                else:
                    forced=forced_adapter(envelope,initial,legacy_events,legacy_shots,shots)
                generated=forced['new_events'];raw_shots=forced.get('new_snapshots',[])
                if len(raw_shots)!=len(generated):raise ValueError('forced snapshot coverage differs')
                full_envelopes=forced.get('new_envelopes')
                if full_envelopes is not None and len(full_envelopes)!=len(generated):raise ValueError('forced full envelope coverage differs')
                steps=[];previous=envelope
                for index,(event,shot) in enumerate(zip(generated,raw_shots)):
                    if full_envelopes is None:next_envelope=state.advance(previous,shot['continuation_state'],shot['event_seq'])
                    else:
                        next_envelope=copy.deepcopy(full_envelopes[index]);state.validate(next_envelope)
                        if next_envelope['event_seq']!=shot['event_seq'] or next_envelope['legacy_continuation']!=shot['continuation_state']:raise ValueError('forced full envelope/legacy snapshot differs')
                    steps.append((next_envelope,actions.bind_event(previous,next_envelope,event)));previous=next_envelope
            elif phase=='normal_action':
                inventory=candidates.audit(envelope,legacy_events)
                context=dict(contract_version=old.shadow.fallback.CONTRACT_VERSION,order_id=initial['order_id'],
                    actor=game['turn_player'],actor_turn_index=game['round'],round=game['round'],phase='normal_action',
                    decision_kind='normal_action',choice_kind='normal_action_resource_frontier')
                record=candidates.select(envelope,inventory,context,policy,inputs)
                next_envelope,generated=actions.apply(envelope,record,dict(inputs,public_events=legacy_events))
                steps=[(next_envelope,generated[0])]
            elif phase in ('response_window','post_placement_response','turn_end_response'):
                opportunity=actions.response_inventory(envelope,initial,legacy_events)
                gh=old.start.opening._stop_state_sha256(game);ch=old.start._hash(current)
                profiles=[p['seed_context'] for p in initial['inputs']['response_seed_profiles'] if p['game_state_sha256']==gh and p['continuation_state_sha256']==ch]
                index=profiles[0]['actor_turn_index'] if profiles else game['round']
                record=old.start.seeded.resolve_response_choice(dict(order_id=initial['order_id'],actor_turn_index=index,round=game['round']),opportunity)
                record.update(event_seq=envelope['event_seq'],pre_game_state_sha256=gh,pre_continuation_state_sha256=ch)
                next_envelope,generated=actions.apply(envelope,record,dict(inputs,public_events=legacy_events))
                steps=[(next_envelope,generated[0])]
            else:raise ValueError('unsupported phase: '+phase)
            for next_envelope,event in steps:
                raw_event={k:v for k,v in event.items() if k not in ('execution_contract_id','envelope_before_sha256','envelope_after_sha256')}
                old._verify_generated(state.current(envelope),state.current(next_envelope),[raw_event])
                raw_event=old._source_event_shape(raw_event,state.current(next_envelope),initial,policy)
                legacy_events.append(raw_event);legacy_shots.append(old._snapshot(state.current(next_envelope)))
                events.append(actions.bind_event(envelope,next_envelope,raw_event));shots.append(copy.deepcopy(next_envelope));envelope=next_envelope
            if record is not None:
                record=copy.deepcopy(record);record['event_seq']=steps[0][0]['event_seq']-1
                decisions.append(record)
            if forced:
                decisions.extend(copy.deepcopy(forced.get('new_decisions',[])))
                if 'end_evidence' in forced:end_evidence.append(copy.deepcopy(forced['end_evidence']))
                if forced.get('completed'):completion=copy.deepcopy(forced['result']);break
        except old.normal.RulesStop as error:
            reason=dict(code=error.code,stage=phase,evidence=error.evidence);break
        except ValueError as error:
            reason=dict(code='unsupported_contract_boundary',stage=phase,detail=str(error));break
    else:raise ValueError('finite route bound exceeded')
    result=dict(schema='naotocchi.card_game.continuation_run.v1',execution_contract_id=state.CONTRACT,
        run_id=state.CONTRACT+':'+policy+':'+initial['path_id'],path_id=initial['path_id'],policy_id=policy,
        initial_raw_sha256=initial['initial_raw_sha256'],initial_manifest_sha256=initial['initial_manifest_sha256'],
        initial_envelope=first,events=events,snapshots=shots,decisions=decisions,final_envelope=envelope,
        last_valid_event_seq=envelope['event_seq'],completed=completion is not None,stop=reason,
        result=completion or dict(winner=None,final_growth=None),independent_balance_sample_count=0,policy_promoted=False)
    if forced_adapter is not None:result['end_evidence']=end_evidence
    return result


def validate_route(result,initial,policy):
    try:
        return [] if run_route(initial,policy)==result else ['independent initial/decision/runtime replay differs']
    except (ValueError,KeyError,TypeError) as error:return [str(error)]


def candidate_meaning(detail):
    fields=('action_type','candidate_variant','source_instance_id','card_id','target_instance_ids')
    result={k:copy.deepcopy(detail.get(k)) for k in fields}
    evidence=detail.get('evidence',{})
    result['cost_specification']={k:copy.deepcopy(evidence.get(k,detail.get(k,'unproved')))
                                  for k in ('payment_time','cost_modifiers')}
    return result


def candidate_differences(before, after):
    a={d['candidate_id']:d for d in before};b={d['candidate_id']:d for d in after}
    changed=sorted(k for k in set(a)&set(b) if candidate_meaning(a[k])!=candidate_meaning(b[k]))
    return dict(added=[b[k] for k in sorted(set(b)-set(a))],removed=[a[k] for k in sorted(set(a)-set(b))],
        meaning_changed=[dict(candidate_id=k,before=candidate_meaning(a[k]),after=candidate_meaning(b[k])) for k in changed])


def compare_results(results,historical):
    differences=[];pairs=[]
    initials={i['path_id']:i for i in old.load_initial_routes()}
    for r in results:
        old_row=next(o for o in historical if o['path_id']==r['path_id'] and o['policy_id']==r['policy_id'])
        old_events={e['seq']:e for e in old_row['events']}
        old_states={s['event_seq']:s['continuation_state_sha256'] for s in old_row['snapshots']}
        first_state=next((s['event_seq'] for s in r['snapshots'] if s['event_seq'] not in old_states or old.start._hash(s['legacy_continuation'])!=old_states[s['event_seq']]),None)
        old_decisions={}
        normal_snapshots=[s for s in old_row['snapshots'] if s['game_state']['phase']=='normal_action' and s['event_seq']+1 in old_events]
        historical_normals=[d for d in old_row['decisions'] if d.get('decision_kind')=='normal_action']
        if len(normal_snapshots)!=len(historical_normals):raise ValueError('historical normal alignment differs')
        for snapshot,decision in zip(normal_snapshots,historical_normals):
            seq=snapshot['event_seq']
            if old_events[seq+1].get('selected_candidate')!=decision['selected_candidate']:
                raise ValueError('historical normal choice alignment differs')
            details=decision.get('legal_candidate_details')
            if details is None:
                initial=initials[r['path_id']]
                history=dict(normal_challenge_losses_by_actor=[],last_valid_event_seq=seq,source_refs=sorted(initial['inputs']['source_raw_sha256']))
                current=state.current(state.create(snapshot['continuation_state'],seq))
                boundary=old._normal_evidence_boundary(current,initial['inputs'],history)
                details=boundary['decision']['legal_candidate_details']
                if sorted(x['candidate_id'] for x in details)!=decision['problem']['legal_candidate_ids']:
                    raise ValueError('historical candidate reconstruction differs')
            old_decisions[seq]=dict(decision,legal_candidate_details=details)
        inventory_differences=[]
        for d in r['decisions']:
            if 'inventory' not in d or d['event_seq'] not in old_decisions:continue
            previous=old_decisions[d['event_seq']]
            delta=candidate_differences(previous['legal_candidate_details'],d['inventory']['legal_candidate_details'])
            if any(delta.values()):inventory_differences.append(dict(event_seq=d['event_seq'],**delta))
        first=next((e['seq'] for e in r['events'] if e['seq'] not in old_events or
            {k:v for k,v in e.items() if k not in ('execution_contract_id','envelope_before_sha256','envelope_after_sha256')}!=old_events[e['seq']]),None)
        differences.append(dict(run_id=r['run_id'],historical_stop_seq=old_row['last_valid_event_seq'],
            current_stop_seq=r['last_valid_event_seq'],first_event_difference=first,first_legacy_state_difference=first_state,
            first_candidate_difference=inventory_differences[0] if inventory_differences else None,classification='execution_edition_difference',policy_effect_counted=False))
    for path in sorted({r['path_id'] for r in results}):
        old_policy,new_policy=[next(r for r in results if r['path_id']==path and r['policy_id']==p) for p in old.POLICIES]
        # Match each occurrence once, including the seed/public turn context.
        # A repeated view must not silently overwrite an earlier decision.
        def key(d):
            return state.canonical_sha256(dict(view=d['problem']['view_sha256'],
                candidates=d['inventory']['legal_candidate_details'],context=d['problem']['seed_context']))
        left=defaultdict(deque)
        for d in old_policy['decisions']:
            if 'problem' in d:left[key(d)].append(d)
        matched=[]
        for d in new_policy['decisions']:
            if 'problem' in d and left[key(d)]:matched.append((left[key(d)].popleft(),d))
        pairs.append(dict(path_id=path,completed=[old_policy['completed'],new_policy['completed']],
            comparable_normal_views=len(matched),selected_difference=sum(a['selected_candidate']!=b['selected_candidate'] for a,b in matched),
            final_growth_difference=None if not all(r['completed'] for r in (old_policy,new_policy)) else 'not_evaluated',winner_comparison=None))
    return dict(historical_execution_differences=differences,paired_policy_comparisons=pairs,policy_adopted=False,independent_balance_sample_count=0)


def historical_scope_audit():
    """Keep all 17 shadow mismatches and four 427 stops in a fixed denominator."""
    historical=saved.load_saved();boundaries=old.shadow.load_observed_boundaries()
    ids={r['shadow_id'] for r in historical['shadow']['results'] if r['status']=='unsupported'}
    work=[dict(audit_id='shadow:'+b['shadow_id'],boundary=b) for b in boundaries if b['shadow_id'] in ids]
    for r in historical['paired']['results']:
        if r['policy_id']!=old.POLICIES[0]:continue
        matches=[b for b in boundaries if b['path_id']==r['path_id'] and b['event_seq']==r['last_valid_event_seq']]
        if len(matches)!=1:raise ValueError('427 stop boundary coverage differs')
        if matches[0]['continuation']!=r['final_continuation_state']:raise ValueError('427 source stop differs')
        work.append(dict(audit_id='stop427:'+r['run_id'],boundary=matches[0]))
    if len(ids)!=17 or len(work)!=21:raise ValueError('historical scope planned denominator differs')
    rows=[]
    for entry in work:
        b=entry['boundary'];before=b['decision']['legal_candidate_details']
        row=dict(audit_id=entry['audit_id'],path_id=b['path_id'],event_seq=b['event_seq'],
            historical_details=before,policy_effect_counted=False,new_events=0,new_decisions=0)
        try:
            inventory=candidates.audit(state.create(b['continuation'],b['event_seq']),[])
            row.update(status='audited',current_inventory=inventory,
                       **candidate_differences(before,inventory['legal_candidate_details']))
        except ValueError as error:row.update(status='stopped',reason=str(error))
        rows.append(row)
    return dict(planned=21,shadow_planned=17,stop427_planned=4,executed=len(rows),not_executed=0,
        audited=sum(r['status']=='audited' for r in rows),stopped=sum(r['status']=='stopped' for r in rows),results=rows)


def run_paired(output):
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    initials=old.load_initial_routes();results=[]
    for initial in initials:
        for policy in old.POLICIES:
            result=run_route(initial,policy)
            errors=validate_route(result,initial,policy)
            if errors:raise ValueError(str(errors))
            results.append(result)
            print(result['run_id'],result['last_valid_event_seq'],result['stop'],flush=True)
    report=dict(schema='naotocchi.card_game.continuation_paired.v1',execution_contract_id=state.CONTRACT,
        planned_ids=sorted(r['run_id'] for r in results),planned=8,completed=sum(r['completed'] for r in results),
        stopped=sum(not r['completed'] for r in results),not_executed=0,independent_replay_verified=8,
        independent_balance_sample_count=0,policy_promoted=False,results=results,
        comparison=compare_results(results,saved.load_saved()['paired']['results']),historical_scope_audit=historical_scope_audit())
    raw=saved.canonical(report)
    (output/'paired.json.gz').write_bytes(gzip.compress(raw,mtime=0))
    source_paths=sorted(Path(__file__).parent.glob('proxy_continuation_*.py'))
    source_paths += [old.DATA.parent/name for name in ('01-core-rules.md','02-main-system.md','06-action-chain-checkpoint.md','55-insect-three-lines-card-text-draft.md','72-companion-26-card-text-draft.md','74-partner-18-card-text-draft.md','77-current-items-card-text-draft.md')]
    manifest=dict(historical_base_commit='bb1a6b6e927c63aaa209b63385d623873ed9891b',historical_source_raw_sha256=saved.load_saved()['source_raw_sha256'],artifact='paired.json.gz',raw_sha256=hashlib.sha256(raw).hexdigest(),compressed_sha256=hashlib.sha256((output/'paired.json.gz').read_bytes()).hexdigest(),
        execution_sources_sha256={str(p.relative_to(old.DATA.parent)):hashlib.sha256(p.read_bytes()).hexdigest() for p in source_paths})
    (output/'manifest.json').write_bytes(saved.canonical(manifest))
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,required=True)
    run_paired(parser.parse_args().output)
