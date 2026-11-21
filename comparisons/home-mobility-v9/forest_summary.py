"""Join native requests, committed-motion legs, safe directions and trusted input recipients."""
import argparse
import csv
import gzip
import hashlib
import json
import math
from collections import Counter
from pathlib import Path
from statistics import median

HERE=Path(__file__).resolve().parent
FOCUS=('companion:tanuki','companion:panda','companion:box')
def load(path):
    with (gzip.open(path,'rt') if path.suffix=='.gz' else path.open()) as f:return json.load(f)
def write_csv(path,rows):
    path.parent.mkdir(parents=True,exist_ok=True)
    with (gzip.open(path,'wt') if path.suffix=='.gz' else path.open('w')) as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]),lineterminator='\n');w.writeheader();w.writerows(rows)
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def dist(a,b,s):return math.hypot((a[0]-b[0])*s[0],(a[1]-b[1])*s[1])
def number(x):return round(x,3)
def rate(n,d):return number(n/d) if d else ''
def legs(data):
    records=[]
    for x in data['log']['motions']:
        r=data['log']['requests'][x['request']] if x.get('request') is not None else None
        s=x['scale']; net=dist(x['from'],x['last'],s)
        gain=dist(x['from'],r['goal'],s)-dist(x['last'],r['goal'],s) if r else None
        own=x['source']=='ambient' and not x['escape'] and x.get('status')=='arrival' and x['steps']>0 and r is not None
        normal=own and net>=8-1e-7 and gain>.75
        records.append(dict(arm=data['arm'],seed=data['seed'],key=x['key'],source=x['source'],escape=x['escape'],
            helper_for=x['helperFor'] or '',request=x.get('request',''),assisted=bool(r and r['assisted']),
            intent_route=bool(r and r.get('intentRoute')),start_s=number(x['startClock']),last_step_s=number(x['lastClock']),
            finish_s=number(x['endClock']) if 'endClock' in x else '',status=x.get('status','interrupted-or-open'),
            from_x=x['from'][0],from_y=x['from'][1],end_x=x['last'][0],end_y=x['last'][1],
            goal_x=r['goal'][0] if r else '',goal_y=r['goal'][1] if r else '',steps=x['steps'],css_distance=number(x['cssDistance']),
            model_distance=number(x['modelDistance']),net_css=number(net),toward_goal_css=number(gain) if gain is not None else '',
            native_non_escape_arrival=bool(own),completed_normal=bool(normal)))
    return records

def episodes(events,cutoff,keep_intended):
    # A rest choice ends a period of consecutive demand. The wider span ignores
    # idle decisions and reports the model-time delay to the next actual own step.
    started=None;longest=0;recovered=0;open_at_end=False;total=0
    def finish(t):
        nonlocal started,longest,total
        if started is not None:
            elapsed=max(0,t-started);longest=max(longest,elapsed);total+=elapsed;started=None
    for t,kind in sorted(events,key=lambda r:r[0]):
        if t>cutoff:continue
        if kind=='failed' and started is None:started=t
        if kind=='step' and started is not None:
            recovered+=1;finish(t)
        if kind=='voluntary' and not keep_intended:finish(t)
    if started is not None:open_at_end=True;finish(cutoff)
    return number(longest),recovered,int(open_at_end),number(total)

