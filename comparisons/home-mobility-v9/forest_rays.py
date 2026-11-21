"""Replay captured feet against the native forest navigation and art mask on a separate paused page."""
import argparse
import gzip
import hashlib
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
PROBE = """
    globalThis.forestRays=cases=>cases.map(({key,feet,goal})=>{
      const a=actors.find(b=>b.key===key), own=feet.find(b=>b[0]===key);
      const from={...a,x:own[1],y:own[2],w:own[3],h:own[4]};
      const boundsFor=bounds(from,scene),nav=scene.navigation,s=nav.intentScale;
      const ink=scene.planVisibility?.(from)||(p=>visible(from,p));
      const peers=feet.filter(b=>b!==own).map(b=>({key:b[0],x:b[1],y:b[2],rx:(own[3]+b[3])*.5+10,ry:(own[4]+b[4])*.38+10}));
      const clearanceAt=(p,b)=>Math.hypot((p.x-b.x)/b.rx,(p.y-b.y)/b.ry);
      for(const b of peers)b.before=clearanceAt(from,b);
      const contacts=peers.filter(b=>b.before<1).map(b=>[b.key,b.before]);
      const reachable={}, toward={}, terrain={}, boundsHeading={};
      const distGoal=p=>goal?Math.hypot((p.x-goal[0])*s.x,(p.y-goal[1])*s.y):0;
      const distance=distGoal(from);
      for(const r of [3,4,5,6,8,12,18,24]){
        const yes=[], closer=[];
        let inBounds=0,onGround=0;
        for(let i=0;i<48;i++){
          const angle=i*Math.PI/24, p={x:from.x+r*Math.cos(angle)/s.x,y:from.y+r*Math.sin(angle)/s.y};
          if(p.x<boundsFor.left||p.x>boundsFor.right||p.y<boundsFor.top||p.y>boundsFor.bottom)continue;
          inBounds++;
          if(!nav.segmentSafe(from,p,ink))continue;
          onGround++;
          if(peers.every(b=>{
            const after=clearanceAt(p,b);
            return contactSegmentSafe(from,p,b,b.rx,b.ry)&&(after>=1||b.before<1&&after>b.before+1e-6);
          })){
            yes.push(i*7.5);
            if(goal&&distGoal(p)<distance-.75)closer.push(i*7.5);
          }
        }
        reachable[r]=yes;toward[r]=closer;terrain[r]=onGround;boundsHeading[r]=inBounds;
      }
      return {key,contacts,reachable,toward,terrain,boundsHeading,
        edgeCss:Math.min((from.x-boundsFor.left)*s.x,(boundsFor.right-from.x)*s.x,(from.y-boundsFor.top)*s.y,(boundsFor.bottom-from.y)*s.y)};
    });
"""
def read(path):
    with gzip.open(path,'rt') as f:return json.load(f)
def scan(args):
    with sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=args.chromium)
        try:
            page=browser.new_page(viewport={'width':390,'height':792},is_mobile=True,has_touch=True,device_scale_factor=2,timezone_id='Asia/Tokyo',locale='ja-JP')
            sources={}
            def hook(route):
                resp=route.fetch();source=resp.text()
                sources['model']=hashlib.sha256(source.encode()).hexdigest()
                anchor='    return {metrics:'
                assert source.count(anchor)==1
                route.fulfill(response=resp,body=source.replace(anchor,PROBE+anchor))
            page.route(re.compile(r'/home-production-model-mobility-v8\.js'),hook)
            page.goto(args.url.rstrip('/')+'/game/mobility-v8.html?region=forest&time=day&count=28&paused=1&clock=0&ground=on&paired=1&variant=B&season=autumn&weather=sunny',wait_until='domcontentloaded')
            page.wait_for_function('window.HomeCastTrial?.ready&&window.HomeDragTrial?.opening()&&typeof window.forestRays==="function"',timeout=120000)
            sources['scanner']=hashlib.sha256(PROBE.encode()).hexdigest()
            for path in args.files:
                d=read(path); cases=[]; identities=[]
                opening=[[key,x,y,w,h] for key,_,x,y,w,h in d['opening']['actors']]
                final=[[a[k] for k in ('key','x','y','w','h')] for a in d['baseline']['residents']]
                for phase,feet in [('opening',opening),('endpoint',final)]:
                    for key,*_ in feet:
                        cases.append(dict(key=key,feet=feet));identities.append([phase,key,None])
                # Never probe the live game or alter its order of RNG draws. All original
                # rejections remain in the source and have one geometry observation each.
                for i,r in enumerate(d['log']['requests']):
                    if r['planned'] and not r['accepted'] and r['source']=='ambient':
                        cases.append(dict(key=r['key'],feet=[b[:5] for b in r['peers']],goal=r['goal']))
                        identities.append(['refusal',r['key'],i])
                observations=[]
                for offset in range(0,len(cases),12):
                    batch=cases[offset:offset+12]
                    findings=page.evaluate('cases=>forestRays(cases)',batch)
                    observations.extend([dict(phase=phase,key=key,request=idx,geometry=row) for (phase,key,idx),row in zip(identities[offset:],findings)])
                out=path.parent/'directions.json.gz'
                with gzip.open(out,'wt',compresslevel=3) as f:json.dump(dict(sources=sources,input=hashlib.sha256(path.read_bytes()).hexdigest(),observations=observations),f,separators=(',',':'))
                print(d['arm'],d['seed'],len(observations),str(out),flush=True)
        finally:browser.close()
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--url',required=True);p.add_argument('--chromium',default='/usr/bin/chromium');p.add_argument('files',type=Path,nargs='+');scan(p.parse_args())
