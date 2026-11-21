"""Exercise version, start layout, random seed and diagnostics through the real private shell."""
import argparse
import getpass
import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit, urljoin
from urllib.request import Request, build_opener, HTTPRedirectHandler
from playwright.sync_api import sync_playwright

SNAPSHOT = """async () => {
  const canvas=document.querySelector('.home-art-canvas');
  const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
  const paint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',pixels)),x=>x.toString(16).padStart(2,'0')).join('');
  return {opening:HomeDragTrial.opening(), paint, size:HomeCastTrial.settings.policy,
    shadows:document.querySelectorAll('.diorama-shadow').length, ground:HomeFinishGround.enabled()};
}"""

def check(args, token):
    with sync_playwright() as pw:
        browser = getattr(pw,args.engine).launch(executable_path=args.executable or ('/usr/bin/chromium' if args.engine=='chromium' else None))
        ctx=browser.new_context(viewport={'width':args.width,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True,locale='ja-JP')
        if token:
            expected=urlsplit(args.origin)
            class SameOrigin(HTTPRedirectHandler):
                def redirect_request(self, req, fp, code, msg, headers, url):
                    dest=urljoin(req.full_url,url)
                    if urlsplit(dest)[:2]!=expected[:2]:return None
                    return super().redirect_request(req,fp,code,msg,headers,dest)
            api=build_opener(SameOrigin())
            cache={}
            def authorize(route):
                url=route.request.url
                if urlsplit(url)[:2]!=expected[:2]:return route.continue_()
                if url not in cache:
                    request=Request(url, headers={'User-Agent':'Mozilla/5.0','OAI-Sites-Authorization':'Bearer '+token})
                    try:
                        with api.open(request,timeout=60) as result:
                            cache[url]=(result.status,result.headers.get('content-type','application/octet-stream'),result.read())
                    except Exception:
                        return route.abort()
                status,kind,body=cache[url]
                return route.fulfill(status=status,content_type=kind,body=body)
            ctx.route(args.origin+'/**',authorize)
        page=ctx.new_page()
        page.set_default_timeout(120000)
        errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        def ready(arm):
            page.wait_for_function("""arm=>document.body.dataset.ready==='true' && document.querySelector('#home').contentWindow.location.pathname.endsWith('mobility-v10-compare-'+arm+'.html')""",arg=arm,polling=250)
            return page.locator('#home').element_handle().content_frame()
        try:
            page.goto(args.origin+'/v10/?arm=v8&paused=1',wait_until='commit')
            snapshots=[ready('v8').evaluate(SNAPSHOT)]
            toolbar=page.locator('.bar button').evaluate_all('els=>els.map(b=>{const r=b.getBoundingClientRect();return [b.id||b.dataset.arm,r.left,r.right,r.width,r.height]})')
            assert len(toolbar)==6 and all(l>=0 and r<=args.width+.2 and w>=43.9 and h>=43.9 for _,l,r,w,h in toolbar),toolbar
            for arm in ['v9','v10']:
                page.locator(f'[data-arm={arm}]').tap()
                snapshots.append(ready(arm).evaluate(SNAPSHOT))
            page.locator('#restart').tap()
            snapshots.append(ready('v10').evaluate(SNAPSHOT))
            assert all(s==snapshots[0] for s in snapshots) and snapshots[0]['shadows']==28 and snapshots[0]['ground'] and snapshots[0]['size']=='B'
            page.locator('#settings-toggle').tap()
            page.locator('#seats').select_option('reference')
            a=ready('v10-reference').evaluate(SNAPSHOT)
            page.locator('#settings-close').tap()
            page.locator('[data-arm=v9]').tap()
            b=ready('v9-seats').evaluate(SNAPSHOT)
            assert a==b
            page.locator('[data-arm=v10]').tap()
            ready('v10-reference')
            page.locator('#settings-toggle').tap()
            page.locator('#seed').select_option('937')
            room=ready('v10-reference')
            assert 'trialSeed=937' in room.url
            page.locator('#diagnostics summary').tap()
            page.locator('#start-record').tap()
            page.wait_for_function("document.getElementById('resident').options.length===28")
            page.locator('#resident').select_option(index=27)
            assert '本人が経路を求め続けた最長不成立時間' in page.locator('#metrics').inner_text()
            assert '歩行枠待ちで終わった回数' in page.locator('#metrics').inner_text()
            page.locator('#settings-close').tap()
            page.locator('#freeze').tap()
            room.wait_for_function("HomeMobilityDiagnostics.read().residents.some(r=>r.actualDistance>0)",polling=500)
            record=room.evaluate("""() => {const d=HomeMobilityDiagnostics.read();return {arm:d.arm,seconds:d.modelSeconds,step:d.residents.some(r=>r.actualDistance>0),tracked:d.residents.filter(r=>Number.isInteger(r.ownRejections)).length}}""")
            page.locator('#settings-toggle').tap()
            page.locator('#region').select_option('home')
            other=ready('v10')
            assert page.locator('#seats').is_disabled() and other.evaluate('HomeDragTrial.opening().region')=='home'
            assert record['arm']=='v10-reference' and record['tracked']==28 and record['step']
            assert [page.locator('#'+k+' option').count() for k in ('region','time','count','seed')]==[13,4,28,2]
            assert not errors,errors
            opening=snapshots[0]['opening']
            return dict(engine=args.engine,browser=browser.version,width=args.width,toolbar=toolbar,openingSHA256=hashlib.sha256(json.dumps(opening,sort_keys=True).encode()).hexdigest(),allOriginalOpeningsEqual=True,identicalV9ReferenceOpening=True,referenceChangedFeet=[x[0] for x,y in zip(a['opening']['actors'],opening['actors']) if x[2:4]!=y[2:4]],size='B',ground=True,shadows=28,paintSHA256=snapshots[0]['paint'],readout=record,forestOnly=True,errors=errors)
        finally:
            ctx.close();browser.close()
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--origin',required=True);parser.add_argument('--width',type=int,default=390)
    parser.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
    parser.add_argument('--executable',help='Path to a local Playwright-compatible browser')
    parser.add_argument('--owner',action='store_true');parser.add_argument('--out',required=True,type=Path)
    args=parser.parse_args()
    data=check(args,getpass.getpass('Owner verification credential: ') if args.owner else '')
    args.out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    print('Verified',data['engine'],data['width'],data['readout'])
