"""Summarize native, matched household observations from the two placement workflows."""
import argparse
import csv
import importlib.util
import itertools
import json
import math
import statistics
from collections import Counter
from pathlib import Path

from regional import HEIGHT, REGIONS

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('regional_report', HERE / 'regional-report.py')
regional_report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(regional_report)
ARMS = ('production', 'prior', 'candidate')
COUNTS = (1, 4, 10, 20, 28)
PHASES = ('opening', 'sync', 'walked', 'lifecycle', 'resized', 'reload', 'travel')


def by_key(phase):
    return {a['key']: a for a in phase['feet']}


def movement(before, after, kind=None):
    older = by_key(before)
    return [math.dist(older[a['key']]['screen'], a['screen']) for a in after['feet']
            if a['key'] in older and (not kind or a['kind'] == kind)]


def phase_metrics(phase, reference):
    feet = phase['feet']
    pet = next(a for a in feet if a['kind'] == 'pet')
    partner = next((a for a in feet if a['kind'] == 'partner'), None)
    data = {}
    for role, actor in [('pet', pet), ('partner', partner)]:
        for space in ('screen', 'art', 'nativeArt'):
            for i, axis in enumerate(('X', 'Y' if space == 'screen' else 'Z')):
                data[role + space[:1].upper() + space[1:] + axis] = actor[space][i] if actor else None
    dx = dy = dist = dist_delta = vector_error = order = order_changed = None
    if partner:
        dx, dy = [q - p for p, q in zip(pet['screen'], partner['screen'])]
        dist = math.hypot(dx, dy)
        rp, rq = (next(f for f in reference['feet'] if f['kind'] == role) for role in ('pet', 'partner'))
        rx, ry = [q - p for p, q in zip(rp['screen'], rq['screen'])]
        dist_delta = dist - math.hypot(rx, ry)
        vector_error = math.hypot(dx-rx, dy-ry)
        def side(x):
            return 0 if abs(x) < .001 else (1 if x > 0 else -1)
        order = side(dx)
        order_changed = order != side(rx)
    contacts = {tuple(sorted(pair[:2])) for pair in phase['contacts']}
    old_contacts = {tuple(sorted(pair[:2])) for pair in reference['contacts']}
    peers = movement(reference, phase, 'companion')
    previous = by_key(reference)
    return dict(**data, dx=dx, dy=dy, distance=dist, distanceDeltaMain=dist_delta,
                vectorErrorMain=vector_error, order=order, orderChanged=order_changed,
                partnerSideMargin=partner['horizontalEdge'] if partner else None,
                partnerEdge=partner['edge'] if partner else None, contactPairs=len(contacts),
                addedContactPairs=len(contacts-old_contacts),
                invalidTerrain=sum(not a['valid'] for a in feet),
                occluded=sum(not a['visible'] for a in feet),
                outsidePaintedGround=sum(not a['painted'] for a in feet),
                addedOutsidePaintedGround=sum(not a['painted'] and previous.get(a['key'], {}).get('painted', True) for a in feet),
                addedInvalidTerrain=sum(not a['valid'] and previous.get(a['key'], {}).get('valid', True) for a in feet),
                addedOccluded=sum(not a['visible'] and previous.get(a['key'], {}).get('visible', True) for a in feet),
                outsideActorBounds=sum(a['boundMargin'] < -.001 for a in feet),
                outsideFrame=sum(a['edge'] < -.001 for a in feet),
                companionMovedVsMain=sum(value > .01 for value in peers),
                maxCompanionMoveVsMain=max(peers, default=0))


def load_rows(directories):
    rows = {}
    for directory in directories:
        for filename in sorted(directory.rglob('*.json')):
            item = json.loads(filename.read_text())
            key = tuple(item[k] for k in ('region','count','width','arm'))
            if key in rows:
                raise ValueError(f'Duplicate observation {key}')
            rows[key] = item
    return rows


