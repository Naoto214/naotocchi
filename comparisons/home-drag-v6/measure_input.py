"""Paired trusted-finger comparison of the two production-home drag controllers."""
import argparse
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

from reaction_input import CASES as GATE_CASES, check_gate

HERE = Path(__file__).resolve().parent
V5 = HERE.parent / 'home-finish-v5'
spec = importlib.util.spec_from_file_location('frozen_v5_touch', V5/'verify_touch.py')
old = importlib.util.module_from_spec(spec)
spec.loader.exec_module(old)
REGIONS = old.REGIONS
WIDTHS = [320, 375, 390, 430]
COUNTS = [1, 4, 10, 20, 28]
once = old.once

MOVE_OBSERVER = """
    const nativeMove=model.move;
    model.move=function(key,p,source,options){
      const log=window.touchQA.log;
      if(!log || !options?.pointerDrop) return nativeMove.call(this,key,p,source,options);
      const tic=performance.now();let accepted=false;
      try {accepted=nativeMove.call(this,key,p,source,options);return accepted;}
      finally {
        (log.directRequests||=[]).push({key,source,request:[p.x,p.y],accepted,wall:performance.now(),
          ms:performance.now()-tic,clock:model.metrics().clock,foot:qa.position()});
      }
    };
"""
MODEL_STATE = """
    qa.demand=()=>{
      const a=actor(qa.key), r=manualGoals.get(qa.key);
      return {clock,activity:a?.activity,source:a?.source,direction:a?.direction,target:a?.target||null,
        pending:!!r,retries:r?.retries??null,expires:r?.expires??null,
        yieldPeer:r?.yieldPeer??null,routeLength:a?.route?.length||0};
    };
"""
PEER_STEP = """
        if(qa.log && a.key!==qa.key) {
          const pLog=(qa.log.peerTrace||={});
          const rec=pLog[a.key]||={steps:0,distance:0,maxStep:0,unsafe:0,swept:0,start:[a.x,a.y],source:a.source};
          const hop=Math.hypot(p.x-a.x,p.y-a.y);
          rec.steps++;rec.distance+=hop;rec.maxStep=Math.max(rec.maxStep,hop);rec.end=[p.x,p.y];
          const limit=bounds(a,scene);
          if(!visible(a,p)||(scene.navigation&&!scene.navigation.segmentSafe(a,p))||
            p.x<limit.left-1e-6||p.x>limit.right+1e-6||p.y<limit.top-1e-6||p.y>limit.bottom+1e-6||hop>speed*dt+1e-5)rec.unsafe++;
          for(const b of actors){
            if(a===b)continue;
            const rx=(a.w+b.w)*.5+10,ry=(a.h+b.h)*.38+10;
            const x=(a.x-b.x)/rx,y=(a.y-b.y)/ry,dx=(p.x-a.x)/rx,dy=(p.y-a.y)/ry;
            const t=Math.max(0,Math.min(1,-(x*dx+y*dy)/(dx*dx+dy*dy||1)));
            if(Math.min(1,Math.hypot(x,y))-Math.hypot(x+t*dx,y+t*dy)>1e-9)rec.swept++;
          }
        }
"""


def search_hooks(src):
    """Time graph traversals, excluding routes answered by a straight segment."""
    for name in ('route', 'reachable'):
        start = src.index(' function '+name+'(')
        end = src.index('\n }', start)
        part = src[start:end]
        anchor = '  const {nodes,neighbors}=grid('
        part = once(part, anchor, """  const measure=globalThis.touchQA?.log;
  const searchAt=measure?performance.now():0;
  try {
""" + anchor)
        part += "\n  } finally {if(measure)(measure.searches||=[]).push({kind:'"+name+"',phase:measure.phase||'simulation',ms:performance.now()-searchAt});}"
        src = src[:start]+part+src[end:]
    return src


