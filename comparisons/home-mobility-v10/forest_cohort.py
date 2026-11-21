"""Verify paired native openings and combine individual records from the full continuous cohort."""
import argparse
import csv
import gzip
import hashlib
import json
from pathlib import Path
from forest_metrics import refusal_intervals, v9

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
        native_legs=read_csv(path.parent/'legs.csv.gz')
        for r in rows:
            key=r['key']
            reopened=[q for q in d['log']['requests'] if q['key']==key and q['source']=='ambient' and q['clock']<=600 and q.get('reopened')]
            r['reopened_original_goal_retries']=len(reopened);r['reopened_original_goal_plans']=sum(q['planned'] and q['accepted'] for q in reopened)
            rejected=[(q['clock'],'refusal') for q in d['log']['requests'] if q['key']==key and q['source']=='ambient' and q['planned'] and not q['accepted']]
            normal=[(float(l['finish_s']),'own_normal') for l in native_legs if l['key']==key and l['completed_normal']=='True' and float(l['finish_s'])<=600]
            idle=[(t,'idle_choice') for t,k,name in d['log']['choices'] if k==key and name in ('look','turn','rest','sit')]
            demand=refusal_intervals(rejected+normal+idle,600)
            post=[e for e in demand if normal and e[0]>=normal[0][0]]
            r.update(strict_normal_rejection_episodes=len(demand),strict_normal_recoveries=sum(c=='own_normal' for _,_,c in demand),
                strict_normal_ended_idle=sum(c=='idle_choice' for _,_,c in demand),strict_normal_open=sum(c=='open' for _,_,c in demand),
                longest_refusal_to_normal_before_idle_s=v9.number(max((b-a for a,b,c in demand),default=0)),
                longest_post_first_refusal_to_normal_before_idle_s=v9.number(max((b-a for a,b,c in post),default=0)) if normal else '')
        assert d['baseline']['modelSeconds']>=600 and d['wallSeconds']>=600 and not d['errors']
        assert all(int(r['cutoff_s'])==600 and r['arm']==arm and tuple(int(r[k]) for k in ('width','seed','order'))==profile for r in rows)
        assert all((int(r['opening_touch_trusted']) or r['opening_touch_skipped_reason']) and (int(r['aged_touch_trusted']) or r['aged_touch_skipped_reason']) for r in rows)
        restore=v9.load(path.parent/'restore.json');rays=v9.load(path.parent/'directions.json.gz');assert rays['input']==v9.sha(path)
        op={r['key']:r['geometry']['reachable'] for r in rays['observations'] if r['phase']=='opening'}
        opening=[[a.get(k) for k in ('key','kind','x','y','w','h','temperament','nextAt','lastWalk','activity','after','source','target','route','manualUntil','direction','faceKey','recent')] for a in d['initial']['actors']]
        shared_fixture=[d['sources'][n]['source'] for n in ('fixture.js','population-beauty.js')]
        fixture=v9.load(path.parent/'initial-save.json')
        household=(fixture['regionId'],fixture['partner']['id'],[a['id'] for a in fixture['companions']],[(a[0],a[1]) for a in d['opening']['actors']])
        cases[case]=dict(opening=opening,rng=d['initial']['seed'],rays=op,rows=rows,browser=d['browser'],shared_fixture=shared_fixture,household=household)
        num=lambda f:sum(int(r[f]) for r in rows)
        normal=lambda r:int(r['normal_count_cutoff']);typical=lambda r:int(r['normal_count_cutoff'])>1
        worst=max(rows,key=lambda r:float(r['longest_step_refusal_s']))
        by_key={r['key']:r for r in rows};restore_distance=restore.get('ownDistanceModelPx','')
        gate_reasons=d['baseline']['gateReasons']
        authored_answers=sum(e['action']=='trusted native question answer' for e in d['care'])
        cell=dict(width=profile[0],seed=profile[1],order=profile[2],arm=arm,model_s=v9.number(d['baseline']['modelSeconds']),wall_s=v9.number(d['wallSeconds']),
            browser=d['browser'],native_source=d['sources']['home-production-model-mobility-'+arm+'.js']['source'],initial_sha256=digest([d['initial']['seed'],opening]),
            requests=num('requests_cutoff'),routed=num('plans_cutoff'),requesters=sum(int(r['requests_cutoff'])>0 for r in rows),
            first_walkers=sum(normal(r)>0 for r in rows),repeat_walkers=sum(typical(r) for r in rows),
            walkers_in_both_halves=sum(int(r['normal_first_half'])>0 and int(r['normal_second_half'])>0 for r in rows),
            never_normal='/'.join(r['key'] for r in rows if normal(r)==0),one_normal='/'.join(r['key'] for r in rows if normal(r)==1),
            longest_refusal_actor=worst['key'],longest_step_refusal_s=worst['longest_step_refusal_s'],longest_plan_refusal_s=max(float(r['longest_plan_refusal_s']) for r in rows),
            longest_refusal_to_normal_before_idle_s=max(float(r['longest_refusal_to_normal_before_idle_s']) for r in rows),strict_normal_demand=num('strict_normal_rejection_episodes'),strict_normal_recoveries=num('strict_normal_recoveries'),
            open_demands=num('open_demand'),rejections=num('rejection_episodes'),recovered=num('ended_by_own_step'),idle_choices=num('ended_by_idle_choice'),
            changed_retries=num('peer_change_retries'),changed_accepted=num('peer_change_plans'),reopened_retries=num('reopened_original_goal_retries'),reopened_accepted=num('reopened_original_goal_plans'),opening_trusted=num('opening_touch_trusted'),opening_issued=num('opening_touch_issued'),
            opening_arrived=num('opening_touch_arrived'),aged_trusted=num('aged_touch_trusted'),aged_issued=num('aged_touch_issued'),aged_arrived=num('aged_touch_arrived'),
            care_events=len(d['care']),authored_answers=authored_answers,illness_gate_s=v9.number(gate_reasons.get('illness',0)),conversation_gate_s=v9.number(gate_reasons.get('conversation',0)),
            gate_reasons_s=json.dumps({k:v9.number(v) for k,v in gate_reasons.items()},ensure_ascii=False,separators=(',',':')),
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
            plan=cases[(*profile,arm)]
            assert fixed['household']==plan['household'] and fixed['browser']==plan['browser'] and fixed['shared_fixture']==plan['shared_fixture'],(*profile,arm,'incompatible browser or fixture')
            assert [a[:2]+a[4:6] for a in fixed['opening']]==[a[:2]+a[4:6] for a in plan['opening']]
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
