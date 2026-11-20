"""Replay four inter-run changes with source-alpha and front-to-back hit evidence at pointerdown."""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlparse
from matrix_worker_v8 import HERE, PRIOR, old, include_native_observer

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',required=True);p.add_argument('--raw',required=True,type=Path);p.add_argument('--out',required=True,type=Path)
    args=p.parse_args();old.require(urlparse(args.url).hostname in ('127.0.0.1','localhost'),'expected local private origin')
    summary=json.loads((HERE/'evidence/matrix-result.json').read_bytes())
    items=summary['pairedShippedControls']['changedOpeningFlags']
    rows=[]
    with old.sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        try:
            for item in items:
                region,n,w,case=(item[k] for k in ('region','count','width','case')); kind,index=case.split('/')
                cell=json.loads((args.raw/region/f'{region}-{n}-{w}.json').read_bytes())
                for arm in ('v7','v8'):
                    with old.native_page(b,args.url.rstrip('/'),region,n,w,arm,False) as (page,touch,meta):
                        include_native_observer(page,meta,arm)
                        old.require(meta['opening']==cell['arms'][arm]['opening'] and meta['hashes']==cell['arms'][arm]['hashes'],'source or fixture changed')
                        page.evaluate((PRIOR/'selection-probe.js').read_text())
                        frozen_input=cell['arms'][arm]['rows'][case]
                        for wait_ms in (0,350,900):
                            page.wait_for_timeout(wait_ms)
                            page.evaluate('mobilitySelectionQA.recordNext=true')
                            actual=old.legacy.trial(page,touch,int(index),kind,frozen_input)
                            ink=page.evaluate('mobilitySelectionQA.last')
                            rows.append(dict(region=region,count=n,width=w,case=case,arm=arm,
                                waitBeforeReplayMs=wait_ms,target=actual['key'],actualSelected=actual['selectedKey'],issued=actual['issued'],
                                trusted=actual['trusted'],frontInk=ink['foreground'],stack=ink['stack'],pointer=[ink['x'],ink['y']],
                                terminalArrival=actual['arrived'] or actual['terminalArrived']))
                args.out.write_text(json.dumps(dict(browser=b.version,supplementary=True,gameplayRevision=summary['source']['revision'],rows=rows),ensure_ascii=False,indent=2)+'\n')
        finally:b.close()
if __name__=='__main__': main()
