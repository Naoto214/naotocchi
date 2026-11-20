"""Recheck V2's observed two-resident speech protocol inside the live V3 game."""
import argparse
import json
from pathlib import Path
import sys
from urllib.parse import urlencode

sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'home-cast-size-v2'))
import verify_interaction_social as observer

def main(args):
    def v3_trial(page,origin,region,count,paused):
        query=urlencode(dict(region=region,count=count,extra=args.extra,layout=args.layout,paused=int(paused),time='day'))
        page.goto(origin.rstrip('/')+'/v3/?'+query,wait_until='domcontentloaded',timeout=150000)
        page.wait_for_function("document.body.dataset.ready==='true'",polling=150,timeout=150000)
        frame=page.locator('#home').element_handle().content_frame()
        assert frame.url.split('?')[0].endswith('/game/limit.html')
        assert frame.evaluate('HomeCastTrial.settings.extra')==args.extra
        return frame
    observer.open_trial=v3_trial
    observer.run(args)
    result=json.loads(args.out.read_text())
    result.update(extra=args.extra,layout=args.layout)
    args.out.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('url');p.add_argument('--out',type=Path,required=True);p.add_argument('--region',default='forest')
    p.add_argument('--count',type=int,default=4);p.add_argument('--extra',type=int,default=20)
    p.add_argument('--layout',default='optimized');p.add_argument('--observe',type=int,default=75)
    main(p.parse_args())
