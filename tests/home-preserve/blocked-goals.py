"""Replay occupied drag destinations and search surrounding native ground for a clear alternative."""
import argparse
import csv
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

import regional


def send_drag(page, alternate):
    target = page.evaluate('window.inputReceipt = regional.target()')
    if alternate:
        target = page.evaluate("""() => {
          const q = window.inputReceipt;
          q.originalGoal = q.goal;
          q.alternative = regional.alternate(q);
          q.goal = q.alternative.first?.xy || null;
          return q;
        }""")
        if target['goal'] is None:
            return

    cdp = page.context.new_cdp_session(page)

    def touch(kind, xy=None):
        points = [dict(x=xy[0], y=xy[1])] if xy else []
        cdp.send('Input.dispatchTouchEvent', dict(type=kind, touchPoints=points))

    touch('touchStart', target['from'])
    touch('touchEnd')
    touch('touchStart', target['from'])
    touch('touchMove', target['goal'])
    touch('touchEnd')
    page.evaluate('regional.advanceWithDragTrace(30)')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', type=Path)
    parser.add_argument('cells', type=Path)
    parser.add_argument('out', type=Path)
    parser.add_argument('--alternate', action='store_true')
    args = parser.parse_args()
    result = {}
    probe = Path(__file__).with_name('goal-clearance.js').read_text()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH', '/usr/bin/chromium'))
        url = regional.serve(args.root)
        for row in csv.DictReader(args.cells.read_text().splitlines()):
            if int(row['base_drag']):
                continue
            region, count, width = row['region'], int(row['count']), int(row['width'])
            key = f'{region}-{count}-{width}'
            try:
                result[key] = regional.run(
                    browser, args.root, url, region, count, width, 'candidate', 30,
                    pairs=True, opening_probe=probe,
                    phase_observer=lambda page, phase: send_drag(page, args.alternate))
            except Exception as exc:
                result[key] = {'error': str(exc)}
            args.out.write_text(json.dumps(result, separators=(',', ':'))+'\n')
            print(args.root.name, key, flush=True)
        browser.close()
    if any('error' in r for r in result.values()):
        raise SystemExit('Incomplete native drag observations')


if __name__ == '__main__':
    main()
