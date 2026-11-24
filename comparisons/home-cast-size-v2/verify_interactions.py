"""Exercise normal physical inputs and social events in the final owner-only trial."""
import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import sys
import time
from urllib.request import urlopen

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

from verify_interaction_scenes import launch, new_context, open_trial, SIZES, write

# Reuse the previous trial's alpha-aware test-point selection, and the small QA
# counter in the native collision branch. Neither is served by the trial.
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'home-cast-size-v1'))
from verify_geometry_interactions import FIND, watch_model

MATRIX = [(320,'forest'),(375,'city'),(390,'river_lake'),(430,'home')]
SAVE_KEYS = ('naotocchi-save-v1','naotocchi-save-v1-backup','naotocchi-beauty-v7-fixture')
RECORDER = """() => {
    const stage=document.getElementById('castStage'), speech=document.getElementById('speechBubble');
    window.qaEvents=[]; window.qaLines=[];
    stage.addEventListener('naotocchi:home-reaction',event=>{
      const e=event.detail;
      qaEvents.push({type:e.type,source:e.source,key:e.actor?.key,time:performance.now()});
    });
    const record=()=>{if (speech.offsetHeight && getComputedStyle(speech).visibility!=='hidden') {
      const text=speech.innerText.trim().slice(0,140);
      if (text&&!qaLines.includes(text)) qaLines.push(text);
    }};
    new MutationObserver(record).observe(speech,{attributes:true,childList:true,subtree:true,characterData:true});
    record();
}"""
GET_POSE = "()=>HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y,a.w,a.h]).sort()"
CHECK_ATTACHMENTS = """() => {
  const stage=document.querySelector('#castStage');
  const hero=stage.querySelector('[data-diorama-actor="pet:dog"]');
  const ribbon=document.querySelector('#petAccessory');
  const ring=stage.querySelector('.partner-ring');
  const shadows=[...stage.querySelectorAll('.diorama-shadow')].map(shadow=>
    [parseFloat(shadow.style.left),parseFloat(shadow.style.top)]);
  const error=HomeCastTrial.inspect().map(a=>Math.min(...shadows.map(([x,y])=>Math.hypot(a.x-x,a.y-y))));
  return {ribbonTranslate:hero.style.translate===ribbon.style.translate,
    ribbonScale:hero.style.scale===ribbon.style.scale,
    ringActor:ring.closest('[data-diorama-actor]')?.dataset.dioramaActor,
    maximumShadowOriginDelta:Math.round(Math.max(...error)*1000)/1000};
}"""


def poses_match(a,b):
    return len(a)==len(b) and all(row[0]==ref[0] and max(abs(x-y) for x,y in zip(row[1:],ref[1:]))<.02 for row,ref in zip(a,b))


def select_actor(page,frame,box,key):
    attempted=[]
    for _ in range(3):
        pos=frame.evaluate(FIND,key)
        if pos is None: continue
        start=frame.evaluate('qaEvents.length')
        page.touchscreen.tap(pos[0]+box['x'],pos[1]+box['y'])
        state=frame.evaluate("""start=>({selected:HomeCastTrial.inspect().find(a=>a.selected)?.key,
                    events:qaEvents.slice(start).filter(e=>e.type==='tap').map(e=>e.key)})""",start)
        attempted.append(state)
        if state['selected']==key and key in state['events']: break
    return dict(requested=key,attempts=attempted,selected=bool(attempted and
                attempted[-1]['selected']==key and key in attempted[-1]['events']))


