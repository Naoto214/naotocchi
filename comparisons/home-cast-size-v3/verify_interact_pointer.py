"""Physical tap and drag tests on the ready V3 trial using the unchanged V5 controller."""
import argparse
import json
import math
import os
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

from verify_interact_routes import HEIGHT, HIT_ANCHOR, HIT_EXPOSE, ROOT, instrument, once, seed_signature
import sys
sys.path.insert(0,str(ROOT.parent/'home-cast-size-v2'))
from verify_short_drag import SAFE_POINTS

CASES={320:'forest',375:'city',390:'river_lake',430:'home'}
RECORDER="""()=>{window.qaAct=[];document.querySelector('#castStage').addEventListener('naotocchi:home-reaction',({detail:e})=>{
  qaAct.push([e.type,e.source,e.actor.key,e.listener?.key]);});
 window.qaPointers=[];
 for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture']){
    document.addEventListener(type,e=>qaPointers.push([type,e.pointerType,e.target.closest?.('[data-diorama-actor]')?.dataset.dioramaActor||e.target.id||e.target.nodeName,
      document.querySelector('#castStage').dataset.dioramaPaused==='true']),true);
 }
 window.qaWords=[];
 const b=document.querySelector('#speechBubble');
 new MutationObserver(()=>{const t=b.innerText.trim();if(t&&b.offsetHeight&&qaWords.at(-1)!==t)qaWords.push(t);})
 .observe(b,{attributes:true,subtree:true,childList:true,characterData:true});}"""
PROBE="""({key,assisted})=>{
 const a=HomeCastTrial.inspect().find(x=>x.key===key),p=NaotocchiHomeViewport.residentPresentation();
 let t={x:a.x+12/p.scaleX,y:a.y};
 if(assisted){const {options}=qaHeroPaths();
   if(!options.length)return null;
   t=options.sort((a,b)=>b.length-a.length||b.clearanceAtEnd-a.clearanceAtEnd||b.angle-a.angle)[0];}
 const el=document.querySelector('[data-diorama-actor="'+CSS.escape(key)+'"]');
 const points=qaTapPoints(el).filter(([x,y])=>qaNativeHit(x,y)===key);
 if(!points.length)return null;
 const dest=[a.foot.x+(t.x-a.x)*p.scaleX,a.foot.y+(t.y-a.y)*p.scaleY];
 const start=points.sort((a,b)=>Math.hypot(b[0]-dest[0],b[1]-dest[1])-Math.hypot(a[0]-dest[0],a[1]-dest[1]))[0];
 return {start,dest,expected:qaDryMove(key,t)||null};
}"""

GATE_ANCHOR="const blocked=()=>pendingResidentPresentation||!enabled||doc.visibilityState==='hidden'||!!flags.paused||isBlocked();"
GAME_GATE="""
  window.qaGameGate=()=>{
    const visible=node=>!!node?.getClientRects().length && getComputedStyle(node).visibility!=='hidden';
    const passive=document.body.dataset.homeProduction==='true'&&document.body.dataset.homeViewportVersion==='12';
    const idle=passive&&speechActive&&el.speechBubble.dataset.reactionEvent==='idle';
    const overlayIds=[...document.querySelectorAll('[role="dialog"],dialog[open],[id$="Overlay"]')].filter(visible);
    return {blocked:!!homeDioramaBlocked(),passive,individuality:individualityDialogOpen,activeOverlay,duelOpen,dateOpen,
      companionInviteOpen,itemScene:!!(pendingItemScene||itemSceneRecord),grandGoal:!!grandGoalPending,dexDetail:!!dexDetail,
      birth:!!birthCelebration,game:gameActive,meguru:meguruActive,sleep:state.isSleeping,sick:state.isSick,dying:!!state.dying,
      evolution:!!state.transformOptions,unit:conv2Unit?.kind,lowerRemaining:Math.max(0,homeV11Presentation().lowerUntil-Date.now()),
      speech:!!speechActive,speechText:visible(el.speechBubble)?el.speechBubble.textContent.trim():null,
      lifeCard:!el.lifeCardOverlay.classList.contains('hidden'),story:!el.storyFlash.classList.contains('hidden'),
      movie:document.body.classList.contains('movie-active'),normalHidden:el.screenNormal.classList.contains('hidden'),
      response:el.castResponse.dataset.reaction||null,menu:isAnyMenuOverlayOpen(),idle:!!idle,
      otherActors:homeCastActors().filter(a=>a.node.dataset.reaction&&!['look','curious','nod','breathe','sway','posture'].includes(a.node.dataset.reaction)
        &&!(idle&&['bounce','settle','shy','wiggle'].includes(a.node.dataset.reaction))).map(a=>[a.id,a.node.dataset.reaction]),
      overlays:overlayIds.map(n=>[n.id,...[...n.querySelectorAll('button')].filter(visible).map(b=>[b.id,b.textContent.trim()]).slice(0,16)])};
  };
"""
NATIVE_GATE="""env.qaInputCanStart=()=>!blocked()&&!env.HomeCastTrial.settings.paused;env.qaGate=()=>({atMs:Math.round(env.performance.now()),pending:pendingResidentPresentation,enabled,
 visibility:doc.visibilityState,flagsPaused:!!flags.paused,actual:!!blocked(),frozen:env.HomeCastTrial.settings.paused,
 cached:stage.dataset.dioramaPaused,game:env.qaGameGate()});"""
