"""Verify official raw receipts, summarize native runs, and attribute shared-state aged inputs."""
import argparse
from collections import Counter, defaultdict
import csv
import json
import math
import zipfile
from pathlib import Path

from matrix_worker_v10 import ARMS, BASE_SHA, HERE, history_aged, old, v8, v9, validate
import matrix_report_v9 as prior

ID = prior.ID
V9_RUN = '44903860732'
PUBLISHED = dict(normalWalkers=3217,arrival=911,near4=522,tapSelected=246,bothFailed=2,agedDragArrival=236)


def census_key(r):
    return tuple(r[k] for k in (*ID,'key'))


def terminal(row):
    return bool(row['arrived'] or row['terminalArrived'])


def drop_status(r):
    if terminal(r):
        return 'arrived'
    if not r['issued']:
        return 'wrong-recipient' if not r['selected'] else 'selected-no-command'
    if r['stepCount'] or r['routed']:
        return 'issued-route-unfinished'
    return 'issued-no-route'


def input_summary(c,source,arm,raw,identical=None):
    label = {k:c[k] for k in ID}
    ink=raw.get('inkAtPress') or {}
    return {**label,'source':source,'arm':arm,'key':raw['key'],'status':drop_status(raw),'selectedKey':raw['selectedKey'],
        'inkInFront':ink.get('foreground'),'targetInkInFront':ink.get('foreground')==raw['key'] if ink else None,
        'nativeSelectedInFront':ink.get('foreground')==raw['selectedKey'] if ink else None,
        'issued':raw['issued'],'accepted':raw['accepted'],'steps':raw['stepCount'],'retryCount':sum(p['retry'] for p in raw['nativePlans']),
        'reason':raw['blockedClass'],'release':old.canonical(raw.get('nativeRelease')),'contacts':'|'.join(raw['goalClass']['contacts']),'visible':raw['goalClass']['visible'],
        'terrain':raw['goalClass']['terrain'],'segmentClear':raw['goalClass']['straightClear'],'historicalFeetAndCoordinates':identical,
        'unsafe':raw['unsafeSteps'],'swept':raw['sweptViolations'],'jump':raw['releaseJumpCss'],
        'peerUnsafe':sum(p['unsafe'] for p in raw['peerWalk'].values()),'peerSwept':sum(p['swept'] for p in raw['peerWalk'].values()),
        'trusted':raw['trusted'],'near4':raw['near4'] or raw['terminalNear4']}


def contact_directions(aged):
    """Exact first-order direction cone imposed by peers already overlapping this foot.

    Native contactSegmentSafe requires a nonnegative derivative of squared
    elliptical separation at the segment start. In two dimensions the best
    normalized finger projection occurs at the finger angle or a boundary
    of one of these half-planes. Excludes terrain, visibility and outer peers.
    """
    r=aged['drag'];a=aged['opening'][aged['index']]
    sx,sy=r['scale']
    tx,ty=(r['modelGoal'][0]-a[1])*sx,(r['modelGoal'][1]-a[2])*sy
    length=math.hypot(tx,ty);tx,ty=tx/length,ty/length
    normals=[]
    for b in aged['opening']:
        if b[0]==a[0]:continue
        rx,ry=(a[3]+b[3])*.5+10,(a[4]+b[4])*.38+10
        dx,dy=a[1]-b[1],a[2]-b[2]
        if (dx/rx)**2+(dy/ry)**2>=1:continue
        nx,ny=dx/(rx*rx*sx),dy/(ry*ry*sy)
        scale=math.hypot(nx,ny)
        if scale>0:normals.append((nx/scale,ny/scale))
    angles=[(tx,ty)]
    for x,y in normals:angles.extend([(-y,x),(y,-x)])
    feasible=[tx*x+ty*y for x,y in angles if all(x*nx+y*ny>=-1e-12 for nx,ny in normals)]
    best=max(feasible,default=None)
    return dict(initialOverlaps=len(normals),initialDirectionExists=bool(feasible),
                positiveTowardFinger=best is not None and best>1e-10,
                maximumForwardProjection=None if best is None else round(best,7))


def add_frames(counter,aged):
    counter.update({k:aged['safety'][k] for k in prior.SAFETY})
    for f in aged['frameSamples']:
        p=f['presentation']
        counter.update({k:f[k] for k in ('painted','outsideActorBounds','nonGround','hidden')})
        counter.update({k:p[k] for k in ('missingShadow','extraShadows')})
        counter['frames'] += 1
        counter['ribbonOK'] += bool(p['visibleRibbon'] and p['sameRibbonScale'] and p['sameRibbonTranslation'] and
                                    p['ribbonAnchorError'] is not None and p['ribbonAnchorError']<.02)
        counter['maxFootErrorCss']=max(counter['maxFootErrorCss'],f['maxAnchorErrorCss'])
    counter['socialEvents']+=aged['frameSamples'][-1]['presentation']['events'].get('social',0)


