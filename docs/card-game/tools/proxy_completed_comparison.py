"""Read-only closeout of the fixed414 experiment; no policy or engine changes."""
import gzip,hashlib,json
from collections import Counter
from pathlib import Path
from proxy_resource_value_selection import canonical_sha256 as sha
ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'
OLD='legacy_107_114_116';NEW='resource_value_pilot_v1'
EFFECTS=('payment_effects','stat_effects','conditional_effects')
ZONES=('main','companions','partner','world','prepared')

def rate(count,denominator):return dict(count=count,denominator=denominator,rate=count/denominator if denominator else None)

def checked(directory,name):
    p=DATA/directory;manifest=json.loads((p/'manifest.json').read_text());blob=(p/name).read_bytes();raw=gzip.decompress(blob)
    if hashlib.sha256(blob).hexdigest()!=manifest['compressed_sha256'] or hashlib.sha256(raw).hexdigest()!=manifest['raw_sha256']:raise ValueError('saved artifact hash differs')
    return json.loads(raw)

def load_inputs():
    paired=checked('proxy-continuation-batch-439','paired.json.gz');shadow=checked('proxy-completed-evaluation-440','shadow.json.gz')
    limits=json.loads((DATA/'proxy-gap-validation-441/legacy-limits.json').read_text())
    return paired,shadow,limits

def ids(board,zone):
    value=board[zone];return set(value) if isinstance(value,list) else {value} if value else set()

def normalized(run,observed):
    shots={s['event_seq']:s for s in run['snapshots']}
    if len(shots)!=len(run['snapshots']) or len(shots)!=len(run['events'])+1:raise ValueError('snapshot coverage differs')
    entries=Counter();births=0;reentries=0;entry_records=[];effects={k:dict(created=0,retired=0,peak=0,retirement_causes={}) for k in EFFECTS};effect_records=[]
    seen={a:set() for a in 'AB'}
    first=run['snapshots'][0]['legacy_continuation']['game_state']
    for actor in 'AB':
        for zone in ZONES:
            seen[actor].update(first['cards'][i]['card_copy_id'] for i in ids(first['players'][actor]['board'],zone))
    for event in run['events']:
        seq=event['seq'];before=shots.get(seq-1);after=shots.get(seq)
        if before is None or after is None or sha(before)!=event['envelope_before_sha256'] or sha(after)!=event['envelope_after_sha256']:raise ValueError('event snapshot hash differs')
        bg=before['legacy_continuation']['game_state'];ag=after['legacy_continuation']['game_state']
        for actor in 'AB':
            for zone in ZONES:
                old=ids(bg['players'][actor]['board'],zone);new=ids(ag['players'][actor]['board'],zone)
                for instance in sorted(new-old):
                    copy_id=ag['cards'][instance]['card_copy_id'];reentry=copy_id in seen[actor];reentries+=reentry;seen[actor].add(copy_id)
                    entries[zone]+=1;births+=zone=='main' and not old
                    entry_records.append(dict(event_seq=seq,actor=actor,zone=zone,instance_id=instance,card_copy_id=copy_id,event_type=event['action_type'],previously_entered_board=reentry))
        for kind in EFFECTS:
            old={z['effect_id']:z for z in before['runtime'][kind]};new={z['effect_id']:z for z in after['runtime'][kind]};row=effects[kind]
            row['created']+=len(new.keys()-old.keys());row['retired']+=len(old.keys()-new.keys());row['peak']=max(row['peak'],len(old),len(new))
            for key in sorted(old.keys()|new.keys()):
                if old.get(key)!=new.get(key):effect_records.append(dict(event_seq=seq,kind=kind,effect_id=key,event_type=event['action_type'],before=old.get(key),after=new.get(key)))
            if old.keys()-new.keys():row['retirement_causes'][event['action_type']]=row['retirement_causes'].get(event['action_type'],0)+len(old.keys()-new.keys())
    if run['final_envelope']!=run['snapshots'][-1] or not run['completed'] or run['stop']:raise ValueError('route incomplete')
    ends=observed['turn_ends'];time=sum(t['time_before_end'][t['actor']] for t in ends)
    return dict(run_id=run['run_id'],path_id=run['path_id'],policy_id=run['policy_id'],winner=run['result']['winner'],final_growth=run['result']['final_growth'],last_event_seq=run['last_valid_event_seq'],normal=observed['normal'],response=observed['response'],mandatory=observed['mandatory'],board_entries={z:entries[z] for z in ZONES},main_births=births,first_main_round=observed['board_formation']['first_main_round'],egg_turn_ends=rate(observed['board_formation']['egg_completed_turns'],len(ends)),completed_turn_end_snapshots=len(ends),remaining_time_at_turn_end=dict(sum=time,denominator=len(ends),mean=time/len(ends) if ends else None),card_use=observed['card_use'],runtime_effects=effects,legacy_reservation_peak=observed['reservation_peak'],board_reentries=reentries,board_entry_records=entry_records,runtime_effect_records=effect_records,historical_named_placement_events=observed['board_formation']['placement_events'])

