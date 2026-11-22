"""Validate complete regional artifacts, preserve per-cell outcomes, and report exceptions."""
import argparse
import csv
import itertools
import json
from collections import Counter
from pathlib import Path
from regional import ENTRIES, HEIGHT, REGIONS

COUNTS = [1,4,10,20,28]

def compact(row):
    trace=row['observation']['trace']
    start=row['opening']
    end=row['observation']['end']
    life=row['lifecycle']
    target=row['target']
    moves=[r for r in trace['commands'] if r['name']=='move']
    selections=[r for r in trace['commands'] if r['name']=='select']
    n=row['count']
    held=life['restored']==life['reloaded']
    changed=life['changed']['rendered']
    offsets=[s['shadowOffset'] for s in (start,end,row['resized'])]
    return dict(region=row['region'],count=n,width=row['width'],arm=row['arm'],
        seconds=round(end['clock']-start['clock'],3),walkers=len(trace['walkers']),
        ambientHops=trace['sourceHops'].get('ambient',0),dragHops=trace['sourceHops'].get('drag',0),
        yieldHops=trace['sourceHops'].get('yield',0),hops=trace['hops'],
        terrain=trace['terrain'],occlusion=trace['occlusion'],speed=trace['speed'],contact=trace['contact'],
        exposed=bool(target),trusted=row['observation']['trusted'],
        tapped=bool(target and row['tap']==target['key'] and selections),
        dragIssued=bool(target and any(m['key']==target['key'] for m in moves)),
        dragAccepted=bool(target and any(m['key']==target['key'] and m['ok'] for m in moves)),
        decoded=all(s['world']['loaded'] and not s['world']['error'] for s in (start,end,row['resized'])),
        shadows=all(s['shadows']==n for s in (start,end,row['resized'])),
        maxShadowOffset=round(max(offsets),6) if all(offset is not None for offset in offsets) else None,
        conversation=life['conversation'],evolution=life['evolved'],equipment=life['changed']['state'][2]=='ribbon',
        census=changed['count']==(n+1 if n<=2 else n-1) and row['resized']['count']==n,
        time=changed['time']=='night',reload=held,errors=len(row['errors']))

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('inputs',type=Path)
    p.add_argument('table',type=Path)
    p.add_argument('summary',type=Path)
    p.add_argument('--sha',required=True)
    p.add_argument('--run',required=True,help='Source workflow or local receipt for this dataset')
    p.add_argument('--arms',nargs='+',choices=ENTRIES,default=['production','candidate','v11','v13'])
    a=p.parse_args()
    expected=set(itertools.product(REGIONS,COUNTS,HEIGHT,a.arms))
    rows={}
    for f in a.inputs.rglob('*.json'):
        item=json.loads(f.read_bytes())
        key=tuple(item[s] for s in ('region','count','width','arm'))
        if key not in expected or key in rows:raise ValueError(f'Unexpected cell {key}')
        rows[key]=compact(item)
    missing=expected-rows.keys()
    if missing:raise ValueError(f'{len(missing)} missing native observations')
    results=[]
    for arm in a.arms:
        selected=[v for k,v in rows.items() if k[-1]==arm]
        numeric='hops ambientHops dragHops yieldHops terrain occlusion speed contact errors'.split()
        booleans='exposed trusted tapped dragIssued dragAccepted decoded shadows conversation evolution equipment census time reload'.split()
        sums={k:sum(r[k] for r in selected) for k in numeric+booleans}
        results.append(dict(arm=arm,cells=len(selected),**sums,
            shadowDiscrepancies=sum(r['maxShadowOffset'] is None or r['maxShadowOffset']>.001 for r in selected),
            noAmbientHops=sum(not r['ambientHops'] for r in selected),
            deferredDragWalks=sum(r['dragIssued'] and not r['dragAccepted'] and r['dragHops']>0 for r in selected),
            dragDidNotWalk=sum(r['dragIssued'] and r['dragHops']==0 for r in selected),
            modelDurations=dict(Counter(r['seconds'] for r in selected))))
    with a.table.open('w') as file:
        writer=csv.DictWriter(file,fieldnames=next(iter(rows.values())).keys(),lineterminator='\n')
        writer.writeheader()
        writer.writerows(rows[k] for k in sorted(rows))
    a.summary.write_text(json.dumps(dict(source=a.sha,run=a.run,engines='Chromium',results=results),indent=2)+'\n')
    print(a.summary.read_text())
if __name__=='__main__':main()
