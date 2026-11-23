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
    hero = next(a for a in leads if a['kind'] == 'pet')
    mate = next((a for a in leads if a['kind'] == 'partner'), None)
    main_distance = math.dist(main_feet[hero['key']]['screen'],main_feet[mate['key']]['screen']) if mate else None
    pair_distance = distance('screen') if mate else None
    return dict(
        heroFootExact=hero['screen']==main_feet[hero['key']]['screen'],
        exactCompanionFeet=sum(a['screen']==main_feet[a['key']]['screen'] for a in peers),
        exactCompanionStageFeet=sum(a['stage']==main_feet[a['key']]['stage'] for a in peers),
        sameCompanionOrder=[a['key'] for a in peers]==[a['key'] for a in main_feet.values() if a['kind']=='companion'],
        heroMoved=math.dist(hero['screen'], main_feet[hero['key']]['screen']) > .01,
        mateMoved=(math.dist(mate['screen'], main_feet[mate['key']]['screen']) > .01) if mate else None,
        pairCloserThanMain=(pair_distance < main_distance - .01) if mate else None,
        pairFartherThanMain=(pair_distance > main_distance + .01) if mate else None,
        companionLayoutMatches=all(d <= .01 for d in deviations),
        invalidOpeningFeet=sum(not a['valid'] for a in feet),
        occludedOpeningFeet=sum(not a['visible'] for a in feet),
        unpaintedOpeningFeet=sum(not a['painted'] for a in feet),
        outsideFrameFeet=sum(a['edge'] < -.001 for a in feet),
        shadowMisaligned=layout['maxShadowOffset'] is None or layout['maxShadowOffset']>.001,
        sweptSeconds=layout['seconds'],
        **{k: layout[k] for k in ('hops', 'contact', 'terrain', 'occlusion', 'speed', 'errors',
                                  'tapped', 'dragIssued', 'dragAccepted', 'conversation', 'evolution',
                                  'equipment', 'census', 'time', 'reload', 'decoded', 'shadows')},
        dragWalked=bool(layout['dragHops']), companionFeet=len(peers),
        movedCompanions=sum(d > .01 for d in deviations), maxCompanionPx=max(deviations, default=0),
        layerChangedCompanions=sum(a['layer'] != main_feet[a['key']]['layer'] for a in peers),
        sizeChangedCompanions=sum(a['size'] != main_feet[a['key']]['size'] for a in peers),
        pairDistance=pair_distance,
        partnerDx=(mate['screen'][0]-hero['screen'][0]) if mate else None,
        partnerDy=(mate['screen'][1]-hero['screen'][1]) if mate else None,
        partnerFrameRightMargin=(placement['frame'][2]-mate['screen'][0]) if mate else None,
        partnerFrameTopMargin=(mate['screen'][1]-placement['frame'][1]) if mate else None,
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
        hashes=next(iter(group.values()))['sources']
        if any(r['sources'] != hashes for r in group.values()):
            raise ValueError(f'Mixed runtime hashes for {label}')
        metrics=dict(runtimeSha256=hashes,cells=len(observations))
        for field in observations[0]:
            vals=[r[field] for r in observations if r[field] is not None]
            if field in ('pairDistance','pairDistanceError','partnerDx','partnerDy','partnerFrameRightMargin','partnerFrameTopMargin'):
                metrics[field]=dict(cells=len(vals),min=min(vals),median=statistics.median(vals),max=max(vals))
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
