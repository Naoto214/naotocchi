"""Feed one native V8 model capture and matching CSS/SVG phase to each native painter."""
import argparse
import gzip
import json
from pathlib import Path
from urllib.request import urlopen
from playwright.sync_api import sync_playwright
from performance_common import ARMS, HERE, WPE, clock, digest, distribution, native_page, save

HOLD = """
for(const name of ['requestAnimationFrame','setTimeout','setInterval']){
 const original=window[name];
 window[name]=function(fn,...args){
   return original.call(this,typeof fn!=='function'?fn:function(...v){if(!window.holdGameTasks)return fn.apply(this,v)},...args);
 };
}
"""


def extract(source, start, end):
    a=source.index(start)
    return source[a:source.index(end,a)]


def painters(base):
    bodies={}
    fingerprints={}
    for arm in ARMS:
        source=urlopen(f"{base}/home-production-diorama-mobility-{arm}.js").read().decode()
        fingerprints[arm]=digest(source)
        foreground=extract(source,"    function foregroundProjection(" if "    function foregroundProjection(" in source
                           else "    function paintForeground(","\nconst inside=")
        paint=extract(source,"    function paint(){","    function stop(){")
        extra=extract(source,"    function paintAttribute(","    function sync(){") if "function paintAttribute(" in source else ""
        bodies[arm]="(()=>{"+extra+foreground+paint+"return paint;})()"
    return "{"+",".join(f"{arm}:{body}" for arm,body in bodies.items())+"}",fingerprints


def packed(path, value):
    with gzip.GzipFile(str(path), "wb", mtime=0) as f:
        f.write(json.dumps(value,separators=(",",":")).encode())


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base",default="http://127.0.0.1:8377/game")
    parser.add_argument("--out",type=Path,required=True)
    parser.add_argument("--frames",type=int,default=480)
    parser.add_argument("--warmup",type=int,default=48)
    parser.add_argument("--order",default="v7,v8,v9,v9,v8,v7")
    a=parser.parse_args()
    assert a.frames>a.warmup>0
    a.out.parent.mkdir(parents=True,exist_ok=True)
    extracts,hashes=painters(a.base)
    inject=(HERE/"performance-fixed.js").read_text().replace("PAINTERS",extracts)
    def transform(name, source):
        if "production-diorama" in name:
            source=clock.replace(source,"    function stop(){",inject+"\n    function stop(){")
        return source
    with sync_playwright() as pw:
        browser=pw.webkit.launch(executable_path=WPE)
        page,errors,sources=native_page(browser,a.base,"v8",init=HOLD,transform=transform)
        page.wait_for_timeout(1200)
        fixture=page.evaluate("n=>fixedCast.capture(n,214)",a.frames)
        poses=fixture.pop("pose")
        assert len(fixture["initial"])==28 and all(len(x)==28 for x in poses) and fixture["moving"]
        packed(a.out.parent/"fixed-poses.json.gz",poses)
        proof=digest(json.dumps(poses,separators=(",",":")))
        result=dict(browser=browser.version,controllerSHA256=hashes,assets=sources,seed=214,frames=a.frames,
                    warmup=a.warmup,stepSeconds=.12,fixture=fixture,posesSHA256=proof,rows=[])
        sampling=[]
        def mark(js):
            sampling[-1].begin(js)
        page.expose_function("markSampling",mark)
        reference=None
        for arm in a.order.split(","):
            probe=clock.Scheduler(.12)
            sampling.append(probe)
            try:
                row=page.evaluate("([arm,n])=>fixedCast.run(arm,n)",[arm,a.warmup])
            finally:
                probe.end()
            phases=row.pop("motionSteps")
            if reference is None:
                reference=phases
                packed(a.out.parent/"fixed-animation-phases.json.gz",phases)
            different=[i for i,(left,right) in enumerate(zip(reference,phases)) if left!=right]
            row.update(arm=arm,phaseSHA256=digest(json.dumps(phases,separators=(",",":"))),
                       phaseDifferences=different,distribution=distribution(row["intervals"]),
                       cpu=[probe.rows[0],probe.rows[-1]] if probe.rows else [])
            result["rows"].append(row)
            save(a.out,result)
            assert not errors and row["cast"]==28 and row["art"] and len(row["intervals"])==a.frames-a.warmup
            assert not different,(arm,different[:3],[(reference[i],phases[i]) for i in different[:1]])
            print(arm,row["distribution"],flush=True)
        browser.close()
