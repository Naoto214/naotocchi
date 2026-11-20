"""Interleave trusted drops on the same monkey and trace native route lifetime."""
import argparse
import json
from pathlib import Path
from unittest.mock import patch
from playwright.sync_api import sync_playwright
import touch_trials as suite

TRACE = """
    function auditMonkey(event,extra){
      if(!globalThis.touchQA?.log||globalThis.touchQA.key!=='companion:monkey')return;
      const a=actor('companion:monkey');
      if(!a)return;
      const q=globalThis.touchQA;
      const item={event,clock,wall:performance.now(),x:a.x,y:a.y,w:a.w,h:a.h,target:a.target&&{...a.target},
        route:a.route.length,pending:manualGoals.has(a.key),activity:a.activity,paused,extra};
      const events=q.log.monkeyTrace??=[];q.monkeyTrace=events;
      if(event==='tick' && (clock>.7 || events.filter(e=>e.event==='tick').length>=12))return;
      events.push(item);
    }
"""


def model_patch(name, src, original):
    code=original(name,src)
    if 'production-model' not in name:
        return code
    for anchor,insertion in [
        ('    const manualGoals=new Map();',TRACE),
        ('    let checkpoint;',suite.MODEL_CHECKPOINT),
    ]:
        code=suite.base.legacy.once(code,anchor,insertion+anchor)
    for anchor,tag,extra in [
        ('    function cancel(){','cancel','new Error().stack.split("\\n").slice(1,5)'),
        ('    function sync(list,next){','sync','[scene.region,next.region,scene.width,next.width,scene.height,next.height,next.navigation===scene.navigation]'),
        ('    function step(dt,flags={}){','tick','flags'),
        ('    function select(key){','select','key'),
        ("    function move(key,p,source='tap',{pointerDrop=false}={}){",'move','[key,p,source]'),
    ]:
        code=suite.base.legacy.once(code,anchor,anchor+f'auditMonkey("{tag}",{extra});')
    return code


def run(browser,url,arm,ref,batch,post_release_notice=False):
    original=suite.base.patch
    with patch.object(suite.base,'patch',lambda name,src:model_patch(name,src,original)):
        with suite.base.native_page(browser,url,'forest',28,390,arm,False,canonical=False) as (p,t,m):
            p.evaluate("""() => {const prepare=touchQA.prepare;touchQA.prepare=(opts)=>{
              const result=prepare(opts);
              if(opts.index===6){touchQA.monkeyBefore=touchQA.captureTouchHousehold();}
              return result;
            };}""")
            if batch:
                for i in range(6):
                    suite.attach_motion(p,t,i,'historical',ref[str(i)])
            if post_release_notice:
                p.evaluate('''() => document.addEventListener('pointerup',()=>{
                  touchQA.afterMonkeyNotice=touchQA.triggerGate('notice',2400);
                },{once:true})''')
            row=suite.attach_motion(p,t,6,'historical',ref['6'])
            return {'meta':m,'state':p.evaluate('touchQA.monkeyBefore'),'trace':p.evaluate('touchQA.monkeyTrace||[]'),
                    'row':row,'batch':batch,'arm':arm,'postReleaseNotice':p.evaluate('touchQA.afterMonkeyNotice||null')}


def full_cohort(browser,url,refs,out):
    original=suite.base.patch
    cohort={'v7':{},'v8':{}}
    with patch.object(suite.base,'patch',lambda name,src:model_patch(name,src,original)):
        for offset in (0,7,14,21):
            order=('v7','v8') if offset in (0,21) else ('v8','v7')
            for arm in order:
                with suite.base.native_page(browser,url,'forest',28,390,arm,False,canonical=False) as (p,t,meta):
                    sample={}
                    for index in range(offset,offset+7):
                        r=suite.attach_motion(p,t,index,'historical',refs[str(index)])
                        sample[str(index)]=suite.compact(r)
                        if index==6:
                            sample[str(index)]['trace']=p.evaluate('touchQA.monkeyTrace||[]')
                    cohort[arm][str(offset)]={'meta':meta,'rows':sample}
                    suite.focus.write(out/'forest-crossed-partial.json',cohort)
                    print('crossed',offset,arm,sum(r['terminalArrived'] for r in sample.values()),flush=True)
    for offset in ('0','7','14','21'):
        a,b=(cohort[v][offset] for v in ('v7','v8'))
        assert a['meta']['opening']==b['meta']['opening'] and a['meta']['seed']==b['meta']['seed']
        for i,r in a['rows'].items():
            assert all(r[k]==b['rows'][i][k] for k in ('key','start','goal','foot','origin','modelGoal'))
    suite.focus.write(out/'forest-crossed.json',cohort)


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--url',required=True)
    ap.add_argument('--out',required=True,type=Path)
    ap.add_argument('--reference',required=True,type=Path)
    ap.add_argument('--mode',choices=('all','fresh','sequence','gate','cohort'),default='all')
    a=ap.parse_args()
    a.out.mkdir(exist_ok=True,parents=True)
    refs=json.loads(a.reference.read_text())['data']['rows']
    for row in refs.values():
        row.setdefault('skip',None)
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path='/usr/bin/chromium')
        try:
            if a.mode=='cohort':
                full_cohort(b,a.url,refs,a.out)
                return
            for batch in ((False,True) if a.mode=='all' else (a.mode=='sequence',)):
                group = 'gate' if a.mode=='gate' else 'sequence' if batch else 'fresh'
                for i,arm in enumerate(('v7','v8') if batch or a.mode=='gate' else ('v8','v7','v7','v8')):
                    dest=a.out/f'monkey-{group}-{i}-{arm}.json'
                    if dest.exists():
                        continue
                    result=run(b,a.url,arm,refs,batch,a.mode=='gate')
                    suite.focus.write(dest,result)
                    r=result['row']
                    print(batch,arm,r['issued'],r['routed'],r['terminalArrived'],r['endDistanceCss'],flush=True)
        finally:b.close()


if __name__=='__main__':
    main()
