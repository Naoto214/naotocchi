"""Exercise the private mobile shell with actual native homes and touchscreen taps."""
import argparse
import json
import math
import os
import time
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
SIZES = [(320,568), (348,700), (375,812), (390,844), (430,932)]


def tap(page, selector):
    target = page.locator(selector)
    target.scroll_into_view_if_needed()
    point = target.evaluate("""el=>{
        const r=el.getBoundingClientRect(), x=r.x+r.width/2, y=r.y+r.height/2;
        const hit=document.elementFromPoint(x,y);
        if (!el.contains(hit)) throw Error('Blocked touch target: '+el.outerHTML);
        return [x,y];
    }""")
    page.touchscreen.tap(*point)


def ready(page):
    start = time.monotonic()
    next_report = 30
    while time.monotonic()-start < 180:
        state = page.evaluate("""() => {
            const f=document.getElementById('home').contentWindow;
            return {shell:document.body.dataset.ready, native:f.HomeCastTrial?.ready, stage:f.document.querySelector('#castStage')?.dataset.worldRenderer,
                    paint:f.HomeBeauty?.paintRect?.width, actors:f.HomeCastTrial?.inspect().length};
        }""")
        if state['shell']=='true':
            return page.locator('#home').element_handle().content_frame()
        if time.monotonic()-start >= next_report:
            print('waiting for native presentation',state,flush=True)
            next_report += 30
        page.wait_for_timeout(1400)
    raise TimeoutError('180s waiting for ready: '+str(state))


def feet(frame):
    return frame.evaluate("HomeCastTrial.inspect().map(a=>[a.key,a.asset,a.x,a.y])")


def fit_viewport(page, frame, width, height):
    previous_width = frame.evaluate('innerWidth')
    if previous_width != width:
        frame.evaluate("""target => {
            const stage=document.querySelector('#castStage');
            window.shellFit = 0;
            const fitted=() => {
                if (innerWidth !== target) return;
                window.shellFit = innerWidth;
                stage.removeEventListener('home-presentation',fitted);
            };
            stage.addEventListener('home-presentation',fitted);
        }""",width)
    page.set_viewport_size({'width':width,'height':height})
    frame.wait_for_function('w=>HomeCastTrial.settings.width===w',arg=width)
    if previous_width != width:
        frame.wait_for_function('w=>window.shellFit===w',arg=width,polling=150)
    # WebKit may throttle animation callbacks in the iframe. Observe the
    # committed native envelope and feet using wall-clock polling after fit.
    frame.wait_for_function("""() => {
        const sample=JSON.stringify([innerWidth,NaotocchiHomeViewport.residentPresentation(),
            HomeBeauty.paintRect,HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y])]);
        const now=performance.now();
        if (window.shellStable?.sample!==sample) {
            window.shellStable={sample,since:now};
            return false;
        }
        return now-window.shellStable.since>=1200;
    }""",polling=200,timeout=90000)


