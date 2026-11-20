"""Observe the painted native destination ring and the browser's pointer lifecycle."""
import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright
from measure_input import HERE, V5, patch_source, once
from reaction_input import dispatch

STATE = """
  qa.reactionState=()=>{
    const a=model.snapshot().find(a=>a.key===qa.key), pos=marker.getBoundingClientRect();
    return {held:gesture?.key||null,waiting:typeof waitingDrop==='undefined'?null:waitingDrop?.key||null,
      ring:!marker.hidden&&getComputedStyle(marker).display!=='none'&&pos.width>0&&pos.height>0,
      marker:[parseFloat(marker.style.left)||0,parseFloat(marker.style.top)||0],
      key:a?.key,foot:[a?.x,a?.y],direction:a?.direction,activity:a?.activity,target:a?.target||null,
      route:a?.route||[],walk:rows.get(a?.key)?.owner.dataset.dioramaWalking==='true',
      issued:qa.log?.directRequests?.length||0,events:qa.log?.reactions||[],busy:blocked(),modelClock:model.metrics().clock};
  };
"""


def observe(browser, origin, arm):
    context=browser.new_context(viewport={'width':390,'height':792},has_touch=True,is_mobile=True,device_scale_factor=2)
    hashes={}
    def hook(route):
        response=route.fetch()
        name=Path(route.request.url.split('?')[0]).name
        source=response.text()
        hashes[name]=hashlib.sha256(source.encode()).hexdigest()
        source=patch_source(name,source)
        if 'production-diorama' in name:
            source=once(source,'function down(e){',STATE+'function down(e){')
        route.fulfill(response=response,body=source)
    for pattern in ('*production-model*.js*','*production-diorama*.js*','*route-navigation*.mjs*','*population-beauty.js*','script-v2*.js*','drag-trial-hooks.js*'):
        context.route('**/'+pattern,hook)
    page=context.new_page()
    try:
        url=origin+'/game/drag-'+arm+'.html?'+urlencode(dict(region='forest',count=28,time='day',paused=1,ground='on',variant='B',layout='optimized',curve='linear',compareSplit=0))
        page.goto(url,wait_until='domcontentloaded',timeout=90000)
        page.wait_for_function('window.HomeCastTrial?.ready&&window.touchQA?.model',timeout=70000)
        page.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(i=>i.decode()))")
        page.evaluate((V5/'touch_probe.js').read_text());page.evaluate((HERE/'input_probe.js').read_text())
        page.evaluate('touchQA.manual=true;touchQA.checkpoint();HomeCastTrial.apply({paused:false})')
        touch=context.new_cdp_session(page)
        def prepare():
            return page.evaluate("touchQA.prepare({index:3,kind:'historical'})")
        def send(plan):
            a,b=plan['start'],plan['goal']
            dispatch(touch,'touchStart',a)
            for f in (.35,.75,1):
                dispatch(touch,'touchMove',[x+(y-x)*f for x,y in zip(a,b)])
            dispatch(touch,'touchEnd')
        plan=prepare()
        # Run native model time and every live motion step. Suppress new idle
        # goals so the observed reaction belongs to this resident's command.
        page.evaluate('touchQA.gateClock=true')
        before=page.evaluate('touchQA.reactionState()')
        page.evaluate("""document.addEventListener('pointerup',()=>{const start=performance.now();
          window.ringFrames=[];function sample(){
            const s=touchQA.reactionState(),t=performance.now()-start;
            ringFrames.push([+t.toFixed(2),s.ring,s.walk,s.target,s.marker,s.foot,s.activity,s.direction]);
            if(t<950)requestAnimationFrame(sample);
          }sample();},{once:true})""")
        send(plan)
        page.wait_for_function('window.ringFrames?.at(-1)?.[0]>=950',timeout=15000)
        frames=page.evaluate('ringFrames')
        trace=page.evaluate('({moves:touchQA.log.directRequests,trust:touchQA.log.pointers.map(p=>[p[0],p[2]]),state:touchQA.reactionState()})')
        assert trace['moves'] and not trace['moves'][0]['accepted'],(arm,plan,trace)
        assert trace['state']['modelClock']>before['modelClock']+.2
        assert all(r[1] for r in trace['trust']) and all(r[2] is False and r[3] is None and r[5]==before['foot'] for r in frames)
        assert before['direction']==frames[0][7],(before,frames[0])
        if arm=='v6':
            assert frames[0][1] and any(250<=f[0]<480 and f[1] for f in frames) and not frames[-1][1],frames
            assert all(f[4]==frames[0][4] for f in frames if f[1])
        else:assert all(not f[1] for f in frames),frames
        out={'region':'forest','count':28,'viewport':[390,792],'actor':plan['key'],'start':plan['start'],'goal':plan['goal'],
             'preRelease':before,'frames':frames,'native':trace,'sha256':hashes}
        if arm=='v6':
            # A soft press has implicit touch capture on a sprite, while a mouse
            # is uncaptured until it drags. Release outside the stage with a mouse.
            plan=prepare()
            page.evaluate("document.querySelector('#castResponse').dataset.reaction='bounce'")
            a=plan['start'];page.mouse.move(*a);page.mouse.down()
            held=page.evaluate('touchQA.reactionState()')
            outside=page.evaluate("""(()=>{const stage=document.getElementById('castStage');
              for(let y=8;y<innerHeight;y+=17)for(let x=8;x<innerWidth;x+=17){
                const n=document.elementFromPoint(x,y);if(n&&!stage.contains(n))return [x,y];}})()""")
            assert outside and held['held']==plan['key'],(outside,held)
            page.mouse.move(*outside);page.mouse.up()
            after=page.evaluate('touchQA.reactionState()')
            assert not after['held'] and not after['waiting'] and not after['issued'],after
            out['mouseReleaseOutsideStage']={'point':outside,'heldAtPress':held['held'],'after':after}
            plan=prepare();page.evaluate("document.querySelector('#castResponse').dataset.reaction='bounce'")
            send(plan)
            queued=page.evaluate('touchQA.reactionState()')
            assert queued['waiting']==plan['key'] and queued['ring'] and queued['issued']==0,queued
            page.set_viewport_size({'width':375,'height':760})
            page.wait_for_function('!touchQA.reactionState().waiting',timeout=10000)
            page.evaluate("delete document.querySelector('#castResponse').dataset.reaction")
            page.wait_for_timeout(500)
            fitted=page.evaluate('touchQA.reactionState()')
            assert not fitted['waiting'] and fitted['issued']==0,fitted
            out['cameraRefit']={'queued':queued,'after':fitted,'newViewport':[375,760]}
        return out
    finally:context.close()


if __name__=='__main__':
    args=argparse.ArgumentParser()
    args.add_argument('--url',required=True);args.add_argument('--output',required=True,type=Path)
    value=args.parse_args()
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(executable_path='/usr/bin/chromium')
        result={'browser':browser.version,'arms':{arm:observe(browser,value.url.rstrip('/'),arm) for arm in ('v5','v6')}}
        browser.close()
    value.output.parent.mkdir(parents=True,exist_ok=True)
    value.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    for arm,d in result['arms'].items():
        visible=[f[0] for f in d['frames'] if f[1]]
        print(arm,d['actor'],len(d['frames']),'frames, ring last visible at',max(visible) if visible else None)