def patch_source(name, src):
    if name=='drag-trial-hooks.js' and 'let seed = 214;' in src:
        anchor='let seed = 214;'
        return once(src,anchor,anchor+'window.touchQA.readSeed=()=>seed;window.touchQA.writeSeed=x=>{seed=x;};')
    if name.startswith('script-v2'):
        anchor='  function homeDioramaBlocked('
        return once(src,anchor,(HERE/'gate_probe.js').read_text()+anchor)
    if 'route-navigation' in name:
        return search_hooks(src)
    if 'model' in name:
        anchor='    return {metrics:'
        src=once(src,anchor,old.MODEL_HOOK+MODEL_STATE+anchor)
        # Include synchronous native move and every later replan for this demand.
        begin="    function move(key,p,source='tap',{pointerDrop=false}={}){"
        src=once(src,begin,begin+"""
      const sink=globalThis.touchQA?.log,tic=sink?performance.now():0;
      try {
""")
        end='    }\n    function idle(a){'
        src=once(src,end,"""      } finally {
        if(sink&&pointerDrop)(sink.modelPlans||=[]).push({key,clock,retry:retryingKey===key,ms:performance.now()-tic});
      }
"""+end)
        anchor='a.route=path.slice(1);a.target=path[0];a.source=source;'
        src=once(src,anchor,"""if(qa.log&&source==='drag'&&key===qa.key)
          qa.log.plans.push({clock,request:[p.x,p.y],chosen:[q.x,q.y],path:path.map(v=>[v.x,v.y])});
        """+anchor)
        anchor='stats.distance+=Math.hypot(p.x-a.x,p.y-a.y);'
        return old.PREFIX+once(src,anchor,old.STEP_AUDIT+PEER_STEP+anchor)
    if 'diorama' in name:
        anchor='function down(e){'
        controller=old.CONTROLLER_HOOK.replace('if(!qa.manual)qa.step(dt,flags);','if(qa.gateClock)qa.step(dt,{...flags,autonomy:false});else if(!qa.manual)qa.step(dt,flags);')
        waiting="()=>waitingDrop?{key:waitingDrop.key,point:waitingDrop.point,expires:waitingDrop.expires}:null" if 'function serviceWaitingDrop(){' in src else '()=>null'
        refused="()=>refusedDrop?{key:refusedDrop.key,expires:refusedDrop.expires,point:refusedDrop.point}:null" if 'refusedDrop=null' in src else '()=>null'
        return old.PREFIX+once(src,anchor,controller+MOVE_OBSERVER+'qa.waiting='+waiting+';qa.refused='+refused+';\n'+anchor)
    if 'let actorSeed=214;' in src:
        anchor='let actorSeed=214;'
        return old.PREFIX+once(src,anchor,anchor+'window.touchQA.readSeed=()=>actorSeed;window.touchQA.writeSeed=x=>{actorSeed=x;};')
    return src


def cases(suite,count):
    historic=('historical',0)
    diagonal=('diagonal',min(1,count-1))
    occupied=('occupied',min(2,count-1))
    if suite=='live':return [('historical',i) for i in (min(17,count-1),min(2,count-1))]
    if suite=='gates':return [(key,0) for key in GATE_CASES]
    if suite=='forest':
        return [('historical',i) for i in range(count)]
    if suite=='region':
        return [historic, diagonal, occupied]
    if suite=='matrix':
        return [historic, diagonal, occupied, ('clear',0), ('obstacle',0), ('tap',min(4,count-1))]
    if suite=='gestures':
        return [('tap',0),('jitter',0),('threshold',0),('cancel',0),('empty',0),('paused',0)]
    if suite=='feedback':
        return [('historical',i) for i in (0,min(2,count-1))]
    if suite=='directions':
        return [(f'offset{deg}',0) for deg in range(0,360,45)]
    if suite=='detour':
        return [('detour',i) for i in range(min(3,count))]
    raise ValueError(suite)


def round_ms(value):
    return round(value,3) if value is not None else None


