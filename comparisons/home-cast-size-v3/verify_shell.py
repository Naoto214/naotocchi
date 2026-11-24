"""Check real, mobile-sized V3 controls and frozen same-resident size changes."""
import argparse
import json
import math
import os
import time
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from playwright.sync_api import sync_playwright


def tap(page, selector):
    target = page.locator(selector)
    target.wait_for(state='visible')
    point = target.evaluate("""element=>{
      element.scrollIntoView({block:'nearest',inline:'nearest'});
      const r=element.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2;
      const actual=document.elementFromPoint(x,y);
      if (!actual || !element.contains(actual)) throw Error('Touch target obstructed: '+element.outerHTML);
      return {x,y};
    }""")
    page.touchscreen.tap(point['x'],point['y'])


def ready(page):
    started = time.monotonic()
    sampled = False
    while time.monotonic() - started < 180:
        state = page.evaluate("""()=>{
          const frame=document.querySelector('#home')?.contentWindow;
          return {ready:document.body.dataset.ready, cast:frame?.HomeCastTrial?.ready,
            world:frame?.document.querySelector('#castStage')?.dataset.worldRenderer,
            terrainWidth:frame?.HomeBeauty?.paintRect?.width};
        }""")
        if state['ready'] == 'true':
            return page.locator('#home').element_handle().content_frame()
        if not sampled and time.monotonic() - started > 45:
            print('waiting for presented home', state, flush=True)
            sampled = True
        page.wait_for_timeout(1000)
    raise TimeoutError(f'Native home did not reach ready within 180s: {state}')


def snapshot(frame):
    return frame.evaluate("HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y])")

def exercise_held(page, base):
    params = lambda url: parse_qs(urlparse(url).query)
    page.goto(base+'/v3/?region=forest&time=day&count=28&paused=1&layout=optimized&extra=20', wait_until='domcontentloaded')
    frame = ready(page)
    original = snapshot(frame)
    assert len(original) == 28
    frame.evaluate('window.holdTest=true')
    tap(page, '#settings-toggle')
    tap(page, '#hold-option')
    assert page.locator('#hold-opening').is_checked() and '+20%' in page.locator('#layout-note').inner_text()
    tap(page, '#settings-close')
    for extra in [0,5,10,15,20,0]:
        tap(page, f'[data-extra="{extra}"]')
        frame.wait_for_function('x=>HomeCastTrial.settings.extra===x',arg=extra,polling=200)
        assert frame.evaluate('window.holdTest') and snapshot(frame)==original
        assert params(page.url)['seatExtra']==['20'] and params(page.url)['extra']==[str(extra)]
    tap(page, '#freeze')
    frame.wait_for_function('!HomeCastTrial.settings.paused',polling=200)
    tap(page, '[data-extra="10"]')
    frame.wait_for_function('HomeCastTrial.settings.extra===10 && !HomeCastTrial.settings.paused',polling=200)
    assert frame.evaluate('window.holdTest')
    tap(page, '#freeze')
    tap(page, '[data-extra="0"]')
    frame.wait_for_function('HomeCastTrial.settings.extra===0 && HomeCastTrial.settings.paused',polling=200)
    link = page.url
    page.reload(wait_until='domcontentloaded')
    frame = ready(page)
    assert params(frame.url)['extra']==['20'] and frame.evaluate('HomeCastTrial.settings.extra')==0
    restored = snapshot(frame)
    assert [a[0] for a in restored] == [a[0] for a in original]
    max_delta = max(math.dist(a[1:], b[1:]) for a,b in zip(original,restored))
    tap(page, '#settings-toggle')
    assert page.locator('#hold-opening').is_checked() and '+20%' in page.locator('#layout-note').inner_text()
    tap(page, '#hold-option')
    frame = ready(page)
    assert params(frame.url)['extra']==['0'] and 'seatExtra' not in params(page.url)
    assert not page.locator('#hold-opening').is_checked()
    return {'heldOpening':20, 'testedVisualGains':[0,5,10,15,20],
            'sameFrozenFeetThroughAllGains':True, 'sameLiveFrame':True,
            'restoredQuery':urlparse(link).query, 'restoredVisibleGain':0,
            'coldReloadMaxFootDifferenceNativeUnits':round(max_delta,4), 'releasedOpening':0}

def exercise_optimized(page, base):
    page.goto(base + '/v3/?region=forest&count=28&extra=0&layout=optimized&paused=1',
              wait_until='domcontentloaded')
    frame = ready(page)
    characters = [a[0] for a in snapshot(frame)]
    records = []
    for extra in [5,10,15,20]:
        frame.evaluate('window.priorScene=true')
        tap(page, '[data-extra="'+str(extra)+'"]')
        frame = ready(page)
        assert frame.evaluate('typeof priorScene') == 'undefined'
        assert 'layout=optimized' in frame.url and frame.evaluate('HomeCastTrial.settings.extra') == extra
        assert [a[0] for a in snapshot(frame)] == characters
        records.append({'extra':extra, 'same28':True, 'reloadedFromOpening':True})
        print('optimized forest', extra, 'same 28 residents', flush=True)
    tap(page, '#settings-toggle')
    tap(page, '[name=layout][value=fixed] + span')
    frame = ready(page)
    tap(page, '#settings-close')
    tap(page, '#freeze')
    frame.wait_for_function('!HomeCastTrial.settings.paused', polling=200)
    frame.evaluate('window.liveCast=true')
    tap(page, '[data-extra="5"]')
    assert frame.evaluate('window.liveCast && HomeCastTrial.settings.extra===5 && !HomeCastTrial.settings.paused')
    return {'optimizedForest28':records, 'fixedWhileMoving':True}


