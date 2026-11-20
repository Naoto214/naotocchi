"""Check the paired released V4 and finish game in one real mobile Chromium viewport at a time."""
import argparse
import csv
import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
REGIONS = 'home forest river_lake city countryside mountain snow sea jungle desert deepsea star_stop memory_lake'.split()
# Account for the shell's bottom controls in the native game viewport.
HEIGHTS = {320:516, 375:760, 390:792, 430:880, 321:516, 348:640, 360:694, 374:760}
DAYPARTS = ['morning','day','evening','night']
COLUMNS = ['region','count','width','height','extraPercent','actors','gear','maxCssScaleError','maxAspectError',
           'v4ScaleError','v4AspectError','groundValid','v4GroundValid','fitRecoveries','v4FitRecoveries',
           'sameRosterAndAssetDimensions','groundToggleGeometryIdentical','sizeBRoleAndAspectMatch',
           'v4NativePoseSha256','finishNativePoseSha256']


def digest(data):
    return hashlib.sha256(json.dumps(data,separators=(',',':'),ensure_ascii=False).encode()).hexdigest()


def record(case, base, finish):
    count = case['count']
    for sample in (base,finish):
        assert len(sample['rows']) == count and sample['heroes']==1 and sample['partners']==int(count>1), case
        assert sample['groundValid']==count and sample['background'].endswith(f"{case['region']}-day.webp"), (case,sample['groundValid'],sample['background'])
    # Role factors are measured from the actual displayed transforms on each axis.
    # Pixel poses have separate digests as the camera can settle on a different native frame.
    roster = lambda s: [row[:5] for row in s['rows']]
    assert roster(base)==roster(finish), ('changed resident, role, or source geometry',case)
    assert base['extra']==finish['extra'], ('policy mismatch',case)
    return [case['region'],count,case['width'],case['height'],round(finish['extra'],8),count,len(finish['equipment']),
            round(finish['scaleError'],8),round(finish['aspectError'],8),
            round(base['scaleError'],8),round(base['aspectError'],8),
            finish['groundValid'],base['groundValid'],finish['fitRecoveries'],base['fitRecoveries'],
            1,1,1,digest([base['rows'],base['equipment']]),digest([finish['rows'],finish['equipment']])]


def measure(browser, origin, region, count, widths, finish):
    first = widths[0]
    context = browser.new_context(viewport={'width':first,'height':HEIGHTS[first]},
        is_mobile=True,has_touch=True,device_scale_factor=2,reduced_motion='reduce')
    context.add_init_script(path=HERE/'regression_probe.js')
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.clock.set_fixed_time(datetime(2026,10,15,3,tzinfo=timezone.utc))
    entry='finish' if finish else 'population'
    query=urlencode(dict(region=region,count=count,time='day',policy='B',variant='B',
                         curve='linear',layout='optimized',ground='on',paused=1,clock=0))
    try:
        page.goto(origin.rstrip('/')+'/game/'+entry+'.html?'+query,wait_until='domcontentloaded',timeout=90000)
        records={}
        for width in widths:
            size={'width':width,'height':HEIGHTS[width]}
            if page.viewport_size != size:
                page.set_viewport_size(size)
            case=dict(region=region,count=count,finish=finish,**size)
            try:
                handle=page.wait_for_function('args=>window.regressionSample?.(args)',arg=case,polling=100,timeout=90000)
            except Exception as exc:
                state=page.evaluate("""() => ({href:location.href,ready:window.HomeCastTrial?.ready,policy:window.HomeCastTrial?.settings,
                    world:document.querySelector('#castStage')?.dataset.livingMetrics,canvas:window.regressionBackground?.currentSrc,
                    hasGround:!!window.HomeFinishGround,scene:!!window.regressionScene,actors:window.HomeCastTrial?.inspect().length,
                    gear:[...document.querySelectorAll('#petAccessory,.partner-ring,.partner-heart')].map(n=>[n.className,n.getBoundingClientRect().width])})""")
                raise RuntimeError(f'{case}: {state}; errors {errors}') from exc
            records[width]=handle.json_value()
            handle.dispose()
        assert not errors, errors
        return records
    finally:
        context.close()


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('url',help='The V5 distribution includes its unmodified V4 reference game')
    ap.add_argument('--region',choices=REGIONS,required=True)
    ap.add_argument('--counts',type=int,nargs='+',default=range(1,29))
    ap.add_argument('--widths',type=int,nargs='+',default=[375,320,390,430],choices=HEIGHTS)
    ap.add_argument('--out',required=True,type=Path)
    ap.add_argument('--baseline-only',action='store_true',help='Diagnostic paired-V4 smoke while developing the harness')
    args=ap.parse_args()
    args.out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),
            args=['--disable-dev-shm-usage','--disable-renderer-backgrounding'])
        rows=[]
        for count in args.counts:
            base=measure(browser,args.url,args.region,count,args.widths,False)
            if args.baseline_only:
                print('baseline smoke',args.region,count,[(w,s['scaleError'],s['groundValid'],len(s['equipment'])) for w,s in base.items()],flush=True)
                continue
            finish=measure(browser,args.url,args.region,count,args.widths,True)
            for width in args.widths:
                case=dict(region=args.region,count=count,width=width,height=HEIGHTS[width])
                rows.append(record(case,base[width],finish[width]))
            with (args.out/(args.region+'.csv')).open('w',newline='') as out:
                writer=csv.writer(out,lineterminator='\n')
                writer.writerow(COLUMNS)
                writer.writerows(rows)
            print('paired',args.region,count,len(rows),flush=True)
        if not args.baseline_only:
            (args.out/(args.region+'.json')).write_text(json.dumps({'browser':browser.version,'region':args.region,
                'counts':list(args.counts),'widths':args.widths,'cases':len(rows),'gameSource':entry_hashes(args.url)},indent=2)+'\n')
        browser.close()


def entry_hashes(origin):
    import urllib.request
    return {entry:hashlib.sha256(urllib.request.urlopen(origin.rstrip('/')+'/game/'+entry).read()).hexdigest()
            for entry in ['finish.html','population.html','population-policy.js']}


if __name__=='__main__':
    main()
