"""Repeat one trusted finger drag for each resident from the same rendered 300s household."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
from unittest.mock import patch

from playwright.sync_api import sync_playwright
from touch_trials import base, MODEL_CHECKPOINT, attach_motion, compact

HERE=Path(__file__).resolve().parent
def save(path,data):
    tmp=path.with_suffix('.tmp')
    tmp.write_bytes(gzip.compress(json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode(),mtime=0))
    tmp.replace(path)

def run(args):
    source=args.snapshot.read_bytes();reference=json.loads(source)
    fixture=next(f for f in json.loads((HERE/'dual-drag-feet.json').read_text())['fixtures'] if f['count']==28 and f['viewport'][0]==390)
    assert [a[:5] for a in reference['opening']]==fixture['agedFeet']
    assert abs(reference['snapshot']['clock']-300)<1e-7
    args.out.mkdir(exist_ok=True,parents=True)
    destination=args.out/'checkpoint-touches.json.gz'
    records=json.loads(gzip.decompress(destination.read_bytes())) if destination.exists() else {'sourceSHA256':hashlib.sha256(source).hexdigest(),'tape':[],'arms':{}}
    assert records['sourceSHA256']==hashlib.sha256(source).hexdigest()
    original=base.patch
    def instrument(name,code):
        result=original(name,code)
        if 'production-model' not in name:return result
        adapter=MODEL_CHECKPOINT
        if 'v8' in name:
            adapter=adapter.replace('actors=structuredClone(s.actors);','relief=null;waiting.clear();helpedAt.clear();earlyKey=null;nextRecovery=0;actors=structuredClone(s.actors);')
        return base.legacy.once(result,'    let checkpoint;',adapter+'    let checkpoint;')
    with sync_playwright() as pw, patch.object(base,'patch',instrument):
        browser=pw.chromium.launch(executable_path='/usr/bin/chromium')
        try:
            for arm in args.arms:
                with base.native_page(browser,args.url,'forest',28,390,arm,True) as (page,touch,meta):
                    page.evaluate('HomeCastTrial.apply({paused:false})')
                    page.evaluate("""ref=>{
                        touchQA.restore=()=>{touchQA.loadTouchHousehold(ref.snapshot);touchQA.paint();
                          const now=touchQA.opening();
                          if(JSON.stringify(now)!==JSON.stringify(ref.opening))throw Error('300s snapshot did not restore all 28 feet');
                        };
                        touchQA.restore();
                    }""",reference)
                    if not records['tape']:
                        for i in range(28):
                            q=page.evaluate('p=>touchQA.prepare(p)',dict(index=i,kind='historical'))
                            assert not q.get('skip'),q
                            records['tape'].append(dict(index=i,key=q['key'],foot=q['foot'],start=q['start'],goal=q['goal'],modelGoal=[q['modelGoal']['x'],q['modelGoal']['y']],skip=None))
                        save(destination,records)
                    a=records['arms'].setdefault(arm,{'sourceHashes':meta['hashes'],'rows':[]})
                    for i,q in enumerate(records['tape']):
                        if i<len(a['rows']):continue
                        row=attach_motion(page,touch,i,'historical',q)
                        assert row['trusted'] and not row.get('skip') and row['key']==q['key'] and row['foot']==q['foot'],i
                        a['rows'].append(compact(row))
                        save(destination,records)
                        if len(a['rows'])%7==0:print(arm,len(a['rows']),flush=True)
        finally:browser.close()
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--url',required=True)
    p.add_argument('--snapshot',required=True,type=Path);p.add_argument('--out',type=Path,required=True)
    p.add_argument('--arms',nargs='+',choices=('v6','v7','v8'),default=['v7','v6','v8']);run(p.parse_args())
