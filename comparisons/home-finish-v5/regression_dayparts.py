"""Drive time-of-day through the owner shell and observe decoded art reaching the visible canvas."""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

from regression_grid import DAYPARTS, HERE, REGIONS


def verify(browser,origin,region):
    context=browser.new_context(viewport={'width':375,'height':812},has_touch=True,
        is_mobile=True,device_scale_factor=2,reduced_motion='reduce')
    context.add_init_script(path=HERE/'regression_probe.js')
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    try:
        query=urlencode(dict(region=region,time='day',count=19,ground='on',paused=1))
        page.goto(origin.rstrip('/')+'/v5/?'+query,wait_until='domcontentloaded')
        page.wait_for_selector('body[data-ready="true"]',timeout=120000)
        frame=page.locator('#home').element_handle().content_frame()
        assert frame.url.split('?')[0].endswith('/game/finish.html')
        assert not frame.locator('.diorama-view').count()
        assert not page.locator('[data-variant],#variant,#policy,#layout,#curve').count()
        assert not page.get_by_text('84%',exact=False).count()
        expected=frame.evaluate("async r=>(await import('./home-dayparts.mjs')).DAYPARTS[r]",region)
        cast=frame.evaluate('HomeCastTrial.inspect().map(a=>a.key)')
        assert len(cast)==len(set(cast))==19
        rows={}
        for daypart in DAYPARTS:
            page.locator('#settings-toggle').click()
            page.locator('#time').select_option(daypart)
            page.locator('#settings-close').click()
            frame.wait_for_function("""facts=>{
                const img=window.regressionBackground;
                const canvas=document.querySelector('.home-art-canvas');
                return canvas?.checkVisibility({opacityProperty:true,visibilityProperty:true}) &&
                    img?.currentSrc===new URL(facts.src,location.href).href &&
                    HomeCastTrial.settings.time===facts.time;
            }""",arg=dict(src=expected[daypart],time=daypart),polling=100,timeout=90000)
            row=frame.evaluate("""async ()=>{const img=regressionBackground;await img.decode();
                const s=HomeCastTrial.settings;const c=document.querySelector('.home-art-canvas');
                return {art:new URL(img.currentSrc).pathname.split('/game/').pop(),pixels:[img.naturalWidth,img.naturalHeight],
                    visibleCanvas:[c.width,c.height],roster:HomeCastTrial.inspect().map(a=>a.key),size:s.policy,extra:s.extra,
                    region:HomeBeauty.settings.region,count:s.count};}""")
            assert row.pop('roster')==cast and row['region']==region and row['count']==19
            assert row['art']==expected[daypart] and row['pixels']==[1024,1536] and min(row['visibleCanvas'])>0
            assert row['size']=='B' and row['extra']==1.5
            rows[daypart]=row
        assert len({r['art'] for r in rows.values()})==4 and not errors
        return {'region':region,'browser':browser.version,'shell':'/v5/','sameFrame':True,'roster':cast,'realCanvasPaints':rows}
    finally:
        context.close()


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('url')
    p.add_argument('--region',required=True,choices=REGIONS)
    p.add_argument('--out',required=True,type=Path)
    a=p.parse_args()
    a.out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        data=verify(b,a.url,a.region)
        (a.out/(a.region+'-dayparts.json')).write_text(json.dumps(data,indent=2)+'\n')
        print(a.region, 'four decoded backgrounds painted')
        b.close()
