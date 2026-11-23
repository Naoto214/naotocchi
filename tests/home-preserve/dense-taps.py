"""Tap one visible painted texel on each of 28 forest residents in Chromium."""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
from regional import HERE, once, seed, serve


def measure(root, width):
    rows = []
    probe = (HERE / 'dense-tap-probe.js').read_text()
    saved = json.dumps(seed('forest', 28))
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH', '/usr/bin/chromium'),
                                     args=['--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport=dict(width=width, height=792), has_touch=True,
                                is_mobile=True, device_scale_factor=2, reduced_motion='reduce')
        page.add_init_script("""let n=214; Math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
          const saved=""" + saved + """;saved.savedAt=Date.now();
          localStorage.setItem('naotocchi-save-v1', JSON.stringify(saved));
          localStorage.setItem('naotocchi-save-v1:home-guide-v1','done');""")
        page.clock.set_fixed_time('2026-11-23T03:00:00Z')
        def observe(route):
            response = route.fetch()
            anchor = '    function down(e){'
            route.fulfill(response=response, body=once(response.text(), anchor, probe+anchor))
        page.route('**/home-production-diorama.js*', observe)
        page.goto(serve(root), wait_until='load', timeout=90000)
        page.wait_for_function('window.residentTouches?.ready()', timeout=90000)
        cdp = page.context.new_cdp_session(page)
        for key in page.evaluate('residentTouches.keys()'):
            page.wait_for_function('!residentTouches.blocked()', timeout=30000)
            row = page.evaluate('k=>residentTouches.prepare(k)', key)
            if row['from']:
                x, y = row['from']
                cdp.send('Input.dispatchTouchEvent', dict(type='touchStart', touchPoints=[dict(x=x, y=y, id=1)]))
                cdp.send('Input.dispatchTouchEvent', dict(type='touchEnd', touchPoints=[]))
                row['selected'] = page.evaluate('residentTouches.selected()')
            rows.append(row)
        browser.close()
    return rows


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('game', type=Path)
    parser.add_argument('width', type=int)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    rows = measure(args.game, args.width)
    args.output.write_text(json.dumps(rows, indent=2)+'\n')
    assert len(rows) == 28 and all(row.get('selected') == row['key'] for row in rows), rows
