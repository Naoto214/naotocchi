"""Reproduce a physical hero drag to a V5-legal destination in the 320 px forest."""
import argparse
import hashlib
import json
import math
import os
import sys
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'home-cast-size-v1'))
from verify_geometry_interactions import FIND

# These read-only probes run in the QA browser. Production move(), sync(), routing,
# touch conversion and collision functions receive the original input unchanged.
SAFE_POINTS = """
window.qaHeroPaths=()=>{
  const a=actors.find(a=>a.kind==='pet'), b=bounds(a,scene), options=[];
  for (const length of [10,16,24,32,40,46]) {
    for (let angle=0;angle<16;angle++) {
      const x=a.x+length*Math.cos(angle*Math.PI/8), y=a.y+length*Math.sin(angle*Math.PI/8);
      const point={x,y};
      if(x<b.left || x>b.right || y<b.top || y>b.bottom)continue;
      if(!scene.navigation.valid(point) || !free(a,point))continue;
      if(!scene.navigation.segmentSafe(a,point,p=>free(a,p)))continue;
      const clearanceAtEnd=Math.min(...actors.filter(other=>other!==a).map(other=>clearance(a,point,other)));
      options.push({x,y,length,angle,clearanceAtEnd});
    }
  }
  return {origin:{x:a.x,y:a.y},options};
};
"""
ROUTE_RECORD = """
if(source==='drag') (window.qaDragDiagnostics||=[]).push({
  actor:key, requested:[p.x,p.y], planned:q, waypoints:path.length
});
"""
RENDER_POINT = """q=>{
  const a=HomeCastTrial.inspect().find(a=>a.kind==='pet'), p=NaotocchiHomeViewport.residentPresentation();
  return [a.foot.x+(q.x-a.x)*p.scaleX,a.foot.y+(q.y-a.y)*p.scaleY];
}"""
RECORDER = """()=>{
  window.qaDragEvents=[];
  document.addEventListener('naotocchi:home-reaction',event=>{
    if(event.detail.source==='drag') qaDragEvents.push([event.detail.type,event.detail.actor.key]);
  },true);
}"""


def instrument(original):
    source = original
    for anchor, replacement in [
        ('function select(key){', SAFE_POINTS+'function select(key){'),
        ('if(!path.length||Math.hypot(q.x-a.x,q.y-a.y)<3)return false;',
         ROUTE_RECORD+'if(!path.length||Math.hypot(q.x-a.x,q.y-a.y)<3)return false;')
    ]:
        if source.count(anchor) != 1:
            raise ValueError('Unexpected native model at ' + anchor)
        source = source.replace(anchor,replacement)
    return source


def exercise(browser,url,mode,probe_source):
    context = browser.new_context(viewport={'width':320,'height':568},
                                  has_touch=True,is_mobile=True,device_scale_factor=2)
    try:
        context.route('**/home-production-model.js*',lambda route:route.fulfill(
            content_type='application/javascript',body=probe_source))
        page = context.new_page()
        page.goto(url+'/?region=forest&time=day&count=28&paused=1&mode='+mode,wait_until='domcontentloaded')
        page.wait_for_function("document.body.dataset.ready==='true'",timeout=150000)
        frame = page.locator('#home').element_handle().content_frame()
        assert frame.url.split('?')[0].endswith('/'+('final' if mode=='final' else 'index')+'.html')
        frame.evaluate(RECORDER)
        page.locator('#freeze').click()
        frame.wait_for_function("!HomeCastTrial.settings.paused && document.querySelector('#castStage').dataset.dioramaPaused!=='true'",timeout=95000)
        cdp = context.new_cdp_session(page)
        box = page.locator('#home').bounding_box()

        def touch(event, point=None):
            points=[] if point is None else [{'id':1,'x':point[0]+box['x'],'y':point[1]+box['y']}]
            cdp.send('Input.dispatchTouchEvent',{'type':event,'touchPoints':points})

        snapshot = frame.evaluate('qaHeroPaths()')
        options = snapshot['options']
        assert options, 'No direct legal sample in this frozen-start fixture'
        target = max(options,key=lambda p:(p['length'],p['clearanceAtEnd'],p['angle']))
        start = frame.evaluate(FIND,'pet:dog')
        assert start, 'Hero is not exposed at the touch point'
        touch('touchStart',start)
        page.wait_for_timeout(65)
        # A V5 exit of 46 native units may span less than 10 CSS pixels of depth.
        # A small natural arc activates touch drag even for that short gesture.
        for step in range(1,6):
            dest=frame.evaluate(RENDER_POINT,target)
            phase=step/5
            point=[start[0]*(1-phase)+dest[0]*phase+math.sin(phase*math.pi)*7,
                   start[1]*(1-phase)+dest[1]*phase+math.sin(phase*math.pi)*5]
            touch('touchMove',point)
            page.wait_for_timeout(40)
        dest=frame.evaluate(RENDER_POINT,target)
        touch('touchMove',dest)
        marker=frame.locator('.diorama-target').is_visible()
        held=frame.evaluate("HomeCastTrial.inspect().find(a=>a.selected)?.key")
        touch('touchEnd')
        page.wait_for_timeout(900)
        result=frame.evaluate("""()=>{
          const a=HomeCastTrial.inspect().find(a=>a.kind==='pet');
          return {position:[a.x,a.y],source:a.source,dragEvents:qaDragEvents,route:window.qaDragDiagnostics||[]};
        }""")
        origin=snapshot['origin']
        moved=math.dist(result['position'],[origin['x'],origin['y']])
        assert marker and held=='pet:dog' and ['move','pet:dog'] in result['dragEvents'],result
        assert result['route'][-1]['waypoints'] and moved>2,result
        result.update(origin=origin,targetNative=target,pressedCss=start,releasedCss=dest,
                      legalSampleCount=len(options),marker=marker,held=held,displacementAfter900ms=moved)
        return result
    finally:
        context.close()


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('url')
    parser.add_argument('--out',required=True,type=Path)
    args=parser.parse_args()
    url=args.url.rstrip('/')
    names=['home-production-model.js','home-production-touch.js','home-production-diorama.js',
           'home-production-diorama-v2.js','seating.js','script.js','script-v2.js','home-production-world-v2.mjs']
    sources={name:urlopen(url+'/game/'+name,timeout=30).read() for name in names}
    probe=instrument(sources['home-production-model.js'].decode())
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),
                                           args=['--no-sandbox'])
        try:
            result={'engine':'Linux Chromium '+browser.version,'viewport':[320,568],'region':'forest',
                    'count':28,'time':'day','input':'CDP touch with 5 moves and a 7 by 5 CSS px arc',
                    'sha256':{k:hashlib.sha256(v).hexdigest() for k,v in sources.items()},
                    'trials':{m:exercise(browser,url,m,probe) for m in ('adopted','final')}}
        finally:
            browser.close()
    args.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    for mode,row in result['trials'].items():
        print(mode,'legal samples',row['legalSampleCount'],'native displacement',round(row['displacementAfter900ms'],2))


if __name__=='__main__':
    main()
