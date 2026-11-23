"""Record the roster and camera around a visible native story notification."""
import argparse
import json
import os
from pathlib import Path

import regional
from playwright.sync_api import sync_playwright

PROBE = """
regional.measureOpening=async function(){
  const shown=()=>!document.querySelector('#storyFlash').classList.contains('hidden') &&
    document.querySelector('#storyFlashText').textContent.includes('おしらせ');
  const wait=async predicate=>{
    const until=performance.now()+20000;
    while(!predicate()){
      if(performance.now()>until)throw Error('Notification phase timed out');
      await new Promise(requestAnimationFrame);
    }
  };
  const before=await regional.stableOpening();
  regionGame.notice();
  await wait(shown);
  const during=await regional.stableOpening();
  const box=document.querySelector('#storyFlash').getBoundingClientRect();
  const visible=shown()&&box.width>0&&box.height>0;
  await wait(()=>!shown());
  const after=await regional.stableOpening();
  return {visible,before,during,after};
};
"""


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('out',type=Path)
    p.add_argument('roots',type=Path,nargs='+')
    args=p.parse_args()
    result={}
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        for root in args.roots:
            data=regional.run(browser,root,regional.serve(root),'forest',4,375,'candidate',30,
                              pairs=True,opening_probe=PROBE)
            assert data['visible']
            result[root.name]=data
            args.out.write_text(json.dumps(result,separators=(',',':')))
            print(root.name,[len(data[k]['feet']) for k in ('before','during','after')],flush=True)
        browser.close()


if __name__=='__main__':main()
