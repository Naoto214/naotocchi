"""Drive the owner entry, its native fixture, and the direct game URL."""
import argparse
import hashlib
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright


def verify(url, engine, chromium):
    record = {'engine': engine, 'errors': [], 'scenes': []}
    with sync_playwright() as p:
        launch = {'executable_path': chromium, 'args': ['--no-sandbox']} if chromium and engine == 'chromium' else {}
        browser = getattr(p, engine).launch(**launch)
        record['version'] = browser.version
        context = browser.new_context(viewport={'width': 375, 'height': 812}, device_scale_factor=2,
                                      has_touch=True, is_mobile=True, locale='ja-JP')
        page = context.new_page()
        page.set_default_timeout(90000)
        page.on('pageerror', lambda error: record['errors'].append(str(error)))
        page.goto(url + '/v5/?region=home&count=28&time=day&paused=1&ground=on&variant=C&curve=step')
        page.evaluate("""() => {localStorage.setItem('finish-sentinel','keep');
                         sessionStorage.setItem('finish-sentinel','keep');}""")

        def ready():
            page.wait_for_function("document.body.dataset.ready==='true'", polling=150)
            assert page.locator('iframe').count() == 1
            return page.locator('#home').element_handle().content_frame()

        def capture(frame, count, region, time, ground, paused):
            versions = frame.evaluate("""[...document.scripts].filter(s=>s.src.includes('-finish.js'))
                                      .map(s=>new URL(s.src).pathname.split('/').pop()+new URL(s.src).search)""")
            if 'nativeScripts' in record:
                assert versions == record['nativeScripts'], 'Native build changed during the run'
            else:
                record['nativeScripts'] = versions
            result = frame.evaluate("""() => {
              const state=HomeCastTrial.settings, art=HomeBeauty.settings, cast=HomeCastTrial.inspect();
              return {count:cast.length, region:art.region,time:art.time,ground:HomeFinishGround.enabled(),
                paused:state.paused, policy:state.policy,curve:state.curve,extra:state.extra,
                selectedLeaf:art.variant,lighting:document.documentElement.dataset.beautyVariant,
                split:art.compareSplit, viewport:[innerWidth,innerHeight], childFrames:window.frames.length,
                controls:document.querySelectorAll('.diorama-view').length,
                store:[localStorage.getItem('finish-sentinel'),sessionStorage.getItem('finish-sentinel')],
                nativeFrames:JSON.parse(document.querySelector('#castStage').dataset.livingMetrics||'{}').frames??null,
                terrain:document.querySelector('#castStage').dataset.worldRenderer,
                paintWidth:HomeBeauty.paintRect?.width,
                paintedShadows:[...document.querySelectorAll('#castStage .diorama-shadow')].filter(
                  n => n.isConnected && n.style.top && n.style.left && parseFloat(n.style.width)>0).length,
                feet:cast.map(a=>[a.key,a.x,a.y])};
            }""")
            assert (result['count'],result['region'],result['time'],result['ground'],result['paused']) == (
                count,region,time,ground,paused), result
            assert result['policy'] == 'B' and result['curve'] == 'linear' and result['controls'] == 0
            assert result['selectedLeaf'] == 'B' and result['lighting'] == 'E3plus' and not result['split']
            assert result['store'] == [None, None] and result['childFrames'] == 0
            assert result['terrain'] == 'art-25d' and result['paintWidth'] > 0 and result['paintedShadows'] == count
            feet = result.pop('feet')
            result['feetSHA256'] = hashlib.sha256(json.dumps(feet).encode()).hexdigest()
            record['scenes'].append(result)
            return feet

        frame = ready()
        assert frame.url.startswith(url + '/game/finish.html')
        initial = capture(frame,28,'home','day',True,True)
        assert record['scenes'][-1]['extra'] == 15 and record['scenes'][-1]['viewport'] == [375,760]
        page.locator('[data-ground="off"]').tap()
        frame.wait_for_function("!HomeFinishGround.enabled()")
        assert initial == capture(frame,28,'home','day',False,True)
        page.locator('#settings-toggle').tap()
        assert page.locator('#panel').get_attribute('aria-modal') == 'true'
        assert [page.locator(f'#{field} option').count() for field in ['region','time','count']] == [13,4,28]
        page.locator('#time').select_option('night')
        frame.wait_for_function("HomeBeauty.settings.time==='night'")
        assert initial == capture(frame,28,'home','night',False,True)
        page.locator('#count').select_option('19')
        frame = ready()
        capture(frame,19,'home','night',False,True)
        assert record['scenes'][-1]['extra'] == 1.5
        page.locator('#region').select_option('forest')
        frame = ready()
        capture(frame,19,'forest','night',False,True)
        page.locator('#settings-close').tap()
        page.locator('#freeze').tap()
        frame.wait_for_function("!HomeCastTrial.settings.paused")
        capture(frame,19,'forest','night',False,False)
        assert page.evaluate("""[localStorage,sessionStorage].every(store=>
            store.getItem('finish-sentinel')==='keep'&&store.getItem('naotocchi-cast-size-v1-fixture')===null)""")
        assert 'region=forest' in page.url and 'ground=off' in page.url and 'paused=0' in page.url
        page.goto(url + '/game/finish.html?count=28&policy=current&variant=A&curve=step&layout=fixed&paused=1&ground=off')
        page.wait_for_function('window.HomeCastTrial?.ready', polling=150)
        page.evaluate("HomeCastTrial.apply({policy:'C',curve:'step',hero:999,partner:999,companions:999})")
        capture(page,28,'river_lake','day',False,True)
        assert record['scenes'][-1]['extra'] == 15
        assert not record['errors'], record['errors']
        browser.close()
    return record


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('origin')
    parser.add_argument('--engine', choices=['chromium','webkit'], default='chromium')
    parser.add_argument('--chromium', default=os.environ.get('CHROMIUM_PATH'))
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    data = json.dumps(verify(args.origin.rstrip('/'),args.engine,args.chromium), ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(data + '\n')
    else:
        print(data)
