"""Deliver a real touch drag from the eligible opening pose before foreground UI takes over."""
import argparse
import json
import math
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright
from verify_interact_pointer import GATE_ANCHOR,GAME_GATE,NATIVE_GATE,PROBE,RECORDER
from verify_interact_routes import HEIGHT,HIT_ANCHOR,HIT_EXPOSE,ROOT,instrument,once,seed_signature

def exercise(context,base,layout):
    # Center and path math are read once with the comparison paused. The native
    # touch handler still gets every start/move/end, and must itself accept it.
    game=base+'/game/'
    source=urlopen(game+'home-production-model.js').read().decode()
    anchor="a.route=path.slice(1);a.target=path[0];a.source=source;"
    src=once(instrument(source),anchor,"if(source==='drag')(window.qaRealRoute||=[]).push([key,q.x,q.y,path.length]);"+anchor)
    source=urlopen(game+'home-production-diorama-limit.js').read().decode()
    diorama=once(once(source,HIT_ANCHOR,HIT_EXPOSE+HIT_ANCHOR),GATE_ANCHOR,GATE_ANCHOR+NATIVE_GATE)
    source=urlopen(game+'script-v2.js').read().decode()
    script=once(source,'  function homeDioramaBlocked() {',GAME_GATE+'  function homeDioramaBlocked() {')
    def serve_script(body):
        return lambda route:route.fulfill(content_type='application/javascript',body=body)
    for file,body in [('home-production-model.js',src),('home-production-diorama-limit.js',diorama),('script-v2.js',script)]:
        context.route('**/'+file+'*',serve_script(body))
    page=context.new_page();cdp=context.new_cdp_session(page)
    page.goto(base+'/v3/?region=city&time=day&count=4&paused=1&extra=20&layout='+layout,wait_until='domcontentloaded',timeout=120000)
    page.wait_for_function("document.body.dataset.ready==='true'",timeout=180000,polling=125)
    frame=page.locator('#home').element_handle().content_frame()
    frame.evaluate((ROOT/'verify_interact_hits.js').read_text());frame.evaluate(RECORDER)
    box=page.locator('#home').bounding_box()
    # Check the cast is selectable, and build the rightwards 12 CSS px drag.
    cast=frame.evaluate('HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y])')
    data=frame.evaluate(PROBE,{'key':'pet:dog','assisted':False})
    result={'seed':seed_signature(game+'limit-seating.js',375,'city',4,layout,20),'origin':cast[0],'plan':data,'before':frame.evaluate('qaGate()')}
    if not data:return result
    def touch(kind,point=None):
        pts=[] if point is None else [{'id':9,'x':box['x']+point[0],'y':box['y']+point[1]}]
        cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':pts})
    # The normal play button restores normal speed. Its one standard postMessage
    # is handled before the trusted pointerdown is dispatched.
    page.evaluate("document.querySelector('#freeze').click()")
    frame.wait_for_function('!HomeCastTrial.settings.paused',timeout=20000,polling=30)
    start,dest=data['start'],data['dest'];touch('touchStart',start)
    for i in range(1,6):
        f=i/5;touch('touchMove',[start[0]*(1-f)+dest[0]*f,start[1]*(1-f)+dest[1]*f])
    touch('touchEnd')
    page.wait_for_timeout(1100)
    state=frame.evaluate("""()=>{const a=HomeCastTrial.inspect().find(a=>a.kind==='pet');return{
        position:[a.x,a.y],routes:window.qaRealRoute||[],pointerEvents:qaPointers,reactions:qaAct,gate:qaGate()};}""")
    result.update(state);result['displacementNative']=math.dist(state['position'],cast[0][1:]);return result

def main(args):
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        data={'browser':browser.version,'cases':{}}
        for layout in args.layouts:
            ctx=browser.new_context(viewport={'width':375,'height':HEIGHT[375]},is_mobile=True,has_touch=True,device_scale_factor=2)
            try:
                print('opening',layout,flush=True)
                data['cases'][layout]=exercise(ctx,args.url.rstrip('/'),layout)
                args.out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
                print(layout,data['cases'][layout].get('routes'),data['cases'][layout].get('displacementNative'),flush=True)
            finally:ctx.close()
        browser.close()

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('url');p.add_argument('--out',type=Path,required=True)
    p.add_argument('--layouts',nargs='+',choices=['fixed','optimized'],default=['optimized','fixed']);main(p.parse_args())
