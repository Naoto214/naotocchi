"""Run each native forest resident's first trusted drag on the specified 28-foot checkpoint."""
import argparse
from contextlib import contextmanager
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

from playwright.sync_api import TimeoutError as PlaywrightTimeout, sync_playwright

from forest_layout import SAVE_KEY, forest_url, fixture_script

HERE = Path(__file__).resolve().parent
V9 = HERE.parent / 'home-mobility-v9'
sys.path.insert(0, str(V9))
import forest_touch as prior

seed_spec = importlib.util.spec_from_file_location('forest_touch_seed',
    HERE.parent / 'home-mobility-v8' / 'forest_observe.py')
seed_source = importlib.util.module_from_spec(seed_spec)
seed_spec.loader.exec_module(seed_source)
base = prior.base
once = base.legacy.once


def digest(value):
    return hashlib.sha256(value).hexdigest()


def instrument(name, source, order, seed, saved):
    if name == 'fixture.js':
        return fixture_script(source, order, seed, saved)
    label = 'drag-trial-hooks.js' if name.startswith('drag-trial-hooks') else name
    updated = base.patch(label, source)
    if label == 'drag-trial-hooks.js':
        return once(updated, 'let seed = 214;', f'let seed = {seed};')
    if name == 'population-beauty.js':
        return once(updated, 'let actorSeed=214;', f'let actorSeed={seed};')
    if name.startswith('script-v2') and saved is not None:
        anchor='globalThis.HomeMobilityDiagnostics?.bindGates(()=>{'
        return once(updated,anchor,'globalThis.touchDirectGate=()=>homeDioramaBlocked(true);\n  globalThis.HomeMobilityDiagnostics?.bindGates(globalThis.touchGateReasons=()=>{')
    if 'production-model' in name:
        marker = '      Object.assign(stats,structuredClone(s.stats));qa.writeSeed(s.seed);'
        restore = '''
      if(typeof crowdMisses!=='undefined'){
        crowdMisses.clear();
        for(const [key,value] of structuredClone(s.crowdMisses||[]))crowdMisses.set(key,value);
        reopenedKey=s.reopenedKey??null;
      }
'''
        state_hook = once(prior.HOOK, marker, restore + marker) if 'const crowdMisses=' in updated else prior.HOOK
        return once(updated, '    let checkpoint;', state_hook + '    let checkpoint;')
    return updated


