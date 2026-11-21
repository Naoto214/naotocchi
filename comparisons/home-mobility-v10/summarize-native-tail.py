"""Summarize scan outputs from native-preflight.mjs, retaining original opening examples."""
import argparse
from collections import Counter
import json
from math import atan2, cos, degrees, hypot, radians
from pathlib import Path


def outward_cone(owner, peers, scale):
    normals=[]
    for b in peers:
        if b[0]==owner[0]:continue
        rx=(owner[3]+b[3])*.5+10
        ry=(owner[4]+b[4])*.38+10
        x,y=owner[1]-b[1],owner[2]-b[2]
        if hypot(x/rx,y/ry)<1:
            normals.append(degrees(atan2(y/(ry*ry*scale['y']),x/(rx*rx*scale['x'])))%360)
    # An outward first step has nonnegative dot product with EVERY normalized
    # ellipse gradient. Test each boundary, as two cones can meet at one ray.
    edges=sorted({0.,360.,*((n+b)%360 for n in normals for b in [-90,90])})
    def allowed(angle):return all(cos(radians(angle-n))>=-1e-10 for n in normals)
    return {'intervals':[[round(a,6),round(b,6)] for a,b in zip(edges,edges[1:]) if allowed((a+b)/2)],
            'allowedBoundaries':[round(a,6) for a in edges[:-1] if allowed(a)]}


def summarize(path):
    data=json.loads(path.read_bytes())
    scale=json.loads((Path(__file__).parent/'evidence'/f"native-scene-{data['width']}.json").read_bytes())['baseline']
    result=[]
    for key in sorted({r['key'] for r in data['corridors']}):
        rows=[r for r in data['corridors'] if r['key']==key]
        person=next(r for r in data['records'] if r['key']==key)
        def minimum(row,field):return next((i for i,n in enumerate(row[field]['blockerCounts']) if n), 'noTerrainRay')
        first=rows[0].copy();peers=first.pop('peers')
        cones={b[0]:outward_cone(b,peers,scale) for b in peers if b[0] in [key,*first['contacts']]}
        result.append({'key':key,'requests':person['requests'],'normal8':person['walks'],'longest':person['longest'],
                       'refusals':len(rows),'anyHeadingMinimumBlockers':dict(Counter(str(minimum(r,'all')) for r in rows)),
                       'goalwardMinimumBlockers':dict(Counter(str(minimum(r,'toward')) for r in rows)),
                       'first':first,'firstOutwardCones':cones})
    return {'width':data['width'],'seed':data['seed'],'sourceSHA256':data['sourceSHA256'],'residents':result}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('files',nargs='+',type=Path)
    args=parser.parse_args()
    print(json.dumps([summarize(p) for p in args.files],ensure_ascii=False,indent=2))
