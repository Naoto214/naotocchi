"""Recheck candidate foot intersections at quarter-pixel spacing on unrounded pair boundaries."""
import argparse,collections,gzip,hashlib,itertools,json,math
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.signal import fftconvolve
from importlib.util import spec_from_file_location,module_from_spec
HERE=Path(__file__).resolve().parent
s=spec_from_file_location('contact',HERE/'geometry-contact.py');contact=module_from_spec(s);s.loader.exec_module(contact)

def shape(person,game):
    alpha=np.asarray(Image.open(game/person['asset']).convert('RGBA'))[:,:,3]
    rows=np.nonzero((alpha>=128).any(axis=1))[0]
    band=rows[-1]+1-math.ceil((rows[-1]+1-rows[0])*.15)
    h,w=alpha.shape;l,t,rw,rh=person['rect'];sc=min(rw/w,rh/h)
    left=l+(rw-w*sc)/2-person['foot']['x'];top=t+(rh-h*sc)/2-person['foot']['y']
    mirror=person['flip'].startswith('matrix(-1') or person['flip'].startswith('-1')
    def lookup(x,y):
        ix=np.floor((x-left)/sc).astype(int);iy=np.floor((y-top)/sc).astype(int)
        if mirror:ix=w-1-ix
        valid=(ix>=0)&(ix<w)&(iy>=band)&(iy<h);mask=np.zeros(ix.shape,dtype=bool)
        mask[valid]=alpha[iy[valid],ix[valid]]>=128
        return mask
    return lookup

def verify(raw,game):
    data=json.load(gzip.open(raw));people=data['geometry']['people'];sx,sy=(data['scale'][z] for z in ('x','y'))
    low=[contact.mask(p,game)[1][45:136,45:136] for p in people]
    high=[shape(p,game) for p in people]
    yy,xx=np.mgrid[-15:15:.25,-40:40:.25];yy+=.125;xx+=.125
    angles=np.arange(96)*math.tau/96;cs=np.cos(angles);sn=np.sin(angles)
    output={m:[] for m in [8,5,0]}
    for i,j in itertools.combinations(range(len(people)),2):
        a,b=people[i],people[j];left=high[i](xx,yy)
        lut=np.rint(fftconvolve(low[i],low[j][::-1,::-1],mode='full')).astype(int)
        for m in [10,8,5,0]:
            x=cs*((a['w']+b['w'])*.5+m)*sx;y=sn*((a['h']+b['h'])*.38+m)*sy
            hits=lut[90+np.rint(y).astype(int),90+np.rint(x).astype(int)]
            if m==10:old=hits;x0=x;y0=y;continue
            for n in np.nonzero((hits>0)&(old==0))[0]:
                before=left&high[j](xx-x0[n],yy-y0[n]);after=left&high[j](xx-x[n],yy-y[n])
                if before.any() or not after.any():continue
                output[m].append({'actors':[a['key'],b['key']],'bearing':n*3.75,'areaCSS2':float(after.sum())/16,
                  'offsetCSS':[float(x[n]),float(y[n])],'oldOffsetCSS':[float(x0[n]),float(y0[n])]})
    return {'inputSHA256':hashlib.sha256(raw.read_bytes()).hexdigest(),'width':data['width'],'height':data['height'],'alpha':128,'spacingCSS':.25,
      'results':{m:{'count':len(v),'rolePairs':dict(collections.Counter('/'.join(sorted(k.split(':')[0] for k in r['actors'])) for r in v)),'examples':sorted(v,key=lambda x:-x['areaCSS2'])[:3]} for m,v in output.items()}}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('raw',type=Path);p.add_argument('game',type=Path);p.add_argument('out',type=Path)
    args=p.parse_args();args.out.write_text(json.dumps(verify(args.raw,args.game),indent=2)+'\n')
