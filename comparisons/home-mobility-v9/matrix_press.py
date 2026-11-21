"""Replay selection-changing inputs and sample source-art alpha at the actual physical press."""
import argparse
import csv
import json
import os
from pathlib import Path
from urllib.parse import urlparse
import zipfile

from matrix_worker_v9 import ARMS, HERE, native_page, old, v8
from matrix_report_v9 import write_json

def changed_cases():
    cases=set()
    for name in ('historical-changes','paired-changes'):
        with (HERE/'evidence'/f'matrix-{name}.csv').open() as f:
            for row in csv.DictReader(f):
                if 'selected' in row['changed']:
                    cases.add((row['region'],int(row['count']),int(row['width']),row['case']))
    return sorted(cases)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run',required=True)
    parser.add_argument('--url',required=True)
    parser.add_argument('--archives',required=True,type=Path)
    parser.add_argument('--out',required=True,type=Path)
    args=parser.parse_args()
    old.require(urlparse(args.url).hostname in ('127.0.0.1','localhost'),'expected isolated local origin')
    rows={}
    with old.sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--disable-dev-shm-usage'])
        try:
            for region,n,w,case in changed_cases():
                with zipfile.ZipFile(args.archives/f'mobility-v9-{args.run}-{region}.zip') as z:
                    cell=json.loads(z.read(f'{region}-{n}-{w}.json'))
                kind,index=case.split('/')
                for arm in ARMS:
                    with native_page(browser,args.url.rstrip('/'),region,n,w,arm,False) as (page,touch,meta):
                        source=cell['arms'][arm]
                        old.require(meta['hashes']==source['hashes'] and meta['opening']==source['opening'],'different scripts or opening')
                        page.evaluate((v8.PRIOR/'selection-probe.js').read_text())
                        for wait in (0,500):
                            page.wait_for_timeout(wait)
                            page.evaluate('mobilitySelectionQA.recordNext=true')
                            r=old.legacy.trial(page,touch,int(index),kind,source['rows'][case])
                            ink=page.evaluate('mobilitySelectionQA.last')
                            key='/'.join(map(str,(region,n,w,case,arm,wait)))
                            rows[key]=dict(foreground=ink['foreground'],selected=r['selectedKey'],issued=r['issued'],
                                trusted=r['trusted'],stack=ink['stack'],input=r['start'],target=r['key'],
                                arrived=r['arrived'] or r['terminalArrived'],near=r['near4'] or r['terminalNear4'])
                write_json(args.out,dict(browser=browser.version,rows=rows))
        finally:
            browser.close()

if __name__=='__main__':
    main()
