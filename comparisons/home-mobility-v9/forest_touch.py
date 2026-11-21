"""One trusted 12 CSS px drag per forest resident, reset to the same native feet for every input."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
from unittest.mock import patch
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'home-mobility-v8'))
from touch_trials import base, compact, attach_motion

HOOK = """
    qa.captureForestTouch=()=>({actors:structuredClone(actors),selected,clock,idleAt,paused,stats:{...stats},
      cooldown:[...cooldown],manualGoals:[...manualGoals],waiting:[...waiting],helpedAt:[...helpedAt],seed:qa.readSeed(),
      relief:null,earlyKey,nextRecovery});
    qa.loadForestTouch=s=>{
      if(s.actors.map(a=>a.key).join('|')!==actors.map(a=>a.key).join('|'))throw Error('Roster changed');
      actors=structuredClone(s.actors); selected=s.selected; clock=s.clock; idleAt=s.idleAt; paused=s.paused;
      retryingKey=null; earlyKey=s.earlyKey; nextRecovery=s.nextRecovery; relief=structuredClone(s.relief);
      // A suspended search generator belongs to the original JS heap. The independent touch starts
      // at the recorded feet; discard that pending search, preserving any already accepted helper legs.
      if(relief?.search)relief=null;
      for(const [target,values] of [[cooldown,s.cooldown],[manualGoals,s.manualGoals],[waiting,s.waiting],[helpedAt,s.helpedAt]]){
        target.clear(); for(const [key,value] of structuredClone(values))target.set(key,value);
      }
      Object.assign(stats,structuredClone(s.stats));qa.writeSeed(s.seed);
    };
"""

def save(path, result):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.part')
    temporary.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':'))+'\n')
    temporary.replace(path)

def run(a):
    original_patch = base.patch
    def instrument(name, code):
        src = original_patch(name, code)
        if 'production-model' in name:
            src = base.legacy.once(src, '    let checkpoint;', HOOK+'    let checkpoint;')
        return src

    result = json.loads(a.out.read_bytes()) if a.out.exists() else {'arms':{}, 'tape':[]}
    with sync_playwright() as pw, patch.object(base, 'patch', instrument):
        browser = pw.chromium.launch(executable_path='/usr/bin/chromium')
        for arm in a.arms:
            with base.native_page(browser,a.url,'forest',28,390,arm,False) as (p,t,meta):
                p.evaluate('HomeCastTrial.apply({paused:false})')
                cp = json.loads(a.snapshot.read_bytes()) if a.snapshot else p.evaluate('touchQA.captureForestTouch()')
                feet = [[b['key'],b['x'],b['y'],b['w'],b['h']] for b in cp['actors']]
                p.evaluate("""s=>{touchQA.restore=()=>{touchQA.loadForestTouch(s);touchQA.paint()};touchQA.restore()}""",cp)
                assert [r[:5] for r in p.evaluate('touchQA.opening()')] == feet
                identity = hashlib.sha256(json.dumps(feet,separators=(',',':')).encode()).hexdigest()
                if 'feetSHA256' in result: assert result['feetSHA256']==identity
                result.update(feetSHA256=identity,clock=cp['clock'],pendingSearch=bool((cp.get('relief') or {}).get('search')))
                if not result['tape']:
                    for i in range(28):
                        q = p.evaluate("i=>touchQA.prepare({index:i,kind:'historical'})",i)
                        assert not q.get('skip'),q
                        result['tape'].append(dict(index=i,key=q['key'],foot=q['foot'],start=q['start'],goal=q['goal'],
                                                   modelGoal=[q['modelGoal']['x'],q['modelGoal']['y']],skip=None))
                arm_result = result['arms'].setdefault(arm,dict(sources=meta['hashes'],rows=[]))
                assert arm_result['sources']==meta['hashes']
                for i, ref in enumerate(result['tape']):
                    if len(arm_result['rows'])>i:continue
                    row = attach_motion(p,t,i,'historical',ref)
                    assert not row.get('skip') and row['trusted'] and row['foot']==ref['foot'] and row['key']==ref['key'], i
                    arm_result['rows'].append(compact(row))
                    save(a.out,result)
                    if (i+1)%7==0:print(arm,i+1,flush=True)
        browser.close()

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--url',default='http://127.0.0.1:8399')
    ap.add_argument('--arms',choices=['v8','v9'],nargs='+',required=True)
    ap.add_argument('--snapshot',type=Path)
    ap.add_argument('--out',type=Path,required=True)
    run(ap.parse_args())
