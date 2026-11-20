"""Three-arm historical, overlapping-ink, warm and real-reload trusted touchscreen probes."""
import argparse
from contextlib import nullcontext
import hashlib
import json
import os
from pathlib import Path
from unittest.mock import patch
from playwright.sync_api import Page,sync_playwright

from matrix_worker import ARMS,HERE,V6,legacy,native_page

SELECTION_JS=(HERE/'selection-probe.js').read_text()


def webkit_fixture_readiness():
    # On a shared host WPE can take >55s to present its first scene. The
    # frozen matrix uses 55s. Only wait longer for initial fixture readiness.
    original=Page.wait_for_function
    def wait(page,expression,**options):
        if options.get('timeout')==55000 and 'HomeCastTrial' in expression:
            options.update(timeout=150000,polling=200)
        return original(page,expression,**options)
    return patch.object(Page,'wait_for_function',wait)


def write(path,data):
    temp=path.with_suffix('.tmp')
    temp.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
    temp.replace(path)


def install(page):
    page.wait_for_function('HomeCastTrial.ready&&!!window.touchQA?.model&&!!HomeDragTrial.opening()',timeout=90000)
    page.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()))")
    page.evaluate((legacy.V5/'touch_probe.js').read_text())
    page.evaluate((V6/'input_probe.js').read_text())
    page.evaluate('touchQA.manual=true;touchQA.checkpoint()')


def run_forest(browser,url,arm,ref,indices=range(28),batch_size=7,same_scene_update=False):
    observed={}
    for i in range(0,len(indices),batch_size):
        with native_page(browser,url,'forest',28,390,arm,False,canonical=False) as (p,t,m):
            if 'meta' in observed:
                assert observed['meta']['opening']==m['opening'] and observed['meta']['hashes']==m['hashes']
            if ref:assert ref['meta']['opening']==m['opening'] and ref['meta']['seed']==m['seed']
            observed.update(meta=m,rows=observed.get('rows',{}))
            if same_scene_update:
                # A native presentation refresh rebuilds the same scene and
                # measures its actual roster, then calls model.sync normally.
                p.evaluate("""() => {
                  const original=touchQA.advance;
                  touchQA.advance=(sec,ambient)=>{
                    if(sec!==.7)return original(sec,ambient);
                    original(.3,ambient);
                    const sample=()=>touchQA.model.snapshot().map(a=>[a.key,a.x,a.y,a.w,a.h]);
                    const before=sample(),clock=touchQA.model.metrics().clock;
                    dispatchEvent(new Event('dayparts-qa-change'));
                    touchQA.refreshProof={before,after:sample(),clock};
                    original(.4,ambient);
                  };
                }""")
            for index in indices[i:i+batch_size]:
                key=str(index)
                observed['rows'][key]=legacy.trial(p,t,index,'historical',ref['rows'][key] if ref else None)
                if same_scene_update:
                    proof=p.evaluate('touchQA.refreshProof')
                    assert proof['before']==proof['after'] and len(proof['before'])==28
                    observed['rows'][key]['refreshProof']=proof
    return observed


def find_point(page,center,mode):
    return page.evaluate('''({center,mode})=>{
      for(let radius=0;radius<=32;radius+=2){
        for(let dy=-radius;dy<=radius;dy+=2)for(let dx=-radius;dx<=radius;dx+=2){
          if(Math.abs(dx)!==radius&&Math.abs(dy)!==radius)continue;
          const point=[center[0]+dx,center[1]+dy], a=mobilitySelectionQA.at(...point), s=a.stack;
          if(s.length<2||s.some(x=>x.alpha===null)||!a.foreground)continue;
          if(mode==='exposed'&&s[0].alpha===0&&s.find(x=>x.alpha>0)?.alpha>=128)return {point,ink:a};
          if(mode==='opaque'&&s[0].alpha>=128&&s.slice(1).some(x=>x.alpha>=128))return {point,ink:a};
        }
      }
      return null;
    }''',dict(center=center,mode=mode))