GATE_READ="()=>window.qaGate?.()??null"

def drag(page,frame,client):
    key='pet:dog'
    trials=[]
    box=page.evaluate("document.querySelector('#home').getBoundingClientRect().toJSON()")
    def send(kind,x=None,y=None):
        if client:
            points=[] if x is None else [{'x':x+box['x'],'y':y+box['y'],'id':1}]
            client.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':points})
        elif kind=='touchStart':
            page.mouse.move(x+box['x'],y+box['y']);page.mouse.down()
        elif kind=='touchMove':page.mouse.move(x+box['x'],y+box['y'])
        else:page.mouse.up()
    for assisted in (False,True):
        if assisted:
            try:
                frame.wait_for_function("document.querySelector('#castStage').dataset.dioramaPaused!=='true'",timeout=8000,polling=150)
            except PlaywrightTimeout:
                trials.append({'assisted':True,'delivered':False,'reason':'native painted pause did not clear within wait',
                               'gate':frame.evaluate(GATE_READ)})
                break
        gate_before=frame.evaluate(GATE_READ)
        plan=frame.evaluate(PROBE,{'key':key,'assisted':assisted})
        if not plan:
            trials.append({'assisted':assisted,'delivered':False});continue
        start=plan['start'];dest=plan['dest']
        ix=frame.evaluate('(window.qaPhysicalMoves||[]).length')
        pointer_offset=frame.evaluate('qaPointers.length')
        send('touchStart',*start)
        for i in range(1,6):
            f=i/5
            send('touchMove',start[0]*(1-f)+f*dest[0]+(3 if assisted else 0)*math.sin(f*math.pi),
                 start[1]*(1-f)+f*dest[1])
        held=frame.evaluate("()=>{const a=HomeCastTrial.inspect().find(a=>a.selected);return a&&[a.key,a.x,a.y]}")
        marker=frame.locator('.diorama-target').is_visible()
        send('touchEnd')
        page.wait_for_timeout(850)
        measured=frame.evaluate("""ix=>{const a=HomeCastTrial.inspect().find(a=>a.kind==='pet');return {key:a.key,x:a.x,y:a.y,
            route:(window.qaPhysicalMoves||[]).slice(ix),source:a.source};}""",ix)
        disp=math.hypot(held[1]-measured['x'],held[2]-measured['y']) if held and held[0]==key else 0
        accepted=any(row['key']==key for row in measured['route'])
        trials.append(dict(assisted=assisted,delivered=True,held=held and held[0],marker=marker,
            beforeGate=gate_before,afterGate=frame.evaluate(GATE_READ),
            requestedDistanceCss=round(math.dist(start,dest),2),moveAccepted=accepted,
            displacementNative=round(disp,2),predicted=bool(plan['expected']),nativeRoutes=measured['route'],
            pointerTrace=frame.evaluate('i=>qaPointers.slice(i)',pointer_offset)))
        if accepted and disp>0:break
    return trials


