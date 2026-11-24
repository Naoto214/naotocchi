"""Exercise the final trial's real controls, resident population and painted backgrounds."""
import argparse
import hashlib
import json
import os
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

from playwright.sync_api import sync_playwright


# Mark only official paintings that have really been drawn on a canvas. When
# the game composites an offscreen canvas, carry its source to the destination.
OBSERVE_ART = """(() => {
    const art = new WeakMap(), draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function(source, ...args) {
        const v = draw.call(this, source, ...args);
        const url = source?.currentSrc || source?.src || '';
        const match = String(url).match(/comparisons\\/dayparts-[^?]+?\\/([a-z_]+-(?:day|morning|evening|night)\\.webp)/);
        const painting = match?.[1] || art.get(source);
        if (painting) art.set(this.canvas, painting);
        return v;
    };
    window.qaCanvasPainting = () => art.get(document.querySelector('.home-art-canvas')) || null;
})()"""

SIZES = {320:568,375:812,390:844,430:932}
REGIONS = ['river_lake','forest','city','home','countryside','mountain','snow','sea','jungle','desert','deepsea','star_stop','memory_lake']
TIMES = ['morning','day','evening','night']
COUNTS = [1,4,10,20,28]


def launch(pw, name):
    options = {'executable_path': os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),'args':['--no-sandbox']} if name == 'chromium' else {}
    return getattr(pw,name).launch(**options)


def new_context(browser,width,reduced=False):
    return browser.new_context(viewport={'width':width,'height':SIZES[width]},device_scale_factor=2,
         has_touch=True,is_mobile=True,reduced_motion='reduce' if reduced else 'no-preference')


def open_trial(page, origin, region, count, paused, mode='final'):
    page.goto(origin.rstrip('/')+'/?'+urlencode(dict(region=region,time='day',count=count,paused=int(paused),mode=mode)),
              wait_until='domcontentloaded',timeout=120000)
    page.wait_for_function("document.body.dataset.ready==='true'",polling=150,timeout=120000)
    frame=page.locator('#home').element_handle().content_frame()
    frame.wait_for_function("n=>window.HomeCastTrial?.inspect().length===n && HomeBeauty.paintRect?.width>0",arg=count,timeout=120000,polling=160)
    return frame


def write(path,result):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')


def validate(frame, region, time, count):
    try:
        frame.wait_for_function("key=>window.qaCanvasPainting()===key",arg=f'{region}-{time}.webp',timeout=55000,polling=160)
    except Exception:
        print('unmatched daypart',region,time,frame.evaluate("()=>({paint:qaCanvasPainting(),requested:HomeBeauty.settings.time,activity:document.querySelector('#castStage').dataset.worldRenderer})"),flush=True)
        raise
    actual=frame.evaluate("""()=>{const rows=HomeCastTrial.inspect(), stage=document.querySelector('#castStage'), c=document.querySelector('.home-art-canvas');
        const accessory=document.querySelector('#petAccessory'), rings=[...document.querySelectorAll('.partner-ring')];
        const ctx=c.getContext('2d'), mid=ctx.getImageData(c.width>>1,c.height>>1,1,1).data;
        return {paint:qaCanvasPainting(),time:HomeBeauty.settings.time,region:HomeBeauty.settings.region,
          overview:document.querySelectorAll('.diorama-view').length,
          labels:[...document.querySelectorAll('button')].filter(b=>['みんなを見る','いつもの表示'].includes(b.textContent.trim())).length,
          model:rows.length,roles:[rows.filter(a=>a.kind==='pet').length,rows.filter(a=>a.kind==='partner').length,rows.filter(a=>a.kind==='companion').length],
          shadows:stage.querySelectorAll('.diorama-shadow').length,
          spriteImgs:[...stage.querySelectorAll('[data-diorama-actor] img.character-asset')].filter(n=>n.complete&&n.naturalWidth>0).length,
          ribbon:accessory?.getBoundingClientRect()?.width>0,rings:rings.filter(n=>n.getBoundingClientRect().width>0).length,
          alphaAtCentre:mid[3], environment:HomeBeauty.settings.variant, regionPaint:stage.dataset.worldRenderer};
    }""")
    assert actual['region']==region and actual['time']==time and actual['paint']==region+'-'+time+'.webp',actual
    assert actual['model']==actual['shadows']==actual['spriteImgs']==count and actual['overview']==actual['labels']==0,actual
    assert actual['roles']==[1,int(count>1),max(0,count-2)] and actual['ribbon'] and actual['rings']==int(count>1),actual
    assert actual['alphaAtCentre']>0 and actual['environment']=='B' and actual['regionPaint']=='art-25d',actual
    return {k:actual[k] for k in ['paint','model','roles','shadows','rings','spriteImgs','ribbon','alphaAtCentre']}


def scene_sweep(args):
    with sync_playwright() as pw:
        browser=launch(pw,args.engine)
        result=json.loads(args.out.read_text()) if args.resume and args.out.is_file() else {'engine':args.engine,'version':browser.version,'reducedMotion':True,'scenes':[]}
        assert result['engine']==args.engine
        layout=urlopen(args.url.rstrip('/')+'/game/seating.js',timeout=20).read()
        layout_hash=hashlib.sha256(layout).hexdigest()
        assert result.get('layoutSha256',layout_hash)==layout_hash
        result['layoutSha256']=layout_hash
        for i,region in enumerate(args.regions):
            if any(s['region']==region for s in result['scenes']): continue
            width=list(SIZES)[i%4]
            count=COUNTS[i%5]
            if args.full_count: count=28
            context=new_context(browser,width,reduced=True)
            try:
                context.add_init_script(OBSERVE_ART)
                page=context.new_page()
                errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                print('opening',region,width,count,flush=True)
                frame=open_trial(page,args.url,region,count,True)
                if page.locator('#settings-toggle').is_visible():
                    page.locator('#settings-toggle').click()
                assert page.locator('#time option').count()==4 and page.locator('#region option').count()==13
                row={'region':region,'width':width,'height':SIZES[width],'count':count,'times':{}}
                for time in TIMES:
                    page.locator('#time').select_option(time)
                    row['times'][time]=validate(frame,region,time,count)
                    print('painted',region,time,flush=True)
                assert not errors,errors
                row['pageErrors']=errors
                result['scenes'].append(row)
                write(args.out,result)
                print(region,width,count,len(row['times']),flush=True)
            finally:
                context.close()
        browser.close()


if __name__=='__main__':
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('url')
    cli.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
    cli.add_argument('--regions',nargs='+',default=REGIONS,choices=REGIONS)
    cli.add_argument('--full-count',action='store_true')
    cli.add_argument('--resume',action='store_true')
    cli.add_argument('--out',required=True,type=Path)
    scene_sweep(cli.parse_args())
