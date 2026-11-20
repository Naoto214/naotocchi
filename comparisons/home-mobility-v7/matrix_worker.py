"""Replay #575's physical touch inputs, then measure independently aged homes on three native entries."""
import argparse
from contextlib import contextmanager
import csv
import hashlib
import json
import os
import re
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlencode
from urllib.request import urlopen
from time import monotonic

from playwright.sync_api import sync_playwright

HERE=Path(__file__).resolve().parent
V6=HERE.parent/'home-drag-v6'
sys.path.insert(0,str(V6))
import measure_input as legacy
from matrix_contract import COUNTS,REGIONS,WIDTHS,require,validate_cell
from matrix_report import canonical,digest

ARMS=('v5','v6','v7')
AGE_SECONDS=300
CHECKPOINT_SECONDS=60
HISTORY=V6/'evidence/matrix-inputs.csv'


def save(path,data):
    temp=path.with_suffix('.tmp')
    temp.write_text(canonical(data)+'\n')
    temp.replace(path)


def patch(name,source):
    if name.startswith('script-v2'):
        anchor='  let state = loadState();'
        source=legacy.once(source,anchor,anchor+'''
  const qaSaveFields=()=>({money:state.lifetime.money,petId:state.id??null,regionId:state.regionId,stage:state.stage,gear:state.lifetime.equippedItemId??null,partner:state.partner?.id??null,companions:state.companions.map(c=>c.id),revision:state.lifetime.saveRevision});
  window.mobilitySaveQA={atLoad:qaSaveFields(),markAndSave(){const before=qaSaveFields();state.lifetime.money+=271;saveState();return {before,after:qaSaveFields(),raw:localStorage.getItem(SAVE_KEY)};}};''')
    if name=='fixture.js':
        anchor="localStorage.setItem('naotocchi-cast-size-v1-fixture',JSON.stringify(state));"
        return legacy.once(source,anchor,"localStorage.setItem('naotocchi-cast-size-v1-fixture',window.mobilityRestoreQA??JSON.stringify(state));")
    if 'production-model' not in name:
        return legacy.patch_source(name,source)
    # V7's opt-in telemetry adds an outer native move() and a separate executeMove().
    # Time one *whole* planner call at the outer function's own return boundary.
    begin="    function move(key,p,source='tap',{pointerDrop=false}={}){"
    boundary='    }\n    function executeMove('
    if boundary not in source:boundary='    }\n    function idle(a){'
    source=legacy.once(source,begin,begin+"\n      const sink=globalThis.touchQA?.log,tic=sink?performance.now():0;try{\n")
    source=legacy.once(source,boundary,"      }finally{if(sink&&pointerDrop)(sink.modelPlans||=[]).push({key,clock,retry:retryingKey===key,ms:performance.now()-tic});}\n"+boundary)
    model_export='    return {metrics:'
    source=legacy.once(source,model_export,legacy.old.MODEL_HOOK+legacy.MODEL_STATE+model_export)
    plan='a.route=path.slice(1);a.target=path[0];a.source=source;'
    source=legacy.once(source,plan,"if(qa.log&&source==='drag'&&key===qa.key)qa.log.plans.push({clock,request:[p.x,p.y],chosen:[q.x,q.y],path:path.map(v=>[v.x,v.y])});"+plan)
    source=re.sub(r'if\(mobility\?\.enabled\)mobility\.yielded\(a,b,clock[^;]*\);',lambda m:"if(qa.log)(qa.log.mobilityYields||=[]).push({key:a.key,peer:b.key,clock});"+m.group(),source)
    hop='stats.distance+=Math.hypot(p.x-a.x,p.y-a.y);'
    return legacy.old.PREFIX+legacy.once(source,hop,legacy.old.STEP_AUDIT+legacy.PEER_STEP+'qa.auditMobilityStep?.(a,p,dt,speed,scene,actors,bounds,visible);'+hop)


