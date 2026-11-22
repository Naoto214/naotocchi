"""Certify GitHub's regional ZIPs and compare the same seedlings, native living and restored physical input."""
import argparse
from collections import Counter
import gzip
import json
import math
from pathlib import Path
import zipfile

from matrix_worker_v12 import ARMS, BASE_SHA, HERE, REFERENCE, old, prior, validate
import matrix_report_v11 as v11

metrics = v11.metrics
legacy = v11.prior
FIELDS = v11.FIELDS
BENCHMARK = dict(zip(FIELDS,(3215,910,521,246,2,235),strict=True))
ID = v11.ID


def read_cells(args, receipt):
    source = dict.fromkeys(old.REGIONS,args.run)
    for entry in args.recovery:
        region,run = entry.split("=",1)
        old.require(region in source, "unknown recovery region")
        source[region] = run
    runs = {run:v11.inspect_run(run) for run in set(source.values())}
    receipt["runs"] = {run:record[0] for run,record in runs.items()}
    tape = prior.v9.history()
    historical = json.loads((prior.HERE / "evidence/matrix-receipt.json").read_bytes())
    for region in old.REGIONS:
        run = source[region]
        state,jobs,items = runs[run]
        job = jobs[f"region ({region})"]
        old.require(job["conclusion"] == "success", f"{region}/{run} not successful")
        info = items["mobility-v12-" + region]
        path = args.archives/run/f"mobility-v12-{run}-{region}.zip"
        raw = path.read_bytes()
        digest = old.digest(raw)
        old.require("sha256:"+digest == info["digest"] and len(raw)==info["size_in_bytes"], "official ZIP checksum differs")
        previous = historical["regions"][region]
        old_path = args.v11_archives / f"mobility-v11-{previous['run']}-{region}.zip"
        old.require(old.digest(old_path.read_bytes()) == previous["sha256"], "V11 ZIP differs")
        receipt["regions"][region] = {"run":run,"job":job["databaseId"],"artifact":info["id"],"bytes":len(raw),
            "sha256":digest,"url":state["url"]+"/artifacts/"+str(info["id"]),"previousRun":previous["run"],"previousSHA256":previous["sha256"]}
        with zipfile.ZipFile(path) as archive, zipfile.ZipFile(old_path) as reference:
            manifest = json.loads(archive.read("region.json"))
            names = {f"{region}-{n}-{w}.json.gz" for n in old.COUNTS for w in old.WIDTHS}
            old.require(manifest["base"] == BASE_SHA and manifest["complete"] and manifest["revision"]==state["headSha"] and
                        manifest["region"] == region and set(manifest["cells"])==names and set(archive.namelist())==names|{"region.json"},
                        "incomplete or mislabeled regional results")
            old.require(manifest["historicalInputsSHA256"]==old.digest(old.HISTORY.read_bytes()) and
                        manifest["agedSubjectsSHA256"]==old.digest(prior.baseline.v8.SUBJECTS.read_bytes()), "historical subjects or finger inputs changed")
            old.require(receipt.setdefault("extraSources",manifest["extraSources"])==manifest["extraSources"],
                        "loaded world modules or owner observer differ between sessions")
            for name in sorted(names):
                packed = archive.read(name)
                old.require(old.digest(packed)==manifest["cells"][name], "cell release digest mismatch")
                cell = json.loads(gzip.decompress(packed))
                before = json.loads(gzip.decompress(reference.read(name)))
                validate(cell,tape)
                for arm,data in cell["arms"].items():
                    identification = {"scripts":data["hashes"], "entry":manifest["entries"][arm]}
                    old.require(receipt["identity"].setdefault(arm,identification)==identification and data["browser"]==manifest["browser"],
                                "mixed native code or browser")
                prior_arm = before["arms"][REFERENCE]
                old.require(cell["arms"][REFERENCE]["opening"]==prior_arm["opening"] and cell["arms"][REFERENCE]["hashes"]==prior_arm["hashes"],
                            "reference art, placement or game bytes differ")
                yield cell,before


def add_group(cells):
    result = []
    for arm,(residents,inputs,aged,targets) in cells.items():
        for scope,values in (("all",("all",)),("region",old.REGIONS),("count",old.COUNTS),("width",old.WIDTHS)):
            for value in values:
                collections = (residents,inputs,aged,targets)
                selected = collections if scope=="all" else [[r for r in group if r[scope]==value] for group in collections]
                result.append({"group":scope,"value":value,"arm":arm,**legacy.digest_group(*selected)})
    return result


