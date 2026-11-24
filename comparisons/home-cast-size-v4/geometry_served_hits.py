"""Check role visibility and official hits with the browser's normal HTTP asset-loading path."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import hashlib
import io
import json
import os
from pathlib import Path
import threading
from types import SimpleNamespace
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
from geometry_collect import HEIGHTS,HIT_ANCHOR,PROBE,capture,get_plans

def run(a):
    game=a.game.resolve();controller=(game/'home-production-diorama-population.js').read_text()
    sha=hashlib.sha256(controller.encode()).hexdigest()
    # Only the diagnostic server adds the read-only native hit closure. The
    # browser can perform ordinary requests and no request interception is used.
    instrumented=controller.replace(HIT_ANCHOR,PROBE+HIT_ANCHOR).encode()
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self,*args):pass
        def send_head(self):
            if urlsplit(self.path).path!='/game/home-production-diorama-population.js':
                return super().send_head()
            self.send_response(200);self.send_header('Content-Type','application/javascript')
            self.send_header('Content-Length',str(len(instrumented)));self.end_headers()
            return io.BytesIO(instrumented)
    class Server(ThreadingHTTPServer):
        request_queue_size=128
        daemon_threads=True
    server=Server(('127.0.0.1',0),partial(Handler,directory=str(game.parent)))
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    args=SimpleNamespace(game=game,url=f'http://127.0.0.1:{server.server_port}/game/population.html',served_probe=True)
    result={'controllerSha256':sha,'engine':a.engine,'cases':{}}
    try:
        with sync_playwright() as pw:
            kw=({'executable_path':os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),'args':['--no-sandbox']}
                if a.engine=='chromium' else {'executable_path':os.environ['WEBKIT_PATH']} if os.getenv('WEBKIT_PATH') else {})
            browser=getattr(pw,a.engine).launch(**kw)
            result['browser']=browser.version
            for key in a.fixture:
                w,r,n,l=key.split('/');w=int(w);n=int(n)
                fixture=dict(width=w,height=HEIGHTS[w]-52,region=r,count=n)
                plans=get_plans(game,fixture)
                groups={}
                for p in ('current','B','C'):
                    spec=f'{l}/linear/{p}';groups.setdefault(json.dumps(plans[spec]),[]).append(spec)
                combined={}
                for hints,cases in groups.items():
                    pairs=[s.split('/')[1:] for s in cases]
                    sample=capture(browser,args,fixture,json.loads(hints),pairs,cases,controller)
                    for spec in cases:
                        policy=spec.split('/')[-1]
                        combined[policy]=[]
                        for t,phase in zip((0,8,30),sample['phases']):
                            gain=phase['settings']['linear/'+policy][0];g=phase['gains'][gain]
                            residents=[]
                            for m,actor in zip(g['residents'],phase['actors'],strict=True):
                                residents.append({'key':actor['key'],'kind':actor['kind'],'nativeFoot':actor['native'][:2],
                                    'inkHeight':m[0],'ink':m[1],'covered':m[2],'exposed':m[3],'correctOf3':m[4]})
                            combined[policy].append(dict(seconds=t,gain=float(gain),scene=g['scene'],residents=residents))
                result['cases'][key]=combined;a.out.write_text(json.dumps(result,separators=(',',':'))+'\n')
                print(key,list(combined),flush=True)
            browser.close()
    finally:
        server.shutdown();server.server_close()
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('game',type=Path);p.add_argument('out',type=Path)
    p.add_argument('--fixture',nargs='+',default=['320/forest/28/fixed','375/home/28/optimized'])
    p.add_argument('--engine',choices=['webkit','chromium'],default='webkit');run(p.parse_args())
