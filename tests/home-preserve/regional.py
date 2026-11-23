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
ENTRIES = dict(production='index.html', candidate='index.html')

def once(source, key, replacement):
    if source.count(key) != 1:
        raise ValueError('Unexpected runtime anchor '+key)
    return source.replace(key, replacement)

HOP = """
  if(window.regionStepping){
    const m=window.regionTrace, hop=Math.hypot(p.x-a.x,p.y-a.y);
    window.preserveJourney.push([clock,a.key,a.source,a.x,a.y,p.x,p.y]);
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

def run(browser,root,base,region,count,width,arm,seconds,pairs=False,alternate=False,opening_probe=None,phase_observer=None):
    ctx=browser.new_context(viewport={'width':width,'height':HEIGHT[width]},device_scale_factor=2,
                             is_mobile=True,has_touch=True,timezone_id='Asia/Tokyo',locale='ja-JP')
    try:
        return measure(ctx,root,base,region,count,width,arm,seconds,pairs,alternate,opening_probe,phase_observer)
    finally:
        ctx.close()

def measure(ctx,root,base,region,count,width,arm,seconds,pairs=False,alternate=False,opening_probe=None,phase_observer=None,clocked_photo=None):
    save=seed(region,count)
    hashes={}
    seen_errors=[]
    page=ctx.new_page()
    page.on('pageerror',lambda e: seen_errors.append(str(e)))
    if clocked_photo:
        page.clock.install(time="2026-11-23T02:59:59Z")
        page.clock.pause_at("2026-11-23T03:00:00Z")
    else:
        page.clock.set_fixed_time("2026-11-23T03:00:00Z")
    ctx.add_init_script("let preserveSeed=214;Math.random=()=>((preserveSeed=(Math.imul(preserveSeed,1664525)+1013904223)>>>0)/4294967296)")
    ctx.add_init_script("""window.preserveJourney=[];window.regionTrace={hops:0,distance:0,walkers:{},sourceHops:{},terrain:0,occlusion:0,speed:0,contact:0,commands:[]};
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
            src=once(src,'const mood=atmosphere', 'if(img&&loaded)window.preservePaint={region:env.region,cover:[host.left+t.left,host.top+t.top,t.width,t.height],image:img.currentSrc.split("/").pop()};const mood=atmosphere')
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
    if clocked_photo:
        return clocked_photo(page)
    try:
        page.wait_for_function('([r,c])=>window.regional?.ready(r,c)',arg=[region,count],timeout=35000)
    except Exception as exc:
        raise RuntimeError(str(page.evaluate('()=>({probe:!!window.regional,game:window.regionGame?.state(),ready:document.readyState,stage:document.querySelector("#castStage")?.dataset.diorama})'))+str(seen_errors)) from exc
    def placement():
        page.evaluate("async()=>{window.regionalScenes=(await import('./home-production-manifest.mjs')).ART_SCENES;window.regionalInside=(await import('./home-art-navigation.mjs')).insidePolygon}")
        return page.evaluate('regional.placement()')
    extra={}
    if pairs:
        page.wait_for_function('([region,count])=>regional.ready(region,count)&&window.preservePaint?.region===region',arg=[region,count])
        placement()  # Load the geometry helpers before taking the settled snapshot.
        extra['opening']=page.evaluate('regional.stableOpening()')
        if phase_observer:phase_observer(page,'opening')
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
    observation['trajectorySha256']=page.evaluate("""async()=>{
      const bytes=new TextEncoder().encode(JSON.stringify(window.preserveJourney));
      const hash=await crypto.subtle.digest('SHA-256',bytes);
      return Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');
    }""")
    if alternate:
        return dict(target=target,tap=tap,trace=observation['trace'],trusted=observation['trusted'],errors=seen_errors)
    if pairs:extra['walked']=placement()
    if phase_observer:phase_observer(page,'walked')
    lifecycle=page.evaluate('regionGame.transitions()')
    if pairs:extra['lifecycle']=placement()
    if phase_observer:phase_observer(page,'restored')
    alt=375 if width==320 else 320
    page.set_viewport_size({'width':alt,'height':HEIGHT[alt]})
    page.wait_for_function('([r,c])=>regional.ready(r,c)',arg=[region,count],timeout=35000)
    resized=page.evaluate('regional.summary()')
    if pairs:extra['resized']=placement()
    if phase_observer:phase_observer(page,'resized')
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
        if pairs:
            lifecycle['returnGate']=page.evaluate('r=>regionGame.returnTrip(r)',region)
            if lifecycle['returnGate']['accepted']:
                page.wait_for_function('([r,c])=>regional.ready(r,c)',arg=[region,count],timeout=35000)
                extra['returnTrip']=placement()
    return dict(placements=extra,region=region,count=count,width=width,arm=arm,seconds=seconds,opening=opening,
                target=target,tap=tap,observation=observation,lifecycle=lifecycle,resized=resized,
                errors=seen_errors,sources=hashes,fixture=hashlib.sha256(json.dumps(seed(region,count),sort_keys=True).encode()).hexdigest())
