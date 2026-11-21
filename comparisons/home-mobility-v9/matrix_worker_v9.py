"""Replay the shipped drag tape and audit independently aged V7, V8, and V9 homes."""
import argparse
from contextlib import contextmanager
import csv
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlparse
from urllib.request import urlopen
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
BASE = HERE.parent / 'home-mobility-v8'
sys.path.insert(0, str(BASE))
import matrix_worker_v8 as v8

old = v8.old
ARMS = ('v7', 'v8', 'v9')
BASE_SHA = '6b2e2a22ab3981ac748cc645f5f1f53ce91e4c64'
TRACKS = (HERE / 'matrix_tracks.js').read_text()

def patched(name, source):
    source = original_patch(name, source)
    if 'production-model' not in name:
        return source
    for anchor, hook in [
        ('      mobility.result(report,result,actor(key),actors,clock,', 'qa.matrixTracks?.plan(report,result,actor(key),clock,typeof relief!=="undefined"&&relief?.owner===key&&relief.ready);'),
        ('stats.distance+=Math.hypot(p.x-a.x,p.y-a.y);', 'qa.matrixTracks?.hop(a,p,clock);'),
        ("emit('arrive',a,a.source);", 'qa.matrixTracks?.arrive(a,clock);'),
    ]:
        source = old.legacy.once(source, anchor, 'if(qa.ageActive)'+hook+anchor)
    if name=='home-production-model-mobility-v8.js':
        start='relief={owner:a.key,bit,expires:clock+12,search:pairPlan(a,goal,true)};'
        source=old.legacy.once(source,start,start+'if(qa.ageActive)qa.matrixTracks?.remember(a.key,p);')
    return source

original_patch = old.patch

@contextmanager
def native_page(browser, url, region, count, width, arm, aged):
    with patch.object(old, 'patch', patched), old.native_page(browser,url,region,count,width,arm,aged) as (page,touch,meta):
        # V8/V9 rename the telemetry resource; retain original response bytes
        # for historical identity checks just as for the native game scripts.
        scripts = page.evaluate(r"""() => Array.from(document.scripts, s => s.src)
          .filter(s => /\/telemetry(?:-mobility-v\d+)?\.js(?:[?]|$)/.test(s))""")
        old.require(len(scripts)==1, 'missing or duplicate native telemetry')
        observer = page.request.get(scripts[0])
        old.require(observer.ok, 'missing observer')
        meta['hashes'][Path(urlparse(scripts[0]).path).name] = old.digest(observer.body())
        yield page, touch, meta

def history():
    with old.HISTORY.open() as f:
        return {(r['region'],int(r['count']),int(r['width']),r['case'],r['arm']):r for r in csv.DictReader(f)}

def validate(cell, tape):
    coord = (cell['region'],cell['count'],cell['width'])
    old.require(set(cell['arms'])==set(ARMS),'expected all native arms')
    for arm in ARMS[1:]:
        pair = dict(cell, schema=1,suite='matrix',paired=True,
                    arms={'v5':cell['arms']['v7'],'v6':cell['arms'][arm]})
        old.validate_cell(pair,*coord)
    for arm, data in cell['arms'].items():
        opening = old.digest(old.canonical(data['opening']).encode())
        for case, row in data['rows'].items():
            ref = tape[*coord,case,'v6']
            old.require(opening==ref['openingSHA256'] and row['key']==ref['key'] and (row.get('skip') or '')==ref['skip'],'archived display, gesture or body changed')
            if not row.get('skip'):
                old.require(row['start']+row['goal']==[float(ref[k]) for k in ('touchX','touchY','goalX','goalY')],'historical physical coordinates changed')
        aged = data['aged']
        old.require(aged['final']['arm']==arm and abs(aged['final']['modelSeconds']-300)<.001, 'incorrect native arm or aging duration')
        for r in aged['final']['residents']:
            t = aged['tracks'][r['key']]
            completed = [trip for trip in t['trips'] if trip['end'] is not None]
            old.require(len(t['trips'])==r['ambientPlans'] and len(completed)==r['ambientArrivals'],'native report and observed trips disagree')
            old.require(sum(p['escape'] for p in completed)==r['escapeArrivals'],'escape classification mismatch')
            old.require(abs(sum(p['distance'] for p in t['trips'])-r['ambientDistance'])<1e-5,'observed foot distance differs')
            old.require(len(t['stalls'])==r['recoveredEpisodes'] and (t['openFailure'] is None)==(r['openFailure'] is None),'unreconciled failure episode')
    return cell

