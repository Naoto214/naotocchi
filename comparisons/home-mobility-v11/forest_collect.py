"""Verify all native captures and join the same residents across four mobile widths."""
import argparse
import csv
import gzip
import hashlib
import json
import math
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'home-mobility-v10'))
from forest_metrics import input_rows, refusal_intervals, v9


def digest(data):
    return hashlib.sha256(json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(',',':')).encode()).hexdigest()


def distance(a,b,scale):
    return math.hypot((a[0]-b[0])*scale[0],(a[1]-b[1])*scale[1])


def csv_rows(path):
    with path.open() as f:return list(csv.DictReader(f))


def write_csv(path, rows):
    if rows:
        with path.open('w') as f:
            w=csv.DictWriter(f,fieldnames=list(rows[0]))
            w.writeheader()
            w.writerows(rows)


def inspect(path):
    width,seed,order,layout,repeat,policy=path.parent.name.split('-',5)
    profile=dict(width=int(width),seed=int(seed),order=int(order),layout=layout,repeat=int(repeat))
    d=v9.load(path)
    arm=policy if layout=='fixed' else ('v9-seats' if policy=='v9' else policy+'-reference')
    assert (d['width'],d['seed'],d['order'],d['arm'])==(int(width),int(seed),int(order),arm)
    assert not d['errors'] and d['wallSeconds']>=600 and d['baseline']['modelSeconds']>=600
    assert all(len(s['actors'])==28 and s['visible']=='visible' and not s['paused'] for s in d['trajectory'])
    roster=d['initial']['actors']
    # At clock zero all entry points must have identical feet, sizes, routes,
    # chosen roles and random-generator state. Later autonomous choices may differ.
    signature=digest([d['initial']['seed'],[[a.get(k) for k in ('key','kind','x','y','w','h','temperament','nextAt','lastWalk','activity','after','source','target','route','manualUntil','direction','faceKey','recent')] for a in roster]])
    opening=input_rows(path.parent/'touch-initial-checkpoint.json',d,d['initial'])
    aged=input_rows(path.parent/'touch-checkpoint.json',d,d['checkpoint'])
    rays=v9.load(path.parent/'directions.json.gz')
    assert rays['input']==v9.sha(path)
    geometry={(r['phase'],r['key']):r['geometry'] for r in rays['observations'] if r['phase']!='refusal'}
    restore=v9.load(path.parent/'restore.json')
    assert len(restore['roster'])==28 and restore['nativeRevisionAfter']>=restore['nativeRevisionBefore']
    rows=csv_rows(path.parent/'residents.csv')
    assert len(rows)==28 and len({r['key'] for r in rows})==28
    legs=v9.legs(d);proposals=d['log'].get('proposals',[])
    syncs=d['log']['syncs']
    budget={(t,k) for t,k in d['log'].get('budget',[])}
    people=[];shift_rows=[]
    for s in syncs:
        ink=s['ink'] or {}
        stable=s['sameBody'] and s['sameRegion'] and s['sameProjection'] and s['sameSize']
        replaced=stable and ink.get('sameAsset') and ink.get('sameExtentInputs') and ink.get('sameNode') is False
        shift_rows.append(dict(**profile,policy=policy,key=s['key'],clock=s['clock'],css=s['distanceCss'],from_x=s['from'][0],from_y=s['from'][1],
            to_x=s['to'][0],to_y=s['to'][1],same_projection=bool(s['sameProjection']),same_body=bool(s['sameBody']),replacement_only=int(bool(replaced)),
            prior_ink=ink.get('hadInk'),current_ink=ink.get('hasInk'),gate='/'.join(s['gate'] or [])))
    for r in rows:
        k=r['key']
        normal=[l for l in legs if l['key']==k and l['completed_normal'] and l['finish_s']<=600]
        assert len(normal)==int(r['normal_count_cutoff']) and len([l for l in normal if l['finish_s']<=300])==int(r['normal_first_half'])
        own=[l for l in legs if l['key']==k and l['source']=='ambient' and l['start_s']<=600]
        requests=[q for q in d['log']['requests'] if q['key']==k and q['source']=='ambient' and q['clock']<=600]
        failed=[(q['clock'],'refused') for q in requests if q['planned'] and not q['accepted']]
        choices=[(t,'budget' if (t,k) in budget else ('voluntary' if 'budget' in d['log'] else 'idle_choice'))
            for t,key,n in d['log']['choices'] if key==k and n in ('turn','look','sit','rest') and t<=600]
        episodes=refusal_intervals([(t,'refusal') for t,_ in failed]+[(l['start_s'],'own_step') for l in own]+choices,600)
        ended=Counter(e[2] for e in episodes)
        # A changed destination can make the leg count on one definition only.
        # Report both gains from exactly the same approved physical route.
        original_gains=[];chosen_gains=[];qualified_raw=0
        own_proposals=[p for p in proposals if p['key']==k]
        arrivals=[l for l in own if l['native_non_escape_arrival'] and l['finish_s']<=600]
        for l in arrivals:
            q=d['log']['requests'][int(l['request'])]
            proposal=next((p for p in reversed(own_proposals) if p['clock']<=q['clock']),None)
            start=[l['from_x'],l['from_y']];end=[l['end_x'],l['end_y']]
            if proposal and proposal['chosen']==q['goal'] and proposal['raw']!=proposal['chosen']:
                scale=proposal['scale'];raw=proposal['raw']
                original_gains.append(distance(start,raw,scale)-distance(end,raw,scale))
                chosen_gains.append(distance(start,q['goal'],scale)-distance(end,q['goal'],scale))
            else:
                scale=q['scale'];raw=q['goal']
            net=distance(start,end,scale)
            gain=distance(start,raw,scale)-distance(end,raw,scale)
            qualified_raw+=int(net>=8-1e-7 and gain>.75)
        initial_inks=geometry['opening',k]['reachable'];end_inks=geometry['endpoint',k]['reachable']
        o=opening[k];a=aged[k];ms=[q for q in shift_rows if q['key']==k]
        row=dict(**profile,policy=policy,arm=arm,key=k,requests=len(requests),plans=int(r['plans_cutoff']),normal=len(normal),
            first_half=int(r['normal_first_half']),second_half=int(r['normal_second_half']),normal_with_original_direct_intent=qualified_raw,
            arrivals_on_reselected_goal=len(original_gains),original_gain_css=round(sum(original_gains),3),chosen_gain_css=round(sum(chosen_gains),3),
            normal_distance_css=r['normal_dist_cutoff_css'],actual_distance_terrain=r['total_model_px'],plan_rate=r['plan_rate_cutoff'],
            longest_blocked_s=r['longest_step_refusal_s'],after_first_longest_blocked_s=r['longest_post_first_refusal_s'],recovery_rate=r['step_recovery_excluding_idle_choices'],
            refused_episodes=len(episodes),recovered=ended['own_step'],voluntary_end=(ended['voluntary'] if 'budget' in d['log'] else ''),budget_end=(ended['budget'] if 'budget' in d['log'] else ''),idle_without_cause=ended['idle_choice'],ambient_budget_decisions=int(r['waits_ambient_budget']),open_at_cutoff=ended['open'],
            yields_performed=r['yielded_legs_cutoff'],normal_after_receiving_help=r['normal_after_received_help'],self_normal_after_yield=r['yields_followed_by_own_normal'],
            opening_trusted=int(o['trusted']),opening_issued=int(o['issued']),opening_arrived=int(o['terminalArrived']),
            aged_trusted=int(a['trusted']),aged_issued=int(a['issued']),aged_arrived=int(a['terminalArrived']),
            opening_safe_candidates=sum(map(len,initial_inks.values())),aged_safe_candidates=sum(map(len,end_inks.values())),
            opening_8px_headings=len(initial_inks['8']),aged_8px_headings=len(end_inks['8']),sync_foot_changes=len(ms),
            stable_replacement_shifts=sum(q['replacement_only'] for q in ms),other_between_legs=r['untracked_between_leg_shifts'],max_between_legs_css=r['largest_between_leg_shift_css'],
            speed_bound_exceedances=r['speed_bound_exceedances'])
        assert row['normal']==row['first_half']+row['second_half'] and row['speed_bound_exceedances']=='0'
        assert sum(e[1]-e[0] for e in episodes)>=0 and abs(max((e[1]-e[0] for e in episodes),default=0)-float(row['longest_blocked_s']))<=.00051
        people.append(row)
    focus=['pet:dog','companion:tanuki','companion:panda','companion:box']
    sums=lambda key:sum(int(r[key]) for r in people)
    event_goal=[q for q in proposals if q['raw']!=q['chosen']]
    largest=max(people,key=lambda r:float(r['longest_blocked_s']))
    cell=dict(**profile,policy=policy,arm=arm,initial_sha256=signature,raw_sha256=v9.sha(path),browser=d['browser'],model_source=d['sources'][f'home-production-model-mobility-{arm}.js']['source'],
        renderer_source=next(s['source'] for name,s in d['sources'].items() if 'production-diorama' in name),
        wall_s=round(d['wallSeconds'],3),model_s=round(d['baseline']['modelSeconds'],3),own_once=sum(r['normal']>=1 for r in people),
        own_twice=sum(r['normal']>=2 for r in people),both_halves=sum(r['first_half']>0 and r['second_half']>0 for r in people),
        walking_legs=sums('normal'),walk_distance_css=round(sum(float(r['normal_distance_css']) for r in people),3),requests=sums('requests'),plans=sums('plans'),
        focus_walks='/'.join(str(next(r['normal'] for r in people if r['key']==k)) for k in focus),longest_blocked_s=largest['longest_blocked_s'],longest_blocked_actor=largest['key'],
        opening_trusted=sums('opening_trusted'),opening_reached=sums('opening_arrived'),aged_trusted=sums('aged_trusted'),aged_reached=sums('aged_arrived'),
        changes_on_sync=len(syncs),same_body_replacement_moves=sums('stable_replacement_shifts'),between_legs_shifts=sums('other_between_legs'),
        max_between_legs_css=max(float(r['max_between_legs_css']) for r in people),speed_bound_exceedances=sums('speed_bound_exceedances'),
        replaced_proposals=len(event_goal),proposals=len(proposals),strict_original_direct_legs=sums('normal_with_original_direct_intent'),
        restored_own_starts=restore.get('ambientStarts',0))
    return cell,people,shift_rows


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('raw',type=Path)
    p.add_argument('out',type=Path)
    p.add_argument('--complete',action='store_true')
    a=p.parse_args()
    files=sorted(a.raw.rglob('forest28.json.gz'))
    cells=[];residents=[];shifts=[];openings={};pair_versions={}
    for path in files:
        if not (path.parent/'residents.csv').exists():continue
        cell,rows,changes=inspect(path)
        key=tuple(cell[k] for k in ('width','seed','order','layout'))
        assert openings.setdefault(key,cell['initial_sha256'])==cell['initial_sha256'],('unmatched opening',key)
        pair=(*key,cell['repeat']);versions=pair_versions.setdefault(pair,set())
        assert cell['policy'] not in versions,('duplicate policy',pair)
        versions.add(cell['policy'])
        cells.append(cell);residents.extend(rows);shifts.extend(changes)
    if a.complete:
        assert len(cells)==32 and len(pair_versions)==8
        assert all(v=={'v9','v10','v11-foot','v11'} for v in pair_versions.values())
        assert len({c['browser'] for c in cells})==1
    assert cells
    a.out.mkdir(parents=True,exist_ok=True)
    write_csv(a.out/'forest-cases.csv',cells)
    write_csv(a.out/'forest-residents.csv',residents)
    write_csv(a.out/'forest-sync-changes.csv',shifts)
    print(len(cells),'verified homes;',len(residents),'individuals;',len(shifts),'native sync movements')

if __name__=='__main__':main()
