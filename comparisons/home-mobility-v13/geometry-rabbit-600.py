"""Paired 600-model-second midpoint/endpoint replay, with one initial rabbit seat difference."""
import argparse,functools,hashlib,http.server,json,re,sys,threading
from pathlib import Path
from playwright.sync_api import sync_playwright
HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(HERE.parent/'home-mobility-v12'))
from forest_continuation import INJECT
from forest_results import v9
from forest_watch import observe,baseline,original_url

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass


def run(dist,out,arm):
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(dist)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    survey=(HERE.parent/'home-mobility-v11/space-probe.js').read_text()
    checks="""globalThis.rabbitQA=(offset=null)=>{
        SURVEY
        const sc=scene.navigation.intentScale;
        const hh=actors.map(a=>({...a}));
        const rabbit=hh.find(a=>a.key==='companion:rabbit_friend');
        if(offset){rabbit.x+=offset[0]/sc.x;rabbit.y+=offset[1]/sc.y;}
        const feet=hh.map(p=>[p.key,p.x,p.y,p.w,p.h]);
        const rays=forestSpaceSurvey.rays({feet,sectors:96,distances:[3,8,16]});
        const b=bounds(rabbit,scene);
        return {feet,exits:Object.fromEntries(rays.map(r=>[r.key,r.result.map(d=>d.safe)])),
          pairs:rays.reduce((n,p)=>n+p.contacts.length,0)/2,
          rabbit:{x:rabbit.x,y:rabbit.y,minBoundsMarginCSS:Math.min((rabbit.x-b.left)*sc.x,(b.right-rabbit.x)*sc.x,(rabbit.y-b.top)*sc.y,(b.bottom-rabbit.y)*sc.y),
          minPairClearance:Math.min(...hh.filter(p=>p!==rabbit).map(p=>clearance(rabbit,rabbit,p))),
          contacts:rays.find(p=>p.key===rabbit.key).contacts},safety:globalThis.rabbitSafety,scale:sc};
     };
     """.replace('SURVEY',survey)
    guard="""{const s=globalThis.rabbitSafety??={steps:0,ground:0,ink:0,contact:0};s.steps++;
     if(!scene.navigation.segmentSafe(a,p))s.ground++;
     if(!scene.planVisibility(a)(p))s.ink++;
     if(actors.some(b=>b!==a&&(!contactSegmentSafe(a,p,b,(a.w+b.w)/2+10,(a.h+b.h)*.38+10) ||
        clearance(a,p,b)<1&&clearance(a,p,b)<=clearance(a,a,b)+1e-6)))s.contact++;
     }"""
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--disable-dev-shm-usage'])
            ctx=browser.new_context(viewport={'width':320,'height':792},device_scale_factor=2,is_mobile=True,has_touch=True,timezone_id='Asia/Tokyo',locale='ja-JP')
            ctx.add_init_script(baseline.prior.SEED);page=ctx.new_page();hashes={}
            def intercept(route):
                name=Path(route.request.url.split('?')[0]).name;r=route.fetch();src=r.text();hashes[name]=hashlib.sha256(src.encode()).hexdigest()
                if name=='home-production-model-mobility-v13-c.js':
                    src=baseline.replace_once(observe(src),'function observeHop(a,p) {','function observeHop(a,p) {'+guard)
                    src=baseline.replace_once(src,'    return {metrics:',checks+INJECT+'    return {metrics:')
                elif name.startswith('drag-trial-hooks'):
                    src=baseline.replace_once(src,'let seed = 214;','let seed = 214;globalThis.setForestSeed=n=>{seed=n};globalThis.forestSeed=()=>seed;')
                route.fulfill(response=r,body=src)
            page.route(re.compile(r'/(?:home-production-model-mobility-v13-c[.]js|drag-trial-hooks[\w-]*[.]js|beauty/fixture[.]js|population-beauty[.]js)(?:[?]|$)'),intercept)
            page.goto(original_url(f'http://127.0.0.1:{server.server_port}','v13-c'),wait_until='domcontentloaded',timeout=120000)
            page.wait_for_function('window.HomeCastTrial?.ready&&HomeDragTrial.opening()&&typeof forestSameClock==="function"',timeout=120000)
            page.evaluate('Promise.all([...document.querySelectorAll("#castStage img.character-asset")].map(i=>i.decode()))')
            page.evaluate('HomeMobilityDiagnostics.enable()')
            offsets=[46.55973307012732,-62.93609432053452] if arm=='rabbit' else None
            start=page.evaluate('forestCheckpoint()');opening=page.evaluate('off=>rabbitQA(off)',offsets)
            print('start',arm,flush=True)
            result=page.evaluate('args=>forestSameClock(args.s,18000,args.pose,null)',{'s':start,'pose':opening['feet']})
            end=page.evaluate('rabbitQA()');result.update(arm='v13-c',seed=214)
            assert abs(result['state']['clock']-600)<1e-6
            legs=v9.legs(result);stats={}
            for key,_,_,_,_ in opening['feet']:
                own=[r for r in legs if r['key']==key and r['completed_normal']]
                stats[key]={'normal':[sum(r['finish_s']<=300+1e-7 for r in own),sum(r['finish_s']>300+1e-7 for r in own)],
                  'totalCSS':round(sum(r['css_distance'] for r in legs if r['key']==key),2),
                  'initialRays':list(map(len,opening['exits'][key])),'finalRays':list(map(len,end['exits'][key]))}
            rec={'arm':arm,'browser':browser.version,'seed':214,'finalSeed':result['state']['seed'],'ticks':18000,
              'clock':result['state']['clock'],'source':hashes,'initialActorSeed':start['seed'],
              'originalCheckpointSHA256':hashlib.sha256(json.dumps(start,sort_keys=True,separators=(',',':')).encode()).hexdigest(),
              'nativeStateSHA256':hashlib.sha256(json.dumps(result['state'],sort_keys=True,separators=(',',':')).encode()).hexdigest(),
              'offsetCSS':offsets,'initialContacts':opening['pairs'],'finalContacts':end['pairs'],'rabbitStart':opening['rabbit'],'rabbitEnd':end['rabbit'],
              'safety':end['safety'],'actors':stats,'normalBothHalves':sum(all(r['normal']) for r in stats.values())}
            out.write_text(json.dumps(rec,indent=2)+'\n');print('completed',arm,flush=True);browser.close()
    finally:server.shutdown()

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('dist',type=Path);p.add_argument('arm',choices=['c','rabbit']);p.add_argument('out',type=Path)
    a=p.parse_args();run(a.dist,a.out,a.arm)