@contextmanager
def native_page(browser,url,region,count,width,arm,aged,*,canonical=True,touch_session=None):
    ctx=browser.new_context(viewport={'width':width,'height':legacy.old.HEIGHTS[width]-52},has_touch=True,is_mobile=True,device_scale_factor=2)
    errors=[]
    hashes={}
    def instrument(route):
        try:
            response=route.fetch()
            name=Path(route.request.url.split('?')[0]).name
            src=response.text()
            hashes[name]=digest(src.encode())
            route.fulfill(response=response,body=patch(name,src))
        except Exception as error:
            errors.append(str(error));route.abort()
    for pattern in ('*production-model*.js*','*production-diorama*.js*','*route-navigation*.mjs*','*population-beauty.js*','script-v2*.js*','drag-trial-hooks.js*','telemetry.js*','beauty/fixture.js*'):
        ctx.route('**/'+pattern,instrument)
    page=ctx.new_page()
    page.on('pageerror',lambda e:errors.append(str(e)))
    try:
        params=dict(region=region,count=count,time='day',paused=1,ground='on',variant='B',policy='B',layout='optimized',curve='linear',compareSplit=0,paired=int(canonical),diagnostics=int(aged))
        page.goto(f'{url}/game/mobility-{arm}.html?'+urlencode(params),wait_until='domcontentloaded',timeout=90000)
        if errors:raise RuntimeError(errors)
        page.wait_for_function('window.HomeCastTrial?.ready && window.touchQA?.model',timeout=55000)
        if canonical:page.wait_for_function('!!HomeDragTrial.opening()',timeout=55000)
        page.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()))")
        page.evaluate((legacy.V5/'touch_probe.js').read_text());page.evaluate((V6/'input_probe.js').read_text())
        page.evaluate('''(()=>{const result=touchQA.result;touchQA.result=()=>{
          const r=result(), actual=r.steps.filter(s=>Math.hypot(s[1]-s[4],s[2]-s[5])>.00001);
          const offered=(r.mobilityYields||[]).filter(e=>e.key===touchQA.key);
          touchQA.mobilityInput={firstNativeFootClock:actual[0]?.[0]??null,lastNativeFootClock:actual.at(-1)?.[0]??null,
            offered,steppedAfterOffer:offered.some(e=>actual.some(s=>s[0]>e.clock+1e-8))};return r;
        };})()''')
        page.evaluate('touchQA.manual=true;touchQA.checkpoint()')
        opening=page.evaluate('touchQA.opening()')
        require(len(opening)==count,'opening roster size mismatch')
        meta=dict(opening=opening,seed=page.evaluate('touchQA.readSeed()'),canonicalOpening=canonical,hashes=hashes,
                  viewport=page.evaluate('[innerWidth,innerHeight]'),browser=browser.version)
        yield page,(touch_session if touch_session is not None else ctx.new_cdp_session(page)),meta
        if errors:raise RuntimeError(errors)
    except Exception:
        if errors:print('Native observer error:',errors,flush=True)
        raise
    finally:ctx.close()