def summarize(rows):
    out = []
    groups = {a: {p: [] for p in PHASES} for a in ARMS}
    for (region, n, w, arm), row in sorted(rows.items()):
        reference = rows[region,n,w,'production']['placements']
        phase = row['placements']
        values = {p:phase_metrics(phase[p], reference[p]) for p in PHASES}
        for p in PHASES:
            groups[arm][p].append(values[p])
        original = phase['opening']
        assert original['clock'] == 0 and len(original['feet']) == n
        checks = regional_report.compact(row)
        sync = max(movement(original,phase['sync']), default=0)
        checks.update(height=HEIGHT[w], ordinarySyncShift=sync,
                      travelled=phase['travel']['region']==('forest' if region=='home' else 'home'),
                      reloadedCount=len(phase['reload']['feet']), **values['opening'])
        for p in ('walked', 'lifecycle', 'resized', 'reload', 'travel'):
            for k in ('distance','order','contactPairs','addedContactPairs','invalidTerrain','occluded'):
                checks[p+k[0].upper()+k[1:]] = values[p][k]
        out.append(checks)
    summary = {}
    for arm in sorted(set(r['arm'] for r in out)):
        selected = [r for r in out if r['arm'] == arm]
        phase_summary = {}
        for p, entries in groups[arm].items():
            pairs = [r for r in entries if r['distance'] is not None]
            errors = [r['vectorErrorMain'] for r in pairs]
            phase_summary[p] = dict(
                cells=len(entries), pairCells=len(pairs),
                **{k:sum(r[k] for r in entries) for k in ('contactPairs','addedContactPairs',
                   'invalidTerrain','occluded','outsidePaintedGround','addedOutsidePaintedGround','addedInvalidTerrain','addedOccluded',
                   'outsideActorBounds','outsideFrame','companionMovedVsMain')},
                orderChanges=sum(r['orderChanged'] for r in pairs),
                medianVectorError=statistics.median(errors) if errors else None,
                maxVectorError=max(errors,default=None),
                minPartnerSideMargin=min((r['partnerSideMargin'] for r in pairs), default=None))
        summary[arm] = dict(phases=phase_summary,
            totals={k:sum(r[k] for r in selected) for k in ('hops','ambientHops','dragHops',
                    'yieldHops','terrain','occlusion','contact','speed','errors','tapped','dragIssued',
                    'dragAccepted','decoded','shadows','conversation','evolution','equipment','census',
                    'time','reload','travelled')},
            stationaryDrags=sum(r['dragIssued'] and not r['dragHops'] for r in selected),
            syncShiftAboveHundredth=sum(r['ordinarySyncShift'] > .01 for r in selected),
            maxSyncShift=max(r['ordinarySyncShift'] for r in selected),
            missingShadowOffsets=sum(r['maxShadowOffset'] is None for r in selected),
            shadowDiscrepancies=sum(r['maxShadowOffset'] is not None and r['maxShadowOffset']>.001 for r in selected),
            modelSeconds=dict(Counter(r['seconds'] for r in selected)))
    return out,summary


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('inputs',nargs='+',type=Path)
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--source',action='append',required=True)
    args=p.parse_args()
    rows=load_rows(args.inputs)
    expected=set(itertools.product(REGIONS,COUNTS,HEIGHT,ARMS))
    if rows.keys()!=expected:
        raise ValueError(f'Missing {len(expected-rows.keys())}, unexpected {len(rows.keys()-expected)}')
    out,summary=summarize(rows)
    args.out.mkdir(parents=True, exist_ok=True)
    with (args.out/'pair-placement.csv').open('w') as f:
        writer=csv.DictWriter(f,fieldnames=out[0],lineterminator='\n')
        writer.writeheader()
        writer.writerows({k:round(v,6) if isinstance(v,float) else v for k,v in row.items()} for row in out)
    (args.out/'pair-placement.json').write_text(json.dumps(dict(sources=args.source,
        sizes=HEIGHT,units='screen in CSS pixels, original art x/z as fractions, order -1 left/0 equal/+1 right',
        phaseNotes='Initial clock zero. Sync repeats controller sync without movement. Walked follows 30 model seconds. Lifecycle combines evolution, gear, census, night. Resize precedes save reload. Travel uses the game action after reload.',
        results=summary),indent=2)+'\n')


if __name__=='__main__':
    main()
