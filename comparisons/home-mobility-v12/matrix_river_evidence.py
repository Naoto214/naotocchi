"""Summarize each household member before and after a certified naturally occurring handoff."""
import argparse
import gzip
import json
import math
from pathlib import Path
import zipfile
from matrix_report_v12 import ARMS,HERE,REFERENCE,assisted_episodes,legacy,old,prior,v11


def distances(trip,scale):
    def dist(a,b):
        return math.hypot(*((x-y)*s for x,y,s in zip(a,b,scale,strict=True)))
    return dist(trip["from"],trip["to"]), dist(trip["from"],trip["goal"])-dist(trip["to"],trip["goal"])


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--archive",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    p.add_argument("--run",required=True)
    p.add_argument("--region",default="river_lake")
    p.add_argument("--residents",type=int,default=28)
    p.add_argument("--width",type=int,default=375)
    p.add_argument("--owner",default="companion:sekizou")
    p.add_argument("--helpers",type=int,default=2)
    p.add_argument("--fallback-clock",type=float,default=74.65)
    args=p.parse_args()
    with zipfile.ZipFile(args.archive) as z:
        name=f"{args.region}-{args.residents}-{args.width}.json.gz";raw=z.read(name);cell=json.loads(gzip.decompress(raw))
        manifest=json.loads(z.read("region.json"))
    old.require(manifest["complete"] and manifest["cells"][name]==old.digest(raw),"uncertified regional record")
    ages={arm:cell["arms"][arm]["aged"] for arm in ARMS}
    key=args.owner
    actual=list(assisted_episodes(cell,cell["arms"]["v12"]))
    chosen=next((r for r in actual if r["owner"]==key and r["stages"]==args.helpers),None)
    # Fixed before/after comparison if the same natural episode does not recur in the next candidate.
    boundary=chosen["start"] if chosen else args.fallback_clock
    events=[r for r in ages["v12"]["curve"] if r["type"] in ("search","plan","start","stop","owner") and r["owner"]==key]
    if chosen:
        end=next((r["clock"] for r in events if r["type"]=="owner" and r["clock"]>=boundary),boundary)
        details=[r for r in events if boundary-4<=r["clock"]<=end+.001]
        room=ages["v12"]["curve"]
        helper_keys=chosen["helpers"].split("|")
        actual_steps=[r for r in room if r["type"]=="native-step" and r["key"] in (key,*helper_keys) and boundary<=r["clock"]<=end+2]
    else:
        details=events;actual_steps=[]
    people={}
    for arm,aged in ages.items():
        scale=aged["drag"]["scale"]
        by_key={}
        for person in aged["final"]["residents"]:
            track=aged["tracks"][person["key"]]
            trips=[t for t in track["trips"] if t["end"] is not None and not t["escape"] and
                   (d:=distances(t,scale))[0]>=8-1e-7 and d[1]>.75]
            after=[t for t in trips if t["end"]>boundary+1e-6]
            span=max([0]+[min(y,300)-max(x,boundary) for x,y in track["stalls"] if y>boundary]+
                      ([] if track["openFailure"] is None else [300-max(boundary,track["openFailure"])]))
            by_key[person["key"]]={"normalBefore":len(trips)-len(after),"normalAfter":len(after),
                "firstNormalEndAfter":after[0]["end"] if after else None,"lastNormalEndAfter":after[-1]["end"] if after else None,
                "afterOwnDistanceCss":sum(t["cssDistance"] for t in after),"allRequests":person["ambientRequests"],
                "allPlanningFailures":person["ambientFailures"],"lastActivity":person["activity"],
                "givenYield":person["yieldsGiven"],"receivedYield":person["yieldsReceived"],"longestRouteFailureAfterSec":max(0,span)}
        people[arm]=by_key
    old.require(set(people[REFERENCE])==set(people["v12"]) and len(people[REFERENCE])==args.residents,"different actual residents")
    result={"run":args.run,"source":manifest["revision"],"region":cell["region"],"count":cell["count"],"width":cell["width"],
            "zipSHA256":old.digest(args.archive.read_bytes()), "rawCellSHA256":old.digest(raw),
            "initialStateSHA256":cell["arms"][REFERENCE]["alignedOpeningSHA256"],"clock":boundary,"episode":chosen,
            "events":details,"actualSteps":actual_steps,"allRegionHouseholdEpisodes":actual,
            "residents":{k:{arm:people[arm][k] for arm in ARMS} for k in people[REFERENCE]}}
    legacy.write_json(args.out,result)
    print("same original episode",bool(chosen),"actual annotated residents",len(result["residents"]))
    focus=[key]+(chosen["helpers"].split("|") if chosen else [])
    print({k:result["residents"][k] for k in focus})


if __name__=="__main__":
    main()
