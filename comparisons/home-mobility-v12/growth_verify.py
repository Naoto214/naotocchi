"""Use each private growth policy at four phone widths. Record exact old/new directions for each resident."""
import argparse, json
from pathlib import Path
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('url')
    p.add_argument('out',type=Path)
    p.add_argument('--widths',type=int,nargs='+',default=[390,320,375,430])
    p.add_argument('--policies',nargs='+',default=['legacy','keep','minimal','walk','helpers'])
    a=p.parse_args()
    rows=json.loads(a.out.read_text())['cases'] if a.out.exists() else []
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path='/usr/bin/chromium')
        for width in a.widths:
            for mode in a.policies:
                if any(x['width']==width and x['policy']==mode for x in rows):continue
                page=b.new_page(viewport=dict(width=width,height=792),device_scale_factor=2,is_mobile=True,has_touch=True)
                page.set_default_timeout(120000)
                errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                url=a.url+'/game/mobility-v12-growth.html?'+urlencode(dict(region='forest',count=28,paused=1,paired=1,variant='B',time='day',ground='on',clock=0,waitForPainting=1,growthPolicy=mode))
                page.goto(url,wait_until='domcontentloaded')
                page.wait_for_function('window.HomeCastTrial?.ready && window.HomeDragTrial?.opening() && !!window.HomeCareGrowthTrial')
                page.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()))")
                snap="HomeCastTrial.inspect().map(a=>[a.key,a.foot.x,a.foot.y])"
                opening=page.evaluate(snap)
                assert len(opening)==28 and page.evaluate('HomeCareGrowthTrial.grow()')
                page.wait_for_function('HomeCareGrowthTrial.read().steps.length===2 && HomeV12Growth.read().complete')
                page.wait_for_timeout(400)
                result=page.evaluate('HomeCareGrowthTrial.read()')
                extra=page.evaluate('HomeV12Growth.read()')
                rays=page.evaluate('HomeV12Growth.directions()')
                final=page.evaluate(snap)
                assert len(rays)==28 and result['stageBefore']<result['stageAfter'] and not errors,(width,mode,errors)
                assert not page.evaluate('HomeCareGrowthTrial.grow()')
                rows.append(dict(width=width,policy=mode,opening=opening,ending=final,result=result,extra=extra,rays=rays,errors=errors))
                a.out.write_text(json.dumps(dict(browser=b.version,cases=rows),ensure_ascii=False,separators=(',',':'))+'\n')
                print(width,mode,round(result['maxScreenCss'],3),[s['reason'] for s in result['steps']],sum(len(r['lost']) for r in rays.values()),extra['travel'],flush=True)
                page.close()
        b.close()
if __name__=='__main__':main()
