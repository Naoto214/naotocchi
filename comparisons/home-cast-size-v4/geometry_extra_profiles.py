"""Measure the five authored seat profiles at heights outside the six standard phones."""
import argparse
import csv
from pathlib import Path

from geometry_collect import HEIGHTS,shard,read
from geometry_summary import row

PROFILES=((350,649,'home',28),(350,649,'river_lake',28),(360,693,'home',28),
          (360,693,'forest',24),(360,693,'forest',28))

def capture(args):
    for width,height,region,count in PROFILES:
        HEIGHTS[width]=height+52
        args.out=args.root/f'{width}x{height}'
        args.layout='both'
        shard((args,[(width,region,count)],str(args.out.name)))
def summarize(args):
    rows=[]
    for width,height,region,count in PROFILES:
        for layout in ('fixed','optimized'):
            d=read(args.root/f'{width}x{height}'/layout/f'{width}-{region}-{count}.json.gz')
            assert d['fixture']['height']==height
            tr,=d['trajectories']
            for condition in tr['conditions']:
                _,curve,policy=condition.split('/')
                for sec,phase in zip((0,8,30),tr['phases'],strict=True):
                    gain=phase['settings'][curve+'/'+policy][0]
                    rows.append(dict(width=width,gameHeight=height,region=region,count=count,layout=layout,curve=curve,policy=policy,
                        seconds=sec,extra=float(gain),controllerSha256=d['source']['home-production-diorama-population.js'],fitRecoveries=phase.get('populationFitRecoveries'),**row(tr,phase,gain)))
            if layout=='optimized':
                for condition,reference in d['references'].items():
                    _,curve,policy=condition.split('/')
                    assert reference=='fixed/'+curve+'/'+policy
                    matching=[r for r in rows if r['width']==width and r['gameHeight']==height and r['count']==count
                        and r['region']==region and r['layout']=='fixed' and r['curve']==curve and r['policy']==policy]
                    assert len(matching)==3
                    rows.extend(dict(r,layout='optimized') for r in matching)
                assert any(p is not None for p in tr['plan'])
                for sec,phase in zip((0,8,30),tr['phases'],strict=True):
                    rows.append(dict(width=width,gameHeight=height,region=region,count=count,layout='optimized-at-zero-diagnostic',
                        curve='linear',policy='current',seconds=sec,extra=0,controllerSha256=d['source']['home-production-diorama-population.js'],fitRecoveries=phase.get('populationFitRecoveries'),**row(tr,phase,'0')))
    with args.csv.open('w',newline='') as f:
        writer=csv.DictWriter(f,lineterminator="\n",fieldnames=rows[0]);writer.writeheader();writer.writerows(rows)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('url');p.add_argument('game',type=Path);p.add_argument('root',type=Path)
    p.add_argument('--controller',type=Path,help='Pin a candidate controller for every profile');p.add_argument('--csv',type=Path,required=True);p.add_argument('--report-only',action='store_true')
    a=p.parse_args()
    if not a.report_only:capture(a)
    summarize(a)
