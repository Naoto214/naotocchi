"""Measure on/off paint at identical native feet and retain the actual screenshot pairs privately."""
import argparse
import hashlib
import json
import math
import os
from collections import Counter
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from urllib.parse import urlencode, urlparse

import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
REGIONS = ['forest', 'river_lake', 'city', 'home', 'countryside', 'mountain', 'snow', 'sea',
           'jungle', 'desert', 'deepsea', 'star_stop', 'memory_lake']
PROBE = """() => {
  const stage=document.querySelector('#castStage'), art=HomeBeauty.paintRect;
  const rect=e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.width,r.height]};
  const overlays=kind=>[...stage.querySelectorAll(kind)];
  const shadows=overlays('.diorama-shadow');
  const blades=overlays('.beauty-foot:not([hidden])');
  const at=(n,a)=>Math.hypot(parseFloat(n.style.left)-a.x,parseFloat(n.style.top)-a.y)<.01;
  const maskList=n=>[...n.querySelectorAll('.character-asset')].map(i=>[...rect(i),i.style.maskImage]);
  const subjects=HomeCastTrial.inspect().map(a=>{
    const owner=stage.querySelector('[data-diorama-actor="'+CSS.escape(a.key)+'"]');
    const shadow=shadows.find(n=>at(n,a)),grass=blades.find(n=>at(n,a));
    const uv=[(a.foot.x-art.left)/art.width,(a.foot.y-art.top)/art.height];
    const marked=shadow.dataset.finishSurface||'';
    const expected=HomeFinishGround.surfaceAt(HomeBeauty.settings.region,...uv);
    if (expected!==marked || (grass && (grass.dataset.finishSurface||'')!==expected))
      throw Error('Art-space mismatch at '+a.key+' '+JSON.stringify([uv,expected,marked]));
    const block=getComputedStyle(shadow),box=rect(shadow);
    return {key:a.key,kind:a.kind,surface:marked||'native',uv,
      valid:regressionScene.navigation.valid(a),foot:[a.x,a.y,a.foot.x,a.foot.y],depth:a.depth,
      image:maskList(owner),shadow:box,contact:grass?rect(grass):null,
      outline:[block.outlineColor,block.outlineWidth],shadowImage:block.backgroundImage,
      nativeMaterial:grass?.dataset.material||null,contactVisible:!!grass && getComputedStyle(grass).visibility!=='hidden'};
  });
  const gear=overlays('#petAccessory,.partner-ring,.partner-heart').map(e=>[e.id||e.className,rect(e),e.style.maskImage]);
  return {subjects,gear,area:rect(stage.closest('.screen-frame')),art:[art.left,art.top,art.width,art.height],
     background:regressionBackground?.currentSrc?.split('/game/')[1]};
}"""


def rgb(png):
    return np.asarray(Image.open(BytesIO(png)).convert('RGB'))


def take(page, enabled):
    page.evaluate('(s)=>HomeFinishGround.setEnabled(s)', enabled)
    snap = page.evaluate(PROBE)
    return snap, page.screenshot(scale='device')


def geometry(snap):
    keys = ['key','kind','foot','depth','image','shadow','contact','outline','valid']
    return [snap['gear'], snap['art'], [[a[k] for k in keys] for a in snap['subjects']]]


def reference_record(actors, paint, row):
    """Cross-check the signed V4 opening in the same painting coordinates."""
    old = {a['key']:a for a in actors}
    assert set(old)=={a['key'] for a in row['feet']}
    assert all(a['valid'] for a in actors)
    def projected_distance(foot):
        uv = old[foot['key']]['uv']
        return math.hypot((uv[0]-foot['xy'][0])*paint['width'],
                          (uv[1]-foot['xy'][1])*paint['height'])
    distance = max(map(projected_distance, row['feet']))
    assert distance < .01, (row['region'],distance)
    depths = [a['depth'] for a in actors]
    return {'validFeet':len(actors),'depthRange':[round(min(depths),5),round(max(depths),5)],
            'artRect':paint,'maxFootDistanceToRoundedV5RecordCssPx':round(distance,5)}


def capture_reference(browser, region, time, url, row):
    with browser.new_context(viewport={'width':390,'height':792},device_scale_factor=2,is_mobile=True,
                             has_touch=True,reduced_motion='reduce') as ctx:
        ctx.add_init_script(path=HERE/'regression_probe.js')
        page=ctx.new_page()
        page.clock.set_fixed_time(datetime(2026,10,15,3,tzinfo=timezone.utc))
        query=urlencode(dict(region=region,count=28,time=time,paused=1,clock=0,layout='optimized',
                             variant='B',compareSplit=0,policy='B',curve='linear'))
        response=page.goto(url.rstrip('/')+'/game/population.html?'+query,wait_until='domcontentloaded')
        assert response.ok
        page.wait_for_function("window.HomeCastTrial?.ready && window.regressionScene && HomeCastTrial.inspect().length===28")
        actors,paint=page.evaluate("""() => {const p=HomeBeauty.paintRect;return [HomeCastTrial.inspect().map(a=>({
            key:a.key,depth:a.depth,uv:[(a.foot.x-p.left)/p.width,(a.foot.y-p.top)/p.height],
            valid:regressionScene.navigation.valid(a)})),p];}""")
        return reference_record(actors,paint,row)


