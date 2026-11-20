"""Combine complete regional Actions artifacts; reject missing or duplicate real measurements."""
import argparse
import csv
import json
from pathlib import Path

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
        'fitRecoveryReadingsV4':sum(int(r['v4FitRecoveries'])>0 for r in rows),
        'fitRecoveryReadingsFinish':sum(int(r['fitRecoveries'])>0 for r in rows),
        'widths':[320,375,390,430],'counts':list(range(1,29)),
        'visibleDayparts':sum(len(views) for views in canvas.values()),'regions':per_region}
    output={'native-size-summary.json':summary,'dayparts-regression.json':canvas,'package-regression.json':packages[0]}
    for filename,data in output.items():
        (out/filename).write_text(json.dumps(data,indent=2)+'\n')
    print(json.dumps({k:v for k,v in summary.items() if k not in ('regions','counts')},indent=2))


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('artifacts',type=Path)
    p.add_argument('--out',type=Path,required=True)
    a=p.parse_args()
    summarize(a.artifacts,a.out)
