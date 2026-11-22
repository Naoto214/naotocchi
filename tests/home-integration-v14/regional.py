"""Matched native Chromium regression on disposable localhost pages, one independent region per job."""
import argparse
import functools
import hashlib
import http.server
import json
import os
from pathlib import Path
import re
import subprocess
import threading
from urllib.parse import urlencode, urlsplit

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
REGIONS = 'home forest river_lake city countryside mountain snow sea jungle desert deepsea star_stop memory_lake'.split()
HEIGHT = {320:516,375:615,390:630,430:695}
ENTRIES = dict(production='index.html', candidate='index.html', prior='index.html', v11='mobility-v11-foot.html', v13='mobility-v13-a.html')

def once(source, key, replacement):
    if source.count(key) != 1:
        raise ValueError('Unexpected runtime anchor '+key)
    return source.replace(key, replacement)

HOP = """
  if(window.regionStepping){
    const m=window.regionTrace, hop=Math.hypot(p.x-a.x,p.y-a.y);
    m.hops++; m.distance+=hop; m.sourceHops[a.source]=(m.sourceHops[a.source]||0)+1;
    m.walkers[a.key]=(m.walkers[a.key]||0)+hop;
    if(!scene.navigation.segmentSafe(a,p))m.terrain++;
    if(!scene.visible(p,a))m.occlusion++;
    if(hop>speed*dt+1e-7)m.speed++;
    for(const b of actors){
      if(b===a)continue;
      const rx=(a.w+b.w)*.5+10,ry=(a.h+b.h)*.38+10;
      const x=(a.x-b.x)/rx,y=(a.y-b.y)/ry,dx=(p.x-a.x)/rx,dy=(p.y-a.y)/ry;
      const t=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));
      const before=Math.hypot(x,y),closest=Math.hypot(x+t*dx,y+t*dy);
      if(closest+1e-7<Math.min(1,before)){
        m.contact++;
        if((m.witnesses||=[]).length<10)m.witnesses.push({clock,actor:a.key,peer:b.key,source:a.source,
          from:[a.x,a.y],to:[p.x,p.y],peerFoot:[b.x,b.y],radii:[rx,ry],before,closest});
      }
    }
  }
"""

@functools.cache
def seed(region,count):
    return json.loads(subprocess.check_output(['node',str(HERE/'resident-save.cjs'),region,str(count)]))

def serve(root):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*args): pass
    httpd=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root)))
    threading.Thread(target=httpd.serve_forever,daemon=True).start()
    return 'http://127.0.0.1:'+str(httpd.server_port)

def run(browser,root,base,region,count,width,arm,seconds,pairs=False,alternate=False,opening_probe=None):
    ctx=browser.new_context(viewport={'width':width,'height':HEIGHT[width]},device_scale_factor=2,
                             is_mobile=True,has_touch=True,timezone_id='Asia/Tokyo',locale='ja-JP')
    try:
        return measure(ctx,root,base,region,count,width,arm,seconds,pairs,alternate,opening_probe)
    finally:
        ctx.close()

