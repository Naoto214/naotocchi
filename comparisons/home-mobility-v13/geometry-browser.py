"""Run the private native game with its current painted navigation and ordinary fixture."""
import argparse, functools, hashlib, http.server, json, threading
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE=Path(__file__).resolve().parent


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):
        pass


def run(dist,out,certificate=False):
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(dist)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    rows=[]
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--disable-dev-shm-usage'])
            cases=[(375,792,'c'),(375,792,'d'),(375,792,'d-reference'),(375,760,'d'),(320,792,'d'),(390,792,'d'),(430,792,'d')]
            for width,height,arm in cases[:2] if certificate else cases:
                print(width,height,arm,flush=True)
                ctx=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2,is_mobile=True,has_touch=True,timezone_id='Asia/Tokyo')
                page=ctx.new_page(); sha={}
                page.add_init_script("""const store=window.localStorage;store.setItem('v13-geometry-sentinel','external-draft');
                window.geometryOriginalStorage=()=>store.getItem('v13-geometry-sentinel');""")
                def intercept(route):
                    response=route.fetch();source=response.text();sha['model']=hashlib.sha256(source.encode()).hexdigest()
                    start='scene.navigation.v13SeatReceipt=(function'
                    end='b=>exit.every(q=>separated(lead,q,b)));'
                    if start in source:
                        source=source.replace(start,'const seatStart=performance.now();'+start)
                        source=source.replace(end,end+'\n (globalThis.geometryCosts??=[]).push({cost:performance.now()-seatStart,receipt:scene.navigation.v13SeatReceipt});')
                    if certificate:
                        survey=(HERE.parent/'home-mobility-v11/space-probe.js').read_text()
                        hook='globalThis.geometryRays=()=>{'+survey+";return forestSpaceSurvey.rays({feet:actors.map(a=>[a.key,a.x,a.y,a.w,a.h]),sectors:96,distances:[3,8,16]}).map(r=>({key:r.key,contacts:r.contacts,dirs:r.result.map(d=>d.safe)}));};"
                        witness='globalThis.geometryInspect'  # install in the current, initialized scene at evaluation
                    anchor='      if(arrange){clearRelief();'
                    if source.count(anchor)!=1:raise ValueError('native sync anchor')
                    source=source.replace(anchor,"""      if(scene.navigation && actors.length===28){
                    globalThis.geometryInspect=()=>({feet:actors.map(a=>[a.key,a.x,a.y,a.w,a.h]),scale:scene.navigation.intentScale,
                      receipt:scene.navigation.v13SeatReceipt, costs:globalThis.geometryCosts||[], now:clock});
                    globalThis.geometryResync=()=>sync(list,next);
                    }
                    """+anchor)
                    if certificate:
                        source=source.replace(witness,hook+witness)
                    route.fulfill(response=response,body=source)
                page.route('**/home-production-model-mobility-v13-*.js*',intercept)
                query='region=forest&time=day&count=28&paused=1&clock=0&ground=on&paired=1&variant=B&season=autumn&weather=sunny'
                page.goto(f'http://127.0.0.1:{server.server_port}/game/mobility-v13-{arm}.html?'+query,wait_until='domcontentloaded',timeout=120000)
                page.wait_for_function('window.HomeCastTrial?.ready && HomeDragTrial.opening() && window.geometryInspect',timeout=100000)
                data=page.evaluate("""() => {
                  const old=geometryInspect(), timeCount=old.costs.length,raw=localStorage.getItem('naotocchi-cast-size-v1-fixture');
                  geometryResync();const now=geometryInspect();
                  return {old,saveUnchanged:raw===localStorage.getItem('naotocchi-cast-size-v1-fixture'),
                    separateStorage:geometryOriginalStorage()==='external-draft'&&localStorage.getItem('v13-geometry-sentinel')===null,
                    newSeatChecksOnResync:now.costs.length-timeCount,
                    maxResync:Math.max(...old.feet.map((a,i)=>Math.hypot((a[1]-now.feet[i][1])*old.scale.x,(a[2]-now.feet[i][2])*old.scale.y)))};
                }""")
                if certificate:
                    data['rays']=page.evaluate('geometryRays()')
                rows.append({'width':width,'height':height,'arm':arm,**sha,**data})
                out.write_text(json.dumps({'browser':browser.version,'rows':rows},separators=(',',':'))+'\n')
                ctx.close()
            browser.close()
    finally:
        server.shutdown()


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('dist',type=Path);p.add_argument('output',type=Path)
    p.add_argument('--certificate',action='store_true')
    args=p.parse_args();run(args.dist,args.output,args.certificate)
