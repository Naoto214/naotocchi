"""Witness awards enqueued and actually shown around the forest household's first photograph."""
import argparse
import hashlib
import json
import os
from pathlib import Path
from unittest.mock import patch

import regional
from playwright.sync_api import sync_playwright

READ=Path.read_text
PROBE="""
window.preservePhoto=true;
regional.measureOpening=async()=>{
  const slot=()=>({ms:performance.now(),text:document.querySelector('#storyFlashText')?.textContent});
  const start=slot();
  await new Promise(r=>setTimeout(r,9500));
  return {start,end:slot(),events:window.awardEvents||[],unlocked:regionGame.awards()};
};
"""


def instrument(path,*args,**kwargs):
    source=READ(path,*args,**kwargs)
    if path.name=='script.js':
        anchor='function showStoryEvent(event) {'
        return regional.once(source,anchor,anchor+"""
    if(event.achievement)(window.awardEvents||=[]).push({ms:performance.now(),id:event.achievement.id,
      phase:homeV11Presentation().running?'draw':'request'});""")
    if path==regional.HERE/'regional-game.js':
        return source+'\nregionGame.awards=()=>[...state.achievementsUnlocked];\n'
    return source


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('out',type=Path);p.add_argument('roots',nargs='+',type=Path)
    args=p.parse_args()
    fixture=regional.seed('forest',28)
    output={'fixture':hashlib.sha256(json.dumps(fixture,sort_keys=True).encode()).hexdigest(),'runs':{}}
    with sync_playwright() as pw,patch.object(Path,'read_text',instrument):
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        for root in args.roots:
            row=regional.run(browser,root,regional.serve(root),'forest',28,375,'candidate',0,pairs=True,opening_probe=PROBE)
            output['runs'][root.name]=row
            args.out.write_text(json.dumps(output,indent=2)+'\n')
            print(root.name,row['start'],row['events'],flush=True)
        browser.close()


if __name__=='__main__':main()
