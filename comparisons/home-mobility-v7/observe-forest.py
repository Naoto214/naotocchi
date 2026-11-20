"""Record uninterrupted native replay, followed by one real drag for each resident."""
import argparse, asyncio, gzip, hashlib, json, math, time
from pathlib import Path
from urllib.parse import urlencode, urlsplit
from playwright.async_api import async_playwright

HERE=Path(__file__).resolve().parent
def digest(data): return hashlib.sha256(data).hexdigest()
def encode(data): return json.dumps(data,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode()
def save(path,data):
    tmp=path.with_suffix('.part')
    tmp.write_bytes(gzip.compress(encode(data),mtime=0) if path.suffix=='.gz' else encode(data))
    tmp.replace(path)

POINT_JS="""async ({key})=>{
 const actors=HomeCastTrial.inspect(),a=actors.find(a=>a.key===key);
 const owner=document.querySelector('[data-diorama-actor="'+CSS.escape(key)+'"]');
 const img=owner?.querySelector('img.character-asset');if(!img)return null;
 await img.decode();const rect=img.getBoundingClientRect(),c=document.createElement('canvas');
 c.width=img.naturalWidth;c.height=img.naturalHeight;
 const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0);
 const pixels=cx.getImageData(0,0,c.width,c.height).data;let left=c.width,right=-1,top=c.height,bottom=-1;
 for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(pixels[(y*c.width+x)*4+3]>=200){
  left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
 }
 if(right<left)return null;
 let flip=false;for(let n=img;n;n=n.parentElement){
   const css=getComputedStyle(n);if(parseFloat(css.scale)<0)flip=!flip;
   if(css.transform!=='none'&&new DOMMatrix(css.transform).a<0)flip=!flip;
 }
 const scores=[];for(let j=0;j<=8;j++)for(let i=0;i<=8;i++){
  const x=Math.round(left+(right-left)*(.08+i*.105)),y=Math.round(top+(bottom-top)*(.08+j*.105));
  if(pixels[(y*c.width+x)*4+3]<200)continue;
  const nx=(x+.5)/c.width,sx=rect.left+rect.width*(flip?1-nx:nx),sy=rect.top+rect.height*(y+.5)/c.height;
  if(sx<2||sy<2||sx>innerWidth-2||sy>innerHeight-2)continue;
  const hit=document.elementFromPoint(sx,sy)?.closest('[data-diorama-actor]')?.dataset.dioramaActor||null;
  scores.push({x:sx,y:sy,hit,cost:(hit===key?0:100)+Math.hypot(i-4,j-3)});
 }
 scores.sort((a,b)=>a.cost-b.cost);const pick=scores[0];if(!pick)return null;
 return {key,down:[pick.x,pick.y],topDOM:pick.hit,foot:[a.foot.x,a.foot.y],
  goal:[a.foot.x+(a.foot.x<=innerWidth/2?12:-12),a.foot.y],source:[a.x,a.y],opaquePoints:scores.length,frontPoints:scores.filter(p=>p.hit===key).length};
}"""

async def gesture(session,method,point=None):
    payload=[] if point is None else [{'x':point[0],'y':point[1],'id':1,'radiusX':5,'radiusY':5,'force':.7}]
    await session.send('Input.dispatchTouchEvent',{'type':method,'touchPoints':payload})

async def observe(args):
    destination=args.out
    destination.mkdir(parents=True,exist_ok=True)
    async with async_playwright() as pw:
        browser=await pw.chromium.launch(executable_path=args.chromium,args=['--disable-background-timer-throttling','--disable-renderer-backgrounding'])
        try:
            context=await browser.new_context(viewport={'width':390,'height':792},has_touch=True,is_mobile=True,device_scale_factor=2)
            # Keep application randomness seeded too. The owner's independent
            # native presentation stream starts at 214 in the paired fixture.
            await context.add_init_script("""{let seed=214;Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};}""")
            page=await context.new_page();responses=[];errors=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('response',lambda resp:responses.append(resp) if any(s in urlsplit(resp.url).path for s in ('mobility-v','telemetry.js','drag-trial-hooks.js')) else None)
            params=dict(region='forest',time='day',count=28,paused=1,clock=0,ground='on',paired=1,variant='B',season='autumn',weather='sunny')
            url=args.url.rstrip('/')+'/game/mobility-'+args.arm+'.html?'+urlencode(params)
            await page.goto(url,wait_until='domcontentloaded',timeout=150000)
            await page.wait_for_function('window.HomeCastTrial?.ready&&window.HomeDragTrial?.opening()&&window.HomeMobilityDiagnostics',timeout=120000)
            opening=await page.evaluate('HomeDragTrial.opening()')
            assert len(opening['actors'])==28 and opening['clock']==0,opening
            source={urlsplit(response.url).path.rsplit('/',1)[-1]:digest(await response.body()) for response in responses}
            base=await page.evaluate("""()=>{const d=HomeMobilityDiagnostics;d.enable();const initial=d.read();HomeCastTrial.apply({paused:false});return initial;}""")
            assert base['arm']==args.arm and len(base['residents'])==28,base
            start=time.monotonic();trajectory=[];checks=[];interventions=[];sickSince=None;lastCare=-1000
            while True:
                await page.wait_for_timeout(args.sample*1000)
                snapshot=await page.evaluate('HomeMobilityDiagnostics.read()')
                wall=time.monotonic()-start
                assert snapshot['arm']==args.arm and len(snapshot['residents'])==28
                sample={'wall':wall,'nativeSeconds':snapshot['modelSeconds'],'blocked':snapshot['currentGateReasons'],
                    'actors':[[a['key'],a['x'],a['y'],a['activity'],a['ambientRequests'],a['ambientPlans'],a['ambientStarts'],a['ambientArrivals'],a['actualDistance'],a['lastMovedAgo']] for a in snapshot['residents']]}
                trajectory.append(sample)
                checks.append(await page.evaluate("({visible:document.visibilityState,playing:!HomeCastTrial.settings.paused,clock:HomeBeauty.clockSeconds})"))
                save(destination/(args.arm+'-progress.json'),{'wall':wall,'nativeSeconds':snapshot['modelSeconds'],'moved':sum(a['actualDistance']>0 for a in snapshot['residents']),'goals':sum(a['ambientRequests'] for a in snapshot['residents']),'samples':len(trajectory),'gate':snapshot['currentGateReasons'],'roster':len(snapshot['residents'])})
                if args.checkpoint:
                    save(destination/(args.arm+'-checkpoint.json.gz'),{'arm':args.arm,'opening':opening,'sources':source,'elapsedWall':wall,'report':snapshot,'events':await page.evaluate('HomeMobilityDiagnostics.events()'),'trajectory':trajectory,'stateChecks':checks,'interventions':interventions})
                sickSince=(sickSince if sickSince is not None else wall) if 'illness' in snapshot['currentGateReasons'] else None
                if sickSince is not None and wall-sickSince>=15 and wall-lastCare>=45 and args.care_approval and args.care_approval.is_file():
                    button=page.locator('#medicineBtn');rect=await button.bounding_box()
                    if rect and await button.is_visible() and await button.is_enabled():
                        await page.touchscreen.tap(rect['x']+rect['width']/2,rect['y']+rect['height']/2)
                        interventions.append({'wall':wall,'modelSeconds':snapshot['modelSeconds'],'before':snapshot['currentGateReasons'],'action':'ordinary owner touchscreen tap on existing #medicineBtn','observedForSeconds':wall-sickSince});lastCare=wall
                if wall>=args.seconds and snapshot['modelSeconds']>=args.seconds:break
                if wall>args.seconds*3+90:raise RuntimeError(('natural presentation was blocked for the observation window',wall,snapshot['gateReasons']))
            baseline=snapshot; baselineEvents=await page.evaluate('HomeMobilityDiagnostics.events()')
            data={'arm':args.arm,'origin':args.url,'browser':browser.version,'region':'forest','count':28,'viewport':[390,792],'dpr':2,
              'nativeSeed':214,'applicationSeed':214,'opening':opening,'openingSHA256':digest(encode(opening['actors'])),
              'sources':source,'startedUTC':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime(time.time()-wall)),
              'wallSeconds':wall,'interventions':interventions,'baseline':baseline,'observations':trajectory,'stateChecks':checks,'events':baselineEvents,'drags':[],'errors':errors}
            save(destination/(args.arm+'-forest28.json.gz'),data)
            await page.evaluate("""()=>{window.forestGestures=[];for(const type of ['pointerdown','pointerup','pointercancel'])document.addEventListener(type,e=>window.forestGestures.push([e.type,e.isTrusted,e.pointerType,e.clientX,e.clientY]),true);}""")
            session=await context.new_cdp_session(page)
            for frame in opening['actors']:
                key=frame[0];plan=await page.evaluate(POINT_JS,{'key':key})
                if not plan:
                    data['drags'].append({'key':key,'skipped':'no visible opaque sprite sample'});continue
                before=await page.evaluate('HomeMobilityDiagnostics.read()')
                await page.evaluate('window.forestGestures=[]')
                a,b=plan['down'],plan['goal']
                await gesture(session,'touchStart',a)
                for f in (.35,.75,1):
                    await gesture(session,'touchMove',[x+(y-x)*f for x,y in zip(a,b)])
                await gesture(session,'touchEnd')
                await page.wait_for_timeout(1800)
                after=await page.evaluate('HomeMobilityDiagnostics.read()')
                result={'key':key,'plan':plan,'at':before['modelSeconds'],'until':after['modelSeconds'],'gateBefore':before['currentGateReasons'],
                  'selected':await page.evaluate('HomeCastTrial.inspect().find(a=>a.selected)?.key||null'),
                  'events':await page.evaluate('forestGestures'),'issuedKeys':[],'ownStarts':0,'ownArrivals':0}
                for old,new in zip(before['residents'],after['residents']):
                    if new['dragRequests']>old['dragRequests']:result['issuedKeys'].append(old['key'])
                    if old['key']==key:
                        result['ownStarts']=new['dragStarts']-old['dragStarts'];result['ownArrivals']=new['dragArrivals']-old['dragArrivals']
                data['drags'].append(result)
            await page.wait_for_timeout(12500)
            data['postDrag']=await page.evaluate('HomeMobilityDiagnostics.read()')
            data['postDragEvents']=await page.evaluate('HomeMobilityDiagnostics.events()')
            assert not errors,errors
            save(destination/(args.arm+'-forest28.json.gz'),data)
            print(args.arm,'wall',round(data['wallSeconds'],2),'native',round(baseline['modelSeconds'],2),'opening',data['openingSHA256'],'drags',len(data['drags']),flush=True)
        finally:await browser.close()

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--url',required=True);p.add_argument('--arm',choices=['v5','v6','v7'],required=True)
    p.add_argument('--out',type=Path,required=True);p.add_argument('--seconds',type=float,default=305);p.add_argument('--sample',type=float,default=10)
    p.add_argument('--checkpoint',action='store_true');p.add_argument('--care-approval',type=Path)
    p.add_argument('--chromium',default='/usr/bin/chromium')
    asyncio.run(observe(p.parse_args()))