def summarize(paired,shadow,limits):
    runs=paired['results'];expected=paired['planned_ids'];actual=[r['run_id'] for r in runs]
    if len(expected)!=8 or len(set(expected))!=8 or sorted(actual)!=sorted(expected):raise ValueError('eight-run coverage differs')
    if len({(r['path_id'],r['policy_id']) for r in runs})!=8 or {r['policy_id'] for r in runs}!={OLD,NEW}:raise ValueError('paired design differs')
    observations={r['run_id']:r for r in paired['trajectory_observations']['routes']}
    routes=[normalized(run,observations[run['run_id']]) for run in runs];pairs=[];policies={}
    for path in sorted({r['path_id'] for r in routes}):
        group={r['policy_id']:r for r in routes if r['path_id']==path}
        if set(group)!={OLD,NEW}:raise ValueError('unpaired path')
        source=next(p for p in paired['trajectory_observations']['pairs'] if p['path_id']==path)
        pairs.append(dict(path_id=path,final_growth={p:group[p]['final_growth'] for p in (OLD,NEW)},winner={p:group[p]['winner'] for p in (OLD,NEW)},new_minus_old={a:group[NEW]['final_growth'][a]-group[OLD]['final_growth'][a] for a in 'AB'},common_completed_turns=source['common_completed_turns'],noncommon_turns=source['noncommon_turns']))
    for policy in (OLD,NEW):
        rows=[r for r in routes if r['policy_id']==policy];out={}
        for phase in ('normal','response','mandatory'):
            out[phase]={key:rate(sum(r[phase][key]['count'] for r in rows),sum(r[phase][key]['denominator'] for r in rows)) for key in ('fallback','strategic_unresolved','true_stop')}
        out.update(board_entries={z:sum(r['board_entries'][z] for r in rows) for z in ZONES},main_births=sum(r['main_births'] for r in rows),egg_turn_ends=rate(sum(r['egg_turn_ends']['count'] for r in rows),sum(r['egg_turn_ends']['denominator'] for r in rows)),hand_plays=sum(r['card_use']['hand_plays'] for r in rows),board_activations=sum(r['card_use']['board_activations'] for r in rows),prepared_activations=sum(r['card_use']['prepared_activations'] for r in rows),runtime_effects={k:{q:sum(r['runtime_effects'][k][q] for r in rows) for q in ('created','retired')} for k in EFFECTS},board_reentries=sum(r['board_reentries'] for r in rows))
        policies[policy]=out
    s=shadow['summary']
    if s['planned']!=313 or len(shadow['planned_ids'])!=313 or len(shadow['results'])!=313 or s['compared']+s['unsupported']!=313 or sum(limits['groups'].values())!=s['unsupported']:raise ValueError('shadow/limit denominator differs')
    shadow_ids=[r['shadow_id'] for r in shadow['results']]
    if len(set(shadow_ids))!=313 or sorted(shadow_ids)!=sorted(shadow['planned_ids']):raise ValueError('shadow ID coverage differs')
    unsupported={r['shadow_id']:r for r in shadow['results'] if r['policies'][OLD]['status']=='unsupported'}
    limit_ids=[r['shadow_id'] for r in limits['rows']]
    if len(unsupported)!=s['unsupported'] or len(set(limit_ids))!=len(limit_ids) or set(limit_ids)!=set(unsupported):raise ValueError('legacy boundary ID coverage differs')
    if dict(Counter(r['group'] for r in limits['rows']))!=limits['groups']:raise ValueError('legacy boundary grouping differs')
    for row in limits['rows']:
        origin=unsupported[row['shadow_id']]
        if any(row[k]!=origin[k] for k in ('source_envelope_sha256','source_event_seq','observed_policy')) or row['legacy_reason']!=origin['policies'][OLD]['reason']:raise ValueError('legacy boundary provenance differs')
    return dict(schema='naotocchi.card_game.completed_comparison.v1',routes=routes,pairs=pairs,policies=policies,shadow=s,legacy_boundary_groups=limits['groups'],experiment_complete=True,all_counterfactuals_supported=False,old_new_head_to_head=False,independent_balance_sample_count=0,policy_promoted=False,foundation_repairs_counted_as_adoption_evidence=False)
