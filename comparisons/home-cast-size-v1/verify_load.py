"""Sample a running private home, then replay an identical V5 model input across presets."""
import argparse
import asyncio
import base64
import hashlib
import json
import os
from pathlib import Path
from urllib.parse import urlencode

from playwright.async_api import async_playwright


INIT = """window.loadProbe = {
 parts: {}, slow: [], syncs: 0, syncInput: null, live: null,
 add(name,start) {
   const end=performance.now(), ms=end-start;
   const part=this.parts[name] ??= {calls:0, ms:0, max:0};
   part.calls++; part.ms+=ms; part.max=Math.max(part.max,ms);
   if(ms>=50) this.slow.push({name,start,end,ms});
 },
 plan(fn) {const t=performance.now();try{return fn();}finally{this.add('plan',t);}}
};"""

SAMPLE = """async seconds=>{
 const p=loadProbe,stage=document.querySelector('#castStage');
 p.parts={};p.slow=[];const start=performance.now(),sync=p.syncs;
 let previous=start,paused=0;const gaps=[],long=[];
 const before=p.live.metrics(), nodes=[...stage.querySelectorAll('[data-diorama-actor]')];
 await new Promise(resolve=>{
   function frame(){
     const now=performance.now(),ms=now-previous;
     if(ms>=250)long.push({start:previous-start,end:now-start,ms});
     gaps.push(ms);
     if(stage.dataset.dioramaPaused==='true')paused+=ms;
     previous=now;
     if(now-start>=seconds*1000)resolve();else requestAnimationFrame(frame);
   }
   requestAnimationFrame(frame);
 });
 const end=performance.now(), elapsed=(end-start)/1000;
 const after=p.live.metrics(), sorted=gaps.slice().sort((a,b)=>a-b);
 const clock=after.clock-before.clock;
 const events=p.slow.map(e=>({...e,start:e.start-start,end:e.end-start}));
 for(const hitch of long) {
   hitch.events=events.filter(e=>e.start<hitch.end+.01&&e.end>hitch.start-.01)
     .map(e=>[e.name,Math.round(e.ms*10)/10]);
 }
 return {seconds:elapsed,callbacks:gaps.length,rafHz:gaps.length/elapsed,
  p95:sorted[Math.ceil(sorted.length*.95)-1],max:sorted.at(-1),long,
  phases:p.parts,pausedSec:paused/1000,syncs:p.syncs-sync,clock,
  distance:after.distance-before.distance,moves:after.moves-before.moves,
  rows:nodes.length,sameNodes:nodes.every(n=>n.isConnected)};
}"""

REPLAY = """([seed,count])=>{
 const original=loadProbe.syncInput;
 const metrics=()=>({plans:0,clearance:0,steps:0});
 function trial(preset){
   HomeCastTrial.apply({preset,paused:true});
   let s=seed;const random=()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};
   const m=NaotocchiHomeDioramaModel.createModel({random});
   loadProbe.replay=metrics();
   const t=performance.now();m.sync(...original);
   const setup=performance.now()-t, syncStats={...loadProbe.replay};
   loadProbe.replay=metrics();
   const start=performance.now();
   for(let i=0;i<count;i++)m.step(.1,{blocked:false,reducedMotion:false});
   const elapsed=performance.now()-start,work={...loadProbe.replay};
   loadProbe.replay=null;
   function pose(a){return [a.key,a.x,a.y,a.w,a.h,a.target,a.route,a.activity,a.direction];}
   return {preset,setup,elapsed,syncStats,work,state:m.snapshot().map(pose),metrics:m.metrics()};
 }
 return ['current','A','B'].map(trial);
}"""


def sub(source, before, after):
    if source.count(before) != 1:
        raise ValueError('Unexpected instrumentation boundary ' + before[:80])
    return source.replace(before, after)


