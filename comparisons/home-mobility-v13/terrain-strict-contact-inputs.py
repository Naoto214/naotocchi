"""Check the actual strict C camera and displayed art against the static silhouette audit inputs."""
import functools,gzip,hashlib,http.server,json,math,sys,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
HERE=Path(__file__).resolve().parent

def run(dist,raw,out):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*args): pass
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(dist)))
    threading.Thread(target=server.serve_forever,daemon=True).start();results=[]
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--disable-dev-shm-usage'])
            for width,height,suffix in [(320,516,''),(375,760,''),(390,792,''),(430,880,''),(320,792,'-long-fixed')]:
                old=raw/f'forest-{width}-28{suffix}.json.gz'
                reference=json.loads(gzip.decompress(old.read_bytes()))
                page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=2,is_mobile=True,has_touch=True,timezone_id='Asia/Tokyo')
                def intercept(route):
                    resp=route.fetch();code=resp.text();marker='      if(arrange){clearRelief();'
                    assert code.count(marker)==1
                    route.fulfill(response=resp,body=code.replace(marker,'      if(scene.navigation)globalThis.strictContactScale=()=>scene.navigation.intentScale;\n'+marker))
                page.route('**/home-production-model-mobility-v13-c.js*',intercept)
                page.goto(f'http://127.0.0.1:{server.server_port}/game/mobility-v13-c.html?region=forest&time=day&count=28&paused=1&clock=0&ground=on&paired=1&variant=B&season=autumn&weather=sunny',wait_until='domcontentloaded',timeout=120000)
                page.wait_for_function('window.HomeCastTrial?.ready && HomeDragTrial.opening() && HomeBeauty.paintRect?.width',timeout=120000)
                now=page.evaluate("""()=>HomeCastTrial.inspect().map(a=>{
                    const n=document.querySelector('[data-diorama-actor="'+a.key+'"] img.character-asset'),r=n.getBoundingClientRect();
                    return {key:a.key,asset:a.asset,rect:[r.x,r.y,r.width,r.height],flip:getComputedStyle(n.parentElement).transform,
                     x:a.x,y:a.y,w:a.w,h:a.h,foot:a.foot};
                })""")
                assert len(now)==28
                maximum={};changed=[];assets={}
                for p,q in zip(reference['geometry']['people'],now):
                    assert p['key']==q['key']
                    if (p['asset'],p['flip'])!=(q['asset'],q['flip']):changed.append(q['key'])
                    assets[q['asset']]=hashlib.sha256((dist/'game'/q['asset']).read_bytes()).hexdigest()
                    comparisons={'bodyModel':[p[k]-q[k] for k in ['w','h']],'seatModel':[p[k]-q[k] for k in ['x','y']],
                      'rectCSS':[p['rect'][i]-q['rect'][i] for i in (2,3)],
                      'anchorCSS':[(p['rect'][j]-p['foot'][k])-(q['rect'][j]-q['foot'][k]) for j,k in enumerate(['x','y'])]}
                    for group,diffs in comparisons.items():maximum[group]=max(maximum.get(group,0),max(map(abs,diffs)))
                sc=page.evaluate('strictContactScale()')
                maximum['actualScale']=max(abs(sc[k]-reference['scale'][k]) for k in ['x','y'])
                compact={'region':'forest','width':width,'height':height,'scale':sc,'geometry':{'people':now},
                    'frames':[{'actors':[{'key':p['key'],'x':p['x']*sc['x'],'y':p['y']*sc['y']} for p in now]}]}
                rawout=out.parent/'terrain-strict-contact-raw';rawout.mkdir(exist_ok=True)
                (rawout/old.name).write_bytes(gzip.compress(json.dumps(compact,separators=(',',':')).encode(),mtime=0))
                results.append({'width':width,'height':height,'sourceSHA256':hashlib.sha256(old.read_bytes()).hexdigest(),
                 'changedArtworkOrMirror':changed,'maximumDifferences':maximum,
                 'assetsSHA256':hashlib.sha256(json.dumps(assets,sort_keys=True).encode()).hexdigest()})
                out.write_text(json.dumps({'browser':browser.version,'rows':results},indent=2)+'\n');page.close()
            browser.close()
    finally:server.shutdown()

if __name__=='__main__':run(Path(sys.argv[1]),Path(sys.argv[2]),Path(sys.argv[3]))
