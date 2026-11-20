"""Verify and reconcile the V8 three-arm regional Chromium matrix and its official ZIPs."""
import argparse
from collections import Counter, defaultdict
import csv
import gzip
import json
from pathlib import Path
import subprocess
import zipfile

from matrix_worker_v8 import ARMS, HERE, SUBJECTS, old, subjects, validate
import matrix_review as v7

SITE = 'https://naotocchi-cast-size.kerzion214.chatgpt.site/evidence/mobility-v8/matrix/'
REPO = 'Naoto214/naotocchi'
V7_RELEASE = '44709182706'
COHORT = ('region', 'count', 'width')
V7_MIN = dict(arrival=910, near4=521, tapSelected=246)
SAFETY = ('steps', 'terrain', 'bounds', 'occlusion', 'speed', 'swept')
V8_MOTION = ('escapePlans','escapeStarts','escapeArrivals','escapeDistance','ambientSingleOffers','ambientSequentialOffers','ambientYieldStages')

def json_write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n')

def checked_cells(raw_root):
    with old.HISTORY.open() as f:
        history = {(r['region'], int(r['count']), int(r['width']), r['case'], r['arm']):r for r in csv.DictReader(f)}
    selected = subjects()
    cells = []
    identity = {}
    for region in old.REGIONS:
        folder = raw_root / region
        manifest = json.loads((folder/'region.json').read_bytes())
        old.require(manifest['region']==region and manifest['complete'], f'{region} incomplete')
        old.require(set(manifest['cells'])=={f'{region}-{n}-{w}.json' for n in old.COUNTS for w in old.WIDTHS}, f'{region} incomplete grid')
        old.require(manifest['historicalInputsSHA256']==old.digest(old.HISTORY.read_bytes()) and manifest['agedSubjectsSHA256']==old.digest(SUBJECTS.read_bytes()), 'unexpected gesture tape')
        meta = {k:manifest[k] for k in ('revision','browser','entries','historicalInputsSHA256','agedSubjectsSHA256')}
        for name, record in manifest['cells'].items():
            data = (folder/name).read_bytes()
            old.require(old.digest(data)==record['sha256'], name+' hash mismatch')
            cell = validate(json.loads(data),history)
            old.require(name==f"{cell['region']}-{cell['count']}-{cell['width']}.json", name+' coordinate mismatch')
            for arm,d in cell['arms'].items():
                old.require(d['aged']['drag']['key']==selected[region,cell['count'],cell['width']], 'changed aged actor')
                hashes = meta.setdefault('scripts',{}).setdefault(arm,d['hashes'])
                old.require(d['browser']==meta['browser'] and hashes==d['hashes'], 'browser or game changed within arm')
            cells.append(cell)
        if not identity: identity = meta
        old.require(meta==identity, 'region built from a different revision/browser')
    return cells, identity

def verified_zips(raw_root, archives, run_id, identity):
    def github(*args): return json.loads(subprocess.check_output(['gh',*args],text=True))
    run = github('run','view',run_id,'-R',REPO,'--json','status,conclusion,url,headSha,jobs')
    old.require(run['headSha']==identity['revision'], 'archive and game revision differ')
    jobs = {j['name']:j for j in run.pop('jobs')}
    files = github('api',f'repos/{REPO}/actions/runs/{run_id}/artifacts?per_page=100')['artifacts']
    by_name = {a['name']:a for a in files}
    receipt = {'runId':run_id, **run, 'regions':{}}
    for region in old.REGIONS:
        job = jobs[f'region ({region})']
        old.require(job['conclusion']=='success', 'incomplete regional job '+region)
        export = f'mobility-v8-{run_id}-{region}.zip'
        path = archives/export
        item = by_name['mobility-v8-'+region]
        sha = old.digest(path.read_bytes())
        old.require(item['digest']=='sha256:'+sha and item['size_in_bytes']==path.stat().st_size, 'digest or size of official ZIP differs')
        folder = raw_root/region
        expected = {'region.json',*(f'{region}-{n}-{w}.json' for n in old.COUNTS for w in old.WIDTHS)}
        with zipfile.ZipFile(path) as z:
            old.require(len(z.namelist())==len(expected) and set(z.namelist())==expected and all(z.read(k)==(folder/k).read_bytes() for k in expected), 'archive differs from verified raw rows')
        receipt['regions'][region] = {'url':SITE+export,'sha256':sha,'bytes':path.stat().st_size,'artifactId':item['id'],'jobId':job['databaseId']}
    return receipt