def trial(page, touch, index, kind, paired=None, *, feedback=False,live=False):
    page.evaluate('paused=>HomeCastTrial.apply({paused})',kind=='paused')
    if kind=='occupied' and page.evaluate('touchQA.model.snapshot().length')==1:
        return {'index':index,'key':page.evaluate('touchQA.model.snapshot()[0].key'),'kind':kind,'skip':'single resident; no occupied peer'}
    if paired and paired['skip']:
        return {k:paired[k] for k in ('index','key','kind','skip')}
    plan=page.evaluate('p=>touchQA.prepare(p)',{'index':index,'kind':'historical' if paired else kind})
    if plan.get('skip'):
        return {'index':index,'key':plan['key'],'kind':kind,'skip':plan['skip']}
    if paired:
        assert plan['key']==paired['key'] and plan['foot']==paired['foot'], (plan,paired)
        plan['start'],plan['goal']=paired['start'],paired['goal']
        plan['modelGoal']=dict(zip(('x','y'),paired['modelGoal']))
        plan['requestClass']=page.evaluate('p=>touchQA.classify(p.key,p.modelGoal)',plan)
    start,goal=plan['start'],plan['goal']
    first=page.evaluate('touchQA.position()')
    stage_ready=page.evaluate('touchQA.gates()')
    if live:page.evaluate('touchQA.manual=false')
    old.send(page,touch,start,goal,kind)
    just_released=page.evaluate('touchQA.demand()')
    selected=page.evaluate('touchQA.model.selected()')
    # Native event queue and the first post-release frame are wall-time observations.
    page.evaluate('new Promise(requestAnimationFrame)')
    feedback_times=[]
    if feedback:
        for at in (0,120,350,650):
            point=page.evaluate('x=>new Promise(r=>setTimeout(()=>r({wall:performance.now()-touchQA.log.inputTimes.pointerup.end,marker:!document.querySelector(".diorama-target").hidden,refused:touchQA.refused(),waiting:touchQA.waiting()}),Math.max(0,x-performance.now()+touchQA.log.inputTimes.pointerup.end)))',at)
            feedback_times.append(point)
    is_drop=kind not in ('tap','paused','cancel','empty','jitter')
    if live:
        page.wait_for_timeout(700)
        page.evaluate('touchQA.early=touchQA.position();touchQA.log.earlyDemand=touchQA.demand()')
        page.wait_for_function('touchQA.model.metrics().clock-touchQA.beginClock>=12.35',polling=100,timeout=150000)
    elif is_drop:
        page.evaluate('touchQA.advance(.7,false);touchQA.early=touchQA.position();touchQA.log.earlyDemand=touchQA.demand();touchQA.advance(11.65,false)')
    end_demand=page.evaluate('touchQA.demand()')
    result=page.evaluate('touchQA.result()')
    requested=[plan['modelGoal'][k] for k in ('x','y')]
    sx,sy=plan['scale']
    def err(a,b):
        return round(math.hypot((a[0]-b[0])*sx,(a[1]-b[1])*sy),3)
    moves=result.get('directRequests',[])
    native=next((q for q in moves if q['key']==plan['key']),None)
    plans=result['plans']
    arrivals=[r for r in result['reactions'] if r[1:3]==['arrive','drag']]
    closest=min([err(r[3],requested) for r in arrivals],default=None)
    corrected=[]
    for ev in arrivals:
        preceding=[p for p in plans if p['clock']<=ev[0]+.001]
        if preceding:corrected.append(err(ev[3],preceding[-1]['chosen']))
    event_result=result.get('inputTimes',{})
    phase=event_result.get('pointercancel' if kind=='cancel' else 'pointerup',{})
    terminal_expected='pointercancel' if kind=='cancel' else 'pointerup'
    events=result['pointers']
    trusted=bool(events) and all(e[1]=='touch' and e[2] for e in events) and events[0][0]=='pointerdown' and events[-1][0]==terminal_expected
    searches=result.get('searches',[])
    goal_class=plan['requestClass']
    accepted=bool(native and native['accepted'])
    blocked=None
    if is_drop and not arrivals:
        if stage_ready['blocked'] or any(g.get('state',{}).get('blocked') for g in result['gates']):
            blocked='input-gated'
        elif selected!=plan['key']:blocked='selection-miss'
        elif not native:blocked='not-issued'
        elif not goal_class['insideBounds']:blocked='outside-actor-bounds'
        elif not goal_class['terrain']:blocked='non-ground'
        elif not goal_class['visible']:blocked='occluded'
        elif goal_class['contacts']:blocked='occupied'
        elif not goal_class['straightClear']:blocked='blocked-segment'
        else:blocked='no-arrival-in-window'
    peers=result.get('peerTrace',{})
    release_ms=phase['end']-phase['begin'] if 'end' in phase else None
    queue_ms=phase['begin']-phase['eventStamp'] if phase else None
    frame_ms=phase['frame']-phase['eventStamp'] if 'frame' in phase else None
    aimed=err(first,requested)
    at_chosen=err(result['end'],plans[-1]['chosen']) if plans else None
    arrived_final=bool(result['steps'] and plans and not end_demand['target'] and at_chosen<=.01)
    final_error=err(result['end'],requested)
    speed_errors=sum(math.hypot(v[1]-v[4],v[2]-v[5])>v[3]+.002 for v in result['steps'])
    min_step=min((err(v[1:3],requested) for v in result['steps']),default=None)
    return dict(index=index,key=plan['key'],kind=kind,skip=None,start=start,goal=goal,foot=plan['foot'],
        origin=first,modelGoal=requested,scale=plan['scale'],goalClass=goal_class,startClass=plan['startClass'],
        trusted=trusted,selected=selected==plan['key'],selectedKey=selected,issued=bool(native),accepted=accepted,
        routed=bool(plans),arrived=bool(arrivals),moved=bool(result['steps']) and err(result['end'],first)>1,
        near4=closest is not None and closest<=4,fingerErrorCss=closest,correctedErrorCss=min(corrected,default=None),
        arrivalClock=min([r[0] for r in arrivals],default=None),endDistanceCss=err(result['end'],first),
        earlyDistanceCss=err(result['early'],first) if result['early'] is not None else None,
        endFingerErrorCss=final_error,aimDistanceCss=aimed,blockedClass=blocked,
        terminalArrived=arrived_final,terminalNear4=arrived_final and final_error<=4,
        terminalChosenErrorCss=at_chosen,minStepFingerErrorCss=min_step,
        unsafeSteps=result['unsafeSteps']+speed_errors+sum(v['unsafe'] for v in peers.values()),
        sweptViolations=result['sweptContactViolations']+sum(v['swept'] for v in peers.values()),
        releaseJumpCss=err(native['foot'],first) if native else None,releaseMs=round_ms(release_ms),
        pointerQueueMs=round_ms(queue_ms),releaseFrameMs=round_ms(frame_ms),
        modelMoveMs=round_ms(native['ms']) if native else None,
        pressToSelectionMs=round_ms(event_result.get('pointerdown',{}).get('timeToVisual')),
        searchCount=len(searches),searchMaxMs=round_ms(max((s['ms'] for s in searches),default=0)),
        searchTotalMs=round_ms(sum(s['ms'] for s in searches)),searches=searches,pointerEvents=events,
        eventTimes=event_result,reactions=result['reactions'],plans=plans,peerWalk=peers,stepCount=len(result['steps']),
        nativePlans=result.get('modelPlans',[]),demandAtRelease=just_released,demandAtEarly=result.get('earlyDemand'),demandAtEnd=end_demand,
        releaseGoalErrorCss=err(native['request'],requested) if native else None,end=result['end'],visualDown=result.get('visualDown'),initialGate=stage_ready,releaseGate=phase.get('gate'),
        markers=result.get('markers',[]),feedbackTimeline=feedback_times)


