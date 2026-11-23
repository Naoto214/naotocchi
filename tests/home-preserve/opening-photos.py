"""Photograph the same settled native viewport, before any test input."""
import argparse
import hashlib
import json
import os
from pathlib import Path

from PIL import Image, ImageChops, ImageStat
from playwright.sync_api import sync_playwright

import regional


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('out',type=Path)
    p.add_argument('roots',type=Path,nargs='+')
    p.add_argument('--region',default='forest')
    p.add_argument('--count',type=int,default=4)
    p.add_argument('--width',type=int,default=375)
    a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True)
    rows={}
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        for path in a.roots:
            def photograph(page,phase):
                assert phase=='opening'
                page.screenshot(path=a.out/(path.name+'.png'),scale='css')
            row=regional.run(browser,path,regional.serve(path),a.region,a.count,a.width,'candidate',0,pairs=True,
                             opening_probe='regional.measureOpening=regional.placement;',phase_observer=photograph)
            rows[path.name]=row
        browser.close()
    first=Image.open(a.out/(a.roots[0].name+'.png')).convert('RGB')
    rows['pixels']={}
    for path in a.roots:
        shot=a.out/(path.name+'.png')
        diff=ImageChops.difference(first,Image.open(shot).convert('RGB'))
        rows['pixels'][path.name]=dict(sha256=hashlib.sha256(shot.read_bytes()).hexdigest(),
                                      differingPixels=sum(1 for p in diff.getdata() if any(p)),
                                      meanAbsoluteChannelDelta=ImageStat.Stat(diff).mean)
    (a.out/'observed.json').write_text(json.dumps(rows,separators=(',',':')))
    print(rows['pixels'])


if __name__=='__main__':main()