def summarize(path,touches):
    data=load(path);end=data['baseline']['modelSeconds'];arm=data['arm'];seed=data['seed'];all_legs=legs(data)
    assert end>=600 and data['wallSeconds']>=600 and not data['errors']
    assert len(data['baseline']['residents'])==28 and len(data['initial']['actors'])==28
    assert all(t['visible']=='visible' and not t['paused'] and len(t['actors'])==28 for t in data['trajectory'])
    times=[t['clock'] for t in data['trajectory']];assert times==sorted(times)
    assert data['baseline']['eventsRetained']<6000,'event log truncated'
    geometry=load(path.parent/'directions.json.gz');assert geometry['input']==sha(path)
    opening={r['key']:r['geometry'] for r in geometry['observations'] if r['phase']=='opening'}
    endpoint={r['key']:r['geometry'] for r in geometry['observations'] if r['phase']=='endpoint'}
    def counts(g):
        options=g['reachable']
        return sum(map(len,options.values())),len(options['8']),'/'.join(str(v) for v in options['8'])
    rows=[]
    for a in data['baseline']['residents']:
        k=a['key']; records=[r for r in all_legs if r['key']==k];choices=[(t,'voluntary') for t,key,name in data['log']['choices'] if key==k and name in ('turn','look','sit','rest')]
        requests=[r for r in data['log']['requests'] if r['key']==k and r['source']=='ambient']
        planned=[r for r in requests if r['planned']]
        accepted=[r for r in planned if r['accepted']]
        failed=[r for r in planned if not r['accepted']]
        assert (len(requests),len(accepted),len(failed))==(a['ambientRequests'],a['ambientPlans'],a['ambientFailures'])
        assert abs(sum(r['model_distance'] for r in records)-a['actualDistance'])<1e-3*max(1,len(records))
        own=[r for r in records if r['source']=='ambient']
        normal=[r for r in own if r['completed_normal']]; finished=[r for r in own if r['native_non_escape_arrival']]
        fail_events=[(r['clock'],'failed') for r in failed]; steps=[(r['start_s'],'step') for r in own]
        max_to_step,rec,still_open,_=episodes(fail_events+steps,end,True)
        consecutive,active_rec,active_open,failed_duration=episodes(fail_events+steps+choices,end,False)
        normal_gap,normal_rec,normal_open,_=episodes(fail_events+[(r['finish_s'],'step') for r in normal],end,True)
        op_total,op_sectors,op_angles=counts(opening[k]);ep_total,ep_sectors,ep_angles=counts(endpoint[k])
        refusals=[r['geometry'] for r in geometry['observations'] if r['phase']=='refusal' and r['key']==k]
        assert len(refusals)==len(failed)
        times=a['stateSeconds']; choice_totals=a['choices']
        lengths=[r['net_css'] for r in normal]; t=touches.get((arm,k))
        rows.append(dict(arm=arm,seed=seed,key=k,model_s=number(end),wall_s=number(data['wallSeconds']),
            requests=len(requests),plan_attempts=len(planned),routed=len(accepted),plan_rate=rate(len(accepted),len(requests)),
            failed=len(failed),own_steps_started=len(own),own_non_escape_arrivals=len(finished),normal_completions=len(normal),
            normal_at_600=sum(r['finish_s']<=600 for r in normal),normal_net_css='/'.join(map(str,lengths)),
            normal_median_net_css=median(lengths) if lengths else '',normal_max_net_css=max(lengths,default=''),
            total_walked_css=number(sum(r['css_distance'] for r in records)),own_walked_css=number(sum(r['css_distance'] for r in own)),
            normal_walked_css=number(sum(r['css_distance'] for r in normal)),escaped_css=number(sum(r['css_distance'] for r in own if r['escape'])),
            helper_walked_css=number(sum(r['css_distance'] for r in records if r['source']=='yield')),total_model_px=number(a['actualDistance']),
            longest_consecutive_rejection_s=consecutive,total_consecutive_rejection_s=failed_duration,
            own_recoveries_before_rest=active_rec,pending_before_rest_at_end=active_open,
            longest_refusal_to_own_step_s=max_to_step,recovery_to_any_own_step=rec,open_to_own_step=still_open,
            longest_refusal_to_normal_completion_s=normal_gap,recovery_to_normal_completion=normal_rec,open_to_normal=normal_open,
            offers_given=a['yieldsGiven'],offers_received=a['yieldsReceived'],
            helper_starts=sum(r['source']=='yield' for r in records),helper_arrivals=sum(r['source']=='yield' and r['status']=='arrival' for r in records),
            helping_steps_received=sum(r['source']=='yield' and r['helper_for']==k for r in all_legs),assisted_normals=sum(r['assisted'] for r in normal),
            sit_rest_s=number(sum(times.get(n,0) for n in ('sit','rest'))),approach_together_s=number(sum(times.get(n,0) for n in ('approach','together'))),
            voluntary_sit_rest_choices=sum(choice_totals.get(n,0) for n in ('sit','rest')),
            opening_safe_candidates_of_384=op_total,opening_8px_headings_of_48=op_sectors,opening_8px_degrees=op_angles,
            last_safe_candidates_of_384=ep_total,last_8px_headings_of_48=ep_sectors,last_8px_degrees=ep_angles,
            failed_requests_zero_solo_candidates=sum(not any(g['reachable'].values()) for g in refusals),
            failed_requests_with_8plus_toward_goal=sum(any(g['toward'][str(r)] for r in (8,12,18,24)) for g in refusals),
            trusted_touch_arrival_rate=(int(t['terminalArrived']) if t else ''),trusted_touch_attempts=(1 if t else ''),
            trusted_touch_near4=(int(t['terminalNear4']) if t else ''),trusted_touch_recipient=(int(t['issued']) if t else '')))
    write_csv(path.parent/'legs.csv.gz',all_legs)
    return data,rows

def main(args):
    rows=[];records=[]
    touches={}
    if args.touches:
        for arm,entry in load(args.touches)['arms'].items():
            for r in entry['rows']:
                assert r['trusted']
                touches[arm,r['key']]=r
    for path in args.files:
        d,s=summarize(path,touches); rows.extend(s)
        opening=hashlib.sha256(json.dumps(d['opening']['actors'],ensure_ascii=False,separators=(',',':')).encode()).hexdigest()
        stats=dict(arm=d['arm'],seed=d['seed'],opening_sha256=opening,model_s=number(d['baseline']['modelSeconds']),wall_s=number(d['wallSeconds']),
            requests=sum(r['requests'] for r in s),routed=sum(r['routed'] for r in s),any_own_starts=sum(r['own_steps_started']>0 for r in s),
            any_normal=sum(r['normal_completions']>0 for r in s),normal_at_600=sum(r['normal_at_600']>0 for r in s),
            normal_legs=sum(r['normal_completions'] for r in s),requested=sum(r['requests']>0 for r in s),
            pending_end=sum(r['open_to_own_step'] for r in s),gate_reasons=d['baseline']['gateReasons'],care=d['care'],
            missing=[r['key'] for r in s if not r['normal_completions']],focus={r['key']:r for r in s if r['key'] in FOCUS},
            longest_consecutive=max(r['longest_consecutive_rejection_s'] for r in s),max_to_normal=max(r['longest_refusal_to_normal_completion_s'] for r in s),
            browser=d['browser'],rawsha=sha(path),rayssha=sha(path.parent/'directions.json.gz'),legssha=sha(path.parent/'legs.csv.gz'))
        records.append(stats)
    for seed in set(r['seed'] for r in records):
        if {r['arm'] for r in records if r['seed']==seed}>={'v8','v9'}:
            fixed=[r for r in records if r['seed']==seed and r['arm'] in ('v8','v9')]
            assert len({r['opening_sha256'] for r in fixed})==1
    write_csv(args.out/'forest-residents.csv',rows)
    args.summary.write_text(json.dumps(records,ensure_ascii=False,indent=2))
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--out',type=Path,required=True);p.add_argument('--summary',type=Path,required=True)
    p.add_argument('--touches',type=Path);p.add_argument('files',nargs='+',type=Path);main(p.parse_args())
