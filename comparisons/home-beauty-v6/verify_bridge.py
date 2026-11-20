"""Exercise live settings against a real 28-resident home in the disposable preview iframe."""
import argparse
import json
import os
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright


POSE = """()=>[...document.querySelectorAll('#castStage [data-diorama-actor]')].map(n=>[
  n.dataset.dioramaActor,n.style.translate,n.style.scale,n.style.zIndex,n.style.width,n.style.height,
  [...n.querySelectorAll('img')].map(im=>im.getAttribute('src'))
])"""
READY = """()=>!!window.HomeBeauty?.paintRect &&
  document.querySelector('#castStage')?.dataset.dioramaReduced==='true' &&
  document.querySelectorAll('#castStage [data-diorama-actor]').length===28"""
DEFAULTS = dict(count=1, size=1, speed=1, wind=1)


def settings(page, values):
    page.evaluate("""s=>document.querySelector('iframe').contentWindow.postMessage(
       {type:'home-beauty-settings',settings:s},location.origin)""", values)


def open_home(page, url, variant):
    page.route('**/bridge-probe', lambda route: route.fulfill(
        content_type='text/html', body='<title>Fixture host</title><iframe style="border:0;width:390px;height:844px"></iframe>'))
    page.goto(url.rstrip('/')+'/bridge-probe')
    page.evaluate("""()=>localStorage.setItem('naotocchi-save-v1','owner-sentinel')""")
    params = dict(region='forest',time='day',season='autumn',weather='sunny',variant=variant,
                  count=28,clock=39,split=.5,compareSplit=0)
    page.eval_on_selector('iframe',"(f,q)=>f.src='./game/index.html?'+q",urlencode(params))
    game = page.frame_locator('iframe')
    game.locator('.home-art-canvas').wait_for(state='attached',timeout=90000)
    frame = page.locator('iframe').element_handle().content_frame()
    frame.wait_for_function(READY,timeout=90000)
    return frame


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('v5')
    parser.add_argument('v6')
    args = parser.parse_args()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        def new_host():
            return browser.new_page(viewport=dict(width=410,height=880),reduced_motion='reduce')
        previous_page = new_host()
        reference = open_home(previous_page,args.v5,'E3').evaluate(POSE)
        previous_page.close()
        page = new_host()
        errors=[]
        page.on('pageerror', lambda err: errors.append(str(err)))
        frame = open_home(page,args.v6,'E3')
        assert frame.evaluate(POSE)==reference, 'initial geometry or images differ from #567'
        frame.evaluate("""()=>window.initialResidents=[...document.querySelectorAll('#castStage [data-diorama-actor]')]""")
        assert frame.evaluate('HomeBeauty.settings.fall') == DEFAULTS
        trials=[('E3plus',True,dict(count=3,size=4,speed=9,wind=3),dict(count=1.5,size=2,speed=2,wind=2)),
                ('E3',False,dict(count=-2,size=.001,speed=-1,wind=-1),dict(count=0,size=.5,speed=.25,wind=0)),
                ('E3plus',False,DEFAULTS,DEFAULTS)]
        for variant,split,requested,expected in trials:
            settings(page,dict(variant=variant,compareSplit=split,split=.83,fall=requested))
            frame.wait_for_function('v=>HomeBeauty.settings.variant===v',arg=variant)
            frame.wait_for_timeout(200)
            assert frame.evaluate('HomeBeauty.settings.fall')==expected
            assert frame.evaluate('HomeBeauty.settings.compareSplit')==split
            assert frame.evaluate('HomeBeauty.clockSeconds')==39
            assert frame.evaluate('()=>initialResidents.every(node=>node.isConnected) && document.querySelectorAll(".home-art-canvas").length===1')
            assert frame.evaluate(POSE)==reference
        assert frame.evaluate("""()=>localStorage.getItem('naotocchi-save-v1')===null &&
              !!localStorage.getItem('naotocchi-beauty-v6-fixture')""")
        frame.evaluate("localStorage.setItem('naotocchi-save-v1','frame-sentinel')")
        assert page.evaluate("localStorage.getItem('naotocchi-save-v1')")=='owner-sentinel'
        page.emulate_media(reduced_motion='no-preference')
        page.evaluate("""()=>document.querySelector('iframe').contentWindow.postMessage(
           {type:'home-beauty-clock',seconds:17,paused:false},location.origin)""")
        frame.wait_for_function('HomeBeauty.clockSeconds>17.1')
        assert not errors,errors
        print(json.dumps(dict(residents=len(reference),exactReferenceGeometryAndImages=True,
             sameNodesOnAllThreeSwitches=True,oneCanvas=True,fallBounds=True,frozenClock=39,
             resumeFrom=17,reducedMotion=True,isolatedStorage=True,errors=errors)))
        browser.close()


if __name__=='__main__':
    main()