def verify(args):
    report = {'engine':args.engine, 'devices':[], 'pageErrors':[]}
    base = args.url.rstrip('/') + '/v4/'
    os.environ.setdefault('PLAYWRIGHT_BROWSERS_PATH', '/workspace/work/qa-browsers')
    with sync_playwright() as pw:
        options = {'executable_path':os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),
                   'args':['--no-sandbox']} if args.engine == 'chromium' else {}
        browser = getattr(pw,args.engine).launch(**options)
        report['version'] = browser.version
        devices = [entry for requested in args.widths for entry in SIZES if entry[0]==requested]
        initial_width, initial_height = devices[0]
        page = browser.new_page(viewport={'width':initial_width,'height':initial_height}, device_scale_factor=2,
                                is_mobile=True, has_touch=True, locale='ja-JP')
        page.set_default_timeout(90000)
        page.on('pageerror', lambda exc: report['pageErrors'].append(str(exc)))
        if args.expression:
            page.goto(base+'?count=3&paused=1', wait_until='domcontentloaded')
            frame = ready(page)
            tap(page,'#settings-toggle')
            pose = frame.evaluate("""async () => {
                const img=document.querySelector('#petSprite img.character-asset');
                const path='assets/characters/expressions/dog/06-happy.png';
                if (NaotocchiCastBounds[path]) throw Error('Fixture needs an uncatalogued native expression');
                img.src=path;
                await img.decode();
                const r=img.getBoundingClientRect();
                // These bounds are the occupied 96 × 112 pixels of the 128 × 128 source PNG.
                return {path, expected:[r.width*96/128,r.height*112/128]};
            }""")
            tap(page,'#measure')
            text = page.locator('#measurements tr').first.locator('td').last.inner_text()
            assert frame.locator('#petSprite img.character-asset').evaluate("i=>i.currentSrc").endswith(pose['path'])
            values = [float(n) for n in text.split(' × ')]
            assert max(abs(a-b) for a,b in zip(values,pose['expected'])) < .06, (values,pose)
            assert '3/3' in page.locator('#measurement-status').inner_text()
            report.update({'pose':pose['path'],'painted':pose['expected'],'displayed':values})
            assert not report['pageErrors'],report['pageErrors']
            args.out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
            browser.close()
            print(args.engine,'uncatalogued expression measured',values,flush=True)
            return
        start = time.monotonic()
        page.goto(base,wait_until='domcontentloaded')
        frame = ready(page)
        state = frame.evaluate('HomeCastTrial.settings')
        assert [state[k] for k in ['policy','count','curve','time','paused']] == ['B',28,'linear','day',False]
        assert frame.evaluate('HomeBeauty.settings.region') == 'river_lake'
        report['coldDefault'] = {'readySeconds':round(time.monotonic()-start,2), 'count':len(feet(frame)),
                                 'region':'river_lake','variant':'B','curve':'linear','moving':True}
        print(args.engine, 'cold river ready',report['coldDefault'],flush=True)
        tap(page,'#freeze')
        frame.wait_for_function('HomeCastTrial.settings.paused')
        frame.evaluate('window.shellFrameMarker=1')
        frame.evaluate('''() => {
            const stage=document.querySelector('#castStage');
            const snapshot=() => ({
                at:performance.now(),width:innerWidth,policy:HomeCastTrial.settings.policy,
                camera:NaotocchiHomeViewport.residentPresentation(),
                revision:JSON.parse(stage.dataset.livingMetrics||'{}').world?.projectionRevision,
                feet:HomeCastTrial.inspect().map(a=>[a.key,a.asset,a.x,a.y]),
            });
            window.shellTrail=[];
            const trace = event => { shellTrail.push([event,snapshot()]); if(shellTrail.length>24)shellTrail.shift(); };
            stage.addEventListener('home-presentation',()=>trace('fit'));
            const parentDocument=parent.document;
            parentDocument.addEventListener('click',e=>{if(e.target.closest('[data-variant]'))trace('before-click');},true);
            parentDocument.addEventListener('click',e=>{if(e.target.closest('[data-variant]'))trace('after-click');});
        }''')
        for width,height in devices:
            resized = frame.evaluate('innerWidth') != width
            fit_viewport(page, frame, width, height)
            tap(page,'[data-variant="current"]')
            candidates = {}
            native_refits = []
            for variant,cap in [('current',0),('A',10),('B',15),('C',20),('current',0)]:
                original = frame.evaluate('() => { shellTrail.length=0; return HomeCastTrial.inspect().map(a=>[a.key,a.asset,a.x,a.y]); }')
                tap(page,'[data-variant="'+variant+'"]')
                frame.wait_for_function('p=>HomeCastTrial.settings.policy===p',arg=variant)
                after = feet(frame)
                trace = frame.evaluate('shellTrail')
                clicks = [sample for event,sample in trace if event in ('before-click','after-click')]
                assert len(clicks)==2 and len(original)==28 and len(clicks[0]['feet'])==28
                assert clicks[0]['feet']==clicks[1]['feet'], (width,variant,'native feet moved in the size handler')
                if after != original:
                    # A phone resize refits native navigation in several delayed
                    # passes. This can also move residents with zero candidate taps.
                    fits = [sample for event,sample in trace if event=='fit']
                    changes = [a[0] for a,b in zip(original,after) if a!=b]
                    assert resized and fits, (width,variant,'feet changed outside a viewport fit',changes)
                    native_refits.append({'candidate':variant,'fits':len(fits),'changedResidents':changes})
                state = frame.evaluate('HomeCastTrial.settings')
                t = max(0,min(1,(width-320)/55))
                assert math.isclose(state['extra'],cap*t*t*(3-2*t),abs_tol=1e-8)
                assert frame.evaluate('shellFrameMarker===1 && HomeBeauty.settings.variant==="B"')
                candidates[variant] = round(state['extra'],4)
            sizes = page.locator('.tools button').evaluate_all("""nodes=>nodes.map(n=>{
                const r=n.getBoundingClientRect(); return [r.x,r.y,r.width,r.height];})""")
            assert len(sizes) == 6 and all(b[2]>=44 and b[3]>=44 for b in sizes), sizes
            assert sizes[0][0]>=0 and sizes[-1][0]+sizes[-1][2]<=width
            tap(page,'#settings-toggle')
            assert page.locator('#region option').count()==13 and page.locator('#time option').count()==4
            assert page.locator('#count option').count()==28 and page.locator('#more').is_disabled()
            assert page.locator('#panel').evaluate('e=>e.clientWidth===e.scrollWidth && e.getAttribute("aria-modal")==="true"')
            assert page.locator('#settings-close').evaluate('el=>document.activeElement===el')
            page.keyboard.press('Shift+Tab')
            assert page.locator('.archive').evaluate('el=>document.activeElement===el')
            page.keyboard.press('Tab')
            assert page.locator('#settings-close').evaluate('el=>document.activeElement===el')
            tap(page,'#measure')
            assert page.locator('#individual-sizes tr').count()==26
            assert '26体' in page.locator('#companion-range').inner_text()
            measured = page.locator('#measurement-status').inner_text()
            assert '28/28' in measured, (measured, page.locator('#measurements').inner_text(),
                 frame.evaluate("""HomeCastTrial.inspect().filter(a=>a.kind!=='companion').map(a=>{
                   const i=document.querySelector('[data-diorama-actor="'+CSS.escape(a.key)+'"] img.character-asset');
                   return [a.key,a.asset,i?.currentSrc,i?.naturalWidth,i?.dataset.fallbackAsset];})"""))
            report['devices'].append({'width':width, 'height':height,
              'toolbarMinWidth':round(min(b[2] for b in sizes),2), 'toolbarMinHeight':min(b[3] for b in sizes),
              'candidateGains':candidates,'fixedFeet':28,'nativeRefitsBetweenSamples':native_refits,'individualCompanions':26,
              'companionRange':page.locator('#companion-range').inner_text()})
            page.keyboard.press('Escape')
            assert page.locator('#settings-toggle').evaluate('el=>el===document.activeElement')
            args.out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
            print(args.engine, width, 'fixed, touch, focus and body measurements OK',flush=True)
        if args.widths_only:
            assert not report['pageErrors'],report['pageErrors']
            browser.close()
            return
        tap(page,'[data-variant="B"]')
        tap(page,'#settings-toggle')
        page.locator('#time').select_option('night')
        frame.wait_for_function("HomeBeauty.settings.time==='night' && shellFrameMarker===1")
        page.locator('#count').select_option('19')
        frame = ready(page)
        assert len(feet(frame)) == 19
        assert math.isclose(frame.evaluate('HomeCastTrial.settings.extra'),1.5)
        tap(page,'[name=curve][value=step]+span')
        frame.wait_for_function("HomeCastTrial.settings.curve==='step'")
        assert frame.evaluate('HomeCastTrial.settings.extra')==15
        assert '19体' in page.locator('#gain-readout').inner_text()
        tap(page,'#fewer')
        frame = ready(page)
        assert len(feet(frame)) == 18 and frame.evaluate('HomeCastTrial.settings.extra')==0
        tap(page,'#more')
        frame = ready(page)
        assert len(feet(frame)) == 19 and frame.evaluate('HomeCastTrial.settings.extra')==15
        page.locator('#count').select_option('1')
        frame = ready(page)
        assert len(feet(frame)) == 1 and page.locator('#fewer').is_disabled()
        assert not page.locator('#companion-detail').is_visible()
        for region in ['forest','home','river_lake']:
            tap(page,'[data-trial="'+region+'"]')
            frame = ready(page)
            assert frame.evaluate('[HomeBeauty.settings.region,HomeBeauty.settings.time,HomeCastTrial.inspect().length]')==[region,'night',28]
            assert not page.locator('#panel').is_visible()
            tap(page,'#settings-toggle')
        page.locator('#count').select_option('23')
        frame = ready(page)
        assert len(feet(frame)) == 23
        roster = [actor[:2] for actor in feet(frame)]
        tap(page,'[name=layout][value=optimized]+span')
        frame = ready(page)
        assert 'layout=optimized' in frame.url
        tap(page,'#settings-close')
        frame.evaluate('window.oldOpening=true')
        tap(page,'[data-variant="C"]')
        frame = ready(page)
        assert [actor[:2] for actor in feet(frame)]==roster
        assert frame.evaluate('typeof oldOpening')=='undefined'
        assert frame.evaluate('HomeCastTrial.settings.extra')==20
        saved = page.url
        assert parse_qs(urlparse(saved).query)=={
            'region':['river_lake'],'time':['night'],'count':['23'],'paused':['1'],
            'variant':['C'],'curve':['step'],'layout':['optimized']}
        page.reload(wait_until='domcontentloaded')
        frame = ready(page)
        assert [actor[:2] for actor in feet(frame)]==roster
        assert frame.evaluate('[HomeBeauty.settings.time,HomeCastTrial.settings.policy,HomeCastTrial.settings.paused]')==['night','C',True]
        tap(page,'#freeze')
        frame.wait_for_function('!HomeCastTrial.settings.paused')
        assert not report['pageErrors'], report['pageErrors']
        report.update({'testedNativeCounts':[1,18,19,23,28], 'touchTrials':['forest','home','river_lake'],
                       'focusedModal':True,'sameOptimizedRoster':True,'coldLink':urlparse(saved).query,
                       'pauseAndResume':True})
        browser.close()
    args.out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('url')
    parser.add_argument('--engine',choices=['chromium','webkit'],required=True)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--widths',nargs='+',type=int,choices=[v[0] for v in SIZES],default=[v[0] for v in SIZES])
    parser.add_argument('--widths-only',action='store_true',help='exercise the toolbar, settings and measurements at these widths')
    parser.add_argument('--expression',action='store_true',help='measure a native expression PNG absent from the cast catalog')
    verify(parser.parse_args())