def old_controls(cells, prior):
    totals = {a:Counter() for a in ('v6','v7')}
    different = []
    for cell in cells:
        label = {k:cell[k] for k in COHORT}
        root = prior/cell['region']
        name = f"{cell['region']}-{cell['count']}-{cell['width']}.json"
        raw = (root/name).read_bytes()
        old.require(old.digest(raw)==json.loads((root/'region.json').read_bytes())['cells'][name]['sha256'], 'prior archive hash mismatch')
        prior_cell = json.loads(raw)
        for a, total in totals.items():
            control, new = prior_cell['arms'][a], cell['arms'][a]
            old.require(control['hashes']==new['hashes'] and control['opening']==new['opening'] and control['seed']==new['seed'], 'control bytes, seed or fixture differs from shipped V7')
            total['cells'] += 1
            total['sameAgedLocations'] += control['aged']['opening']==new['aged']['opening']
            for case, r in new['rows'].items():
                ref=control['rows'][case]
                if r.get('skip'): continue
                old.require([r['start'],r['goal']]==[ref['start'],ref['goal']], 'initial physical replay diverged')
                flags=[k for k in ('selected','issued','moved','arrived','near4','terminalArrived','terminalNear4') if r[k]!=ref[k]]
                if flags: different.append({**label,'arm':a,'case':case,'changed':','.join(flags)})
    return {'sourceRunId':V7_RELEASE,'nativeSourceSeedAndInitialCoordinatesVerified':totals,'changedOpeningFlags':different}

def rate(num, denom):
    return dict(numerator=num, denominator=denom, percent=None if not denom else round(100*num/denom,2))

def household(residents):
    agg = v7.age_metrics(residents)
    agg['actualAmbientWalkers'] = len(residents)-agg['noAmbientStart']
    agg['recovery'] = rate(agg['recoveredEpisodes'], agg['failureEpisodes'])
    # Report only counters carried by this arm's native observer.
    if residents and 'escapeStarts' in residents[0]:
        agg.update({k:sum(r[k] for r in residents) for k in V8_MOTION if k in residents[0]})
        agg['walkersWithOrdinaryStarts'] = sum(r['ambientStarts']>r['escapeStarts'] for r in residents)
        agg['escapeStartsOnly'] = sum(r['escapeStarts']>0 and r['ambientStarts']==r['escapeStarts'] for r in residents)
    return agg

