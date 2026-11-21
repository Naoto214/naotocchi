"""Validate official ZIP digests, reconcile reference measurements, and report regional regressions."""
import argparse
from collections import Counter
import csv
import gzip
import io
import json
import math
from pathlib import Path
import subprocess
import zipfile

from matrix_worker_v9 import ARMS, BASE_SHA, HERE, old, v8, history, validate
import matrix_review as prior

REPO = 'Naoto214/naotocchi'
V8_RUN = '44835922835'
V7_RUN = '44709182706'
HISTORIC = {'v7':(910,521,246,3),'v8':(909,520,246,2)}
ID = ('region','count','width')
SAFETY = ('steps','bounds','terrain','occlusion','speed','swept')

def write_json(path, obj):
    path.write_text(json.dumps(obj,ensure_ascii=False,indent=2,allow_nan=False)+'\n')

def github(*args):
    return json.loads(subprocess.check_output(['gh',*args],text=True))

def csv_write(path, rows):
    fields = list(dict.fromkeys(k for r in rows for k in r))
    buf = io.StringIO(newline='')
    writer = csv.DictWriter(buf, fieldnames=fields,lineterminator='\n')
    writer.writeheader()
    writer.writerows(rows)
    raw = buf.getvalue().encode()
    if path.suffix=='.gz':
        with path.open('wb') as f, gzip.GzipFile(filename='',fileobj=f,mode='wb',compresslevel=6,mtime=0) as z:
            z.write(raw)
    else:
        path.write_bytes(raw)

def region_zips(directory, run, prefix, release=False):
    remote = github('api', f'repos/{REPO}/actions/runs/{run}/artifacts?per_page=100')['artifacts']
    status = github('run','view',str(run),'-R',REPO,'--json','conclusion,status,headSha,url,jobs')
    jobs = {j['name']:j for j in status.pop('jobs')}
    receipt = {**status, 'run':str(run), 'regions':{}}
    cells = {}
    identity = {}
    for region in old.REGIONS:
        job = jobs[f'region ({region})']
        old.require(job['conclusion']=='success', region+' regional workflow did not pass')
        item = next(a for a in remote if a['name']==prefix+region)
        path = directory/f'{prefix}{run}-{region}.zip'
        raw = path.read_bytes()
        sha = old.digest(raw)
        old.require('sha256:'+sha==item['digest'] and len(raw)==item['size_in_bytes'], f'{region} official ZIP mismatch')
        receipt['regions'][region] = {'id':item['id'],'bytes':len(raw),'sha256':sha,
                                      'url':status['url']+'/artifacts/'+str(item['id']),'job':job['databaseId']}
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            names = {f'{region}-{n}-{w}.json' for n in old.COUNTS for w in old.WIDTHS}
            old.require(len(z.namelist())==len(names)+1 and set(z.namelist())==names|{'region.json'},'regional ZIP member mismatch')
            m = json.loads(z.read('region.json'))
            old.require(m['region']==region and m['complete'] and set(m['cells'])==names and m['revision']==status['headSha'],'region manifest mismatch')
            old.require(m['historicalInputsSHA256']==old.digest(old.HISTORY.read_bytes()),'physical tape changed')
            if not release:
                old.require(m['base']==BASE_SHA and m['agedSubjectsSHA256']==old.digest(v8.SUBJECTS.read_bytes()),'V8 ancestry or subject mismatch')
            for name in names:
                blob = z.read(name)
                old.require(old.digest(blob)==m['cells'][name]['sha256'],'cell hash mismatch')
                c = json.loads(blob)
                coord = tuple(c[k] for k in ID)
                old.require(name==f'{coord[0]}-{coord[1]}-{coord[2]}.json','mislabeled cell')
                if not release:
                    old.require(all(a['browser']==m['browser'] for a in c['arms'].values()),'intra-cell browser mismatch')
                    for arm,d in c['arms'].items():
                        base = identity.setdefault(arm,{'scripts':d['hashes'],'entry':m['entries'][arm]})
                        old.require(base=={'scripts':d['hashes'],'entry':m['entries'][arm]},'mixed native bytes')
                cells[coord] = c
            receipt['regions'][region]['browser'] = m['browser']
    old.require(len(cells)==260,'incomplete 260 cells')
    receipt['identity'] = identity
    return cells,receipt

def physical_rows(cell, arm):
    return [prior.drag_row(cell,arm,case,row,'opening') for case,row in cell['arms'][arm]['rows'].items()]

