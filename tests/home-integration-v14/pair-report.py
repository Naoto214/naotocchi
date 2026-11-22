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


def phase_metrics(phase, reference, prior):
    feet = phase['feet']
    pet = next(a for a in feet if a['kind'] == 'pet')
    partner = next((a for a in feet if a['kind'] == 'partner'), None)
    data = {}
    for role, actor in [('pet', pet), ('partner', partner)]:
        data[role+'Painted']=actor['painted'] if actor else None
        data[role+'Surface']=actor.get('surface') if actor else None
        data[role+'Visible']=actor['visible'] if actor else None
        data[role+'Terrain']=actor['valid'] if actor else None
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
    solver_dx = solver_dy = solver_error = solver_order_changed = solver_distance_delta = None
    if partner and 'solverScreen' in partner:
        solver_dx, solver_dy = [q-p for p,q in zip(pet['solverScreen'],partner['solverScreen'])]
        solver_error = math.hypot(dx-solver_dx,dy-solver_dy)
        solver_distance_delta = dist-math.hypot(solver_dx,solver_dy)
        solver_order_changed = order != side(solver_dx)
    contacts = {tuple(sorted(pair[:2])) for pair in phase['contacts']}
    old_contacts = {tuple(sorted(pair[:2])) for pair in reference['contacts']}
    worst=max((1-q for _,_,q in phase['contacts']),default=0)
    old_worst=max((1-q for _,_,q in prior['contacts']),default=0)
    severity=sum((1-q)**2 for _,_,q in phase['contacts'])
    old_severity=sum((1-q)**2 for _,_,q in prior['contacts'])
    prior_contacts = {tuple(sorted(pair[:2])) for pair in prior['contacts']}
    leads = {a['key'] for a in feet if a['kind'] in ('pet','partner')}
    pair_contacts = sum(set(pair)==leads for pair in contacts)
    pair_crowd_contacts = sum(len(leads.intersection(pair))==1 for pair in contacts)
    pair_ellipse = None
    if partner:
        (px,py),(qx,qy) = pet['stage'],partner['stage']
        (pw,ph),(qw,qh) = pet['size'],partner['size']
        pair_ellipse = math.hypot((qx-px)/((pw+qw)*.5+10),(qy-py)/((ph+qh)*.38+10))
    peers = movement(reference, phase, 'companion')
    previous = by_key(reference)
    return dict(**data, dx=dx, dy=dy, distance=dist, distanceDeltaMain=dist_delta,
                solverDx=solver_dx,solverDy=solver_dy,vectorErrorSolver=solver_error,
                distanceDeltaSolver=solver_distance_delta,
                solverOrderChanged=solver_order_changed, vectorErrorMain=vector_error, order=order, orderChanged=order_changed,
                partnerSideMargin=partner['horizontalEdge'] if partner else None,
                partnerEdge=partner['edge'] if partner else None, contactPairs=len(contacts),
                worstPenetration=worst, countRaisedVsPrior=len(contacts)>len(prior_contacts),
                worstRaisedVsPrior=worst>old_worst+1e-7, severityRaisedVsPrior=severity>old_severity+1e-7,
                pairEllipse=pair_ellipse,pairContact=pair_contacts,pairCrowdContacts=pair_crowd_contacts,
                companionContacts=len(contacts)-pair_contacts-pair_crowd_contacts,
                addedContactPairs=len(contacts-old_contacts),addedContactPairsVsPrior=len(contacts-prior_contacts),
                addedPairCrowdVsPrior=sum(bool(leads.intersection(pair)) for pair in contacts-prior_contacts),
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
        prior = rows.get((region,n,w,'prior'), rows[region,n,w,'production'])['placements']
        phase = row['placements']
        values = {p:phase_metrics(phase[p], reference[p], prior[p]) for p in PHASES}
        for p in PHASES:
            groups[arm][p].append(values[p])
        original = phase['opening']
        assert original['clock'] == 0 and len(original['feet']) == n
        checks = regional_report.compact(row)
        sync = max(movement(original,phase['sync']), default=0)
        lead_keys={a['key'] for a in original['feet'] if a['kind'] in ('pet','partner')}
        def contact_ids(value):
            return {tuple(sorted(p[:2])) for p in value['contacts']}
        opening_ids=contact_ids(original)
        persistent=opening_ids & contact_ids(phase['walked'])
        new_persistent=persistent - contact_ids(prior['opening'])
        checks.update(height=HEIGHT[w], ordinarySyncShift=sync,
                      persistentPairCrowdContacts=sum(bool(lead_keys.intersection(pair)) for pair in persistent),
                      newPersistentPairCrowdVsPrior=sum(bool(lead_keys.intersection(pair)) for pair in new_persistent),
                      travelled=phase['travel']['region']==('forest' if region=='home' else 'home'),
                      reloadedCount=len(phase['reload']['feet']), **values['opening'])
        for p in ('walked', 'lifecycle', 'resized', 'reload', 'travel'):
            for k in ('distance','order','contactPairs','addedContactPairs','invalidTerrain','occluded'):
                checks[p+k[0].upper()+k[1:]] = values[p][k]
        alternate=row.get('alternate')
        if alternate:
            target=alternate['target']
            same=bool(target and target['key']==row['target']['key'] and target['from']==row['target']['from'])
            checks.update(retrySameStart=same,retryChangedGoal=bool(target and target['goal']!=target['originalGoal']),retryHasOpenGoal=bool(target and target['clearance']['alternate']),
                          retryDragHops=alternate['trace']['sourceHops'].get('drag',0),
                          retryViolations=sum(alternate['trace'][k] for k in ('terrain','occlusion','contact','speed')),
                          retryTrusted=alternate['trusted'])
        else:
            checks.update(retrySameStart=None,retryChangedGoal=None,retryHasOpenGoal=None,retryDragHops=None,retryViolations=None,retryTrusted=None)
        gate=row['lifecycle'].get('returnGate')
        returned=phase.get('returnTrip')
        returning=phase_metrics(returned,phase['reload'],phase['reload']) if returned else {}
        checks.update(returnPairContact=returning.get('pairContact'),returnLeadCrowd=returning.get('pairCrowdContacts'),
                      returnNewLeadVsReload=returning.get('addedPairCrowdVsPrior'),
                      returnWrongSolverSide=returning.get('solverOrderChanged'),returnPartnerSideMargin=returning.get('partnerSideMargin'),
                      returnAccepted=gate['accepted'] if gate else None,
                      returnSpecial=gate['special'] if gate else None,
                      returnAllowedBeforeFixture=gate['beforeAllowed'] if gate else None,
                      returnAllowedAfterFixture=gate['afterAllowed'] if gate else None,
                      returnObserved=returned['region']==region if returned else None,
                      returnContacts=len(returned['contacts']) if returned else None,
                      returnInvalidTerrain=sum(not a['valid'] for a in returned['feet']) if returned else None,
                      returnOccluded=sum(not a['visible'] for a in returned['feet']) if returned else None)
        out.append(checks)
    summary = {}
    for arm in sorted(set(r['arm'] for r in out)):
        selected = [r for r in out if r['arm'] == arm]
        phase_summary = {}
        for p, entries in groups[arm].items():
            pairs = [r for r in entries if r['distance'] is not None]
            errors = [r['vectorErrorMain'] for r in pairs]
            solver = [r for r in pairs if r['solverDx'] is not None]
            phase_summary[p] = dict(
                solverPairCells=len(solver), solverOrderChanges=sum(r['solverOrderChanged'] for r in solver),
                maxSolverVectorError=max((r['vectorErrorSolver'] for r in solver), default=None),
                medianAbsoluteSolverDistanceError=statistics.median(abs(r['distanceDeltaSolver']) for r in solver) if solver else None,
                maxAbsoluteSolverDistanceError=max((abs(r['distanceDeltaSolver']) for r in solver), default=None),
                cells=len(entries), pairCells=len(pairs),
                **{k:sum(r[k] for r in entries) for k in ('contactPairs','addedContactPairs','addedContactPairsVsPrior','addedPairCrowdVsPrior',
                   'pairContact','pairCrowdContacts','companionContacts','countRaisedVsPrior','worstRaisedVsPrior','severityRaisedVsPrior',
                   'invalidTerrain','occluded','outsidePaintedGround','addedOutsidePaintedGround','addedInvalidTerrain','addedOccluded',
                   'outsideActorBounds','outsideFrame','companionMovedVsMain')},
                petOutsidePaintedGround=sum(not r['petPainted'] for r in entries),
                partnerOutsidePaintedGround=sum(not r['partnerPainted'] for r in pairs),
                orderChanges=sum(r['orderChanged'] for r in pairs),
                medianVectorError=statistics.median(errors) if errors else None,
                maxVectorError=max(errors,default=None),
                minPartnerSideMargin=min((r['partnerSideMargin'] for r in pairs), default=None))
        regions={}
        for region in REGIONS:
            subset=[r for r in selected if r['region']==region]
            pairs=[r for r in subset if r['distance'] is not None]
            if not pairs:
                continue
            regions[region]=dict(cells=len(subset),pairedCells=len(pairs),
                maxAbsoluteLateralPx=round(max(abs(r['dx']) for r in pairs),3),
                maxPairDistancePx=round(max(r['distance'] for r in pairs),3),
                minPartnerSideMarginPx=round(min(r['partnerSideMargin'] for r in pairs),3),
                pairContacts=sum(r['pairContact'] for r in pairs),
                addedInitialContactsVsPrior=sum(r['addedContactPairsVsPrior'] for r in subset),
                addedLeadContactsVsPrior=sum(r['addedPairCrowdVsPrior'] for r in subset),
                solverSideChanges=sum(bool(r['solverOrderChanged']) for r in pairs) if any(r['solverDx'] is not None for r in pairs) else None)
        summary[arm] = dict(phases=phase_summary,openingByRegion=regions,
            totals={k:sum(r[k] for r in selected) for k in ('hops','ambientHops','dragHops',
                    'yieldHops','terrain','occlusion','contact','speed','errors','tapped','dragIssued',
                    'dragAccepted','decoded','shadows','conversation','evolution','equipment','census',
                    'time','reload','travelled','persistentPairCrowdContacts','newPersistentPairCrowdVsPrior')},
            openDirectionRetries=sum(r['retryTrusted'] is not None for r in selected),
            matchingStarts=sum(bool(r['retrySameStart']) for r in selected),
            openDirectionWalked=sum(bool(r['retryDragHops']) for r in selected),
            openDirectionViolations=sum(r['retryViolations'] or 0 for r in selected),
            stationaryDrags=sum(r['dragIssued'] and not r['dragHops'] for r in selected),
            syncShiftAboveHundredth=sum(r['ordinarySyncShift'] > .01 for r in selected),
            maxSyncShift=max(r['ordinarySyncShift'] for r in selected),
            missingShadowOffsets=sum(r['maxShadowOffset'] is None for r in selected),
            shadowDiscrepancies=sum(r['maxShadowOffset'] is not None and r['maxShadowOffset']>.001 for r in selected),
            returnTrip={k:sum(r[k] or 0 for r in selected) for k in ('returnAccepted','returnSpecial',
                'returnAllowedBeforeFixture','returnAllowedAfterFixture','returnObserved','returnContacts',
                'returnInvalidTerrain','returnOccluded','returnPairContact','returnLeadCrowd',
                'returnNewLeadVsReload','returnWrongSolverSide') } if any(r['returnAccepted'] is not None for r in selected) else None,
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
    cases=[]
    for (region,count,width,arm),row in sorted(rows.items()):
        if arm!='candidate':
            continue
        before=rows[region,count,width,'prior']
        def contacts(p):
            return {tuple(sorted(c[:2])):c[2] for c in p['contacts']}
        now=row['placements']['opening'];old=before['placements']['opening']
        current,previous=contacts(now),contacts(old)
        fresh=[[*pair,round(current[pair],6)] for pair in sorted(current.keys()-previous.keys())]
        prior_feet=by_key(old)
        lost=[dict(key=a['key'],art=a['art'],surface=a.get('surface')) for a in now['feet']
              if prior_feet[a['key']]['painted'] and not a['painted']]
        trace=row['observation']['trace']
        prior_drag=before['observation']['trace']['sourceHops'].get('drag',0)
        hops=trace['sourceHops'].get('drag',0)
        if fresh or lost or not hops:
            cases.append(dict(region=region,count=count,width=width,contactsBefore=len(previous),
                  contactsAfter=len(current),newContactEllipses=fresh,newOutsidePaintedGround=lost,
                  beforeDragHops=prior_drag,afterDragHops=hops))
    (args.out/'pair-placement-exceptions.json').write_text(json.dumps(cases,indent=2)+'\n')
    with (args.out/'pair-placement.csv').open('w') as f:
        writer=csv.DictWriter(f,fieldnames=out[0],lineterminator='\n')
        writer.writeheader()
        writer.writerows({k:round(v,6) if isinstance(v,float) else v for k,v in row.items()} for row in out)
    source_hashes={}
    for (_,_,_,arm),row in rows.items():
        current=source_hashes.setdefault(arm,row['sources'])
        if current!=row['sources']:
            raise ValueError(f'Runtime files differed within {arm}')
    (args.out/'pair-placement.json').write_text(json.dumps(dict(sources=args.source,sourceHashes=source_hashes,
        declaredStage=3,observedStageIndices=sorted({row['lifecycle']['first'][1] for row in rows.values()}),
        sizes=HEIGHT,units='screen in CSS pixels, original art x/z as fractions, order -1 left/0 equal/+1 right',
        phaseNotes='Initial clock zero. Sync repeats controller sync without movement. Walked follows 30 model seconds. Lifecycle combines evolution, gear, census, night. Resize precedes save reload. Travel uses the game action after reload. Final-only return visits the original region in the resized viewport. Special returns raise maxSodachi to the normal unlock threshold of 70; both gate states are recorded.',
        results=summary),indent=2)+'\n')


if __name__=='__main__':
    main()