def dataset(cells, out, large):
    opening = defaultdict(list)
    aged = defaultdict(list)
    residents = defaultdict(list)
    targets = []
    restores = []
    safety = defaultdict(Counter)
    frames = defaultdict(list)
    socials = defaultdict(Counter)
    for c in cells:
        label = {k:c[k] for k in COHORT}
        for arm,d in c['arms'].items():
            opening[arm].extend(v7.drag_row(c,arm,case,r,'opening') for case,r in d['rows'].items())
            a = d['aged']
            people = v7.age_residents(c,arm)
            initial = {r['key']:r for r in a['initial']['residents']}
            final = {r['key']:r for r in a['final']['residents']}
            for r in people:
                native = final[r['key']]
                r.update({k:native[k]-initial[r['key']][k] for k in V8_MOTION if k in native})
            residents[arm].extend(people)
            drag = v7.drag_row(c,arm,f"aged/{a['index']}",a['drag'],'aged')
            aged[arm].append(drag)
            # Count a real displacement of this actor, even if the planner accepted
            # a zero-length segment. Preserve the historical step count in the ZIP.
            drag['actualStep'] = a['drag']['nativeMotion']['firstNativeFootClock'] is not None
            subject = next(r for r in people if r['key']==drag['key'])
            failed = subject['noAmbientStartWithFailures']
            targets.append({**label,'arm':arm,'key':drag['key'], **{k:subject[k] for k in ('ambientRequests','ambientFailures','ambientStarts','lastMovedAgo','activity','stepVetoes','blockingPeers','directObstructions')}, **{k:drag[k] for k in ('issued','selected','selectedKey','actualStep','arrival','nearFinger','touchX','touchY','goalX','goalY')},
                'noAutoAndNoDragStep':failed and drag['issued'] and not drag['actualStep'],'noAutoAndWrongSelection':failed and not drag['selected']})
            safety[arm].update({k:a['safety'][k] for k in SAFETY})
            frames[arm].extend(a['frameSamples'])
            socials[arm].update(a['frameSamples'][-1]['presentation']['events'])
            if 'reloaded' in d:
                r = d['reloaded']
                restores.append({**label,'arm':arm,'bytes':r['bytes'],'sha256':r['saveSHA256'],'nativeFieldsMatch':r['saved']==r['loaded'],'roster':len(r['roster']),'gear':r['loaded']['gear'],'trusted':r['drag']['trusted'],'selected':r['drag']['selected'],'issued':r['drag']['issued'],'arrival':r['drag']['arrived'] or r['drag']['terminalArrived']})
    poses = {}
    for arm,ff in frames.items():
        pp = [f['presentation'] for f in ff]
        poses[arm]={'frames':len(ff),'actors':sum(f['painted'] for f in ff),'maxFootErrorCss':max(f['maxAnchorErrorCss'] for f in ff),
            'outsideActorBounds':sum(f['outsideActorBounds'] for f in ff),'nonGround':sum(f['nonGround'] for f in ff),'hidden':sum(f['hidden'] for f in ff),
            'missingShadows':sum(p['missingShadow'] for p in pp),'extraShadows':sum(p['extraShadows'] for p in pp),
            'ribbonVisible':sum(p['visibleRibbon'] for p in pp),'ribbonSameScale':sum(p['sameRibbonScale'] for p in pp),'ribbonSameTranslation':sum(p['sameRibbonTranslation'] for p in pp),
            'maxRibbonAnchorErrorStageUnits':max((p['ribbonAnchorError'] for p in pp if p['ribbonAnchorError'] is not None),default=None)}
    cells_by_id = {tuple(c[k] for k in COHORT):c for c in cells}
    changes = {}
    diffs = []
    for a in ('v6','v7'):
        changes[a], rows = v7.comparison(opening[a],opening['v8'])
        for r in rows:
            case = r['case']
            cell = cells_by_id[tuple(r[k] for k in COHORT)]
            evidence = {}
            for name,arm in [('old',a),('v8','v8')]:
                gesture = cell['arms'][arm]['rows'][case]
                goals = gesture['plans']
                evidence.update({
                    name+'SelectedKey':gesture['selectedKey'], name+'BlockedClass':gesture['blockedClass'],
                    name+'Retries':sum(p['retry'] for p in gesture['nativePlans']),
                    name+'LastChosen':old.canonical(goals[-1]['chosen']) if goals else None,
                    name+'EndFeet':old.canonical(gesture['end']), name+'EndFingerErrorCss':gesture['endFingerErrorCss'],
                    name+'EndSource':gesture['demandAtEnd']['source'],
                    name+'EndActivity':gesture['demandAtEnd']['activity'], name+'EndPending':gesture['demandAtEnd']['pending']})
            diffs.append({'comparedWith':a,**r,
                'initialGoalContacts':old.canonical(cell['arms'][a]['rows'][case]['goalClass']['contacts']),**evidence})
    sums = {a:v7.metrics(opening[a]) for a in ARMS}
    warm = {a:v7.metrics(aged[a]) for a in ARMS}
    populations = {a:household(residents[a]) for a in ARMS}
    by_group = []
    for category,values in [('region',old.REGIONS),('count',old.COUNTS),('width',old.WIDTHS)]:
        for value in values:
            for arm in ARMS:
                motions=v7.metrics([r for r in opening[arm] if r[category]==value])
                members=household([r for r in residents[arm] if r[category]==value])
                tp=[r for r in targets if r['arm']==arm and r[category]==value]
                by_group.append({'group':category,'value':value,'arm':arm,**{k:motions[k] for k in ('drags','arrival','near4','occupiedArrival','tapSent','tapSelected','unsafe','swept')},**{k:members[k] for k in ('residentProfiles','actualAmbientWalkers','noAmbientStartWithFailures','openFailedStationary60','failureEpisodes','recoveredEpisodes','yieldSuccesses','yieldPhysicalStarts','yieldArrivals')},'recoveryPercent':members['recovery']['percent'],'agedDualFailure':sum(r['noAutoAndNoDragStep'] for r in tp)})
    v7.write_csv(out/'matrix-groups.csv',by_group)
    v7.write_csv(out/'matrix-paired-changes.csv',diffs)
    v7.write_csv(out/'matrix-both-failed.csv',[r for r in targets if r['noAutoAndNoDragStep'] or r['noAutoAndWrongSelection']])
    v7.write_csv(large/'matrix-aged-targets.csv',targets)
    v7.write_csv(out/'matrix-reloads.csv',restores)
    v7.write_csv(large/'matrix-opening-inputs.csv',[r for rows in opening.values() for r in rows])
    v7.write_csv(large/'matrix-residents.csv',[r for rows in residents.values() for r in rows])
    both = {a:{k:sum(r[k] for r in targets if r['arm']==a) for k in ('noAutoAndNoDragStep','noAutoAndWrongSelection')} for a in ARMS}
    gates={**{f'{k}GeShippedV7':sums['v8'][k]>=v for k,v in V7_MIN.items()},'dualFailureLeShippedV7':both['v8']['noAutoAndNoDragStep']<=3,
        'noOpeningOrAgedReleaseSafetyRegression':all(not group['v8'][k] for group in (sums,warm) for k in ('unsafe','swept','maxReleaseJump','backwardsIssued')),
        'safeAutonomous':not any(safety['v8'][k] for k in SAFETY[1:]),'noMissingActorsOrShadows':not any(poses['v8'][k] for k in ('outsideActorBounds','nonGround','hidden','missingShadows','extraShadows')),
        'ribbonObservedAndFollowed':all(poses['v8'][k]==poses['v8']['frames'] for k in ('ribbonVisible','ribbonSameScale','ribbonSameTranslation')) and poses['v8']['maxRibbonAnchorErrorStageUnits']<.02,
        'nativeSaveRestore':len(restores)==39 and all(r['nativeFieldsMatch'] and r['roster']==28 and r['trusted'] for r in restores)}
    return dict(cells=len(cells), inputs=sums, agedDrag=warm, age=populations, bothFailedAfterAging=both, physicalSafety=safety, rendered=poses,
        reactions=socials, pairedOpeningChanges=changes, checks=gates)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--raw',required=True,type=Path)
    p.add_argument('--archives',required=True,type=Path)
    p.add_argument('--run',required=True)
    p.add_argument('--prior-raw',required=True,type=Path)
    p.add_argument('--out',type=Path,default=HERE/'evidence')
    p.add_argument('--private-data',required=True,type=Path)
    args=p.parse_args()
    cells, identity=checked_cells(args.raw)
    receipt=verified_zips(args.raw,args.archives,args.run,identity)
    controls=old_controls(cells,args.prior_raw)
    for target in (args.out,args.private_data): target.mkdir(parents=True,exist_ok=True)
    summary=dataset(cells,args.out,args.private_data)
    old.require(summary['cells']==260 and all(q['drags']==1058 and q['tapSent']==260 for q in summary['inputs'].values()), 'incomplete input delivery')
    old.require(all(q['residentProfiles']==3276 for q in summary['age'].values()), 'incomplete resident coverage')
    for path in sorted(args.private_data.glob('matrix-*.csv')):
        data=path.read_bytes()
        target=path.with_suffix('.csv.gz')
        with target.open('wb') as f, gzip.GzipFile(filename='',fileobj=f,mode='wb',compresslevel=6,mtime=0) as z: z.write(data)
        receipt.setdefault('derived',{})[target.name]=dict(url=SITE+target.name,sha256=old.digest(target.read_bytes()),rawSHA256=old.digest(data),bytes=target.stat().st_size)
    json_write(args.out/'matrix-receipt.json',receipt)
    json_write(args.out/'matrix-result.json',{'source':identity,'pairedShippedControls':controls,**summary})
    print(json.dumps(summary['checks'],indent=2))
if __name__=='__main__':
    main()
