"""Compare the same native home in two isolated browser contexts at every checkpoint."""
import argparse
import gzip
import json
import math
import os
from pathlib import Path

import regional
from playwright.sync_api import sync_playwright


def changed(before, after, tolerance=0.01):
    return len(before) != len(after) or any(abs(a-b) > tolerance for a,b in zip(before,after))


def compare(base, trial):
    opening = []
    differences = {}
    for name, original in base['placements'].items():
        other = trial['placements'][name]
        rows = []
        for key in ('region','frame','camera','cover'):
            left, right = original[key], other[key]
            if (left != right if isinstance(left,str) else changed(left,right)):
                rows.append(key)
        old = {a['key']:a for a in original['feet']}
        new = {a['key']:a for a in other['feet']}
        for key in sorted(old.keys() | new.keys()):
            if key not in old or key not in new:
                rows.append([key,'missing'])
                continue
            for field in ('stage','actual','screen','imageSize','size','display','image','layer','visible'):
                l,r=old[key][field],new[key][field]
                mismatch=changed(l,r) if isinstance(l,list) and l and isinstance(l[0],(int,float)) and r else l!=r
                if mismatch:
                    rows.append([key,field,l,r])
        differences[name]=rows
        if name=='opening': opening=rows

    def metrics(row):
        trace=row['observation']['trace']
        return dict(drag=trace['sourceHops'].get('drag',0),auto=sum(v for k,v in trace['sourceHops'].items() if k!='drag'),
                    distance=trace['distance'],walkers=len(trace['walkers']),contacts=trace['contact'],
                    terrain=trace['terrain'],occlusion=trace['occlusion'],speed=trace['speed'],
                    commands=trace['commands'],tap=row['tap'],trusted=row['observation']['trusted'])
    b,t=metrics(base),metrics(trial)
    losses=[]
    if opening:losses.append('opening')
    if base['target']!=trial['target']:losses.append('input-target')
    for field in ('drag','auto','walkers'):
        if b[field] and not t[field]:losses.append(field)
    for field in ('contacts','terrain','occlusion','speed'):
        if t[field]>b[field]:losses.append(field)
    if (b['tap'] and t['tap']!=b['tap']) or (b['trusted'] and not t['trusted']):losses.append('input')
    for field in ('changed','evolved','conversation','restored','reloaded','returnGate'):
        l,r=base['lifecycle'][field],trial['lifecycle'][field]
        if field=='changed':l,r=l['state'],r['state']
        if l!=r:losses.append(field)
    if base['errors'] or trial['errors']:losses.append('pageerror')
    if base['fixture']!=trial['fixture']:losses.append('fixture')
    return dict(losses=losses,base=b,candidate=t,differences=differences)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for key in ('production','candidate','out'):p.add_argument('--'+key,type=Path,required=True)
    p.add_argument('--region',choices=regional.REGIONS,required=True)
    p.add_argument('--counts',type=int,nargs='+',default=[1,4,10,20,28])
    p.add_argument('--widths',type=int,nargs='+',default=list(regional.HEIGHT))
    args=p.parse_args()
    args.out.mkdir(parents=True,exist_ok=True)
    roots={'production':args.production,'candidate':args.candidate}
    urls={arm:regional.serve(path) for arm,path in roots.items()}
    summary=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--disable-dev-shm-usage'])
        for n in args.counts:
            for w in args.widths:
                key=f'{args.region}-{n}-{w}'
                try:
                    runs={arm:regional.run(browser,path,urls[arm],args.region,n,w,arm,30,True) for arm,path in roots.items()}
                    result=compare(runs['production'],runs['candidate'])
                    with gzip.open(args.out/(key+'.json.gz'),'wt') as f:
                        json.dump(dict(runs=runs,comparison=result),f,separators=(',',':'))
                    summary.append(dict(case=key,losses=result['losses'],base=result['base'],candidate=result['candidate']))
                except Exception as exc:
                    summary.append(dict(case=key,error=str(exc)))
                print(key,summary[-1].get('error',summary[-1].get('losses')),flush=True)
                (args.out/'summary.json').write_text(json.dumps(summary,indent=2))
        browser.close()
    if any(row.get('losses') or row.get('error') for row in summary):raise SystemExit(1)


if __name__=='__main__':main()
