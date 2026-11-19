"""Short live rendering samples for every region, phone width, population, gain and layout."""
import argparse
import asyncio
import hashlib
import json
import os
import subprocess
from pathlib import Path
from urllib.parse import urlencode

from playwright.async_api import async_playwright

from verify_performance import BASE_SCALE, LIVE_SAMPLE, PROFILE, REGIONS, STANDARD_WIDTHS, fingerprint, instrument

GAINS = (0, 5, 10, 15, 20)
LAYOUTS = ('fixed','optimized')

# Equal hint sequences imply the same initialPoint callback results for all
# residents on this artwork. Native validation can discard a hint but cannot
# distinguish two identical hint sequences. A new group gets its own real page.
GROUPS = """
const [modulePath, region, w, h, n] = process.argv.slice(1);
const seating = require(modulePath);
const nav = {valid: () => true, project: p => p, initialPoint: (i) => ['V2',i]};
const rows = [];
for (const extra of [0,5,10,15,20]) for (const layout of ['fixed','optimized']) {
  const adapted = seating.withOpeningSeats(nav,{region},Number(w),Number(h),
    '?layout='+layout+'&extra='+extra);
  const hints = Array.from({length:Number(n)}, (_,i) => adapted.initialPoint(i,Number(n)));
  rows.push({extra,layout,hints});
}
process.stdout.write(JSON.stringify(rows));
"""


def placements(module, region, width, height, count):
    data = subprocess.check_output(['node','-e',GROUPS,str(module),region,str(width),str(height),str(count)])
    groups = {}
    for case in json.loads(data):
        key = fingerprint(case['hints'])
        groups.setdefault(key, []).append((case['extra'],case['layout']))
    return groups


def mean_phase(phases, name):
    phase = phases.get(name)
    if not phase or not phase['calls']:
        return dict(calls=0,meanMs=None,maxMs=None)
    return dict(calls=phase['calls'],meanMs=phase['ms']/phase['calls'],maxMs=phase['max'])


def compact(sample):
    return {key:sample[key] for key in ('seconds','callbacks','rafHz','p95','max','rows','sameNodes','pausedSec','moves','distance','clock')} | {
        'walkingModelSec':sample['steps']['walk'],
        'gaps250ms':len(sample['long']),
        'phases':{key:mean_phase(sample['phases'],key) for key in ('model','plan','actors','world','nature')}
    }