def run_arm(browser, origin, region, count, width, engine, suite, version, reference=None, touch_session=None):
    arm={}
    params=dict(region=region,count=count,time='day',paused=1,ground='on',variant='B',policy='B',
                layout='optimized',curve='linear',compareSplit=0)
    canonical=engine=='webkit' or suite=='matrix'
    if canonical:params['paired']=1
    url=origin.rstrip('/')+'/game/drag-'+version+'.html?'+urlencode(params)
    declared=cases(suite,count)
    batch_size=1 if suite in ('gates','live') else 7
    for batch_start in range(0,len(declared),batch_size):
        ctx=browser.new_context(viewport={'width':width,'height':old.HEIGHTS[width]-52},has_touch=True,is_mobile=True,device_scale_factor=2)
        hashes,errors={},[]
        def instrument(route):
            try:
                response=route.fetch()
                name=Path(route.request.url.split('?')[0]).name
                src=response.text()
                hashes[name]=hashlib.sha256(src.encode()).hexdigest()
                body=patch_source(name,src)
                route.fulfill(response=response,body=body)
            except Exception as exc:
                errors.append(str(exc))
                route.abort()
        for pattern in ('*production-model*.js*','*production-diorama*.js*','*route-navigation*.mjs*','*population-beauty.js*','script-v2*.js*','drag-trial-hooks.js*'):
            ctx.route('**/'+pattern,instrument)
        page=ctx.new_page()
        page.on('pageerror',lambda err:errors.append(str(err)))
        try:
            page.goto(url,wait_until='domcontentloaded',timeout=90000)
            if errors:raise RuntimeError(errors)
            page.wait_for_function("window.HomeCastTrial?.ready&&window.touchQA?.model",timeout=55000)
            if canonical:page.wait_for_function('!!window.HomeDragTrial?.opening()',timeout=55000)
            page.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()))")
            page.evaluate((V5/'touch_probe.js').read_text())
            page.evaluate((HERE/'input_probe.js').read_text())
            page.evaluate('touchQA.manual=true;touchQA.checkpoint()')
            opening=page.evaluate('touchQA.opening()')
            seed=page.evaluate('touchQA.readSeed()')
            if len(opening)!=count:raise ValueError(('incorrect roster',len(opening),count))
            if arm and (arm['opening']!=opening or arm['seed']!=seed or arm['hashes']!=hashes):
                raise ValueError('Opening or source changed between fresh context batches')
            if reference and (reference['opening']!=opening or reference['seed']!=seed):
                raise ValueError('Opening or seed differs between arms')
            arm.update(opening=opening,seed=seed,canonicalOpening=canonical,hashes=hashes,browser=browser.version,viewport=page.evaluate('[innerWidth,innerHeight]'),rows=arm.get('rows',{}))
            touch=ctx.new_cdp_session(page) if engine=='chromium' else touch_session
            if touch is None:raise ValueError('WebKit requires the native touch protocol bridge')
            for kind,index in declared[batch_start:batch_start+batch_size]:
                key=f'{kind}/{index}'
                paired=reference['rows'][key] if reference else None
                row=check_gate(page,touch,index,kind,paired) if suite=='gates' else trial(page,touch,index,kind,paired,feedback=suite=='feedback',live=suite=='live')
                arm['rows'][key]=row
            if errors:raise RuntimeError(errors)
        finally:
            ctx.close()
    return arm