def run(browser, url, region, count, width, tape, subjects):
    cell = dict(schema=4, region=region,count=count,width=width,height=old.legacy.old.HEIGHTS[width]-52,engine='chromium',arms={})
    for arm in ARMS:
        with native_page(browser,url,region,count,width,arm,False) as (page,touch,meta):
            page.evaluate((v8.PRIOR/'selection-probe.js').read_text())
            scale = page.evaluate('(()=>{const v=NaotocchiHomeViewport.residentPresentation();return [v.scaleX,v.scaleY]})()')
            rows = {}
            for kind,index in old.legacy.cases('matrix',count):
                case = f'{kind}/{index}'
                ref = old.archived_input(tape[region,count,width,case,'v6'],meta['opening'],scale,index)
                if kind=='tap':
                    page.evaluate('mobilitySelectionQA.recordNext=true')
                row = old.legacy.trial(page,touch,index,kind,ref)
                if not row.get('skip'):
                    row['nativeMotion'] = page.evaluate('touchQA.mobilityInput')
                if kind=='tap':
                    row['inkAtPress'] = page.evaluate('mobilitySelectionQA.last')
                rows[case] = row
            cell['arms'][arm] = dict(**meta,rows=rows)
        with native_page(browser,url,region,count,width,arm,True) as (page,touch,start):
            old.require(all(start[k]==meta[k] for k in ('opening','seed','viewport','hashes')),'separate home differs at opening')
            page.evaluate(TRACKS)
            aged = v8.age(page,touch,start,subjects[region,count,width])
            aged['tracks'] = page.evaluate('touchQA.matrixTracks.read()')
            cell['arms'][arm]['aged'] = aged
            if count==28 and width==390:
                cell['arms'][arm]['reloaded'] = old.reload_saved_household(page,meta,touch)
    return validate(cell,tape)

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--region', required=True, choices=old.REGIONS)
    p.add_argument('--url', required=True)
    p.add_argument('--out', required=True, type=Path)
    p.add_argument('--counts', nargs='+',type=int,choices=old.COUNTS,default=old.COUNTS)
    p.add_argument('--widths', nargs='+',type=int,choices=old.WIDTHS,default=old.WIDTHS)
    a = p.parse_args()
    url = a.url.rstrip('/')
    old.require(urlparse(url).hostname in ('localhost','127.0.0.1'),'expected isolated local origin')
    tape, subjects = history(), v8.subjects()
    a.out.mkdir(parents=True,exist_ok=True)
    entries = {}
    for arm in ARMS:
        with urlopen(f'{url}/game/mobility-{arm}.html',timeout=30) as stream:
            entries[arm] = old.digest(stream.read())
    revision = subprocess.check_output(['git','rev-parse','HEAD'],cwd=HERE,text=True).strip()
    with old.sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--disable-dev-shm-usage','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'])
        try:
            manifest = dict(base=BASE_SHA, revision=revision, region=a.region,browser=browser.version,entries=entries,
                            historicalInputsSHA256=old.digest(old.HISTORY.read_bytes()),agedSubjectsSHA256=old.digest(v8.SUBJECTS.read_bytes()),cells={},complete=False)
            for n in a.counts:
                for w in a.widths:
                    cell = run(browser,url,a.region,n,w,tape,subjects)
                    path = a.out/f'{a.region}-{n}-{w}.json'
                    old.save(path,cell)
                    manifest['cells'][path.name] = {'sha256':old.digest(path.read_bytes())}
                    old.save(a.out/'region.json',manifest)
                    print(path.name,'three native arms completed',flush=True)
            manifest['complete'] = len(manifest['cells'])==20
            old.save(a.out/'region.json',manifest)
        finally:
            browser.close()

if __name__=='__main__':
    main()
