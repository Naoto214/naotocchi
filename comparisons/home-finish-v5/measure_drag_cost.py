"""Time the native release decision and its next animation frame at the same 28 seats."""
import argparse
import json
import os
from urllib.parse import urlencode
from pathlib import Path
from playwright.sync_api import sync_playwright
from verify_touch import HERE, hooks

TRIAL = """async ({index,kind}) => {
  HomeCastTrial.apply({paused:false});
  const plan=touchQA.prepare({index,kind,live:false,autonomy:false});
  touchQA.log=null;
  const model=touchQA.model;
  model.select(plan.key);
  await new Promise(requestAnimationFrame);
  const start=performance.now();
  const accepted=model.move(plan.key,plan.modelGoal,'drag',{pointerDrop:true});
  const decisionMs=performance.now()-start;
  await new Promise(requestAnimationFrame);
  return {key:plan.key,kind,accepted,decisionMs,nextFrameMs:performance.now()-start};
}"""


def sample(browser, base, version, region, repeat):
    context=browser.new_context(viewport={'width':390,'height':792},has_touch=True,is_mobile=True,device_scale_factor=2)
    try:
        hashes={}
        for pattern in ('*production-model*.js','*production-diorama*.js','*beauty.js'):
            context.route('**/'+pattern+'*',lambda route:hooks(route,hashes))
        page=context.new_page()
        params=dict(region=region,count=28,time='day',paused=1,ground='on' if version=='v5' else 'off',
                    policy='B',variant='B',layout='optimized',curve='linear',compareSplit=0)
        entry='finish' if version=='v5' else 'population'
        page.goto(base.rstrip('/')+'/game/'+entry+'.html?'+urlencode(params),wait_until='domcontentloaded',timeout=180000)
        page.wait_for_function('window.HomeCastTrial?.ready && !!window.touchQA?.model',timeout=180000)
        page.evaluate((HERE/'touch_probe.js').read_text())
        page.evaluate('touchQA.manual=true;touchQA.checkpoint()')
        cases=[(i,'historical') for i in range(28)] if region=='forest' else [(1,'diagonal'),(2,'occupied')]
        samples=[]
        for turn in range(repeat):
            for index,kind in (cases if turn%2==0 else reversed(cases)):
                samples.append(dict(turn=turn,**page.evaluate(TRIAL,dict(index=index,kind=kind))))
        return dict(version=version,region=region,viewport=[390,792],browser=browser.version,
                    nativeHashes=hashes,repeat=repeat,rows=samples)
    finally:
        context.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--v4',required=True)
    parser.add_argument('--v5',required=True)
    parser.add_argument('--repeat',type=int,default=2)
    parser.add_argument('--out',required=True,type=Path)
    args=parser.parse_args()
    reports=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'))
        for region,order in [('forest',['v4','v5']),('city',['v5','v4'])]:
            for version in order:
                reports.append(sample(browser,getattr(args,version),version,region,args.repeat))
                args.out.write_text(json.dumps(reports,separators=(',',':'))+'\n')
                print(region,version,flush=True)
        browser.close()
