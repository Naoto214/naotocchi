"""Replay the shipped V7 touch tape and age independent V6/V7/V8 homes."""
import argparse
import csv
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlparse
from urllib.request import urlopen

HERE = Path(__file__).resolve().parent
PRIOR = HERE.parent / 'home-mobility-v7'
sys.path.insert(0, str(PRIOR))
import matrix_worker as old

ARMS = ('v6', 'v7', 'v8')
FLAGS = ('selected', 'issued', 'accepted', 'routed', 'moved', 'arrived', 'near4', 'terminalArrived', 'terminalNear4')
SUBJECTS = HERE / 'matrix-aged-subjects.csv'
AGE_PROBE = (PRIOR / 'matrix_age.js').read_text()
PAINT_PROBE = (HERE / 'matrix_presentation.js').read_text()

def subjects():
    with SUBJECTS.open() as src:
        return {(r['region'],int(r['count']),int(r['width'])):r['key'] for r in csv.DictReader(src)}

def validate(c, history):
    for arm in ARMS[1:]:
        pair = dict(c, schema=1, suite='matrix', paired=True, arms={'v5':c['arms']['v6'],'v6':c['arms'][arm]})
        old.validate_cell(pair, c['region'], c['count'], c['width'])
    differences = []
    for key,row in c['arms']['v6']['rows'].items():
        ref = history[c['region'], c['count'], c['width'], key, 'v6']
        opening = old.digest(old.canonical(c['arms']['v6']['opening']).encode())
        old.require(opening==ref['openingSHA256'] and row['key']==ref['key'] and (row.get('skip') or '')==ref['skip'], 'archived fixture or skipped case changed')
        if row.get('skip'): continue
        old.require(row['start']+row['goal']==[float(ref[k]) for k in ('touchX','touchY','goalX','goalY')], 'archived finger position changed')
        for name in FLAGS:
            if row[name]!=(ref[name]=='True'):
                differences.append(dict(case=key,field=name,observed=row[name],historical=ref[name]=='True'))
    c['historicalOutcomeDifferences'] = differences
    return c

def age(page,touch,meta,key):
    page.evaluate(AGE_PROBE)
    page.evaluate(PAINT_PROBE)
    page.evaluate('HomeMobilityDiagnostics.enable();HomeCastTrial.apply({paused:false});touchQA.log=null;touchQA.paint()')
    initial = page.evaluate('HomeMobilityDiagnostics.read()')
    def frame():
        return page.evaluate('({...touchQA.footFrame(), presentation:touchQA.presentationFrame()})')
    frames = [frame()]
    for sec in range(60,301,60):
        page.evaluate('touchQA.ageActive=true;touchQA.advance(60,true)')
        f = frame()
        old.require(abs(f['clock']-sec)<.001, 'incorrect native age')
        frames.append(f)
    end = page.evaluate('HomeMobilityDiagnostics.read()')
    roster = [a[0] for a in meta['opening']]
    for f in frames:
        old.require(set(f['keys'])==set(roster), 'missing displayed resident')
    old.require({x['key'] for x in end['residents']}==set(roster), 'missing measured resident')
    safety = page.evaluate('touchQA.ageActive=false;touchQA.ageSafety')
    opening = page.evaluate('touchQA.opening()')
    page.evaluate('touchQA.restore=()=>{}')
    index = roster.index(key)
    row = old.legacy.trial(page,touch,index,'historical')
    old.require(row['trusted'] and row['key']==key, 'aged finger not delivered to the comparison')
    row['nativeMotion'] = page.evaluate('touchQA.mobilityInput')
    return dict(initial=initial,final=end,frameSamples=frames,opening=opening,safety=safety,index=index,drag=row,postDrag=page.evaluate('HomeMobilityDiagnostics.read()'))