def participants(events):
    owners = {e["owner"] for e in events if e["type"]=="start"}
    helpers = {e["helper"] for e in events if e["type"]=="start"}
    return owners,helpers


def curve_counts(events):
    count=Counter(e["type"] for e in events)
    plans=[e for e in events if e["type"]=="plan" and e.get("found")]
    return {"searches":count["search"], "finishedSearches":count["plan"], "foundPlans":len(plans),
            "plannedOneHelper":sum(len(e["stages"])==1 for e in plans),
            "plannedTwoHelpers":sum(len(e["stages"])==2 for e in plans),
            "helperStarts":count["start"], "ownerRechecked":count["owner"],
            "ownerAccepted":sum(e["type"]=="owner" and bool(e.get("accepted")) for e in events),
            "nativeYieldHops":sum(e["type"]=="native-step" and e["source"]=="yield" for e in events)}


def assisted_episodes(cell, data):
    """Join actual first helper starts to native helper footsteps and the owner's autonomous trip."""
    aged = data["aged"]
    records = aged["curve"]
    sx,sy = aged["drag"]["scale"]
    def xy(p):
        return (p["x"],p["y"]) if isinstance(p,dict) else p
    def distance(p,q):
        x,y = xy(p)
        u,v = xy(q)
        return math.hypot((x-u)*sx,(y-v)*sy)
    for index,event in enumerate(records):
        if event["type"]!="start" or event["stage"]!=0:
            continue
        owner, start = event["owner"],event["clock"]
        end = min(start+35,aged["final"]["modelSeconds"])
        later = []
        for r in records[index+1:]:
            if r["clock"]>end or (r["type"]=="start" and r["stage"]==0 and r["owner"]==owner):
                break
            later.append(r)
        helpers={s["key"]:s for s in event["stages"]}
        steps=[r for r in later if r["type"]=="native-step" and r["source"]=="yield" and r["key"] in helpers]
        stops={key:any(r["key"]==key and distance(r["to"],stage["to"])<.01 for r in steps) for key,stage in helpers.items()}
        recheck=next((r for r in later if r["type"]=="owner" and r["owner"]==owner),None)
        trip=None
        if recheck and recheck["accepted"]:
            trip=next((t for t in aged["tracks"][owner]["trips"] if abs(t["start"]-recheck["clock"])<1e-6),None)
        completed=trip is not None and trip["end"] is not None
        original_gain=distance(trip["from"],event["goal"])-distance(trip["to"],event["goal"]) if completed else None
        displacement=distance(trip["from"],trip["to"]) if completed else None
        yield {**v11.label(cell),"owner":owner,"source":event["source"],"start":start,"helpers":"|".join(helpers),
              "hasTurn":any(bool(s.get("via")) for s in helpers.values()),"stages":len(helpers),
              "startedHelpers":len({event["helper"],*(r["helper"] for r in later if r["type"]=="start" and r["owner"]==owner)}),
              "steppedHelpers":len({r["key"] for r in steps}),"steps":len(steps),"helperDistanceCss":sum(distance(r["from"],r["to"]) for r in steps),
              "completedHelperEndpoints":sum(stops.values()),"ownerRechecked":bool(recheck),"accepted":bool(recheck and recheck["accepted"]),
              "observedOwnerTrip":trip is not None,"arrived":completed,"originalGain":original_gain,"displacement":displacement,
              "normalTowardOriginal":bool(completed and not trip["escape"] and displacement>=8-1e-7 and original_gain>.75),
              "endsAtFiveMinuteBoundary":end>=aged["final"]["modelSeconds"]-1e-6}


