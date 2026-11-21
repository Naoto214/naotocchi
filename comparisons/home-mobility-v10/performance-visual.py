"""Check forest/shoreline pixels and all native E3+ and leaf B clocks on the current entries."""
import argparse
from io import BytesIO
from pathlib import Path
from PIL import Image,ImageChops
from playwright.sync_api import sync_playwright
from performance_common import ARMS,HERE,V9,WPE,clock,digest,load,native_page,save
fixed=load('v10_fixed',HERE/'performance-fixed.py')
# Reuse the parent's actual masked shoreline placement, without changing game assets.
pixel=load('v9_pixels',V9/'performance-pixels.py')

def pixels(browser,args):
    painters,hashes=fixed.painters(args.base,guard=True)
    def insert(name,source):
        if 'production-diorama' in name:
            return clock.replace(source,'    function stop(){',pixel.HOOK.replace('PAINTERS',painters)+"\nwindow.pixelSelection=()=>{HomeCastTrial.apply({paused:false});model.step(0,{blocked:false,reducedMotion:false});const a=model.snapshot()[0];if(!model.select(a.key))throw Error('Cannot select the native owner');return model.selected();};\n    function stop(){")
        return source
    result=dict(browser=browser.version,controllers=hashes,rows=[])
    for region,view,selected in [('forest',(390,792),False),('forest',(390,792),True),('river_lake',(844,390),False)]:
        page,errors,_=native_page(browser,args.base,'v9',init=fixed.HOLD,transform=insert,region=region,view=view)
        clip=page.evaluate('''()=>{window.holdGameTasks=true;const style=document.createElement('style');
            style.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';
            document.head.appendChild(style);for(const a of document.getAnimations())a.pause();for(const s of document.querySelectorAll('svg'))s.pauseAnimations?.();
            const r=document.getElementById('castStage').getBoundingClientRect(),x=Math.max(0,Math.ceil(r.left)),y=Math.max(0,Math.ceil(r.top));
            return {x,y,width:Math.floor(Math.min(innerWidth,r.right)-x),height:Math.floor(Math.min(innerHeight,r.bottom)-y)};}''')
        challenge=page.evaluate('placeVisibleMask()') if region=='river_lake' else None
        assert region!='river_lake' or challenge['applied']
        chosen=page.evaluate('pixelSelection()') if selected else None
        masks=[];images=[];order=['v8','v9','guarded','v10','v9']
        for arm in order:
            masks.append(page.evaluate('arm=>pixelRender(arm)',arm));images.append(Image.open(BytesIO(page.screenshot(clip=clip,timeout=60000))).convert('RGB'))
        changes=[ImageChops.difference(images[0],im).getbbox() for im in images[1:]]
        result['rows'].append(dict(region=region,selected=chosen,order=order,view=view,clip=clip,size=images[0].size,challenge=challenge,
          masked=sum(bool(x) for x in masks[0]),masksEqual=all(m==masks[0] for m in masks),hashes=[digest(im.tobytes()) for im in images],changes=changes))
        save(args.out,result);assert not any(changes) and result['rows'][-1]['masksEqual'] and not errors
        page.close()

def environment(browser,args):
    result=dict(browser=browser.version,rows=[])
    def trace(name,src):return clock.native(name,src,True) if 'production-world' in name else src
    for arm in ARMS:
        for variant in ['B','E3plus']:
            page,errors,assets=native_page(browser,args.base,arm,transform=trace)
            page.evaluate("v=>window.postMessage({type:'home-beauty-settings',settings:{variant:v}},location.origin)",variant)
            page.wait_for_function('v=>HomeBeauty.settings.variant===v',arg=variant)
            page.evaluate('HomeCastTrial.apply({paused:false});mobilityPerf.reset(214);0');page.wait_for_timeout(2000)
            page.evaluate('mobilityPerf.parts={};mobilityPerf.active=true;window.envStart=HomeBeauty.clockSeconds')
            page.wait_for_timeout(15000)
            r=page.evaluate('''()=>{mobilityPerf.active=false;return {envDelta:HomeBeauty.clockSeconds-envStart,
              variant:HomeBeauty.settings.variant,cast:mobilityPerf.live.snapshot().length,parts:mobilityPerf.parts}}''')
            assert r['envDelta']>0 and r['variant']==variant and r['cast']==28 and r['parts']['nature']['calls'] and not errors
            result['rows'].append(dict(arm=arm,assets=assets,**r));save(args.out,result);page.close()

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('mode',choices=['pixels','environment']);p.add_argument('--base',default='http://127.0.0.1:8377/game');p.add_argument('--out',type=Path,required=True);args=p.parse_args()
    with sync_playwright() as pw:
        browser=pw.webkit.launch(executable_path=WPE);{'pixels':pixels,'environment':environment}[args.mode](browser,args);browser.close()
