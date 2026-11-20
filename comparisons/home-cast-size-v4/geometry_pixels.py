"""Count original asset ink in measured CSS boxes, with the native foreground and z-order."""
import sys
from pathlib import Path

import numpy as np

V3=Path(__file__).resolve().parent.parent/'home-cast-size-v3'
sys.path.append(str(V3))
from geometry_matrix import body_mask, screen_polygons

ACTOR_COLUMNS=['height','ink','covered','exposed','hit3','clipped']
SCENE_COLUMNS=['pairs','hiddenPx2','distinctOverlapPx2','totalInkPx2','missingShadows',
               'gearCount','maxGearError','maxFootProjectionError']

def measure(phase,game):
    raw=phase['p']['clip']
    w,h=phase['p']['viewport']
    clip=(max(raw[0],0),max(raw[1],0),min(raw[0]+raw[2],w),min(raw[1]+raw[3],h))
    polygons=screen_polygons(game,phase)
    actors=phase['actors']
    role={a['kind']:a for a in actors}
    baseline=phase['baselineGear']
    for gain,paint in phase['gains'].items():
        frames=paint.pop('frames')
        hits={row[0]:row[1:] for row in paint.pop('hits')}
        if set(hits)!={a['key'] for a in actors}:raise ValueError('Hit probe roster mismatch')
        if any(len(x)!=3 for x in hits.values()):raise ValueError('Three official probes required for every resident')
        masks=[body_mask(dict(a,frame=f),1,game,clip,polygons) for a,f in zip(actors,frames,strict=True)]
        seen=np.zeros((h,w),bool)
        shared=np.zeros_like(seen)
        values=[None]*len(actors)
        pairs=lost=total=0
        for i in sorted(range(len(actors)),key=lambda i:(actors[i]['z'],i),reverse=True):
            (x,y,r,b),im,clipped=masks[i]
            x0,y0,x1,y1=max(0,x),max(0,y),min(w,r),min(h,b)
            visible=im[y0-y:y1-y,x0-x:x1-x] if x1>x0 and y1>y0 else np.empty((0,0),bool)
            ink=int(np.count_nonzero(visible))
            yy=np.flatnonzero(np.any(visible,axis=1))
            height=int(yy[-1]-yy[0]+1) if len(yy) else 0
            covered=0
            if ink:
                cover=seen[y0:y1,x0:x1]
                hidden=cover & visible
                shared[y0:y1,x0:x1]|=hidden
                covered=int(np.count_nonzero(hidden))
                cover|=visible
            a=actors[i]
            values[i]=[height,ink,covered,ink-covered,hits[a['key']].count(a['key']),int(clipped)]
            lost+=covered
            total+=ink
            for j in range(i):
                (l,t,s,d),other,_=masks[j]
                lx,ty,rx,by=max(l,x),max(t,y),min(s,r),min(d,b)
                if rx>lx and by>ty and np.count_nonzero(im[ty-y:by-y,lx-x:rx-x]&other[ty-t:by-t,lx-l:rx-l])>=4:
                    pairs+=1
        scale=1+float(gain)/100
        error=0
        equipment=paint.pop('gear')
        for (name,base),(key,actual) in zip(baseline,equipment,strict=True):
            if name!=key:raise ValueError('Equipment identity changed')
            foot=role['pet' if name=='petAccessory' else 'partner']['foot']
            expectation=[foot[i]+(base[i]-foot[i])*scale if i<2 else base[i]*scale for i in range(4)]
            error=max(error,*[abs(q-v) for q,v in zip(expectation,actual,strict=True)])
        foot_error=0
        for a,f in zip(actors,frames,strict=True):
            expected=[a['foot'][i]+(v-a['foot'][i])*scale if i<2 else v*scale for i,v in enumerate(a['frame'])]
            foot_error=max(foot_error,*[abs(q-v) for q,v in zip(expected,f,strict=True)])
        paint.update(scene=[pairs,lost,int(np.count_nonzero(shared)),total,
            sum(a['shadow'] is None or a['shadow'][2]<=0 for a in actors),
            len(baseline),round(error,4),round(foot_error,4)],residents=values)
        # Compact representation preserves misdirected official hit identities.
        indices={a['key']:i for i,a in enumerate(actors)}
        paint['hitTargets']=[[indices.get(k,-1) for k in hits[a['key']]] for a in actors]