def intended_reference(meta,key,start,goal,scale):
    i=next(i for i,x in enumerate(meta['opening']) if x[0]==key)
    _,x,y,_w,_h,fx,fy=meta['opening'][i]
    return dict(index=i,key=key,start=start,goal=goal,foot=[fx,fy],
        modelGoal=[x+(goal[0]-fx)/scale[0],y+(goal[1]-fy)/scale[1]],skip=None)


def run_overlap(browser,url,arm,ref,touch_session=None):
    out={}
    profiles=[('forest',4,390)] if touch_session else [('forest',4,390),('home',4,390),('forest',20,320)]
    for region,n,w in profiles:
        key=f'{region}-{n}-{w}'
        with native_page(browser,url,region,n,w,arm,False,touch_session=touch_session) as (p,t,m):
            p.evaluate(SELECTION_JS)
            if ref:assert ref[key]['meta']['opening']==m['opening']
            references=ref[key]['inputs'] if ref else {}
            if not ref:
                i=min(4,n-1)
                plan=p.evaluate("i=>touchQA.prepare({index:i,kind:'tap'})",i)
                center=plan['start']
                scale=plan['scale']
                references['archived-tap']=intended_reference(m,plan['key'],center,center,scale)
                for category in ('exposed','opaque'):
                    found=find_point(p,center,category)
                    if not found:continue
                    xy=found['point'];actual=found['ink']['foreground']
                    for label,delta in [('tap',0),('jitter',5),('threshold',10)]:
                        references[category+'-'+label]=intended_reference(m,actual,xy,[xy[0]+delta,xy[1]],scale)
            rows={}
            for label,input_ in references.items():
                kind=label.split('-')[-1]
                p.evaluate('mobilitySelectionQA.recordNext=true')
                observed=legacy.trial(p,t,input_['index'],kind,input_)
                observed['ink']=p.evaluate('mobilitySelectionQA.last')
                rows[label]=observed
            out[key]=dict(meta=m,inputs=references,rows=rows)
    return out


def run_warm(browser,url,arm,seconds):
    with native_page(browser,url,'forest',28,390,arm,False) as (p,t,m):
        p.evaluate('touchQA.manual=false;HomeCastTrial.apply({paused:false})')
        first=p.evaluate('({wall:performance.now(),metrics:touchQA.model.metrics(),gates:touchQA.gates()})')
        p.wait_for_timeout(seconds*1000)
        before=p.evaluate('({wall:performance.now(),metrics:touchQA.model.metrics(),gates:touchQA.gates(),residents:touchQA.opening()})')
        # Keep this household's genuinely advanced state at input time.
        p.evaluate('touchQA.restore=()=>{}')
        result=legacy.trial(p,t,17,'historical',live=True)
        return dict(meta=m,seconds=seconds,first=first,before=before,row=result)


