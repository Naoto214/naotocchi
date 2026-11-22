"""Exercise the normal V12 age-change hook, including stale and absent precalculation."""
import argparse,json
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('url');p.add_argument('out',type=Path);p.add_argument('--width',default=390,type=int)
    a=p.parse_args();rows=[]
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path='/usr/bin/chromium')
        context=b.new_context(viewport=dict(width=a.width,height=792),device_scale_factor=2,is_mobile=True,has_touch=True)
        for test in ['warm','cold','stale','warm-repeat']:
            pg=context.new_page();pg.set_default_timeout(120000);errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
            q=urlencode(dict(count=28,region='forest',time='day',paused=1,paired=1,ground='on',variant='B',clock=0,growthLive=1,waitForPainting=1))
            pg.goto(a.url+'/game/mobility-v12-life.html?'+q,wait_until='domcontentloaded')
            pg.wait_for_function('window.HomeCareGrowthTrial && window.HomeV12LifeGrowth && window.HomeCastTrial?.ready && HomeDragTrial.opening()')
            before=pg.evaluate('HomeCastTrial.inspect().map(a=>[a.key,a.foot.x,a.foot.y])')
            warm=False
            if test!='cold':warm=pg.evaluate('HomeV12LifeGrowth.preflight()')
            if test=='stale':
                pg.set_viewport_size({'width':375 if a.width!=375 else 390,'height':792});pg.wait_for_timeout(650)
            call=pg.evaluate('()=>{const t=performance.now();return {grew:HomeCareGrowthTrial.grow(),ms:performance.now()-t}}')
            pg.wait_for_timeout(1000)
            result=pg.evaluate('HomeCareGrowthTrial.read()');life=pg.evaluate('HomeV12LifeGrowth.read()')
            assert call['grew'] and result['stageAfter']>result['stageBefore'] and not errors
            if test in ['stale','cold']:assert not life['applied'],life
            rows.append(dict(case=test,width=a.width,preflight=warm,opening=before,result=result,life=life,call=call,errors=errors))
            a.out.write_text(json.dumps(dict(engine=b.version,cases=rows),separators=(',',':'))+'\n')
            print(test,warm,[(s.get('reason'),s.get('validateMs')) for s in life['steps']],result['maxScreenCss'],flush=True)
            pg.close()
        context.close();b.close()
if __name__=='__main__':main()