def include_native_observer(page, meta, arm):
    # V8 has its own named opt-in telemetry module. Read the exact loaded resource
    # without changing the frozen controller, response bodies or timing hooks.
    if arm != 'v8':
        return
    url = page.evaluate("""() => performance.getEntriesByType('resource').map(e => e.name)
      .find(url => new URL(url).pathname.endsWith('/telemetry-mobility-v8.js'))""")
    old.require(url, 'native V8 observer was not loaded')
    response = page.request.get(url)
    old.require(response.ok, 'V8 observer unavailable')
    meta['hashes']['telemetry-mobility-v8.js'] = old.digest(response.body())

def run(browser,origin,region,n,w,history,observed):
    cell = dict(schema=3,region=region,count=n,width=w,height=old.legacy.old.HEIGHTS[w]-52,engine='chromium',arms={})
    for arm in ARMS:
        with old.native_page(browser,origin,region,n,w,arm,False) as (page,touch,meta):
            include_native_observer(page,meta,arm)
            page.evaluate((PRIOR/'selection-probe.js').read_text())
            scale = page.evaluate('(()=>{const v=NaotocchiHomeViewport.residentPresentation();return [v.scaleX,v.scaleY]})()')
            rows = {}
            for kind,index in old.legacy.cases('matrix',n):
                key = f'{kind}/{index}'
                ref = old.archived_input(history[region,n,w,key,'v6'],meta['opening'],scale,index)
                if kind=='tap': page.evaluate('mobilitySelectionQA.recordNext=true')
                row = old.legacy.trial(page,touch,index,kind,ref)
                if not row.get('skip'): row['nativeMotion'] = page.evaluate('touchQA.mobilityInput')
                if kind=='tap': row['inkAtPress'] = page.evaluate('mobilitySelectionQA.last')
                rows[key] = row
            cell['arms'][arm] = dict(**meta,rows=rows)
        with old.native_page(browser,origin,region,n,w,arm,True) as (page,touch,start):
            include_native_observer(page,start,arm)
            for k in ('opening','seed','viewport','hashes'):
                old.require(start[k]==meta[k], 'independent opening differs: '+k)
            cell['arms'][arm]['aged'] = age(page,touch,start,observed[region,n,w])
            if n==28 and w==390:
                cell['arms'][arm]['reloaded'] = old.reload_saved_household(page,meta,touch)
    return validate(cell,history)

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--region',required=True,choices=old.REGIONS)
    p.add_argument('--url',required=True)
    p.add_argument('--out',required=True,type=Path)
    p.add_argument('--counts',nargs='+',type=int,choices=old.COUNTS,default=old.COUNTS)
    p.add_argument('--widths',nargs='+',type=int,choices=old.WIDTHS,default=old.WIDTHS)
    a = p.parse_args()
    old.require(urlparse(a.url).hostname in ('localhost','127.0.0.1'),'expected isolated comparison origin')
    with old.HISTORY.open() as f:
        history = {(r['region'],int(r['count']),int(r['width']),r['case'],r['arm']):r for r in csv.DictReader(f)}
    observed = subjects()
    a.out.mkdir(parents=True,exist_ok=True)
    origin = a.url.rstrip('/')
    entries={}
    for arm in ARMS:
        with urlopen(f'{origin}/game/mobility-{arm}.html',timeout=30) as response:
            entries[arm]=old.digest(response.read())
    with old.sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--disable-dev-shm-usage','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'])
        try:
            manifest=dict(region=a.region,revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=HERE,text=True).strip(),browser=browser.version,entries=entries,historicalInputsSHA256=old.digest(old.HISTORY.read_bytes()),agedSubjectsSHA256=old.digest(SUBJECTS.read_bytes()),cells={},complete=False)
            for n in a.counts:
                for w in a.widths:
                    cell=run(browser,origin,a.region,n,w,history,observed)
                    path=a.out/f'{a.region}-{n}-{w}.json'
                    old.save(path,cell)
                    manifest['cells'][path.name]=dict(sha256=old.digest(path.read_bytes()))
                    old.save(a.out/'region.json',manifest)
                    print(path.name, 'completed; historical V6 flag differences',len(cell['historicalOutcomeDifferences']),flush=True)
            manifest['complete']=len(manifest['cells'])==20
            old.save(a.out/'region.json',manifest)
        finally:
            browser.close()

if __name__=='__main__':
    main()