def run_cell(browser, origin, region, count, width, out_dir, *, engine='chromium', suite='matrix', variant=None, touch_session=None):
    out_dir=Path(out_dir);out_dir.mkdir(exist_ok=True,parents=True)
    path=out_dir/f'{region}-{count}-{width}-{suite}.json'
    cell=dict(schema=1,region=region,count=count,width=width,height=old.HEIGHTS[width]-52,
              outerHeight=old.HEIGHTS[width],suite=suite,engine=engine,paired=False,arms={})
    if variant=='v6':
        cell=json.loads(path.read_text())
        if cell['engine']!=engine:raise ValueError('Saved baseline engine differs')
    for arm in ([variant] if variant else ['v5','v6']):
        reference=cell['arms']['v5'] if arm=='v6' else None
        cell['arms'][arm]=run_arm(browser,origin,region,count,width,engine,suite,arm,reference,touch_session)
        cell['paired']=set(cell['arms'])=={'v5','v6'}
        temp=path.with_suffix(f'.{os.getpid()}.tmp')
        temp.write_text(json.dumps(cell,ensure_ascii=False,separators=(',',':'))+'\n')
        temp.replace(path)
    return cell


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--origin',default='http://127.0.0.1:8366')
    p.add_argument('--regions',nargs='+',choices=REGIONS,default=['forest'])
    p.add_argument('--widths',type=int,nargs='+',choices=WIDTHS,default=[390])
    p.add_argument('--counts',type=int,nargs='+',choices=COUNTS+[3],default=[28])
    p.add_argument('--suite',choices=['matrix','forest','region','gestures','directions','detour','gates','feedback','live'],default='matrix')
    p.add_argument('--variant',choices=['v5','v6'])
    p.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
    p.add_argument('--out',required=True,type=Path)
    a=p.parse_args()
    with sync_playwright() as pw:
        wk=old.WebKitTouch(os.getenv('WEBKIT_PATH',pw.webkit.executable_path)) if a.engine=='webkit' else None
        browser=pw.webkit.connect(wk.endpoint) if wk else pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        try:
            for region in a.regions:
                for n in a.counts:
                    for w in a.widths:
                        cell=run_cell(browser,a.origin,region,n,w,a.out,engine=a.engine,suite=a.suite,variant=a.variant,touch_session=wk)
                        print(region,n,w,[(k, sum(bool(r.get('arrived')) for r in v['rows'].values())) for k,v in cell['arms'].items()],flush=True)
        finally:
            browser.close()
            if wk:wk.close()


if __name__=='__main__':main()
