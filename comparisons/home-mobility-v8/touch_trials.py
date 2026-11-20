"""Trusted browser touch replays on frozen forest gestures, aged crowds and reaction gates."""
import argparse
import csv
import hashlib
from contextlib import nullcontext
import json
import os
from pathlib import Path
import sys
from unittest.mock import patch
from urllib.request import urlopen

from playwright.sync_api import Browser, sync_playwright

HERE = Path(__file__).resolve().parent
V7 = HERE.parent / 'home-mobility-v7'
sys.path.insert(0, str(V7))
import matrix_worker as base
import touch_focus as focus
import reaction_input

AGED = [(20, 390, 1), (20, 430, 1), (28, 390, 3)]
MODEL_CHECKPOINT = """
    qa.captureTouchHousehold=()=>{
      if(manualGoals.size||retryingKey!==null)throw Error('Unsettled manual command before touch checkpoint');
      return {actors:structuredClone(actors),selected,clock,idleAt,paused,stats:structuredClone(stats),
        cooldown:[...cooldown],seed:qa.readSeed()};
    };
    qa.loadTouchHousehold=s=>{
      if(actors.map(a=>a.key).join()!==s.actors.map(a=>a.key).join())throw Error('Checkpoint household mismatch');
      actors=structuredClone(s.actors);selected=s.selected;clock=s.clock;idleAt=s.idleAt;paused=s.paused;
      Object.assign(stats,structuredClone(s.stats));manualGoals.clear();retryingKey=null;
      cooldown.clear();for(const [key,time] of s.cooldown)cooldown.set(key,time);
      qa.writeSeed(s.seed);
    };
"""


def read(path):
    return json.loads(path.read_text())


def compact(result):
    if result.get('skip'):
        return result
    fields = '''index key kind trusted selected selectedKey issued routed terminalArrived terminalNear4
        start goal modelGoal foot origin end endDistanceCss earlyDistanceCss endFingerErrorCss
        releaseJumpCss blockedClass stepCount reactions unsafeSteps sweptViolations searchCount searchMaxMs
        demandAtEnd mobilityInput initialGate markers visualDown feedbackTimeline'''.split()
    row = {k: result[k] for k in fields if k in result}
    row['originPeers'] = result['startClass']['contacts']
    row['goalPeers'] = result['goalClass']['contacts']
    row['peers'] = {k: {'steps': v['steps'], 'swept': v['swept']} for k, v in result['peerWalk'].items()}
    return row


def attach_motion(page, touch, index, kind, paired=None, **kw):
    result = NATIVE_TRIAL(page, touch, index, kind, paired, **kw)
    if not result.get('skip'):
        result['mobilityInput'] = page.evaluate('touchQA.mobilityInput')
    return result


NATIVE_TRIAL = base.legacy.trial


def forest(browser, url, arm, *, resync=False):
    with (V7 / 'evidence/forest-drag-touch.csv').open() as f:
        coords = [r for r in csv.DictReader(f) if r['arm'] == 'v5']
    assert len(coords) == 28
    data = {'rows': {}}
    if resync:
        coords = [item for item in coords if int(item['index']) in (5, 24)]
    batch = 1 if resync else 7
    for offset in range(0, len(coords), batch):
        with base.native_page(browser, url, 'forest', 28, 390, arm, False, canonical=False) as (p, t, m):
            if 'meta' in data:
                for field in ('opening','seed','viewport','hashes','browser'):
                    assert data['meta'][field] == m[field], f'Changed forest comparison reference: {field}'
            data['meta'] = m
            if resync:
                p.evaluate('''() => {
                  const advance=touchQA.advance;
                  touchQA.advance=(seconds,ambient)=>{
                    if(seconds!==.7)return advance(seconds,ambient);
                    advance(.3,ambient);
                    const feet=()=>touchQA.model.snapshot().map(a=>[a.key,a.x,a.y,a.w,a.h]);
                    const before=feet();
                    dispatchEvent(new Event('dayparts-qa-change'));
                    touchQA.touchRefreshStable=JSON.stringify(before)===JSON.stringify(feet());
                    advance(.4,ambient);
                  };
                }''')
            scale = p.evaluate('(()=>{const s=NaotocchiHomeViewport.residentPresentation();return [s.scaleX,s.scaleY];})()')
            for item in coords[offset:offset+batch]:
                i = int(item['index'])
                start = [float(item[k]) for k in ('startX', 'startY')]
                goal = [float(item[k]) for k in ('goalX', 'goalY')]
                ref = focus.intended_reference(m, item['key'], start, goal, scale)
                row = attach_motion(p, t, i, 'historical', ref)
                data['rows'][str(i)] = compact(row)
                if resync:
                    assert p.evaluate('touchQA.touchRefreshStable')
    return data


