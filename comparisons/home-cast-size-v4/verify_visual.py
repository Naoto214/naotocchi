"""Capture the painted game at four sizes while keeping every native foot fixed."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
from urllib.parse import urlencode
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

POLICIES = [('current','現行'),('A','A　+10%'),('B','B　+15%'),('C','C　+20%')]
SCENES = [('river_lake','みずべ'),('forest','もり'),('home','おうち'),('city','とかい'),('sea','うみ')]
DEVICE_HEIGHTS = {320:568, 348:755, 360:780, 375:812, 390:844, 430:932}


def label(draw, xy, value, size):
    font = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', size, index=0)
    draw.text(xy, value, font=font, fill='#29483c')


def trace(page):
    return page.evaluate("""() => HomeCastTrial.inspect().map(a => {
      const el = document.querySelector('[data-diorama-actor="'+CSS.escape(a.key)+'"] img.character-asset');
      const box = el.getBoundingClientRect(), bounds = NaotocchiCastBounds[a.asset]?.box;
      const ink = bounds ? [box.x + box.width*bounds[0]/128, box.y + box.height*bounds[1]/128,
          box.x + box.width*bounds[2]/128, box.y + box.height*bounds[3]/128]
          : [box.left, box.top, box.right, box.bottom];
      return {key:a.key, kind:a.kind, foot:[a.x,a.y], ink};
    })""")


def capture(options):
    out=options.out
    out.mkdir(exist_ok=True,parents=True)
    width=options.width
    height=DEVICE_HEIGHTS[width]-52
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),
                                  args=['--no-sandbox'])
        records={}
        for region,name in SCENES:
            if region not in options.regions: continue
            context=browser.new_context(viewport={'width':width,'height':height}, device_scale_factor=2,
                                        is_mobile=True,has_touch=True)
            page=context.new_page()
            page.clock.set_fixed_time(datetime(2026,10,15,3,tzinfo=timezone.utc))
            args=dict(region=region,time='day',count=options.count,clock=0,variant='B',compareSplit=0,
                      curve='linear',layout='fixed',policy='current',paused=1)
            page.goto(options.url+'/game/population.html?'+urlencode(args),wait_until='commit',timeout=120000)
            page.wait_for_function("n => window.HomeCastTrial?.ready && HomeCastTrial.inspect().length === n",arg=options.count,timeout=150000)
            page.evaluate("Promise.all([...document.querySelectorAll('#castStage img')].map(i=>i.decode().catch(()=>{})))")
            page.evaluate("document.getAnimations().forEach(a=>{a.pause();a.currentTime=0});true")
            poses={};pictures={}
            for policy,_ in POLICIES:
                page.evaluate("p=>HomeCastTrial.apply({policy:p,paused:true})",policy)
                page.evaluate("new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))")
                snap=trace(page)
                assert len(snap)==options.count
                if poses:
                    assert [(a['key'],a['foot']) for a in snap]==[(a['key'],a['foot']) for a in poses['current']]
                poses[policy]=snap
                target=out/f'{region}-{width}-{options.count}-{policy}.png'
                page.screenshot(path=str(target),scale='device',animations='allow')
                with Image.open(target) as frame:pictures[policy]=frame.convert('RGB')
            # Same crop and original device pixels for every panel. Only the border and labels are added.
            top=max(0,int(min(actor['ink'][1] for pose in poses.values() for actor in pose))-12)
            bottom=min(height,int(max(actor['ink'][3] for pose in poses.values() for actor in pose))+23)
            scale=pictures['current'].width/width
            h=round((bottom-top)*scale); w=pictures['current'].width
            sheet=Image.new('RGB',(w*2+36,(h+50)*2+90),'#faf8f1')
            pen=ImageDraw.Draw(sheet);label(pen,(12,4),f'{name}　{options.count}体　昼　{width}px幅　固定配置',29)
            for i,(policy,title) in enumerate(POLICIES):
                x=12+(i%2)*(w+12);y=55+(i//2)*(h+50)
                label(pen,(x,y),title,25)
                sheet.paste(pictures[policy].crop((0,round(top*scale),w,round(bottom*scale))),(x,y+38))
            sheet.save(out/f'{region}-{width}-{options.count}.webp','WEBP',lossless=True,method=4)
            records[region]={'cast':options.count,'viewport':[width,height],'dpr':scale,'cropCss':[0,top,width,bottom],
                             'stableFootCount':len(poses['current']),'browser':browser.version}
            print(region,records[region],flush=True)
            context.close()
        browser.close()
    (out/'capture.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--out',type=Path,required=True);p.add_argument('--url',default='http://127.0.0.1:8304')
    p.add_argument('--count',type=int,default=28);p.add_argument('--width',type=int,default=390)
    p.add_argument('--regions',nargs='+',default=[r for r,_ in SCENES]);capture(p.parse_args())
