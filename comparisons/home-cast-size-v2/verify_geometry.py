"""Measure visible resident ink in the actual mobile game and keep the original 570 controls."""
import argparse
from datetime import datetime, timezone
import importlib.util
import io
import json
import math
import os
from pathlib import Path
from statistics import median
from urllib.parse import urlencode

import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

DIRECTORY = Path(__file__).resolve().parent
prior_file = DIRECTORY.parent / 'home-cast-size-v1/verify_geometry.py'
spec = importlib.util.spec_from_file_location('previous_geometry', prior_file)
v1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v1)
REGIONS = ('forest', 'river_lake', 'home', 'city')
HEIGHT = {320:568, 375:812, 390:844, 430:932}


def r(value):
    return round(value, 3)


def point(bounds):
    return [r(v) for v in bounds]


def raster(iframe, frame, rows, anchors):
    masks, boxes, clipped, hidden = {}, {}, [], []
    for group in v1.groups(rows):
        frame.evaluate('ids => qaGeometrySilhouette(ids)', [a['id'] for a in group])
        raw = np.asarray(Image.open(io.BytesIO(iframe.screenshot(scale='css'))))
        white = raw[:,:,1] >= 96
        for a in group:
            left, top, right, bottom = a['frame']
            y0, x0 = max(0,math.floor(top)), max(0,math.floor(left))
            y1, x1 = min(white.shape[0], math.ceil(bottom)), min(white.shape[1], math.ceil(right))
            body = np.zeros_like(white)
            if x1 > x0 and y1 > y0:
                body[y0:y1,x0:x1] = white[y0:y1,x0:x1]
            masks[a['id']] = body
            ys, xs = np.nonzero(body)
            if not ys.size:
                hidden.append(a['id'])
            boxes[a['id']] = [int(xs.min()), int(ys.min()), int(xs.max()+1), int(ys.max()+1)] if len(xs) else [0,0,0,0]
            sx, sy, sr, sb = anchors['screen']
            l, t, right, bottom = a['uncut']
            if l < max(0,sx)-1 or t < max(0,sy)-1 or right>min(white.shape[1],sr)+1 or bottom>min(white.shape[0],sb)+1:
                clipped.append(a['id'])
    frame.evaluate('qaGeometrySilhouette(null)')
    coverage = np.zeros_like(next(iter(masks.values())),dtype=np.uint8)
    pairs = []
    for key, body in masks.items():
        for other in masks:
            if key < other:
                area = int(np.count_nonzero(body & masks[other]))
                if area >= 4:
                    pairs.append((key, other, area))
        coverage += body
    total = int(coverage.sum())
    height = {k:b[3]-b[1] for k,b in boxes.items()}
    role = lambda kind: next((k for k in boxes if k.startswith(kind+':')), None)
    pet, partner = role('pet'),role('partner')
    companions = [v for k,v in height.items() if k.startswith('companion:')]
    ranks = {
        row['id']:i for i,row in enumerate(sorted(rows,key=lambda a:a['z']))}
    def visible(key):
        if not key: return None
        remaining = masks[key].copy()
        for other in boxes:
            if ranks[other]>ranks[key]:
                remaining &= ~masks[other]
        return r(100*remaining.sum()/max(1, masks[key].sum()))
    return {
        'hero': height[pet], 'partner':height.get(partner),
        'companions': [min(companions),median(companions),max(companions)] if companions else None,
        'tallerThanPartner': sum(h>height[partner] for h in companions) if partner else None,
        'pairs':len(pairs), 'sharedPct':r(100*(total-np.count_nonzero(coverage))/max(1,total)),
        'heroExposedPct':visible(pet),'partnerExposedPct':visible(partner),
        'inkBoxes':boxes,'outsideClip':clipped,'zeroInk':hidden,
        'largestOverlaps':sorted(pairs,key=lambda p:p[2],reverse=True)[:5],
    }