def aggregate(cells,old_cells,out,large):
    rows,opened,aged,target,saves = [],[],[],[],[]
    cross,historical,natural = [],[],[]
    safety=defaultdict(Counter)
    for coord,c in sorted(cells.items()):
        label={k:c[k] for k in ID}
        for arm,data in c['arms'].items():
            opened.extend(prior.physical_rows(c,arm))
            a=data['aged']
            raw=a['drag']
            people=a['final']['residents']
            for r in people:
                rows.append(prior.resident(c,arm,r,a['tracks'][r['key']],raw['scale'],a['final']['modelSeconds']))
            row=prior.prior.drag_row(c,arm,f"aged/{a['index']}",raw,'aged')
            aged.append(row)
            natural.append({**input_summary(c,'natural',arm,raw),**contact_directions(a)})
            who=next(r for r in people if r['key']==row['key'])
            no_auto=bool(who['ambientFailures'] and not who['ambientStarts'])
            target.append({**label,'arm':arm,'key':who['key'],'dualFailure':no_auto and row['issued'] and not row['actualStep'],
                            'wrongSelectionAndAutonomyFailed':no_auto and not row['selected']})
            add_frames(safety[arm],a)
            for side in [raw,*data['rows'].values()]:
                for p in side.get('peerWalk',{}).values():
                    safety[arm]['inputPeerUnsafe']+=p['unsafe']
                    safety[arm]['inputPeerSwept']+=p['swept']
            if 'reloaded' in data:
                s=data['reloaded']
                saves.append({**label,'arm':arm,'sha256':s['saveSHA256'],'bytes':s['bytes'],
                    'nativeFields':s['saved']==s['loaded'],'roster':len(s['roster']),'gear':s['loaded']['gear'],'trusted':s['drag']['trusted']})
        for donor,series in c['shared'].items():
            for arm,test in series['replays'].items():
                cross.append(input_summary(c,donor,arm,test['row'],series['historicFeetAndCoordinates']))
        for arm in ('v8','v9'):
            archive=old_cells[coord]['arms'][arm]['aged']
            historical.append({**input_summary(c,'published',arm,archive['drag']),**contact_directions(archive)})
    groups=[]
    for arm in ARMS:
        selected=[[r for r in chunk if r['arm']==arm] for chunk in (rows,opened,aged,target)]
        for field,values in [('all',['all']),('region',old.REGIONS),('count',old.COUNTS),('width',old.WIDTHS)]:
            for value in values:
                subset=selected if field=='all' else [[r for r in chunk if r[field]==value] for chunk in selected]
                if subset[0]:
                    groups.append({'group':field,'value':value,'arm':arm,**prior.digest_group(*subset)})
        for phase,chunk in [('opening',selected[1]),('aged',selected[2])]:
            m=prior.prior.metrics(chunk)
            safety[arm].update({phase+'-'+k:m[k] for k in ('unsafe','swept','backwardsIssued','maxReleaseJump','graphSearchesDuringMove')})
    # Establish the explicit 59-person cohort against the published V9 table, including names.
    archive_people={}
    for f in sorted((v9.HERE/'evidence').glob('matrix-residents-*.csv')):
        with f.open() as stream:
            for r in csv.DictReader(stream):
                if r['arm']=='v9':
                    archive_people[(r['region'],int(r['count']),int(r['width']),r['key'])]=r
    versions={a:{census_key(r):r for r in rows if r['arm']==a} for a in ARMS}
    cohort=[]
    transitions=Counter()
    for key,before in versions['v9'].items():
        after=versions['v10'][key]
        pub=int(archive_people[key]['normalCompletions'])
        state=['yes' if n else 'no' for n in (pub,before['normalCompletions'],after['normalCompletions'])]
        transitions['-'.join(state)]+=1
        if not pub or not before['normalCompletions'] or not after['normalCompletions']:
            cohort.append({**dict(zip((*ID,'key'),key)),'publishedV9NormalCount':pub,
                'replayV9NormalCount':before['normalCompletions'],'v10NormalCount':after['normalCompletions'],
                'v10Requests':after['requests'],'v10Plans':after['plans'],'v10Retreats':after['retreatCompletions'],
                'v10MaxToNormalSec':after['longestRefusalToNormalSec']})
    counts=defaultdict(Counter)
    for r in [*historical,*natural,*cross]:
        counts[r['source']+'/'+r['arm']][r['status']]+=1
    pairings=[]
    for coord,c in sorted(cells.items()):
        label={k:c[k] for k in ID}
        r={a:old_cells[coord]['arms'][a]['aged']['drag'] for a in ('v8','v9')}
        for donor,s in c['shared'].items():
            n=s['natural']
            pairings.append({**label,'donor':donor,'key':n['key'],'historicFeetAndCoordinates':s['historicFeetAndCoordinates'],
                'previousV8':drop_status(r['v8']),'previousV9':drop_status(r['v9']),'donorNow':drop_status(n),
                **{a:drop_status(t['row']) for a,t in s['replays'].items()}})
    old_arms={a:{(r['region'],r['count'],r['width']):r for r in historical if r['arm']==a} for a in ('v8','v9')}
    changed=Counter()
    for key,a in old_arms['v8'].items():
        b=old_arms['v9'][key]
        if (a['status']=='arrived')!=(b['status']=='arrived'):
            changed[a['status']+' -> '+b['status']]+=1
    for name,lst in [('groups',groups),('cohort',cohort),('restores',saves),('shared-pairs',pairings),
                     ('aged-failures',[r for r in [*historical,*natural,*cross] if r['status']!='arrived'])]:
        prior.csv_write(out/f'matrix-{name}.csv',lst)
    for region in old.REGIONS:
        rr=[r for r in rows if r['region']==region]
        if rr:prior.csv_write(out/f'matrix-residents-{region}.csv',rr)
    for name,lst in [('residents',rows),('opening-inputs',opened),('aged-inputs',aged),('shared-inputs',cross),('aged-targets',target)]:
        prior.csv_write(large/f'matrix-{name}.csv.gz',lst)
    totals={r['arm']:r for r in groups if r['group']=='all'}
    safety['shared']=dict(trusted=sum(r['trusted'] for r in cross),unsafe=sum(r['unsafe'] for r in cross),
        swept=sum(r['swept'] for r in cross),peerUnsafe=sum(r['peerUnsafe'] for r in cross),peerSwept=sum(r['peerSwept'] for r in cross),
        maxJump=max((r['jump'] for r in cross if r['jump'] is not None),default=0))
    return dict(total=totals,safety=safety,cohortPublishedReplayCandidate=transitions,agedStatuses=counts,historicAgedFlips=changed,
        shared={d:dict(cases=len(qq),exactHistoricFeetAndCoordinates=sum(r['historicFeetAndCoordinates'] for r in qq),
            changedV8toV9=sum(r['v8']!=r['v9'] for r in qq),changedV9toV10=sum(r['v9']!=r['v10'] for r in qq),
            changedTerminalV8toV9=sum((r['v8']=='arrived')!=(r['v9']=='arrived') for r in qq),
            changedTerminalV9toV10=sum((r['v9']=='arrived')!=(r['v10']=='arrived') for r in qq),
            nativeDonorMissingOnTransfer=sum(r[d]!=r['donorNow'] for r in qq)) for d in ('v8','v9') if (qq:=[r for r in pairings if r['donor']==d])},
        saves={'total':len(saves),'preserved':sum(r['nativeFields'] and r['roster']==28 and r['trusted'] for r in saves)},
        publishedV9=PUBLISHED,gateAgainstPublishedV9={k:(totals['v10'][k]<=v if k=='bothFailed' else totals['v10'][k]>=v) for k,v in PUBLISHED.items()})


