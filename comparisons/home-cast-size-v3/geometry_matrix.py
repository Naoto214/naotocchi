"""Project original alpha onto real DOM frames and compare fixed and optimized opening trials."""
import json
import math
from functools import lru_cache
from statistics import median
import numpy as np
from PIL import Image, ImageDraw

EXTRAS=(0,5,10,15,20)
COLUMNS=['heroHeight','partnerHeight','companionMedian','overlappingPairs','sharedInkPct','heroExposedPct','partnerExposedPct','clippedCount','fullyHiddenCount','companionMinHeight','companionMaxHeight','hiddenInkPx2','distinctOverlapPx2','totalInkPx2']


@lru_cache(maxsize=64)
def source_alpha(path):
    with Image.open(path) as im:
        return im.convert('RGBA').getchannel('A')


@lru_cache(maxsize=2)
def foreground_data(game):
    source=(game/'home-production-manifest.mjs').read_text()
    marker='export const ART_SCENES='
    return json.JSONDecoder().raw_decode(source.split(marker,1)[1])[0]


def screen_polygons(game,phase):
    p=phase['p'];region=p.get('region')
    if not region:return None
    box=p['art']
    return [[(box['left']+x*box['width'],box['top']+y*box['height']) for x,y in polygon]
            for polygon in foreground_data(game)[region]['foreground']]


def body_mask(a, gain, game, clip, polygons):
    # The trial multiplies its existing role scale about the native painted foot.
    # Calculate the original frame in CSS pixels (x, y, width, height).
    fx,fy=a['foot']; x,y,w,h=a['frame']
    l,t=fx+(x-fx)*gain,fy+(y-fy)*gain
    w,h=w*gain,h*gain
    il,it,ir,ib=math.floor(l),math.floor(t),math.ceil(l+w),math.ceil(t+h)
    alpha=source_alpha(game/a['asset']); aw,ah=alpha.size
    if a['flip']:
        alpha=alpha.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    # Create antialiased, subpixel-aligned CSS samples. CSS canvas and the GPU
    # may round edge alpha differently, so the browser calibration is separate.
    ratioX,ratioY=aw/w,ah/h
    density=2
    args=(ratioX/density,0,(il-l)*ratioX,0,ratioY/density,(it-t)*ratioY)
    size=(max(1,ir-il),max(1,ib-it))
    im=alpha.transform((density*size[0],density*size[1]),Image.Transform.AFFINE,
                       args,resample=Image.Resampling.BILINEAR)
    im=im.resize(size,Image.Resampling.BOX)
    ink=np.asarray(im)>=96
    yy,xx=np.nonzero(ink)
    clipped=False
    if len(yy):
        clipped=bool(np.any((xx+il<clip[0]-1)|(xx+il+1>clip[2]+1)|(yy+it<clip[1]-1)|(yy+it+1>clip[3]+1)))
    if polygons is None:
        polygons=[[(x+((1-px/a['local'][0]) if a['flip'] else px/a['local'][0])*a['frame'][2],
                    y+py/a['local'][1]*a['frame'][3]) for px,py in poly] for poly in a['masks']]
    intersecting=[p for p in polygons if max(x for x,_ in p)>=il and min(x for x,_ in p)<=ir
                  and max(y for _,y in p)>=it and min(y for _,y in p)<=ib]
    if intersecting:
        vis=Image.new('1',size,1);d=ImageDraw.Draw(vis)
        for poly in intersecting:
            d.polygon([(px-il,py-it) for px,py in poly],fill=0)
        ink &= np.asarray(vis,dtype=bool)
    yy,xx=np.ogrid[it:ib,il:ir]
    ink &= (yy>=clip[1]) & (xx>=clip[0]) & (yy<clip[3]) & (xx<clip[2])
    return (il,it,ir,ib),ink,clipped


def compare(phase,extra,game):
    raw=phase['p']['clip']; w,h=phase['p']['viewport']
    clip=(max(raw[0],0),max(raw[1],0),min(raw[0]+raw[2],w),min(raw[1]+raw[3],h))
    polygons=screen_polygons(game,phase)
    masks=[body_mask(a,1+extra/100,game,clip,polygons) for a in phase['actors']]
    n=len(masks); total=sum(np.count_nonzero(im) for _,im,_ in masks)
    lost=0;pairs=0;hiddens=0;exposed={};heights={}
    sorted_ids=sorted(range(n),key=lambda i:(phase['actors'][i]['z'],i))
    seen=np.zeros((h,w),dtype=bool)
    paired_screen_pixels=np.zeros_like(seen)
    for i in reversed(sorted_ids):
        b,im,_=masks[i]; x,y,r,bt=b
        x0,y0,x1,y1=max(0,x),max(0,y),min(w,r),min(h,bt)
        part=im[y0-y:y1-y,x0-x:x1-x] if x1>x0 and y1>y0 else np.empty((0,0),bool)
        kind=phase['actors'][i]['kind'];ink=int(part.sum())
        if not ink:
            hiddens+=1
        yy=np.nonzero(np.any(part,axis=1))[0]
        heights.setdefault(kind,[]).append(int(yy[-1]-yy[0]+1) if len(yy) else 0)
        if x1<=x0 or y1<=y0:
            if kind!='companion':exposed[kind]=0
            continue
        top=seen[y0:y1,x0:x1]
        covered=part & top
        hidden=int(np.count_nonzero(covered))
        paired_screen_pixels[y0:y1,x0:x1] |= covered
        if ink and hidden==ink:hiddens+=1
        lost+=hidden
        if kind!='companion':exposed[kind]=round(100*(ink-hidden)/ink,2) if ink else 0
        top|=part
        for j in range(i):
            (l,t,s,d),other,_=masks[j]
            lx,ty,rx,by=max(l,x),max(t,y),min(s,r),min(d,bt)
            if rx<=lx or by<=ty:continue
            if np.count_nonzero(im[ty-y:by-y,lx-x:rx-x]&other[ty-t:by-t,lx-l:rx-l])>=4:
                pairs+=1
    comp=heights.get('companion',[])
    return [heights['pet'][0], heights.get('partner',[None])[0], median(comp) if comp else None,
            pairs,round(100*lost/total,2) if total else 0,exposed.get('pet'),exposed.get('partner'),
            sum(v[2] for v in masks),hiddens,min(comp,default=None),max(comp,default=None),
            lost,int(np.count_nonzero(paired_screen_pixels)),int(total)]


def read_phases(f):
    yield 'initial',f
    if f.get('moved'):yield 'after8',f['moved']
    if f.get('later'):yield 'after30',f['later']