async def intercept(route, replay):
    response = await route.fetch()
    source = await response.text()
    if 'home-production-diorama.js' in route.request.url:
        prefix = 'const model=modelAPI.createModel('
        source = sub(source, prefix, 'const model=window.loadProbe.live=modelAPI.createModel(')
        step = 'for(let remaining='
        source = sub(source, step, 'const lp=window.loadProbe,mt=performance.now();' + step)
        marker = 'world?.draw(dt,{paused:!isVisible(),reducedMotion:!!media?.matches,tier:flags.tier||0});paint();'
        source = sub(source,marker,"lp.add('model',mt);const wt=performance.now();"+
                     marker.removesuffix('paint();')+
                     "lp.add('world',wt);const at=performance.now();paint();lp.add('actors',at);")
    elif 'home-production-world.mjs' in route.request.url:
        line, = (s.strip() for s in source.splitlines() if s.strip().startswith('composeNature(ctx,t,host,fade,'))
        source = sub(source,line,"const nt=performance.now();"+line+"window.loadProbe.add('nature',nt);")
    else:
        sync = 'function sync(list,next){'
        source = sub(source, sync, sync+'window.loadProbe.syncs++;if(list.length&&next.navigation)window.loadProbe.syncInput=[list,next];')
        source = sub(source, 'const plan=nav=>{', "const plan=nav=>window.loadProbe.plan(()=>{")
        last = 'return {point:q,path,originalReference,expandedReference};\n      };'
        source = sub(source,last,last[:-2]+'});')
        if replay:
            counter = 'if(window.loadProbe.replay)window.loadProbe.replay.'
            for signature, key in [('function clearance(a,p,b){', 'clearance'), ('function step(dt,flags={}){','steps'),
                                    ('const plan=nav=>window.loadProbe.plan(()=>{','plans')]:
                source=sub(source, signature, signature+counter+key+'++;')
    await route.fulfill(response=response,body=source)


async def read_compositor_trace(client):
    """Collect per-thread Chromium timeline work inside each marked live window."""
    complete = asyncio.get_running_loop().create_future()
    client.once('Tracing.tracingComplete', lambda event: complete.set_result(event['stream']))
    await client.send('Tracing.end')
    handle = await asyncio.wait_for(complete, 60)
    data = bytearray()
    while True:
        chunk = await client.send('IO.read', {'handle':handle})
        data.extend(base64.b64decode(chunk['data']) if chunk.get('base64Encoded') else chunk['data'].encode())
        if chunk['eof']:
            break
    await client.send('IO.close', {'handle':handle})
    events = json.loads(data)['traceEvents']
    marks = {e['name']:e['ts'] for e in events if e.get('name','').startswith('cast-window-')}
    result = []
    phases = ('RasterTask', 'Paint', 'Layout', 'UpdateLayoutTree', 'Layerize')
    for key in sorted(marks):
        if not key.endswith('-start'):
            continue
        start, end = marks[key], marks[key.removesuffix('-start')+'-end']
        summary = {}
        for phase in phases:
            durations = [e['dur']/1000 for e in events if e.get('name')==phase and 'dur' in e
                         and start <= e['ts'] < end]
            summary[phase] = {'calls':len(durations),'totalMs':sum(durations),
                              'maxMs':max(durations,default=0)}
        result.append({'window':key,'seconds':(end-start)/1e6,'phases':summary})
    return result