def verified_current(run,archives,recovery,region_names):
    """Each region must come from one successful official job with identical loaded native bytes."""
    sources={}
    for rid,directory in [(run,archives),*([recovery] if recovery else [])]:
        status=prior.github('run','view',rid,'-R',prior.REPO,'--json','status,conclusion,headSha,url,jobs')
        jobs={j['name']:j for j in status.pop('jobs')}
        artifacts=prior.github('api',f'repos/{prior.REPO}/actions/runs/{rid}/artifacts?per_page=100')['artifacts']
        sources[rid]=(status,jobs,{a['name']:a for a in artifacts},directory)
    receipt=dict(sources[run][0],run=run,regions={},identity={},
                 runs={rid:s[0] for rid,s in sources.items()})
    cells={}
    for region in old.REGIONS:
        rid=recovery[0] if recovery and region in region_names else run
        status,jobs,items,directory=sources[rid]
        job=jobs[f'region ({region})']
        old.require(job['conclusion']=='success',f'{rid}/{region} did not pass')
        a=items['mobility-v10-'+region]
        f=directory/f'mobility-v10-{rid}-{region}.zip'
        sha=old.digest(f.read_bytes())
        old.require(f.stat().st_size==a['size_in_bytes'] and 'sha256:'+sha==a['digest'],'raw GitHub ZIP differs')
        rec=dict(id=a['id'],bytes=f.stat().st_size,sha256=sha,job=job['databaseId'],
                 run=rid,revision=status['headSha'],url=status['url']+'/artifacts/'+str(a['id']))
        receipt['regions'][region]=rec
        names={f'{region}-{n}-{w}.json' for n in old.COUNTS for w in old.WIDTHS}
        with zipfile.ZipFile(f) as z:
            old.require(len(z.namelist())==21 and set(z.namelist())==names|{'region.json'},'missing or unexpected archive member')
            m=json.loads(z.read('region.json'))
            old.require(m['revision']==status['headSha'] and m['base']==BASE_SHA and m['complete'] and set(m['cells'])==names and
                        m['region']==region and m['historicalInputsSHA256']==old.digest(old.HISTORY.read_bytes()) and
                        m['agedSubjectsSHA256']==old.digest(v8.SUBJECTS.read_bytes()),'regional provenance mismatch')
            old.require(m['historicAgedResultsSHA256']==old.digest((HERE/'matrix-aged-history.csv').read_bytes()),'wrong archived gestures')
            rec['browser']=m['browser']
            for name in sorted(names):
                b=z.read(name);old.require(old.digest(b)==m['cells'][name]['sha256'],'cell SHA mismatch')
                c=json.loads(b);coord=tuple(c[k] for k in ID)
                old.require(name==f'{coord[0]}-{coord[1]}-{coord[2]}.json','mislabeled condition')
                for arm in ('v8','v9','v10'):
                    d=c['shared']['v9']['replays'][arm]
                    identity=dict(scripts=d['scripts'],entry=m['entries'][arm])
                    old.require(receipt['identity'].setdefault(arm,identity)==identity,'native runtime differs across runs')
                    if arm in c['arms']:
                        old.require(c['arms'][arm]['hashes']==d['scripts'] and c['arms'][arm]['browser']==m['browser'],'natural comparator differs')
                cells[coord]=c
    old.require(len(cells)==260,'missing native conditions')
    return cells,receipt


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--run',required=True)
    p.add_argument('--archives',type=Path,required=True)
    p.add_argument('--recovery-run',help='Optional narrow successful recovery on identical native runtime bytes')
    p.add_argument('--recovery-archives',type=Path)
    p.add_argument('--recover-regions',nargs='+',choices=old.REGIONS,default=['home'])
    p.add_argument('--v9-archives',type=Path,required=True)
    p.add_argument('--out',type=Path,default=HERE/'evidence')
    p.add_argument('--private-data',type=Path,required=True)
    a=p.parse_args()
    old.require(bool(a.recovery_run)==bool(a.recovery_archives),'specify both recovery flags')
    recovery=(a.recovery_run,a.recovery_archives) if a.recovery_run else None
    cells,receipt=verified_current(a.run,a.archives,recovery,a.recover_regions)
    baseline,previous=prior.region_zips(a.v9_archives,V9_RUN,'mobility-v9-')
    hist=history_aged();tape=v9.history();who=v8.subjects()
    for coord,c in cells.items():
        validate(c,tape,hist)
        for arm in ('v8','v9'):
            archived=baseline[coord]['arms'][arm]['aged']
            truth=hist[*coord,arm]
            old.require(truth['openingSHA256']==old.digest(old.canonical(archived['opening']).encode()) and
                        (truth['arrival']=='True')==terminal(archived['drag']) and truth['key']==who[coord],'historical stratification mismatch')
        for donor,shared in c['shared'].items():
            for arm,x in shared['replays'].items():
                expect=baseline[coord]['arms']['v8'] if arm=='v8' else c['arms'][arm]
                old.require(x['scripts']==expect['hashes'],'shared comparator bytes changed')
    controls,deltas=prior.historical_controls(cells,{'publishedV9':(baseline,'v9')})
    a.out.mkdir(parents=True,exist_ok=True);a.private_data.mkdir(parents=True,exist_ok=True)
    result=aggregate(cells,baseline,a.out,a.private_data)
    for r in result['total'].values():
        old.require((r['residents'],r['drags'],r['tapSent'],r['agedDragCount'])==(3276,1058,260,260),'grid incomplete')
    old.require(sum(v for k,v in result['cohortPublishedReplayCandidate'].items() if k.startswith('no-'))==59,'published 59-person cohort changed')
    old.require(result['shared']['v8']['cases']==24 and result['shared']['v9']['cases']==260,'matched aged states incomplete')
    result.update(revision=receipt['headSha'],historicalV9Replay=controls)
    receipt['priorRun']={k:previous[k] for k in ('run','headSha','url')}
    receipt['priorRun']['verifiedRawZIPs']=len(previous['regions'])
    receipt['derived']={f.name:dict(bytes=f.stat().st_size,sha256=old.digest(f.read_bytes())) for f in sorted(a.private_data.glob('matrix-*.csv.gz'))}
    prior.csv_write(a.out/'matrix-v9-replay-differences.csv',deltas)
    prior.write_json(a.out/'matrix-result.json',result);prior.write_json(a.out/'matrix-receipt.json',receipt)
    print(json.dumps(result['gateAgainstPublishedV9']))


if __name__=='__main__':
    main()