def drag_to_native_waypoint(page,frame,region,engine,ordinary_targets):
    # Choose a point that V5 has already accepted for the same walking actor.
    # Native input can still be rejected if another resident arrives first.
    trials=[]
    client=page.context.new_cdp_session(page) if engine=='chromium' else None
    for attempt in range(8):
        print('choosing a drag target',region,attempt+1,flush=True)
        if attempt==0:
            try:
                frame.wait_for_function("HomeCastTrial.inspect().some(a=>a.activity==='walk'&&a.target)",polling=125,timeout=4500)
            except PlaywrightTimeout:
                pass
        try:
            frame.wait_for_function("!HomeCastTrial.settings.paused && document.querySelector('#castStage').dataset.dioramaPaused!=='true'",polling=125,timeout=14000)
        except PlaywrightTimeout: break
        rows=frame.evaluate("""attempt=>{const p=NaotocchiHomeViewport.residentPresentation(),cast=HomeCastTrial.inspect();
            const paths=cast.filter(a=>a.target&&a.activity==='walk').map(a=>{
              const t=a.route?.at(-1) || a.target;
              return {key:a.key,waypoint:true,target:[a.foot.x+(t.x-a.x)*p.scaleX,a.foot.y+(t.y-a.y)*p.scaleY]};
            });
            // When everyone is resting, try an open-looking patch near the hero
            // with a normal physical drag; V5 still decides whether it is safe.
            const a=cast.find(v=>v.kind==='pet');
            const exit=window.qaHeroExit;
            if(exit) paths.unshift({key:a.key,waypoint:'reserved exit',
                target:[a.foot.x+(exit.x-a.x)*p.scaleX,a.foot.y+(exit.y-a.y)*p.scaleY]});
            const choices=Array.from({length:8},(_,i)=>{
              const angle=i*Math.PI/4,x=a.foot.x+28*Math.cos(angle),y=a.foot.y+28*Math.sin(angle);
              const margin=Math.min(x,y,innerWidth-x,innerHeight-y);
              const clear=Math.min(...cast.filter(other=>other!==a).map(other=>Math.hypot(other.foot.x-x,other.foot.y-y)));
              return {key:a.key,target:[x,y],waypoint:false,score:Math.min(margin,clear)};
            }).sort((first,second)=>second.score-first.score);
            return paths.concat(choices[attempt%choices.length]);
          }""",attempt)
        stage=page.evaluate("document.getElementById('home').getBoundingClientRect().toJSON()")
        candidates=[]
        for a in rows:
            if ordinary_targets and a['waypoint']=='reserved exit':
                continue
            point=frame.evaluate(FIND,a['key'])
            if not point: continue
            tx,ty=a['target']
            min_travel=15 if ordinary_targets else 3
            if 0 <= tx < stage['width'] and 0 <= ty < stage['height'] and math.dist(point,a['target'])>=min_travel:
                candidates.append((a,point))
        if not candidates:
            page.wait_for_timeout(150)
            continue
        a,(x,y)=candidates[attempt%len(candidates)]
        tx,ty=a['target']
        x+=stage['x'];tx+=stage['x'];y+=stage['y'];ty+=stage['y']
        start=frame.evaluate('qaEvents.length')
        print('dragging',region,a['key'],flush=True)
        if client:
            client.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y,'id':1}]})
            for step in range(1,5):
                client.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+(tx-x)*step/4,'y':y+(ty-y)*step/4,'id':1}]})
        else:
            page.mouse.move(x,y);page.mouse.down();page.mouse.move(tx,ty,steps=4)
        marker=frame.locator('.diorama-target').is_visible()
        held=frame.evaluate("""()=>{const a=HomeCastTrial.inspect().find(a=>a.selected);
                    return a&&{key:a.key,x:a.x,y:a.y};}""")
        if client: client.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
        else: page.mouse.up()
        page.wait_for_timeout(700)
        after=frame.evaluate("id=>HomeCastTrial.inspect().find(a=>a.key===id)",a['key'])
        accepted=frame.evaluate("s=>qaEvents.slice(s).filter(e=>e.source==='drag'&&e.type==='move').map(e=>e.key)",start)
        same=held and held['key']==a['key']
        distance=round(math.hypot(after['x']-held['x'],after['y']-held['y']),2) if same else 0
        row=dict(actor=a['key'],heldActor=held and held['key'],target=(a['waypoint'] if isinstance(a['waypoint'],str)
                    else 'native waypoint' if a['waypoint'] else 'open ground'),
                 marker=marker,accepted=bool(same and a['key'] in accepted),distance=distance)
        row['inputDistanceCss']=round(math.hypot(tx-x,ty-y),2)
        row['nativeRequest']=frame.evaluate('window.qaDragRequest || null')
        row['sourceAfter']=after['source']
        trials.append(row)
        print('drag',region,row,flush=True)
        if row['accepted'] and row['distance']>0 and marker: break
    if client: client.detach()
    return trials


