"""Check actual decoded, fully composited daypart backgrounds through the V4 owner controls."""
import argparse
import hashlib
import json
import os
import time
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

from verify_shell import ready, tap

# The game paints a decoded daypart image onto a private backing canvas and
# composites that canvas onto the visible 2.5D terrain. Observe both calls.
PAINT_OBSERVER = """(() => {
    const painted=new WeakMap();
    const drawImage=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(source,...args) {
        const result=Reflect.apply(drawImage,this,[source,...args]);
        if (source instanceof HTMLImageElement && source.complete && source.naturalWidth &&
            source.currentSrc.includes('/comparisons/dayparts-')) {
            painted.set(this.canvas,source);
        } else if (this.canvas.classList.contains('home-art-canvas') && this.canvas.isConnected &&
                   source instanceof HTMLCanvasElement && this.globalAlpha===1 && painted.has(source)) {
            window.qaVisibleDaypart=painted.get(source);
        }
        return result;
    };
})();"""

COLD = """() => {
    const stage=document.querySelector('#castStage');
    const shadows=[...stage.querySelectorAll('.diorama-shadow')], cast=HomeCastTrial.inspect();
    return {
        viewport:[innerWidth,innerHeight],region:HomeBeauty.settings.region,
        size:HomeCastTrial.settings.policy,curve:HomeCastTrial.settings.curve,paused:HomeCastTrial.settings.paused,
        count:cast.length, decoded:cast.filter(a=>stage.querySelector('[data-diorama-actor="'+CSS.escape(a.key)+'"] img.character-asset')?.naturalWidth>0).length,
        renderer:stage.dataset.worldRenderer,paintedShadows:shadows.filter(n=>n.isConnected && n.style.top &&
            n.style.left && parseFloat(n.style.width)>0 && n.getBoundingClientRect().width>0).length,
        recovered:Number(stage.dataset.populationFitRecoveries||0),
    };
}"""

def write(path, result):
    path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')


def cold(browser, base):
    ctx=browser.new_context(viewport={'width':360,'height':746},device_scale_factor=2,is_mobile=True,has_touch=True)
    pg=ctx.new_page()
    started=time.monotonic()
    pg.goto(base,wait_until='domcontentloaded')
    frame=ready(pg)
    frame.wait_for_function('(' + COLD + ')().paintedShadows===28',polling=125,timeout=120000)
    state=frame.evaluate(COLD)
    assert [state[k] for k in ['viewport','region','size','curve','count','paused','decoded','renderer']]==[
        [360,694],'river_lake','B','linear',28,False,28,'art-25d'],state
    state['secondsUntilReadyAndPainted']=round(time.monotonic()-started,3)
    ctx.close()
    return state


def collect(args):
    base=args.url.rstrip('/')+'/v4/'
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),
                                   args=['--no-sandbox'])
        cold_state=cold(browser,base)
        print('cold',cold_state,flush=True)
        report={'engine':'Chromium '+browser.version,'cold360':cold_state,'familyCount':19,'variant':'B',
                'curve':'linear','layout':'fixed','paused':True,'viewport':[375,812],'regions':{},'pageErrors':[]}
        write(args.out,report)
        ctx=browser.new_context(viewport={'width':375,'height':812},device_scale_factor=2,
                                is_mobile=True,has_touch=True,reduced_motion='reduce')
        ctx.add_init_script(script=PAINT_OBSERVER)
        page=ctx.new_page()
        page.on('pageerror',lambda err:report['pageErrors'].append(str(err)))
        controller={}
        def note_source(response):
            if urlsplit(response.url).path.endswith('/home-production-diorama-population.js'):
                controller[response.url]=response
        page.on('response',note_source)
        page.set_default_timeout(90000)
        page.goto(base+'?region=river_lake&time=morning&count=19&variant=B&curve=linear&layout=fixed&paused=1',
                  wait_until='domcontentloaded')
        frame=ready(page)
        regions=page.locator('#region option').evaluate_all('opts=>opts.map(o=>o.value)')
        times=page.locator('#time option').evaluate_all('opts=>opts.map(o=>o.value)')
        assert len(regions)==len(set(regions))==13 and times==['morning','day','evening','night']
        require_roster=None
        for region in regions:
            tap(page,'#settings-toggle')
            if page.locator('#region').input_value()!=region:
                page.locator('#region').select_option(region)
            tap(page,'#settings-close')
            frame=ready(page)
            frame.evaluate('window.qaShellFrame=location.href')
            expected=frame.evaluate("async r=>(await import('./home-dayparts.mjs')).DAYPARTS[r]",region)
            roster=frame.evaluate('HomeCastTrial.inspect().map(a=>a.key).sort()')
            assert len(roster)==19
            if require_roster is None:
                require_roster=roster
                report['roster']=roster
            assert roster==require_roster
            entries={}
            for daypart in times:
                tap(page,'#settings-toggle')
                page.locator('#time').select_option(daypart)
                tap(page,'#settings-close')
                frame.wait_for_function("""({src,time})=>HomeCastTrial.settings.time===time &&
                    window.qaVisibleDaypart?.currentSrc===new URL(src,location.href).href""",
                    arg={'src':expected[daypart],'time':daypart},polling=150,timeout=90000)
                snapshot=frame.evaluate("""async () => {
                    const image=qaVisibleDaypart;
                    await image.decode();
                    const s=HomeCastTrial.settings;
                    return {src:new URL(image.currentSrc).pathname.split('/game/')[1],pixels:[image.naturalWidth,image.naturalHeight],
                        region:HomeBeauty.settings.region,ready:HomeCastTrial.ready,roster:HomeCastTrial.inspect().map(a=>a.key).sort(),
                        size:s.policy,extra:s.extra,sameFrame:qaShellFrame===location.href,paused:s.paused};
                }""")
                assert snapshot['pixels']==[1024,1536] and snapshot['src']==expected[daypart],snapshot
                assert snapshot['region']==region and snapshot['size']=='B' and snapshot['extra']==1.5
                assert snapshot['roster']==require_roster and snapshot['paused'] and snapshot['ready'] and snapshot['sameFrame']
                entries[daypart]=snapshot['src']
            assert len(set(entries.values()))==4
            report['regions'][region]=entries
            report['verifiedPaints']=sum(len(row) for row in report['regions'].values())
            write(args.out,report)
            print(region,report['verifiedPaints'],flush=True)
        assert len(controller)==1 and report['verifiedPaints']==52 and not report['pageErrors']
        report['nativeControllerSHA256']=hashlib.sha256(next(iter(controller.values())).body()).hexdigest()
        assert report['nativeControllerSHA256']==args.controller_sha
        report['decodedPixels']=[1024,1536]
        report['fullCanvasOpacity']=1
        report['reducedMotionForDaypartSweep']=True
        write(args.out,report)
        browser.close()

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('url')
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--controller-sha',required=True)
    collect(parser.parse_args())
