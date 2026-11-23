"""Compare trusted taps, streamed drags and release-only movement on shipped home pages."""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path

from playwright.sync_api import sync_playwright
from regional import HERE, once, seed, serve


def measure(browser, origin, index, mode):
    context = browser.new_context(viewport=dict(width=390, height=792), is_mobile=True,
                                  has_touch=True, device_scale_factor=2, reduced_motion='reduce')
    try:
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        save = json.dumps(seed('forest', 2))
        page.clock.set_fixed_time('2026-11-23T03:00:00Z')
        page.add_init_script("""let n=214;Math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
          const saved=""" + save + """;saved.savedAt=Date.now();
          localStorage.setItem('naotocchi-save-v1', JSON.stringify(saved));
          localStorage.setItem('naotocchi-save-v1:home-guide-v1','done');""")
        def observe(route):
            response = route.fetch()
            anchor = '    function down(e){'
            source = once(response.text(), anchor, (HERE/'pointer-probe.js').read_text()+'\n'+anchor)
            route.fulfill(response=response, body=source)
        page.route('**/home-production-diorama.js*', observe)
        page.goto(origin, wait_until='load', timeout=90000)
        page.wait_for_function('window.pointerProbe?.ready()', timeout=90000)
        plan = page.evaluate('i=>pointerProbe.plan(i)', index)
        start, end = plan['from'], plan['goal']
        cdp = context.new_cdp_session(page)
        if mode in ['tap', 'drag']:
            events = [('touchStart', start)]
            if mode == 'drag':
                events.append(('touchMove', end))
            events.append(('touchEnd', None))
            for kind, xy in events:
                points = [dict(x=xy[0], y=xy[1], id=1)] if xy else []
                cdp.send('Input.dispatchTouchEvent', dict(type=kind, touchPoints=points))
        else:
            if mode == 'jitter':
                end = [start[0]+2, start[1]]
            for kind, xy in [('mousePressed', start), ('mouseReleased', end)]:
                cdp.send('Input.dispatchMouseEvent', dict(type=kind, x=xy[0], y=xy[1], button='left', clickCount=1))
        page.wait_for_timeout(650)
        result = page.evaluate('i=>pointerProbe.sample(i)', index)
        distance = math.dist(plan['foot'], result['foot'])
        assert not errors and result['selected'] == plan['key'], (errors, plan, result)
        assert all(e[2] for e in result['pointerEvents']), result
        assert [e[0] for e in result['pointerEvents']] == (
            ['pointerdown','pointermove','pointerup'] if mode == 'drag' else ['pointerdown','pointerup']), result
        commands = result['commands']
        if commands:
            assert commands == [dict(key=plan['key'], source='drag', ok=True)] and distance > 1, result
        return dict(mode=mode, actor=plan['key'], start=start, end=end, selected=result['selected'],
                    commands=commands, events=result['pointerEvents'], modelDistance=round(distance, 2))
    finally:
        context.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('main', type=Path)
    parser.add_argument('candidate', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH', '/usr/bin/chromium'),
                                     args=['--enable-unsafe-swiftshader'])
        report = dict(browser='Chromium '+browser.version, region='forest', viewport=[390,792], arms={})
        for arm, root in [('main',args.main), ('candidate',args.candidate)]:
            origin = serve(root)
            rows = [measure(browser, origin, i, mode) for mode in ['tap','drag','release','jitter'] for i in range(2)]
            report['arms'][arm] = dict(hashes={f:hashlib.sha256((root/f).read_bytes()).hexdigest() for f in
                                       ['home-production-model.js','home-production-diorama.js']}, rows=rows)
        browser.close()
    args.output.write_text(json.dumps(report, indent=2)+'\n')
    for a,b in zip(report['arms']['main']['rows'],report['arms']['candidate']['rows'], strict=True):
        assert [a[k] for k in ['actor','mode','start','end']] == [b[k] for k in ['actor','mode','start','end']], (a,b)
        assert bool(a['commands']) == (a['mode']=='drag'), a
        assert bool(b['commands']) == (b['mode'] in ['release','drag']), b


if __name__ == '__main__':
    main()