def aged_home(page,touch,meta,index):
    page.evaluate((HERE/'matrix_age.js').read_text())
    page.evaluate('HomeMobilityDiagnostics.enable(); HomeCastTrial.apply({paused:false}); touchQA.log=null; touchQA.paint()')
    first=page.evaluate('HomeMobilityDiagnostics.read()')
    frames=[page.evaluate('touchQA.footFrame()')]
    for _ in range(AGE_SECONDS//CHECKPOINT_SECONDS):
        frames.append(page.evaluate('s=>touchQA.ageTo(s)',CHECKPOINT_SECONDS))
    snapshot=page.evaluate('HomeMobilityDiagnostics.read()')
    required={a[0] for a in meta['opening']}
    require(set(x['key'] for x in snapshot['residents'])==required,'incomplete aged resident census')
    for at,frame in enumerate(frames):
        require(set(frame['keys'])==required and abs(frame['clock']-at*CHECKPOINT_SECONDS)<.001,'missing rendered time or actor')
    if index is None:
        by_key={x['key']:x for x in snapshot['residents']}
        # Choose the stationary blocked resident, then elapsed idle time, in original roster order.
        def priority(i):
            r=by_key[meta['opening'][i][0]]
            return (r['ambientFailures']>0 and not r['ambientStarts'],r['ambientFailures']>0,r['lastMovedAgo'] or 0,-i)
        index=max(range(len(meta['opening'])),key=priority)
    safety=page.evaluate('touchQA.ageActive=false;touchQA.ageSafety')
    aged_open=page.evaluate('touchQA.opening()')
    # No restoration: retain this arm's genuinely advanced household and clocks.
    page.evaluate('touchQA.restore=()=>{}')
    drag=legacy.trial(page,touch,index,'historical')
    require(not drag.get('skip') and drag['trusted'] and drag['key']==meta['opening'][index][0],'post-aging input lost')
    post=page.evaluate('HomeMobilityDiagnostics.read()')
    return dict(opening=aged_open,frameSamples=frames,initial=first,final=snapshot,safety=safety,index=index,drag=drag,postDrag=post)


def reload_saved_household(page,meta,touch):
    saved=page.evaluate('mobilitySaveQA.markAndSave()')
    require(saved['after']['money']==saved['before']['money']+271,'native save marker did not change')
    raw=saved['raw'];data=json.loads(raw)
    require(data['lifetime']['money']==saved['after']['money'] and data['lifetime']['saveRevision']==saved['after']['revision'],'native serialized save lacks revision or marker')
    # The owner fixture uses in-memory storage. Replay the exact real save bytes at
    # that fixture boundary on reload, before the game's normal loadState().
    page.add_init_script('window.mobilityRestoreQA='+json.dumps(raw,ensure_ascii=True))
    page.reload(wait_until='domcontentloaded',timeout=90000)
    page.wait_for_function('window.HomeCastTrial?.ready&&window.touchQA?.model&&!!HomeDragTrial.opening()',timeout=55000)
    page.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()))")
    page.evaluate((legacy.V5/'touch_probe.js').read_text());page.evaluate((V6/'input_probe.js').read_text())
    page.evaluate('touchQA.manual=true;touchQA.checkpoint()')
    loaded=page.evaluate('mobilitySaveQA.atLoad')
    require(loaded==saved['after'],'the native load did not restore the serialized household fields')
    restored=page.evaluate('touchQA.opening()')
    require([a[0] for a in restored]==[a[0] for a in meta['opening']],'resident roster lost on reload')
    row=legacy.trial(page,touch,0,'historical')
    require(row['trusted'],'post-restore physical input not delivered')
    return {'saveSHA256':digest(raw.encode()),'bytes':len(raw.encode()),'before':saved['before'],'saved':saved['after'],'loaded':loaded,
            'roster':[a[0] for a in restored], 'drag':row}


def archived_input(ref,opening,scale,index):
    # Replay the #575 pointer coordinates exactly: CSS animation can move an ink sample
    # fractionally between real frames, even when the native model clock is frozen.
    key=opening[index][0]
    require(ref['key']==key,'historical actor mismatch')
    if ref['skip']:
        return {'index':index,'key':key,'kind':ref['case'].split('/')[0],'skip':ref['skip']}
    start=[float(ref[k]) for k in ('touchX','touchY')]
    goal=[float(ref[k]) for k in ('goalX','goalY')]
    foot=opening[index][5:7]
    point=[opening[index][i+1]+(goal[i]-foot[i])/scale[i] for i in (0,1)]
    return {'key':key,'foot':foot,'start':start,'goal':goal,'modelGoal':point,'skip':None}


def run_cell(browser,url,region,n,w,history):
    cell=dict(schema=2,region=region,count=n,width=w,height=legacy.old.HEIGHTS[w]-52,engine='chromium',arms={})
    for arm in ARMS:
        with native_page(browser,url,region,n,w,arm,False) as (page,touch,meta):
            page.evaluate((HERE/'selection-probe.js').read_text())
            rows={}
            scale=page.evaluate('(()=>{const v=NaotocchiHomeViewport.residentPresentation();return [v.scaleX,v.scaleY];})()')
            for kind,index in legacy.cases('matrix',n):
                key=f'{kind}/{index}'
                ref=archived_input(history[(region,n,w,key,'v5')],meta['opening'],scale,index) if arm=='v5' else cell['arms']['v5']['rows'][key]
                if kind=='tap':page.evaluate('mobilitySelectionQA.recordNext=true')
                rows[key]=legacy.trial(page,touch,index,kind,ref)
                if not rows[key].get('skip'):rows[key]['nativeMotion']=page.evaluate('touchQA.mobilityInput')
                if kind=='tap':rows[key]['inkAtPress']=page.evaluate('mobilitySelectionQA.last')
            cell['arms'][arm]=dict(**meta,rows=rows)
        with native_page(browser,url,region,n,w,arm,True) as (page,touch,age_meta):
            for k in ('opening','seed','viewport','hashes'):
                require(meta[k]==age_meta[k],f'{arm} independent aged opening differs {k}')
            index=cell['arms']['v5']['aged']['index'] if arm!='v5' else None
            cell['arms'][arm]['aged']=aged_home(page,touch,age_meta,index)
            if n==28 and w==390:
                cell['arms'][arm]['reloaded']=reload_saved_household(page,meta,touch)
    return cell


