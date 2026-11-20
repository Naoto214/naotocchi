"""Measure trusted touch delivery, native release and actual completed walk separately."""
import argparse
import gzip
import hashlib
import json
import math
import os
import subprocess
import playwright
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
HEIGHTS = {320:568, 360:746, 375:812, 390:844, 430:932}
REGIONS = 'forest river_lake city home countryside mountain snow sea jungle desert deepsea star_stop memory_lake'.split()
MODEL_HOOK = """
    const qa=window.touchQA;
    let checkpoint;
    qa.checkpoint=()=>{
      checkpoint={actors:structuredClone(actors),selected,clock,idleAt,paused,stats:structuredClone(stats),seed:qa.readSeed?.()};
    };
    qa.restore=()=>{
      actors=structuredClone(checkpoint.actors);selected=checkpoint.selected;clock=checkpoint.clock;idleAt=checkpoint.idleAt;paused=checkpoint.paused;
      manualGoals.clear();retryingKey=null;cooldown.clear();
      Object.assign(stats,structuredClone(checkpoint.stats));qa.writeSeed?.(checkpoint.seed);
    };
    qa.proveDetour=(key,p)=>{
      const a=actor(key), box=bounds(a,scene), path=scene.navigation.route(a,p,box,q=>free(a,q));
      return path.length>1&&Math.hypot(path.at(-1).x-p.x,path.at(-1).y-p.y)<1e-5;
    };
    qa.classify=(key,p)=>{
      const a=actor(key),b=bounds(a,scene);
      const insideBounds=p.x>=b.left-1e-5&&p.x<=b.right+1e-5&&p.y>=b.top-1e-5&&p.y<=b.bottom+1e-5;
      const contacts=actors.filter(o=>o!==a&&clearance(a,p,o)<1-1e-6).map(o=>o.key);
      const straightClear=insideBounds&&(!scene.navigation||scene.navigation.segmentSafe(a,p,q=>visible(a,q)&&actors.every(o=>o===a||separated(a,q,o)||clearance(a,a,o)<1&&clearance(a,q,o)>=clearance(a,a,o)-1e-9)));
      return {insideBounds,terrain:!scene.navigation||scene.navigation.valid(p),visible:visible(a,p),contacts,straightClear};
    };
"""
STEP_AUDIT = """
        if(qa.log&&a.key===qa.key&&a.source==='drag'){
          const hop=Math.hypot(p.x-a.x,p.y-a.y), b=bounds(a,scene);
          const unsafe=!visible(a,p)||scene.navigation&&!scene.navigation.segmentSafe(a,p)||
            p.x<b.left-1e-6||p.x>b.right+1e-6||p.y<b.top-1e-6||p.y>b.bottom+1e-6||
            actors.some(o=>o!==a&&clearance(a,p,o)<1-1e-6&&clearance(a,p,o)<=clearance(a,a,o)+1e-6);
          let sweptError=0;
          for(const o of actors){
            if(o===a)continue;
            const rx=(a.w+o.w)*.5+10, ry=(a.h+o.h)*.38+10;
            const x=(a.x-o.x)/rx, y=(a.y-o.y)/ry, dx=(p.x-a.x)/rx, dy=(p.y-a.y)/ry;
            const t=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));
            const error=Math.min(1,Math.hypot(x,y))-Math.hypot(x+t*dx,y+t*dy);
            if(error>sweptError)sweptError=error;
          }
          qa.log.sweptContactViolations+=Number(sweptError>1e-9);
          qa.log.maxSweptError=Math.max(qa.log.maxSweptError,sweptError);
          qa.log.unsafeSteps+=Number(!!unsafe);qa.log.maxStep=Math.max(qa.log.maxStep,hop);
          qa.log.steps.push([+clock.toFixed(3),+p.x.toFixed(3),+p.y.toFixed(3),+(speed*dt).toFixed(4),+a.x.toFixed(3),+a.y.toFixed(3)]);
        }
"""
CONTROLLER_HOOK = """
    const qa=window.touchQA;
    qa.model=model;qa.paint=paint;qa.step=model.step;
    qa.gates=()=>({blocked:blocked(),pending:!!pendingResidentPresentation,enabled,hidden:doc.visibilityState,
      paused:!!flags.paused,trialPaused:env.HomeCastTrial.settings.paused,framework:isBlocked(),gesture:gesture?.key||null,
      reaction:doc.getElementById('castResponse')?.dataset.reaction||null,
      visibleOverlays:[...doc.querySelectorAll('[role="dialog"],.overlay')].filter(n=>n.getClientRects().length&&!n.classList.contains('hidden')).map(n=>n.id).filter(Boolean)});
    model.step=(dt,flags)=>{if(!qa.manual)qa.step(dt,flags);};
    qa.hit=(x,y)=>{const el=doc.elementFromPoint(x,y);return el&&stage.contains(el)&&!el.closest('button,a,input,select,textarea')?hit(point({clientX:x,clientY:y}),el):null;};
"""
PREFIX = 'window.touchQA??={};\n'


