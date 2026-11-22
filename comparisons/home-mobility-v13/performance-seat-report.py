"""Validate the extra 375px seat guard, input and ordinary workload on its own two runners."""
import argparse
import hashlib
import json
import runpy
import zipfile
from pathlib import Path

HERE=Path(__file__).resolve().parent
helpers=runpy.run_path(str(HERE/"performance-report.py"))
sha=helpers["sha"]
stats=helpers["stats"]
old=helpers["old"]


def report(directory, game, out, touch_archive=None):
    receipt=json.loads((directory/"receipt.json").read_bytes())
    jobs=[j for j in receipt["jobs"] if "seat-375" in j["name"]]
    assert len(jobs)==2 and all(j["conclusion"]=="success" for j in jobs)
    seat_archives=[a for a in receipt["archives"] if "-seat-375-" in a["name"]]
    assert len(seat_archives)==2
    result=dict(run=receipt["run"],url=receipt["url"],commit=receipt["commit"],archives=seat_archives,assets={},sources={},measures=[])
    replacement={}
    if touch_archive:
        other=json.loads((touch_archive/"receipt.json").read_bytes())
        assert other["complete"] and other["conclusion"]=="success"
        result["touchRun"]={k:other[k] for k in ("run","url","commit")}
        inputs=[a for a in other["archives"] if "-touch-375-" in a["name"]]
        assert len(inputs)==2
        result["touchArchives"]=inputs
        for item in inputs:
            file=touch_archive/item["name"]
            assert sha(file.read_bytes())==item["sha256"] and file.stat().st_size==item["bytes"]
            with zipfile.ZipFile(file) as z:
                [name]=z.namelist();replacement[name]=z.read(name)
    commands=None
    opening={}
    for archive in seat_archives:
        order=archive["name"].rsplit("-",1)[-1].split(".")[0]
        arms=["v13-c","v13-d"] if order=="forward" else ["v13-d","v13-c"]
        path=directory/archive["name"]
        assert sha(path.read_bytes())==archive["sha256"] and path.stat().st_size==archive["bytes"]
        with zipfile.ZipFile(path) as z:
            assert len(z.namelist())==4
            for kind in ["seating","live","trace","touch"]:
                name=f"{kind}-375-{order}.json";raw=replacement.get(name) or z.read(name);data=json.loads(raw);result["sources"][name]=sha(raw)
                assert data["width"]==375 and [r["arm"] for r in data["rows"]]==arms
                assert result.setdefault("browser",data["browser"])==data["browser"]
                if kind=="touch":
                    tape=(HERE/"performance-touch-controls.json").read_bytes()
                    assert data["controlsSHA256"]==sha(tape)
                    commands=commands or data["controls"];assert commands==data["controls"]==json.loads(tape)["widths"]["375"]["controls"]
                for row in data["rows"]:
                    for n,h in row["assets"].items():
                        assert (game/n).is_file() and sha((game/n).read_bytes())==h and result["assets"].setdefault(n,h)==h,n
                    arm=row["arm"]
                    item=dict(suite=kind,order=order,arm=arm)
                    if kind=="seating":
                        runs=row["observations"]
                        assert len(runs)==6 and all(len(r["opening"])==28 for r in runs)
                        fingerprint=old["fingerprint"](runs[0]["opening"])
                        assert all(old["fingerprint"](r["opening"])==fingerprint for r in runs)
                        assert opening.setdefault(arm,fingerprint)==fingerprint
                        passes=[p for r in runs for p in r["passes"]]
                        item.update(boot=row["boot"],passes=passes,resetMs=stats([r["ms"] for r in runs]),opening=fingerprint,
                                    guardMs=stats([p["ms"] for p in passes]),applied=sum(p["changed"] for p in passes))
                        assert (len(passes)==6 if arm=="v13-d" else not passes)
                    elif kind=="touch":
                        readings=row["readings"];assert all(r["trusted"] for r in readings)
                        assert [r["command"] for r in readings]==[c for c in commands if c["start"]]
                        selected=[r for r in readings if r.get("key")==r["command"]["key"]]
                        moved=[r for r in selected if r["firstStepMs"] is not None]
                        item.update(issued=len(readings),selected=len(selected),moved=len(moved),arrived=sum(r["arrivalMs"] is not None for r in moved),
                                    onsetMs=stats([r["firstStepMs"] for r in moved]))
                    else:
                        s=row["sample"]; assert s["retained"] and s["visibleAtOpen"]==s["visibleAtEnd"]==28
                        assert not s["diagnostics"]["enabled"] and s["elapsedMs"]>=1000*(180 if kind=="live" else 40)
                        item.update(moves=s["moves"],distance=s["distance"],modelSeconds=s["clock"],events=s["events"],cpuMs=old["thread_delta"](row["os"][0],row["os"][-1]))
                        if kind=="live":
                            item["frames"]=stats(s["intervals"]);assert row["distribution"]==item["frames"]
                        else:item["parts"]={k:v for k,v in s["audit"]["parts"].items() if k in old["PHASES"]}
                    result["measures"].append(item)
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(result,ensure_ascii=False,indent=1)+"\n")
    print("375px",len(result["measures"]),"native datasets verified on",receipt["commit"])
    return result


if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__);p.add_argument("archive",type=Path);p.add_argument("--game",required=True,type=Path);p.add_argument("--out",type=Path,default=HERE/"evidence/performance-seat.json")
    p.add_argument("--touch-archive",type=Path,help="Final matched coordinate rerun")
    a=p.parse_args();report(a.archive,a.game,a.out,a.touch_archive)
