"""Compare each successive candidate on identical fixture bytes and opening coordinates."""
import argparse
import csv
import json
from pathlib import Path

from summarize import load


def opening(p):
    return [p['frame'],p['cover'],p['camera'],p['paintedFrame'],
            [[a[k] for k in ('key','actual','stage','screen','layer','image','imageSize','size','display','visible')] for a in p['feet']]]


def outcome(run):
    trace=run['observation']['trace']
    return [trace['hops'],trace['distance'],trace['walkers'],trace['sourceHops'],trace['terrain'],trace['occlusion'],
            trace['speed'],trace['contact'],trace['commands'],run['tap'],run['target']]


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('out',type=Path)
    p.add_argument('archives',type=Path,nargs=3)
    args=p.parse_args();args.out.mkdir(exist_ok=True,parents=True)
    matrices=[load(folder)[0] for folder in args.archives]
    common=set.intersection(*(set(m) for m in matrices))
    if len(common)!=260:raise ValueError(f'Incomplete {len(common)}/260')
    totals={};rows=[]
    for case in sorted(common):
        raw=[m[case]['runs'] for m in matrices]
        controls=[m['production'] for m in raw]
        stages=[m['candidate'] for m in raw]
        if len({arm['fixture'] for m in raw for arm in m.values()})!=1:
            raise ValueError('Unmatched starting save '+case)
        row={'case':case,'baselineTracesExact':all(outcome(c)==outcome(controls[0]) for c in controls[1:])}
        for label,x,y in [('A-B',*stages[:2]),('B-C',*stages[1:])]:
            row[label+'_openingExact']=opening(x['placements']['opening'])==opening(y['placements']['opening'])
            row[label+'_movementTraceExact']=outcome(x)==outcome(y)
            row[label+'_mutatedStateExact']=x['lifecycle']['changed']['state']==y['lifecycle']['changed']['state']
            row[label+'_savedAndReloadedExact']=x['lifecycle']['reloaded']==y['lifecycle']['reloaded']
            row[label+'_returnGateExact']=x['lifecycle']['returnGate']==y['lifecycle']['returnGate']
            row[label+'_questionExact']=x['lifecycle']['conversation']==y['lifecycle']['conversation']
        rows.append(row)
    for field in list(rows[0])[1:]:
        totals[field]={'matched':sum(row[field] for row in rows),'different':[row['case'] for row in rows if not row[field]]}
    (args.out/'summary.json').write_text(json.dumps(totals,indent=2)+'\n')
    with (args.out/'cells.csv').open('w') as stream:
        table=csv.DictWriter(stream,fieldnames=rows[0],lineterminator='\n')
        table.writeheader();table.writerows(rows)
    print(json.dumps(totals))

if __name__=='__main__':main()