def run_restore(browser,url,arm):
    with native_page(browser,url,'forest',4,390,arm,False) as (p,t,m):
        pretap=legacy.trial(p,t,0,'tap')
        assert pretap['trusted'] and pretap['selected']
        marked=p.evaluate('mobilitySaveQA.markAndSave()')
        # The fixture intentionally shadows window.sessionStorage. Only this
        # disposable browser context's real storage carries the unload bytes.
        p.add_init_script("window.__unloadedFixture=sessionStorage.getItem('mobility-unload-test')")
        p.evaluate("""() => {
          const bridge=document.createElement('iframe');bridge.hidden=true;document.body.append(bridge);
          const mirror=bridge.contentWindow.sessionStorage, gameStorage=window.localStorage;
          let unloading=false;
          window.addEventListener('beforeunload',()=>{unloading=true;},true);
          const nativeSet=gameStorage.setItem.bind(gameStorage);
          gameStorage.setItem=(key,value)=>{
            nativeSet(key,value);
            if(unloading&&key==='naotocchi-cast-size-v1-fixture')mirror.setItem('mobility-unload-test',value);
          };
        }""")
        p.reload(wait_until='domcontentloaded')
        install(p)
        raw=p.evaluate('window.__unloadedFixture');assert raw,'No actual native beforeunload save was observed'
        d=json.loads(raw)
        default=p.evaluate('mobilitySaveQA.atLoad')
        assert default['money']==marked['before']['money'] and d['lifetime']['money']==marked['after']['money']
        assert d['lifetime']['saveRevision']>marked['after']['revision']
        p.add_init_script(script='window.mobilityRestoreQA='+json.dumps(raw,ensure_ascii=True)+';')
        p.reload(wait_until='domcontentloaded')
        install(p)
        restored=p.evaluate('mobilitySaveQA.atLoad');roster=p.evaluate('touchQA.opening()')
        assert restored['money']==d['lifetime']['money'] and restored['revision']==d['lifetime']['saveRevision']
        assert [r[0] for r in roster]==[r[0] for r in m['opening']]
        clean=p.evaluate("touchQA.model.snapshot().every(a=>!a.target&&!a.route.length&&!a.yieldFor)")
        assert clean
        row=legacy.trial(p,t,0,'clear')
        return dict(meta=m,before=marked['before'],markerSaved=marked['after'],defaultReload=default,
            nativeUnloaded={'revision':d['lifetime']['saveRevision'],'money':d['lifetime']['money'],'gear':d['lifetime'].get('equippedItemId'),
                            'companions':[v['id'] for v in d['companions']],'partner':d['partner']['id'] if d.get('partner') else None},
            restored=restored,savedBytes=len(raw.encode()),sha256=hashlib.sha256(raw.encode()).hexdigest(),restoredRoster=[r[0] for r in roster],cleanMotion=clean,row=row)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--origin',default='http://127.0.0.1:8377')
    parser.add_argument('--arm',choices=ARMS,required=True);parser.add_argument('--suite',choices=['forest','fresh','resync','overlap','warm','restore'],required=True)
    parser.add_argument('--reference-dir',type=Path)
    parser.add_argument('--engine',choices=('chromium','webkit'),default='chromium');parser.add_argument('--seconds',type=int,default=70);parser.add_argument('--out',required=True,type=Path)
    a=parser.parse_args();a.out.mkdir(exist_ok=True,parents=True)
    with sync_playwright() as pw:
        wk=legacy.old.WebKitTouch(os.getenv('WEBKIT_PATH',pw.webkit.executable_path)) if a.engine=='webkit' else None
        if wk and a.suite!='overlap':raise ValueError('Use the WebKit bridge for the overlap panel')
        b=pw.webkit.connect(wk.endpoint) if wk else pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        suffix='-webkit' if wk else ''
        try:
            ref=None
            baseline=a.reference_dir or a.out
            if a.suite in ('forest','overlap') and a.arm!='v5':
                ref=json.loads((baseline/(a.suite+'-v5'+suffix+'.json')).read_text())['data']
            if a.suite=='fresh':
                ref=json.loads((baseline/'forest-v5.json').read_text())['data']
                result=run_forest(b,a.origin,a.arm,ref,[1,3,4,5,6,20],batch_size=1)
            elif a.suite=='resync':
                ref=json.loads((baseline/'forest-v5.json').read_text())['data']
                result=run_forest(b,a.origin,a.arm,ref,[5,24],batch_size=1,same_scene_update=True)
            elif a.suite=='warm':result=run_warm(b,a.origin,a.arm,a.seconds)
            elif a.suite=='restore':result=run_restore(b,a.origin,a.arm)
            elif a.suite=='forest':result=run_forest(b,a.origin,a.arm,ref)
            else:
                with webkit_fixture_readiness() if wk else nullcontext():
                    result=run_overlap(b,a.origin,a.arm,ref,touch_session=wk)
            write(a.out/f'{a.suite}-{a.arm}{suffix}.json',dict(arm=a.arm,suite=a.suite,engine=a.engine,data=result))
            print(a.suite,a.arm,'complete',flush=True)
        finally:
            b.close()
            if wk:wk.close()


if __name__=='__main__':main()
