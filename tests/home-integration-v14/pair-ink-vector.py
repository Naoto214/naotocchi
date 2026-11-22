"""Measure the horizontal correction needed to keep the two decoded sprites visually separate at the original cast depth."""
import argparse
import json
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
import regional

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('runtime',type=Path)
    parser.add_argument('cases',nargs='+',help='region,count,width')
    args=parser.parse_args()
    url=regional.serve(args.runtime)
    probe=(regional.HERE/'pair-ink-vector.js').read_text()
    result=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'))
        for case in args.cases:
            region,n,w=case.split(',')
            observed=regional.run(browser,args.runtime,url,region,int(n),int(w),'candidate',0,
                                  pairs=True,opening_probe=probe)
            result.append(dict(region=region,count=int(n),width=int(w),height=regional.HEIGHT[int(w)],**observed))
    print(json.dumps(result,indent=2))