def historical_controls(new, archives):
    changes = []
    controls = {}
    for label,(old_cells,arm) in archives.items():
        before,after = [],[]
        same_aged = 0
        for coord,cell in new.items():
            a = old_cells[coord]['arms'][arm]
            b = cell['arms'][arm]
            old.require(a['opening']==b['opening'] and a['seed']==b['seed'] and a['hashes']==b['hashes'],'control model or fixture changed')
            same_aged += a['aged']['opening']==b['aged']['opening']
            before.extend(physical_rows(old_cells[coord],arm))
            after.extend(physical_rows(cell,arm))
            for case,ref in a['rows'].items():
                row = b['rows'][case]
                old.require(ref.get('skip')==row.get('skip') and ref.get('start')==row.get('start') and ref.get('goal')==row.get('goal'),'physical tape differs')
                if ref.get('skip'):
                    continue
                changed = [k for k in v8.FLAGS if ref[k]!=row[k]]
                if changed:
                    changes.append({'source':label,**dict(zip(ID,coord)),'case':case,'key':row['key'],
                        'changed':','.join(changed),'oldSelection':ref['selectedKey'],'newSelection':row['selectedKey'],
                        'oldArrival':ref['arrived'] or ref['terminalArrived'],'newArrival':row['arrived'] or row['terminalArrived'],
                        'oldNear4':ref['near4'] or ref['terminalNear4'],'newNear4':row['near4'] or row['terminalNear4']})
        fields = ('arrival','near4','tapSelected','drags','tapSent')
        controls[label] = {'arm':arm,'identicalOpeningAndSource':len(new),'identicalAgedFootprints':same_aged,
            'before':{k:v for k,v in prior.metrics(before).items() if k in fields},
            'replay':{k:v for k,v in prior.metrics(after).items() if k in fields}}
    return controls,changes

def resident(cell, arm, r, track, scale, elapsed):
    def distance(p,q):
        return math.hypot(*(s*(x-y) for s,x,y in zip(scale,p,q)))
    trips = track['trips']
    completed = [p for p in trips if p['end'] is not None and p['distance']>1e-8]
    own = [p for p in completed if not p['escape']]
    def advances(p):
        return distance(p['from'],p['to'])>=8-1e-7 and distance(p['from'],p['goal'])-distance(p['to'],p['goal'])>.75
    normal = [p for p in own if advances(p)]
    escapes = [p for p in completed if p['escape']]
    closed = [b-a for a,b in track['stalls']]
    overdue = 0 if track['openFailure'] is None else elapsed-track['openFailure']
    failed_at = [a for a,b in track['stalls']]
    if track['openFailure'] is not None:
        failed_at.append(track['openFailure'])
    timeline = sorted([(x,0) for x in failed_at]+[(p['end'],1) for p in normal])
    since, recoveries = None, []
    for clock, arrived in timeline:
        if not arrived and since is None:
            since = clock
        if arrived and since is not None:
            recoveries.append(clock-since)
            since = None
    open_to_normal = 0 if since is None else elapsed-since
    return {**{k:cell[k] for k in ID},'arm':arm,'key':r['key'],
        'requests':r['ambientRequests'],'plans':r['ambientPlans'],'planningFailures':r['ambientFailures'],
        'requestSuccessRate':round(r['ambientPlans']/r['ambientRequests'],6) if r['ambientRequests'] else None,
        'planningSuccessRate':round(r['ambientPlans']/(r['ambientPlans']+r['ambientFailures']),6) if r['ambientPlans']+r['ambientFailures'] else None,
        'actualStarts':r['ambientStarts'],'allAmbientFootDistanceCss':round(sum(p['cssDistance'] for p in trips),3),
        'allMotionDistanceStage':round(r['actualDistance'],3),'ownArrivals':len(own),'normalCompletions':len(normal),
        'normalDistanceCss':round(sum(p['cssDistance'] for p in normal),3),
        'normalLengthsCss':old.canonical([round(p['cssDistance'],3) for p in normal]),
        'normalNetCss':old.canonical([round(distance(p['from'],p['to']),3) for p in normal]),
        'retreatCompletions':len(escapes),'retreatAdvances8Css':sum(advances(p) for p in escapes),
        'assistedRetreatAdvances8Css':sum(p['assisted'] and advances(p) for p in escapes),
        'unassistedRetreatLengthsCss':old.canonical([round(p['cssDistance'],3) for p in escapes if not p['assisted']]),
        'intentRouteNormal':sum(p['intentRoute'] for p in normal),
        'longestFailureSec':round(max([0,overdue,*closed]),3),'openFailureSec':round(overdue,3),
        'recoveredFailures':len(closed),'recoveriesToNormal':len(recoveries),
        'longestRefusalToNormalSec':round(max([0,open_to_normal,*recoveries]),3),
        'openRefusalToNormalSec':round(open_to_normal,3),'givenYield':r['yieldsGiven'],'receivedYield':r['yieldsReceived'],
        'lastActivity':r['activity'],'contactVetoes':r['stepVetoes'].get('contact',0)}

