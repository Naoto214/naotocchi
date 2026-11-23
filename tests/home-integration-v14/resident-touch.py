"""Send real Chromium touch streams to every resident on the distributed forest home."""
import argparse
import functools
import hashlib
import json
import subprocess
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import TimeoutError as BrowserTimeout, sync_playwright

HERE = Path(__file__).resolve().parent
class Static(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

def run(browser, origin, width, tap_only):
    page = browser.new_page(viewport=dict(width=width, height=792), has_touch=True,
                            is_mobile=True, device_scale_factor=2)
    save = subprocess.check_output(['node', str(HERE/'resident-save.cjs')],text=True)
    page.add_init_script("""let n=214;Math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
      const seed=""" + save + """;seed.savedAt=Date.now();localStorage.setItem('naotocchi-save-v1',JSON.stringify(seed));
      localStorage.setItem('naotocchi-save-v1:home-guide-v1','done');""")
    errors=[]
    page.on('pageerror', lambda error:errors.append(str(error)))
    def observe(route):
        response=route.fetch()
        source=response.text()
        anchor='    function down(e){'
        assert source.count(anchor)==1
        route.fulfill(response=response,body=source.replace(anchor,(HERE/'resident-touch-probe.js').read_text()+'\n'+anchor))
    page.route('**/home-production-diorama.js*',observe)
    page.goto(origin,wait_until='load',timeout=120000)
    page.wait_for_function('window.residentTouches?.ready()',timeout=90000)
    keys=page.evaluate('residentTouches.keys()')
    cdp=page.context.new_cdp_session(page)
    for key in keys:
        plan=page.evaluate('key=>residentTouches.prepare(key)',key)
        start,goal=plan['from'],plan['goal']
        events = [('touchStart',0),('touchEnd',0)] if tap_only else [('touchStart',0),('touchMove',.35),('touchMove',.7),('touchMove',1),('touchEnd',1)]
        for typ,fraction in events:
            points=[] if typ=='touchEnd' else [dict(id=1,x=round(start[0]+(goal[0]-start[0])*fraction),
                y=round(start[1]+(goal[1]-start[1])*fraction),radiusX=4,radiusY=4,force=.7)]
            cdp.send('Input.dispatchTouchEvent',dict(type=typ,touchPoints=points))
        timed_out=False
        try:
            page.wait_for_function('residentTouches.settled()',timeout=7000,polling=100)
        except BrowserTimeout:
            timed_out=True
        page.evaluate('timedOut=>residentTouches.record(timedOut)',timed_out)
        page.wait_for_timeout(170)
    if not tap_only:
        page.wait_for_timeout(14000)
    rows=page.evaluate('residentTouches.finish()')
    page.close()
    assert len(rows)==len(set(keys))==28
    return dict(width=width,rows=rows,errors=errors)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('game',type=Path)
    parser.add_argument('output',type=Path)
    parser.add_argument('--widths',type=int,nargs='+',default=[320,390])
    parser.add_argument('--tap-only',action='store_true')
    parser.add_argument('--chromium',default='/usr/bin/chromium')
    args=parser.parse_args()
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Static,directory=args.game))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=args.chromium)
        out=dict(action='tap' if args.tap_only else 'drag',engine='Chromium',version=browser.version,rendererSHA256=hashlib.sha256(
            (args.game/'home-production-diorama.js').read_bytes()).hexdigest(),cases=[])
        for width in args.widths:
            out['cases'].append(run(browser,f'http://127.0.0.1:{server.server_port}/',width,args.tap_only))
            data=json.dumps(out,ensure_ascii=False,separators=(',',':')).replace('},{"key"', '},\n{"key"')
            args.output.write_text(data+'\n')
            print(width,len(out['cases'][-1]['rows']),flush=True)
        browser.close()
    for case in out['cases']:
        assert not case['errors'], case['errors']
        for row in case['rows']:
            assert row['targetVisible'] and row['selected']==row['key'], row
            assert row['events']==[['pointerdown','touch',True],['pointerup','touch',True]], row
            if not args.tap_only:
                assert [command['key'] for command in row['commands']]==[row['key']], row
