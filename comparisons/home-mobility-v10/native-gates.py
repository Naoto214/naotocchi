"""Time ordinary WPE play and sample the game's own foreground reason reader only at gate transitions."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright
from performance_common import ARMS,HERE,WPE,clock,digest,distribution,intervals_summary,native_page,save

class GateBrowser:
    """Attach the read-only observer before native scripts boot on this measurement page."""
    def __init__(self,browser):
        self.browser=browser
        self.source={}

    def new_page(self,**settings):
        page=self.browser.new_page(**settings)
        def observe(route):
            response=route.fetch()
            source=response.text()
            self.source[Path(route.request.url.split('?')[0]).name]=digest(source)
            modified=clock.replace(source,'bindGates(fn){gateReader=fn;}',
                'bindGates(fn){gateReader=fn;window.mobilityPerf.nativeGateReasons=fn;}')
            route.fulfill(response=response,body=modified)
        page.route('**/telemetry*.js*',observe)
        return page

def run(args):
    window=(HERE.parent/'home-mobility-v7/performance-window.js').read_text()
    window=clock.replace(window,'let pause=false,pausedMs=0;',"let pause=false,pausedMs=0,nextGateSample=-1;const gateHistory=[];")
    anchor="const blocked=stage.dataset.dioramaPaused==='true';"
    window=clock.replace(window,anchor,anchor+'''if(blocked!==pause||blocked&&t>=nextGateSample){
      gateHistory.push({wallMs:t-start,clock:model.metrics().clock,blocked,reasons:q.nativeGateReasons(),
        visibility:document.visibilityState,trialPaused:HomeCastTrial.settings.paused,
        groupReaction:document.getElementById('castResponse')?.dataset.reaction||null});
      nextGateSample=t+5000;
    }''')
    window=clock.replace(window,'events,pausedMs,pauses:held,','events,pausedMs,pauses:held,gateHistory,')
    rows=[]
    with sync_playwright() as pw:
        browser=pw.webkit.launch(executable_path=WPE)
        for arm in args.order.split(','):
            observe=GateBrowser(browser)
            page,errors,assets=native_page(observe,args.base,arm,traced=args.trace)
            assert page.evaluate('typeof mobilityPerf.nativeGateReasons===\'function\'&&!HomeMobilityDiagnostics.enabled')
            sampler=clock.Scheduler(.1)
            try:
                page.evaluate('HomeCastTrial.apply({paused:false});0');page.wait_for_timeout(args.warmup*1000)
                page.expose_function('markSampling',sampler.begin)
                sample=page.evaluate(window,dict(seconds=args.seconds,trace=args.trace,osClock=True,seed=214))
                sampler.end()
                assert not errors and sample['retained'] and sample['visibleAtOpen']==sample['visibleAtEnd']==28
                assert not sample['diagnostics']['enabled'] and sampler.rows
                raw=dict(arm=arm,sample=sample,os=sampler.rows,assets={**assets,**observe.source})
                events=intervals_summary.summary(raw)
                rows.append(dict(**raw,distribution=distribution(sample['intervals']),longest=max(events['gaps'],key=lambda g:g['duration'])))
                save(args.out,dict(browser=browser.version,seconds=args.seconds,warmupSeconds=args.warmup,trace=args.trace,rows=rows))
            finally:
                sampler.end();page.close()
        browser.close()
    assert len({str(row['sample']['opening']) for row in rows})==1,'Different starting feet in comparison'

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--base',default='http://127.0.0.1:8377/game');p.add_argument('--order',default=','.join(ARMS))
    p.add_argument('--seconds',type=float,default=180);p.add_argument('--warmup',type=float,default=8)
    p.add_argument('--trace',action='store_true');p.add_argument('--out',required=True,type=Path)
    run(p.parse_args())