def aged(browser, url, arm, out):
    original_patch = base.patch

    def hook(name, source):
        result = original_patch(name, source)
        if 'production-model' in name:
            result = base.legacy.once(result, '    let checkpoint;', MODEL_CHECKPOINT + '    let checkpoint;')
        return result

    cases = {}
    with patch.object(base, 'patch', hook):
        for count, width, index in AGED:
            label = f'{count}-{width}'
            snapshot_file = out / f'checkpoint-{label}.json'
            with base.native_page(browser, url, 'forest', count, width, arm, True) as (p, t, meta):
                p.evaluate((V7 / 'matrix_age.js').read_text())
                p.evaluate('HomeMobilityDiagnostics.enable();HomeCastTrial.apply({paused:false});touchQA.log=null; touchQA.paint()')
                for _ in range(5):
                    p.evaluate('touchQA.ageTo(60)')
                p.evaluate('touchQA.ageActive=false;touchQA.restore=()=>{}')
                snapshot = p.evaluate('touchQA.captureTouchHousehold()')
                native_open = p.evaluate('touchQA.opening()')
                observed = p.evaluate('key=>HomeMobilityDiagnostics.read().residents.find(r=>r.key===key)', native_open[index][0])
                row = attach_motion(p, t, index, 'historical')
                cases[label] = {'meta': meta, 'natural': compact(row), 'ambient': {k:observed[k] for k in (
                    'ambientRequests','ambientFailures','ambientStarts','actualDistance','stateSeconds','recoveredEpisodes','failureEpisodes')}}
                if arm == 'v7':
                    archived = next(f for f in read(HERE / 'dual-drag-feet.json')['fixtures']
                                    if f['count'] == count and f['viewport'][0] == width)
                    assert [a[:5] for a in native_open] == archived['agedFeet']
                    assert row['key'] == archived['key'] and all(
                        abs(row['modelGoal'][axis] - archived['goal'][k]) < 1e-7 for axis,k in enumerate(('x','y')))
                    assert meta['hashes']['home-production-model-mobility-v7.js'] == archived['modelSha256']
                    focus.write(snapshot_file, dict(snapshot=snapshot, opening=native_open, input=row))
            if not snapshot_file.exists():
                raise ValueError(f'Generate V7 aged reference first: {snapshot_file.name}')
            fixed = read(snapshot_file)
            with base.native_page(browser, url, 'forest', count, width, arm, True) as (p, t, m):
                p.evaluate('HomeCastTrial.apply({paused:false})')
                p.evaluate('s=>{touchQA.loadTouchHousehold(s);touchQA.restore=()=>{};touchQA.paint()}', fixed['snapshot'])
                assert p.evaluate('touchQA.opening()') == fixed['opening']
                row = attach_motion(p, t, index, 'historical', fixed['input'])
                cases[label]['fixedV7'] = compact(row)
            print(arm, label, 'completed', flush=True)
    return cases


def extra(browser, url, arm, out, touch_session, engine, model_hash):
    references = {} if arm == 'v6' else read(out / f'extra-v6-{engine}.json')['data']
    panels = [('forest', 28, 390, 'directions'), ('home', 4, 390, 'gestures')]
    partial = out / f'extra-partial-{arm}-{engine}-{model_hash}.json'
    out_rows = read(partial) if partial.exists() else {}
    for region, count, width, suite in panels:
        with base.native_page(browser, url, region, count, width, arm, False, touch_session=touch_session) as (p, t, m):
            for kind, idx in base.legacy.cases(suite, count):
                label = f'{region}/{count}/{kind}/{idx}'
                if label in out_rows:
                    continue
                ref = references.get(label, {}).get('input')
                row = attach_motion(p, t, idx, kind, ref)
                inp = {k: row.get(k) for k in ('key','kind','index','foot','start','goal','modelGoal','skip')}
                out_rows[label] = {'input': inp, 'observed': compact(row)}
                focus.write(partial,out_rows)
    if engine == 'chromium':
        for kind in reaction_input.CASES:
            label = 'gate/' + kind
            if label in out_rows:
                continue
            setups = []
            for extension in (0, 1200, 3500):
                with base.native_page(browser, url, 'home', 4, 390, arm, False) as (p, t, m):
                    if extension:
                        p.evaluate('ms=>{const trigger=touchQA.triggerGate;touchQA.triggerGate=(gate,t)=>trigger(gate,t+ms)}',extension)
                    try:
                        row = reaction_input.check_gate(p,t,0,kind,references.get(label, {}).get('input'))
                    except RuntimeError as error:
                        if not (error.args and isinstance(error.args[0],tuple) and
                                error.args[0][0]=='native gate was not established'):
                            raise
                        setups.append(error.args[0])
                        continue
                    out_rows[label] = {'input': {k:row.get(k) for k in ('start','goal')}, 'observed':row,
                                       'failedSetups':setups,'gateDurationExtensionMs':extension}
                    focus.write(partial,out_rows)
                    break
            else:
                raise RuntimeError(('native reaction setup failed on all three attempts',kind,setups))
    return out_rows


