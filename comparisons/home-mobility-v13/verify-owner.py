"""Exercise the private controls, loaded paintings, resident count and matched opening feet."""
import argparse,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--base',required=True);p.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
p.add_argument('--width',type=int,required=True);p.add_argument('--out',type=Path,required=True)
args=p.parse_args()
with sync_playwright() as pw:
    engine=getattr(pw,args.engine)
    b=engine.launch(**({'executable_path':'/usr/bin/chromium','args':['--no-sandbox','--disable-dev-shm-usage']} if args.engine=='chromium' else {'executable_path':os.getenv('WEBKIT_PATH')}))
    page=b.new_page(viewport={'width':args.width,'height':792},is_mobile=True,has_touch=True)
    errors=[]
    page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto(args.base+'/v13/?arm=a&region=forest&count=28&time=day&paused=1',wait_until='domcontentloaded',timeout=90000)
    ready_timeout=300000 if args.engine=='webkit' else 120000
    native_prefix={'v11':'v11-compare-v11-foot','v12':'v12-compare-v12'}
    states={}
    for arm in ['a','b','c','d','d-curve','v11','v12']:
        print(args.engine,args.width,arm,flush=True)
        page.select_option('#version',arm)
        page.wait_for_function("document.body.dataset.ready==='true' && document.querySelector('#home').contentWindow.HomeDragTrial?.opening()?.actors.length===28",timeout=ready_timeout)
        snapshot=page.evaluate("""() => {
          const win=document.querySelector('#home').contentWindow, first=win.HomeDragTrial.opening();
          return {region:first.region,time:first.time,width:win.innerWidth,bodyWidth:document.body.scrollWidth,
            path:win.location.pathname, picture:win.document.querySelector('.home-art-canvas').dataset.mobilityPainting.split('/').pop(),
            feet:first.actors.map(a=>a.slice(0,4))};
        }""")
        assert snapshot['region']=='forest' and snapshot['time']=='day' and snapshot['bodyWidth']<=args.width and snapshot['picture'].startswith('forest-day.webp'),{k:v for k,v in snapshot.items() if k!='feet'}
        assert len(set(tuple(v) for v in snapshot['feet']))==28
        expected_path='/game/mobility-'+native_prefix.get(arm,'v13-owner-'+arm)+'.html'
        assert snapshot['path']==expected_path,(snapshot['path'],expected_path)
        states[arm]=snapshot
    assert states['a']['feet']==states['b']['feet']==states['c']['feet']
    assert states['d']['feet']==states['d-curve']['feet']
    page.locator('#settings-toggle').tap()
    page.select_option('#region','mountain');page.select_option('#count','4');page.select_option('#time','night')
    page.locator('#settings-close').tap()
    page.wait_for_function("document.body.dataset.ready==='true' && document.querySelector('#home').contentWindow.HomeDragTrial?.opening()?.actors.length===4",timeout=ready_timeout)
    night=page.evaluate("""() => {
      const w=document.querySelector('#home').contentWindow,o=w.HomeDragTrial.opening();
      return {region:o.region,time:o.time,count:o.actors.length,
        picture:w.document.querySelector('.home-art-canvas').dataset.mobilityPainting.split('/').pop()};
    }""")
    assert night=={'region':'mountain','time':'night','count':4,'picture':'mountain-night.webp'},night
    page.locator('#freeze').tap()
    page.wait_for_function("document.querySelector('#freeze').getAttribute('aria-pressed')==='false'")
    assert not errors,errors
    report={'browser':args.engine,'width':args.width,'matchedABCFootprints':True,'matchedDAndCurveFootprints':True,'mountainNightResidents':4,'resumed':True,'errors':errors,'arms':states}
    report['mountainNight']=night
    args.out.write_text(json.dumps(report,ensure_ascii=False,separators=(',',':'))+'\n')
    print(args.engine,args.width,'7 arms, matched feet, 4 mountain residents, pause and resume')
    b.close()
