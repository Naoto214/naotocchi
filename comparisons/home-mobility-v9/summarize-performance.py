"""Summarize the three CI archives, retaining all measured frame intervals compactly."""
import argparse
import csv
import gzip
import json
from pathlib import Path
from performance_common import ARMS, digest, distribution, save


def read(path):
    return json.loads(path.read_text())


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("directory",type=Path,help="unpacked native experiment archives, recursively")
    p.add_argument("out",type=Path)
    p.add_argument("--private",type=Path,required=True,help="owner-only archival destination for all raw compressed observations")
    p.add_argument("--run",required=True)
    a=p.parse_args()
    a.out.mkdir(parents=True,exist_ok=True)
    a.private.mkdir(parents=True,exist_ok=True)
    sources={}
    def result(name):
        files=list(a.directory.rglob(name+".json"))
        assert len(files)==1,files
        raw=files[0].read_bytes()
        sources[name]=digest(raw)
        with gzip.GzipFile(str(a.private/(files[0].name+".gz")),"wb",mtime=0) as compressed:
            compressed.write(raw)
        return read(files[0])
    fixed=result("fixed")
    assert [r["arm"] for r in fixed["rows"]]==ARMS+ARMS[::-1]
    assert len({r["phaseSHA256"] for r in fixed["rows"]})==1
    phase=fixed["rows"][0]["phaseSHA256"]
    first=fixed["rows"][0]
    assert len(fixed["fixture"]["initial"])==28 and all(r["cast"]==28 and
        r["activeByFrame"]==first["activeByFrame"] and not r["phaseDifferences"] for r in fixed["rows"])
    fixedInfo={k:fixed[k] for k in ["browser","controllerSHA256","seed","frames","warmup","stepSeconds","posesSHA256","fixture"]}
    fixedInfo.update(phaseSHA256=phase,peakConcurrentWalkers=max(first["activeByFrame"]),
                     averageConcurrentWalkers=sum(first["activeByFrame"])/len(first["activeByFrame"]),rows=[])
    raw=[]
    for r in fixed["rows"]:
        begin,end=r["cpu"]
        fixedInfo["rows"].append(dict(arm=r["arm"],distribution=r["distribution"],art=r["art"],svgAnimations=r["svgAnimations"],
            wallMs=round(sum(r["intervals"]),1),threadCPUms={k:round(end[5][k]-begin[5][k],1) for k in end[5].keys() & begin[5].keys()},
            hostThrottleEvents=end[2]-begin[2]))
        raw.append(["fixed",r["arm"],r["intervals"]])
    native={}
    checks=set()
    hashes={}
    for name in ["forward","reverse","trace"]:
        data=result(name)
        assert data["browser"]==fixed["browser"]
        assert [r["arm"] for r in data["rows"]]==(ARMS[::-1] if name=="reverse" else ARMS)
        native[name]=[]
        for r in data["rows"]:
            s=r["sample"]
            assert len(s["opening"])==28 and (s["visibleAtOpen"],s["visibleAtEnd"])==(28,28) and s["retained"]
            assert s["clock"]>0 and not s["diagnostics"]["enabled"] and s["elapsedMs"]>=data["seconds"]*1000
            assert r["distribution"]==distribution(s["intervals"])
            checks.add(json.dumps(s["opening"]))
            for filename,sha in r["assets"].items():
                assert hashes.setdefault(filename,sha)==sha
            longest=r["longest"]
            assert longest["duration"]==s["max"],(longest,s["max"])
            entry=dict(arm=r["arm"],distribution=r["distribution"],clock=s["clock"],moves=s["moves"],distance=s["distance"],
                social=s["events"].get("social",0),elapsedMs=s["elapsedMs"],warmupSeconds=data["warmupSeconds"],
                longest=dict(threadCPUms=longest["webThreadCpuMs"],alignmentErrorMs=longest["osRangeErrorMs"],range=longest["range"]))
            first_os,last_os=r["os"][0],r["os"][-1]
            entry.update(threadCPUms={k:round(last_os[5][k]-first_os[5][k],2) for k in last_os[5].keys() & first_os[5].keys()},
                         hostThrottleEvents=last_os[2]-first_os[2],minutes=s["minutes"])
            if name=="trace":
                entry.update(parts={k:v for k,v in s["audit"]["parts"].items() if " " not in k},calls=s["audit"]["counts"])
            raw.append([name,r["arm"],s["intervals"]])
            native[name].append(entry)
    assert checks=={json.dumps(fixed["fixture"]["initial"])},"fixed and native starting feet differ"
    for arm in ARMS:
        name=f"home-production-diorama-mobility-{arm}.js"
        assert hashes[name]==fixed["controllerSHA256"][arm],name
    touch=result("touch");pixels=result("pixels")
    assert pixels["controllers"]==fixed["controllerSHA256"]
    assert touch["browser"]==pixels["webkit"]==fixed["browser"]
    assert len(touch["rows"])==3 and all(r["trusted"] for row in touch["rows"] for r in row["readings"])
    assert len(pixels["rows"])==2 and all(r["masksEqual"] and not any(r["differences"]) for r in pixels["rows"])
    out=dict(run=a.run,sourceSHA256=sources,nativeAssets=hashes,fixed=fixedInfo,native=native,touch=touch,pixels=pixels)
    save(a.out/"performance.json",out)
    save(a.private/"summary.json",out)
    for filename in ["fixed-poses.json.gz","fixed-animation-phases.json.gz"]:
        files=list(a.directory.rglob(filename))
        assert len(files)==1
        (a.private/filename).write_bytes(files[0].read_bytes())
    with gzip.GzipFile(str(a.private/"performance-intervals.json.gz"),"wb",mtime=0) as file:
        file.write(json.dumps(raw,separators=(",",":")).encode())
    with (a.private/"frame-summary.csv").open("w",newline="") as file:
        writer=csv.writer(file)
        writer.writerow(["workload","order","arm","frames","median_ms","p95_ms","p99_ms","max_ms","over250","over500","over1000","moves","distance"])
        for i,r in enumerate(fixedInfo["rows"]):
            d=r["distribution"]
            writer.writerow(["fixed","forward" if i<3 else "reverse",r["arm"],*[d[k] for k in ("n","p50","p95","p99","max","over250","over500","over1000")],"",""])
        for order in ["forward","reverse"]:
            for r in native[order]:
                d=r["distribution"]
                writer.writerow(["autonomy",order,r["arm"],*[d[k] for k in ("n","p50","p95","p99","max","over250","over500","over1000")],r["moves"],r["distance"]])
    save(a.private/"index.json",{"sourceRun":a.run,"files":{f.name:digest(f.read_bytes()) for f in sorted(a.private.iterdir()) if f.is_file() and f.name!="index.json"}})
    print("Retained",sum(len(r[2]) for r in raw),"intervals;",len(native["trace"]),"phase traces.")

if __name__=="__main__":
    main()
