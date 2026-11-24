"""Measure the default autumn leaves against each scene's actual phone compositor."""
import argparse
import json
import hashlib
import os
from urllib.request import urlopen
from pathlib import Path
from statistics import median
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
WORLD = 'composeNature(ctx,t,host,fade,time/1000,flags.reducedMotion);'
BASE = '''export function drawLocalLeaf(ctx,...args) {
  const [kind,i,p,x,y]=args;
  if (kind!=='leaf') return measuredLocalLeaf(ctx,...args);
  return window.leafProbe.leaf(measuredLocalLeaf,ctx,args,i,p,x,y,p);
}'''
ART = '''export function drawAutumnLeaf(ctx,...args) {
  if (!window.leafProbe.replaying) return measuredAutumnLeaf(ctx,...args);
  const [i,p,x,y,baseSize,alpha,s]=args;
  const pose=sampleAutumnLeaf(i,p,baseSize,s);
  return window.leafProbe.leaf(measuredAutumnLeaf,ctx,args,i,p,x,y,pose);
}'''
SCENES = ['forest-leaves','country-leaves']
BANDS = ['distant','middle','foreground']

def instrument(route):
    response = route.fetch()
    src = response.text()
    if 'home-production-world.mjs' in route.request.url:
        assert src.count(WORLD)==1
        src = src.replace(WORLD,'window.leafProbe.setup(ctx,t,host,fade,fullBackdrop,contain,composeNature);'+WORLD)
    elif 'regional-fall.mjs' in route.request.url:
        key='export function drawLocalLeaf('
        assert src.count(key)==1
        src = src.replace(key,'function measuredLocalLeaf(')+'\n'+BASE
    else:
        key='export function drawAutumnLeaf('
        assert src.count(key)==1
        src = src.replace(key,'function measuredAutumnLeaf(')+'\n'+ART
    route.fulfill(response=response,body=src)

def summarize(rows):
    result={}
    for band_index,name in enumerate(BANDS):
        band=[r for r in rows if int(r['z']*3)==band_index]
        if not band: continue
        broad=[r for r in band if abs(r['face'])>=.70]
        edge=[r for r in band if abs(r['face'])<=.23]
        stats={}
        for phase,selection in [('broad',broad),('edge',edge),('all',band)]:
            if selection:
                stats[phase]={k:round(median(r[k] for r in selection),2) for k in ['long','short','visible','delta','area']}
                stats[phase]['n']=len(selection)
        result[name]=stats
    return result

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--url',default='http://localhost:8197')
    ap.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
    ap.add_argument('--modes',nargs='+',default=['E3plus','A','B','C'])
    ap.add_argument('--dpr',type=int,choices=[1,2,3],default=2)
    ap.add_argument('--widths',nargs='+',type=int,default=[320,375,390,430])
    ap.add_argument('--scenes',nargs='+',default=SCENES)
    ap.add_argument('--out',type=Path,required=True)
    ap.add_argument('--rows',type=Path,help='optional retained raw track samples for inspection')
    ap.add_argument('--step',type=float,default=.5)
    ap.add_argument('--count',type=int,default=49)
    ap.add_argument('--start',type=float,default=0)
    args=ap.parse_args()
    args.out.parent.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        browser=getattr(pw,args.engine).launch(**({'executable_path':os.environ.get('CHROMIUM','/usr/bin/chromium'),'args':['--no-sandbox']} if args.engine=='chromium' else {}))
        report={'engine':args.engine,'browser':browser.version,'height':844,'start':args.start,'step':args.step,'clocks':args.count,'conditions':[]}
        if any(m in ['A','B','C'] for m in args.modes):
            report['artSha256']=hashlib.sha256(urlopen(args.url.rstrip('/')+'/game/beauty/autumn-leaf.mjs').read()).hexdigest()
        rows_all=[]
        for w in args.widths:
            for scene in args.scenes:
                context=browser.new_context(viewport={'width':w,'height':844},device_scale_factor=args.dpr,has_touch=True)
                context.add_init_script(path=HERE/'verify_visual_probe.js')
                for filename in ['home-production-world.mjs','regional-fall.mjs','autumn-leaf.mjs']:
                    context.route('**/'+filename+'*', instrument)
                page=context.new_page()
                page.goto(args.url.rstrip('/')+'/?'+urlencode(dict(scene=scene,variant=args.modes[0],compareSplit=0,clock=0)),wait_until='domcontentloaded')
                page.wait_for_selector('iframe#home')
                frame=page.locator('iframe#home').element_handle().content_frame()
                frame.wait_for_function('() => !!window.leafProbe?.render && leafProbe.geometry.mode==="cover" && Math.abs(leafProbe.geometry.cssHeight-innerHeight)<1 && !!document.querySelector("[data-diorama-actor]")',timeout=120000)
                for mode in args.modes:
                    page.locator('#quick-variant').select_option(mode)
                    frame.wait_for_function('mode=>HomeBeauty.settings.variant===mode',arg=mode)
                    settings=frame.evaluate('HomeBeauty.settings')
                    assert settings['variant']==mode, settings['variant']
                    geom=frame.evaluate('leafProbe.geometry')
                    rows=frame.evaluate('([start,step,n])=>Array.from({length:n},(_,i)=>leafProbe.render(start+i*step)).flat()', [args.start,args.step,args.count])
                    assert rows, (w,scene,mode)
                    stats=summarize(rows)
                    early=[r for r in rows if r['t']<=5 and r['z']>=2/3 and
                           r['x']-r['long']/2 > w*.5 and r['long'] >= 8 and r['short'] >= 3 and r['visible']>=20]
                    clocks=sorted({r['t'] for r in early})
                    report['conditions'].append(dict(width=w,scene=scene,mode=mode,geometry=geom,bands=stats,
                        rightHalfFirst5s={'qualifyingClocks':clocks,'trackIds':sorted({r['id'] for r in early})}))
                    print(w,scene,mode,geom['art'],{b:v.get('broad',{}) for b,v in stats.items()},flush=True)
                    if args.rows:
                        rows_all.append(dict(width=w,scene=scene,mode=mode,rows=rows))
                        args.rows.write_text(json.dumps(rows_all,separators=(',',':'))+'\n')
                    args.out.write_text(json.dumps(report,indent=1)+'\n')
                context.close()
        browser.close()

if __name__=='__main__':
    main()