@contextmanager
def checkpoint_page(browser, args, checkpoint):
    ctx = browser.new_context(viewport={'width': args.width, 'height': 792}, has_touch=True,
                              is_mobile=True, device_scale_factor=2, timezone_id='Asia/Tokyo', locale='ja-JP')
    try:
        ctx.add_init_script(seed_source.SEED.replace('let seed=214;', f'let seed={args.seed};'))
        if args.saved_raw is not None:
            ctx.add_init_script('globalThis.forestSavedRaw='+json.dumps(args.saved_raw)+';')
        hashes, errors = {}, []

        def hook(route):
            try:
                response = route.fetch()
                name = Path(route.request.url.split('?')[0]).name
                source = response.text()
                updated = instrument(name, source, args.order, args.seed, args.saved_raw)
                hashes[name] = dict(source=digest(source.encode()), observed=digest(updated.encode()))
                route.fulfill(response=response, body=updated)
            except Exception as error:
                errors.append(str(error))
                route.abort()

        for pattern in ('*production-model*.js*', '*production-diorama*.js*', '*route-navigation*.mjs*',
                        '*population-beauty.js*', 'script-v2*.js*', 'drag-trial-hooks*.js*', 'beauty/fixture.js*'):
            ctx.route('**/'+pattern, hook)
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(forest_url(args.url, args.arm), wait_until='domcontentloaded', timeout=120000)
        if errors:
            raise RuntimeError(errors)
        page.wait_for_function('window.HomeCastTrial?.ready && window.touchQA?.model && HomeDragTrial.opening()', timeout=90000)
        page.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()))")
        page.evaluate((base.legacy.V5 / 'touch_probe.js').read_text())
        page.evaluate((base.V6 / 'input_probe.js').read_text())
        opening = page.evaluate('HomeDragTrial.opening()')
        if args.saved_raw:
            loaded = page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))', SAVE_KEY)
            original = json.loads(args.saved_raw)
            assert [a['id'] for a in loaded['companions']]==[a['id'] for a in original['companions']]
            assert loaded['partner']['id']==original['partner']['id'] and loaded['regionId']==original['regionId']
        assert (opening['width'], opening['height']) == (args.width, 792)
        native = page.evaluate('touchQA.captureForestTouch()')
        shape = lambda actors: [(a['key'], a['kind'], a['w'], a['h']) for a in actors]
        assert shape(native['actors']) == shape(checkpoint['actors']), 'Native keys, roles or bodies differ from checkpoint'
        if checkpoint['clock'] == 0:
            assert all(tuple(row[2:4]) == (a['x'],a['y']) for row,a in zip(opening['actors'], checkpoint['actors']))
        page.evaluate('HomeCastTrial.apply({paused:false});touchQA.manual=false;touchQA.beforeFresh=touchQA.model.metrics().clock')
        ready = """() => {
            const g=touchQA.gates();
            if(g.blocked||g.pending||g.trialPaused||touchQA.forestModelPaused()||touchQA.model.metrics().clock<=touchQA.beforeFresh)return false;
            touchQA.manual=true;return true;
        }"""
        try:
            page.wait_for_function(ready,timeout=8000 if args.saved_raw else 60000)
        except PlaywrightTimeout:
            if args.saved_raw is None or not page.evaluate('touchQA.gates().blocked'):
                raise
            # Record an actual input against the native saved-room gate.
            page.evaluate('touchQA.manual=true')
        page.evaluate("""s=>{
          touchQA.restore=()=>{touchQA.loadForestTouch(s);touchQA.paint()};
          const result=touchQA.result;
          touchQA.result=()=>{const r=result(), steps=r.steps.filter(v=>Math.hypot(v[1]-v[4],v[2]-v[5])>1e-5);
            const offered=(r.mobilityYields||[]).filter(x=>x.key===touchQA.key);
            touchQA.issuedRecipients=(r.directRequests||[]).map(m=>({key:m.key,accepted:m.accepted,clock:m.clock}));
            touchQA.mobilityInput={firstNativeFootClock:steps[0]?.[0]??null,lastNativeFootClock:steps.at(-1)?.[0]??null,
              offered,steppedAfterOffer:offered.some(x=>steps.some(v=>v[0]>x.clock+1e-8))};return r;};
          document.addEventListener('pointerdown',e=>{const xy=[e.clientX,e.clientY];
            touchQA.forestDown={trusted:e.isTrusted,xy,hit:touchQA.hit(...xy),modelPaused:touchQA.forestModelPaused(),gate:touchQA.gates()};
          },true);
          if(typeof touchGateReasons==='function'){
            touchQA.savedGateEvents=[];
            for(const type of ['pointerdown','pointerup'])document.addEventListener(type,()=>{
              touchQA.savedGateEvents.push({type,reasons:touchGateReasons(),directBlocked:touchDirectGate()});
            },true);
          }
          touchQA.restore();
        }""", checkpoint)
        feet = [[a[k] for k in ('key','x','y','w','h')] for a in checkpoint['actors']]
        assert [r[:5] for r in page.evaluate('touchQA.opening()')] == feet
        assert f'home-production-model-mobility-{args.arm}.js' in hashes
        yield page, ctx.new_cdp_session(page), hashes
        if errors:
            raise RuntimeError(errors)
    finally:
        ctx.close()


