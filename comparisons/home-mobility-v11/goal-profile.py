"""Replay forest walks in the original model and store changed goals plus their actual native arrivals."""
import argparse
import csv
import json
import math
import os
from pathlib import Path
import subprocess
from concurrent.futures import ThreadPoolExecutor

HERE = Path(__file__).resolve().parent
NATIVE = HERE.parent / "home-mobility-v10" / "native-preflight.mjs"

def run(condition):
    mode, width, seed = condition
    output = args.output / f"{mode}-{width}-{seed}.json"
    if not args.reuse or not output.exists():
        env = dict(os.environ, GOAL_PROFILE_MODE=mode, GOAL_PROFILE_OUT=str(output))
        result = subprocess.run(["node",str(NATIVE),str(width),"v10",str(seed),str(HERE/"goal-profile.cjs")],
                                env=env, capture_output=True, check=True)
        output.with_suffix(".household.json").write_bytes(result.stdout)
    walks=json.loads(output.read_bytes())
    home=json.loads(output.with_suffix(".household.json").read_bytes())
    completed=[row for row in walks if row['status']=='arrived']
    changed=[row for row in walks if row['changed']]
    changed_done=[row for row in changed if row['status']=='arrived']
    def values(rows,key):
        return [x[key] for x in rows]
    def bins(series):
        return len({math.floor(v/45)%8 for v in series})
    def mean(series):
        return round(sum(series)/len(series),3) if series else None
    row=dict(mode=mode,width=width,seed=seed,first=home['strict'],repeated=home['repeated'],ownWalks=home['walks'],
             physicalAmbientCss=round(sum(r['distance'] for r in home['records']),3),freeWalkDraws=len(walks),
             accepted=sum(r.get('planEndpoint') is not None for r in walks),freeWalkArrived=len(completed),
             changed=len(changed),changedArrived=len(changed_done),changedWithRawGoalProgress=sum(r['rawProgress']>.75 and r['net']>=8-1e-6 for r in changed_done),
             nativeArrivalsWithRawGoalProgress=sum(r['rawProgress']>.75 and r['net']>=8-1e-6 for r in completed),
             rawHeadingOctants=bins(values(walks,'rawBearing')),chosenHeadingOctants=bins(values(walks,'chosenBearing')),
             meanRawRequestedCss=mean(values(walks,'rawDistance')),meanIssuedCss=mean(values(walks,'chosenDistance')),
             meanCompletedNet=mean(values(completed,'net')),meanCompletedNativeTravel=mean(values(completed,'travel')))
    return row, [dict(width=width,seed=seed,mode=mode,**{k:v for k,v in q.items() if k!='elapsedCompute'}) for q in changed], walks

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('output',type=Path)
    parser.add_argument('--jobs',type=int,default=1)
    parser.add_argument('--reuse',action='store_true')
    parser.add_argument('--modes',nargs='+',default=['baseline','candidate','unrestricted','late'])
    parser.add_argument('--seeds',nargs='+',type=int,default=[214,937,911,2026])
    args=parser.parse_args()
    args.output=args.output.resolve()
    args.output.mkdir(parents=True,exist_ok=True)
    conditions=[(mode,width,seed) for seed in args.seeds for width in (320,390) for mode in args.modes]
    with ThreadPoolExecutor(args.jobs) as pool: results=list(pool.map(run,conditions))
    for name,rows in [('summary',[t[0] for t in results]),('changed',[r for t in results for r in t[1]])]:
        with (args.output/f'{name}.csv').open('w',newline='') as f:
            writer=csv.DictWriter(f,fieldnames=rows[0].keys(),lineterminator='\n')
            writer.writeheader();writer.writerows(rows)