def once(src, needle, amend):
    if src.count(needle) != 1:
        raise ValueError(f'Expected one instrumentation anchor, found {src.count(needle)} for {needle!r}')
    return src.replace(needle, amend)


def hooks(route, hashes):
    response = route.fetch()
    name = Path(route.request.url.split('?')[0]).name
    src = response.text()
    hashes[name] = hashlib.sha256(src.encode()).hexdigest()
    if 'model' in name:
        anchor = '    return {metrics:'
        src = once(src, anchor, MODEL_HOOK + anchor)
        anchor = 'a.route=path.slice(1);a.target=path[0];a.source=source;'
        src = once(src, anchor, """if(qa.log&&key===qa.key&&source==='drag')
          qa.log.plans.push({clock,request:[p.x,p.y],chosen:[q.x,q.y],path:path.map(v=>[v.x,v.y])});""" + anchor)
        anchor = 'stats.distance+=Math.hypot(p.x-a.x,p.y-a.y);'
        src = once(src, anchor, STEP_AUDIT + anchor)
    elif 'diorama' in name:
        anchor='function clearGesture(){'
        src=once(src,anchor,anchor+"if(window.touchQA?.log&&gesture)window.touchQA.log.gates.push({type:'clear',reason:new Error().stack?.split('\\n').slice(1,5),state:window.touchQA.gates?.()});")
        anchor = 'function down(e){'
        src = once(src, anchor, CONTROLLER_HOOK + anchor)
        anchor = "const success=model.move(g.key||model.selected(),p,g.drag?'drag':'ground');"
        pointer="const success=model.move(g.key||model.selected(),p,g.drag?'drag':'ground',{pointerDrop:g.drag});"
        if pointer in src:anchor=pointer
        src = once(src, anchor, anchor + "if(qa.log)qa.log.release.push({key:g.key||model.selected(),drag:g.drag,success,at:[p.x,p.y],foot:qa.position(),actor:model.snapshot().filter(a=>a.key===qa.key).map(a=>({activity:a.activity,direction:a.direction,target:a.target}))});")
    elif 'let actorSeed=214;' in src:
        anchor = 'let actorSeed=214;'
        src = once(src, anchor, anchor + 'window.touchQA.readSeed=()=>actorSeed;window.touchQA.writeSeed=x=>{actorSeed=x;};')
    route.fulfill(response=response, body=PREFIX+src)


