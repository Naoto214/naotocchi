"""Listen for actual resident meetings and lines on the private final home."""
import argparse
import json
import time
from pathlib import Path

from playwright.sync_api import sync_playwright
from verify_interaction_scenes import launch, new_context, open_trial, write


def run(args):
    with sync_playwright() as pw:
        browser=launch(pw,'chromium')
        context=new_context(browser,390)
        page=context.new_page()
        frame=open_trial(page,args.url,args.region,args.count,True)
        frame.evaluate("""() => {
          const stage=document.querySelector('#castStage'),speech=document.querySelector('#speechBubble');
          const name=Object.fromEntries(HomeCastTrial.inspect().map(a=>[a.key,a.label]));
          const trace=window.qaMeetings={names:name,encounters:[],speech:[]};
          stage.addEventListener('naotocchi:home-reaction',({detail:e})=>{
            if(e.type==='social' && e.source==='ambient')trace.encounters.push({
                seconds:performance.now()/1000,actor:e.actor.key,listener:e.listener?.key});
          });
          new MutationObserver(()=>{
            const line=speech.innerText.trim();
            if(speech.offsetHeight && getComputedStyle(speech).visibility!=='hidden' &&
               line && trace.speech.at(-1)?.line!==line) trace.speech.push({seconds:performance.now()/1000,line});
          }).observe(speech,{subtree:true,childList:true,attributes:true,characterData:true});
        }""")
        page.locator('#freeze').click()
        deadline=time.monotonic()+args.observe
        while time.monotonic()<deadline:
            page.wait_for_timeout(1000)
            sample=frame.evaluate('qaMeetings')
            for e in sample['encounters']:
                names=[sample['names'][e[key]] for key in ('actor','listener')]
                if all(any(s['seconds']>=e['seconds']-.05 and s['seconds']<=e['seconds']+22 and
                      s['line'].split('\n')[0]==n for s in sample['speech']) for n in names):
                    sample['matchingPair']={'participants':names,'encounter':e}
                    break
            if 'matchingPair' in sample:break
        sample.update(region=args.region,count=args.count,engine=browser.version,maximumSeconds=args.observe,
                      observedSeconds=round(args.observe-(deadline-time.monotonic()),2))
        write(args.out,sample)
        print(json.dumps(sample,ensure_ascii=False),flush=True)
        browser.close()


if __name__=='__main__':
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('url')
    cli.add_argument('--region',default='forest')
    cli.add_argument('--count',type=int,default=4)
    cli.add_argument('--observe',type=int,default=95)
    cli.add_argument('--out',type=Path,required=True)
    run(cli.parse_args())
