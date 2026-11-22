"""Measure a naturally occurring renderer sync and its containing frame in the native narrow home."""
import argparse
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
V10 = HERE.parent / "home-mobility-v10"
sys.path.insert(0, str(V10))
import performance_common as common

gates = common.load("native_gate_v10_notice", V10 / "native-gates.py")

OBSERVE = """
    function sync(){
      const observer=mobilityPerf.notice;
      if(!observer)return noticeNativeSync();
      const oldOwners=new Map([...rows].map(([key,row])=>[key,row.owner]));
      const oldFeet=new Map(model.snapshot().map(a=>[a.key,a]));
      const projection=world?.stats().projectionRevision;
      const start=performance.now();
      try {return noticeNativeSync();}
      finally {
        const end=performance.now(), scale=scene?.navigation?.intentScale;
        const rebound=[...rows].filter(([key,row])=>oldOwners.has(key)&&oldOwners.get(key)!==row.owner).map(([key])=>key);
        const changed=[];
        if(scale)for(const a of model.snapshot()){
          const old=oldFeet.get(a.key);if(!old)continue;
          const distance=Math.hypot((a.x-old.x)*scale.x,(a.y-old.y)*scale.y);
          if(distance>1e-4)changed.push({key:a.key,distance,from:[old.x,old.y],to:[a.x,a.y]});
        }
        observer.push({start,end,duration:end-start,rebound,changed,
          region:scene?.region,projectionBefore:projection,projectionAfter:world?.stats().projectionRevision,
          gate:mobilityPerf.nativeGateReasons()});
      }
    }
    function noticeNativeSync(){"""

SAMPLE = """
async seconds=>{
 const q=mobilityPerf;
 HomeCastTrial.apply({paused:false});
 const model=q.reset(214);
 const opening=model.snapshot().map(a=>[a.key,a.x,a.y,a.w,a.h]);
 const start=performance.now(),before=model.metrics();
 const intervals=[];let prior=start;
 q.notice=[];
 await new Promise(done=>{
   const sample=()=>{const now=performance.now();intervals.push(now-prior);prior=now;
     if(now-start>=seconds*1000)done();else q.nativeRaf(sample);};
   q.nativeRaf(sample);
 });
 const syncs=q.notice; q.notice=null;
 const after=model.metrics();
 for(const s of syncs){s.start-=start;s.end-=start;}
 return {start,opening,intervals,syncs,clockSeconds:after.clock-before.clock,
    distance:after.distance-before.distance,moves:after.moves-before.moves,
    closingKeys:model.snapshot().map(a=>a.key),elapsedMs:prior-start};
}
"""


def run(args):
    def attach(name, body):
        if "production-diorama" in name:
            return common.clock.replace(body, "    function sync(){", OBSERVE)
        return body
    with sync_playwright() as pw:
        browser = pw.webkit.launch(executable_path=common.WPE)
        gate = gates.GateBrowser(browser)
        page, errors, assets = common.native_page(gate, args.base, args.arm, transform=attach, view=(320, 792))
        try:
            page.evaluate("HomeCastTrial.apply({paused:false});0")
            page.wait_for_timeout(1500)
            sample = page.evaluate(SAMPLE, args.seconds)
            assert not errors and len(sample["opening"]) == 28
            assert sorted(p[0] for p in sample["opening"]) == sorted(sample["closingKeys"])
            assert sample["clockSeconds"] > 0 and sample["elapsedMs"] >= args.seconds * 1000
            samples = sample["intervals"]
            cumulative = 0
            frames = []
            for duration in samples:
                frames.append((cumulative, cumulative+duration))
                cumulative += duration
            for event in sample["syncs"]:
                overlapping = [(begin, end) for begin, end in frames if begin <= event["end"] and event["start"] <= end]
                event["containingFramesMs"] = [b-a for a,b in overlapping]
            common.save(args.out, dict(arm=args.arm, browser=browser.version, viewport=[320,792], seed=214,
                                        assets={**assets, **gate.source}, distribution=common.distribution(samples), sample=sample))
        finally:
            page.close()
            browser.close()


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base", default="http://127.0.0.1:8377/game")
    p.add_argument("--arm", choices=["v10","v11-foot","v11"], required=True)
    p.add_argument("--seconds", type=float, default=330)
    p.add_argument("--out", type=Path, required=True)
    run(p.parse_args())
