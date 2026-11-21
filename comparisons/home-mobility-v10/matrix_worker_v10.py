"""Replay canonical trusted gestures and independently aged households, then cross replay aged states."""
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
sys.path.insert(0, str(HERE.parent / 'home-mobility-v9'))
import matrix_worker_v9 as v9

old, v8 = v9.old, v9.v8
ARMS = ('v9','v10')
BASE_SHA = 'be5db6804bf0bee872080bae49cb714f295a461b'
STATE = (HERE/'matrix-state.js').read_text()
INK = (v8.PRIOR/'selection-probe.js').read_text()
AGED_HISTORY = HERE/'matrix-aged-history.csv'


def history_aged():
    with AGED_HISTORY.open() as f:
        return {(r['region'],int(r['count']),int(r['width']),r['arm']):r for r in csv.DictReader(f)}


@contextmanager
def native_page(browser, url, region, count, width, arm, aged):
    with patch.object(v9,'patched',instrument_source), v9.native_page(browser,url,region,count,width,arm,aged) as room:
        yield room


# Preserve the immutable V9 chain; the route handler resolves v9.patched at entry.
original_patch = v9.patched
def instrument_source(name, source):
    source = original_patch(name,source)
    if 'production-model' in name:
        source = old.legacy.once(source,'    let checkpoint;',STATE+'\n    let checkpoint;')
    if 'production-diorama' in name:
        anchor='g.drag=isDrag(g,e);clearGesture();'
        hook='''if(window.touchQA?.log)window.touchQA.matrixRelease={
          key:g.key,drag:g.drag,busy,sawSoft:g.sawSoft,wasBlocked,hard:busy&&hardInputBlock(),
          paused:env.HomeCastTrial.settings.paused,sameNavigation:g.navigation===scene?.navigation,
          sameOwner:!g.key||rows.get(g.key)?.owner===g.owner,trusted:e.isTrusted&&g.trusted};'''
        source=old.legacy.once(source,anchor,anchor+hook)
    return source


def opening_gestures(page, touch, coord, meta, tape):
    page.evaluate(INK)
    scale = page.evaluate('(()=>{const v=NaotocchiHomeViewport.residentPresentation();return [v.scaleX,v.scaleY]})()')
    rows = {}
    for kind,index in old.legacy.cases('matrix',coord[1]):
        case = f'{kind}/{index}'
        ref = old.archived_input(tape[*coord,case,'v6'],meta['opening'],scale,index)
        if kind=='tap':
            page.evaluate('mobilitySelectionQA.recordNext=true')
        row = old.legacy.trial(page,touch,index,kind,ref)
        if not row.get('skip'):
            row['nativeMotion'] = page.evaluate('touchQA.mobilityInput')
        if kind=='tap':
            row['inkAtPress'] = page.evaluate('mobilitySelectionQA.last')
        rows[case] = row
    return rows


def natural_aging(page, touch, meta, subject, tracks):
    page.evaluate(INK)
    if tracks:
        page.evaluate(v9.TRACKS)
    native_trial = old.legacy.trial
    snapshot = {}
    def at_aged_drag(*args):
        snapshot.update(page.evaluate('touchQA.matrixState()'))
        page.evaluate('mobilitySelectionQA.recordNext=true;touchQA.matrixRelease=null')
        row = native_trial(*args)
        row['nativeRelease'] = page.evaluate('touchQA.matrixRelease')
        row['inkAtPress'] = page.evaluate('mobilitySelectionQA.last')
        return row
    with patch.object(old.legacy,'trial',at_aged_drag):
        aged = v8.age(page,touch,meta,subject)
    if tracks:
        aged['tracks'] = page.evaluate('touchQA.matrixTracks.read()')
    old.require(abs(snapshot['clock']-300)<.001,'checkpoint did not precede aged drag')
    return aged,snapshot


def same_input(row,ref):
    differences={}
    for k in ('start','goal','foot','modelGoal','key'):
        if row[k]!=ref[k]:
            differences[k]={'expected':ref[k],'observed':row[k]}
    for k in ('origin','scale'):
        if max(abs(u-v) for u,v in zip(row[k],ref[k],strict=True))>1e-9:
            differences[k]={'expected':ref[k],'observed':row[k]}
    return differences


