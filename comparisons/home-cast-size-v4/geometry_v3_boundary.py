"""Cross-check newly measured zero-gain 320px poses against the pinned V3 native archive."""
import argparse
import gzip
import json
from pathlib import Path
import tarfile

def verify(a):
    rows=[]
    files={p.name:p for p in a.root.rglob('320-*.json.gz') if p.parent.name=='fixed'}
    with tarfile.open(a.v3) as src:
        for m in src:
            if not m.name.startswith('fixed/320-') or m.name.split('-')[-1] not in ('20.json','28.json'):continue
            v3=json.load(src.extractfile(m));v4name=Path(m.name).name+'.gz'
            v4=json.load(gzip.open(files[v4name]))
            fixture=v4['fixture'];tr,=v4['trajectories']
            for t,p3,p4 in zip((0,8,30),(v3,v3['moved'],v3.get('later')),tr['phases'],strict=True):
                if p3 is None:continue
                old,new=p3['actors'],p4['actors']
                if [v['key'] for v in old]!=[v['key'] for v in new]:raise ValueError('Archived roster differs')
                geometry=lambda key:max(abs(x-y) for o,n in zip(old,new) for x,y in zip(o[key],n[key]))
                v3hits={k:v[0] for k,v in p3['taps']['0']['roles'].items()}
                v4hits={role:sum(v[4] for aa,v in zip(new,p4['gains']['0']['residents']) if aa['kind']==role)
                    for role in ('pet','partner','companion')}
                rows.append(dict(region=fixture['region'],count=fixture['count'],seconds=t,chromeV3=v3['browser'],chromeV4=tr['browser'],
                    nativeMaxDelta=round(geometry('native'),8),footMaxDeltaCssPx=round(geometry('foot'),6),frameMaxDeltaCssPx=round(geometry('frame'),6),
                    maxDepthDelta=round(max(abs(a['depth']-b['depth']) for a,b in zip(old,new)),8),
                    v3Hits=v3hits,v4Hits=v4hits))
    if len({(d['region'],d['count']) for d in rows})!=26:raise ValueError('26 endpoint households required')
    a.out.write_text(json.dumps(dict(width=320,gameHeight=516,counts=[20,28],phases=rows),separators=(',',':'))+'\n')
    print(len(rows),'archived phases checked;',sum(d['nativeMaxDelta']==0 and d['footMaxDeltaCssPx']==0 for d in rows),'exact native+feet match')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('root',type=Path);p.add_argument('v3',type=Path);p.add_argument('out',type=Path);verify(p.parse_args())
