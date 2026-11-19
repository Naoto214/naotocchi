"""Exercise each real household and the live policy against rendered native CSS scales."""
import argparse
import hashlib
import importlib.util
import json
import os
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('v2_guard', HERE.parent / 'home-cast-size-v2/verify_protection_browser.py')
v2_guard = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v2_guard)

CAST = """() => {
 const actors = HomeCastTrial.inspect();
 const fixture = JSON.parse(localStorage.getItem('naotocchi-cast-size-v1-fixture'));
 return {actors:actors.map(a=>[a.key,a.kind,a.id]), fixturePartner:fixture.partner?.id||null,
   fixtureCompanions:fixture.companions.map(c=>c.id),
   heroPercent:document.body.dataset.homeHeroPercent,
   leaves:HomeBeauty.settings.variant, split:HomeBeauty.settings.compareSplit};
}"""

FEET = """() => HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y,a.w,a.h,a.depth])"""


# Run size changes within one JS task so a subsequent viewport fit cannot land
# between the pre-change and post-change measurements on a loaded test host.
SWEEP = """() => {
  const pose = (POSE), feet = (FEET), result = [];
  const before = JSON.stringify(feet());
  for (const curve of ['linear','step']) {
    for (const policy of ['current','A','B','C']) {
      const settings = HomeCastTrial.apply({policy,curve,extra:100,hero:220,companions:220});
      result.push({policy,curve,settings, measured:pose(), fixed:JSON.stringify(feet()) === before});
    }
  }
  return result;
}""".replace('POSE', v2_guard.POSE).replace('FEET', FEET)


# V5 refits the projection after resize, then eases the painted body scale.
# Observe its settled camera and execute the comparison in that same JS task.
SETTLED_SWEEP = """() => {
 const roles = {pet:'hero',partner:'partner',companion:'companions'};
 const {count,width,...current} = HomeCastTrial.settings;
 const cam = NaotocchiHomeViewport.residentPresentation();
 const key = JSON.stringify([width,cam,(FEET)()]);
 const fitted = (POSE)().every(a => ['multiplierX','multiplierY'].every(axis =>
    Math.abs(a[axis]-current[roles[a.role]]/100) < 0.00008));
 const now = performance.now(), prev = window.qaPolicyProjection;
 if (!fitted || !prev || prev.key !== key) {
   window.qaPolicyProjection = {key:fitted?key:null, since:now};
   return false;
 }
 if (now - prev.since < 1200) return false;
 return (SWEEP)();
}""".replace('POSE',v2_guard.POSE).replace('FEET',FEET).replace('SWEEP',SWEEP)


def sample(observed, count, width):
    assert observed['fixed'], (count, width, 'size-only change moved the frozen actors')
    settings, measured = observed['settings'], observed['measured']
    policy, curve = observed['policy'], observed['curve']
    assert [settings[k] for k in ('count', 'width', 'policy', 'curve')] == [count, width, policy, curve]
    t = max(0, min(1, (width - 320) / 55))
    factor = 0 if count <= 18 else (1 if curve == 'step' else (count - 18) / 10)
    expected = {'current': 0, 'A': 10, 'B': 15, 'C': 20}[policy] * factor * (t*t*(3-2*t))
    assert abs(expected - settings['extra']) < 1e-12, settings
    scales = {'pet':1.20, 'partner':1.20, 'companion':1.05}
    worst = max(abs(actor[axis] - scales[actor['role']]*(1+expected/100))
                for actor in measured for axis in ('multiplierX','multiplierY'))
    assert worst < 0.0001, [width, count, curve, policy, expected, worst]
    return {'policy':policy, 'curve':curve, 'width':width, 'extra':expected,
            'maximumAbsoluteCssScaleError':round(worst,8)}


def verify(browser, origin, counts):
    context = browser.new_context(viewport={'width':375,'height':760}, device_scale_factor=2,
                                  is_mobile=True, has_touch=True, reduced_motion='reduce')
    results = []
    try:
        for count in counts:
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda e:errors.append(str(e)))
            try:
                page.clock.set_fixed_time(datetime(2026,10,15,3,tzinfo=timezone.utc))
                query = urlencode({'count':count,'region':'forest','time':'day','paused':1,
                                   'layout':'fixed','policy':'B','curve':'linear','clock':0})
                page.goto(origin+'/game/population.html?'+query, wait_until='domcontentloaded',timeout=120000)
                print('opened',count,flush=True)
                page.wait_for_function('window.HomeCastTrial?.ready', polling=150, timeout=180000)
                print('ready',count,flush=True)
                page.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()))")
                cast = page.evaluate(CAST)
                actors = cast['actors']
                assert len(actors) == len({a[0] for a in actors}) == count, actors
                kinds = Counter(a[1] for a in actors)
                assert kinds == Counter({'pet':1, 'partner':int(count > 1), 'companion':max(0,count-2)}), kinds
                assert sorted(a[2] for a in actors if a[1] == 'companion') == sorted(cast['fixtureCompanions'])
                assert next((a[2] for a in actors if a[1] == 'partner'), None) == cast['fixturePartner']
                assert (cast['heroPercent'], cast['leaves'], cast['split']) == ('110','B',False)
                samples = []
                widths = [375,320,321,332,348,360,374,375,390,430,320,375] if count in [19,28] else [375]
                for width in widths:
                    if page.viewport_size['width'] != width:
                        page.set_viewport_size({'width':width, 'height':760})
                        page.wait_for_function('w=>HomeCastTrial.settings.width===w', arg=width)
                    observed = page.wait_for_function(SETTLED_SWEEP, timeout=120000, polling=150)
                    samples.extend(sample(row,count,width) for row in observed.json_value())
                    observed.dispose()
                    print('measured',count,width,flush=True)
                assert not errors, errors
                results.append({'count':count, 'nativeRoles':dict(kinds),
                                'rosterSha256':hashlib.sha256(json.dumps(actors).encode()).hexdigest(),
                                'fixtureMatchesNativeRoster':True, 'heroPercent':cast['heroPercent'],
                                'leaves':cast['leaves'], 'samples':samples})
                print('verified',count,len(samples),flush=True)
            finally:
                page.close()
    finally:
        context.close()
    return results


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('url')
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--counts',type=int,nargs='+',default=list(range(1,29)))
    args=parser.parse_args()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        records = verify(browser,args.url.rstrip('/'),args.counts)
        args.out.write_text(json.dumps({'browser':browser.version,'region':'forest','time':'day','layout':'fixed',
            'initialGameViewport':[375,760], 'dpr':2,'rosters':records},ensure_ascii=False,separators=(',',':'))+'\n')
        browser.close()
