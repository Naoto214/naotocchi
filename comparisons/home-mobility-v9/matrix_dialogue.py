"""Observe visible V9 conversation beats after a native social event in each region."""
import argparse
import os
from pathlib import Path
from urllib.parse import urlparse
from unittest.mock import patch
from matrix_worker_v9 import old, original_patch
from matrix_speech_v8 import BUBBLE, AFTER_BUBBLE
from matrix_report_v9 import write_json

def dialogue(browser, url, region):
    def observe(name, source):
        body = original_patch(name,source)
        if name.startswith('script-v2'):
            return old.legacy.once(body,BUBBLE,BUBBLE+AFTER_BUBBLE)
        return body
    with patch.object(old,'patch',observe), old.native_page(browser,url,region,4,390,'v9',True) as (page,_,meta):
        page.evaluate("""() => {
            window.speechResults=[]; window.speechSocial=0;
            document.querySelector('#castStage').addEventListener('naotocchi:home-reaction',e=>{
                if(e.detail.type==='social')speechSocial++;
            });
            HomeMobilityDiagnostics.enable();HomeCastTrial.apply({paused:false});touchQA.paint();
        }""")
        for _ in range(30):
            page.evaluate('touchQA.advance(10,true)')
            page.wait_for_timeout(250)
            if page.evaluate('speechResults.length'):
                page.wait_for_timeout(3200)
                break
        return page.evaluate('({social:speechSocial, beats:speechResults, modelSeconds:HomeMobilityDiagnostics.read().modelSeconds})') | {'nativeHashes':meta['hashes']}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',required=True)
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--regions',nargs='+',default=old.REGIONS,choices=old.REGIONS)
    args=p.parse_args()
    old.require(urlparse(args.url).hostname in ('127.0.0.1','localhost'),'expected private local origin')
    with old.sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--disable-dev-shm-usage'])
        try:
            result={}
            for region in args.regions:
                result[region]=dialogue(b,args.url.rstrip('/'),region)
                write_json(args.out,{'engine':b.version,'count':4,'width':390,'regions':result})
                print(region,len(result[region]['beats']),flush=True)
        finally:
            b.close()
