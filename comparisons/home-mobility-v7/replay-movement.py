"""Replay the embedded native resident model in the actual selected scene."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

SCRIPT = """
    let audit=null;
    globalThis.replayMobility=(seconds,seed)=>{
      const original=random;
      let state=seed;
      random=()=>((state=Math.imul(state,16807)>>>0)/4294967296);
      const opening=actors.map(a=>[a.key,a.x,a.y,a.w,a.h]);
      audit=Object.fromEntries(actors.map(a=>[a.key,{requests:0,accepted:0,steps:0,distance:0,
        last:null,arrivals:0,blocked:0}]));
      try{
        for(let i=0;i<seconds*20;i++)step(.05,{autonomy:true});
        return {opening,clock,rows:audit};
      }finally{random=original;audit=null;}
    };
"""

def instrument(source):
    substitutions = {
        '    return {metrics:': SCRIPT+'    return {metrics:',
        'const a=actor(key);if(!a||paused||!Number.isFinite(p?.x+p?.y))return false;':
            "const a=actor(key);if(!a||paused||!Number.isFinite(p?.x+p?.y))return false;"
            "if(audit&&source==='ambient')audit[key].requests++;",
        '      a.pointerDrop=pointerDrop;':
            "      if(audit&&source==='ambient')audit[key].accepted++;a.pointerDrop=pointerDrop;",
        'if(!safe){a.target=null;':
            "if(!safe){if(audit)audit[a.key].blocked++;a.target=null;",
        'stats.distance+=Math.hypot(p.x-a.x,p.y-a.y);':
            "if(audit){const v=audit[a.key];v.steps++;v.distance+=Math.hypot(p.x-a.x,p.y-a.y);v.last=clock;}"
            "stats.distance+=Math.hypot(p.x-a.x,p.y-a.y);",
        "emit('arrive',a,a.source);":
            "if(audit)audit[a.key].arrivals++;emit('arrive',a,a.source);",
    }
    for before,after in substitutions.items():
        if source.count(before)!=1:
            raise ValueError('Unexpected native model anchor '+before[:75])
        source=source.replace(before,after)
    return source

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',required=True,help='Paused, same-opening native game iframe URL')
    p.add_argument('--model',type=Path,required=True,help='Uninstrumented V6 or V7 native model')
    p.add_argument('--out',type=Path,required=True)
    p.add_argument('--chromium',default='/usr/bin/chromium')
    p.add_argument('--seed',type=int,default=575)
    p.add_argument('--seconds',type=int,default=300)
    args=p.parse_args()
    split=urlsplit(args.url)
    if split.hostname not in ('127.0.0.1','localhost'):
        raise ValueError('Use the locally served owner-comparison build')
    raw=args.model.read_bytes()
    body=instrument(raw.decode())
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=args.chromium)
        page=browser.new_page(viewport={'width':390,'height':792},is_mobile=True,has_touch=True,device_scale_factor=2)
        page.route(re.compile(r'/home-production-model[^/?]*\.js(?:\?|$)'),
                   lambda route:route.fulfill(content_type='application/javascript',body=body))
        page.goto(args.url,wait_until='domcontentloaded')
        page.wait_for_function('window.HomeCastTrial?.ready&&window.replayMobility&&HomeCastTrial.inspect().length===28',timeout=120000)
        result=page.evaluate('([seconds,seed])=>replayMobility(seconds,seed)',[args.seconds,args.seed])
    result.update(seed=args.seed,seconds=args.seconds,model=hashlib.sha256(raw).hexdigest())
    args.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__':
    main()