def digest_group(residents, gestures, aged, targets):
    q = prior.metrics(gestures)
    warm = prior.metrics(aged)
    return {'residents':len(residents),'requested':sum(r['requests']>0 for r in residents),
        'normalWalkers':sum(r['normalCompletions']>0 for r in residents),'ownArrivalsWalkers':sum(r['ownArrivals']>0 for r in residents),
        'actualWalkers':sum(r['actualStarts']>0 for r in residents),'escapeOnlyWalkers':sum(r['retreatCompletions']>0 and r['ownArrivals']==0 for r in residents),
        'requests':sum(r['requests'] for r in residents),'plans':sum(r['plans'] for r in residents),
        'planningFailures':sum(r['planningFailures'] for r in residents),
        'normalCompletions':sum(r['normalCompletions'] for r in residents),
        'longestToNormalSec':max(r['longestRefusalToNormalSec'] for r in residents),
        'openToNormalOver60':sum(r['openRefusalToNormalSec']>=60 for r in residents),'ambientFootDistanceCss':round(sum(r['allAmbientFootDistanceCss'] for r in residents),2),
        'longestFailureSec':max(r['longestFailureSec'] for r in residents),'openOver60':sum(r['openFailureSec']>=60 for r in residents),
        'recoveredFailures':sum(r['recoveredFailures'] for r in residents),'bothFailed':sum(r['dualFailure'] for r in targets),
        'wrongSelectionAndAutonomyFailed':sum(r['wrongSelectionAndAutonomyFailed'] for r in targets),
        'agedDragArrival':warm['arrival'],'agedNear4':warm['near4'],'agedDragCount':warm['drags'],
        **{k:q[k] for k in ('drags','arrival','near4','tapSent','tapSelected','occupiedSent','occupiedArrival')}}

