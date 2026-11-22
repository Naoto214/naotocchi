"""Summarise paired native trajectories and browser endpoint evidence without treating a request as a walk."""
import argparse
import hashlib
import json
import math
from pathlib import Path

def load(path):
    return json.loads(path.read_bytes())

def save(path, payload):
    path.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n")

def native(raw,dest):
    results=[]
    prefix=raw/"goal-after"
    for path in sorted(prefix.glob("ray-???-*-home.json")):
        width,seed=map(int,path.stem.split("-")[1:3])
        counterpart=raw/"goal-profiles"/f"baseline-{width}-{seed}.household.json"
        if not counterpart.is_file():counterpart=prefix/f"untouched-{width}-{seed}-home.json"
        old,now=load(counterpart),load(path)
        attempts=load(prefix/f"ray-{width}-{seed}.json")
        assert old["width"]==now["width"]==width and old["seed"]==now["seed"]==seed
        diffs=[]
        for key in sorted(set(r["key"] for r in old["records"])|set(r["key"] for r in now["records"])):
            def row(h):
                a=next((r for r in h["records"] if r["key"]==key),{})
                return dict(walks=a.get("walks",0),distance=round(a.get("distance",0),5),requests=a.get("requests",0))
            r1,r2=row(old),row(now)
            if r1!=r2:diffs.append(dict(key=key,original=r1,ray=r2))
        def summary(h):
            return dict(walkers=h["strict"],repeat=h["repeated"],walks=h["walks"],
                        distance=round(sum(r["distance"] for r in h["records"]),4))
        results.append(dict(width=width,seed=seed,seconds=600,modelSHA256=now["sourceSHA256"],original=summary(old),
                            ray=summary(now),originalUnchangedResidents=28-len(diffs),changedResidents=diffs,
                            postRefusalCalls=attempts["refusals"],offers=attempts["rows"],wallTotalMs=attempts["totalMs"],wallMaxMs=attempts["slowest"]))
    save(dest/"goal-post-refusal-households.json",results)
    original=load(prefix/"positive-cold-original.json")
    ray=load(prefix/"positive-cold-ray.json")
    assert original["before"]==ray["before"]
    assert original["nativeRequestReturned"] is False and ray["nativeRequestReturned"] is True
    origin,goal=ray["before"]["foot"],ray["before"]["request"]
    end=ray["nativeArrival"]["foot"];sx,sy=ray["before"]["cssScale"]
    def dist(a,b):return math.hypot((a[0]-b[0])*sx,(a[1]-b[1])*sy)
    cert=dict(width=320,forestSeed=214,opening="comparisons/home-mobility-v10/evidence/native-scene-320.json",
              openingSHA256=hashlib.sha256((Path(__file__).resolve().parent/"../home-mobility-v10/evidence/native-scene-320.json").read_bytes()).hexdigest(),
              originalSource=original["source"],raySource=ray["source"],before=ray["before"],
              originalDeclined=not original["nativeRequestReturned"],offered=ray["offer"],nativeArrival=ray["nativeArrival"],
              steps=ray["steps"],netCssPx=dist(end,origin),gainTowardOriginalCssPx=dist(origin,goal)-dist(end,goal),
              originalPlannerMs=ray["originalRequestBeforeFallbackMs"],warmQueryMs=ray["warmQueryMs"])
    save(dest/"goal-forward-witness.json",cert)

def browser(raw,dest):
    topology=[]
    for f in sorted((raw/"goal-connect/live").glob("*.json")):
        d=load(f);top=d["audit"];pts=top["points"]
        topology.append(dict(region=d["region"],count=d["count"],width=d["width"],movesChecked=d["safety"]["steps"],
                             **{k:v for k,v in top.items() if k!="points"},
                             unresolvedNativePlans=sum(not p["connected"] and p.get("accepted",False) for p in pts),
                             unresolvedPartialArrivals=sum(not p["connected"] and p.get("arrived",False) for p in pts),
                             unresolvedCheckedReplacements=sum(not p["connected"] and bool(p["alt"]) for p in pts)))
    save(dest/"goal-regional-connectivity.json",topology)
    entries=[]
    for folder in ["live","smaller","ray-live"]:
        for f in sorted((raw/"goal-after"/folder).glob("*.json")):
            d=load(f);entries.append(dict(scope=folder,region=d["region"],count=d["count"],width=d["width"],
                                          mode=d["mode"],genuineDeclines=d["declines"],offers=d["offers"],safety=d["safety"]))
    paired=raw/"goal-after/paired-watcher-390.json"
    combo=None
    if paired.exists():
        p=load(paired)
        combo=dict(region=p["region"],width=p["width"],count=p["count"],arms={})
        for mode,v in p["arms"].items():
            trips=[(t,m) for t in v["trips"].values() for m in t["trips"] if m["end"] is not None and not m["escape"]]
            combo["arms"][mode]=dict(openingSHA256=v["openingSHA256"],genuineDeclines=v["declines"],offers=v["offers"],safety=v["safety"],
                                     completedNonEscapeRoutes=len(trips))
    save(dest/"goal-regional-refusals.json",dict(independentRooms=entries,sameOpening=combo))

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("raw",type=Path)
    parser.add_argument("dest",type=Path)
    args=parser.parse_args()
    native(args.raw,args.dest);browser(args.raw,args.dest)
