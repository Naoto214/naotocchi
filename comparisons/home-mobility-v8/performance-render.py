"""Paired native foreground geometry audit and a deterministic style/layout replay."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("clock", HERE.parent / "home-mobility-v7/performance-clock.py")
clock = importlib.util.module_from_spec(spec)
spec.loader.exec_module(clock)


def fingerprint(s):
    return hashlib.sha256(s.encode()).hexdigest()


def geometry_hooks(reference, candidate):
    start = reference.index("    function paintForeground(a,row){")
    end = reference.index("\nconst inside=", start)
    fn = reference[start:end].replace("function paintForeground", "function referenceForeground")
    clear = "if(!near.length){if(n.style.maskImage){n.style.maskImage=n.style.webkitMaskImage='';}continue;}"
    write = next(x.strip() for x in fn.splitlines() if x.strip().startswith("n.style.maskImage="))
    fn = clock.replace(fn, clear, "if(!near.length){auditReference(n,r,'');continue;}")
    fn = clock.replace(fn, write, "auditReference(n,r,url);")
    candidate = clock.replace(candidate, "function paintForeground(a,row,edits){", fn + """
    const expectedForeground=new Map();
    const proof=window.foregroundProof={reads:0,masked:0,clears:0,changedGeometry:0,maxGeometryCssPx:0,changedUrls:0,presenceChanges:0,errors:[]};
    function auditReference(n,r,url){
      expectedForeground.set(n,[r.left,r.top,r.width,r.height,url]);
    }
    function auditResult(n,r,url){
      const prev=expectedForeground.get(n),now=[r.left,r.top,r.width,r.height,url];
      const delta=prev?Math.max(...prev.slice(0,4).map((v,i)=>Math.abs(v-now[i]))):Infinity;
      proof.maxGeometryCssPx=Math.max(delta,proof.maxGeometryCssPx);
      if(delta)proof.changedGeometry++;
      if(prev&&Boolean(url)!==Boolean(prev[4]))proof.presenceChanges++;
      if(prev&&url!==prev[4])proof.changedUrls++;
      if(!prev||(window.holdForegroundPose&&(delta!==0||url!==prev[4]))){
        if(proof.errors.length<4)proof.errors.push({src:n.src,delta,urlEqual:prev?.[4]===url});
      }
      proof.reads++;if(url)proof.masked++;else if(n.style.maskImage)proof.clears++;
      expectedForeground.delete(n);
    }
    function paintForeground(a,row,edits){""")
    candidate = clock.replace(candidate, "if(!near.length){if(n.style.maskImage)edits", "if(!near.length){auditResult(n,r,'');if(n.style.maskImage)edits")
    candidate = clock.replace(candidate, "edits.push([n,url]);", "auditResult(n,r,url);edits.push([n,url]);")
    candidate = clock.replace(candidate, "if(row.paintStamp===stamp){onPosition", "if(row.paintStamp===stamp){if(batchForeground)referenceForeground(a,row);onPosition")
    candidate = clock.replace(candidate, "if(!batchForeground&&world&&scene.navigation", "if(batchForeground)referenceForeground(a,row);\n        if(!batchForeground&&world&&scene.navigation")
    # A diagnostic-only challenge puts one live sprite over an actual art
    # polygon; normal placement generally keeps the image clear. Restore its
    # original CSS and paint again to exercise clearing an active mask.
    candidate = clock.replace(candidate, "function referenceForeground(a,row){", """
    window.forceForegroundProbe=()=>{
      const a=model.snapshot()[0],row=rows.get(a.key),n=row.owner.querySelector('.character-asset');
      const vp=env.NaotocchiHomeViewport,p=vp?.residentPresentation?.(),host=displayRect(worldHost);
      const polygon=polygonsAt(a)[0];if(!polygon||!n)return false;
      const [ix,iy]=polygon.reduce(([x,y],[px,py])=>[x+px/polygon.length,y+py/polygon.length],[0,0]);
      const gx=p?p.x+(host.left+ix-p.x)*p.scaleX:host.left+ix,gy=p?p.y+(host.top+iy-p.y)*p.scaleY:host.top+iy;
      const old=n.style.translate, r=n.getBoundingClientRect();
      // Probe the actual parent's local unit basis, including mirrored sprites.
      n.style.translate='80px 0px';const rx=n.getBoundingClientRect();
      n.style.translate='0px 80px';const ry=n.getBoundingClientRect();
      const m=new env.DOMMatrix([(rx.left-r.left)/80,(rx.top-r.top)/80,(ry.left-r.left)/80,(ry.top-r.top)/80,0,0]);
      const d=new env.DOMPoint(gx-r.left-r.width/2,gy-r.top-r.height/2).matrixTransform(m.inverse());
      n.style.translate=d.x+'px '+d.y+'px';paint();n.style.translate=old;paint();return true;
    };
    function referenceForeground(a,row){""")
    return candidate


def measurements(browser, arm, base, sources, viewport, region, audit):
    page = browser.new_page(viewport={"width": viewport[0], "height": viewport[1]}, device_scale_factor=2, is_mobile=True, has_touch=True)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.add_init_script("(()=>{" + clock.INIT + "})();")

    def route(r):
        res = r.fetch()
        name = r.request.url.rsplit("/", 1)[-1]
        src = res.text()
        if "diorama" in name:
            src = geometry_hooks(sources['v7'], sources['v8']) if audit else sources[arm]
            src = clock.replace(src, "function paint(){", """
            mobilityPerf.advanceFrames=(frames)=>{
              let paintMs=0;performance.mark('foreground-replay-begin');
              for(let i=0;i<frames;i++){model.step(.13,{reducedMotion:false});const begin=performance.now();paint();paintMs+=performance.now()-begin;}
              performance.mark('foreground-replay-end');
              return {clock:model.metrics().clock,moves:model.metrics().moves,steps:frames,paintMs,feet:model.snapshot().map(a=>[a.key,a.x,a.y])};
            };
            function paint(){""")
        r.fulfill(response=res, body=clock.native(name, src, False))

    page.route("**/*production-model*.js*", route)
    page.route("**/*production-diorama*.js*", route)
    try:
        params = {"region":region,"count":28,"time":"day","season":"autumn","weather":"sunny","paused":1,"clock":0,
                  "variant":"B","policy":"B","layout":"optimized","curve":"linear","compareSplit":0,"ground":"on","diagnostics":0}
        page.goto(base+"/mobility-v7.html?"+urlencode(params), wait_until="domcontentloaded", timeout=120000)
        page.wait_for_function("mobilityPerf.scene && mobilityPerf.reset && HomeCastTrial.inspect().length===28",timeout=120000)
        page.evaluate("Promise.all([...document.querySelectorAll('#castStage img.character-asset')].map(e=>e.decode()))")
        cdp = None if audit else page.context.new_cdp_session(page)
        if cdp:
            cdp.send("Performance.enable")
        page.evaluate("mobilityPerf.reset(214); 0")
        keys = ["RecalcStyleCount", "LayoutCount", "RecalcStyleDuration", "LayoutDuration"]
        def metrics():
            return {m["name"]:m["value"] for m in cdp.send("Performance.getMetrics")["metrics"] if m["name"] in keys}
        before = metrics() if cdp else {}
        if audit:
            page.evaluate("HomeCastTrial.apply({paused:false});0")
            initial_reads=page.evaluate("foregroundProof.reads")
            page.wait_for_function("start=>foregroundProof.reads>=start+28*50",arg=initial_reads,timeout=180000)
            output={"nativeComparedBeforeChallenge":page.evaluate("foregroundProof.reads")-initial_reads,
                    "live":page.evaluate("structuredClone(foregroundProof)")}
            assert not output["live"]["errors"],output["live"]
            page.evaluate("""()=>{
              const style=document.createElement('style');
              style.textContent='*,*::before,*::after{animation-play-state:paused!important;transition-property:none!important}';
              document.head.appendChild(style);
              for(const a of document.getAnimations())a.pause();
              for(const svg of document.querySelectorAll('svg'))svg.pauseAnimations?.();
              for(const k in foregroundProof)foregroundProof[k]=k==='errors'?[]:0;
              window.holdForegroundPose=true;
            }""")
            page.wait_for_function("foregroundProof.reads>=28*30",timeout=180000)
        else:
            output=page.evaluate("mobilityPerf.advanceFrames(72)")
        if cdp:
            after = metrics()
            output["browserWork"]={k:after[k]-v for k,v in before.items()}
        if audit:
            output["forcedForeground"] = page.evaluate("forceForegroundProbe()")
            output["foreground"] = page.evaluate("foregroundProof")
            assert output["foreground"]["reads"]>=28*30 and not output["foreground"]["errors"],output["foreground"]
            if output["forcedForeground"]:
                assert output["foreground"]["masked"]>0,output["foreground"]
        assert not errors, errors
        return output
    finally:
        page.close()


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base",default="http://127.0.0.1:8388/game")
    p.add_argument("--out",type=Path,required=True)
    p.add_argument("--mode",choices=["work","parity"],required=True)
    a=p.parse_args()
    src={v:urlopen(a.base+"/home-production-diorama-mobility-"+v+".js").read().decode() for v in ["v7","v8"]}
    evidence={"controllerHashes":{k:fingerprint(v) for k,v in src.items()},"mode":a.mode,"rows":[]}
    with sync_playwright() as pw:
        audit=a.mode=="parity"
        engine=pw.webkit if audit else pw.chromium
        browser=engine.launch(executable_path=os.getenv("WEBKIT_PATH") if audit else os.getenv("CHROMIUM_PATH","/usr/bin/chromium"))
        evidence["browser"]=browser.version
        cases=[("v8",(390,792),"forest"),("v8",(844,390),"river_lake"),("v8",(320,568),"home"),("v8",(430,932),"city")] if audit else [(arm,(390,792),"forest") for arm in ("v7","v8","v8","v7")]
        for arm,view,region in cases:
            row=measurements(browser,arm,a.base,src,view,region,audit)
            row.update(arm=arm,view=view,region=region)
            evidence["rows"].append(row)
            a.out.write_text(json.dumps(evidence,separators=(",",":"))+"\n")
            print(arm,view,region,{k:v for k,v in row.items() if k not in ['feet']},flush=True)
        browser.close()
    if not audit:
        assert all(row["feet"]==evidence["rows"][0]["feet"] for row in evidence["rows"]),"controlled final feet differ"
