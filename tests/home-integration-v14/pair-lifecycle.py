"""Observe the hero and partner in an exact owner-launcher save under native browser layout."""
import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import hashlib
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

HERE=Path(__file__).resolve().parent
LAUNCHER=HERE.parents[1]/'tools/home-integration-v14'
SAVE='naotocchi-v14-scenario-v1'

def serve(root, assets):
    probe=(HERE/'pair-lifecycle.js').read_bytes()
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self,*args): pass
        def do_GET(self):
            path=urlsplit(self.path).path
            if path in ('/', '/launcher.js'):
                file=LAUNCHER/('index.html' if path=='/' else 'launcher.js')
            else:
                relative=path.removeprefix('/game/')
                if relative=='trial.html': relative='index.html'
                file=root/relative
                if not file.is_file() and assets: file=assets/relative
            if not file.is_file():
                self.send_error(404);return
            body=file.read_bytes()
            if file.name in ('index.html','script.js','bgm-v2.js','conversation-director.js'):
                body=body.replace(b'naotocchi-save-v1',SAVE.encode())
            if file.name=='home-production-diorama.js':
                anchor=b'return {model,update,sync,interrupt,'
                assert body.count(anchor)==1
                body=body.replace(anchor,probe+anchor)
            if file.name=='home-production-world.mjs':
                anchor=b'if(stamp===lastPaint)return;'
                assert body.count(anchor)==1
                body=body.replace(anchor,b'win.pairCanvas={left:host.left+t.left,top:host.top+t.top,width:t.width,height:t.height,region:env.region};'+anchor)
                anchor=b'const mood=atmosphere'
                assert body.count(anchor)==1
                body=body.replace(anchor,b'win.pairPaintedRegion=env.region;'+anchor)
            if file.name=='script.js':
                offset=body.rindex(b'})();')
                body=body[:offset]+b"""window.pairGame={
                 express(){if(!el.storyFlash.classList.contains('hidden'))homeV11ClearUpper();startPetExpression('happy',3000);homeDiorama.sync();return petExpressionTransient?.expression;},
                 sync(){homeDiorama.sync();},
                 travel(region){travelToRegion(findRegion(region));return state.regionId;}
                };"""+body[offset:]
            self.send_response(200);self.send_header('Content-Type',self.guess_type(str(file)))
            self.send_header('Content-Length',str(len(body)));self.end_headers()
            try:self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):pass
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    return server

def run(browser,base,region,count,out,before_navigation=False):
    context=browser.new_context(viewport=dict(width=390,height=630),is_mobile=True,has_touch=True,
                                device_scale_factor=2,locale='ja-JP',timezone_id='Asia/Tokyo')
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda e:(errors.append(str(e)),print('pageerror',e,flush=True)))
    delayed=[]
    if before_navigation:
        page.route('**/home-production-world.mjs*',lambda route:delayed.append(route))
    page.goto(base)
    page.locator('[name=region]').select_option(region)
    page.locator('[name=count]').select_option(str(count))
    page.locator('#scenario button').first.click()
    page.wait_for_url('**/game/trial.html',wait_until='domcontentloaded',timeout=90000)
    ready=f"window.pairReady && pairReady({count})"
    images=ready+" && [...document.querySelectorAll('#castStage .character-asset')].every(i=>i.complete&&i.naturalWidth)"

    if before_navigation:
        page.wait_for_function("window.pairSample && pairSample('before').bodyScale>0 && pairSample('before').actors.length===2")
        sample=page.evaluate("pairSample('before-navigation')")
        assert not sample['navigation']
        page.screenshot(path=out/f'{region}-before-navigation.jpg',type='jpeg',quality=75,scale='css')
        (out/f'{region}-before-navigation.json').write_text(json.dumps(sample))
        for route in delayed:route.continue_()
        context.close()
        return
    try: page.wait_for_function(images,timeout=90000)
    except Exception:
        print(page.evaluate("({url:location.href,observer:!!window.pairSample,stage:document.querySelector('#castStage')?.dataset, casts:[...document.querySelectorAll('#castStage .character-asset')].filter(i=>!i.naturalWidth).map(i=>i.src).slice(0,5)})"),errors,flush=True)
        raise
    result={'stages':{},'checkpoints':[],'errors':errors,'browser':browser.version}
    def capture(label):
        snapshot=page.evaluate('label=>window.pairSample(label)',label)
        result['checkpoints'].append(snapshot)
        page.screenshot(path=out/f'{region}-{label}.jpg',type='jpeg',quality=75,scale='css')
    capture('loaded')
    page.evaluate('pairGame.sync()')
    capture('explicit-sync')
    page.wait_for_function("pairGame.express()==='happy'",timeout=30000)
    result['expression']=page.locator('#petSprite').get_attribute('data-expression')
    capture('expression')
    page.wait_for_function("pairStages.some(s=>s.label==='first-navigated-pair-target')",timeout=90000)
    capture('autonomy')
    page.set_viewport_size(dict(width=375,height=615))
    page.wait_for_function(ready,timeout=90000)
    capture('resize-375')
    page.set_viewport_size(dict(width=390,height=630))
    page.wait_for_function(ready,timeout=90000)
    capture('resize-back')
    result['stages']['entry']=page.evaluate('pairStages')
    other='mountain' if region=='forest' else 'forest'
    result['travel']=page.evaluate('r=>pairGame.travel(r)',other)
    page.wait_for_function(ready+" && pairSample('check').region==="+json.dumps(other),timeout=90000)
    capture('region-change')
    result['savedRegion']=page.evaluate(f"JSON.parse(localStorage.getItem('{SAVE}')).regionId")
    page.reload(wait_until='domcontentloaded')
    page.wait_for_function(images,timeout=90000)
    capture('reload')
    result['stages']['reload']=page.evaluate('pairStages')
    assert not errors,errors
    assert result['expression']=='happy' and result['travel']==result['savedRegion']==other,result
    assert result['checkpoints'][-1]['region']==other
    (out/f'{region}.json').write_text(json.dumps(result,ensure_ascii=False))
    context.close()

def main():
    p=argparse.ArgumentParser()
    p.add_argument('root',type=Path);p.add_argument('out',type=Path)
    p.add_argument('--assets',type=Path);p.add_argument('--browser',choices=['chromium','webkit'],default='chromium')
    p.add_argument('--before-navigation',action='store_true',help='Separate screenshot run holding only the world module response')
    p.add_argument('--executable',required=True)
    p.add_argument('--region',choices=['forest','mountain'])
    args=p.parse_args()
    args.out.mkdir(parents=True,exist_ok=True)
    sources={name:hashlib.sha256((args.root/name).read_bytes()).hexdigest() for name in
             ('script.js','home-production-world.mjs','home-production-model.js','home-production-diorama.js')}
    (args.out/'sources.json').write_text(json.dumps(sources,indent=2))
    server=serve(args.root,args.assets)
    try:
        with sync_playwright() as pw:
            browser=getattr(pw,args.browser).launch(executable_path=args.executable)
            for region,count in [('forest',28),('mountain',10)]:
                if args.region and region!=args.region: continue
                run(browser,f'http://127.0.0.1:{server.server_port}',region,count,args.out,args.before_navigation)
            browser.close()
    finally:server.shutdown()

if __name__=='__main__':main()
