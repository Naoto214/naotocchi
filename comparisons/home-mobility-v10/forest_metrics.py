"""Compute native movement and repeatability per resident at a shared 600-model-second cutoff."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('forest_summary_v9',HERE.parent/'home-mobility-v9/forest_summary.py')
v9=importlib.util.module_from_spec(spec)
spec.loader.exec_module(v9)


def refusal_intervals(events, end):
    intervals=[]
    start=None
    for clock,kind in sorted(events,key=lambda e:e[0]):
        if clock>end:continue
        if kind=='refusal' and start is None:start=clock
        elif kind!='refusal' and start is not None:
            intervals.append((start,clock,kind));start=None
    if start is not None:intervals.append((start,end,'open'))
    return intervals


def input_rows(path, d, snapshot):
    report=v9.load(path)
    key=lambda a:[a[k] for k in ('key','x','y','w','h')]
    feet=[key(a) for a in snapshot['actors']]
    digest=hashlib.sha256(json.dumps(feet,separators=(',',':')).encode()).hexdigest()
    assert report['feetSHA256']==digest
    entry=report['arms'][d['arm']];rows=entry['rows']
    model='home-production-model-mobility-'+d['arm']+'.js'
    assert entry['sources'][model]['source']==d['sources'][model]['source']
    assert len(rows)==28 and {r['key'] for r in rows}=={f[0] for f in feet}
    for row in rows:
        if row.get('skip') and not row['trusted']:
            assert not row['issued'] and not row['terminalArrived']
            continue
        down=row['pointerDownInputState']
        gate=down['gate']
        assert row['trusted'] and down['trusted'] and not (down['modelPaused'] or gate['blocked'] or gate['trialPaused'])
    return {r['key']:r for r in rows}


def measure(path, cutoff=600, with_touches=True):
    d,rows=v9.summarize(path,{},minimum_seconds=cutoff)
    all_legs=v9.legs(d)
    touch_tables={}
    for phase,snapshot,filename in [('opening','initial','touch-initial-checkpoint.json'),('aged','checkpoint','touch-checkpoint.json')]:
        if with_touches:touch_tables[phase]=input_rows(path.parent/filename,d,d[snapshot])
    out=[];intervals=[]
    for existing in rows:
        k=existing['key'];role=k.split(':')[0]
        asks=[r for r in d['log']['requests'] if r['key']==k and r['source']=='ambient' and r['clock']<=cutoff]
        moves=[l for l in all_legs if l['key']==k and l['start_s']<=cutoff]
        normal=[l for l in moves if l['completed_normal'] and l['finish_s']<=cutoff]
        native_steps=[(l['start_s'],'own_step') for l in moves if l['source']=='ambient']
        choices=[(t,'idle_choice') for t,key,name in d['log']['choices'] if key==k and name in ('turn','look','sit','rest')]
        failed=[r for r in asks if r['planned'] and not r['accepted']];accepted=[r for r in asks if r['planned'] and r['accepted']]
        early=[r for r in asks if r['early'] and not r['resumed']]
        resumed=[r for r in asks if r['resumed']]
        reopened=[r for r in asks if r.get('reopened')]
        assert all(r['early'] for r in reopened), 'Reopened requests must preserve native early retry provenance'
        accepted_steps=[(r['clock'],'own_plan') for r in accepted]
        failed_events=[(r['clock'],'refusal') for r in failed]
        first=normal[0]['finish_s'] if normal else None
        phase_episodes=refusal_intervals(failed_events+native_steps+choices,cutoff)
        plans=refusal_intervals(failed_events+accepted_steps+choices,cutoff)
        after_first=[i for i in phase_episodes if first is not None and i[0]>=first]
        interrupts=sum(i[2]=='idle_choice' for i in phase_episodes); recovered=sum(i[2]=='own_step' for i in phase_episodes)
        for start,end,reason in phase_episodes:
            intervals.append(dict(width=d['width'],seed=d['seed'],order=d['order'],arm=d['arm'],key=k,start_s=start,end_s=end,
                                  seconds=v9.number(end-start),end_reason=reason,after_first_normal=first is not None and start>=first))
        end_times=[l['finish_s'] for l in normal]; yields=[l for l in moves if l['source']=='yield' and l['status']=='arrival' and l['finish_s']<=cutoff]
        after_yield=[]
        for i,l in enumerate(yields):
            deadline=yields[i+1]['start_s'] if i+1<len(yields) else cutoff
            later=next((n for n in normal if n['start_s']>=l['finish_s'] and n['finish_s']<=deadline),None)
            if later: after_yield.append(later['finish_s']-l['finish_s'])
        roles=dict(width=d['width'],order=d['order'],role=role)
        metrics=dict(cutoff_s=cutoff,requests_cutoff=len(asks),plans_cutoff=len(accepted),plan_rate_cutoff=v9.rate(len(accepted),len(asks)),
            normal_count_cutoff=len(normal),normal_first_s=first if first is not None else '',normal_last_s=end_times[-1] if normal else '',
            normal_after_first=max(0,len(normal)-1),normal_first_half=sum(t<=cutoff/2 for t in end_times),normal_second_half=sum(t>cutoff/2 for t in end_times),
            max_gap_between_normal_s=v9.number(max((b-a for a,b in zip(end_times,end_times[1:])),default=0)) if len(normal)>1 else '',
            last_normal_to_end_s=v9.number(cutoff-end_times[-1]) if normal else '',normal_step_net_css='/'.join(str(l['net_css']) for l in normal),
            normal_mean_net_css=v9.number(sum(l['net_css'] for l in normal)/len(normal)) if normal else '',
            normal_total_goal_gain_css=v9.number(sum(l['toward_goal_css'] for l in normal)),normal_dist_cutoff_css=v9.number(sum(l['css_distance'] for l in normal)),
            rejection_episodes=len(phase_episodes),ended_by_own_step=recovered,ended_by_idle_choice=interrupts,open_demand=sum(i[2]=='open' for i in phase_episodes),
            step_recovery_fraction=v9.rate(recovered,len(phase_episodes)),step_recovery_excluding_idle_choices=v9.rate(recovered,len(phase_episodes)-interrupts),
            longest_step_refusal_s=v9.number(max((b-a for a,b,c in phase_episodes),default=0)),longest_plan_refusal_s=v9.number(max((b-a for a,b,c in plans),default=0)),
            post_first_rejection_episodes=len(after_first),longest_post_first_refusal_s=v9.number(max((b-a for a,b,c in after_first),default=0)) if normal else '',
            post_first_planner_refusals=sum(r['clock']>first for r in failed) if normal else '',
            peer_change_retries=len(early),peer_change_plans=sum(r['accepted'] and r['planned'] for r in early),continuation_retries=len(resumed),
            reopened_original_goal_retries=len(reopened),reopened_original_goal_plans=sum(r['accepted'] and r['planned'] for r in reopened),
            normal_after_received_help=sum(l['assisted'] for l in normal),yielded_legs_cutoff=len(yields),yields_followed_by_own_normal=len(after_yield),
            yielded_wait_to_normal_s='/'.join(str(v9.number(n)) for n in after_yield))
        for phase,table in touch_tables.items():
            touch=table[k];metrics.update({phase+'_touch_'+name:int(touch[field]) for name,field in
                [('trusted','trusted'),('issued','issued'),('planned','routed'),('arrived','terminalArrived'),('near4','terminalNear4')]})
            metrics[phase+'_touch_skipped_reason']=touch.get('skip') or ''
        skip=('own_aged_touch','shared_v8_aged_touch','trusted_touch','opening_touch')
        base={key:value for key,value in existing.items() if not key.startswith(skip)}
        out.append({**roles,**base,**metrics})
    v9.write_csv(path.parent/'residents.csv',out)
    if intervals:v9.write_csv(path.parent/'episodes.csv.gz',intervals)
    assert len(out)==28 and len({r['key'] for r in out})==28
    print(d['arm'], d['width'], d['seed'], d['order'], len(all_legs),'native legs;',sum(r['normal_count_cutoff']>0 for r in out),'normal walkers;',sum(r['normal_count_cutoff']>1 for r in out),'repeat walkers')
    return out

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('file',type=Path);p.add_argument('--cutoff',type=int,default=600)
    p.add_argument('--movement-only',action='store_true',help='Compute movement observations for an independently labelled repeat without input forks')
    args=p.parse_args();measure(args.file,args.cutoff,not args.movement_only)