def storage(page,frame):
    sentinel='comparison QA sentinel'
    page.evaluate("""([keys,v])=>{for(const k of keys)localStorage.setItem(k,v);sessionStorage.setItem('cast-qa-tab',v)}""",[SAVE_KEYS,sentinel])
    assert frame.evaluate("ks=>ks.every(k=>localStorage.getItem(k)==null)",SAVE_KEYS)
    assert frame.evaluate("sessionStorage.getItem('cast-qa-tab')===null")
    book=frame.evaluate("""()=>{const k=Array.from({length:localStorage.length},(_,i)=>localStorage.key(i))
            .find(k=>k.includes('fixture')&&!k.includes(':'));const s=JSON.parse(localStorage.getItem(k));
            localStorage.setItem('cast-qa-disposable','written');
            return {fixtureKey:k,stage:s.stage,partner:s.partner?.id,companions:s.companions.map(a=>a.id),gear:s.lifetime.equippedItemId};}""")
    assert book['partner']=='forest_bear' and len(book['companions'])==26 and book['gear']=='ribbon',book
    page.reload(wait_until='domcontentloaded')
    page.wait_for_function("document.body.dataset.ready==='true'",polling=200,timeout=120000)
    frame=page.locator('#home').element_handle().content_frame()
    assert page.evaluate('([ks,v])=>ks.every(k=>localStorage.getItem(k)===v)&&sessionStorage.getItem("cast-qa-tab")===v',[SAVE_KEYS,sentinel])
    fresh=frame.evaluate("""key=>{const s=JSON.parse(localStorage.getItem(key));return {stage:s.stage,partner:s.partner.id,
            companions:s.companions.map(a=>a.id),gear:s.lifetime.equippedItemId,disposable:localStorage.getItem('cast-qa-disposable')};}""",book['fixtureKey'])
    assert fresh.pop('disposable') is None
    assert all(book[k]==v for k,v in fresh.items())
    return dict(realSaveSentinelsRetained=len(SAVE_KEYS),tabRetained=True,frameWriteAbsentAfterReload=True,
                restoredFixtureKeys=len(fresh['companions'])+2,originalRibbon=True)


