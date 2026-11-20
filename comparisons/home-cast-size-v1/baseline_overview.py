"""Hit-test the production overview with actual touchscreen input on a spare fixture."""
import argparse
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright
import baseline_measure as bm


HIT = """() => {
 const button=document.querySelector('.diorama-view'),r=button.getBoundingClientRect(),round=v=>+v.toFixed(1);
 const point=(x,y)=>{const hit=document.elementFromPoint(x,y);return {x:round(x),y:round(y),hit:
    hit?.closest('#homeInformation,#homeEventSlot')?.id || hit?.id || hit?.tagName||'outside',
    button:hit===button||button.contains(hit)};};
 const xs=[r.x+2,r.x+r.width*.25,r.x+r.width*.5,r.x+r.width*.75,r.right-2];
 const ys=[r.y+2,r.y+r.height*.25,r.y+r.height*.5,r.y+r.height*.75,r.bottom-2];
 return {geom:[r.x,r.y,r.width,r.height].map(round),pressed:button.getAttribute('aria-pressed'),
 text:button.textContent,grid:ys.flatMap(y=>xs.map(x=>point(x,y)))};
}"""


def inspect(page,frame):
    readings=[]
    for seconds in [0,4,11]:
        if seconds: page.clock.fast_forward(seconds*1000)
        readings.append(frame.evaluate(HIT))
    offset = {'x':0,'y':0} if page.main_frame==frame else frame.frame_element().bounding_box()
    grid=readings[-1]['grid']
    tests=[]
    for p in [grid[12],grid[20],grid[-1],*([next(v for v in grid if v['button'])] if any(v['button'] for v in grid) else [])]:
        before=frame.evaluate(HIT)
        page.touchscreen.tap(offset['x']+p['x'],offset['y']+p['y'])
        page.clock.run_for(120)
        after=frame.evaluate(HIT)
        tests.append({'hit':p,'before':before['text'],'after':after['text']})
    return {'atSeconds':[0,4,15],'samples':readings,'touches':tests}


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--production',required=True)
    ap.add_argument('--trial',required=True)
    ap.add_argument('--fixture',required=True,type=Path)
    ap.add_argument('--checkout',required=True,type=Path)
    ap.add_argument('--width',type=int,default=390)
    ap.add_argument('--height',type=int,default=844)
    ap.add_argument('--out',required=True,type=Path)
    args=ap.parse_args()
    full={}
    viewport={'width':args.width,'height':args.height}
    with sync_playwright() as pw:
        b=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'))
        ctx=b.new_context(viewport=viewport,device_scale_factor=2,is_mobile=True,has_touch=True,reduced_motion='reduce')
        p=ctx.new_page();p.clock.install(time='2026-11-01T04:00:00Z')
        p.clock.pause_at('2026-11-01T04:00:05Z')
        p.route('https://**',lambda r:r.abort())
        roster=bm.roster_from_checkout(args.checkout)
        base=json.loads(args.fixture.read_text())
        base.update(regionId='river_lake', hunger=95,energy=95,happiness=95)
        base['lifetime'].update(weatherMode='sunny',timeMode='day',seasonMode='autumn',soundBgm=False,equippedItemId='ribbon')
        base['partner']=dict(next(p for p in roster['partners'] if p['id']=='forest_bear'),gender='male',
                             orientationId='bi',married=True,affection=80,bondCount=3)
        base['companions']=[dict(id=x['id'],bond=85) for x in roster['companions']['normal']+roster['companions']['rare']]
        p.add_init_script(script="const st="+json.dumps(base)+";st.savedAt=Date.now();localStorage.setItem('naotocchi-save-v1',JSON.stringify(st));localStorage.setItem('naotocchi-home-guide-v1','done')")
        p.goto(args.production,wait_until='networkidle')
        p.clock.run_for(2048)
        full['production']=inspect(p,p.main_frame)
        ctx.close()
        ctx=b.new_context(viewport=viewport,device_scale_factor=2,is_mobile=True,has_touch=True,reduced_motion='reduce')
        p=ctx.new_page();p.clock.install(time='2026-11-01T04:00:00Z');p.clock.pause_at('2026-11-01T04:00:05Z')
        p.route('https://**',lambda r:r.abort())
        p.goto(args.trial,wait_until='networkidle')
        p.clock.run_for(2048)
        f=p.frame_locator('iframe').locator('.diorama-view').element_handle().owner_frame()
        full['privateComparison']=inspect(p,f)
        b.close()
    args.out.write_text(json.dumps(full,indent=1,ensure_ascii=False)+'\n')


if __name__=='__main__':
    main()