def check(args):
    results = {'engine': args.engine, 'fixed': {}, 'pageErrors': []}
    with sync_playwright() as pw:
        options = {'executable_path':os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),
                   'args':['--no-sandbox']} if args.engine == 'chromium' else {}
        browser = getattr(pw, args.engine).launch(**options)
        results['version'] = browser.version
        page = browser.new_page(viewport={'width':320,'height':568}, device_scale_factor=2, is_mobile=True, has_touch=True)
        page.set_default_timeout(75000)
        page.on('pageerror', lambda exc: results['pageErrors'].append(str(exc)))
        if args.optimized or args.held:
            exercise = exercise_held if args.held else exercise_optimized
            results.update(exercise(page, args.url.rstrip('/')))
            del results['fixed']
            assert not results['pageErrors'], results['pageErrors']
            browser.close()
            args.out.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
            return
        page.goto(args.url.rstrip('/') + '/v3/?region=forest&count=28&extra=0&layout=fixed&paused=1',
                  wait_until='domcontentloaded')
        frame = ready(page)
        print(args.engine, 'real 28-resident terrain ready', flush=True)
        frame.evaluate("window.shellMarker=1")
        for width, height in [(320,568),(375,812),(390,844),(430,932)]:
            page.set_viewport_size({'width':width,'height':height})
            buttons = page.locator('.tools button').evaluate_all(
                """nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})""")
            assert len(buttons) == 7 and all(r[2] >= 44 and r[3] >= 44 for r in buttons), buttons
            assert buttons[0][0] >= 0 and buttons[-1][0] + buttons[-1][2] <= width
            assert page.locator('.bar').bounding_box()['height'] == 52
            tap(page, '#settings-toggle')
            assert page.locator('#region option').count() == 13 and page.locator('#time option').count() == 4
            assert page.locator('#counts input').count() == 5
            assert page.locator('#panel').evaluate('e=>e.clientWidth===e.scrollWidth')
            tap(page, '#measure')
            assert page.locator('#individual-sizes tr').count() == 26
            tap(page, '#settings-close')
            original = snapshot(frame)
            assert len(original) == 28
            entries = []
            for extra in [0,5,10,15,20,0]:
                tap(page, '[data-extra="'+str(extra)+'"]')
                frame.wait_for_function("x=>HomeCastTrial.settings.extra===x", arg=extra, polling=200)
                assert frame.evaluate("window.shellMarker") == 1 and snapshot(frame) == original
                sizes = frame.evaluate("[HomeCastTrial.settings.hero, HomeCastTrial.settings.partner, HomeCastTrial.settings.companions]")
                assert sizes == [p*(100+extra)/100 for p in (120,120,105)]
                entries.append(sizes)
            results['fixed'][str(width)] = {'minTargetWidth':min(r[2] for r in buttons), 'toolbarHeight':52,
                'frozenFeetEqualAllSizes':True, 'actors':28, 'rolePercentages':entries[:-1]}
            print(args.engine, width, 'fixed scale and feet OK', flush=True)
        tap(page, '#settings-toggle')
        page.locator('#time').select_option('evening')
        frame.wait_for_function("HomeBeauty.settings.time==='evening'", polling=200)
        assert frame.evaluate('window.shellMarker') == 1
        tap(page, '[name=layout][value=optimized] + span')
        frame = ready(page)
        assert 'layout=optimized' in frame.url and frame.evaluate('typeof shellMarker') == 'undefined'
        page.locator('#region').select_option('city')
        tap(page, '[name=count][value="4"] + span')
        frame = ready(page)
        assert frame.evaluate("[HomeBeauty.settings.region,HomeBeauty.settings.time,HomeCastTrial.inspect().length]") == ['city','evening',4]
        tap(page, '#settings-close')
        tap(page, '#freeze')
        frame.wait_for_function("!HomeCastTrial.settings.paused", polling=200)
        tap(page, '#freeze')
        frame.wait_for_function("HomeCastTrial.settings.paused", polling=200)
        results['changedSettings'] = ['optimized at +0','evening','city','four residents','play','pause']
        assert not results['pageErrors'], results['pageErrors']
        browser.close()
    args.out.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('url')
    p.add_argument('--engine',choices=['chromium','webkit'],required=True)
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--optimized',action='store_true',help='run the size-specific seating and live scale sequence')
    p.add_argument('--held',action='store_true',help='compare all gains without moving an optimized opening')
    check(p.parse_args())