def run(args):
    with sync_playwright() as pw:
        browser=launch(pw,args.engine)
        result=json.loads(args.out.read_text()) if args.resume and args.out.is_file() else {'engine':args.engine,'version':browser.version,'mobileEmulation':True,'dpr':2,'scenes':[]}
        assert result['engine']==args.engine
        original=urlopen(args.url.rstrip('/')+'/game/home-production-model.js',timeout=20).read()
        instrumented=watch_model(original.decode())
        # Observe the native exit already reserved while arranging the lead.
        # This only selects a destination for physical input in the QA browser.
        anchor='exit=options[0]?.points||[];'
        assert instrumented.count(anchor)==1
        instrumented=instrumented.replace(anchor,anchor+'window.qaHeroExit=exit.at(-1);')
        anchor="function move(key,p,source='tap'){"
        assert instrumented.count(anchor)==1
        instrumented=instrumented.replace(anchor,anchor+"""
          if(source==='drag')window.qaDragRequest={key,x:p.x,y:p.y,actorX:actor(key)?.x,actorY:actor(key)?.y};
        """)
        result['nativeModelSha256']=hashlib.sha256(original).hexdigest()
        layout=urlopen(args.url.rstrip('/')+'/game/seating.js',timeout=20).read()
        result['layoutSha256']=hashlib.sha256(layout).hexdigest()
        selected=[item for item in MATRIX if item[0] in args.widths]
        for i,(width,region) in enumerate(selected):
            if any(s['width']==width for s in result['scenes']): continue
            reduced=args.reduced
            context=new_context(browser,width,reduced)
            try:
                context.route('**/home-production-model.js*',lambda route:route.fulfill(content_type='application/javascript',body=instrumented))
                page=context.new_page(); errors=[]
                page.on('pageerror',lambda ex:errors.append(str(ex)))
                print('opening',args.engine,width,region,flush=True)
                frame=open_trial(page,args.url,region,28,True)
                print('ready',width,flush=True)
                assert frame.evaluate('HomeCastTrial.ready && HomeCastTrial.settings.paused && HomeBeauty.frozen')
                assert frame.locator('.diorama-view').count()==0
                overrides=frame.evaluate("['pet','partner','companion'].map(k=>HomeCastTrial.scale(k))")
                assert overrides==[1.2,1.2,1.05], overrides
                heroPercent=frame.evaluate('document.body.dataset.homeHeroPercent')
                assert heroPercent=='110'
                base=frame.evaluate(GET_POSE)
                page.wait_for_timeout(400)
                assert poses_match(base,frame.evaluate(GET_POSE)), 'pose changed after ready/frozen'
                gear=frame.evaluate("""()=>{const stage=document.querySelector('#castStage');return {
                    shadowCount:stage.querySelectorAll('.diorama-shadow').length,
                    ribbon:document.querySelector('#petAccessory')?.getBoundingClientRect().width,
                    ring:document.querySelector('.partner-ring')?.getBoundingClientRect().width,
                    decoded:[...stage.querySelectorAll('[data-diorama-actor] img.character-asset')].every(n=>n.complete&&n.naturalWidth>0)
                }}""")
                assert gear['shadowCount']==28 and gear['ribbon']>0 and gear['ring']>0 and gear['decoded'],gear
                frame.evaluate(RECORDER)
                page.locator('#freeze').click()
                frame.wait_for_function("!HomeCastTrial.settings.paused && !HomeBeauty.frozen && document.querySelector('#castStage').dataset.dioramaPaused!=='true'",polling=100,timeout=60000)
                print('native input active',width,flush=True)
                row=dict(region=region,width=width,height=SIZES[width],count=28,
                         readyWithStablePose=True,reducedMotion=reduced,factors=overrides,
                         originalHeroPercent=heroPercent,overviewButtons=0,gear=gear)
                bounds=page.evaluate("document.getElementById('home').getBoundingClientRect().toJSON()")
                row['taps']=[select_actor(page,frame,bounds,key) for key in ['partner:forest_bear','companion:shiba','pet:dog']]
                print('taps',width,[(r['requested'],r['selected']) for r in row['taps']],flush=True)
                if not reduced:
                    row['dragInput']='Chromium CDP touch' if args.engine=='chromium' else 'Linux WebKit mouse pointer'
                    row['dragTrials']=drag_to_native_waypoint(page,frame,region,args.engine,args.ordinary_targets)
                if not reduced:
                    watch=args.observe if i==0 else 2
                    print('listening',width,watch,flush=True)
                    page.wait_for_timeout(watch*1000)
                    latest=frame.evaluate("()=>({events:qaEvents,lines:qaLines,stops:window.qaStops||{},clock:HomeBeauty.clockSeconds})")
                    row['events']=dict(Counter(e['type']+'/'+str(e.get('source','unknown')) for e in latest['events']))
                    row['visibleDialogue']=latest['lines'];row['stops']=latest['stops'];row['environmentSeconds']=round(latest['clock'],2)
                    row['additionalIdleObservationSeconds']=watch
                row['attachmentsAfterInputs']=frame.evaluate(CHECK_ATTACHMENTS)
                attachment=row['attachmentsAfterInputs']
                assert attachment['ribbonTranslate'] and attachment['ribbonScale'] and attachment['ringActor']=='partner:forest_bear',attachment
                if i==0:
                    print('reopening save fixture',width,flush=True)
                    row['saveBoundaryOnReentry']=storage(page,frame)
                row['pageErrors']=errors
                assert not errors,errors
                result['scenes'].append(row);write(args.out,result)
                print('done',width,row.get('events',{}),flush=True)
            finally:
                context.close()
        browser.close()


if __name__=='__main__':
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('url')
    cli.add_argument('--engine',choices=['chromium','webkit'],default='chromium')
    cli.add_argument('--widths',type=int,nargs='+',choices=list(SIZES),default=list(SIZES))
    cli.add_argument('--observe',type=int,default=42)
    cli.add_argument('--reduced',action='store_true')
    cli.add_argument('--ordinary-targets',action='store_true',help='use walking routes and open-looking ground, excluding reserved short exits')
    cli.add_argument('--resume',action='store_true')
    cli.add_argument('--out',required=True,type=Path)
    run(cli.parse_args())
