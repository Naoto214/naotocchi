"""Open real phone-size home fixtures and record native geometry. Temporary dumps can be reused offline."""
import argparse
from datetime import datetime,timezone
from pathlib import Path
import json
import os
from urllib.parse import urlencode
from playwright.sync_api import sync_playwright

BASE=Path(__file__).resolve().parent
REGIONS=('forest','river_lake','city','home','countryside','mountain','snow','sea','jungle','desert','deepsea','star_stop','memory_lake')
HEIGHTS={320:568,375:812,390:844,430:932}
QUERY={'clock':0,'paused':1,'time':'day','variant':'B','compareSplit':0}

def collect(args):
    args.out.mkdir(parents=True,exist_ok=True)
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
        for w in args.widths:
            # A direct game document has the same viewport as the shell's iframe.
            ctx=browser.new_context(viewport={'width':w,'height':HEIGHTS[w]-52},has_touch=True,is_mobile=True,device_scale_factor=2)
            ctx.add_init_script(path=BASE/'geometry_capture.js')
            def expose_hit(route):
                source=route.fetch().text()
                anchor='function down(e){'
                assert source.count(anchor)==1
                probe="window.qaNativeHit=(x,y)=>{const el=doc.elementFromPoint(x,y);return el&&stage.contains(el)&&!el.closest('button,a,input,select,textarea')?hit(point({clientX:x,clientY:y}),el):null;};"
                probe+="window.qaTerrainForSteps=()=>{const s=displayRect(stage),h=displayRect(worldHost),a=model.snapshot()[0],x=s.left-h.left,y=s.top-h.top;return polygonsAt(a).map(poly=>poly.map(p=>[p[0]-x,p[1]-y]));};"
                route.fulfill(body=source.replace(anchor,probe+anchor),content_type='application/javascript')
            ctx.route('**/home-production-diorama-limit.js*',expose_hit)
            for count in args.counts:
                for region in args.regions:
                    out=args.out/f'{w}-{region}-{count}.json'
                    if out.is_file():
                        existing=json.loads(out.read_text())
                        if 'moved' in existing and (not getattr(args,'all_phases',False) or 'later' in existing):continue
                    page=ctx.new_page()
                    try:
                        page.clock.set_fixed_time(datetime(2026,10,15,3,tzinfo=timezone.utc))
                        params={**QUERY,'region':region,'count':count,'layout':args.layout,'extra':args.extra}
                        page.goto(args.url+'?'+urlencode(params),wait_until='domcontentloaded',timeout=90000)
                        page.wait_for_function("n=>window.qaLastScene && window.HomeCastTrial?.inspect().length===n && window.NaotocchiHomeViewport?.residentPresentation?.() && HomeBeauty.paintRect?.width && JSON.parse(document.querySelector('#castStage').dataset.livingMetrics||'{}').world?.loaded && window.HomeCastTrial.ready",arg=count,timeout=150000,polling=100)
                        page.evaluate("Promise.all([...document.querySelectorAll('#castStage img')].map(img=>img.decode().catch(()=>{})))")
                        page.evaluate("window.qaPreviouslyPlaying=document.getAnimations().filter(a=>a.playState==='running');document.getAnimations().forEach(a=>{a.pause();a.currentTime=0});true")
                        page.evaluate((BASE/'geometry_snapshot.js').read_text())
                        page.evaluate((BASE/'verify_interact_geometry_hook.js').read_text()+';window.qaInputSample=qaInputSample;true;')
                        page.evaluate((BASE/'verify_interact_hits.js').read_text())
                        page.evaluate("""window.qaPhase = () => {
                          const snap=qaGeometryDump();
                          snap.input=qaInputSample({snapshot:qaNative.snapshot(),model:qaNative,scene:qaLastScene,navigation:qaLastScene.navigation});
                          snap.taps={};snap.gear={};
                          const before=HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y,a.w,a.h]);
                          for(const extra of [0,5,10,15,20]){
                            HomeCastTrial.apply({extra});
                            snap.taps[extra]=qaTapHits();
                            const stage=document.getElementById('castStage');
                            snap.gear[extra]=[...stage.querySelectorAll('#petAccessory,.partner-ring,.partner-heart')]
                              .map(el=>el.getBoundingClientRect()).filter(r=>r.width)
                              .map(r=>[r.x,r.y,r.width,r.height]);
                          }
                          HomeCastTrial.apply({extra:0});
                          const after=HomeCastTrial.inspect().map(a=>[a.key,a.x,a.y,a.w,a.h]);
                          if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Native pose changed during fixed-size sweep');
                          snap.modelStats=qaNative.metrics();snap.events={...window.qaEvents};
                          return snap;
                        };window.qaEvents={};document.getElementById('castStage').addEventListener('naotocchi:home-reaction',e=>{
                          const k=e.detail?.type;if(k)qaEvents[k]=(qaEvents[k]||0)+1;
                        });true""")
                        page.evaluate('HomeCastTrial.apply({extra:0,paused:true});true')
                        fixture=page.evaluate('qaPhase()')
                        fixture['browser']=browser.version
                        fixture['opening']={'layout':args.layout,'extra':args.extra,'region':region,'width':w,'count':count}
                        page.evaluate("""window.qaAdvance=(steps)=>{
                          HomeCastTrial.apply({extra:0,paused:false});
                          for(let i=0;i<steps;i++)qaNative.step(.1,{blocked:false,reducedMotion:false});
                          HomeCastTrial.apply({paused:true});
                          document.getAnimations().forEach(a=>{a.pause();a.currentTime=0});
                        };qaAdvance(80);true""")
                        fixture['moved']=page.evaluate('qaPhase()')
                        if count==28 or getattr(args,'all_phases',False) or fixture['moved']['modelStats']['distance']<1:
                            page.evaluate('qaAdvance(220)')
                            fixture['later']=page.evaluate('qaPhase()')
                        if count==28:
                            fixture['perfSample']=page.evaluate((BASE/'geometry_perf_sample.js').read_text())
                        assert all(a['frame'][2]>0 for a in fixture['actors'])
                        tmp=out.with_suffix(f'.{os.getpid()}.tmp')
                        tmp.write_text(json.dumps(fixture,separators=(',',':'))+'\n')
                        tmp.replace(out)
                        print(w,region,count,len(fixture['passes']),fixture['p']['viewport'],flush=True)
                    except Exception as exc:
                        print('FAILED',w,region,count,str(exc)[:200],flush=True)
                    finally:
                        page.close()
            ctx.close()
        browser.close()

if __name__=='__main__':
    cli=argparse.ArgumentParser(description=__doc__);cli.add_argument('url');cli.add_argument('out',type=Path)
    cli.add_argument('--widths',type=int,nargs='+',default=list(HEIGHTS));cli.add_argument('--counts',type=int,nargs='+',default=[28,20,10,4,1])
    cli.add_argument('--regions',nargs='+',default=REGIONS)
    cli.add_argument('--all-phases',action='store_true',help='Also measure 30 native seconds for moving smaller households')
    cli.add_argument('--layout',choices=['fixed','optimized'],default='fixed')
    cli.add_argument('--extra',type=int,default=0)
    args=cli.parse_args();collect(args)
    for w in args.widths:
        for r in args.regions:
            for c in args.counts:
                name=args.out/f'{w}-{r}-{c}.json'
                if not name.is_file() or 'moved' not in json.loads(name.read_text()):
                    raise SystemExit(f'Missing complete native fixture: {name}')
