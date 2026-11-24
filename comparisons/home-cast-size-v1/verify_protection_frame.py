"""Exercise the public controls of the isolated comparison's real home iframe."""
import argparse
import hashlib
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

SAVES = ['naotocchi-save-v1', 'naotocchi-save-v1-backup', 'naotocchi-beauty-v7-fixture',
         'naotocchi-cast-size-v1-fixture']
FIXTURE = SAVES[-1]
DIGEST = """async c=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
    c.getContext('2d').getImageData(0,0,c.width,c.height).data)),x=>x.toString(16).padStart(2,'0')).join('')"""


def check(page, url):
    page.route('**/cast-storage-proof', lambda r: r.fulfill(content_type='text/html', body='<title>Disposable origin</title>'))
    page.goto(url+'/cast-storage-proof')
    page.evaluate("""ks=>{for(const k of ks) localStorage.setItem(k,'parent '+k);
                           sessionStorage.setItem('naotocchi-tab','parent tab');}""", SAVES)
    page.goto(url+'/?region=forest&time=day&count=28&castPreset=current&paused=1')
    frame = page.locator('#home').element_handle().content_frame()
    frame.wait_for_function("()=>window.HomeCastTrial?.inspect().length===28 && window.HomeBeauty?.paintRect")
    assert frame.evaluate("""ks=>ks.map(k=>localStorage.getItem(k)!==null)""", SAVES) == [False,False,False,True]
    assert frame.evaluate("sessionStorage.getItem('naotocchi-tab')!=='parent tab'")
    assert page.evaluate("ks=>ks.every(k=>localStorage.getItem(k)==='parent '+k)", SAVES)
    assert page.evaluate("sessionStorage.getItem('naotocchi-tab')")== 'parent tab'
    assert frame.evaluate("!HomeBeauty.settings.compareSplit && HomeBeauty.settings.variant==='B' && HomeBeauty.frozen")
    positions = """()=>HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y,a.w,a.h,a.depth])"""
    frame.evaluate("window.trialNodes=[...document.querySelectorAll('[data-diorama-actor]')]")
    ref = frame.evaluate(positions)
    assert len(ref) == 28
    selector = frame.locator('.home-art-canvas')
    canvas = selector.evaluate(DIGEST)
    for mode in ['A','B','current']:
        page.locator(f'[data-preset="{mode}"]').click()
        frame.wait_for_function("mode=>HomeCastTrial.settings.preset===mode", arg=mode)
        assert ref == frame.evaluate(positions), mode
        assert frame.evaluate("trialNodes.every((e,i)=>document.querySelectorAll('[data-diorama-actor]')[i]===e)")
        assert selector.evaluate(DIGEST) == canvas, mode
        assert frame.evaluate("HomeBeauty.settings.variant==='B'")
    # Normal bridge contract: only the parent can issue a comparison message.
    frame.evaluate("""()=>window.postMessage({type:'home-cast-settings',settings:{preset:'A'}},location.origin)""")
    frame.evaluate("""()=>new Promise(resolve=>setTimeout(resolve,50))""")
    assert frame.evaluate("HomeCastTrial.settings.preset")=='current'
    frame.evaluate("""ks=>{ks.forEach(k=>localStorage.setItem(k,'frame'));sessionStorage.setItem('naotocchi-tab','frame')}""",SAVES)
    assert page.evaluate("ks=>ks.every(k=>localStorage.getItem(k)==='parent '+k)",SAVES)
    assert page.evaluate("sessionStorage.getItem('naotocchi-tab')")=='parent tab'
    assert frame.evaluate("ks=>ks.every(k=>localStorage.getItem(k)==='frame')",SAVES)
    return dict(roles=len(ref), roleGeometrySHA256=hashlib.sha256(json.dumps(ref).encode()).hexdigest(),
                frameCanvasSHA256=canvas, sameNodesPositionsModelDimensionsAcross=['current','A','B'],
                sameSceneCanvasAcrossPresets=True, environment='B, single, frozen',
                localStorageNamespacesIsolated=len(SAVES), sessionTabIsolated=True,
                nonParentMessagesIgnored=True)


def main():
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('trial')
    cli.add_argument('--out', type=Path, required=True)
    args=cli.parse_args()
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'))
        page=browser.new_page(viewport={'width':390,'height':844})
        errors=[]
        page.on('pageerror',lambda error: errors.append(str(error)))
        result=check(page,args.trial.rstrip('/'))
        assert not errors, errors
        result.update(chromium=browser.version, screen=[390,844], pageErrors=errors)
        args.out.write_text(json.dumps(result,indent=2)+'\n')
        print(result)
        browser.close()


if __name__=='__main__':
    main()
