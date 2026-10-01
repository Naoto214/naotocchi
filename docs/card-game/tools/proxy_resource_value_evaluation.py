"""414 metrics over verified observations, never imputed stopped suffixes.

This module consumes runner/replay output; it does not execute game decisions.
Actual reached growth is separate from final growth, which requires completion.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path

def rate(count, denominator):
    return dict(count=count,denominator=denominator,rate=count/denominator if denominator else None)

def _coverage(manifest, rows, key):
    planned=manifest['planned_ids'];actual=[r[key] for r in rows]
    if len(planned)!=len(set(planned)) or len(actual)!=len(set(actual)) or sorted(planned)!=sorted(actual):
        raise ValueError('planned and observed IDs must match exactly without duplicates')

def _decision(record):
    wrapper=record.get('selection',record)
    return wrapper.get('decision_record') or wrapper

def _seed_context(record):
    row=_decision(record);ctx=row.get('seed_context')
    fields=('contract_version','order_id','actor','actor_turn_index','round','phase','decision_kind','choice_kind')
    if ctx is not None:return [ctx[k] for k in fields]
    proof=row.get('seed_proof') or {}
    return proof.get('seed_material',[])[:8] or None

def _decision_counts(records, stop=0):
    rows=[_decision(r) for r in records]
    fallback=sum(r.get('resolution_mode')=='seeded_fallback' and len(r.get('legal_candidates',(r.get('seed_proof') or {}).get('canonical_candidate_ids',[])))>1 for r in rows)
    return dict(valid=len(rows),reached=len(rows)+stop,true_stop=rate(stop,len(rows)+stop),
        strategic_unresolved=rate(sum(r.get('strategic_unresolved',r.get('reason_code')=='strategic_unresolved_seeded_fallback') is True for r in rows),len(rows)),fallback=rate(fallback,len(rows)))

def evaluate_shadow(manifest, results):
    _coverage(manifest,results,'shadow_id')
    compared=[r for r in results if r['status']=='compared']
    groups={path:[r for r in results if r['path_id']==path] for path in sorted({r['path_id'] for r in results})}
    policies={}
    for key in ('legacy','pilot'):
        decisions=[dict(selection=r[key]) if key=='pilot' else r[key] for r in compared]
        policies[key]=_decision_counts(decisions,len(results)-len(compared))
    seed_changes=sum(_seed_context(r['legacy'])!=_seed_context(dict(selection=r['pilot'])) for r in compared)
    candidate_evidence=[r for r in compared if 'fresh_inventory' in r]
    candidate_changes=sum(sorted(r['problem']['legal_candidate_ids'])!=sorted(r['fresh_inventory']['candidate_ids']) for r in candidate_evidence)
    return dict(planned_ids=sorted(manifest['planned_ids']),planned=len(results),compared=len(compared),
        unsupported=rate(sum(r['status']=='unsupported' for r in results),len(results)),
        legacy_reproduction_failures=rate(sum(r['status']=='legacy_reproduction_failure' for r in results),len(results)),
        reasons=dict(Counter(r.get('reason') for r in results if r['status']!='compared')),
        choice_changes=rate(sum(r['choice_changed'] is True for r in compared),len(compared)),
        seed_context_changes=rate(seed_changes,len(compared)),candidate_set_changes=rate(candidate_changes,len(candidate_evidence)),candidate_comparison_missing=len(compared)-len(candidate_evidence),
        policies=policies,paths={p:dict(planned=len(rs),compared=sum(r['status']=='compared' for r in rs),
            choice_changes=rate(sum(r.get('choice_changed') is True for r in rs),sum(r['status']=='compared' for r in rs)),
            status_counts=dict(Counter(r['status'] for r in rs))) for p,rs in groups.items()},
        new_matches=0,independent_balance_sample_count=0)

def _occupancy(player):
    b=player['board']
    return dict(main=int(b['main'] is not None),companions=len(b['companions']),partner=int(b['partner'] is not None),world=int(b['world'] is not None),prepared=len(b['prepared']))

def _route(row):
    normal=[d for d in row['decisions'] if d.get('decision_kind')=='normal_action']
    phase=row['final_continuation_state']['game_state']['phase']
    evidence=row.get('stop_evidence') or {}
    # Runner records successfully executed decisions; the stopped opportunity
    # adds one reached judgment, without inventing a selected fallback.
    normal_stop=int(not row['completed'] and (phase=='normal_action' or evidence.get('stage','').startswith('normal_')))
    if normal_stop and normal and normal[-1].get('event_seq',0)>row['last_valid_event_seq']:
        normal=normal[:-1]
    kinds=Counter(e['action_type'] for e in row['events']);shots={s['event_seq']:s['game_state'] for s in row['snapshots']}
    ends=[];growth_changes=[];reservations=[];main_transitions=[]
    first_main={p:None for p in 'AB'};response_hand=0;response_board=0;response_prepared=0
    for event in row['events']:
        seq=event['seq'];before=shots.get(seq-1);after=shots.get(seq)
        if event['action_type']=='activate_response':
            zone=event.get('source_zone')
            if zone=='board':response_board+=1
            elif zone=='prepared':response_prepared+=1
            elif before is not None and event.get('source_instance_id') in before['players'][event['actor']].get('hand',[]):response_hand+=1
            else:raise ValueError('response activation source cannot be classified')
        if before is None or after is None:continue
        for p in 'AB':
            old,new=before['players'][p],after['players'][p]
            if old['growth']!=new['growth']:growth_changes.append(dict(event_seq=seq,actor=p,before=old['growth'],after=new['growth'],cause=event['action_type']))
            old_main,new_main=old['board']['main'],new['board']['main']
            if old_main!=new_main:
                main_transitions.append(dict(event_seq=seq,actor=p,before=old_main,after=new_main,cause=event['action_type']))
                if old_main is None and new_main is not None and first_main[p] is None:first_main[p]=after['round']
            previous={r['reservation_id']:r for r in old['reservations']};current={r['reservation_id']:r for r in new['reservations']}
            for rid in sorted(set(previous)|set(current)):
                if previous.get(rid)!=current.get(rid):reservations.append(dict(event_seq=seq,actor=p,reservation_id=rid,before=previous.get(rid),after=current.get(rid)))
        if event['action_type']=='turn_end_completed':
            # The end handler advances turn_player; the event actor and the
            # pre-transition round identify the turn that actually ended.
            ends.append(dict(round=before['round'],actor=event['actor'],event_seq=seq,
                growth={p:after['players'][p]['growth'] for p in 'AB'},
                time_before_end={p:before['players'][p]['time'] for p in 'AB'},
                occupancy={p:_occupancy(after['players'][p]) for p in 'AB'},
                egg=after['players'][event['actor']]['board']['main'] is None))
    final=row['final_continuation_state']['game_state']
    plays={'use_item','use_event','use_play','attach_item','set_item'}
    return dict(run_id=row['run_id'],policy_id=row['policy_id'],path_id=row['path_id'],status=row['status'],
        normal=_decision_counts(normal,normal_stop),
        response=_decision_counts([d for d in row['decisions'] if d.get('decision_kind')=='response_action']),
        mandatory=_decision_counts([d for d in row['decisions'] if d.get('decision_kind')=='mandatory_choice']),
        stop=dict(reason=row['stop_reason_code'],evidence=row.get('stop_evidence'),event_seq=row['last_valid_event_seq'],round=final['round'],phase=phase) if not row['completed'] else None,
        observed_growth={p:final['players'][p]['growth'] for p in 'AB'},final_growth=row['result']['growth'] if row['completed'] else None,
        winner=row['result']['winner'] if row['completed'] else None,
        turn_ends=ends,growth_changes=growth_changes,
        board_formation=dict(placement_events={k:v for k,v in kinds.items() if k in {'play_main_birth','place_companion','place_partner','place_world','attach_item','set_item'}},
            first_main_round=first_main,egg_completed_turns=sum(e['egg'] for e in ends)),
        card_use=dict(hand_plays=sum(kinds[k] for k in plays)+response_hand,hand_play_types=dict({k:kinds[k] for k in sorted(plays)},response_hand_plays=response_hand),
            board_activations=kinds['activate_board_ability']+response_board,prepared_activations=kinds['activate_prepared']+response_prepared,
            response_activations=kinds['activate_response'],effect_resolutions=sum(v for k,v in kinds.items() if k.startswith('resolve_')),
            event_type_counts=dict(kinds)),
        reservation_changes=reservations,reservation_peak={p:max(len(s['game_state']['players'][p]['reservations']) for s in row['snapshots']) for p in 'AB'},
        main_transitions=main_transitions,
        instance_transitions=[dict(event_seq=e['seq'],action_type=e['action_type'],transition=e['instance_transition']) for e in row['events'] if 'instance_transition' in e],
        reached_round=final['round'],reached_r10_comparison=row['completed'] and final['round']==10,
        independent_balance_sample_count=0)

def evaluate_trajectories(manifest, routes):
    _coverage(manifest,routes,'run_id');evaluated=[_route(r) for r in routes];pairs=[]
    for path in sorted({r['path_id'] for r in evaluated}):
        group=[r for r in evaluated if r['path_id']==path]
        if len(group)!=2:continue
        keyed=[{(t['round'],t['actor']):t for t in r['turn_ends']} for r in group]
        common=sorted(set(keyed[0])&set(keyed[1]));common_set=set(common)
        pairs.append(dict(path_id=path,run_ids=[r['run_id'] for r in group],
            common_completed_turns=[dict(round=key[0],actor=key[1],observations={r['policy_id']:ks[key] for r,ks in zip(group,keyed)}) for key in common],
            noncommon_turns={r['policy_id']:[dict(round=k[0],actor=k[1],observed=ks[k],other_policy=None) for k in sorted(set(ks)-common_set)] for r,ks in zip(group,keyed)},
            final_growth_difference={p:group[1]['final_growth'][p]-group[0]['final_growth'][p] for p in 'AB'} if all(r['final_growth'] is not None for r in group) else None))
    return dict(planned_ids=sorted(manifest['planned_ids']),planned=len(routes),completed=sum(r['completed'] for r in routes),
        stopped=sum(not r['completed'] for r in routes),not_executed=0,routes=evaluated,pairs=pairs,
        stop_reason_counts=dict(Counter(r['stop_reason_code'] for r in routes if not r['completed'])),independent_balance_sample_count=0)

def build_evaluation(shadow, paired):
    return dict(schema='naotocchi.card_game.resource_value_evaluation.v1',shadow=evaluate_shadow(shadow,shadow['results']),
        trajectories=evaluate_trajectories(paired,paired['results']),policy_promoted=False,independent_balance_sample_count=0)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--shadow',type=Path,required=True);parser.add_argument('--paired',type=Path,required=True);parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();sources={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in (args.shadow,args.paired)}
    report=build_evaluation(json.loads(args.shadow.read_text()),json.loads(args.paired.read_text()));report['source_raw_sha256']=sources
    args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,ensure_ascii=False,sort_keys=True,indent=2)+'\n')
    print(json.dumps(dict(shadow_compared=report['shadow']['compared'],choice_changes=report['shadow']['choice_changes'],completed=report['trajectories']['completed'],stopped=report['trajectories']['stopped']),ensure_ascii=False))

if __name__=='__main__':main()
