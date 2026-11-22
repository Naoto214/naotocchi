"""Operate the actual owner comparison using touch and record the three native versions at original and historical positions."""
import argparse
import getpass
import hashlib
import json
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

from playwright.sync_api import sync_playwright

def owner_access(context, origin):
    key = getpass.getpass("Owner verification credential: ")
    class SameOrigin(HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, url):
            if urlsplit(urljoin(req.full_url, url))[:2] != urlsplit(origin)[:2]:
                return None
            return super().redirect_request(req, fp, code, msg, headers, url)
    opener = build_opener(SameOrigin())
    cache = {}
    def deliver(route):
        url = route.request.url
        if urlsplit(url)[:2] != urlsplit(origin)[:2]:
            return route.abort()
        if url not in cache:
            try:
                request = Request(url, headers={'OAI-Sites-Authorization':'Bearer ' + key, 'User-Agent':'Mozilla/5.0'})
                with opener.open(request, timeout=60) as reply:
                    headers = {k:v for k,v in reply.headers.items() if k.lower() in ('content-type','content-security-policy')}
                    cache[url] = (reply.status, headers, reply.read())
            except Exception:
                return route.abort()
        status, headers, body = cache[url]
        return route.fulfill(status=status, headers=headers, body=body)
    context.route('**/*', deliver)

def test(options):
    with sync_playwright() as browsers:
        browser = getattr(browsers, options.engine).launch(executable_path=options.executable)
        context = browser.new_context(viewport={'width':options.width, 'height':792}, device_scale_factor=2,
                                      is_mobile=True, has_touch=True, locale='ja-JP')
        if options.owner:
            owner_access(context, options.origin)
        try:
            page = context.new_page()
            page.set_default_timeout(90_000)
            errors = []
            page.on('pageerror', lambda error: errors.append(type(error).__name__))
            def room(arm):
                page.wait_for_function("""arm=>document.body.dataset.ready==='true' &&
                  document.querySelector('#home').contentWindow.location.pathname.endsWith('-compare-'+arm+'.html')""",arg=arm)
                return page.locator('#home').element_handle().content_frame()
            def opening(arm):
                frame = room(arm)
                return frame.evaluate("""() => ({feet:HomeDragTrial.opening().actors.map(x=>x.slice(0,4)),
                    ground:HomeFinishGround.enabled(),size:HomeCastTrial.settings.policy,
                    shadows:document.querySelectorAll('.diorama-shadow').length,
                    background:document.querySelector('.home-art-canvas').dataset.mobilityPainting.split('/').pop()})""")
            page.goto(options.origin + '/v12/?arm=v10&seed=937&paused=1',wait_until='domcontentloaded')
            old = opening('v10')
            assert len(old['feet']) == old['shadows'] == 28
            assert old['size'] == 'B' and old['ground']
            toolbar = page.locator('.bar button').evaluate_all('els=>els.map(e=>{let r=e.getBoundingClientRect();return [r.left,r.right,r.width,r.height]})')
            assert len(toolbar)==6 and all(left>=0 and right<=options.width+.2 and w>=43.9 and h>=43.9 for left,right,w,h in toolbar)
            for button,arm in [('v11','v11-foot'),('v12','v12')]:
                page.locator('[data-arm='+button+']').tap()
                assert opening(arm) == old
            page.locator('#settings-toggle').tap()
            page.locator('#seats').select_option('reference')
            adjusted = opening('v12-reference')
            page.locator('#settings-close').tap()
            for button,arm in [('v10','v10-reference'),('v11','v11-foot-reference'),('v12','v12-reference')]:
                page.locator('[data-arm='+button+']').tap()
                assert opening(arm) == adjusted
            frame = room('v12-reference')
            page.locator('#settings-toggle').tap()
            page.locator('#diagnostics summary').tap()
            page.locator('#start-record').tap()
            page.wait_for_function("document.querySelector('#resident').options.length===28")
            for key in ['pet:dog','companion:tanuki','companion:panda','companion:box']:
                page.locator('#resident').select_option(key)
                assert '足位置を補正した回数' in page.locator('#foot-events').inner_text()
                assert '曲がる道譲りの探索' in page.locator('#help-events').inner_text()
            page.locator('#settings-close').tap()
            page.locator('#freeze').tap()
            frame.wait_for_function("HomeMobilityDiagnostics.read().residents.some(r=>r.actualDistance>0)",polling=300)
            progress = frame.evaluate("""() => {let d=HomeMobilityDiagnostics.read();return {
                arm:d.arm, tracked:d.residents.length, elapsed:d.modelSeconds,
                moved:d.residents.filter(r=>r.actualDistance>0).length,
                syncRecorder:typeof HomeFootDiagnostics.read==='function'}}""")
            assert progress['arm']=='v12-reference' and progress['tracked']==28 and progress['moved']>0
            page.locator('#settings-toggle').tap()
            page.locator('#region').select_option('home')
            assert room('v12').evaluate("HomeDragTrial.opening().region==='home'")
            assert page.locator('#seats').is_disabled()
            assert not errors
            digest=lambda value:hashlib.sha256(json.dumps(value,sort_keys=True).encode()).hexdigest()
            return dict(width=options.width,engine=options.engine,version=browser.version,
                        fixedOpening=digest(old),historicalOpening=digest(adjusted),
                        sameOpeningAllThree=True,toolbarFits=True,footReadoutResidents=4,progress=progress,errors=errors)
        finally:
            context.close()
            browser.close()

if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--origin',required=True)
    parser.add_argument('--owner',action='store_true')
    parser.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
    parser.add_argument('--executable',default='/usr/bin/chromium')
    parser.add_argument('--width',type=int,default=390)
    parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    result=test(args)
    args.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(args.engine,args.width,'resident records',result['progress']['tracked'])
