"""Compare matched native browser observations from main and both #584 revisions."""
import argparse
import csv
import importlib.util
import itertools
import json
import math
import statistics
from pathlib import Path

from regional import HEIGHT, REGIONS

spec = importlib.util.spec_from_file_location('pair_report', Path(__file__).with_name('pair-report.py'))
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)


def measure(row, main):
    placement = row['placements']['opening']
    main_feet = report.by_key(main['placements']['opening'])
    feet = placement['feet']
    peers = [a for a in feet if a['kind'] == 'companion']
    deviations = [math.dist(a['screen'], main_feet[a['key']]['screen']) for a in peers]
    leads = [a for a in feet if a['kind'] in ('pet', 'partner')]
    def distance(field):
        return math.dist(*(a[field] for a in leads))
    layout = report.regional_report.compact(row)
    retry = row.get('alternate')
    return dict(
        **{k: layout[k] for k in ('hops', 'contact', 'terrain', 'occlusion', 'speed', 'errors',
                                  'tapped', 'dragIssued', 'dragAccepted', 'conversation', 'evolution',
                                  'equipment', 'census', 'time', 'reload', 'decoded', 'shadows')},
        dragWalked=bool(layout['dragHops']), companionFeet=len(peers),
        movedCompanions=sum(d > .01 for d in deviations), maxCompanionPx=max(deviations, default=0),
        layerChangedCompanions=sum(a['layer'] != main_feet[a['key']]['layer'] for a in peers),
        sizeChangedCompanions=sum(a['size'] != main_feet[a['key']]['size'] for a in peers),
        pairDistance=distance('screen') if len(leads) == 2 else None,
        pairDistanceError=abs(distance('screen') - distance('solverScreen')) if len(leads) == 2 else None,
        openingContacts=len(placement['contacts']),
        openingLeadContacts=sum(any(a['key'] in pair[:2] for a in leads) for pair in placement['contacts']),
        ordinarySyncMaxPx=max(report.movement(placement,row['placements']['sync'])),
        probedWait=bool(retry), requestedRayBlocked=bool(retry and not retry['target']['clearance']['straightClear']),
        alternateExists=bool(retry and retry['target']['clearance']['alternate']),
        alternateWalked=bool(retry and retry['target']['clearance']['alternate'] and retry['trace']['sourceHops'].get('drag')),
        alternateViolations=sum(retry['trace'][k] for k in ('contact','occlusion','speed','terrain')) if retry else 0,
        travel=row['placements']['travel']['region']==('forest' if row['region']=='home' else 'home'),
        returned=row['placements'].get('returnTrip', {}).get('region') == row['region'] if 'returnTrip' in row['placements'] else None)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for label in ('production','before','after','out'):
        parser.add_argument(label,type=Path)
    args=parser.parse_args()
    expected=set(itertools.product(REGIONS,report.COUNTS,HEIGHT))
    groups={}
    for label in ('production','before','after'):
        group=report.load_rows([getattr(args,label)])
        arm='production' if label=='production' else 'candidate'
        if set(group)!={(*key,arm) for key in expected}:
            raise ValueError(f'Incomplete {label} measurements')
        groups[label]={k[:3]:v for k,v in group.items()}
    summary={}
    table=[]
    for label,group in groups.items():
        observations=[]
        for key,row in sorted(group.items()):
            values=measure(row,groups['production'][key])
            observations.append(values)
            table.append(dict(region=key[0],count=key[1],width=key[2],arm=label,**values))
        metrics={}
        for field in observations[0]:
            vals=[r[field] for r in observations if r[field] is not None]
            if field in ('pairDistance','pairDistanceError'):
                metrics[field]=dict(cells=len(vals),median=statistics.median(vals),max=max(vals))
            elif field in ('ordinarySyncMaxPx','maxCompanionPx'):
                metrics[field]=max(vals)
            else:
                metrics[field]=sum(vals) if vals else None
        summary[label]=metrics
    args.out.mkdir(parents=True,exist_ok=True)
    with (args.out/'cells.csv').open('w') as f:
        writer=csv.DictWriter(f,table[0],lineterminator='\n')
        writer.writeheader()
        writer.writerows(table)
    (args.out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')


if __name__=='__main__':
    main()