async def measure_fixture(browser, args, module, width, count):
    height=STANDARD_WIDTHS[width]-52
    groups=placements(module,args.region,width,height,count)
    required={(n,layout) for n in args.extras for layout in args.layouts}
    context=await browser.new_context(viewport={'width':width,'height':height},
                                      device_scale_factor=2,has_touch=True,is_mobile=True)
    await context.add_init_script(PROFILE)
    hashes={}
    async def hook(route):
        await instrument(route,hashes)
    for pattern in ['**/home-production-diorama*.js*','**/home-production-model.js*',
                    '**/home-production-world*.mjs*','**/limit-seating.js*']:
        await context.route(pattern,hook)
    output={'region':args.region,'width':width,'height':height,'count':count,'engine':'Chromium',
            'version':browser.version,'host':os.environ.get('RUNNER_NAME','local'),
            'cpu':sorted(os.sched_getaffinity(0)),'targetSeconds':args.seconds,
            'requestedCases':sorted(required),'groups':[],'rows':[]}
    expected_hash=hashlib.sha256(module.read_bytes()).hexdigest()
    try:
        for hints,equivalent in groups.items():
            cases=[case for case in equivalent if case in required]
            if not cases:
                continue
            page=await context.new_page()
            errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            try:
                base_extra,base_layout=cases[0]
                params=urlencode(dict(region=args.region,count=count,time='day',season='autumn',weather='sunny',
                                      variant='B',compareSplit=0,paused=1,extra=base_extra,layout=base_layout))
                await page.goto(args.url.rstrip('/')+'/game/limit.html?'+params,
                                wait_until='domcontentloaded',timeout=120000)
                await page.wait_for_function("""n=>HomeCastTrial.ready && !!loadProbe.parts.nature &&
                  HomeCastTrial.inspect().length===n""",arg=count,timeout=120000)
                assert hashes['limit-seating.js']==expected_hash, 'Served and on-disk seating modules differ'
                body=await page.evaluate("""()=>HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y,a.w,a.h])""")
                roster=fingerprint([[a[0],a[3],a[4]] for a in body])
                assert len(body)==count
                output['groups'].append({'openingHints':hints,'nativeStartPose':fingerprint(body),
                                         'rosterAndModelSizes':roster,'sourceMode':[base_extra,base_layout],
                                         'equivalentCases':cases})
                # Counterbalance the shared-household order across views/counts.
                rotation=(list(STANDARD_WIDTHS).index(width)+[1,4,10,20,28].index(count))%len(cases)
                ordered=cases[rotation:]+cases[:rotation]
                if (count+width)%2:
                    ordered.reverse()
                for order,(extra,layout) in enumerate(ordered):
                    state=await page.evaluate("""n=>{
                      HomeCastTrial.apply({extra:n,paused:false});
                      return [HomeCastTrial.settings.paused,...['pet','partner','companion'].map(k=>HomeCastTrial.scale(k))];
                    }""",extra)
                    assert not state[0] and all(abs(a-b*(1+extra/100))<1e-8 for a,b in zip(state[1:],BASE_SCALE))
                    await page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
                    sample=await page.evaluate(LIVE_SAMPLE,args.seconds)
                    assert sample['sameNodes'] and sample['rows']==count and sample['pausedSec']==0 and not errors,(count,errors)
                    assert sample['phases'].get('actors',{}).get('calls',0)>0,(args.region,width,count,extra,layout)
                    output['rows'].append(dict(extra=extra,layout=layout,order=order,openingHints=hints,**compact(sample)))
            finally:
                await page.close()
        output['sources']=hashes
    finally:
        await context.close()
    assert {(a['extra'],a['layout']) for a in output['rows']}==required
    return output


async def main(args):
    module=(args.game/'limit-seating.js').resolve()
    if not module.is_file():
        module=(args.game/'game'/'limit-seating.js').resolve()
    if not module.is_file():
        raise ValueError('GAME must contain game/limit-seating.js or limit-seating.js')
    args.outdir.mkdir(parents=True,exist_ok=True)
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        for width in args.widths:
            for count in args.counts:
                target=args.outdir/f'perf-{width}-{args.region}-{count}.json'
                if args.resume and target.is_file():
                    prior=json.loads(target.read_text())
                    if ({(row['extra'],row['layout']) for row in prior['rows']}=={(n,l) for n in args.extras for l in args.layouts}
                        and prior['targetSeconds']==args.seconds and
                        prior['sources']['limit-seating.js']==hashlib.sha256(module.read_bytes()).hexdigest()):
                        continue
                # A retry reloads only the affected fixture and discards partial rows.
                try:
                    result=await measure_fixture(browser,args,module,width,count)
                except Exception:
                    if not args.retry:
                        raise
                    result=await measure_fixture(browser,args,module,width,count)
                tmp=target.with_suffix('.part')
                tmp.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
                tmp.replace(target)
                print(args.region,width,count,len(result['groups']),len(result['rows']),flush=True)
        await browser.close()


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('url')
    p.add_argument('game',type=Path)
    p.add_argument('outdir',type=Path)
    p.add_argument('--region',choices=REGIONS,required=True)
    p.add_argument('--widths',type=int,choices=STANDARD_WIDTHS,nargs='+',default=list(STANDARD_WIDTHS))
    p.add_argument('--counts',type=int,choices=(1,4,10,20,28),nargs='+',default=[1,4,10,20,28])
    p.add_argument('--extras',type=int,choices=GAINS,nargs='+',default=list(GAINS))
    p.add_argument('--layouts',choices=LAYOUTS,nargs='+',default=list(LAYOUTS))
    p.add_argument('--seconds',type=float,default=.9)
    p.add_argument('--resume',action='store_true')
    p.add_argument('--retry',action='store_true')
    asyncio.run(main(p.parse_args()))