async def run(args):
    phases = ['current','A','B','B','A','current']
    output = {'viewport':[390,844],'DPR':2,'engine':args.engine,'suite':args.suite,
              'affinity':sorted(os.sched_getaffinity(0)),'region':args.region,'reference':args.reference,'rows':[]}
    args.out.parent.mkdir(parents=True,exist_ok=True)
    def save():
        args.out.write_text(json.dumps(output,ensure_ascii=False,indent=1)+'\n')
    async with async_playwright() as tools:
        binary=os.getenv('CHROMIUM_PATH','/usr/bin/chromium') if args.engine=='chromium' else os.getenv('WEBKIT_PATH')
        browser=await getattr(tools,args.engine).launch(executable_path=binary)
        output['browser']=browser.version
        for idx,count in enumerate(args.counts):
            context=await browser.new_context(viewport={'width':390,'height':844}, device_scale_factor=2,has_touch=True)
            await context.add_init_script(INIT)
            async def route_handler(route):
                await intercept(route, args.suite=='replay')
            for name in ('home-production-model.js','home-production-diorama.js','home-production-world.mjs'):
                await context.route('**/'+name+'*',route_handler)
            page=await context.new_page()
            profiler = None
            if args.engine == 'chromium' and args.suite == 'live':
                profiler = await context.new_cdp_session(page)
                await profiler.send('Performance.enable')
            async def css_metrics():
                if not profiler:
                    return {}
                packet = await profiler.send('Performance.getMetrics')
                return {item['name']:item['value'] for item in packet['metrics'] if item['name'] in
                        ('RecalcStyleDuration', 'LayoutDuration', 'RecalcStyleCount', 'LayoutCount')}
            errors=[]
            page.on('pageerror',lambda exc:errors.append(str(exc)))
            query=urlencode(dict(count=count,region=args.region,time='day',season='autumn',weather='sunny',variant='B',
                                 compareSplit=0,castPreset='current'))
            await page.goto(args.url.rstrip('/')+'/game/index.html?'+query,wait_until='domcontentloaded')
            await page.wait_for_function("""([n,reference])=>(reference||!!window.HomeCastTrial) && !!loadProbe.live
                && !!loadProbe.syncInput && document.querySelectorAll('#castStage [data-diorama-actor]').length===n
                && document.querySelector('.home-dayparts-fx')?.dataset.region===HomeBeauty.settings.region
                && !!loadProbe.parts.nature""",arg=[count,args.reference],timeout=120000)
            await page.wait_for_timeout(1700)
            await page.evaluate('window.initialNodes=[...document.querySelectorAll("#castStage [data-diorama-actor]")]')
            if args.suite=='replay':
                if args.reference:
                    raise ValueError('Use the cast comparison for exact current/A/B model replay')
                result=await page.evaluate(REPLAY,[214,args.steps])
                for row in result:
                    for key in ['state','metrics']:
                        raw=json.dumps(row.pop(key),sort_keys=True,ensure_ascii=False,allow_nan=False).encode()
                        row[key+'SHA256']=hashlib.sha256(raw).hexdigest()
                    row['count']=count
                    output['rows'].append(row)
                assert len({(row['stateSHA256'],row['metricsSHA256'],tuple(row['work'].values())) for row in result})==1,result
            else:
                modes=phases[idx%3:3]+phases[:idx%3]
                sequence=['current']*args.repeat if args.reference else (modes+modes[::-1])*args.repeat
                if args.trace and profiler:
                    await profiler.send('Tracing.start',{'categories':'devtools.timeline,blink.user_timing,cc,benchmark,disabled-by-default-devtools.timeline',
                                                        'transferMode':'ReturnAsStream'})
                for mode in sequence:
                    if not args.reference:
                        await page.evaluate("m=>HomeCastTrial.apply({preset:m,paused:false})",mode)
                    await page.wait_for_timeout(250)
                    if args.trace and profiler:
                        await page.evaluate("index=>performance.mark('cast-window-'+index+'-start')",len(output['rows']))
                    before_css = await css_metrics()
                    sample=await page.evaluate(SAMPLE,args.seconds)
                    after_css = await css_metrics()
                    if args.trace and profiler:
                        await page.evaluate("index=>performance.mark('cast-window-'+index+'-end')",len(output['rows']))
                    if after_css:
                        sample['browserStyleAndLayout'] = {k:after_css[k]-v for k,v in before_css.items()}

                    assert sample['rows']==count and sample['sameNodes'] and not errors,errors
                    sample.update(count=count,preset=mode)
                    output['rows'].append(sample)
                    save()
                    print(count,mode,round(sample['rafHz'],1),round(sample['max']),flush=True)
                if args.trace and profiler:
                    traces = await read_compositor_trace(profiler)
                    if len(traces) != len(sequence):
                        raise ValueError('Incomplete Chromium trace windows')
                    for item in traces:
                        index = int(item['window'].split('-')[2])
                        output['rows'][index]['trace'] = item
            assert await page.evaluate('initialNodes.every(n=>n.isConnected)')
            await context.close()
            save()
        await browser.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('suite',choices=['live','replay'])
    parser.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
    parser.add_argument('--url',default='http://127.0.0.1:8201')
    parser.add_argument('--reference',action='store_true',help='Measure the unmodified #569 comparison, live suite only')
    parser.add_argument('--trace',action='store_true',help='Separate Chromium run including CPU raster, paint and layout tracing')
    parser.add_argument('--counts',nargs='+',type=int,default=[1,4,10,20,28])
    parser.add_argument('--region',default='river_lake')
    parser.add_argument('--seconds',type=float,default=4)
    parser.add_argument('--repeat',type=int,default=1)
    parser.add_argument('--steps',type=int,default=300)
    parser.add_argument('--out',type=Path,required=True)
    asyncio.run(run(parser.parse_args()))