def handle_fixture_invites():
    # A slow WPE startup can legitimately produce a real companion invitation
    # before the first ink sample. Dismiss it using the game's Later button.
    # The separate modal panel observes normal blocking with no dismissal.
    create = Browser.new_context
    def with_dismissal(browser, *args, **kwargs):
        context = create(browser, *args, **kwargs)
        context.add_init_script("""(() => {
          window.touchFixtureInvites = 0;
          const settle=()=>{
            const overlay=document.getElementById('companionInviteOverlay');
            const later=document.getElementById('companionInviteLaterBtn');
            if(overlay && later && !overlay.classList.contains('hidden') && overlay.getClientRects().length){
              window.touchFixtureInvites++;later.click();
            }
          };
          addEventListener('DOMContentLoaded',()=>{
            const overlay=document.getElementById('companionInviteOverlay');
            if(!overlay)return;
            new MutationObserver(settle).observe(overlay,{attributes:true,attributeFilter:['class']});
            settle();
          },{once:true});
        })()""")
        return context
    return patch.object(Browser,'new_context',with_dismissal)


def overlapping_ink(browser, url, arm, engine, touch_session):
    with (V7 / 'evidence/overlap-touch.csv').open() as f:
        history = [r for r in csv.DictReader(f) if r['arm'] == 'v5' and r['engine'] == engine]
    result = {}
    for profile in dict.fromkeys(r['profile'] for r in history):
        region, count, width = profile.split('-')
        with base.native_page(browser, url, region, int(count), int(width), arm, False, touch_session=touch_session) as (p,t,m):
            p.evaluate(focus.SELECTION_JS)
            if touch_session:
                p.evaluate('HomeCastTrial.apply({paused:false})')
                p.wait_for_function("!touchQA.gates().blocked&&!touchQA.gates().pending",timeout=60000,polling=200)
            scale = p.evaluate('(()=>{const s=NaotocchiHomeViewport.residentPresentation();return [s.scaleX,s.scaleY];})()')
            cases = {}
            for item in (r for r in history if r['profile'] == profile):
                label = item['case']
                kind = label.split('-')[-1]
                start = [float(item[k]) for k in ('startX','startY')]
                delta = {'tap':0,'jitter':5,'threshold':10}[kind]
                ref = focus.intended_reference(m,item['key'],start,[start[0]+delta,start[1]],scale)
                if touch_session:
                    # Store actual geometry before the OS sends its touch.
                    # Archived CSS coordinates are used verbatim on every arm.
                    p.wait_for_function("!touchQA.gates().blocked && !touchQA.gates().pending",timeout=60000,polling=200)
                    plan = p.evaluate("i=>touchQA.prepare({index:i,kind:'historical'})",ref['index'])
                    ref = focus.intended_reference({'opening':p.evaluate('touchQA.opening()')},item['key'],start,
                                                   [start[0]+delta,start[1]],plan['scale'])
                p.evaluate('mobilitySelectionQA.recordNext=true')
                row = attach_motion(p,t,ref['index'],kind,ref)
                row['ink'] = p.evaluate('mobilitySelectionQA.last')
                cases[label] = row
            result[profile] = {'meta':m,'rows':cases, 'invitesDismissedDuringSetupAndPanel':
                               p.evaluate('window.touchFixtureInvites||0')}
    return result


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--origin', required=True)
    ap.add_argument('--out', required=True, type=Path)
    ap.add_argument('--arm', choices=('v6','v7','v8'), required=True)
    ap.add_argument('--suite', choices=('forest','resync','aged','extra','ink'), required=True)
    ap.add_argument('--engine', choices=('chromium','webkit'), default='chromium')
    a = ap.parse_args()
    a.out.mkdir(parents=True, exist_ok=True)
    if a.engine == 'webkit' and a.suite not in ('extra','ink'):
        ap.error('The WebKit touch bridge serves the extra and overlap panels.')
    model_url = f'{a.origin}/game/home-production-model-mobility-{a.arm}.js'
    def model_hash():
        with urlopen(model_url,timeout=30) as response:
            return hashlib.sha256(response.read()).hexdigest()
    start_hash = model_hash()
    with sync_playwright() as pw:
        wk = base.legacy.old.WebKitTouch(os.getenv('WEBKIT_PATH', pw.webkit.executable_path)) if a.engine == 'webkit' else None
        b = pw.webkit.connect(wk.endpoint) if wk else pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        try:
            with focus.webkit_fixture_readiness() if wk else nullcontext():
                if a.suite in ('forest', 'resync'):
                    result = forest(b, a.origin, a.arm, resync=a.suite == 'resync')
                elif a.suite == 'aged':
                    result = aged(b, a.origin, a.arm, a.out)
                elif a.suite == 'extra':
                    result = extra(b, a.origin, a.arm, a.out, wk, a.engine, start_hash)
                else:
                    with handle_fixture_invites() if wk else nullcontext():
                        result = overlapping_ink(b,a.origin,a.arm,a.engine,wk)
            assert start_hash == model_hash(), 'Candidate changed while the touch panel was running'
            focus.write(a.out / f'{a.suite}-{a.arm}-{a.engine}.json',
                        dict(suite=a.suite, arm=a.arm, engine=a.engine, browser=b.version, modelSHA256=start_hash, data=result))
        finally:
            b.close()
            if wk:
                wk.close()


if __name__ == '__main__':
    main()
