"""One trusted 12 CSS px drag per forest resident, reset to the same native feet for every input."""
import argparse
import hashlib
import json
from pathlib import Path
import sys
from unittest.mock import patch
from playwright.sync_api import BrowserContext, sync_playwright

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'home-mobility-v8'))
from touch_trials import base, compact, attach_motion

HOOK = """
    qa.captureForestTouch=()=>({actors:structuredClone(actors),selected,clock,idleAt,paused,stats:{...stats},
      cooldown:[...cooldown],manualGoals:[...manualGoals],waiting:[...waiting],helpedAt:[...helpedAt],seed:qa.readSeed(),
      relief:null,earlyKey,nextRecovery});
    qa.forestModelPaused=()=>paused;
    qa.loadForestTouch=s=>{
      if(s.actors.map(a=>a.key).join('|')!==actors.map(a=>a.key).join('|'))throw Error('Roster changed');
      actors=structuredClone(s.actors); selected=s.selected; clock=s.clock; idleAt=s.idleAt;
      // The archived latch reflects the previous room's last native frame. This independent
      // room restores its feet and clock, but its own controller owns input availability.
      const gate=qa.gates(); paused=gate.blocked||gate.trialPaused;
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
        if name=='drag-trial-hooks-mobility-v9-seats.js':
            name='drag-trial-hooks.js'
        src = original_patch(name, code)
        if 'production-model' in name:
            src = base.legacy.once(src, '    let checkpoint;', HOOK+'    let checkpoint;')
        return src

    result = json.loads(a.out.read_bytes()) if a.out.exists() else {
        'arms':{}, 'tape':[], 'pauseSource':'current-room-native-gate'}
    if result.get('pauseSource') != 'current-room-native-gate':
        raise ValueError('Archive contains an earlier pause protocol. Use a fresh output file to retain both.')
    if a.reference_tape:
        tape_bytes = a.reference_tape.read_bytes()
        reference = json.loads(tape_bytes)
        assert len(reference['tape'])==28 and all(r['index']==i for i,r in enumerate(reference['tape']))
        if result['tape']:
            assert result['tape']==reference['tape'] and result['feetSHA256']==reference['feetSHA256']
        result.update(tape=reference['tape'],feetSHA256=reference['feetSHA256'],
                      referenceTapeFileSHA256=hashlib.sha256(tape_bytes).hexdigest())
    original_route = BrowserContext.route
    def include_seat_bridge(context, url, handler, **options):
        if url == '**/drag-trial-hooks.js*':
            url = '**/drag-trial-hooks*.js*'
        return original_route(context, url, handler, **options)
    with sync_playwright() as pw, patch.object(base, 'patch', instrument), patch.object(BrowserContext,'route',include_seat_bridge):
        browser = pw.chromium.launch(executable_path='/usr/bin/chromium')
        for arm in a.arms:
            with base.native_page(browser,a.url,'forest',28,390,arm,False) as (p,t,meta):
                p.evaluate('HomeCastTrial.apply({paused:false})')
                cp = json.loads(a.snapshot.read_bytes()) if a.snapshot else p.evaluate('touchQA.captureForestTouch()')
                p.evaluate('touchQA.forestFreshClock=touchQA.model.metrics().clock;touchQA.manual=false')
                p.wait_for_function("""() => {
                    const gate=touchQA.gates();
                    if(gate.blocked||gate.pending||gate.trialPaused||touchQA.forestModelPaused()||
                       touchQA.model.metrics().clock<=touchQA.forestFreshClock)return false;
                    touchQA.manual=true;
                    return true;
                }""",timeout=60000)
                fresh = p.evaluate("""() => ({clock:touchQA.model.metrics().clock,initialClock:touchQA.forestFreshClock,
                    modelPaused:touchQA.forestModelPaused(),gate:touchQA.gates()})""")
                feet = [[b['key'],b['x'],b['y'],b['w'],b['h']] for b in cp['actors']]
                p.evaluate("""s=>{
                    touchQA.restore=()=>{touchQA.loadForestTouch(s);touchQA.paint()};
                    document.addEventListener('pointerdown',e=>{
                        const xy=[e.clientX,e.clientY];
                        touchQA.forestDown={trusted:e.isTrusted,xy,hit:touchQA.hit(...xy),modelPaused:touchQA.forestModelPaused(),
                            blocked:touchQA.gates().blocked,trialPaused:HomeCastTrial.settings.paused};
                    },true);
                    touchQA.restore();
                }""",cp)
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
                arm_result['freshInputState']=fresh
                arm_result['checkpointModelPaused']=cp['paused']
                for i, ref in enumerate(result['tape']):
                    if len(arm_result['rows'])>i:continue
                    p.evaluate('touchQA.forestDown=null')
                    row = attach_motion(p,t,i,'historical',ref)
                    assert not row.get('skip') and row['trusted'] and row['foot']==ref['foot'] and row['key']==ref['key'], i
                    observed = compact(row)
                    observed['pointerDownInputState']=p.evaluate('touchQA.forestDown')
                    assert observed['pointerDownInputState']['trusted']
                    arm_result['rows'].append(observed)
                    save(a.out,result)
                    if (i+1)%7==0:print(arm,i+1,flush=True)
        browser.close()

if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--url',default='http://127.0.0.1:8399')
    ap.add_argument('--arms',choices=['v8','v9','v9-seats'],nargs='+',required=True)
    ap.add_argument('--snapshot',type=Path)
    ap.add_argument('--reference-tape',type=Path,help='reuse all 28 original screen coordinates from an existing touch archive')
    ap.add_argument('--out',type=Path,required=True)
    run(ap.parse_args())
