"""Replay transient resize or rebuild samples after browser viewport and native layout settle."""
import argparse
import json
import os
from pathlib import Path

import regional
from playwright.sync_api import sync_playwright

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('out',type=Path)
    p.add_argument('--roots',type=Path,nargs='+',required=True)
    p.add_argument('--cases',nargs='+',required=True)
    args=p.parse_args()
    evidence=json.loads(args.out.read_text()) if args.out.exists() else {}
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        for root in args.roots:
            url=regional.serve(root)
            for case in args.cases:
                key=root.name+'/'+case
                if key in evidence and 'error' not in evidence[key]:continue
                region,count,width=case.split('-');count=int(count);width=int(width)
                phases={}
                def observe(page,label):
                    if label not in ('restored','resized'):return
                    # Wait through the native resize handler and its follow-up CSS layout.
                    page.wait_for_timeout(800)
                    phase=page.evaluate("""async()=>{window.preservePhoto=true;
                      const p=await regional.stableOpening();return {viewport:[innerWidth,innerHeight],
                        camera:p.camera,frame:p.frame,cover:p.cover,paintedFrame:p.paintedFrame,
                        residents:p.feet.map(a=>({key:a.key,foot:a.actual,stage:a.stage,layer:a.layer,visible:a.visible}))};
                    }""")
                    expected=(375 if width==320 else 320) if label=='resized' else width
                    assert phase['viewport']==[expected,regional.HEIGHT[expected]],phase['viewport']
                    phases[label]=phase
                try:
                    regional.run(browser,root,url,region,count,width,'candidate',30,pairs=True,phase_observer=observe)
                    evidence[key]=phases
                except Exception as exc:evidence[key]={'error':repr(exc)}
                args.out.write_text(json.dumps(evidence,separators=(',',':'))+'\n')
                print(key,list(evidence[key]),flush=True)
        browser.close()

if __name__=='__main__':main()
