"""Compare identical hinted openings when the visual gain is applied at boot or after readiness."""
import argparse
import json
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen
from playwright.sync_api import sync_playwright
from verify_interact_routes import ROOT,HEIGHT,once,HIT_ANCHOR,HIT_EXPOSE,instrument

SNAP="""()=>{const p=NaotocchiHomeViewport.residentPresentation();
 return {scale:[p.scaleX,p.scaleY,p.bodyScale],stage:document.querySelector('#castStage').getBoundingClientRect().toJSON(),
  cast:HomeCastTrial.inspect().map(a=>({key:a.key,position:[a.x,a.y],body:[a.w,a.h],foot:a.foot,depth:a.depth})),
  passes:qaSyncCaptures.map(s=>({size:[s.scene.width,s.scene.height],hints:s.points,
         base:s.list.map(a=>[a.key,a.x,a.y,a.w,a.h])})),
  taps:qaTapHits(),history:window.qaAllSyncs,
  images:{complete:[...document.querySelectorAll('img.character-asset')].filter(i=>i.complete&&i.naturalWidth).length}};
}"""

def main(args):
    url=args.url.rstrip('/')+'/game/'
    native=urlopen(url+'home-production-diorama-limit.js').read().decode()
    diag=once(native,HIT_ANCHOR,HIT_EXPOSE+HIT_ANCHOR)
    src=urlopen(url+'home-production-model.js').read().decode()
    if args.plan_probe:src=instrument(src)
    read='scene.navigation.initialPoint(index,list.length)'
    src=once(src,read,"(p=>{(window.qaSeatReads||=[]).push([index,list.length,p?.x,p?.y]);return p;})("+read+")")
    capture=(ROOT/'geometry_capture.js').read_text()
    invoke='const result = sync(list,nativeScene);'
    before="""const coords=()=>model.snapshot().map(a=>[a.key,a.x,a.y,a.w,a.h]);
    window.qaAllSyncs??=[];window.qaNavIds??=new WeakMap();
    const observedNav=scene.navigation;
    if(observedNav&&!qaNavIds.has(observedNav))qaNavIds.set(observedNav,window.qaAllSyncs.length+1);
    const row={count:list.length,nav:observedNav?qaNavIds.get(observedNav):null,size:[scene.width,scene.height],before:coords(),
      inputs:list.map(a=>[a.key,a.x,a.y,a.w,a.h]),loadedImages:[...document.querySelectorAll('img.character-asset')].filter(i=>i.complete&&i.naturalWidth).length,
      ready:window.HomeCastTrial?.ready||false,scale:window.NaotocchiHomeViewport?.residentPresentation?.()?.bodyScale};
    window.qaSeatReads=[];
    """
    capture=once(capture,invoke,before+invoke+"row.reads=window.qaSeatReads;row.after=coords();window.qaAllSyncs.push(row);")
    results=json.loads(args.out.read_text()) if args.out.is_file() else {'cases':{}}
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        results['browser']=browser.version
        results['sharedContext']=args.shared_context
        results['planProbe']=args.plan_probe
        def new_context():
            context=browser.new_context(viewport={'width':args.width,'height':HEIGHT[args.width]-52},has_touch=True,is_mobile=True,device_scale_factor=2)
            context.route('**/home-production-diorama-limit.js*',lambda r:r.fulfill(content_type='application/javascript',body=diag))
            context.route('**/home-production-model.js*',lambda r:r.fulfill(content_type='application/javascript',body=src))
            context.add_init_script(script=capture)
            return context
        shared=new_context() if args.shared_context else None
        for scenario in args.scenarios:
            if scenario in results['cases']:continue
            layout,boot,rep=scenario.split('-')
            ctx=shared or new_context()
            try:
                page=ctx.new_page();page.clock.set_fixed_time(datetime(2026,10,15,3,tzinfo=timezone.utc))
                params=dict(region=args.region,count=args.count,extra=int(boot),layout=layout,
                            clock=0,time='day',paused=1,variant='B',compareSplit=0)
                page.goto(url+'limit.html?'+urlencode(params),wait_until='domcontentloaded',timeout=120000)
                page.wait_for_function('window.HomeCastTrial?.ready && window.qaNative && window.qaLastScene',polling=100,timeout=180000)
                page.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()))")
                page.evaluate((ROOT/'verify_interact_hits.js').read_text())
                page.evaluate('extra=>HomeCastTrial.apply({extra})',args.gain)
                final=page.evaluate(SNAP)
                results['cases'][scenario]=final
                results.update(region=args.region,width=args.width,count=args.count,gain=args.gain)
                args.out.write_text(json.dumps(results,ensure_ascii=False,separators=(',',':'))+'\n')
                print(scenario,[row['position'] for row in final['cast'][:2]],final['taps']['roles'],len(final['passes']),flush=True)
            finally:
                if shared:page.close()
                else:ctx.close()
        if shared:shared.close()
        browser.close()

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('url');p.add_argument('--out',type=Path,required=True)
    p.add_argument('--width',type=int,default=320);p.add_argument('--region',default='city');p.add_argument('--count',type=int,default=28);p.add_argument('--gain',type=int,default=10)
    p.add_argument('--scenarios',nargs='+',default=['fixed-10-1','fixed-0-1','optimized-10-1','fixed-10-2','fixed-0-2'])
    p.add_argument('--shared-context',action='store_true')
    p.add_argument('--plan-probe',action='store_true')
    main(p.parse_args())
