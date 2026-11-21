"""Observe early ambient restarts during the listener's explicitly assigned four-second social pause."""
import argparse
import os
from pathlib import Path
from urllib.parse import urlparse
from unittest.mock import patch

from matrix_worker_v9 import old, original_patch
from matrix_report_v9 import write_json

def instrument(name,source):
    body=original_patch(name,source)
    if 'production-model' not in name:
        return body
    commit="b.direction=-a.direction;activity(b,'together');defer(b,4);"
    body=old.legacy.once(body,commit,commit+"""
      if(qa.listenerAudit){
        const event={actor:a.key,listener:b.key,at:clock,until:b.nextAt,
          distance:Math.hypot(a.x-b.x,a.y-b.y),from:[a.x,a.y],to:[b.x,b.y]};
        qa.listenerAudit.pairs.push(event);qa.listenerAudit.active[b.key]=event;
      }
    """)
    call="      const result=executeMove(key,p,source,{pointerDrop},report);"
    return old.legacy.once(body,call,"      const listenerState=actor(key)?.activity;\n"+call+"""
      if(qa.listenerAudit&&result&&source==='ambient'&&listenerState==='together'){
        const latest=qa.listenerAudit.active[key];
        if(latest&&clock<latest.until-1e-7)qa.listenerAudit.interrupted.push({
          key,at:clock,assignedAt:latest.at,expectedUntil:latest.until,
          early:typeof earlyKey!=='undefined'&&earlyKey===key,
          continued:typeof continuing!=='undefined'&&continuing===key,
          assisted:typeof relief!=='undefined'&&!!relief?.ready
        });
      }
    """)

def sample(browser,url,arm,width):
    with patch.object(old,'patch',instrument), old.native_page(browser,url,'forest',28,width,arm,True) as (page,_,meta):
        page.evaluate("""touchQA.listenerAudit={pairs:[],interrupted:[],active:{}};
          HomeMobilityDiagnostics.enable();HomeCastTrial.apply({paused:false});touchQA.advance(300,true)""")
        result=page.evaluate("""({pairs:touchQA.listenerAudit.pairs,interrupted:touchQA.listenerAudit.interrupted,
          modelSeconds:HomeMobilityDiagnostics.read().modelSeconds})""")
        old.require(abs(result['modelSeconds']-300)<.001,'incomplete forest sample')
        return {**result,'openingSHA256':old.digest(old.canonical(meta['opening']).encode()),'modelSHA256':meta['hashes'][f'home-production-model-mobility-{arm}.js']}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',required=True)
    p.add_argument('--prior-url',required=True)
    p.add_argument('--out',type=Path,required=True)
    args=p.parse_args()
    for url in [args.url,args.prior_url]:
        old.require(urlparse(url).hostname in ('localhost','127.0.0.1'),'expected isolated natural household')
    with old.sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--disable-dev-shm-usage'])
        try:
            result={}
            for w in (390,320):
                arms={}
                for label,url,arm in [('v8',args.url,'v8'),('v9Before',args.prior_url,'v9'),('v9After',args.url,'v9')]:
                    arms[label]=sample(b,url.rstrip('/'),arm,w)
                    print(w,label,len(arms[label]['pairs']),len(arms[label]['interrupted']),flush=True)
                old.require(len({d['openingSHA256'] for d in arms.values()})==1,'mismatched opening feet')
                result[w]=arms
                write_json(args.out,{'browser':b.version,'region':'forest','count':28,'widths':result})
        finally:
            b.close()
if __name__=='__main__':
    main()
