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
                body=body.replace(anchor,b'win.pairCanvas={left:host.left+t.left,top:host.top+t.top,width:t.width,height:t.height,region:env.region,revision};'+anchor)
                anchor=b'const mood=atmosphere'
                assert body.count(anchor)==1
                body=body.replace(anchor,b'win.pairPaintedRegion=env.region;'+anchor)
            if file.name=='script.js':
                offset=body.rindex(b'})();')
                body=body[:offset]+b"""window.pairGame={
                 express(){if(!el.storyFlash.classList.contains('hidden'))homeV11ClearUpper();startPetExpression('happy',3000);homeDiorama.sync();const result=el.petSprite.dataset.expression;if(result==='happy')window.pairExpressionFrame=window.pairSample('expression');return result;},
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

def run(browser,base,region,count,out,width,height,before_navigation=False,opening_only=False,hold_opening=False):
    context=browser.new_context(viewport=dict(width=width,height=height),is_mobile=True,has_touch=True,
                                device_scale_factor=2,locale='ja-JP',timezone_id='Asia/Tokyo')
    # The exact launcher household can independently trigger its first anniversary.
    # Continue past its ordinary movie controls, as an owner returning home would.
    context.add_init_script("""window.pairMovieActions=[];window.pairMovieEvents=[];
      setInterval(()=>{
        const shown=document.querySelector('#dateOverlay:not(.hidden) #dateMovie:not(.hidden)');
        if(!shown)return;
        const button=shown.querySelector('.date-movie-actions button:not(.hidden)');
        if(button){pairMovieActions.push(button.id);pairMovieEvents.push({button:button.id,ms:Math.round(performance.now())});button.click();}
      },350);""")
    if hold_opening:context.add_init_script('window.pairHoldOpening=true')
    page=context.new_page()
    page.set_default_timeout(90000)
    errors=[]
    page.on('pageerror',lambda e:(errors.append(str(e)),print('pageerror',e,flush=True)))
    delayed=[]
    if before_navigation:
        page.route('**/home-production-world.mjs*',lambda route:delayed.append(route))
    page.goto(base)
    page.locator('[name=region]').select_option(region)
    page.locator('[name=count]').select_option(str(count))
    page.locator('#scenario button').first.click()
    page.wait_for_url('**/game/trial.html',wait_until='domcontentloaded',timeout=180000)
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
    try: page.wait_for_function(images,timeout=180000)
    except Exception:
        print(page.evaluate("({url:location.href,observer:!!window.pairSample,stage:document.querySelector('#castStage')?.dataset, region:window.pairPaintedRegion,presentation:window.NaotocchiHomeViewport?.residentPresentation?.(),casts:[...document.querySelectorAll('#castStage .character-asset')].filter(i=>!i.naturalWidth).map(i=>i.src).slice(0,5)})"),errors,flush=True)
        raise
    result={'stages':{},'checkpoints':[],'errors':errors,'browser':browser.version}
    def capture(label):
        snapshot=page.evaluate("label=>label==='expression'?window.pairExpressionFrame:window.pairSample(label)",label)
        result['checkpoints'].append(snapshot)
        page.screenshot(path=out/f'{region}-{label}.jpg',type='jpeg',quality=75,scale='css')
    capture('loaded')
    if opening_only:
        result['entryMovieEvents']=page.evaluate('pairMovieEvents')
        result['stages']['entry']=page.evaluate('pairStages')
        (out/f'{region}-opening.json').write_text(json.dumps(result,ensure_ascii=False)+'\n')
        context.close()
        return
    page.evaluate('pairGame.sync()')
    capture('explicit-sync')
    result['expression']=page.wait_for_function("()=>{const value=pairGame.express();return value==='happy'&&value}",timeout=90000).json_value()
    capture('expression')
    page.wait_for_function("pairStages.some(s=>s.label==='first-autonomous-resident')",timeout=180000)
    capture('autonomy')
    alternate=(390,630) if width==375 else (375,615)
    for width,height,label in [(*alternate,f'resize-{alternate[0]}'),(width,height,'resize-back')]:
        previous=page.evaluate("pairSample('before-resize').projection")
        page.set_viewport_size(dict(width=width,height=height))
        page.wait_for_function("([count,width,previous])=>innerWidth===width && pairReady(count) && pairSample('resized').projection>previous",
                               arg=[count,width,previous],timeout=180000)
        capture(label)
    result['stages']['entry']=page.evaluate('pairStages')
    other='mountain' if region=='forest' else 'forest'
    result['travel']=page.evaluate('r=>pairGame.travel(r)',other)
    page.wait_for_function(ready+" && pairSample('check').region==="+json.dumps(other),timeout=180000)
    capture('region-change')
    result['savedRegion']=page.evaluate(f"JSON.parse(localStorage.getItem('{SAVE}')).regionId")
    result['entryMovieActions']=page.evaluate('pairMovieActions')
    result['entryMovieEvents']=page.evaluate('pairMovieEvents')
    page.reload(wait_until='domcontentloaded')
    page.wait_for_function(images,timeout=180000)
    capture('reload')
    result['stages']['reload']=page.evaluate('pairStages')
    result['reloadMovieActions']=page.evaluate('pairMovieActions')
    result['reloadMovieEvents']=page.evaluate('pairMovieEvents')
    assert not errors,errors
    assert result['expression']=='happy' and result['travel']==result['savedRegion']==other,(result['expression'],result['travel'],result['savedRegion'],other)
    assert result['checkpoints'][-1]['region']==other
    (out/f'{region}.json').write_text(json.dumps(result,ensure_ascii=False))
    context.close()

def main():
    p=argparse.ArgumentParser()
    p.add_argument('root',type=Path);p.add_argument('out',type=Path)
    p.add_argument('--assets',type=Path);p.add_argument('--browser',choices=['chromium','webkit'],default='chromium')
    p.add_argument('--width',type=int,default=390);p.add_argument('--height',type=int,default=630)
    p.add_argument('--hold-opening',action='store_true',help='Hold positive model ticks after navigation for a separate opening photograph')
    p.add_argument('--opening-only',action='store_true',help='Capture first presented frame and initial sync trace only')
    p.add_argument('--before-navigation',action='store_true',help='Separate screenshot run holding only the world module response')
    p.add_argument('--executable',required=True)
    p.add_argument('--region',choices=['forest','mountain'])
    p.add_argument('--count',type=int,choices=[4,10,20,28],help='Override the launcher resident count for the selected region')
    args=p.parse_args()
    args.out.mkdir(parents=True,exist_ok=True)
    sources={name:hashlib.sha256((args.root/name).read_bytes()).hexdigest() for name in
             ('index.html','script.js','home-production-world.mjs','home-production-model.js',
              'home-production-diorama.js','home-production-touch.js','home-production-layout.css')}
    (args.out/'sources.json').write_text(json.dumps(sources,indent=2))
    server=serve(args.root,args.assets)
    try:
        with sync_playwright() as pw:
            browser=getattr(pw,args.browser).launch(executable_path=args.executable)
            for region,count in [('forest',28),('mountain',10)]:
                if args.region and region!=args.region: continue
                run(browser,f'http://127.0.0.1:{server.server_port}',region,args.count or count,args.out,args.width,args.height,args.before_navigation,args.opening_only or args.hold_opening,args.hold_opening)
            browser.close()
    finally:server.shutdown()

if __name__=='__main__':main()
