"""Capture native isolated forest households and compare DOM feet against the art transform."""
import argparse
import functools
import hashlib
import http.server
import json
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def capture(dist, out):
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(dist)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--disable-dev-shm-usage'])
            cases = []
            for count in (1, 4):
                page = browser.new_page(viewport={'width':375, 'height':792}, device_scale_factor=2, is_mobile=True, has_touch=True)
                hashes = {}
                errors = []
                def instrument(route):
                    source = route.fetch().text()
                    name = route.request.url.split('?',1)[0].rsplit('/',1)[-1]
                    hashes[name] = hashlib.sha256(source.encode()).hexdigest()
                    if 'world-' in name:
                        anchor = '  if(key!==navKey){'
                        patch = """  globalThis.segmentCamera=()=>({host,rect,stage,p,cover,stableGrid,addVisible});"""
                    else:
                        anchor = '      if(arrange){clearRelief();'
                        patch = """      if(scene.navigation?.v13Opening)globalThis.segmentHouse=()=>({
                           scene:{width:scene.width,height:scene.height},actors:actors.map(a=>({key:a.key,id:a.id,kind:a.kind,
                           w:a.w,h:a.h,x:a.x,y:a.y,bounds:bounds(a,scene)})),
                           painted:actors.map(a=>scene.navigation.visibleGround.point(a))});"""
                    assert source.count(anchor)==1, name
                    route.fulfill(content_type='text/javascript', body=source.replace(anchor, patch+'\n'+anchor))
                page.route('**/home-production-world-v13-c-*.mjs*', instrument)
                page.route('**/home-production-model-mobility-v13-c.js*', instrument)
                page.on('pageerror',lambda e:errors.append(str(e)))
                query=f'region=forest&time=day&count={count}&paused=1&clock=0&ground=on&paired=1&variant=B&season=autumn&weather=sunny'
                page.goto(f'http://127.0.0.1:{server.server_port}/game/mobility-v13-c.html?{query}',wait_until='domcontentloaded',timeout=120000)
                page.wait_for_function('window.HomeCastTrial?.ready && HomeDragTrial.opening() && window.segmentHouse && window.segmentCamera',timeout=120000)
                result=page.evaluate("""()=>({...segmentHouse(),nav:segmentCamera(),shown:HomeDragTrial.opening().actors,
                   paint:HomeBeauty.paintRect,stageDOM:document.getElementById('castStage').getBoundingClientRect().toJSON()})""")
                assert len(result['actors'])==len(result['shown'])==count and not errors
                result.update(count=count, width=375, height=792, sources=hashes, errors=errors)
                cases.append(result)
                print(count, result['actors'][0]['key'],flush=True)
                page.close()
            out.write_text(json.dumps({'browser':browser.version,'cases':cases},separators=(',',':'))+'\n')
            browser.close()
    finally:
        server.shutdown()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('dist',type=Path)
    parser.add_argument('out',type=Path)
    args=parser.parse_args()
    capture(args.dist,args.out)
