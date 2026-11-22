"""Validate offline new-grass seat proposals without assigning them to displayed residents."""
import functools,hashlib,http.server,json,threading,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
HERE=Path(__file__).resolve().parent

def run(dist,out):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*args): pass
    server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(dist)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    proposals=json.loads((HERE/'evidence/geometry-pairs-320-fine.json').read_text())['pairs']['otherExamples']
    moves=[p['moves'] for p in proposals]
    survey=(HERE.parent/'home-mobility-v11/space-probe.js').read_text()
    hook="""if(v13Opening && actors.length===28){
     globalThis.geometryPair=changes=>{
      SURVEY
      const nav=scene.navigation,sc=nav.intentScale;
      const slots=new Map(changes.map(m=>[m.key,m]));
      const pts=actors.map(a=>{const m=slots.get(a.key);return m?{...a,x:a.x+m.dx/sc.x,y:a.y+m.dy/sc.y}:a;});
      const rays=roster=>forestSpaceSurvey.rays({feet:roster.map(p=>[p.key,p.x,p.y,p.w,p.h]),sectors:96,distances:[3,8,16]});
      const old=rays(actors),updated=rays(pts),changed=pts.filter(p=>slots.has(p.key)).map(p=>{
       const b=bounds(p,scene);return {key:p.key,inBounds:p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom,
       visible:scene.planVisibility(p)(p),onGround:nav.valid(p),onAddedTerrain:!nav.v13Opening.valid(p)&&nav.valid(p),
       keepsLeadLane:exit.every(q=>separated(lead,q,p))};
      });
      const worsened=[];
      for(let i=0;i<pts.length;i++)for(let j=0;j<i;j++){
       if(clearance(pts[i],pts[i],pts[j])+1e-9<Math.min(1,clearance(actors[i],actors[i],actors[j])))worsened.push([pts[i].key,pts[j].key]);
      }
      return {changes,changed,worsened,reservedSamples:exit.length,oldContacts:old.reduce((n,p)=>n+p.contacts.length,0)/2,newContacts:updated.reduce((n,p)=>n+p.contacts.length,0)/2,
       newlyOpen:updated.filter((p,i)=>!old[i].result[1].safe.length&&p.result[1].safe.length).map(p=>p.key),
       lost:old.flatMap((p,i)=>p.result.flatMap((r,j)=>{const loss=r.safe.filter(a=>!updated[i].result[j].safe.includes(a));return loss.length?[[p.key,[3,8,16][j],loss]]:[];}))};
     };
    }""".replace('SURVEY',survey)
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--disable-dev-shm-usage'])
            page=browser.new_page(viewport={'width':320,'height':792},device_scale_factor=2,is_mobile=True,has_touch=True,timezone_id='Asia/Tokyo');meta={}
            def intercept(route):
                r=route.fetch();src=r.text();meta['modelSHA256']=hashlib.sha256(src.encode()).hexdigest()
                anchor='      if(arrange){clearRelief();'
                assert src.count(anchor)==1
                route.fulfill(response=r,body=src.replace(anchor,hook+'\n'+anchor))
            page.route('**/home-production-model-mobility-v13-c.js*',intercept)
            page.goto(f'http://127.0.0.1:{server.server_port}/game/mobility-v13-c.html?region=forest&time=day&count=28&paused=1&clock=0&ground=on&paired=1&variant=B&season=autumn&weather=sunny',wait_until='domcontentloaded',timeout=120000)
            page.wait_for_function("window.HomeCastTrial?.ready && HomeDragTrial.opening() && typeof window.geometryPair==='function'",timeout=100000)
            result=page.evaluate('moves=>moves.map(m=>geometryPair(m))',[[moves[0][0]],[moves[0][1]],*moves])
            out.write_text(json.dumps({'browser':browser.version,**meta,'width':320,'height':792,'proposals':result},indent=2)+'\n');browser.close()
    finally:server.shutdown()

if __name__=='__main__':run(Path(sys.argv[1]),Path(sys.argv[2]))
