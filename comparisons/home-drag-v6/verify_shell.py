"""Exercise the private V5/V6 switch through the rendered mobile shell."""
import argparse
import hashlib
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright


def verify(origin, engine, executable, region, count, width, height):
    with sync_playwright() as p:
        options = {'executable_path':executable} if executable else {}
        browser = getattr(p,engine).launch(**options)
        context = browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2,
                                      has_touch=True,is_mobile=True,locale='ja-JP')
        page = context.new_page()
        page.set_default_timeout(90000)
        errors = []
        page.on('pageerror', lambda e:errors.append(str(e)))

        def ready(arm):
            page.wait_for_function("""document.body.dataset.ready==='true' ||
                                  document.querySelector('#status').textContent.includes('確認できません')""", polling=150)
            assert page.locator('body').get_attribute('data-ready') == 'true', page.locator('#status').inner_text()
            assert page.locator('iframe').count() == 1
            if not page.locator('body').evaluate("e=>e.classList.contains('settings-open')"):
                assert page.locator('#home').evaluate("""f=>{
                    const r=f.getBoundingClientRect();
                    return document.elementFromPoint(r.x+r.width/2,r.y+r.height*.60)===f;
                }"""), 'The shell covers the native touch surface'
            frame = page.locator('#home').element_handle().content_frame()
            assert frame.url.split('?')[0].endswith('/game/drag-'+arm+'.html'),frame.url
            return frame

        def scripts(frame):
            return frame.evaluate("""[...document.scripts].map(s=>s.getAttribute('src')||'')
                .filter(n=>n.includes('home-production-model-') || n.includes('home-production-diorama-')
                        || n.startsWith('script-v2') || n.startsWith('drag-trial-hooks.js')
                        || n==='beauty/fixture.js' || n==='population-beauty.js')""")

        def checkpoint(frame):
            return frame.evaluate("""async () => {
              const state=HomeDragTrial.opening(),beauty=HomeBeauty.settings,cast=HomeCastTrial;
              const canvas=document.querySelector('.home-art-canvas');
              const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
              const sha=await crypto.subtle.digest('SHA-256',pixels);
              return {opening:state,canvas:[canvas.width,canvas.height],
                canvasSHA256:[...new Uint8Array(sha)].map(n=>n.toString(16).padStart(2,'0')).join(''),
                region:beauty.region,time:beauty.time,count:cast.inspect().length,
                policy:cast.settings.policy,curve:cast.settings.curve,ground:HomeFinishGround.enabled(),
                leaf:beauty.variant,lighting:document.documentElement.dataset.beautyVariant,
                stored:[localStorage.getItem('drag-owner-check'),sessionStorage.getItem('drag-owner-check')]};
            }""")

        page.goto(origin+f'/v6/?arm=v5&paused=1&region={region}&count={count}&time=day')
        page.evaluate("""() => {localStorage.setItem('drag-owner-check','keep');sessionStorage.setItem('drag-owner-check','keep');}""")
        frame = ready('v5')
        arm_scripts={'v5':scripts(frame)}
        v5 = checkpoint(frame)
        toolbar = page.evaluate("""() => [...document.querySelectorAll('.tools button')].map(e=>{
             const r=e.getBoundingClientRect(); return {id:e.id||e.dataset.arm,width:r.width,height:r.height,
               visible:r.width>0 && r.x>=0 && r.right<=innerWidth && e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};
          })""")
        assert all(b['visible'] and b['width']>=44 and b['height']>=44 for b in toolbar),toolbar
        page.locator('[data-arm=v6]').tap()
        frame = ready('v6')
        arm_scripts['v6']=scripts(frame)
        v6 = checkpoint(frame)
        assert v5['opening'] == v6['opening'], ('Native openings differ',v5['opening'],v6['opening'])
        assert v5['canvasSHA256'] == v6['canvasSHA256'], ('Frozen native paintings differ',v5['canvasSHA256'],v6['canvasSHA256'])
        assert v6['opening']['clock'] == 0 and v6['count'] == count and v6['region'] == region
        assert v5['stored'] == v6['stored'] == [None,None]
        assert (v6['policy'],v6['curve'],v6['ground'],v6['leaf'],v6['lighting']) == ('B','linear',True,'B','E3plus')
        page.locator('#restart').tap()
        frame = ready('v6')
        assert checkpoint(frame) == v6, 'Restart changed the native opening'
        page.locator('#freeze').tap()
        frame.wait_for_function("!HomeCastTrial.settings.paused && HomeBeauty.clockSeconds>0",polling=200)
        frame.wait_for_function("""()=>HomeCastTrial.inspect().some((a,i)=>{
              const start=HomeDragTrial.opening().actors[i];return Math.hypot(a.x-start[2],a.y-start[3])>1;
            })""",polling=200,timeout=90000)
        clock=frame.evaluate('HomeBeauty.clockSeconds')
        active=frame.evaluate('HomeCastTrial.inspect().filter(a=>a.target).length')
        page.locator('[data-arm=v5]').tap()
        frame=ready('v5')
        assert frame.evaluate('HomeDragTrial.opening()')==v5['opening']
        frame.wait_for_function('!HomeCastTrial.settings.paused && HomeBeauty.clockSeconds>0',polling=200)

        page.locator('#settings-toggle').tap()
        sizes = [page.locator('#'+name+' option').count() for name in ['region','time','count']]
        assert sizes == [13,4,28]
        page.locator('#time').select_option('night')
        frame=ready('v5')
        assert frame.evaluate('HomeDragTrial.opening().time')=='night'
        page.locator('#count').select_option('1')
        frame=ready('v5')
        assert frame.evaluate('HomeDragTrial.opening().actors.length')==1
        page.locator('#settings-close').tap()
        assert 'arm=v5' in page.url and 'time=night' in page.url and 'count=1' in page.url
        assert page.evaluate("""[localStorage,sessionStorage].every(s=>s.getItem('drag-owner-check')==='keep'
                           && s.getItem('naotocchi-cast-size-v1-fixture')===null)""")
        assert not errors,errors
        seeds={}
        for name,marker in [('beauty/fixture.js','let seed=214;'),('population-beauty.js','let actorSeed=214;')]:
            assert all(name in files for files in arm_scripts.values()),arm_scripts
            response=context.request.get(origin+'/game/'+name,timeout=20000)
            content=response.body()
            assert response.ok and marker in content.decode(),name
            seeds[name]={'seed':214,'sha256':hashlib.sha256(content).hexdigest()}
        report={'engine':engine,'version':browser.version,'ownerViewport':[width,height],'toolbar':toolbar,
                'nativeScripts':arm_scripts,'randomSources':seeds,'pairedOpening':v5,
                'restartsMatched':True,'playingClockSeconds':clock,'walkingWhenSampled':active,
                'regionTimeCountOptions':sizes,'errors':errors}
        browser.close()
        return report


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('origin')
    parser.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
    parser.add_argument('--executable')
    parser.add_argument('--region',default='river_lake')
    parser.add_argument('--count',type=int,default=28)
    parser.add_argument('--width',type=int,default=375)
    parser.add_argument('--height',type=int,default=812)
    parser.add_argument('--out',type=Path)
    args=parser.parse_args()
    exe=args.executable or os.environ.get('CHROMIUM_PATH' if args.engine=='chromium' else 'WEBKIT_PATH')
    report=json.dumps(verify(args.origin.rstrip('/'),args.engine,exe,args.region,args.count,args.width,args.height),ensure_ascii=False,indent=2)+'\n'
    if args.out:
        args.out.write_text(report)
    else:
        print(report)
