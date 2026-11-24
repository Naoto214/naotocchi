"""Calibrate projected alpha against the browser's rasterizer, foreground masks and rounded transforms."""
import argparse, json, os, sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright
from geometry_collect import BASE,HEIGHTS,QUERY
from geometry_matrix import compare,COLUMNS
from geometry_optimized import modes
sys.path.insert(0,str(BASE.parent/'home-cast-size-v2'))
import verify_geometry as v2


def main(args):
    table=modes(args.game)
    path=args.out
    data=json.loads(path.read_text()) if path.exists() else {'columns':COLUMNS[:11],'cases':{}}
    with sync_playwright() as pw:
        if args.webkit:
            kw={'executable_path':os.environ['WEBKIT_PATH']} if os.getenv('WEBKIT_PATH') else {}
            browser=pw.webkit.launch(**kw)
        else:
            browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
        data['browser']=browser.version
        for region in args.regions:
            for width in args.widths:
                ctx=browser.new_context(viewport={'width':width,'height':HEIGHTS[width]-52},has_touch=True,is_mobile=True,device_scale_factor=2)
                ctx.add_init_script(path=BASE/'geometry_capture.js')
                for layout in args.layouts:
                    grouping={}
                    for extra in args.extras:
                        representative=table[f'{width}-{region}-{args.count}'][str(extra)] if layout=='optimized' else 0
                        grouping.setdefault(representative,[]).append(extra)
                    for seed,group in grouping.items():
                        page=ctx.new_page()
                        try:
                            page.clock.set_fixed_time(datetime(2026,10,15,3,tzinfo=timezone.utc))
                            params={**QUERY,'region':region,'count':args.count,'layout':layout,'extra':seed}
                            page.goto(args.url+'?'+urlencode(params),wait_until='domcontentloaded',timeout=120000)
                            page.wait_for_function("window.HomeCastTrial?.ready && window.HomeBeauty.paintRect?.width",timeout=180000)
                            page.evaluate("Promise.all([...document.querySelectorAll('#castStage img')].map(img=>img.decode().catch(()=>{})))")
                            page.evaluate("HomeCastTrial.apply({extra:0,paused:true});document.getAnimations().forEach(a=>{a.pause();a.currentTime=0});true")
                            page.evaluate((BASE/'geometry_snapshot.js').read_text())
                            baseline=page.evaluate('qaGeometryDump()')
                            baseline['p']['region']=region
                            page.evaluate(v2.v1.PROBE)
                            for extra in group:
                                page.evaluate('n=>{HomeCastTrial.apply({extra:n});document.getAnimations().forEach(a=>{a.pause();a.currentTime=0})}',extra)
                                actors=page.evaluate('qaGeometryActors()');anchors=page.evaluate('qaGeometryAnchors()')
                                projected=compare(baseline,extra,args.game)[:11]
                                poses=page.evaluate('HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y,a.w,a.h])')
                                r=v2.raster(page,page,actors,anchors)
                                after=page.evaluate('HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y,a.w,a.h])')
                                if after!=poses:
                                    raise ValueError(f'Native poses changed during silhouette screenshot for {region} {width} {layout} +{extra}')
                                after_actors=page.evaluate('qaGeometryActors()')
                                frame_drift=max((abs(p-q) for a,b in zip(actors,after_actors) for p,q in zip(a['frame'],b['frame'])),default=0)
                                if frame_drift>0.01:
                                    raise ValueError(f'Actor image frames moved by {frame_drift:g}px during screenshot')
                                c=r['companions'] or [None,None,None]
                                real=[r['hero'],r['partner'],c[1],r['pairs'],r['sharedPct'],r['heroExposedPct'],r['partnerExposedPct'],len(r['outsideClip']),len(r['zeroInk']),c[0],c[2]]
                                k='/'.join(map(str,[width,region,args.count,layout,extra]))
                                data['cases'][k]={'actual':real,'projection':projected,'hints':baseline.get('hints'),'rolesNative':[a['native'][:2] for a in baseline['actors'][:2]],'frameDriftCssPx':round(frame_drift,4)}
                                print(k,'real',real,'projected',projected,flush=True)
                                path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(data,separators=(',',':'))+'\n')
                        finally:page.close()
                ctx.close()
        browser.close()

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('url');ap.add_argument('game',type=Path);ap.add_argument('out',type=Path)
    ap.add_argument('--regions',nargs='+',default=['forest']);ap.add_argument('--widths',nargs='+',type=int,default=[320])
    ap.add_argument('--count',type=int,default=28);ap.add_argument('--extras',nargs='+',type=int,default=[0,10,20])
    ap.add_argument('--layouts',nargs='+',default=['fixed']);ap.add_argument('--webkit',action='store_true')
    main(ap.parse_args())
