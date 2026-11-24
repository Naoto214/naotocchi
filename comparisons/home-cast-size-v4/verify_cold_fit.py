"""Cold-boot a previously oscillating river and a neighboring reference viewport."""
import argparse
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
SNAPSHOT = """() => {
 const stage = document.querySelector('#castStage'), scene=window.qaLastScene;
 const cast=HomeCastTrial.inspect(), ids=cast.map(a=>a.key);
 const seed=JSON.parse(localStorage.getItem('naotocchi-cast-size-v1-fixture'));
 const expected=['pet:'+seed.speciesLine,...(seed.partner?['partner:'+seed.partner.id]:[]),...seed.companions.map(c=>'companion:'+c.id)];
 const metrics=JSON.parse(stage.dataset.livingMetrics||'{}');
 return {ready:HomeCastTrial.ready,region:metrics.world?.region,loaded:metrics.world?.loaded,
   nativeNavigation:!!scene?.navigation,terrain:stage.dataset.worldRenderer,
   size:[HomeBeauty.paintRect?.width,HomeBeauty.paintRect?.height],frames:metrics.frames,
   viewport:[innerWidth,innerHeight],count:cast.length,settings:HomeCastTrial.settings,
   rosterMatches:JSON.stringify(ids.slice().sort())===JSON.stringify(expected.sort()),
   recovered:Number(stage.dataset.populationFitRecoveries||0), ground:cast.filter(a=>scene.navigation.valid(a)).length,
   shadowCount:stage.querySelectorAll('.diorama-shadow').length,
   paintedShadows:[...stage.querySelectorAll('.diorama-shadow')].filter(n=>n.isConnected&&
     n.style.top&&n.style.left&&parseFloat(n.style.width)>0).length,
   decoded:cast.filter(a=>stage.querySelector('[data-diorama-actor="'+CSS.escape(a.key)+'"] img.character-asset')?.naturalWidth>0).length,
   cast:cast.map(a=>[a.key,a.asset]),
   feet:cast.map(a=>[a.x,a.y]), envelope:stage.__homeResidentEnvelope.right,
   fitEvents:qaColdFits};
}"""
EVENTS = """(() => {window.qaColdFits=[];
 document.addEventListener('home-paint-envelope',()=>{
   const e=document.querySelector('#castStage').__homeResidentEnvelope;
   const p=window.NaotocchiHomeViewport?.residentPresentation?.();
   if (e && qaColdFits.length<32) qaColdFits.push([e.left,e.right,p?.scaleX,p?.scaleY]);
 },true);})();"""


def capture(browser, origin, width, height, policy, paused, override, region, count):
    context = browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2,
                                  is_mobile=True,has_touch=True)
    try:
        context.add_init_script(path=HERE.parent/'home-cast-size-v3/geometry_capture.js')
        context.add_init_script(script=EVENTS)
        if override:
            context.route('**/home-production-diorama-population.js*', lambda r:r.fulfill(
                body=override.read_bytes(),content_type='application/javascript'))
        page=context.new_page()
        errors=[]
        page.on('pageerror', lambda e:errors.append(str(e)))
        page.clock.set_fixed_time(datetime(2026,10,15,3,tzinfo=timezone.utc))
        params={'region':region,'time':'day','count':count,'layout':'fixed','policy':policy,
                'variant':'B','compareSplit':0,'curve':'linear','paused':int(paused)}
        if paused: params['clock']=0
        page.goto(origin+'/game/population.html?'+urlencode(params),wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function("""window.HomeCastTrial?.ready && window.qaLastScene?.navigation &&
            JSON.parse(document.querySelector('#castStage').dataset.livingMetrics||'{}').world?.loaded""",
            timeout=90000,polling=120)
        a=page.evaluate(SNAPSHOT)
        page.wait_for_function("f=>JSON.parse(document.querySelector('#castStage').dataset.livingMetrics||'{}').frames>f",
                               arg=a['frames'],timeout=30000,polling=150)
        b=page.evaluate(SNAPSHOT)
        for s in (a,b):
            assert s['ready'] and s['loaded'] and s['nativeNavigation'] and s['terrain']=='art-25d'
            assert s['region']==region and s['viewport']==[width,height] and min(s['size'])>0
            assert s['count']==s['decoded']==s['shadowCount']==s['paintedShadows']==count
            assert s['ground']==count and s['rosterMatches'], s
        assert a['cast']==b['cast'] and a['settings']['paused']==paused and not errors
        if paused: assert a['feet']==b['feet']
        snapshot=b
        snapshot['rosterSha256']=hashlib.sha256(json.dumps(snapshot.pop('cast')).encode()).hexdigest()
        snapshot['feetSha256']=hashlib.sha256(json.dumps(snapshot.pop('feet')).encode()).hexdigest()
        snapshot['postReadyNativeFrames']=b['frames']-a['frames']
        snapshot['pageErrors']=errors
        if (width,height,region,count)==(375,760,'river_lake',28):
            assert b['recovered']==0, 'Unexpected fit recovery at the ordinary viewport'
            page.evaluate("window.qaBeforeResizeNavigation=qaLastScene.navigation")
            page.set_viewport_size({'width':360,'height':694})
            page.wait_for_function('HomeCastTrial.settings.width===360 && qaLastScene.navigation!==qaBeforeResizeNavigation',timeout=90000)
            f=page.evaluate("JSON.parse(document.querySelector('#castStage').dataset.livingMetrics).frames")
            page.wait_for_function("n=>JSON.parse(document.querySelector('#castStage').dataset.livingMetrics).frames>=n+30",arg=f,timeout=60000)
            resized=page.evaluate(SNAPSHOT)
            assert resized['ground']==resized['decoded']==resized['paintedShadows']==count and resized['rosterMatches']
            snapshot['liveResize']={k:resized[k] for k in ('viewport','ground','paintedShadows','frames','recovered','ready','fitEvents')}
        # A browser can settle natively without entering the two-cycle. The
        # observed activation count is evidence; actual paint and progress are the gates.
        return snapshot
    finally:
        context.close()


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('url')
    p.add_argument('--controller',type=Path,help='Load a candidate sibling before installing it')
    p.add_argument('--out',required=True,type=Path)
    args=p.parse_args()
    cases={}
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),
                             args=['--disable-dev-shm-usage','--disable-renderer-backgrounding'])
        for region,count,w,h,policy,paused in [('river_lake',28,360,694,'current',True),
                ('river_lake',28,360,694,'B',False),('city',26,375,760,'current',True),
                ('memory_lake',28,360,694,'current',True),
                ('river_lake',28,375,760,'B',True)]:
            key=f'{region}/{count}/{w}x{h}/{policy}/'+('frozen' if paused else 'moving')
            cases[key]=capture(b,args.url.rstrip('/'),w,h,policy,paused,args.controller,region,count)
            args.out.write_text(json.dumps({'browser':b.version,'cases':cases},separators=(',',':'))+'\n')
            print('passed',key,cases[key]['paintedShadows'],cases[key]['postReadyNativeFrames'],flush=True)
        b.close()