def run(args):
    args.shots.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        kw = {'executable_path':os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),
              'args':['--no-sandbox','--disable-dev-shm-usage']} if args.engine=='chromium' else {'executable_path':os.getenv('WEBKIT_PATH')}
        browser = getattr(pw,args.engine).launch(**kw)
        report = {'engine':args.engine,'browser':browser.version,'viewport':[390,792],'dpr':2,
                  'count':28,'curve':'linear','policy':'B','reducedMotion':True,'rows':[]}
        for region in args.regions:
            for time in args.times:
                with browser.new_context(viewport={'width':390,'height':792}, device_scale_factor=2,
                                         reduced_motion='reduce',has_touch=True,is_mobile=True) as context:
                    context.add_init_script(path=HERE/'regression_probe.js')
                    page=context.new_page()
                    source={}
                    def observe(resp):
                        name=Path(urlparse(resp.url).path).name
                        if name in ('ground.js','ground.css','home-production-diorama-finish.js'):
                            source[name]=resp
                    page.on('response', observe)
                    page.clock.install(time=datetime(2026,10,15,3,tzinfo=timezone.utc))
                    query=urlencode(dict(region=region,count=28,time=time,paused=1,clock=0,ground='off'))
                    response=page.goto(args.url.rstrip('/')+'/game/finish.html?'+query,wait_until='domcontentloaded',timeout=90000)
                    assert response.ok, response.status
                    page.wait_for_function("""name=>window.HomeCastTrial?.ready && HomeCastTrial.inspect().length===28 &&
                      window.regressionScene?.navigation && window.regressionBackground?.currentSrc.includes(name)""",
                      arg=region+'-'+time+'.webp',timeout=120000)
                    page.evaluate("Promise.all([...document.querySelectorAll('#castStage img')].map(i=>i.decode().catch(()=>{})))")
                    page.evaluate("document.getAnimations().forEach(a=>{a.pause();a.currentTime=0})")
                    tick=page.evaluate('Date.now()')
                    page.clock.pause_at(datetime.fromtimestamp((tick+300)/1000,tz=timezone.utc))
                    before,b=take(page,False)
                    after,a=take(page,True)
                    restored,c=take(page,False)
                    assert geometry(before)==geometry(after)==geometry(restored)
                    assert before==restored and all(s['valid'] for s in after['subjects'])
                    hashes={k:hashlib.sha256(res.body()).hexdigest() for k,res in source.items()}
                    for f in ['ground.js','ground.css']:
                        assert hashes[f]==hashlib.sha256((HERE/f).read_bytes()).hexdigest(), (f,hashes)
                    bb,aa,cc=rgb(b),rgb(a),rgb(c)
                    mask=np.zeros(bb.shape[:2],dtype=bool)
                    for sub in after['subjects']:
                        for box in [sub['shadow'],sub['contact']]:
                            if not box: continue
                            x,y,w,h=box
                            mask[max(0,math.floor(2*y)-3):math.ceil(2*(y+h))+3,
                                 max(0,math.floor(2*x)-3):math.ceil(2*(x+w))+3]=True
                    diff=(aa!=bb).any(axis=2)
                    restore=(cc!=bb).any(axis=2)
                    # Other game HUD messages animate on their own wall clock. Count
                    # their differences separately and keep the complete screenshots.
                    h,w=diff.shape
                    actor_band=np.zeros_like(mask);yy=np.where(mask)[0]
                    actor_band[max(0,yy[0]-4):min(h,yy[-1]+5)]=True
                    altered=int((diff & mask).sum())
                    outside=int((diff & ~mask & actor_band).sum())
                    reread=int((restore & actor_band).sum())
                    if reread or outside:
                        for name,png in [('start',b),('finish',a),('restored',c)]:
                            (args.shots/(region+'-debug-'+name+'.png')).write_bytes(png)
                        raise ValueError((region,time,reread,outside))
                    assert bool(altered)==(region in REGIONS[:4]),(region,time,altered)
                    loc=region+'-'+time
                    pictures={}
                    for mode,png in [('off',b),('on',a)]:
                        file=args.shots/(loc+'-'+mode+'.png')
                        file.write_bytes(png);pictures[mode]=hashlib.sha256(png).hexdigest()
                    subjects=after['subjects']
                    shadow_error=max(math.hypot(s['shadow'][0]+s['shadow'][2]/2-s['foot'][2],
                                                 s['shadow'][1]+s['shadow'][3]/2-s['foot'][3]) for s in subjects)
                    row={'region':region,'time':time,'background':after['background'],
                         'validFeet':len(subjects),'surfaceCounts':dict(Counter(s['surface'] for s in subjects)),
                         'grassShownOff':sum(s['nativeMaterial']=='grass' and s['contactVisible'] for s in before['subjects']),
                         'grassShownOn':sum(s['nativeMaterial']=='grass' and s['contactVisible'] for s in subjects),
                         'maxShadowFootDistanceCssPx':round(shadow_error,4),'changedDevicePixelsAtContacts':altered,
                         'changedDevicePixelsElsewhereInActorBand':outside,'restoredActorBandPixelErrors':reread,
                         'fullFrameChangesOutsideActorBand':int((diff & ~actor_band).sum()),
                         'pictureSha256':pictures,'loadedSha256':hashes,
                         'feet':[{'key':s['key'],'xy':[round(n,5) for n in s['uv']],'surface':s['surface']} for s in subjects]}
                    print(region,time,row['surfaceCounts'],altered,outside,reread,flush=True)
                    if args.reference_url:
                        row['v4Reference']=capture_reference(browser,region,time,args.reference_url,row)
                    report['rows'].append(row)
                    args.output.parent.mkdir(parents=True,exist_ok=True)
                    args.output.write_text(json.dumps(report,ensure_ascii=False,separators=(',',':'))+'\n')
        browser.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url',required=True);parser.add_argument('--shots',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--reference-url',help='Optional origin with the original V4 bundle')
    parser.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
    parser.add_argument('--regions',nargs='+',choices=REGIONS,default=REGIONS)
    parser.add_argument('--times',nargs='+',choices=['morning','day','evening','night'],default=['day'])
    run(parser.parse_args())