class WebKitTouch:
    def __init__(self, executable):
        driver=Path(playwright.__file__).parent/'driver'/'package'
        self.process=subprocess.Popen(
            ['node',str(HERE/'webkit_touch_bridge.cjs'),str(driver),executable],
            stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
        self.endpoint=json.loads(self.process.stdout.readline())['endpoint']
        self.last_points=[]

    def send(self, method, command):
        assert method=='Input.dispatchTouchEvent'
        command={'type':command['type'],'touchPoints':[
            {'id':p['id'],'x':round(p['x']),'y':round(p['y'])} for p in command['touchPoints']]}
        # WPE expects changed touch points on touchEnd/touchCancel; an empty
        # list delivers no pointerup. Chromium CDP uses remaining active points.
        if command['touchPoints']:
            self.last_points=command['touchPoints']
        elif command['type'] in ('touchEnd','touchCancel'):
            command['touchPoints']=self.last_points
            self.last_points=[]
        self.process.stdin.write(json.dumps(command)+'\n')
        self.process.stdin.flush()
        reply=json.loads(self.process.stdout.readline())
        if not reply.get('ok'):raise RuntimeError(reply)

    def close(self):
        self.process.stdin.close()
        self.process.wait(timeout=15)


def send(page, cdp, start, goal, kind):
    if kind in ('tap','paused','empty'):
        page.touchscreen.tap(*start)
        return 'touch'
    if cdp is None:
        page.mouse.move(*start)
        page.mouse.down()
        page.mouse.move(*goal,steps=6)
        page.mouse.up()
        return 'mouse'
    def dispatch(event, xy=None):
        points=[] if xy is None else [dict(x=xy[0],y=xy[1],id=1,radiusX=5,radiusY=5,force=.7)]
        cdp.send('Input.dispatchTouchEvent', {'type':event,'touchPoints':points})
    dispatch('touchStart',start)
    for fraction in (.15,.36,.59,.83,1):
        dispatch('touchMove',[x+(y-x)*fraction for x,y in zip(start,goal)])
    dispatch('touchCancel' if kind=='cancel' else 'touchEnd')
    return 'touch'


def record(frame, page, cdp, args, trial, off):
    kind,index=trial
    live=args.live
    pair=None
    if kind=='peer':
        if args.peer_reference:
            reference=json.loads(gzip.decompress(args.peer_reference.read_bytes()))
            if frame.evaluate('touchQA.opening()')!=reference['opening']:
                raise AssertionError('The two-resident reference opening changed')
            pair=dict(next(iter(reference['rows'].values()))['peer'])
            pair['fixtureSourceSha256']=hashlib.sha256(args.peer_reference.read_bytes()).hexdigest()
        else:
            pair=frame.evaluate('touchQA.findPeerPair()')
        if 'skip' in pair:return dict(kind=kind,index=index,**pair)
        index=pair['index']
    frame.evaluate('paused=>HomeCastTrial.apply({paused})', kind=='paused')
    plan=frame.evaluate('p=>touchQA.prepare(p)',dict(index=index,kind='historical' if pair else kind,autonomy=live,live=live))
    if 'skip' in plan:
        return dict(kind=kind,index=index,**plan)
    gates=frame.evaluate('touchQA.gates()')
    frame.evaluate('live=>{touchQA.manual=!live}',live)
    offset=lambda xy:[x+y for x,y in zip(off,xy)]
    source=send(page,cdp,offset(plan['start']),offset(plan['goal']),kind)
    first_selection=frame.evaluate('touchQA.model.selected()')
    if pair:
        send(page,cdp,offset(pair['press']),offset(pair['target']),'diagonal')
    if live:
        page.wait_for_timeout(700)
        frame.evaluate('touchQA.early={pos:touchQA.position(),clock:touchQA.model.metrics().clock-touchQA.beginClock}')
        # Observe the native simulation through arrival or its manual retry horizon.
        frame.wait_for_function("""touchQA.log.reactions.some(r=>r[1]==='arrive'&&r[2]==='drag')||
            touchQA.model.metrics().clock-touchQA.beginClock>=12.2""",polling=100,timeout=180000)
    elif kind not in ('cancel','tap','paused','empty'):
        frame.evaluate('touchQA.advance(.7,false)')
        frame.evaluate('touchQA.early={pos:touchQA.position(),clock:touchQA.model.metrics().clock-touchQA.beginClock}')
        frame.evaluate('touchQA.advance(11.65,false)')
    observed=frame.evaluate('touchQA.result()')
    area=plan['scale']
    def err(a,b):
        return round(math.hypot(*[(x-y)*z for x,y,z in zip(a,b,area)]),3)
    goal=[plan['modelGoal'][k] for k in ('x','y')]
    arrived=[e for e in observed['reactions'] if e[1:3]==['arrive','drag']]
    processed=observed['release']
    items=observed['pointers']
    selected=first_selection==plan['key']
    if kind=='paused' and selected: raise ValueError('Paused input changed selection')
    origin=frame.evaluate('touchQA.origin')
    matches=[]
    for ev in arrived:
        plans=[p for p in observed['plans'] if p['clock']<=ev[0]+.001]
        if plans: matches.append(err(ev[3],plans[-1]['chosen']))
    return dict(kind=kind,index=index,source=source,plan=plan,observed=observed,peer=pair,
        selectedAfterFirstGesture=first_selection,initialGates=gates,trusted=bool(items) and all(e[2] and e[1]==source for e in items),
        releasedPointErrorCss=min([err(p['at'],goal) for p in processed],default=None),
        selected=selected,issued=any(p['key']==plan['key'] and p['drag'] for p in processed),
        accepted=any(p['key']==plan['key'] and p['drag'] and p['success'] for p in processed),
        routed=bool(observed['plans']),arrivals=len(arrived), correctedErrorCss=min(matches,default=None),
        fingerErrorAtArrivalCss=min([err(ev[3],goal) for ev in arrived],default=None),
        earlyDistanceCss=err(observed['early']['pos'],origin) if observed['early'] else None,
        endDistanceCss=err(observed['end'],origin),releaseJumpCss=max([err(p['foot'],origin) for p in processed],default=None))


def cases(args):
    if args.suite=='taps':
        return [('tap',i) for i in range(args.count)]
    if args.suite=='peer':
        return [('peer',0)]
    if args.suite in ('forest','soak'):
        return [('historical',i) for i in range(args.count)]
    if args.suite=='regions':
        return [('historical',0),('diagonal',1),('occupied',min(2,args.count-1)),('tap',min(4,args.count-1))]
    if args.suite=='directions':
        return [(f'offset{angle}',0) for angle in range(0,360,45)]
    if args.suite=='focus':
        return [(kind,i) for i in dict.fromkeys((0,min(1,args.count-1),min(5,args.count-1))) for kind in ('clear','obstacle','occupied','diagonal','tap')]+[('cancel',0),('paused',1)]
    if args.suite=='threshold':
        return [('jitter',0),('threshold',0),('cancel',0),('paused',1),('empty',0)]
    if args.suite=='detour':
        return [('detour',i) for i in range(min(3,args.count))]
    if args.suite=='live':
        return [('historical',0),('diagonal',1),('occupied',2)]
    return [(kind,i) for i in args.indices for kind in args.kinds]


def write(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_suffix('.tmp')
    with gzip.open(temporary,'wt',encoding='utf-8') as stream:
        json.dump(data,stream,ensure_ascii=False,separators=(',',':'))
    temporary.replace(path)


def run(args):
    args.out.mkdir(exist_ok=True,parents=True)
    suffix='-finish' if args.version=='v5' else ''
    scripts=['home-production-model'+suffix+'.js','home-production-diorama-'+('finish' if suffix else 'population')+'.js']
    nav_names=['home-route-navigation','home-visible-ground-navigation','home-art-navigation','home-recovered-navigation']
    manifest_names=scripts+[n+suffix+'.mjs' for n in nav_names]+['population-beauty.js']
    if suffix:manifest_names+=['ground.js','ground.css','finish-policy.js','finish-seating.js']
    def live_manifest():
        base=args.url.rstrip('/')+'/game/'
        return {n:hashlib.sha256(urlopen(base+n,timeout=20).read()).hexdigest() for n in manifest_names}
    manifest=live_manifest()
    cadence={}
    if args.suite=='soak':
        reference=json.loads(gzip.decompress(args.soak_reference.read_bytes()))
        cadence={key:r['observed']['pointers'][0][5] for key,r in reference['rows'].items()}
    with sync_playwright() as pw:
        exe=os.getenv('CHROMIUM_PATH','/usr/bin/chromium') if args.engine=='chromium' else os.getenv('WEBKIT_PATH',pw.webkit.executable_path)
        wk=WebKitTouch(exe) if args.engine=='webkit' and not args.webkit_mouse else None
        browser=pw.webkit.connect(wk.endpoint) if wk else getattr(pw,args.engine).launch(executable_path=exe)
        for width in args.widths:
            for region in args.regions:
                path=args.out/f'{args.version}-{args.ground}-{args.suite}-{args.engine}-{width}-{region}-{args.count}.json.gz'
                results=json.loads(gzip.decompress(path.read_bytes())) if path.exists() else {}
                planned=cases(args)
                if args.suite=='peer' and any('selectedAfterFirstGesture' not in r for r in results.get('rows',{}).values()):
                    results={}
                old=results.get('sourceHashes',{})
                if results and (any(old.get(n)!=manifest[n] for n in scripts) or
                        any(manifest[k]!=v for k,v in results.get('manifest',{}).items())):
                    results={}
                if len(results.get('rows',{}))==len(planned):
                    if 'manifest' not in results:
                        results['manifest']=manifest
                        write(path,results)
                    continue
                pending=[trial for trial in planned if f'{trial[0]}/{trial[1]}' not in results.get('rows',{})]
                batch_size=args.count if args.suite=='soak' else 1 if args.live else 7
                for start in range(0,len(pending),batch_size):
                    batch=pending[start:start+batch_size]
                    height=HEIGHTS[width]
                    ctx=browser.new_context(viewport=dict(width=width,height=height if args.owner else height-52),
                        has_touch=True,is_mobile=True,device_scale_factor=2)
                    hashes={}
                    patterns=('*production-model*.js','*production-diorama*.js','*beauty.js')
                    for pattern in patterns:
                        ctx.route('**/'+pattern+'*',lambda route:hooks(route,hashes))
                    page=ctx.new_page()
                    errors=[]
                    page.on('pageerror',lambda err: errors.append(str(err)))
                    params=dict(region=region,count=args.count,time='day',paused=1,ground=args.ground,
                        policy='B',variant='B',layout='optimized',curve='linear',compareSplit=0)
                    url=args.url.rstrip('/') + (('/'+args.version+'/') if args.owner else
                        '/game/'+('population.html' if args.version=='v4' else 'finish.html'))+'?'+urlencode(params)
                    print('open',url,width,flush=True)
                    page.goto(url,wait_until='domcontentloaded',timeout=180000)
                    frame=page
                    off=[0,0]
                    if args.owner:
                        page.wait_for_function("document.body.dataset.ready==='true'",timeout=180000)
                        el=page.locator('iframe#home').element_handle()
                        frame=el.content_frame();box=el.bounding_box();off=[box['x'],box['y']]
                    frame.wait_for_function("window.HomeCastTrial?.ready&&!!window.touchQA?.model",timeout=180000)
                    frame.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()))")
                    frame.evaluate((HERE/'touch_probe.js').read_text())
                    frame.evaluate('touchQA.manual=true;touchQA.checkpoint()')
                    opening=frame.evaluate('touchQA.opening()')
                    if results and results['opening']!=opening: raise ValueError('Opening changed on resume')
                    results.update(version=args.version,ground=args.ground,engine=args.engine,browser=browser.version,region=region,
                        width=width,height=height,gameViewport=frame.evaluate('[innerWidth,innerHeight]'),frameOffset=off,owner=args.owner,
                        count=args.count,suite=args.suite,live=args.live,settings=frame.evaluate('HomeCastTrial.settings'),opening=opening,
                        seed=frame.evaluate('touchQA.readSeed?.()'),sourceHashes=hashes,manifest=manifest,rows=results.get('rows',{}))
                    if any(hashes[n]!=manifest[n] for n in scripts):
                        raise RuntimeError('Served source changed during run. Restart against the new package.')
                    if args.owner:
                        btn=page.locator('#freeze')
                        if btn.count():
                            btn.tap()
                            frame.wait_for_function('!HomeCastTrial.settings.paused',timeout=20000)
                    cdp=ctx.new_cdp_session(page) if args.engine=='chromium' else wk
                    for trial in batch:
                        key=f'{trial[0]}/{trial[1]}'
                        if key in results['rows']:continue
                        if args.suite=='soak':
                            delay=cadence[key]-frame.evaluate('performance.now()')
                            if delay>0:page.wait_for_timeout(delay)
                        row=record(frame,page,cdp,args,trial,off)
                        results['rows'][key]=row
                        if errors: raise RuntimeError(errors)
                        write(path,results)
                        print(region,width,args.ground,key,row.get('trusted'),row.get('accepted'),row.get('arrivals'),row.get('fingerErrorAtArrivalCss'),flush=True)
                    ctx.close()
        browser.close()
        if wk:wk.close()


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',required=True);p.add_argument('--version',choices=['v4','v5'],required=True)
    p.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
    p.add_argument('--regions',nargs='+',default=['forest'],choices=REGIONS)
    p.add_argument('--widths',type=int,nargs='+',default=[390],choices=HEIGHTS)
    p.add_argument('--count',type=int,default=28);p.add_argument('--ground',choices=['on','off'],default='off')
    p.add_argument('--suite',choices=['forest','soak','regions','focus','detour','threshold','directions','peer','taps','live','custom'],default='forest')
    p.add_argument('--indices',nargs='+',type=int,default=[0]);p.add_argument('--kinds',nargs='+',default=['historical'])
    p.add_argument('--peer-reference',type=Path,help='Replay the previously chosen two-gesture case in a new page with no exploratory model inputs')
    p.add_argument('--soak-reference',type=Path,default=HERE/'evidence'/'touch-soak'/'v5-on-forest-chromium-390-forest-28.json.gz')
    p.add_argument('--webkit-mouse',action='store_true',help='Explicit mouse fallback on WebKit builds without native touch dispatch')
    p.add_argument('--live',action='store_true');p.add_argument('--owner',action='store_true');p.add_argument('--out',type=Path,required=True)
    run(p.parse_args())