def aggregate(cells,out,large):
    people,inputs,aged_inputs,targets,restores = [],[],[],[],[]
    safety = {a:Counter() for a in ARMS}
    for c in cells.values():
        label = {k:c[k] for k in ID}
        for arm,d in c['arms'].items():
            inputs.extend(physical_rows(c,arm))
            a = d['aged']
            end = a['final']
            for r in end['residents']:
                people.append(resident(c,arm,r,a['tracks'][r['key']],a['drag']['scale'],end['modelSeconds']))
            row = prior.drag_row(c,arm,f"aged/{a['index']}",a['drag'],'aged')
            aged_inputs.append(row)
            who = next(r for r in end['residents'] if r['key']==row['key'])
            auto_failed = bool(who['ambientFailures'] and not who['ambientStarts'])
            step = a['drag']['nativeMotion']['firstNativeFootClock'] is not None
            targets.append({**label,'arm':arm,'key':who['key'],'nativeStep':step,
                'dualFailure':auto_failed and row['issued'] and not step,
                'wrongSelectionAndAutonomyFailed':auto_failed and not row['selected']})
            counter = safety[arm]
            counter.update({k:a['safety'][k] for k in SAFETY})
            for frame in a['frameSamples']:
                p = frame['presentation']
                counter.update({k:frame[k] for k in ('painted','outsideActorBounds','nonGround','hidden')})
                counter.update({k:p[k] for k in ('missingShadow','extraShadows')})
                counter['frames'] += 1
                counter['ribbonOK'] += bool(p['visibleRibbon'] and p['sameRibbonScale'] and p['sameRibbonTranslation'] and p['ribbonAnchorError'] is not None and p['ribbonAnchorError']<.02)
                counter['maxFootErrorCss'] = max(counter['maxFootErrorCss'],frame['maxAnchorErrorCss'])
            counter['socialEvents'] += a['frameSamples'][-1]['presentation']['events'].get('social',0)
            if 'reloaded' in d:
                r = d['reloaded']
                restores.append({**label,'arm':arm,'sha256':r['saveSHA256'],'bytes':r['bytes'],'loadedFieldsMatch':r['saved']==r['loaded'],
                                 'roster':len(r['roster']),'gear':r['loaded']['gear'],'trusted':r['drag']['trusted'],'issued':r['drag']['issued']})
    groups,changes,live = [],[],{}
    for arm in ARMS:
        selection = [[x for x in seq if x['arm']==arm] for seq in (people,inputs,aged_inputs,targets)]
        for key,values in [('all',['all']),('region',old.REGIONS),('count',old.COUNTS),('width',old.WIDTHS)]:
            for value in values:
                subset = selection if key=='all' else [[x for x in seq if x[key]==value] for seq in selection]
                if subset[0]:
                    groups.append({'group':key,'value':value,'arm':arm,**digest_group(*subset)})
        for phase,seq in [('opening',selection[1]),('aged',selection[2])]:
            m = prior.metrics(seq)
            safety[arm].update({phase+'-'+k:m[k] for k in ('unsafe','swept','backwardsIssued','maxReleaseJump','graphSearchesDuringMove')})
        if arm!='v9':
            live[arm],diff = prior.comparison(selection[1],[r for r in inputs if r['arm']=='v9'])
            changes.extend([{'comparedWith':arm,**r} for r in diff])
    ref = {tuple(r[k] for k in (*ID,'key')):r for r in people if r['arm']=='v8'}
    changed = []
    for r in (r for r in people if r['arm']=='v9'):
        before=ref[tuple(r[k] for k in (*ID,'key'))]
        if bool(r['normalCompletions']) != bool(before['normalCompletions']):
            changed.append({**{k:r[k] for k in (*ID,'key')},
                'direction':'gained' if r['normalCompletions'] else 'lost',
                **{ver+'_'+k:v[k] for ver,v in [('v8',before),('v9',r)] for k in
                    ('requests','plans','normalCompletions','ownArrivals','retreatCompletions','allAmbientFootDistanceCss','longestFailureSec')}})
    for name,rows in [('normal-walker-changes.csv',changed),('groups.csv',groups),('paired-changes.csv',changes),('aged-targets.csv',targets),('restores.csv',restores)]:
        csv_write(out/('matrix-'+name),rows)
    for region in old.REGIONS:
        rr=[r for r in people if r['region']==region]
        if rr:
            csv_write(out/f'matrix-residents-{region}.csv',rr)
    for name,rows in [('residents',people),('opening-inputs',inputs),('aged-inputs',aged_inputs)]:
        csv_write(large/f'matrix-{name}.csv.gz',rows)
    return {'total':{r['arm']:r for r in groups if r['group']=='all'},'safety':safety,
            'sameRunPairedOpening':live,'saves':{'n':len(restores),'rosterAndNativeFieldsAndInput':sum(r['loadedFieldsMatch'] and r['roster']==28 and r['trusted'] for r in restores)}}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archives',type=Path,required=True,help='Official V9 regional ZIPs')
    parser.add_argument('--private-data',type=Path,required=True,help='External owner-only directory for compressed exports')
    parser.add_argument('--v8-archives',type=Path,required=True)
    parser.add_argument('--v7-archives',type=Path,required=True)
    parser.add_argument('--run',required=True)
    parser.add_argument('--out',type=Path,default=HERE/'evidence')
    args = parser.parse_args()
    cells,receipt = region_zips(args.archives,args.run,'mobility-v9-')
    tape, subjects = history(),v8.subjects()
    for coord,cell in cells.items():
        validate(cell,tape)
        old.require(all(a['aged']['drag']['key']==subjects[coord] for a in cell['arms'].values()),'aged target changed')
    released8,old8 = region_zips(args.v8_archives,V8_RUN,'mobility-v8-',True)
    released7,old7 = region_zips(args.v7_archives,V7_RUN,'mobility-matrix-',True)
    controls,changes = historical_controls(cells,{'V8 release V8':(released8,'v8'),'V8 release V7':(released8,'v7'),'V7 release V7':(released7,'v7')})
    out = args.out
    out.mkdir(exist_ok=True,parents=True)
    args.private_data.mkdir(parents=True,exist_ok=True)
    result = aggregate(cells,out,args.private_data)
    totals = result['total']
    old.require(all(r['residents']==3276 and (r['drags'],r['tapSent'],r['agedDragCount'])==(1058,260,260) for r in totals.values()),'incomplete physical input or census')
    k = ('arrival','near4','tapSelected','bothFailed')
    result['historic'] = {arm:dict(zip(k,values)) for arm,values in HISTORIC.items()}
    result['historicalControls'] = controls
    result['gatesAgainstPublishedV8'] = {field:totals['v9'][field]>=v if field!='bothFailed' else totals['v9'][field]<=v for field,v in zip(k,HISTORIC['v8'])}
    result['revision'] = receipt['headSha']
    receipt['derived'] = {p.name:{'bytes':p.stat().st_size,'sha256':old.digest(p.read_bytes())} for p in args.private_data.glob('matrix-*.csv.gz')}
    receipt['priorRuns'] = {o['run']:{'url':o['url'],'headSha':o['headSha'],'zipDigestsVerified':len(o['regions'])} for o in [old7,old8]}
    csv_write(out/'matrix-historical-changes.csv',changes)
    write_json(out/'matrix-result.json',result)
    write_json(out/'matrix-receipt.json',receipt)
    print(json.dumps(result['gatesAgainstPublishedV8']))

if __name__=='__main__':
    main()
