"""Verify official raw receipts, summarize native runs, and attribute shared-state aged inputs."""
import argparse
from collections import Counter, defaultdict
import csv
import json
from pathlib import Path
from unittest.mock import patch

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
            natural.append(input_summary(c,'natural',arm,raw))
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
            historical.append(input_summary(c,'published',arm,old_cells[coord]['arms'][arm]['aged']['drag']))
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


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--run',required=True)
    p.add_argument('--archives',type=Path,required=True)
    p.add_argument('--v9-archives',type=Path,required=True)
    p.add_argument('--out',type=Path,default=HERE/'evidence')
    p.add_argument('--private-data',type=Path,required=True)
    a=p.parse_args()
    with patch.object(prior,'BASE_SHA',BASE_SHA):
        cells,receipt=prior.region_zips(a.archives,a.run,'mobility-v10-')
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
