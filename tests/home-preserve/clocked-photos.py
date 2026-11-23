"""Photograph native openings with browser timers at precisely the same age on both sides."""
import argparse
import base64
import io
import json
import os
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

import regional


def capture(page, region, count, destination):
    # Yield to image decode and script download while the page clock stays paused.
    page.wait_for_load_state('load')
    samples=[]
    for i in range(100):
        page.clock.run_for(16)
        if i in (0, 5, 25):
            page.wait_for_load_state('networkidle')
        if i==94:
            page.evaluate("""async()=>{window.regionalScenes=(await import('./home-production-manifest.mjs')).ART_SCENES;
              window.regionalInside=(await import('./home-art-navigation.mjs')).insidePolygon}""")
        if i>=96:
            ready=page.evaluate("([r,n])=>window.regional?.ready(r,n)&&window.preservePaint?.region===r",[region,count])
            assert ready,(region,count,i)
            placement=page.evaluate('regional.placement()')
            samples.append([placement['frame'],placement['camera'],placement['cover'],
                            [[a['key'],a['actual'],a['stage'],a['layer']] for a in placement['feet']]])
    assert all(sample==samples[-1] for sample in samples),(region,'moving geometry at capture')
    ui=page.evaluate("""()=>({now:Date.now(),clock:regional.summary().clock,slot:document.querySelector('#storyFlashText').textContent,
                         meters:['hunger','happiness','energy','health'].map(k=>document.querySelector('#'+k+'Value').textContent)})""")
    cdp=page.context.new_cdp_session(page)
    data=cdp.send('Page.captureScreenshot',dict(format='png',fromSurface=True))
    image=Image.open(io.BytesIO(base64.b64decode(data['data'])))
    image.resize((375,615),Image.Resampling.LANCZOS).save(destination)
    return dict(ui=ui,placement=placement,stableFrames=len(samples))


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('out',type=Path);p.add_argument('roots',nargs='+',type=Path)
    args=p.parse_args();args.out.mkdir(parents=True,exist_ok=True);report={}
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        for root in args.roots:
            url=regional.serve(root)
            for region,count in [('forest',28),('mountain',10),('jungle',10)]:
                key=root.name+'-'+region;out=args.out/(key+'.png')
                context=browser.new_context(viewport={'width':375,'height':615},device_scale_factor=2,
                    is_mobile=True,has_touch=True,timezone_id='Asia/Tokyo',locale='ja-JP')
                try:
                    report[key]=regional.measure(context,root,url,region,count,375,'candidate',0,pairs=True,
                        clocked_photo=lambda page:capture(page,region,count,out))
                    (args.out/'observations.json').write_text(json.dumps(report,separators=(',',':'))+'\n')
                    print(key,report[key]['ui'],flush=True)
                finally:context.close()
        browser.close()


if __name__=='__main__':main()
