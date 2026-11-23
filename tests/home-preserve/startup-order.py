"""Compare native first layouts under matched world-module/viewport event sequences."""
import argparse
import base64
import io
import hashlib
import json
import os
from pathlib import Path
import time
from unittest.mock import patch

from PIL import Image
from playwright.sync_api import sync_playwright

import regional

READ=Path.read_text
OBSERVER="""
window.startupSync=[];
const originalNativeSync=model.sync;
model.sync=function(input,next,...rest){
 const nav=!!next.navigation, camera=env.NaotocchiHomeViewport?.residentPresentation?.();
 const images=[...stage.querySelectorAll('img.character-asset')];
 const result=originalNativeSync.call(this,input,next,...rest);
 if(window.startupSync.length<100){
   const residents=model.snapshot();
   window.startupSync.push({ms:performance.now(),nav,
      camera:camera&&[camera.x,camera.y,camera.scaleX,camera.scaleY,camera.bodyScale],
      images:[images.length,images.filter(i=>i.complete&&i.naturalWidth).length],
      region:next.region,stageSize:[next.width,next.height],
      input:input.map(a=>[a.key,a.x,a.y,a.w,a.h]),placed:residents.map(a=>[a.key,a.x,a.y])});
 }
 return result;
};
"""
def instrument(path,*args,**kwargs):
    source=READ(path,*args,**kwargs)
    if path.name=='home-production-world.mjs':
        anchor='export function createHomeWorld(options){'
        return regional.once(source,anchor,
            'window.worldModuleAt=performance.now();await new Promise(resolve=>window.releaseNativeWorld=resolve);'+anchor)
    return source


def wait_real(page,condition):
    until=time.monotonic()+15
    while not page.evaluate(condition):
        if time.monotonic()>until:raise TimeoutError(condition)
        time.sleep(.015)


def capture(page,delay_frames,photo,sprite_gate):
    image_order=[]
    if sprite_gate:
        wait_real(page,"document.querySelectorAll('#castStage img.character-asset').length===28")
        urls=page.evaluate("Array.from(new Set([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.src))).sort()")
        for url in urls:
            end=time.monotonic()+10
            while url not in sprite_gate['pending']:
                if time.monotonic()>end:raise TimeoutError('Waiting for sprite '+url)
                time.sleep(.005)
                page.evaluate('document.readyState')
            sprite_gate['open'].add(url)
            for route in sprite_gate['pending'].pop(url):
                route.continue_()
            page.evaluate("url=>Promise.all([...document.querySelectorAll('#castStage img.character-asset')].filter(i=>i.src===url).map(i=>i.decode()))",url)
            image_order.append(url.split('/assets/')[-1])
        sprite_gate['done']=True
        for routes in list(sprite_gate['pending'].values()):
            for route in routes:route.continue_()
    page.wait_for_load_state('load')
    # Only order the asynchronous module relative to viewport callbacks. All scene,
    # seating and navigation code executes natively. Images are decoded by Chromium.
    wait_real(page,'!!window.releaseNativeWorld')
    page.evaluate("""async()=>{await Promise.all([...document.querySelectorAll('#castStage img')].map(i=>i.decode().catch(()=>{})))}""")
    for _ in range(delay_frames):page.clock.run_for(16)
    page.evaluate('window.releaseNativeWorld()')
    wait_real(page,'window.startupSync?.some(x=>x.nav) || !!document.querySelector(".home-art-canvas")')
    for i in range(delay_frames,100):
        page.clock.run_for(16)
        if i in (delay_frames,delay_frames+5,delay_frames+15):
            page.wait_for_load_state('networkidle')
        if i==94:
            page.evaluate("""async()=>{window.regionalScenes=(await import('./home-production-manifest.mjs')).ART_SCENES;
               window.regionalInside=(await import('./home-art-navigation.mjs')).insidePolygon;}""")
    assert page.evaluate("regional.ready('forest',28)")
    placed=page.evaluate('regional.placement()')
    if photo:
        data=page.context.new_cdp_session(page).send('Page.captureScreenshot',dict(format='png',fromSurface=True))
        image=Image.open(io.BytesIO(base64.b64decode(data['data'])))
        image.resize((375,615),Image.Resampling.LANCZOS).save(photo)
    return dict(imageOrder=image_order,moduleAt=page.evaluate('worldModuleAt'),sampled=page.evaluate('performance.now()'),
                camera=placed['camera'],frame=placed['frame'],cover=placed['cover'],coords=[[a['key'],a['actual'],a['stage'],a['layer'],a['imageSize']] for a in placed['feet']],
                syncs=page.evaluate('startupSync'))


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('out',type=Path)
    p.add_argument('roots',nargs='+',type=Path)
    p.add_argument('--frames',nargs='+',type=int,default=[0,20])
    p.add_argument('--repeat',type=int,default=2)
    p.add_argument('--photos',type=Path)
    p.add_argument('--ordered-sprites',action='store_true')
    a=p.parse_args(); data=json.loads(a.out.read_text()) if a.out.exists() else {}
    if a.photos:a.photos.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw,patch.object(Path,'read_text',instrument):
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        for root in a.roots:
            url=regional.serve(root)
            for frames in a.frames:
                for repeat in range(a.repeat):
                    key=f'{root.name}/{frames}/{repeat}'
                    if key in data and 'error' not in data[key]:continue
                    ctx=browser.new_context(viewport={'width':375,'height':615},device_scale_factor=2,is_mobile=True,has_touch=True,timezone_id='Asia/Tokyo',locale='ja-JP')
                    sprite_gate={'pending':{},'open':set(),'done':False} if a.ordered_sprites else None
                    if sprite_gate:
                        def defer_image(route):
                            url=route.request.url
                            if sprite_gate['done'] or url in sprite_gate['open']:route.continue_()
                            else:sprite_gate['pending'].setdefault(url,[]).append(route)
                        ctx.route('**/assets/characters/**',defer_image)
                    try:
                        row=regional.measure(ctx,root,url,'forest',28,375,'candidate',0,pairs=True,
                            opening_probe=OBSERVER,clocked_photo=lambda page:capture(page,frames,a.photos/(key.replace('/','-')+'.png') if a.photos else None,sprite_gate))
                        row['coordinateSha256']=hashlib.sha256(json.dumps(row['coords'],separators=(',',':')).encode()).hexdigest()
                    except Exception as e:row={'error':repr(e)}
                    finally:ctx.close()
                    data[key]=row;a.out.write_text(json.dumps(data,separators=(',',':'))+'\n')
                    print(key,row.get('coordinateSha256',row.get('error')),flush=True)
        browser.close()


if __name__=='__main__':main()