def run(args):
    base=args.url.rstrip('/')
    model=urlopen(base+'/game/home-production-model.js').read().decode()
    model=once(instrument(model),'function select(key){',SAFE_POINTS+'function select(key){')
    selector="function select(key){const a=actor(key);if(!a||paused)return false;"
    model=once(model,selector,selector+"(window.qaSelectCalls||=[]).push(key);")
    accepted="a.route=path.slice(1);a.target=path[0];a.source=source;"
    model=once(model,accepted,"if(source==='drag')(window.qaPhysicalMoves||=[]).push({key,x:q.x,y:q.y,waypoints:path.length});"+accepted)
    d=urlopen(base+'/game/home-production-diorama-limit.js').read().decode()
    d=once(d,HIT_ANCHOR,HIT_EXPOSE+HIT_ANCHOR)
    if args.diagnose_gate:
        d=once(d,GATE_ANCHOR,GATE_ANCHOR+NATIVE_GATE)
        native_game=urlopen(base+'/game/script-v2.js').read().decode()
        native_game=once(native_game,"  function homeDioramaBlocked() {",GAME_GATE+"  function homeDioramaBlocked() {")
    result=json.loads(args.out.read_text()) if args.out.exists() else {'engine':args.engine,'cases':{}}
    with sync_playwright() as pw:
        browser=getattr(pw,args.engine).launch(**({'executable_path':os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),'args':['--no-sandbox']} if args.engine=='chromium' else {}))
        result['version']=browser.version
        for width in args.widths:
            for layout in args.layouts:
                for extra in args.extras:
                    region=CASES[width]
                    key=f'{width}/{region}/{args.count}/{layout}/{extra}'
                    sig=seed_signature(base+'/game/limit-seating.js',width,region,args.count,layout,extra)
                    if result['cases'].get(key,{}).get('seed')==sig:continue
                    ctx=browser.new_context(viewport={'width':width,'height':HEIGHT[width]},has_touch=True,is_mobile=True,device_scale_factor=2)
                    try:
                        ctx.route('**/home-production-model.js*',lambda r:r.fulfill(content_type='application/javascript',body=model))
                        ctx.route('**/home-production-diorama-limit.js*',lambda r:r.fulfill(content_type='application/javascript',body=d))
                        if args.diagnose_gate:
                            ctx.route('**/script-v2.js*',lambda r:r.fulfill(content_type='application/javascript',body=native_game))
                        page=ctx.new_page();errors=[]
                        page.on('pageerror',lambda ex:errors.append(str(ex)))
                        print('opening',key,flush=True)
                        # Keep the native wall clock running. Notification and
                        # conversation ownership expire against Date.now().
                        query=dict(region=region,count=args.count,layout=layout,extra=extra,paused=1,time='day')
                        page.goto(base+'/v3/?'+urlencode(query),wait_until='domcontentloaded',timeout=150000)
                        page.wait_for_function("document.body.dataset.ready==='true'",timeout=150000,polling=150)
                        print('ready',key,flush=True)
                        frame=page.locator('#home').element_handle().content_frame()
                        assert frame.url.split('?')[0].endswith('/game/limit.html')
                        assert frame.evaluate('HomeCastTrial.settings.extra')==extra
                        frame.evaluate((ROOT/'verify_interact_hits.js').read_text());frame.evaluate(RECORDER)
                        bounds=page.evaluate("document.querySelector('#home').getBoundingClientRect().toJSON()")
                        page.evaluate("document.querySelector('#freeze').click()")
                        frame.wait_for_function("!HomeCastTrial.settings.paused && document.querySelector('#castStage').dataset.dioramaPaused!=='true'",timeout=90000,polling=150)
                        print('game accepts input',key,flush=True)
                        client=ctx.new_cdp_session(page) if args.engine=='chromium' else None
                        trials=drag(page,frame,client) if args.drag_first and not args.tap_only else []
                        taps=[]
                        targets=frame.evaluate("""()=>{const a=HomeCastTrial.inspect();
                          return [a.find(x=>x.kind==='partner'),a.find(x=>x.key==='companion:shiba')||a.find(x=>x.kind==='companion'),
                                  a.find(x=>x.kind==='pet')].filter(Boolean).map(x=>x.key);}""")
                        for target in targets:
                            point=frame.evaluate("""key=>qaTapPoints(document.querySelector('[data-diorama-actor="'+CSS.escape(key)+'"]'))[0]""",target)
                            before=frame.evaluate("pt=>({predictedKey:qaNativeHit(...pt),blocked:document.querySelector('#castStage').dataset.dioramaPaused==='true'})",point)
                            n=frame.evaluate('qaAct.length')
                            start_calls=frame.evaluate('(window.qaSelectCalls||[]).length')
                            page.touchscreen.tap(bounds['x']+point[0],bounds['y']+point[1])
                            state=frame.evaluate("n=>({selected:HomeCastTrial.inspect().find(a=>a.selected)?.key||null,events:qaAct.slice(n).filter(e=>e[0]==='tap').map(e=>e[2])})",n)
                            state['calls']=frame.evaluate('i=>(window.qaSelectCalls||[]).slice(i)',start_calls)
                            taps.append(dict(target=target,point=point,afterGate=frame.evaluate(GATE_READ),**before,**state))
                        print('tap selections',key,[t['selected'] for t in taps],flush=True)
                        if not args.drag_first and not args.tap_only:trials=drag(page,frame,client)
                        recovery=None
                        if args.diagnose_gate:
                            gate=frame.evaluate(GATE_READ);recovery={'initial':gate}
                            if gate['actual'] or gate['cached']=='true':
                                # Only use the ordinary non-committing dismissal offered by the current native overlay.
                                dismiss=frame.locator('#companionInviteLaterBtn:visible,#individualityLater:visible,button.dex-close-btn:visible')
                                if dismiss.count()==1:
                                    recovery['clicked']=dismiss.first.get_attribute('id')
                                    target=dismiss.first
                                    local=target.evaluate('''button=>{
                                      button.scrollIntoView({block:'center',behavior:'instant'});
                                      const b=button.getBoundingClientRect(),x=b.x+b.width/2,y=b.y+b.height/2;
                                      return {x,y,width:b.width,height:b.height,hit:document.elementFromPoint(x,y)?.closest('button')?.id};
                                    }''')
                                    recovery['dismissButton']=local
                                    if local.get('hit')==recovery['clicked']:
                                        page.touchscreen.tap(bounds['x']+local['x'],bounds['y']+local['y'])
                                        recovery['dismissalInput']='touch'
                                    else:
                                        # An inaccessible control is a recorded failure for the physical input trial.
                                        recovery['dismissalInput']='not reachable at center'
                                try:
                                    frame.wait_for_function("window.qaInputCanStart()",polling=200,timeout=args.reaction_wait_ms)
                                except PlaywrightTimeout:pass
                                recovery['after']=frame.evaluate(GATE_READ)
                                if not recovery['after']['actual']:recovery['retry']=drag(page,frame,client)
                        if client:client.detach()
                        events=frame.evaluate("""()=>({events:qaAct.reduce((m,e)=>{const k=e[0]+'/'+e[1];m[k]=(m[k]||0)+1;return m;},{}),speech:qaWords})""")
                        result['cases'][key]={'taps':taps,'drags':trials,**events,'pageErrors':errors,
                            'recovery':recovery,'seed':sig,'dragFirst':args.drag_first,'tapOnly':args.tap_only}
                        args.out.parent.mkdir(parents=True,exist_ok=True)
                        args.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
                        print(key,'selected',sum(t['target']==t['selected'] for t in taps),'of',len(taps),
                              'confirmed selects',sum(t['target'] in t['calls'] for t in taps),'drag',trials,flush=True)
                    finally:ctx.close()
        browser.close()


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('url');p.add_argument('--out',type=Path,required=True)
    p.add_argument('--engine',choices=['chromium','webkit'],default='chromium');p.add_argument('--widths',nargs='+',type=int,choices=list(HEIGHT),default=list(HEIGHT))
    p.add_argument('--extras',nargs='+',type=int,default=[0,10,20]);p.add_argument('--layouts',nargs='+',choices=['fixed','optimized'],default=['fixed'])
    p.add_argument('--drag-first',action='store_true',help='try the drag just after resuming before the three taps')
    p.add_argument('--count',type=int,choices=[1,4,10,20,28],default=28)
    p.add_argument('--reaction-wait-ms',type=int,default=12000,help='wait for the native post-dismissal reaction to release input')
    p.add_argument('--diagnose-gate',action='store_true',help='read actual native game/input ownership and try ordinary non-committing dismissal')
    p.add_argument('--tap-only',action='store_true',help='record physical selections before any intentional drag')
    run(p.parse_args())
