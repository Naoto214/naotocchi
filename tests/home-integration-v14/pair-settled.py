"""Observe two native lifecycle/resize outliers on two static runtime roots, with the normal input trace."""
import argparse
import json
import os
from pathlib import Path
from unittest.mock import patch

import regional
from playwright.sync_api import sync_playwright

PROBE = """
regional.frameSample = function() {
  const rect=stage.closest('.screen-frame').getBoundingClientRect(), stageRect=displayRect(stage);
  const v=env.NaotocchiHomeViewport.residentPresentation();
  const feet={};
  for(const a of model.snapshot()) {
    const shadow=rows.get(a.key)?.shadow, painted=shadow?.getBoundingClientRect();
    feet[a.key]={stage:[a.x,a.y],screen:v?[v.x+(stageRect.left+a.x-v.x)*v.scaleX,
      v.y+(stageRect.top+a.y-v.y)*v.scaleY]:null,
      shadow:painted?[painted.x,painted.y,painted.width,painted.height]:null};
  }
  return {time:performance.now(),clock:model.metrics().clock,viewport:[innerWidth,innerHeight],
    frame:[rect.x,rect.y,rect.width,rect.height],pending:pendingResidentPresentation,
    camera:v?[v.x,v.y,v.scaleX,v.scaleY]:null,feet};
};
regional.followFrames=async function(){
  const frames=[];
  for(let i=0;i<=32;i++){
    if(i)await new Promise(requestAnimationFrame);
    frames.push(regional.frameSample());
  }
  return frames;
};
"""
original_read = Path.read_text


def instrument(path, *args, **kwargs):
    source = original_read(path, *args, **kwargs)
    if path == regional.HERE/'pair-probe.js':
        return source + PROBE
    if path == regional.HERE/'regional-game.js':
        source = regional.once(source, 'if(companion)state.companions.push(companion);',
            "window.mutation={removed:companion?.id||null,afterRemove:regional.frameSample()};"
            "if(companion)state.companions.push(companion);")
        return regional.once(source, 'saveState();', 'saveState();window.mutation.afterRestore=regional.frameSample();')
    return source


def pack(runs):
    states = []
    indexes = {}

    def frame(sample):
        geometry = {k:v for k,v in sample.items() if k!='time'}
        key = json.dumps(geometry,sort_keys=True,separators=(',',':'))
        if key not in indexes:
            indexes[key] = len(states)
            states.append(geometry)
        return [sample['time'],indexes[key]]

    rows = []
    for run in runs:
        row = dict(run)
        row['walked'] = frame(run['walked'])
        row['mutation'] = {k:(frame(v) if isinstance(v,dict) else v)
                           for k,v in run['mutation'].items()}
        for phase in ('restored','resized'):
            row[phase] = [frame(sample) for sample in run[phase]]
        rows.append(row)
    return dict(frameReference=['performance.now()','states array index'],runs=rows,states=states)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before',type=Path)
    parser.add_argument('after',type=Path)
    parser.add_argument('out',type=Path)
    args=parser.parse_args()
    result=[]
    with sync_playwright() as pw, patch.object(Path,'read_text',instrument):
        browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),
                                   args=['--disable-dev-shm-usage'])
        for version,root in [('ca6059cd',args.before),('f6719c51',args.after)]:
            base=regional.serve(root)
            for region,count,width in [('forest',28,430),('home',1,390)]:
                for repeat in range(2):
                    row=dict(version=version,region=region,count=count,width=width,repeat=repeat)
                    def observe(page,phase):
                        if phase=='walked':
                            row[phase]=page.evaluate('regional.frameSample()')
                        else:
                            if phase=='restored':row['mutation']=page.evaluate('window.mutation')
                            row[phase]=page.evaluate('regional.followFrames()')
                    run=regional.run(browser,root,base,region,count,width,'candidate',30,
                                     pairs=True,phase_observer=observe)
                    row.update(errors=run['errors'],sources=run['sources'])
                    result.append(row)
                    args.out.write_text(json.dumps(pack(result),separators=(',',':'))+'\n')
                    print(version,region,repeat,flush=True)
        browser.close()


if __name__=='__main__':main()