def shared_drop(page,touch,index,state,ref,opening):
    # The receiving controller must be in its normal input-ready state before
    # restoring the comparison clock. A stale pause flag is not a route refusal.
    page.evaluate('HomeCastTrial.apply({paused:false});touchQA.manual=false')
    page.wait_for_function("""() => { const g=touchQA.gates();
        if (g.blocked || g.trialPaused || g.pending || touchQA.matrixState().paused) return false;
        touchQA.manual=true;return true;}""",timeout=55000)
    page.evaluate(INK)
    page.evaluate("""s=>{
        touchQA.restore=()=>{touchQA.matrixLoad(s);touchQA.paint()};
        touchQA.restore(); mobilitySelectionQA.recordNext=true;touchQA.matrixRelease=null;
    }""",state)
    old.require(page.evaluate('touchQA.opening()')==opening,'shared native feet including CSS projection changed')
    row = old.legacy.trial(page,touch,index,'historical',ref)
    row['nativeMotion'] = page.evaluate('touchQA.mobilityInput')
    row['nativeRelease'] = page.evaluate('touchQA.matrixRelease')
    row['inkAtPress'] = page.evaluate('mobilitySelectionQA.last')
    old.require(row['trusted'] and not row['initialGate']['blocked'] and not row['initialGate']['trialPaused'],'inactive shared input')
    return row


def run(browser,url,coord,tape,subjects,history):
    region,count,width = coord
    cell = dict(schema=5,region=region,count=count,width=width,height=old.legacy.old.HEIGHTS[width]-52,
                engine='chromium',arms={},shared={})
    refs = {arm:history[*coord,arm] for arm in ('v8','v9')}
    changed = refs['v8']['arrival']!=refs['v9']['arrival']
    donors = {}
    for arm in (*ARMS, *(('v8',) if changed else ())):
        if arm in ARMS:
            with native_page(browser,url,*coord,arm,False) as (page,touch,meta):
                rows = opening_gestures(page,touch,coord,meta,tape)
                cell['arms'][arm] = dict(**meta,rows=rows)
        with native_page(browser,url,*coord,arm,True) as (page,touch,start):
            if arm in ARMS:
                old.require(all(start[k]==meta[k] for k in ('opening','seed','viewport','hashes')),'separate opening changed')
            aged,state = natural_aging(page,touch,start,subjects[coord],arm in ARMS)
            if arm in ARMS:
                cell['arms'][arm]['aged'] = aged
                if count==28 and width==390:
                    cell['arms'][arm]['reloaded'] = old.reload_saved_household(page,meta,touch)
            if arm in ('v8','v9'):
                donors[arm] = (state,aged)
    for arm in ('v8','v9','v10'):
        with native_page(browser,url,*coord,arm,False) as (page,touch,meta):
            for donor,(state,aged) in donors.items():
                hist = refs[donor]
                matching = old.digest(old.canonical(aged['opening']).encode())==hist['openingSHA256']
                ref = dict(aged['drag'])
                if matching:
                    ref['start'] = [float(hist[k]) for k in ('touchX','touchY')]
                    ref['goal'] = [float(hist[k]) for k in ('goalX','goalY')]
                    ref['modelGoal'] = [float(hist[k]) for k in ('modelX','modelY')]
                series = cell['shared'].setdefault(donor,dict(snapshot=state,opening=aged['opening'],
                    natural=aged['drag'],input={k:ref[k] for k in ('start','goal','foot','origin','modelGoal','scale','key')},
                    historicFeetAndCoordinates=matching,replays={}))
                retries=[]
                for attempt in range(3):
                    row=shared_drop(page,touch,aged['index'],state,ref,aged['opening'])
                    mismatch=same_input(row,series['input'])
                    if not mismatch:break
                    retries.append(mismatch)
                series['replays'][arm]=dict(scripts=meta['hashes'],row=row,coordinateRetries=retries)
    return cell