def run(args):
    contents = args.snapshot.read_bytes()
    state = json.loads(contents)
    feet = [[a[k] for k in ('key','x','y','w','h')] for a in state['actors']]
    assert len(feet) == len({a[0] for a in feet}) == 28
    tape_file = args.snapshot.parent / 'forest28.json.gz'
    expected_source = None
    source_tape_hash = None
    if tape_file.exists():
        with gzip.open(tape_file,'rt') as file:
            live = json.load(file)
        if args.historical_v9:
            source_tape_hash = digest(tape_file.read_bytes())
            assert source_tape_hash=='8ca183dd1b1431c3a27ffebcb8472097f3a3466fadec9477d9f8769a6ba7a55a'
            assert live['arm']=='v9-seats' and args.arm in ('v9-seats','v10-reference') and args.order==0
            assert (live['opening']['width'],live['opening']['height'],live['seed'])==(args.width,792,args.seed)
        else:
            assert (live['arm'],live['width'],live['seed'],live['order'])==(args.arm,args.width,args.seed,args.order), 'Checkpoint live game differs'
        if live['arm']==args.arm:
            expected_source = live['sources'][f'home-production-model-mobility-{args.arm}.js']['source']
        witness = live['initial'] if state['clock']==0 else live['checkpoint']
        assert state==witness, 'Checkpoint differs from the live tape'
    elif args.historical_v9:
        raise ValueError('Missing original archive for the paired historical checkpoint')
    identity = dict(width=args.width, height=792, order=args.order, seed=args.seed, clock=state['clock'],
                    checkpointSHA256=digest(contents), feetSHA256=digest(json.dumps(feet,separators=(',',':')).encode()))
    saved_file = args.snapshot.parent / ('initial-save.json' if state['clock']==0 else 'aged-save.json')
    args.saved_raw = saved_file.read_text() if args.saved_game else None
    if args.saved_raw:
        identity['nativeSaveSHA256']=digest(saved_file.read_bytes())
    identity['pendingSearchGeneratorRemoved']=bool((state.get('relief') or {}).get('search'))
    if source_tape_hash:
        identity['historicalTapeSHA256']=source_tape_hash
    reference = None
    if args.reference_tape:
        reference = json.loads(args.reference_tape.read_bytes())
        assert reference['feetSHA256']==identity['feetSHA256'] and len(reference['tape'])==28
        identity['pairedInputSHA256']=digest(args.reference_tape.read_bytes())
    result = json.loads(args.out.read_bytes()) if args.out.exists() else dict(**identity, arms={}, tape=[])
    if result.get('checkpointSHA256')==identity['checkpointSHA256']:
        result.setdefault('pendingSearchGeneratorRemoved',identity['pendingSearchGeneratorRemoved'])
    assert all(result.get(k)==v for k,v in identity.items()), 'Resume file belongs to a different checkpoint'
    arm = result['arms'].setdefault(args.arm, dict(rows=[]))
    assert set(result['arms'])=={args.arm} and len(result['tape'])==len(arm['rows']), 'Resume file has a different arm or missing gestures'
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=args.chromium)
        try:
            for i in range(len(arm['rows']), 28):
                with checkpoint_page(browser, args, state) as (page, touch, hashes):
                    assert arm.setdefault('sources',hashes)==hashes
                    if expected_source:
                        assert hashes[f'home-production-model-mobility-{args.arm}.js']['source']==expected_source
                    plan = page.evaluate("i=>touchQA.prepare({index:i,kind:'historical'})",i)
                    assert plan['key']==feet[i][0]
                    # Historical ink sampling returns the first opaque point even when a
                    # neighbour wins every hit. Send the real gesture and record that loss.
                    assert not plan.get('skip'), plan
                    start = page.evaluate("""p=>{
                      const visible=([x,y])=>x>=0&&x<innerWidth&&y>=0&&y<innerHeight;
                      const owner=document.querySelector('[data-diorama-actor="'+CSS.escape(p.key)+'"]');
                      const r=owner.querySelector('img.character-asset').getBoundingClientRect();
                      return [p.start,[(r.left+r.right)/2,(r.top+r.bottom)/2],p.foot].find(visible)||null;
                    }""", plan)
                    if start is None:
                        reason='Native ink, body centre and foot all outside viewport'
                        ref=dict(index=i,key=plan['key'],foot=plan['foot'],skip=reason)
                        row=dict(index=i,key=plan['key'],skip=reason,trusted=False,selected=False,
                                 issued=False,routed=False,terminalArrived=False,terminalNear4=False)
                    else:
                        ref = dict(index=i,key=plan['key'],foot=plan['foot'],start=start,goal=plan['goal'],
                                   modelGoal=[plan['modelGoal']['x'],plan['modelGoal']['y']],skip=None)
                        if reference:
                            paired=reference['tape'][i]
                            assert not paired['skip'] and paired['key']==ref['key'] and paired['foot']==ref['foot']
                            ref=paired
                        incoming = prior.attach_motion(page,touch,i,'historical',ref)
                        assert incoming['trusted'] and incoming['foot']==ref['foot'] and incoming['key']==ref['key']
                        row = prior.compact(incoming)
                        row['pointerDownInputState']=page.evaluate('touchQA.forestDown')
                        row['issuedRecipients']=page.evaluate('touchQA.issuedRecipients')
                        if args.saved_raw:
                            row['nativeSavedGateEvents']=page.evaluate('touchQA.savedGateEvents')
                        assert row['pointerDownInputState']['trusted']
                    result['tape'].append(ref)
                    arm['rows'].append(row)
                    prior.save(args.out,result)
                if (i+1)%7==0:
                    print(args.arm,i+1,flush=True)
        finally:
            browser.close()


if __name__=='__main__':
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--url',required=True)
    ap.add_argument('--arm',choices=['v9','v9-seats','v10','v10-seats','v10-reference'],required=True)
    ap.add_argument('--width',type=int,choices=[320,375,390,430],required=True)
    ap.add_argument('--order',type=int,default=0)
    ap.add_argument('--seed',type=int,default=214)
    ap.add_argument('--snapshot',type=Path,required=True)
    ap.add_argument('--out',type=Path,required=True)
    ap.add_argument('--saved-game',action='store_true',help='load the live native care-save file before the matched-foot gesture')
    ap.add_argument('--historical-v9',action='store_true',help='use the exact archived 390/937 V9-seats 600-second state for a matched-mechanics comparison')
    ap.add_argument('--reference-tape',type=Path,help='dispatch exactly the saved start, release and model target for every resident')
    ap.add_argument('--chromium',default='/usr/bin/chromium')
    run(ap.parse_args())
