"""Measure every gain from one synchronized native trajectory per distinct opening plan."""
import argparse
from concurrent.futures import ProcessPoolExecutor
from datetime import datetime, timezone
import gzip
import hashlib
import itertools
import json
import os
from pathlib import Path
import subprocess
import traceback
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright
from geometry_pixels import V3, ACTOR_COLUMNS, SCENE_COLUMNS, measure

BASE=Path(__file__).resolve().parent
REGIONS=('forest','river_lake','city','home','countryside','mountain','snow','sea','jungle','desert','deepsea','star_stop','memory_lake')
HEIGHTS={320:568,348:692,360:746,375:812,390:844,430:932}
SCRIPT_NAMES=['population-policy.js','population-beauty.js','cast-population.js','population.html',
              'home-production-world-population.mjs','home-production-diorama-population.js','beauty/fixture.js']
HIT_ANCHOR='function down(e){'
PROBE="""window.qaNativeHit=(x,y)=>{const el=doc.elementFromPoint(x,y);return el&&stage.contains(el)&&!el.closest('button,a,input,select,textarea')?hit(point({clientX:x,clientY:y}),el):null;};
window.qaTerrainForSteps=()=>{const s=displayRect(stage),h=displayRect(worldHost),a=model.snapshot()[0],x=s.left-h.left,y=s.top-h.top;return polygonsAt(a).map(poly=>poly.map(p=>[p[0]-x,p[1]-y]));};"""
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def write(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_suffix(f'.{os.getpid()}.tmp')
    tmp.write_bytes(gzip.compress(json.dumps(data,separators=(',',':'),allow_nan=False).encode(),compresslevel=6,mtime=0))
    tmp.replace(path)
def read(path):return json.loads(gzip.decompress(path.read_bytes()))
def get_plans(game,fixture):
    return json.loads(subprocess.check_output(['node',str(BASE/'geometry_plans.cjs'),str(game),json.dumps(fixture)]))

def capture(browser,args,fixture,plan,policy_pairs,groups,source):
    ctx=browser.new_context(viewport={'width':fixture['width'],'height':fixture['height']},has_touch=True,is_mobile=True,device_scale_factor=2)
    try:
        ctx.add_init_script(path=V3/'geometry_capture.js')
        assert source.count(HIT_ANCHOR)==1
        if not getattr(args,'served_probe',False):
            ctx.route('**/home-production-diorama-population.js*',lambda route:route.fulfill(body=source.replace(HIT_ANCHOR,PROBE+HIT_ANCHOR),content_type='application/javascript'))
        page=ctx.new_page()
        page_errors=[];failed_requests=[]
        page.on('pageerror',lambda error:page_errors.append(str(error)))
        page.on('requestfailed',lambda request:failed_requests.append([request.url.split('?')[0],request.failure]))
        page.clock.set_fixed_time(datetime(2026,10,15,3,tzinfo=timezone.utc))
        layout,curve,policy=groups[0].split('/')
        params={'clock':0,'paused':1,'time':'day','variant':'B','compareSplit':0,'region':fixture['region'],
                'count':fixture['count'],'layout':layout,'curve':curve,'policy':policy}
        page.goto(args.url+'?'+urlencode(params),wait_until='domcontentloaded',timeout=90000)
        try:
            page.wait_for_function("n=>window.qaLastScene && window.HomeCastTrial?.ready===true && HomeCastTrial.inspect().length===n && window.NaotocchiHomeViewport?.residentPresentation?.() && window.HomeBeauty?.paintRect?.width && JSON.parse(document.querySelector('#castStage').dataset.livingMetrics||'{}').world?.loaded",arg=fixture['count'],timeout=120000)
        except Exception as error:
            state=page.evaluate("""() => {
              const stage=document.querySelector('#castStage'), t=window.HomeCastTrial, beauty=window.HomeBeauty;
              const metrics=JSON.parse(stage?.dataset.livingMetrics||'{}');
              return {ready:t?.ready,actualCount:t?.inspect().length,wantedCount:beauty?.settings.count,
                sync:!!window.qaLastScene,projected:!!window.NaotocchiHomeViewport?.residentPresentation?.(),
                paintRect:beauty?.paintRect,worldLoaded:metrics?.world?.loaded,
                worldRenderer:stage?.dataset.worldRenderer,worldError:stage?.dataset.worldError,
                lastFrame:metrics?.frames,visibility:document.visibilityState};
            }""")
            raise RuntimeError(f'Native readiness timed out: {state}, page errors={page_errors[-5:]}, request failures={failed_requests[-5:]}') from error
        page.evaluate("Promise.all([...document.querySelectorAll('#castStage img')].map(img=>img.decode().catch(()=>{})))")
        page.evaluate((V3/'geometry_snapshot.js').read_text())
        page.evaluate((V3/'verify_interact_hits.js').read_text())
        page.evaluate((BASE/'geometry_probe.js').read_text())
        plans=page.evaluate('qaPlans()')
        if any(plans[g]!=plan for g in groups):
            raise ValueError(f'Served runtime planner differs from tested distribution {groups}')
        phases=[]
        for steps in (0,80,220):
            if steps:page.evaluate('n=>qaAdvance(n)',steps)
            samples=page.evaluate('pairs=>qaPhase(pairs)',policy_pairs)
            assert len(samples['actors'])==fixture['count'] and samples['p']['viewport']==[fixture['width'],fixture['height']]
            assert all(a['frame'][2]>0 for a in samples['actors'])
            phases.append(samples)
        for samples in phases:measure(samples,args.game)
        return {'browser':browser.version,'phases':phases}
    finally:
        ctx.close()

def shard(data):
    args,jobs,worker=data
    signatures={k:sha(args.game/k) for k in SCRIPT_NAMES}
    controller=(getattr(args,'controller',None) or args.game/'home-production-diorama-population.js').read_bytes()
    signatures['home-production-diorama-population.js']=hashlib.sha256(controller).hexdigest()
    source=controller.decode('utf-8')
    harness={p.name:sha(p) for p in [BASE/'geometry_collect.py',BASE/'geometry_probe.js',BASE/'geometry_pixels.py',
              BASE/'geometry_plans.cjs',V3/'geometry_capture.js',V3/'geometry_snapshot.js',V3/'verify_interact_hits.js',V3/'geometry_matrix.py']}
    failures=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),
            args=['--no-sandbox','--disable-dev-shm-usage','--disable-renderer-backgrounding','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows'])
        for width,region,count in jobs:
            fixture={'width':width,'height':HEIGHTS[width]-52,'region':region,'count':count}
            plans=get_plans(args.game,fixture)
            groups={}
            for name,plan in plans.items():groups.setdefault(json.dumps(plan,separators=(',',':')),[]).append(name)
            for mode in ['fixed','optimized']:
                if args.layout not in ('both',mode):continue
                key=f'{width}-{region}-{count}'
                target=args.out/mode/(key+'.json.gz')
                selected=[(json.loads(p),g) for p,g in groups.items() if any(k.startswith(mode+'/') for k in g)]
                signatures_mode={**signatures}
                if mode=='optimized':signatures_mode['population-seating.js']=sha(args.game/'population-seating.js')
                if target.exists():
                    previous=read(target)
                    if previous['source']==signatures_mode and previous['harness']==harness:continue
                out={'fixture':fixture,'seed':214,'source':signatures_mode,'harness':harness,'time':'2026-10-15T03:00:00Z',
                    'phaseSeconds':[0,8,30],'actorColumns':ACTOR_COLUMNS,'sceneColumns':SCENE_COLUMNS,'trajectories':[],'references':{}}
                failed=False
                for plan,group in selected:
                    names=[k for k in group if k.startswith(mode+'/')]
                    if mode=='optimized' and any(k.startswith('fixed/') for k in group):
                        for name in names:out['references'][name]=name.replace('optimized/','fixed/')
                        continue
                    candidates=[k.split('/')[1:] for k in names]
                    # A hypothetical zero-gain repaint on these same optimized
                    # seats isolates opening-only changes. Never label it as a
                    # selectable candidate, whose current setting retains V2.
                    if mode=='optimized' and ['linear','current'] not in candidates:
                        candidates=[['linear','current'],*candidates]
                    for attempt in range(2):
                        try:
                            native=capture(browser,args,fixture,plan,candidates,names,source)
                            break
                        except Exception as exc:
                            if attempt:
                                failure={'fixture':fixture,'layout':mode,'conditions':names,'error':str(exc),'traceback':traceback.format_exc()}
                                write(args.out/'errors'/mode/(key+'.json.gz'),failure)
                                failures.append((mode,key,str(exc)));failed=True
                                print(f'FAILED {mode} {key} after two fresh contexts: {exc}',flush=True)
                                break
                            print(f'Retrying {mode} {key}: {exc}',flush=True)
                    if failed:break
                    out['trajectories'].append({'plan':plan,'conditions':names,**native})
                if failed:continue
                write(target,out)
                (args.out/'errors'/mode/(key+'.json.gz')).unlink(missing_ok=True)
                print(worker,mode,key,len(out['trajectories']),flush=True)
        browser.close()
    if failures:raise RuntimeError(f'{len(failures)} incomplete native fixtures for worker {worker}: {failures}')

def run(args):
    jobs=list(itertools.product(args.widths,args.regions,args.counts))
    data=[(args,jobs[i::args.jobs],i) for i in range(min(args.jobs,len(jobs)))]
    if len(data)==1:shard(data[0])
    else:
        with ProcessPoolExecutor(args.jobs) as pool:list(pool.map(shard,data))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('url');p.add_argument('out',type=Path)
    p.add_argument('--game',type=Path,required=True)
    p.add_argument('--controller',type=Path,help='Route a candidate controller for a native regression check; its true bytes are hashed')
    p.add_argument('--widths',type=int,nargs='+',choices=HEIGHTS,default=list(HEIGHTS))
    p.add_argument('--regions',nargs='+',choices=REGIONS,default=REGIONS)
    p.add_argument('--counts',type=int,nargs='+',choices=range(1,29),default=list(range(19,29)))
    p.add_argument('--layout',choices=['fixed','optimized','both'],default='both')
    p.add_argument('--jobs',type=int,default=1)
    run(p.parse_args())
