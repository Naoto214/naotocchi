"""Wall time of the real care action and rAF gap across it, separate from steady-state FPS."""
import argparse
import hashlib
import json
import os
import subprocess
from pathlib import Path
from urllib.parse import urlencode, urlparse
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
V11 = HERE.parent / 'home-mobility-v11'
BASE_GAME = 'script-v2-mobility-v7.js'
CASES = [('v10', 'legacy'), ('v11-foot', 'legacy')] + [
    ('v12', name) for name in ['legacy', 'keep', 'minimal', 'walk', 'helpers']]
PARAMS = dict(region='forest', count=28, paused=1, paired=1, variant='B', time='day',
              clock=0, ground='on', season='autumn', weather='sunny')


def baseline_game(source):
    # The old private growth button drives native onAgeChanged() and render().
    # The equal-width control has no keep/restore hook in its movement model.
    script = "const fs=require('fs');process.stdout.write(require(process.argv[1]).patchCareGame(fs.readFileSync(0,'utf8')))"
    return subprocess.check_output(['node', '-e', script, str(V11 / 'foot-care.cjs')], input=source, text=True)


MEASURE = '''async()=>{
  const frame=()=>new Promise(requestAnimationFrame);
  const snap=()=>HomeCastTrial.inspect().map(r=>[r.key,r.foot.x,r.foot.y]);
  const opening=snap();
  const started=HomeCareGrowthTrial.read();
  if(started.started || opening.length!==28)throw Error('fresh 28-resident growth page required');
  await frame(); const previous=await frame(), begin=performance.now();
  const accepted=HomeCareGrowthTrial.grow(), returned=performance.now();
  const next=await frame(), following=await frame();
  await new Promise(r=>setTimeout(r,600));
  const result=HomeCareGrowthTrial.read();
  if(!accepted || result.stageAfter<=result.stageBefore || result.ageAfter<=result.ageBefore)throw Error('care stage did not advance');
  return {opening, ending:snap(), result, decision:globalThis.HomeV12Growth?.read?.(),
    callMs:returned-begin, framesMs:[next-previous,following-next]};
}'''


def one(browser, base, width, arm, policy):
    page = browser.new_page(viewport={'width': width, 'height': 792}, device_scale_factor=2,
                            is_mobile=True, has_touch=True)
    errors, assets = [], {}
    page.on('pageerror', lambda e: errors.append(str(e)))
    def observe(route):
        response = route.fetch()
        name = Path(urlparse(route.request.url).path).name
        body = response.text()
        assets[name] = hashlib.sha256(body.encode()).hexdigest()
        route.fulfill(response=response, body=baseline_game(body) if arm != 'v12' and name == BASE_GAME else body)
    try:
        page.route('**/*.js*', observe)
        if arm != 'v12':
            page.add_init_script('globalThis.HomeCareFootControl={prepare:()=>true,read:()=>null};')
        entry = 'v12-growth' if arm == 'v12' else arm
        params = {**PARAMS, 'growthPolicy': policy}
        page.goto(base + '/mobility-' + entry + '.html?' + urlencode(params), wait_until='domcontentloaded', timeout=120000)
        page.wait_for_function('window.HomeCastTrial?.ready && window.HomeDragTrial?.opening() && !!globalThis.HomeCareGrowthTrial', timeout=120000)
        page.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(n=>n.decode()))")
        sample = page.evaluate(MEASURE)
        assert not errors, errors
        return {**sample, 'assets': assets, 'arm': arm, 'policy': policy, 'width': width}
    finally:
        page.close()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out', type=Path, required=True)
    ap.add_argument('--base', default='http://127.0.0.1:8377/game')
    ap.add_argument('--widths', type=int, nargs='+', default=[320, 375, 390, 430])
    ap.add_argument('--controls', action='store_true', help='Smoke-test the V10 and foot-only care buttons')
    ap.add_argument('--chromium', help='Use local Chromium for smoke checks')
    args = ap.parse_args()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=args.chromium) if args.chromium else pw.webkit.launch(executable_path=os.getenv('WEBKIT_PATH'))
        data = {'browser': browser.version, 'kind': 'chromium' if args.chromium else 'webkit', 'cases': []}
        try:
            cases = CASES[:2] if args.controls else CASES
            for width in args.widths:
                for order, sequence in [('forward', cases), ('reverse', cases[::-1])]:
                    for arm, policy in sequence:
                        sample = one(browser, args.base, width, arm, policy)
                        data['cases'].append({**sample, 'order': order})
                        args.out.parent.mkdir(parents=True, exist_ok=True)
                        args.out.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':'))+'\n')
                        print(width, arm, policy, order, sample['callMs'], flush=True)
        finally:
            browser.close()


if __name__ == '__main__':
    main()
