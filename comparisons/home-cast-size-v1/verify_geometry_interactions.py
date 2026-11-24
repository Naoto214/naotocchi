"""Exercise real touch input, movement and dialogue in the normal private shell."""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen
from playwright.sync_api import sync_playwright

def watch_model(source):
    anchor='if(!safe){a.target=null;a.route=[];'
    assert source.count(anchor)==1
    source=source.replace(anchor,"""if(!safe){
      window.qaStops??={resident:0,terrainOrBounds:0};
      const peer=actors.some(b=>b!==a && !separated(a,p,b) && !(distance(a,b)<1&&distance(p,b)>distance(a,b)+1e-6));
      window.qaStops[peer?'resident':'terrainOrBounds']++;
      a.target=null;a.route=[];""")
    return source

FIND="""id=>{
 const n=[...document.querySelectorAll('#castStage [data-diorama-actor]')].find(a=>a.dataset.dioramaActor===id);
 const im=n.querySelector('img.character-asset'),r=im.getBoundingClientRect(),c=document.createElement('canvas');
 c.width=im.naturalWidth;c.height=im.naturalHeight;
 const ctx=c.getContext('2d');ctx.drawImage(im,0,0);
 const pix=ctx.getImageData(0,0,c.width,c.height).data;
 const reflected=getComputedStyle(im).scale.startsWith('-');
 for (const y of [.6,.5,.45,.65,.55,.7,.35,.75]) for (const x of [.5,.4,.6,.45,.55,.3,.7]) {
   if(pix[4*(Math.floor(y*c.height)*c.width+Math.floor((reflected?1-x:x)*c.width))+3]<200)continue;
   const px=r.x+x*r.width,py=r.y+y*r.height;
   const hit=document.elementFromPoint(px,py)?.closest('[data-diorama-actor]');
   if(hit===n)return [px,py];
 }
 return null;
}"""
def run(pw,args):
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,device_scale_factor=2)
    model=watch_model(urlopen(args.url.rstrip('/')+'/game/home-production-model.js',timeout=15).read().decode())
    context.route('**/home-production-model.js*',lambda route:route.fulfill(content_type='application/javascript',body=model))
    page=context.new_page()
    url=args.url.rstrip('/')+'/?'+urlencode(dict(region=args.region,time='day',count=28,castPreset=args.modes[0],paused=1))
    print('opening',flush=True)
    page.goto(url,wait_until='domcontentloaded')
    print('opened',flush=True)
    iframe=page.locator('#home')
    frame=iframe.element_handle().content_frame()
    frame.wait_for_function("HomeCastTrial?.inspect?.().length===28 && HomeBeauty.paintRect?.width>0",timeout=90000)
    print("actors ready",flush=True)
    frame.evaluate("""()=>{window.qaEvents=[];window.qaLines=[];
      const scene=document.getElementById('castStage'),voice=document.getElementById('speechBubble');
      scene.addEventListener('naotocchi:home-reaction',({detail:e})=>{qaEvents.push({type:e?.type,key:e?.actor?.key,source:e?.source});});
      const check=()=>{if(voice.offsetHeight && getComputedStyle(voice).visibility!=='hidden'){
        const s=voice.innerText.trim().slice(0,140);if(s && !qaLines.includes(s))qaLines.push(s);}};
      new MutationObserver(check).observe(voice,{attributes:true,childList:true,subtree:true,characterData:true});
      check();}""")
    page.locator('#freeze').click()
    frame.wait_for_function("!HomeCastTrial.settings.paused")
    print('live',flush=True)
    bound=iframe.bounding_box()
    result={'engine':browser.version,'stage':args.region,'count':28,'input':'Chromium CDP touch, CSS coordinates','modes':{}}
    client=context.new_cdp_session(page)
    for mode in args.modes:
        page.locator('button[data-preset="'+mode+'"]').click()
        frame.wait_for_function("document.getElementById('castStage').dataset.dioramaPaused!=='true'",timeout=30000)
        taps=[]
        print('testing',mode,flush=True)
        for key in ('partner:forest_bear','companion:shiba','companion:panda','pet:dog'):
            pt=frame.evaluate(FIND,key)
            if pt is None:
                taps.append([key,'no exposed test point']);continue
            x,y=pt[0]+bound['x'],pt[1]+bound['y']
            page.touchscreen.tap(x,y)
            selected=frame.evaluate("HomeCastTrial.inspect().find(a=>a.selected)?.key")
            taps.append([key,selected])
            print(mode,key,selected,flush=True)
        key='pet:dog';pt=frame.evaluate(FIND,key);marker=False;source=None;movement=0
        if pt:
            x,y=pt[0]+bound['x'],pt[1]+bound['y']
            before=frame.evaluate("HomeCastTrial.inspect().find(a=>a.kind==='pet')")
            dx=30 if x<220 else -30
            client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]})
            for step in range(1,7):
                client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+dx*step/6,'y':y-step,'id':1}]})
            marker=frame.locator('.diorama-target').is_visible()
            client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
            page.wait_for_timeout(600)
            after=frame.evaluate("HomeCastTrial.inspect().find(a=>a.kind==='pet')")
            source=after.get('source');movement=round(((after['x']-before['x'])**2+(after['y']-before['y'])**2)**.5,2)
        result['modes'][mode]=dict(taps=taps,dragMarker=marker,sourceAfterRelease=source,distanceAfter600ms=movement)
        print(mode,result['modes'][mode],flush=True)
    # Leave the ordinary simulation and speech lane running after manual input.
    page.wait_for_timeout(args.listen*1000)
    sample=frame.evaluate("""()=>({observedActions:qaEvents.reduce((a,e)=>{let k=e.type+'/'+e.source;a[k]=(a[k]||0)+1;return a;},{}),
      actualSpeech:qaLines,stops:window.qaStops||{},model:JSON.parse(document.getElementById('castStage').dataset.livingMetrics||'{}').cast,
      clock:HomeBeauty.clockSeconds})""")
    result.update(observationSeconds=args.listen,**sample)
    args.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(sample,flush=True)
    browser.close()

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--modes',nargs='+',choices=['current','A','B'],default=['current','A','B']);ap.add_argument('--region',default='forest');ap.add_argument('url');ap.add_argument('--out',type=Path,required=True);ap.add_argument('--listen',type=int,default=40)
    with sync_playwright() as pw: run(pw,ap.parse_args())