def validate(cell,tape,history):
    coord = (cell['region'],cell['count'],cell['width'])
    old.require(set(cell['arms'])==set(ARMS),'missing native candidate or baseline')
    contract = dict(cell,schema=1,suite='matrix',paired=True,arms=dict(v5=cell['arms']['v9'],v6=cell['arms']['v10']))
    old.validate_cell(contract,*coord)
    for arm,data in cell['arms'].items():
        sha = old.digest(old.canonical(data['opening']).encode())
        for case,row in data['rows'].items():
            ref = tape[*coord,case,'v6']
            old.require(sha==ref['openingSHA256'] and row['key']==ref['key'] and (row.get('skip') or '')==ref['skip'],'archived initial state changed')
            if not row.get('skip'):
                old.require(row['start']+row['goal']==[float(ref[k]) for k in ('touchX','touchY','goalX','goalY')],'archived finger coordinates changed')
        aged = data['aged']
        old.require(aged['final']['arm']==arm and abs(aged['final']['modelSeconds']-300)<.001,'wrong native age or origin')
        for r in aged['final']['residents']:
            tr = aged['tracks'][r['key']]
            completed = [p for p in tr['trips'] if p['end'] is not None]
            old.require(len(tr['trips'])==r['ambientPlans'] and len(completed)==r['ambientArrivals'] and sum(p['escape'] for p in completed)==r['escapeArrivals'],'trip markers diverged')
            old.require(abs(sum(p['distance'] for p in tr['trips'])-r['ambientDistance'])<1e-5 and len(tr['stalls'])==r['recoveredEpisodes'],'foot observer diverged')
    differ = history[*coord,'v8']['arrival']!=history[*coord,'v9']['arrival']
    old.require(set(cell['shared'])==({'v8','v9'} if differ else {'v9'}),'wrong crossover cohort')
    for series in cell['shared'].values():
        ref = series['input']
        old.require(set(series['replays'])=={'v8','v9','v10'},'incomplete shared feet replays')
        for arm,x in series['replays'].items():
            row=x['row']
            diffs=same_input(row,ref)
            old.require(not diffs,f'{coord}/{arm} shared-state mismatch: {diffs}')
            old.require(row['goalClass']==series['replays']['v9']['row']['goalClass'],'shared endpoint geometry differs')
            old.require(row['trusted'] and row['inkAtPress'] is not None,'missing actual drop or ink probe')
    return cell


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--region',required=True,choices=old.REGIONS)
    p.add_argument('--url',required=True)
    p.add_argument('--out',required=True,type=Path)
    p.add_argument('--counts',nargs='+',type=int,choices=old.COUNTS,default=old.COUNTS)
    p.add_argument('--widths',nargs='+',type=int,choices=old.WIDTHS,default=old.WIDTHS)
    a=p.parse_args()
    url=a.url.rstrip('/')
    old.require(urlparse(url).hostname in ('localhost','127.0.0.1'),'expected isolated local origin')
    tape,subjects,history=v9.history(),v8.subjects(),history_aged()
    a.out.mkdir(parents=True,exist_ok=True)
    revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=HERE,text=True).strip()
    entries={}
    for arm in ('v8',*ARMS):
        with urlopen(f'{url}/game/mobility-{arm}.html',timeout=30) as stream:
            entries[arm]=old.digest(stream.read())
    with old.sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),
            args=['--disable-dev-shm-usage','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'])
        try:
            manifest=dict(base=BASE_SHA,revision=revision,region=a.region,browser=browser.version,entries=entries,
                historicalInputsSHA256=old.digest(old.HISTORY.read_bytes()),agedSubjectsSHA256=old.digest(v8.SUBJECTS.read_bytes()),
                historicAgedResultsSHA256=old.digest(AGED_HISTORY.read_bytes()),cells={},complete=False)
            for n in a.counts:
                for w in a.widths:
                    cell=run(browser,url,(a.region,n,w),tape,subjects,history)
                    f=a.out/f'{a.region}-{n}-{w}.json'
                    old.save(f,cell)
                    # Keep a failed native observation available for diagnosis.
                    validate(cell,tape,history)
                    manifest['cells'][f.name]={'sha256':old.digest(f.read_bytes())}
                    old.save(a.out/'region.json',manifest)
                    print(f.name,'natural and matched-state trials recorded',flush=True)
            manifest['complete']=len(manifest['cells'])==20
            old.save(a.out/'region.json',manifest)
        finally:
            browser.close()


if __name__=='__main__':
    main()
