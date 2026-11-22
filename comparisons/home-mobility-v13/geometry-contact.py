"""Test contact-boundary silhouettes with the original images in browser-measured rectangles."""
import argparse, gzip, hashlib, itertools, json, math
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.signal import fftconvolve

def rendered_roster(data):
    styles=Path(__file__).resolve().parent/'evidence/terrain-strict-contact-styles.json'
    case=next(r for r in json.loads(styles.read_bytes())['cases']
              if (r['width'],r['height'])==(data['width'],data['height']))
    result=[]
    for person in data['geometry']['people']:
        style=case['people'][person['key']]
        assert style['asset']==person['asset']
        result.append({**person,'imageScale':style['imageScale']})
    return result

def projection(person,source):
    # Every audited original PNG and its pre-transform CSS image box is square
    # (map-ink-layout.json). CSS then transforms width and height independently.
    h,w=source.shape
    if h!=w:raise ValueError('Non-square art requires its measured layout box')
    left,top,rw,rh=person['rect']
    return (left-person['foot']['x'],top-person['foot']['y'],rw/w,rh/h,
            person['imageScale'].split()[0]=='-1')

def mask(person,game):
    alpha=np.asarray(Image.open(game/person['asset']).convert('RGBA'))[:,:,3]
    h,w=alpha.shape;l,t,sx,sy,mirror=projection(person,alpha)
    yy,xx=np.mgrid[-90:91,-90:91];source_x=np.floor((xx-l)/sx).astype(int);source_y=np.floor((yy-t)/sy).astype(int)
    if mirror:source_x=w-1-source_x
    inside=(source_x>=0)&(source_x<w)&(source_y>=0)&(source_y<h)
    ink=np.zeros_like(source_x,dtype=bool)
    ink[inside]=alpha[source_y[inside],source_x[inside]]>=32
    ys,xs=np.nonzero(ink);band=ink.copy();band[:int(ys.max()+1-math.ceil((ys.max()-ys.min()+1)*.15))]=False
    return ink.astype('f'),band.astype('f')

def geometry_record(path):
    with (gzip.open(path,'rt') if path.suffix=='.gz' else path.open()) as stream:
        return json.load(stream)

def recorded_case(directory,name):
    plain=directory/(name+'.json')
    return plain if plain.is_file() else directory/(name+'.json.gz')

def profile(path,game):
    data=geometry_record(path);geometry=rendered_roster(data);sx,sy=(data['scale'][k] for k in ('x','y'))
    pictures=[mask(a,game) for a in geometry]
    theta=np.arange(96)*math.tau/96;cs=np.cos(theta);sn=np.sin(theta)
    nearHorizontal=np.abs(sn)<.40
    nearVertical=np.abs(cs)<.40
    results={}
    for margin in [10,8,5,0]:
        results[margin]={'initialContacts':0,'initialContactsWithBaseInkOverlap':0,'initialContactsWithBothBottomBandsOverlapping':0,
          'boundaryPoses':0,'opaqueOverlapPoses':0,'bothFootBandOverlapPoses':0,'newVersusOriginalBodyOverlap':0,
          'newVersusOriginalBothFootBands':0,'newLateralOverlap':0,'newForeAftOverlap':0,'strongestNewOverlap':None}
    keys=[a['key'] for a in geometry]
    poses=data['frames'][0]['actors'];byKey={a['key']:a for a in poses}
    for i,j in itertools.combinations(range(len(geometry)),2):
        a,b=geometry[i],geometry[j]
        offsets=[np.rint(fftconvolve(x,y[::-1,::-1],mode='full')).astype(int) for x,y in zip(pictures[i],pictures[j])]
        mid=180
        def hits(dx,dy):return np.array([p[mid+dy,mid+dx] for p in offsets])
        ad=byKey[a['key']];bd=byKey[b['key']];dx=bd['x']-ad['x'];dy=bd['y']-ad['y']
        seen=hits(round(dx),round(dy)) if abs(dx)<=mid and abs(dy)<=mid else [0,0]
        for margin,stats in results.items():
            rx=((a['w']+b['w'])/2+margin)*sx;ry=((a['h']+b['h'])*.38+margin)*sy
            if (dx/rx)**2+(dy/ry)**2<1:
                stats['initialContacts']+=1
                stats['initialContactsWithBaseInkOverlap']+=int(seen[0]>0)
                stats['initialContactsWithBothBottomBandsOverlapping']+=int(seen[1]>0)
            x=np.rint(cs*rx).astype(int);y=np.rint(sn*ry).astype(int)
            at=hits(x,y)
            if margin==10:original=at
            added=(at>0)&(original==0)
            stats['boundaryPoses']+=96
            stats['opaqueOverlapPoses']+=int((at[0]>0).sum());stats['bothFootBandOverlapPoses']+=int((at[1]>0).sum())
            stats['newVersusOriginalBodyOverlap']+=int(added[0].sum())
            stats['newVersusOriginalBothFootBands']+=int(added[1].sum())
            stats['newLateralOverlap']+=int((added[0]&nearHorizontal).sum());stats['newForeAftOverlap']+=int((added[0]&nearVertical).sum())
            score=np.where(added[0],at[0],0);n=int(np.argmax(score));winner=stats['strongestNewOverlap']
            if score[n] and (not winner or int(score[n])>winner['opaquePixels']):
                stats['strongestNewOverlap']={'pair':[keys[i],keys[j]],'bearing':n*3.75,'offsetCSS':[int(x[n]),int(y[n])],
                 'opaquePixels':int(score[n]),'overlappingBottomBandPixels':int(at[1,n])}
    return {'width':data['width'],'height':data['height'],'input':path.name,'sourceSHA256':hashlib.sha256(path.read_bytes()).hexdigest(),
            'nativeScale':[sx,sy],'marginsModelPixels':results}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('raw',type=Path);p.add_argument('game',type=Path);p.add_argument('out',type=Path)
    args=p.parse_args();cases=[recorded_case(args.raw,f'forest-{w}-28') for w in (320,375,390,430)]
    cases.append(recorded_case(args.raw,'forest-320-28-long-fixed'))
    rows=[]
    for case in cases:
        rows.append(profile(case,args.game));print(case.name,flush=True)
        args.out.write_text(json.dumps({'pixelSizeCSS':1,'alphaThreshold':32,'bandBottomFraction':.15,'bearings':96,
          'pairsPerWidth':378,'sampling':'hypothetical pair poses on ellipse boundaries; current opaque PNG pixels at original opening sizes',
          'cases':rows},indent=2)+'\n')
