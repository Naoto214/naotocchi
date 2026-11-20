"""Measure the untouched production home, with a disposable household in a fresh browser context."""
import argparse
import io
import json
import os
import subprocess
from pathlib import Path

from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright


SELECTOR = '#castStage [data-diorama-actor]'
PIN = '28628cf336a8ed92efe4e9e197ca03298b798a1e'
MAIN = '38b4e9d0c8ed4cacdfc1cc6c072a7a9e62e5c053'
VIEWPORT = dict(width=390, height=844)
READ_CAST = """() => {
  const v=NaotocchiHomeViewport.residentPresentation();
  const snap=el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(x=>+x.toFixed(3));};
  const rows=[...document.querySelectorAll('#castStage [data-diorama-actor]')].map(owner=>{
    const image=owner.querySelector('img.character-asset'), src=image.getAttribute('src');
    const size=snap(image), bounds=NaotocchiCastBounds[src].box,
          d=parseFloat(getComputedStyle(owner).scale)*v.scaleX/v.bodyScale;
    const w=size[2]*(bounds[2]-bounds[0])/128, h=size[3]*(bounds[3]-bounds[1])/128;
    return {key:owner.dataset.dioramaActor,src,nativeSize:parseFloat(owner.style.width),owner:snap(owner),
       sprite:size,depth:+d.toFixed(4),body:[w,h].map(x=>+x.toFixed(3)),y:Number(owner.style.zIndex),
       ring:owner.querySelector('.partner-ring')?snap(owner.querySelector('.partner-ring')):null};
  }).sort((a,b)=>['pet','partner','companion'].indexOf(a.key.split(':')[0])-['pet','partner','companion'].indexOf(b.key.split(':')[0]));
  const button=document.querySelector('.diorama-view');
  return {rolePercents:[document.body.dataset.homeHeroPercent,document.body.dataset.homePopulationProfile],
      stage:document.querySelector('#castStage').dataset.diorama,bodyScale:v.bodyScale,scaleX:v.scaleX,scaleY:v.scaleY,
      overview:{text:button.innerText,visible:button.getClientRects().length>0,pressed:button.getAttribute('aria-pressed')},
      gear:snap(document.querySelector('#petAccessory')), rows};
}"""


def roster_from_checkout(checkout):
    code = """const fs=require('node:fs'),vm=require('node:vm');
    const ctx={window:{}};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),ctx);
    const r=ctx.window.NAOTOCCHI_CHARACTER_WORLD_MASTER_V1;console.log(JSON.stringify(r));"""
    return json.loads(subprocess.check_output(['node', '-e', code, str(checkout/'character-world-master.v1.js')]))


def source_alpha(checkout, data):
    for row in data['rows']:
        with Image.open(checkout / row['src']) as img:
            a=img.convert('RGBA').getchannel('A')
            row['sourcePixels'] = list(img.size)
            row['sourceBounds'] = list(a.getbbox())
            row['inkCoveragePct'] = round((1-a.histogram()[0]/(img.width*img.height))*100, 2)


def capture(browser, args, base, roster, count, region, hero=110):
    context = browser.new_context(viewport=VIEWPORT, device_scale_factor=2, is_mobile=True,
                                  has_touch=True, reduced_motion='reduce')
    page=context.new_page()
    page.route('https://**',lambda route:route.abort())
    page.clock.install(time='2026-11-01T04:00:00Z')
    page.clock.pause_at('2026-11-01T04:00:05Z')
    seed=dict(base, regionId=region,hunger=95,energy=95,happiness=95)
    if count>1:
        seed['partner']=dict(next(p for p in roster['partners'] if p['id']=='forest_bear'),
                             gender='male',orientationId='bi',married=True,affection=80,bondCount=3)
    else:
        seed['partner']=None
    companions=roster['companions']['normal']+roster['companions']['rare']
    seed['companions']=[dict(id=a['id'],bond=85) for a in companions[:max(0,count-2)]]
    seed['lifetime']=dict(base['lifetime'],weatherMode='sunny',timeMode='day',seasonMode='autumn',
                           soundBgm=False,equippedItemId='ribbon')
    init="""let seed=214;Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
        const state="""+json.dumps(seed)+""";state.savedAt=Date.now();
        localStorage.setItem('naotocchi-save-v1',JSON.stringify(state));
        localStorage.setItem('naotocchi-home-guide-v1','done');"""
    page.add_init_script(script=init)
    if hero!=110:
        def change_attribute(route):
            response=route.fetch()
            html=response.text()
            assert html.count('data-home-hero-percent="110"')==1
            route.fulfill(response=response,body=html.replace('data-home-hero-percent="110"',f'data-home-hero-percent="{hero}"'))
        page.route('**/index.html', change_attribute)
    page.goto(args.url.rstrip('/')+'/index.html', wait_until='load')
    page.wait_for_load_state('networkidle')
    for _ in range(3):
        page.clock.run_for(16)
        page.wait_for_load_state('load')
    page.evaluate("""async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('#castStage img')].map(im=>im.decode().catch(()=>{})))}""")
    for _ in range(16):
        page.clock.run_for(100)
    assert page.locator(SELECTOR).count()==count
    d=page.evaluate(READ_CAST)
    assert d['stage']==region and d['bodyScale']>0
    if count==28 and region=='river_lake' and hero==110:
        source_alpha(args.checkout,d)
        d['isolatedRaster']=raster_bounds(page,[x['key'] for x in d['rows']])
        page.locator('.diorama-view').dispatch_event('click')
        for _ in range(7):
            page.clock.run_for(100)
        d['afterToggle']=page.evaluate(READ_CAST)
        page.locator('.diorama-view').dispatch_event('click')
        page.clock.run_for(250)
        d['afterReturn']=page.evaluate(READ_CAST)['overview']
    context.close()
    return d


