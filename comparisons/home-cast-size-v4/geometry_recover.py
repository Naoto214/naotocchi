"""Measure native fixtures absent from uploaded shards, preserving completed observations."""
import argparse
from concurrent.futures import ProcessPoolExecutor
from itertools import product
from pathlib import Path
from geometry_collect import REGIONS,HEIGHTS,shard,read

def missing(args):
    jobs=[]
    for w,r,n in product(args.widths,args.regions,args.counts):
        f=f'{w}-{r}-{n}.json.gz'
        if f'{w}/{r}/{n}' in args.skip:continue
        available=[p for root in args.present for p in root.rglob(f) if p.parent.name==args.layout and p.parent.parent.name!='errors']
        if any(read(p).get('phaseSeconds')==[0,8,30] for p in available):continue
        jobs.append((w,r,n))
    return jobs
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('url');p.add_argument('out',type=Path);p.add_argument('--game',type=Path,required=True)
    p.add_argument('--present',type=Path,nargs='+',default=[]);p.add_argument('--skip',nargs='*',default=[])
    p.add_argument('--layout',choices=['fixed','optimized'],required=True);p.add_argument('--regions',nargs='+',choices=REGIONS,default=REGIONS)
    p.add_argument('--widths',nargs='+',type=int,choices=HEIGHTS,default=list(HEIGHTS));p.add_argument('--counts',type=int,nargs='+',default=list(range(18,29)))
    p.add_argument('--jobs',type=int,default=1);a=p.parse_args()
    jobs=missing(a);print(f'{len(jobs)} absent native fixtures for {a.layout}',jobs,flush=True)
    if jobs:
        chunks=[(a,jobs[i::a.jobs],i) for i in range(min(a.jobs,len(jobs)))]
        with ProcessPoolExecutor(a.jobs) as pool:list(pool.map(shard,chunks))
