"""Observe a naturally emitted terrain pair AND its native, visible two-speaker dialogue."""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlencode,urlparse

from matrix_worker_v8 import HERE, old

BUBBLE = 'setSpeechBubble(b.text, speaker, {listener:pair[first?1:0], holdMs:hold,unit:homeUIV11()});'
AFTER_BUBBLE = """
        if(unit.terrainPair){
          const n=el.speechBubble, text=el.speechText.textContent, rect=n.getBoundingClientRect();
          window.speechResults.push({unit:unit.id,index:i,model:HomeMobilityDiagnostics?.read().modelSeconds,
            actor:conversationSpeakerKey(speaker),listener:conversationSpeakerKey(pair[first?1:0]),
            intended:compactJapaneseText(b.text),text,visible:!n.classList.contains('hidden')&&rect.height>0&&rect.width>0});
        }
"""

def observe(browser,origin,region):
    ctx=browser.new_context(viewport={'width':390,'height':792},is_mobile=True,has_touch=True,device_scale_factor=2)
    hashes={}
    def attach(route):
        response=route.fetch()
        name=Path(urlparse(route.request.url).path).name
        src=response.text()
        hashes[name]=old.digest(src.encode())
        src=old.patch(name,src)
        if name.startswith('script-v2'):
            src=old.legacy.once(src,BUBBLE,BUBBLE+AFTER_BUBBLE)
        route.fulfill(response=response,body=src)
    try:
        for pattern in ('*production-model*.js*','*production-diorama*.js*','*route-navigation*.mjs*','*population-beauty.js*','script-v2*.js*','drag-trial-hooks.js*','beauty/fixture.js*'):
            ctx.route('**/'+pattern,attach)
        page=ctx.new_page()
        page.add_init_script("window.speechResults=[];window.speechSocial=0")
        params=dict(region=region,count=4,time='day',paused=1,ground='on',variant='B',policy='B',layout='optimized',curve='linear',paired=1,compareSplit=0,diagnostics=1)
        page.goto(origin+'/game/mobility-v8.html?'+urlencode(params),wait_until='domcontentloaded')
        page.wait_for_function('window.HomeCastTrial?.ready && window.touchQA?.model')
        page.evaluate((old.legacy.V5/'touch_probe.js').read_text());page.evaluate((old.V6/'input_probe.js').read_text())
        page.evaluate("""() => {
          touchQA.manual=true;touchQA.checkpoint();HomeMobilityDiagnostics.enable();
          document.getElementById('castStage').addEventListener('naotocchi:home-reaction',e=>{if(e.detail.type==='social')speechSocial++});
          HomeCastTrial.apply({paused:false});touchQA.paint();
        }""")
        # Natural approaches, timer gates and authored beats all continue. The
        # model can advance faster than wall time and native speech timers stay real.
        for _ in range(30):
            page.evaluate('touchQA.advance(10,true)')
            page.wait_for_timeout(250)
            if page.evaluate('speechResults.length>0'):
                page.wait_for_timeout(3200)
                break
        return page.evaluate("""() => ({region:new URLSearchParams(location.search).get('region'),
          social:speechSocial,visibleBeats:speechResults,modelSeconds:HomeMobilityDiagnostics.read().modelSeconds,
          gate:HomeMobilityDiagnostics.read().currentGateReasons})""")|dict(sources=hashes)
    finally:
        ctx.close()

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--url',required=True);p.add_argument('--out',type=Path,required=True)
    p.add_argument('--regions',nargs='+',choices=old.REGIONS,default=old.REGIONS)
    args=p.parse_args();old.require(urlparse(args.url).hostname in ('127.0.0.1','localhost'),'expected local private origin')
    with old.sync_playwright() as play:
        browser=play.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--disable-dev-shm-usage'])
        observations={}
        source=None
        try:
            for region in args.regions:
                observations[region]=observe(browser,args.url.rstrip('/'),region)
                native=observations[region].pop('sources')
                if source is None: source=native
                old.require(source==native,'native modules changed during the regional dialogue check')
                args.out.write_text(json.dumps(dict(engine=browser.version,count=4,width=390,observations=observations,sources=source),ensure_ascii=False,indent=2)+'\n')
                print(region,observations[region]['social'],len(observations[region]['visibleBeats']),flush=True)
        finally:browser.close()

if __name__=='__main__':
    main()