def validate(cell,history):
    for other in ('v6','v7'):
        pair=dict(cell,schema=1,suite='matrix',paired=True,arms={'v5':cell['arms']['v5'],'v6':cell['arms'][other]})
        validate_cell(pair,cell['region'],cell['count'],cell['width'])
    flags=('selected','issued','accepted','routed','moved','arrived','near4','terminalArrived','terminalNear4')
    outcomes=[]
    for arm in ('v5','v6'):
        data=cell['arms'][arm];opening=digest(canonical(data['opening']).encode())
        for key,r in data['rows'].items():
            ref=history[(cell['region'],cell['count'],cell['width'],key,arm)]
            require(ref['openingSHA256']==opening and ref['key']==r['key'] and ref['skip']==(r.get('skip') or ''),f'{arm}/{key}: #575 initial layout, identity or target availability differs')
            if r.get('skip'):continue
            require(r['start']+r['goal']==[float(ref[k]) for k in ('touchX','touchY','goalX','goalY')] and r['goalClass']==json.loads(ref['goalClass']),f'{arm}/{key}: #575 physical input or target class changed')
            for k in flags:
                if r[k]!=(ref[k]=='True'):outcomes.append({'arm':arm,'case':key,'field':k,'expected':ref[k],'observed':r[k]})
    cell['historicalOutcomeDifferences']=outcomes
    return cell


def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--url',required=True);ap.add_argument('--region',choices=REGIONS,required=True);ap.add_argument('--out',type=Path,required=True)
    ap.add_argument('--counts',nargs='+',type=int,choices=COUNTS,default=COUNTS);ap.add_argument('--widths',nargs='+',type=int,choices=WIDTHS,default=WIDTHS)
    args=ap.parse_args();out=args.out;out.mkdir(parents=True,exist_ok=True);origin=args.url.rstrip('/')
    with HISTORY.open() as f:history={(r['region'],int(r['count']),int(r['width']),r['case'],r['arm']):r for r in csv.DictReader(f)}
    revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=HERE,text=True).strip()
    entries={}
    for arm in ARMS:
        with urlopen(f'{origin}/game/mobility-{arm}.html',timeout=20) as stream:entries[arm]=digest(stream.read())
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--disable-dev-shm-usage','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'])
        try:
            manifest={'region':args.region,'revision':revision,'browser':browser.version,'entries':entries,'historicalInputsSHA256':digest(HISTORY.read_bytes()),'cells':{},'complete':False}
            mpath=out/'region.json'
            if mpath.exists():
                saved=json.loads(mpath.read_text());require(all(manifest[k]==saved[k] for k in ('region','revision','browser','entries','historicalInputsSHA256')),'resumption provenance mismatch');manifest=saved
            save(mpath,manifest)
            for n in args.counts:
                for w in args.widths:
                    name=f'{args.region}-{n}-{w}.json';path=out/name
                    if name in manifest['cells']:
                        require(digest(path.read_bytes())==manifest['cells'][name]['sha256'],'checkpoint digest mismatch');continue
                    start=monotonic();cell=run_cell(browser,origin,args.region,n,w,history)
                    try:validate(cell,history)
                    except Exception:
                        save(out/(name+'.invalid'),cell);raise
                    save(path,cell);manifest['cells'][name]={'sha256':digest(path.read_bytes()),'wallSeconds':round(monotonic()-start,2)};save(mpath,manifest)
                    print(name,'3 real arms;',len(manifest['cells']),'cells; historical observation differences',len(cell['historicalOutcomeDifferences']),flush=True)
            manifest['complete']=len(manifest['cells'])==20;save(mpath,manifest)
        finally:browser.close()


if __name__=='__main__':main()