def walk_effects(cell, people_by_arm, archived):
    ref,new=people_by_arm[REFERENCE],people_by_arm["v12"]
    events=cell["arms"]["v12"]["aged"]["curve"]
    owners,helpers=participants(events)
    for key,baseline in ref.items():
        candidate=new[key]
        yield {**v11.label(cell),"key":key,"curvedHelper":key in helpers,"curvedOwner":key in owners,
            "archivedNormal":archived[key]["normalCompletions"],"refNormal":baseline["normalCompletions"],"v12Normal":candidate["normalCompletions"],
            "refActualStarts":baseline["actualStarts"],"v12ActualStarts":candidate["actualStarts"],
            "refLongestRefusalSec":baseline["longestRefusalToNormalSec"],"v12LongestRefusalSec":candidate["longestRefusalToNormalSec"],
            "refYieldsGiven":baseline["givenYield"],"v12YieldsGiven":candidate["givenYield"],
            "refYieldsReceived":baseline["receivedYield"],"v12YieldsReceived":candidate["receivedYield"],
            "refRequests":baseline["requests"],"v12Requests":candidate["requests"],
            "refPlanFailures":baseline["planningFailures"],"v12PlanFailures":candidate["planningFailures"],
            "refLastActivity":baseline["lastActivity"],"v12LastActivity":candidate["lastActivity"]}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--run",required=True)
    p.add_argument("--recovery",nargs="*",default=[])
    p.add_argument("--archives",type=Path,required=True)
    p.add_argument("--v11-archives",type=Path,required=True)
    p.add_argument("--private-data",type=Path,required=True)
    p.add_argument("--out",type=Path,default=HERE/"evidence")
    args=p.parse_args()
    args.private_data.mkdir(parents=True,exist_ok=True)
    args.out.mkdir(parents=True,exist_ok=True)
    datasets={mode:{a:([],[],[],[]) for a in ARMS} for mode in ("matched","native")}
    safety={mode:{a:Counter() for a in ARMS} for mode in datasets}
    receipt={"base":BASE_SHA,"run":args.run,"regions":{},"identity":{}}
    changes,curves,aging,shared,starts,shifts,all_events,opening_differences=[],[],[],[],[],[],[],[]
    households=[]
    episodes=[]
    for cell,before in read_cells(args,receipt):
        label=v11.label(cell)
        original=dict(cell,arms={a:v11.original_state_arm(cell["arms"][a]) for a in ARMS})
        donor=cell["arms"][REFERENCE]["naturalOpening"]["state"]
        families={}
        history=before["arms"][REFERENCE]["aged"]
        past={r["key"]:legacy.resident(before,REFERENCE,r,history["tracks"][r["key"]],history["drag"]["scale"],300)
              for r in history["final"]["residents"]}
        for arm in ARMS:
            data=cell["arms"][arm]
            natural=data["naturalAgedOpening"]["state"]
            starts.append({**label,"arm":arm,"coldIdentical":data["naturalOpening"]["state"]==donor,"warmIdentical":natural==donor,
                "naturalSeed":natural["seed"],"matchedSeed":donor["seed"],"sameOpeningFeet":data["naturalAgedOpening"]["opening"]==cell["arms"][REFERENCE]["opening"]})
            for mode,home in (("matched",cell),("native",original)):
                rows=datasets[mode][arm]
                first=len(rows[0])
                v11.add_household(home,arm,*rows,safety[mode][arm],Counter())
                if mode=="matched":families[arm]={r["key"]:r for r in rows[0][first:]}
                aged=home["arms"][arm]["aged"]
                drop=aged["drag"]
                aging.append({**metrics.input_summary(home,mode,arm,drop),
                    "historicalFootStatus":metrics.drop_status(history["drag"]),
                    "concurrentFootStatus":metrics.drop_status(cell["arms"][REFERENCE]["aged"]["drag"]),
                    "sameArchivedFeet":aged["opening"]==history["opening"],
                    "sameConcurrentFeet":aged["opening"]==cell["arms"][REFERENCE]["aged"]["opening"]})
            aged=data["aged"]
            for case,row in data["rows"].items():
                old_row=before["arms"][REFERENCE]["rows"][case]
                if row.get("skip"):continue
                diff=v11.replay_difference(old_row,row)
                if diff:opening_differences.append({**label,"arm":arm,"case":case,"changed":diff,
                    "archived":old.canonical(prior.drop_outcome(old_row)),"current":old.canonical(prior.drop_outcome(row))})
            shifts.extend({**label,"arm":arm,**q} for q in aged["sync"]["shifts"])
            for phase,events in [("living",aged["curve"]),("aged-input",aged["drag"]["curve"]),
                                 *((k,r.get("curve",[])) for k,r in data["rows"].items())]:
                curves.append({**label,"arm":arm,"phase":phase,**curve_counts(events)})
                all_events.extend({**label,"arm":arm,"session":phase,**e} for e in events)
        local_changes=list(walk_effects(cell,families,past))
        changes.extend(local_changes)
        previous_age=cell["arms"][REFERENCE]["aged"]
        final_age=cell["arms"]["v12"]["aged"]
        households.append({**label,**curve_counts(final_age["curve"]),
            "gained":"|".join(r["key"] for r in local_changes if not r["refNormal"] and r["v12Normal"]),
            "lost":"|".join(r["key"] for r in local_changes if r["refNormal"] and not r["v12Normal"]),
            "refSyncs":previous_age["sync"]["calls"],"v12Syncs":final_age["sync"]["calls"],
            "refSyncMoves":len(previous_age["sync"]["shifts"]),"v12SyncMoves":len(final_age["sync"]["shifts"]),
            "sameAgedFeet":previous_age["opening"]==final_age["opening"],
            "sameAgedInput":not v11.replay_difference(previous_age["drag"],final_age["drag"])})
        episodes.extend(assisted_episodes(cell,cell["arms"]["v12"]))
        for who,test in cell["shared"].items():
            reference=test["replays"][REFERENCE]["row"]
            for arm,measurement in test["replays"].items():
                r=measurement["row"]
                shared.append({**metrics.input_summary(cell,who,arm,r),"comparedFlags":v11.replay_difference(reference,r),
                    "sameDonorLivingFlags":not v11.replay_difference(cell["arms"][who]["aged"]["drag"],r)})
                all_events.extend({**label,"arm":arm,"session":"shared-"+who,**e} for e in r.get("curve",[]))
    groups={mode:add_group(datasets[mode]) for mode in datasets}
    totals={mode:{r["arm"]:r for r in rows if r["group"]=="all"} for mode,rows in groups.items()}
    for rows in totals.values():
        for item in rows.values():
            old.require([item[k] for k in ("residents","drags","tapSent","agedDragCount")]==[3276,1058,260,260],"incomplete denominator")
    census={k:sum(row[k] for row in curves if row["arm"]=="v12" and row["phase"]=="living") for k in curve_counts([])}
    statuses=Counter(r["status"] for r in shared if r["arm"]=="v12" and r["source"]==REFERENCE)
    differences=[r for r in changes if bool(r["refNormal"])!=bool(r["v12Normal"])]
    result={"cells":len(receipt["regions"])*20,"clock":"300 native model seconds per separate home; real Chromium touch",
            "historical":BENCHMARK,"totals":totals,"safety":safety,"livingCurveEvents":census,"livingHandoffs":len(episodes),
            "changedNormalWalkers":differences,"sharedInputs":len(shared),"sameStateInputDifferences":sum(bool(r["comparedFlags"]) for r in shared),
            "restoredVsOriginalDifferences":sum(not r["sameDonorLivingFlags"] for r in shared),"restoredReferenceStatus":statuses,
            "lateSameFeet":{a:sum(r["arm"]==a and r["source"]=="matched" and r["sameConcurrentFeet"] for r in aging) for a in ARMS},
            "unalignedNaturalStarts":{a:sum(r["arm"]==a and not r["warmIdentical"] for r in starts) for a in ARMS},
            "thresholds":{a:{f:(q[f]<=g if f=="bothFailed" else q[f]>=g) for f,g in BENCHMARK.items()} for a,q in totals["matched"].items()}}
    def write(basename,rows,folder,compressed=False):
        suffix=".csv.gz" if compressed else ".csv"
        v11.write_table(folder/("matrix-"+basename+suffix),rows,(*ID,"arm","phase"))
    for mode in datasets:
        write("groups-"+mode,groups[mode],args.out)
        for i,suffix in enumerate(("residents","opening-inputs","aged-physics","dual-outcomes")):
            write(mode+"-"+suffix,[record for arm in ARMS for record in datasets[mode][arm][i]],args.private_data,True)
    write("startup",starts,args.out)
    write("walk-changes",differences,args.out)
    write("curve-households",[r for r in curves if r["searches"] or r["helperStarts"]],args.out)
    write("households",households,args.out)
    write("curve-episodes",episodes,args.out)
    write("opening-differences",opening_differences,args.out)
    write("missing-arrival",[r for r in aging if r["source"]=="matched" and r["status"]!="arrived"],args.out)
    write("people-paired",changes,args.private_data,True)
    write("late",aging,args.private_data,True)
    write("shared",shared,args.private_data,True)
    write("curves",all_events,args.private_data,True)
    write("shifts",shifts,args.private_data,True)
    receipt["derived"]={f.name:{"bytes":f.stat().st_size,"sha256":old.digest(f.read_bytes())} for f in sorted(args.private_data.glob("matrix-*.csv.gz"))}
    legacy.write_json(args.out/"matrix-results.json",result)
    legacy.write_json(args.out/"matrix-receipt.json",receipt)
    print("Verified",result["cells"],"households.",{a:{f:q[f] for f in FIELDS} for a,q in totals["matched"].items()},census)


if __name__=="__main__":
    main()
