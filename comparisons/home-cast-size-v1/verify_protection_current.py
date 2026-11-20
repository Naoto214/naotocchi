"""Repeat #569's fixed-clock, reduced-motion resident screenshot check at current size."""
from argparse import ArgumentParser
from hashlib import sha256
from importlib.util import module_from_spec, spec_from_file_location
import json
import os
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright


def main():
    cli = ArgumentParser(description=__doc__)
    cli.add_argument('checkout',type=Path,help='Checkout of immutable #569 commit')
    cli.add_argument('prior', help='#569 reference origin')
    cli.add_argument('trial', help='Trial origin')
    cli.add_argument('--out',type=Path,required=True)
    args = cli.parse_args()
    path = args.checkout/'comparisons/home-beauty-v7/verify_residents.py'
    spec = spec_from_file_location('reference_capture',path)
    helper = module_from_spec(spec)
    spec.loader.exec_module(helper)
    # Align the fixture gear and the scene without changing the reference capture timings.
    def query(params):
        return urlencode({**params,'gear':'none','variant':'B','castPreset':'current'})
    result = []
    with patch.object(helper,'urlencode',query), sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'))
        for url in [args.prior,args.trial]:
            page = browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
            frame = helper.open_home(page,url)
            poses = frame.locator(helper.ACTORS).evaluate_all(helper.POSE)
            result.append((poses,frame.locator('.home-art-canvas').evaluate(helper.CANVAS),
                           sha256(page.screenshot()).hexdigest()))
            page.close()
        assert result[0] == result[1], 'Current poses, background or full screenshot differ from #569'
        poses,canvas,screen = result[0]
        report = dict(referencePR=569, sizePreset='current', residents=len(poses), gear='none in both',
                      chromium=browser.version, iframe=[390,844], reducedMotion=True, sceneClock=39,
                      geometryImagesLightingLayersMatch=True, wholeScreenPNGSHA256=screen, canvasSHA256=canvas)
        args.out.write_text(json.dumps(report, indent=2) + '\n')
        print(report)
        browser.close()


if __name__ == '__main__':
    main()