def raster_bounds(page, keys):
    # Preserve native DOM, positions, visibility of ancestors, terrain masks and clipping.
    # A uniform magenta backdrop and one visible artwork give its on-screen raster bounds.
    ins=page.add_style_tag(content="""html,body{background:#ff00ff!important}html::before,html::after,body::before,body::after{content:none!important}
        body,body *{visibility:hidden!important}body .baseline-isolate,body .baseline-isolate *{visibility:visible!important}""")
    plate=page.screenshot()
    blank = Image.open(io.BytesIO(plate)).convert('RGBA')
    assert len(blank.getcolors(2) or [])==1, "isolated backdrop must be uniform"
    labels={key:f'[data-diorama-actor="{key}"] img.character-asset' for key in keys}
    labels['hero+item']='[data-diorama-actor^="pet:"] img.character-asset,#petAccessory img.item-asset'
    labels['partner+ring']='[data-diorama-actor^="partner:"] img.character-asset,.partner-ring .care-icon'
    out={}
    for key,sel in labels.items():
        assert page.locator(sel).count()>0
        page.locator(sel).evaluate_all("ns=>ns.forEach(n=>n.classList.add('baseline-isolate'))")
        with Image.open(io.BytesIO(page.screenshot())) as img:
            # Subtract the empty frame, preserving artwork masks and screen clipping.
            channels=ImageChops.difference(img.convert('RGBA'),blank).split()
            delta=ImageChops.lighter(ImageChops.lighter(channels[0],channels[1]),
                                     ImageChops.lighter(channels[2],channels[3]))
            box=delta.point(lambda v:255 if v>=16 else 0).getbbox()
            assert box and box[2]-box[0]<img.width/2 and box[3]-box[1]<img.height/2,key
            out[key]=[u/2 for u in box]
        page.locator('.baseline-isolate').evaluate_all("ns=>ns.forEach(n=>n.classList.remove('baseline-isolate'))")
    ins.evaluate('n=>n.remove()')
    return out


def run():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',required=True,help='HTTP root of the unchanged main checkout')
    p.add_argument('--checkout',required=True,type=Path,help='Root with production scripts and assets')
    p.add_argument('--fixture',type=Path,help='Optional #569 fixture.json, otherwise read it from git')
    p.add_argument('--out',required=True,type=Path)
    args=p.parse_args()
    roster=roster_from_checkout(args.checkout)
    base=json.loads(args.fixture.read_text() if args.fixture else subprocess.check_output([
        'git','show',PIN+':comparisons/home-beauty-v7/fixture.json']))
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'))
        out={'main':MAIN,'fixtureFrom':PIN,'browser':browser.version,'viewport':VIEWPORT,'dpr':2,
             'media':'reduce','baseTime':'2026-11-01T04:00:05Z','counts':{},'regions':{}}
        for count in [1,4,5,6,10,20,28]:
            out['counts'][count]=capture(browser,args,base,roster,count,'river_lake')
        for name in ['forest','city','home']:
            out['regions'][name]=capture(browser,args,base,roster,28,name)
        out['hero100Control']=capture(browser,args,base,roster,28,'river_lake',100)
        browser.close()
    args.out.write_text(json.dumps(out,ensure_ascii=False,indent=1)+'\n')


if __name__=='__main__':
    run()
