"""Restore the three V7 simultaneous failures for geometric checks in the original browser model.

Serve the local owner comparison build, then run
  python dual-drag-check.py --url http://127.0.0.1:PORT --output evidence/dual-drag.json
The page stays paused. Only archived feet enter the offline geometric observer.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright


HERE = Path(__file__).resolve().parent


def check(browser, base, fixture):
    width, height = fixture['viewport']
    context = browser.new_context(viewport=dict(width=width, height=height), has_touch=True,
                                  is_mobile=True, device_scale_factor=2)

    def attach(route):
        response = route.fetch()
        body = response.body()
        assert hashlib.sha256(body).hexdigest() == fixture['modelSha256'], 'V7 model hash mismatch'
        source = body.decode()
        anchor = '    return {metrics:'
        assert source.count(anchor) == 1
        hook = (HERE / 'dual-drag-geometry.js').read_text()
        route.fulfill(response=response, body=source.replace(anchor, hook + '\n' + anchor))

    try:
        context.route('**/home-production-model-mobility-v7.js*', attach)
        page = context.new_page()
        params = dict(region=fixture['region'], count=fixture['count'], time='day', paused=1,
                      ground='on', variant='B', policy='B', layout='optimized', curve='linear',
                      paired=1, compareSplit=0, diagnostics=1)
        page.goto(f'{base}/game/mobility-v7.html?{urlencode(params)}', wait_until='domcontentloaded')
        page.wait_for_function('window.HomeCastTrial?.ready && HomeDragTrial.opening() && !!window.scanV7Crowd')
        result = page.evaluate('input => scanV7Crowd(input)', fixture)
        return dict(file=fixture['file'], key=fixture['key'], **result)
    finally:
        context.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', required=True)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    fixtures = json.loads((HERE / 'dual-drag-feet.json').read_text())['fixtures']
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH', '/usr/bin/chromium'))
        try:
            results = [check(browser, args.url.rstrip('/'), f) for f in fixtures]
            output = dict(engine=browser.version, units='CSS px; right=0°, down=90°',
                          radii=[2,3,4,5,6,7,8,10,12,14,16,18,20,22,24], headingIntervalDeg=3,
                          microscopicHeadingIntervalDeg=.25, localProgressMinPx=3,
                          localFingerErrorGainPx=.75, maxHelpers=2, results=results)
            args.output.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
        finally:
            browser.close()


if __name__ == '__main__':
    main()
