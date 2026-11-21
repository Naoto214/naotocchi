"""Trusted WPE touchend to the intended actor's first painted 1-pixel foot displacement."""
import argparse
from pathlib import Path
from playwright.sync_api import sync_playwright
from performance_common import ARMS, WPE, clock, distribution, native_page, save, touch

LISTEN = """
window.addEventListener('pointerup', e=>{
 const s=window.footProbe;
 if(!s||e.pointerType!=='touch')return;
 s.trusted=e.isTrusted;s.released=e.timeStamp;s.queueMs=performance.now()-e.timeStamp;
 const watch=()=>{
   if(window.footProbe!==s)return;
   if(s.key&&s.plan){
     const current=mobilityPerf.foot(s.key),dist=p=>Math.hypot(current.x-p.x,current.y-p.y);
     if(s.firstStepMs===null&&dist(s.before)>=1)s.firstStepMs=performance.now()-s.released;
     const actor=mobilityPerf.live.snapshot().find(a=>a.key===s.key);
     if(s.firstStepMs!==null&&!actor.target&&!actor.route.length&&dist(s.plan)<.3){
       s.arrivalMs=performance.now()-s.released;s.finalFoot=current;s.done=true;return;
     }
   }
   if(performance.now()-s.released>=5000){s.done=true;return}
   mobilityPerf.nativeRaf(watch);
 };mobilityPerf.nativeRaf(watch);
},true);
"""
COMMANDS=[("cat_friend",18,0),("hamster",-22,0),("bat",12,12),("punyu",0,20),
          ("watcher",26,-6),("rabbit_friend",-16,12),("tanuki",18,6),("panda",-18,6),("box",16,6)]


def instrument(name,source):
    if "production-diorama" in name:
        anchor="const success=model.move(g.key||model.selected(),p,g.drag?'drag':'ground',{pointerDrop:g.drag});"
        source=clock.replace(source,anchor,"""const s=window.footProbe;
        if(s&&g.drag){s.key=g.key||model.selected();s.before=mobilityPerf.foot(s.key);}
        """+anchor+"if(s&&g.drag){s.accepted=success;s.handlerMs=performance.now()-s.released;}")
        anchor="    function down(e){"
        source=clock.replace(source,anchor,"""
        mobilityPerf.foot=key=>{
          const row=rows.get(key),v=row.owner.style.translate.split(/\\s+/).map(parseFloat);
          return {x:row.x+(v[0]||0),y:row.y+(v[1]||0)};
        };
        mobilityPerf.press=key=>{
          const img=rows.get(key)?.owner.querySelector('.character-asset');
          if(!img)return null;
          const r=img.getBoundingClientRect();
          for(const fy of [.58,.45,.7,.31,.83])for(const fx of [.5,.36,.64,.22,.78]){
            const x=Math.round(r.left+r.width*fx),y=Math.round(r.top+r.height*fy),el=doc.elementFromPoint(x,y);
            if(el&&stage.contains(el)&&hit(point({clientX:x,clientY:y}),el,{clientX:x,clientY:y})===key)return [x,y];
          }
          return null;
        };
        """+anchor)
    if "production-model" in name:
        anchor="a.route=path.slice(1);a.target=path[0];a.source=source;"
        source=clock.replace(source,anchor,anchor+"""
        if(window.footProbe?.key===a.key&&source==='drag'){const p=path.at(-1);footProbe.plan={x:p.x,y:p.y};}
        """)
    return source


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base",default="http://127.0.0.1:8377/game")
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args()
    with sync_playwright() as pw:
        bridge=touch.WebKitTouch(WPE or pw.webkit.executable_path)
        try:
            browser=pw.webkit.connect(bridge.endpoint)
            result=dict(browser=browser.version,timeoutMs=5000,rows=[])
            commands=None
            for arm in ARMS:
                pg,errors,assets=native_page(browser,a.base,arm,init=LISTEN,transform=instrument)
                pg.evaluate("HomeCastTrial.apply({paused:false});mobilityPerf.reset(214);0")
                if commands is None:
                    commands=[]
                    for resident,dx,dy in COMMANDS:
                        key="companion:"+resident
                        position=pg.evaluate("k=>{mobilityPerf.reset(214);return mobilityPerf.press(k)}",key)
                        if position:
                            commands.append(dict(key=key,start=position,finish=[position[0]+dx,position[1]+dy]))
                assert len(commands)>=4,commands
                readings=[]
                for command in commands:
                    pg.evaluate("mobilityPerf.reset(214);window.footProbe={firstStepMs:null,arrivalMs:null};0")
                    touch.send(pg,bridge,command["start"],command["finish"],"drag")
                    pg.wait_for_function("footProbe.done",timeout=35000)
                    actual=pg.evaluate("footProbe")
                    assert actual["trusted"],actual
                    readings.append(dict(command=command,**actual))
                assert not errors,errors
                good=[r["firstStepMs"] for r in readings if r["command"]["key"]==r.get("key") and r["firstStepMs"] is not None]
                result["rows"].append(dict(arm=arm,assets=assets,readings=readings,intendedOnset=distribution(good)))
                save(a.out,result)
                print(arm,len(good),"/",len(commands),flush=True)
                pg.close()
        finally:
            bridge.close()