def measure(ctx,root,base,region,count,width,arm,seconds,pairs=False,alternate=False,opening_probe=None):
    save=seed(region,count)
    hashes={}
    seen_errors=[]
    page=ctx.new_page()
    page.on('pageerror',lambda e: seen_errors.append(str(e)))
    ctx.add_init_script("""window.regionTrace={hops:0,distance:0,walkers:{},sourceHops:{},terrain:0,occlusion:0,speed:0,contact:0,commands:[]};
      let regionalSeed=214;window.regionalRandom=()=>{regionalSeed=(Math.imul(regionalSeed,1664525)+1013904223)>>>0;return regionalSeed/4294967296};
      document.addEventListener('pointerup',e=>window.regionalTrusted=e.isTrusted&&e.pointerType==='touch',true);""")
    def patch(route):
        name=Path(urlsplit(route.request.url).path).name
        src=(root/name).read_text()
        hashes[name]=hashlib.sha256(src.encode()).hexdigest()
        if name.startswith('home-production-model'):
            anchor='stats.distance+=Math.hypot(p.x-a.x,p.y-a.y);'
            src=once(src,anchor,HOP+anchor)
            anchor='function step(dt,flags={}){'
            src=once(src,anchor,anchor+'if(dt>0&&!window.regionStepping)return;')
        elif name == 'home-production-world.mjs':
            anchor='if(stamp===lastPaint)return;'
            observe="""
            if(window.regionalMeasuringArt) {
              window.regionalPaintedCover=[host.left+t.left,host.top+t.top,t.width,t.height];
              return;
            }
            """
            src=once(src,anchor,observe+anchor)
        elif name.startswith('home-production-diorama'):
            src=re.sub(r'modelAPI.createModel\(\{(?:random:env.HomeBeauty.actorRandom,)?onEvent:emit\}\)',
                       'modelAPI.createModel({random:window.regionalRandom,onEvent:emit})',src)
            anchor='return {model,update,sync,interrupt,'
            probe=(HERE/'regional-probe.js').read_text()
            if pairs:probe+=(HERE/'pair-probe.js').read_text()
            if opening_probe:
                probe+=opening_probe
            if alternate:
                probe+=(HERE/'drag-clearance.js').read_text()+'\nregional.clearance=surroundingClearance;\n'
            src=once(src,anchor,probe+anchor)
        else:
            key=re.search(r"const SAVE_KEY = '([^']+)'",src)[1]
            prefix=f"(()=>{{if(localStorage.getItem({json.dumps(key)}))return;let s={json.dumps(save)};s.savedAt=Date.now(); localStorage.setItem({json.dumps(key)},JSON.stringify(s));localStorage.setItem({json.dumps(key+':home-guide-v1')},'done')}})();\n"
            suffix=src.rindex('})();')
            src=prefix+src[:suffix]+(HERE/'regional-game.js').read_text()+src[suffix:]
        route.fulfill(content_type='text/javascript',body=src)
    page.route(re.compile(r'/(home-production-(model|diorama)[\w-]*|script(?:-v2-mobility-v7)?)\.js(?:\?|$)'),patch)
    if pairs:
        page.route(re.compile(r'/home-production-world\.mjs(?:\?|$)'),patch)
    query=urlencode(dict(region=region,count=count,policy='B',gear='none',time='day',season='autumn',weather='sunny',speed=1))
    page.goto(base+'/'+ENTRIES[arm]+'?'+query,wait_until='domcontentloaded',timeout=60000)
    try:
        page.wait_for_function('([r,c])=>window.regional?.ready(r,c)',arg=[region,count],timeout=35000)
    except Exception as exc:
        raise RuntimeError(str(page.evaluate('()=>({probe:!!window.regional,game:window.regionGame?.state(),ready:document.readyState,stage:document.querySelector("#castStage")?.dataset.diorama})'))+str(seen_errors)) from exc
    def placement():
        page.evaluate("async()=>{window.regionalScenes=(await import('./home-production-manifest.mjs')).ART_SCENES;window.regionalInside=(await import('./home-art-navigation.mjs')).insidePolygon}")
        return page.evaluate('regional.placement()')
    extra={}
    if pairs:
        extra['opening']=placement()
        if opening_probe:
            return page.evaluate('regional.measureOpening()')
        extra['sync']=page.evaluate('regional.resync()')
    opening=page.evaluate('regional.summary()')
    target=page.evaluate('regional.target()')
    cdp=ctx.new_cdp_session(page)
    def touch(kind,xy):
        cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[dict(x=xy[0],y=xy[1])] if xy else []})
    if target:
        touch('touchStart',target['from']);touch('touchEnd',None)
        tap=page.evaluate('regional.summary().selected')
        if alternate:
            if type(alternate) is int:
                page.evaluate('radius=>window.regionalDragRadii=[radius]',alternate)
            target['clearance']=page.evaluate('regional.clearance().radii.at(-1)')
            target['originalGoal']=target['goal']
            target['goal']=target['clearance']['alternate'] or target['goal']
        touch('touchStart',target['from']);touch('touchMove',target['goal']);touch('touchEnd',None)
    else:
        tap=None
    page.evaluate('n=>regional.advance(n)',seconds)
    observation=page.evaluate('()=>({trace:regionTrace,trusted:window.regionalTrusted||false,end:regional.summary()})')
    if alternate:
        return dict(target=target,tap=tap,trace=observation['trace'],trusted=observation['trusted'],errors=seen_errors)
    if pairs:extra['walked']=placement()
    lifecycle=page.evaluate('regionGame.transitions()')
    if pairs:extra['lifecycle']=placement()
    alt=375 if width==320 else 320
    page.set_viewport_size({'width':alt,'height':HEIGHT[alt]})
    page.wait_for_function('([r,c])=>regional.ready(r,c)',arg=[region,count],timeout=35000)
    resized=page.evaluate('regional.summary()')
    if pairs:extra['resized']=placement()
    save=lifecycle.pop('save')
    page.reload(wait_until='domcontentloaded')
    page.wait_for_function('([r,c])=>window.regional?.ready(r,c)',arg=[region,count],timeout=35000)
    lifecycle['reloaded']=page.evaluate('regionGame.state()')
    if pairs:
        extra['reload']=placement()
        destination='forest' if region=='home' else 'home'
        page.evaluate('r=>regionGame.travel(r)', destination)
        page.wait_for_function('([r,c])=>regional.ready(r,c)',arg=[destination,count],timeout=35000)
        extra['travel']=placement()
        if arm=='candidate':
            lifecycle['returnGate']=page.evaluate('r=>regionGame.returnTrip(r)',region)
            if lifecycle['returnGate']['accepted']:
                page.wait_for_function('([r,c])=>regional.ready(r,c)',arg=[region,count],timeout=35000)
                extra['returnTrip']=placement()
    return dict(placements=extra,region=region,count=count,width=width,arm=arm,seconds=seconds,opening=opening,
                target=target,tap=tap,observation=observation,lifecycle=lifecycle,resized=resized,
                errors=seen_errors,sources=hashes)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    for name in ['production','candidate','historical','out']:p.add_argument('--'+name,type=Path,required=True)
    p.add_argument('--pairs',action='store_true')
    p.add_argument('--prior',type=Path)
    p.add_argument('--region',choices=REGIONS,required=True)
    p.add_argument('--arms',nargs='+',choices=ENTRIES,default=['production','candidate','v11','v13'])
    p.add_argument('--counts',nargs='+',type=int,default=[1,4,10,20,28])
    p.add_argument('--widths',nargs='+',type=int,default=list(HEIGHT))
    p.add_argument('--seconds',type=int,default=30)
    a=p.parse_args()
    roots=dict(production=a.production,candidate=a.candidate,prior=a.prior or a.candidate,v11=a.historical,v13=a.historical)
    bases={root:serve(root) for root in set(roots.values())}
    a.out.mkdir(exist_ok=True,parents=True)
    failed=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--disable-dev-shm-usage'])
        for n in a.counts:
            for w in a.widths:
                for arm in a.arms:
                    key=f'{a.region}-{n}-{w}-{arm}'
                    try:
                        row=run(browser,roots[arm],bases[roots[arm]],a.region,n,w,arm,a.seconds,a.pairs)
                        trace=row['observation']['trace']
                        if a.pairs and arm=='candidate' and row['target'] and not trace['sourceHops'].get('drag') and any(c['name']=='move' for c in trace['commands']):
                            row['alternate']=run(browser,roots[arm],bases[roots[arm]],a.region,n,w,arm,a.seconds,True,True)
                        (a.out/(key+'.json')).write_text(json.dumps(row,sort_keys=True))
                        print(key,row['observation']['trace']['hops'],flush=True)
                    except Exception as e:
                        failed.append(key)
                        print(key,type(e).__name__,str(e),flush=True)
                        (a.out/(key+'.error')).write_text(str(e))
        browser.close()
    if failed:raise SystemExit('Incomplete: '+','.join(failed))
if __name__=='__main__':main()
