"""Combine complete regional Actions artifacts; reject missing or duplicate real measurements."""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

from regression_grid import COLUMNS, DAYPARTS, HEIGHTS, REGIONS


def unique_file(root,name):
    paths=list(root.rglob(name))
    if len(paths)!=1:
        raise ValueError(f'Expected exactly one {name}, found {len(paths)}')
    return paths[0]


def summarize(root,out):
    out.mkdir(parents=True,exist_ok=True)
    rows=[]
    packages=[]
    versions=set()
    canvas={}
    per_region={}
    recovery_events=[]
    for region in REGIONS:
        metadata=json.loads(unique_file(root,region+'.json').read_text())
        versions.add(metadata['browser'])
        assert metadata['cases']==112 and metadata['region']==region and metadata['counts']==list(range(1,29))
        with unique_file(root,region+'.csv').open() as f:
            reader=csv.DictReader(f)
            assert reader.fieldnames==COLUMNS
            samples=list(reader)
        ids={(int(r['count']),int(r['width'])) for r in samples}
        expected={(count,width) for count in range(1,29) for width in (320,375,390,430)}
        assert len(samples)==len(ids)==112 and ids==expected
        for r in samples:
            n,w=int(r['count']),int(r['width'])
            assert r['region']==region and int(r['height'])==HEIGHTS[w]
            assert int(r['actors'])==int(r['groundValid'])==int(r['v4GroundValid'])==n
            assert float(r['extraPercent'])==(0 if w==320 else max(0,n-18)*1.5)
            assert all(r[k]=='1' for k in ['sizeBRoleAndAspectMatch','groundToggleGeometryIdentical','sameRosterAndAssetDimensions'])
            assert all(float(r[k])<.0001 for k in ['maxCssScaleError','maxAspectError','v4ScaleError','v4AspectError'])
        by_key={(int(row['count']),int(row['width'])):row for row in samples}
        for count in range(1,29):
            prior=(0,0)
            for width in metadata['widths']:
                row=by_key[count,width]
                observed=(int(row['v4FitRecoveries']),int(row['fitRecoveries']))
                increments=tuple(n-old for n,old in zip(observed,prior))
                assert min(increments)>=0, (region,count,width,prior,observed)
                if any(increments):
                    recovery_events.append({'region':region,'count':count,'width':width,
                        'V4Activations':increments[0],'finishActivations':increments[1]})
                prior=observed
        rows+=samples
        probe=json.loads(unique_file(root,region+'-dayparts.json').read_text())
        assert probe['region']==region and probe['sameFrame'] and len(probe['roster'])==19
        assert set(probe['realCanvasPaints'])==set(DAYPARTS)
        for time,r in probe['realCanvasPaints'].items():
            assert r['art'].endswith(f'{region}-{time}.webp') and r['pixels']==[1024,1536]
            assert r['size']=='B' and r['extra']==1.5 and r['region']==region and min(r['visibleCanvas'])>0
        versions.add(probe['browser'])
        canvas[region]=probe['realCanvasPaints']
        per_region[region]={'pairedCases':len(samples),'visibleDayparts':len(probe['realCanvasPaints']),
            'finishFitRecoveryReadings':sum(int(r['fitRecoveries'])>0 for r in samples)}
        packages.append(json.loads(unique_file(root,region+'-package.json').read_text()))
    assert all(p==packages[0] for p in packages)
    with (out/'native-size-grid.csv').open('w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=COLUMNS,lineterminator='\n')
        writer.writeheader()
        writer.writerows(sorted(rows,key=lambda r:(REGIONS.index(r['region']),int(r['count']),int(r['width']))))
    summary={'browsers':sorted(versions),'pairedCases':len(rows),'nativeSamples':2*len(rows),
        'actorObservationsPerVersion':sum(int(r['actors']) for r in rows),
        'equipmentObservationsPerVersion':sum(int(r['gear']) for r in rows),
        'finishMaxCssScaleError':max(float(r['maxCssScaleError']) for r in rows),
        'finishMaxAspectError':max(float(r['maxAspectError']) for r in rows),
        'v4MaxCssScaleError':max(float(r['v4ScaleError']) for r in rows),
        'v4MaxAspectError':max(float(r['v4AspectError']) for r in rows),
        'identicalNativeSnapshotHashes':sum(r['v4NativePoseSha256']==r['finishNativePoseSha256'] for r in rows),
        'cameraFitEvents':recovery_events,
        'fitRecoveryReadingsV4':sum(int(r['v4FitRecoveries'])>0 for r in rows),
        'fitRecoveryReadingsFinish':sum(int(r['fitRecoveries'])>0 for r in rows),
        'widths':[320,375,390,430],'counts':list(range(1,29)),
        'visibleDayparts':sum(len(views) for views in canvas.values()),'regions':per_region}
    output={'native-size-summary.json':summary,'dayparts-regression.json':canvas,'package-regression.json':packages[0]}
    for filename,data in output.items():
        (out/filename).write_text(json.dumps(data,indent=2)+'\n')
    print(json.dumps({k:v for k,v in summary.items() if k not in ('regions','counts')},indent=2))


def actions_provenance(root,run_id,archives):
    repo='Naoto214/naotocchi'
    run=json.loads(subprocess.check_output(['gh','run','view',str(run_id),'-R',repo,'--json',
        'status,conclusion,headSha,url,jobs']))
    assert run['status']=='completed' and run['conclusion']=='success'
    jobs=run.pop('jobs')
    assert len(jobs)==len(REGIONS) and all(j['conclusion']=='success' for j in jobs)
    result={**run,'runId':run_id,'artifacts':{}}
    remote=json.loads(subprocess.check_output(['gh','api',f'repos/{repo}/actions/runs/{run_id}/artifacts?per_page=100']))
    assert remote['total_count']==len(REGIONS)
    for item in remote['artifacts']:
        region=item['name'].removeprefix('regression-')
        assert region in REGIONS and region not in result['artifacts']
        job=next(j for j in jobs if j['name']==f'region ({region})')
        archive=unique_file(archives,'v5-grid-'+region+'.zip')
        digest='sha256:'+hashlib.sha256(archive.read_bytes()).hexdigest()
        assert digest==item['digest'] and archive.stat().st_size==item['size_in_bytes']
        with zipfile.ZipFile(archive) as zipped:
            assert all(zipped.read(name)==unique_file(root,name).read_bytes() for name in zipped.namelist())
        meta=json.loads(unique_file(root,region+'.json').read_text())
        result['artifacts'][region]={'jobId':job['databaseId'],'artifactId':item['id'],
            'zipSHA256':digest.removeprefix('sha256:'),'bytes':item['size_in_bytes'],'browser':meta['browser'],
            'startedAt':job['startedAt'],'completedAt':job['completedAt'],'entrySHA256':meta['gameSource']}
    return result


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('artifacts',type=Path)
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--actions-run',type=int,help='Verify all 13 downloaded ZIPs and their included bytes against GitHub')
    p.add_argument('--zip-root',type=Path,help='Directory containing v5-grid-REGION.zip for each region')
    a=p.parse_args()
    if (a.actions_run is None)!=(a.zip_root is None):
        p.error('--actions-run and --zip-root must be supplied together')
    summarize(a.artifacts,a.out)
    if a.actions_run:
        evidence=actions_provenance(a.artifacts,a.actions_run,a.zip_root)
        (a.out/'native-size-actions.json').write_text(json.dumps(evidence,indent=2)+'\n')
        print('Verified 13 local ZIP digests and extracted file contents against',evidence['url'])