def run(pw, args):
    executable = {'executable_path':os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),'args':['--no-sandbox']} if args.engine=='chromium' else ({'executable_path':os.environ['WEBKIT_PATH']} if os.environ.get('WEBKIT_PATH') else {})
    browser = getattr(pw,args.engine).launch(**executable)
    data=json.loads(args.out.read_text()) if args.out.is_file() else {'engine':args.engine,'version':browser.version,'measurements':{}}
    for width in args.widths:
        context=browser.new_context(viewport={'width':width,'height':HEIGHT[width]},has_touch=True,is_mobile=True,device_scale_factor=2)
        for region in args.regions:
            for count in args.counts:
                for mode in args.modes:
                    key=f'{width}/{region}/{count}/{mode}'
                    if args.resume and key in data['measurements']:continue
                    page=context.new_page()
                    try:
                        page.clock.set_fixed_time(datetime(2026,10,15,3,tzinfo=timezone.utc))
                        query={'region':region,'time':'day','count':count,'paused':1,'mode':mode}
                        # #570 and V2 share the 52 px phone header. #570 receives
                        # its actual role sliders so its accepted size is measured independently.
                        if mode=='adopted':query.update(hero=120,partner=120,companions=105)
                        if mode=='current':query.update(castPreset='current')
                        page.goto(args.url.rstrip('/')+'/?'+urlencode(query),wait_until='domcontentloaded',timeout=90000)
                        page.wait_for_function("document.body.dataset.ready === 'true'", timeout=110000)
                        iframe=page.locator('#home')
                        frame=iframe.element_handle().content_frame()
                        frame.wait_for_function('n=>HomeCastTrial.inspect().length===n && HomeBeauty.paintRect?.width>0',arg=count,timeout=70000)
                        frame.evaluate("Promise.all([...document.querySelectorAll('#castStage img')].map(im=>im.decode().catch(()=>{})))")
                        frame.evaluate("document.getAnimations().forEach(a=>{a.pause();a.currentTime=0})")
                        frame.evaluate(v1.PROBE)
                        rows=frame.evaluate('qaGeometryActors()')
                        anchors=frame.evaluate('qaGeometryAnchors()')
                        assert len(rows)==count,(width,region,mode,len(rows))
                        poses=frame.evaluate("HomeCastTrial.inspect().map(a=>({key:a.key,kind:a.kind,x:a.x,y:a.y,w:a.w,h:a.h,foot:a.foot,d:a.depth}))")
                        settings=frame.evaluate('HomeCastTrial.settings')
                        assert settings['paused']
                        expected=[100,100,100] if mode=='current' else [120,120,105]
                        assert [settings[k] for k in ('hero','partner','companions')]==expected,(mode,settings)
                        if args.images and (width in (320,390)) and count==28:
                            args.images.mkdir(parents=True,exist_ok=True)
                            iframe.screenshot(path=str(args.images/f'{args.engine}-{width}-{region}-{mode}.png'),scale='css')
                        row=raster(iframe,frame,rows,anchors)
                        pose2=frame.evaluate("HomeCastTrial.inspect().map(a=>({key:a.key,kind:a.kind,x:a.x,y:a.y,w:a.w,h:a.h,foot:a.foot,d:a.depth}))")
                        assert all(a['key']==b['key'] and abs(a['x']-b['x'])<.01 and abs(a['y']-b['y'])<.01 for a,b in zip(poses,pose2)),(key,'not fixed')
                        row.update({
                            'poses':{a['key']:[r(a['x']),r(a['y']),r(a['w']),r(a['h']),r(a['d']),r(a['foot']['x']),r(a['foot']['y'])] for a in poses},
                            'attachments':[{'name':a['name'],'bounds':point(a['box'])} for a in anchors['equipment']],
                            'shadows':len(anchors['shadows']),'contacts':len(anchors['contacts']),
                            'canvas':point([iframe.bounding_box()['width'],iframe.bounding_box()['height']]),
                            'overviewNodes':frame.locator('.diorama-view').count(),
                            # All 28 fixture sprites are authored on square 128px frames.
                            'frameAspectRange':point([min((a['frame'][2]-a['frame'][0])/(a['frame'][3]-a['frame'][1]) for a in rows),
                                max((a['frame'][2]-a['frame'][0])/(a['frame'][3]-a['frame'][1]) for a in rows)]),
                        })
                        data['measurements'][key]=row
                        args.out.parent.mkdir(exist_ok=True,parents=True)
                        args.out.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
                        print(key,'pairs',row['pairs'],row['sharedPct'],'roles',row['hero'],row['partner'],row['companions'],'clip',row['outsideClip'],flush=True)
                    finally:page.close()
        context.close()
    browser.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('url');parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--images',type=Path);parser.add_argument('--resume',action='store_true')
    parser.add_argument('--widths',nargs='+',type=int,default=[320,390,375,430])
    parser.add_argument('--regions',nargs='+',choices=REGIONS,default=list(REGIONS))
    parser.add_argument('--counts',nargs='+',type=int,default=[28])
    parser.add_argument('--modes',nargs='+',choices=['current','adopted','final'],default=['final'])
    parser.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
    with sync_playwright() as pw:run(pw,parser.parse_args())
