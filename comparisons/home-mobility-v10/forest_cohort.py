"""Verify paired native openings and combine individual records from the full continuous cohort."""
import argparse
import csv
import gzip
import hashlib
import json
from pathlib import Path
from forest_metrics import v9

PROFILES=[(390,937,0),(390,214,0),(320,214,0),(375,937,0),(430,214,0),(390,937,937)]
ARMS=['v9','v10','v9-seats','v10-seats','v10-reference']
FOCUS=['pet:dog','companion:tanuki','companion:panda','companion:box']


def read_csv(path):
    with (gzip.open(path,'rt') if path.suffix=='.gz' else path.open()) as source:return list(csv.DictReader(source))


def digest(value):
    return hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()


def collect(files, output):
    cells=[];residents=[];cases={};safety=[]
    for path in files:
        d=v9.load(path);profile=d['width'],d['seed'],d['order'];arm=d['arm'];case=(*profile,arm)
        assert profile in PROFILES and arm in ARMS and case not in cases,case
        rows=read_csv(path.parent/'residents.csv');assert len(rows)==28
        assert d['baseline']['modelSeconds']>=600 and d['wallSeconds']>=600 and not d['errors']
        assert all(int(r['cutoff_s'])==600 and r['arm']==arm and tuple(int(r[k]) for k in ('width','seed','order'))==profile for r in rows)
        assert all((int(r['opening_touch_trusted']) or r['opening_touch_skipped_reason']) and (int(r['aged_touch_trusted']) or r['aged_touch_skipped_reason']) for r in rows)
        restore=v9.load(path.parent/'restore.json');rays=v9.load(path.parent/'directions.json.gz');assert rays['input']==v9.sha(path)
        op={r['key']:r['geometry']['reachable'] for r in rays['observations'] if r['phase']=='opening'}
        opening=[[a.get(k) for k in ('key','kind','x','y','w','h','temperament','nextAt','lastWalk','activity','after','source','target','route','manualUntil','direction','faceKey','recent')] for a in d['initial']['actors']]
        cases[case]=dict(opening=opening,rng=d['initial']['seed'],rays=op,rows=rows)
        num=lambda f:sum(int(r[f]) for r in rows)
        normal=lambda r:int(r['normal_count_cutoff']);typical=lambda r:int(r['normal_count_cutoff'])>1
        worst=max(rows,key=lambda r:float(r['longest_step_refusal_s']))
        by_key={r['key']:r for r in rows};restore_distance=restore.get('ownDistanceModelPx','')
        cell=dict(width=profile[0],seed=profile[1],order=profile[2],arm=arm,model_s=v9.number(d['baseline']['modelSeconds']),wall_s=v9.number(d['wallSeconds']),
            native_source=d['sources']['home-production-model-mobility-'+arm+'.js']['source'],initial_sha256=digest([d['initial']['seed'],opening]),
            requests=num('requests_cutoff'),routed=num('plans_cutoff'),requesters=sum(int(r['requests_cutoff'])>0 for r in rows),
            first_walkers=sum(normal(r)>0 for r in rows),repeat_walkers=sum(typical(r) for r in rows),
            walkers_in_both_halves=sum(int(r['normal_first_half'])>0 and int(r['normal_second_half'])>0 for r in rows),
            never_normal='/'.join(r['key'] for r in rows if normal(r)==0),one_normal='/'.join(r['key'] for r in rows if normal(r)==1),
            longest_refusal_actor=worst['key'],longest_step_refusal_s=worst['longest_step_refusal_s'],longest_plan_refusal_s=max(float(r['longest_plan_refusal_s']) for r in rows),
            open_demands=num('open_demand'),rejections=num('rejection_episodes'),recovered=num('ended_by_own_step'),idle_choices=num('ended_by_idle_choice'),
            changed_retries=num('peer_change_retries'),changed_accepted=num('peer_change_plans'),opening_trusted=num('opening_touch_trusted'),opening_issued=num('opening_touch_issued'),
            opening_arrived=num('opening_touch_arrived'),aged_trusted=num('aged_touch_trusted'),aged_issued=num('aged_touch_issued'),aged_arrived=num('aged_touch_arrived'),
            raw_sha256=v9.sha(path),rays_sha256=v9.sha(path.parent/'directions.json.gz'),
            restore_revision=restore['nativeRevisionAfter'],restore_seconds=restore['modelAfter'],restore_own_starts=restore.get('ambientStarts',''),restore_own_distance_px=restore_distance,
            speed_exceedances=num('speed_bound_exceedances'),between_legs_shifts=num('untracked_between_leg_shifts'),cumulative_shift_css=v9.number(sum(float(r['cumulative_between_leg_shift_css']) for r in rows)),max_shift_css=max(float(r['largest_between_leg_shift_css']) for r in rows))
        for key in FOCUS:
            r=by_key[key];short=key.split(':')[-1];cell[short+'_normal']=normal(r);cell[short+'_normal_net_css']=r['normal_step_net_css'];cell[short+'_longest_post_first_s']=r['longest_post_first_refusal_s']
        cells.append(cell);residents.extend(rows)
    for width,seed,order in PROFILES:
        profile=(width,seed,order);arms=ARMS if width==390 and order==0 else ARMS[:-1]
        assert {a[3] for a in cases if a[:3]==profile}==set(arms),profile
        fixed=cases[(*profile,'v9')]
        for arm in arms:
            plan=cases[(*profile,arm)];assert [a[:2]+a[4:6] for a in fixed['opening']]==[a[:2]+a[4:6] for a in plan['opening']]
        for before,after in [('v9','v10'),('v9','v9-seats'),('v10','v10-seats')]+([('v9-seats','v10-reference')] if 'v10-reference' in arms else []):
            base=cases[(*profile,before)];plan=cases[(*profile,after)]
            same=base['rng']==plan['rng'] and base['opening']==plan['opening']
            if (before,after) in [('v9','v10'),('v9-seats','v10-reference')]:assert same,(*profile,before,after,'initial geometry/decisions differ')
            for k,initial in base['rays'].items():
                other=plan['rays'][k];a=next(r for r in base['rows'] if r['key']==k);b=next(r for r in plan['rows'] if r['key']==k)
                change=dict(width=width,seed=seed,order=order,before=before,after=after,key=k,matched_all_feet_rng_deadlines=same,
                    normal_before=a['normal_count_cutoff'],normal_after=b['normal_count_cutoff'],repeat_before=int(a['normal_count_cutoff'])>1,repeat_after=int(b['normal_count_cutoff'])>1,
                    longest_refusal_before_s=a['longest_step_refusal_s'],longest_refusal_after_s=b['longest_step_refusal_s'])
                for r in ('3','8','16'):
                    headings=set(initial[r]);next_headings=set(other[r]);change['lost_'+r+'px_headings']=len(headings-next_headings);change['gained_'+r+'px_headings']=len(next_headings-headings)
                safety.append(change)
    by_case=lambda a:(PROFILES.index(tuple(int(a[k]) for k in ['width','seed','order'])),ARMS.index(a['arm']))
    v9.write_csv(output/'forest-residents.csv',sorted(residents,key=by_case));v9.write_csv(output/'forest-cells.csv',sorted(cells,key=by_case));v9.write_csv(output/'forest-pairs.csv',safety)
    print(len(cells),'real + native ≥600 s runs;',len(residents),'resident rows;',len(safety),'paired resident comparisons')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True);p.add_argument('files',type=Path,nargs='+');a=p.parse_args();collect(a.files,a.output)
