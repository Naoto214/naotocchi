"""Drag a walking resident toward a point on the same resident's native route."""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from verify_geometry_interactions import FIND

def run(pw,args):
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2)
    page.goto(args.url.rstrip('/')+'/?region=river_lake&count=28&castPreset=B',wait_until='domcontentloaded')
    iframe=page.locator('#home');frame=iframe.element_handle().content_frame()
    frame.wait_for_function("window.HomeCastTrial?.inspect().length===28 && JSON.parse(document.querySelector('#castStage').dataset.livingMetrics||'{}').world?.loaded",timeout=100000)
    frame.evaluate("()=>{window.qaWalks=[];document.querySelector('#castStage').addEventListener('naotocchi:home-reaction',e=>{if(e.detail.type==='move'&&e.detail.source==='drag')qaWalks.push(e.detail.actor.key)})}")
    client=page.context.new_cdp_session(page)
    rows=[]
    for attempt in range(6):
        frame.wait_for_function("!HomeCastTrial.settings.paused && document.getElementById('castStage').dataset.dioramaPaused!=='true' && HomeCastTrial.inspect().some(a=>a.activity==='walk'&&a.target)",timeout=45000)
        actors=frame.evaluate("""()=>{const p=window.NaotocchiHomeViewport.residentPresentation();return HomeCastTrial.inspect().filter(a=>a.activity==='walk'&&a.target).map(a=>{
          const target=a.route?.length?a.route[a.route.length-1]:a.target;
          return {key:a.key,x:a.x,y:a.y,point:[a.foot.x+(target.x-a.x)*p.scaleX,a.foot.y+(target.y-a.y)*p.scaleY]};})}""")
        if not actors: continue
        chosen=next(((a,pt) for a in actors if (pt:=frame.evaluate(FIND,a['key']))),None)
        if not chosen:page.wait_for_timeout(100);continue
        a,pt=chosen;bound=iframe.bounding_box()
        x,y=pt[0]+bound['x'],pt[1]+bound['y']
        tx,ty=a['point'][0]+bound['x'],a['point'][1]+bound['y']
        client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]})
        for i in range(1,5):
            client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+(tx-x)*i/4,'y':y+(ty-y)*i/4,'id':1}]})
        marker=frame.locator('.diorama-target').is_visible()
        client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        page.wait_for_timeout(900)
        after=frame.evaluate("key=>HomeCastTrial.inspect().find(a=>a.key===key)",a['key'])
        moves=frame.evaluate('qaWalks.slice()')
        rows.append(dict(key=a['key'],marker=marker,acceptedByModel=a['key'] in moves,distance=round(((a['x']-after['x'])**2+(a['y']-after['y'])**2)**.5,2)))
        print(rows[-1],flush=True)
        if rows[-1]['acceptedByModel']:break
    args.out.write_text(json.dumps({'region':'river_lake','count':28,'preset':'B','touch':'Chromium CDP','trials':rows},indent=2)+'\n')
    browser.close()
if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('url');ap.add_argument('--out',type=Path,required=True)
    with sync_playwright() as pw:run(pw,ap.parse_args())
