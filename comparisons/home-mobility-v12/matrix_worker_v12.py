"""Measure native V11 foot and V12 households. Record trusted opening and 5-minute touch crossovers."""
import argparse
import gzip
import os
from pathlib import Path
import subprocess
import sys
from unittest.mock import patch
from urllib.parse import urlparse
from urllib.request import urlopen

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "home-mobility-v11"))
import matrix_worker_v11 as prior

old = prior.old
REFERENCE = "v11-foot"
ARMS = (REFERENCE, "v12")
BASE_SHA = "5f899a2de868fa70e772a56d0fad733f87717e6a"
native_instrument = prior.instrument
native_aging = prior.baseline.natural_aging
native_gesture = old.legacy.trial


def instrument(name, source):
    source = native_instrument(name, source)
    if "production-model" not in name:
        return source
    # Observer-only hooks executed immediately before native foot updates and arrivals.
    for anchor, probe in (("stats.distance+=Math.hypot(p.x-a.x,p.y-a.y);","touchQA.matrixCurve?.step(a,p,clock);"),
                          ("emit('arrive',a,a.source);","touchQA.matrixCurve?.arrival(a,clock);"),
                          ("if(mobility?.enabled)mobility.arrival(a,clock);a.yieldFor=null;","touchQA.matrixCurve?.arrival(a,clock);")):
        source = old.legacy.once(source, anchor, probe + anchor)
    return source


CURVE_OBSERVER = """
() => {
  if (touchQA.matrixCurve) return;
  const rows=[],until=new Map();
  const before=globalThis.HomeV12CurveEvent;
  function record(type,data) {
    rows.push({phase:touchQA.ageActive?'living':'input',type,...data});
  }
  globalThis.HomeV12CurveEvent=(type,data)=>{
    before?.(type,data);
    if (!touchQA.ageActive && !touchQA.log) return;
    record(type,structuredClone(data));
    if ((type==='plan' && data.found!==false) || type==='start' || type==='owner') {
      for (const key of [data.owner,data.helper,...(data.stages||[]).map(s=>s.key)]) {
        if (key) until.set(key,data.clock+35);
      }
    }
  };
  touchQA.matrixCurve={
    rows,
    step(a,p,clock) {
      if (!(until.get(a.key)>=clock) || !(touchQA.ageActive || touchQA.log)) return;
      record('native-step',{clock,key:a.key,source:a.source,from:[a.x,a.y],to:[p.x,p.y]});
    },
    arrival(a,clock) {
      if (!(until.get(a.key)>=clock) || !(touchQA.ageActive || touchQA.log)) return;
      record('native-arrive',{clock,key:a.key,source:a.source,at:[a.x,a.y]});
    }
  };
}
"""


def observe_gesture(page, touch, *args):
    page.evaluate(CURVE_OBSERVER)
    index = page.evaluate("touchQA.matrixCurve.rows.length")
    raw = native_gesture(page,touch,*args)
    raw["curve"] = page.evaluate("i=>touchQA.matrixCurve.rows.slice(i)",index)
    return raw


def observe_aging(page, touch, meta, subject, tracks):
    page.evaluate(CURVE_OBSERVER)
    # A native UI refresh can occur between the 300s observation and the press.
    # Take the donor immediately after the native gesture has been prepared in
    # the same JS call, before dispatching any finger input. Preserve both poses.
    page.evaluate("""() => {
      const qa=touchQA,prepare=qa.prepare;
      qa.prepare=function(...args){
        const plan=prepare.apply(this,args);
        if(!qa.agedFingerState && qa.model.metrics().clock>=299.999){
          qa.agedFingerState={state:qa.matrixState(),opening:qa.opening()};
        }
        return plan;
      };
    }""")
    aged,prior_snapshot = native_aging(page,touch,meta,subject,tracks)
    press = page.evaluate("touchQA.agedFingerState")
    old.require(press and abs(press["state"]["clock"]-300)<.001, "aged finger checkpoint omitted")
    target = press["opening"][aged["index"]]
    old.require(target[0]==aged["drag"]["key"] and target[5:7]==aged["drag"]["foot"], "prepared finger and donor foot differ")
    snapshot = press["state"]
    if snapshot!=prior_snapshot or aged["opening"]!=press["opening"]:
        aged["beforeFingerPreparation"]={"state":prior_snapshot,"opening":aged["opening"]}
    aged["opening"]=press["opening"]
    aged["curve"] = page.evaluate("touchQA.matrixCurve.rows.filter(r=>r.phase==='living')")
    return aged,snapshot


# Retry only before dispatch when a paint refresh changed the receiving home.
# A failed reconstruction never produces a success or a physical gesture.
CHECK_DONOR_BEFORE_TOUCH = """({opening,seed})=>{
  const qa=touchQA;qa.stablePrepare??=qa.prepare;
  qa.beforePressResyncs=[];
  qa.prepare=function(...args) {
    for(let i=0;i<3;i++){
      const plan=qa.stablePrepare.apply(this,args);
      const actual=qa.opening(),incoming=qa.readSeed();
      if(JSON.stringify(actual)===JSON.stringify(opening)&&incoming===seed)return plan;
      qa.beforePressResyncs.push({attempt:i+1,opening:actual,seed:incoming});
    }
    throw Error('Receiving household could not restore the same feet and RNG before touch');
  };
}"""


def crossover(browser, url, coord, sessions):
    sources = [REFERENCE]
    previous = sessions[REFERENCE][0]["aged"]["drag"]
    if prior.drop_outcome(sessions["v12"][0]["aged"]["drag"]) != prior.drop_outcome(previous):
        sources.append("v12")
    comparisons = {}
    for arm in ARMS:
        with prior.native_page(browser, url, coord, arm, False) as (page, touch, meta):
            for donor in sources:
                data, snapshot = sessions[donor]
                aged = data["aged"]
                raw = aged["drag"]
                request = {k: raw[k] for k in ("start","goal","foot","origin","modelGoal","scale","key")}
                shared = comparisons.setdefault(donor, dict(snapshot=snapshot, opening=aged["opening"], input=request, replays={}))
                page.evaluate(CHECK_DONOR_BEFORE_TOUCH,{"opening":aged["opening"],"seed":snapshot["seed"]})
                retries = []
                for _ in range(3):
                    row = prior.baseline.shared_drop(page, touch, aged["index"], snapshot, raw, aged["opening"])
                    differences = prior.baseline.same_input(row, request)
                    if not differences:
                        break
                    retries.append(differences)
                old.require(not differences, f"{coord}/{donor}/{arm} unequal physical coordinates {differences}")
                shared["replays"][arm] = dict(row=row, scripts=meta["hashes"], coordinateRetries=retries, beforePressResyncs=page.evaluate("touchQA.beforePressResyncs"))
    return comparisons


def run_cell(browser, url, coord, tape, subjects):
    subject = subjects[coord]
    with patch.object(prior,"instrument",instrument), patch.object(prior.baseline,"natural_aging",observe_aging), \
            patch.object(old.legacy,"trial",observe_gesture):
        baseline = prior.observe_arm(browser, url, coord, REFERENCE, tape, subject)
        initial = baseline[0]["naturalOpening"]["state"]
        candidate = prior.observe_arm(browser, url, coord, "v12", tape, subject, initial)
        sessions = {REFERENCE:baseline, "v12":candidate}
        shared = crossover(browser, url, coord, sessions)
    region,count,width = coord
    return dict(schema=7, region=region, count=count, width=width, height=old.legacy.old.HEIGHTS[width] - 52,
                engine="chromium", arms={arm:data for arm,(data,_) in sessions.items()},
                shared=shared)


def validate(cell, tape):
    coord = (cell["region"],cell["count"],cell["width"])
    old.require(cell["schema"] == 7 and set(cell["arms"]) == set(ARMS), "wrong native pair")
    arms = cell["arms"]
    ref = arms[REFERENCE]
    old.validate_cell(dict(cell, schema=1, suite="matrix", paired=True, arms={"v5":ref, "v6":arms["v12"]}), *coord)
    expected = old.digest(old.canonical(ref["naturalOpening"]["state"]).encode())
    for arm,data in arms.items():
        old.require(data["alignedOpeningSHA256"] == expected and data["opening"] == ref["opening"], "unaligned full household")
        for name in ("naturalOpening","naturalAgedOpening"):
            start = data[name]
            old.require(start["state"]["clock"] == 0 and start["seed"] == start["state"]["seed"], "unmatched original RNG")
        fingerprint = old.digest(old.canonical(data["opening"]).encode())
        for case,row in data["rows"].items():
            before = tape[*coord,case,"v6"]
            old.require(fingerprint == before["openingSHA256"] and row["key"] == before["key"] and
                        (row.get("skip") or "") == before["skip"], "archived tap point or recipient changed")
            if not row.get("skip"):
                old.require(row["trusted"] and row["start"] + row["goal"] ==
                            [float(before[k]) for k in ("touchX","touchY","goalX","goalY")], "different physical opening gesture")
        for name in ("aged","naturalAged"):
            if name not in data:
                continue
            aged = data[name]
            final = aged["final"]
            old.require(final["arm"] == arm and abs(final["modelSeconds"]-300) < .001 and aged["drag"]["trusted"],
                        "incomplete native age or wrong treatment")
            old.require(not aged["goalChanges"], "unexpected V11 goal replacement")
            for actor in final["residents"]:
                track = aged["tracks"][actor["key"]]
                trips = track["trips"]
                arrived = [t for t in trips if t["end"] is not None]
                old.require(len(trips) == actor["ambientPlans"] and len(arrived) == actor["ambientArrivals"] and
                            sum(t["escape"] for t in arrived) == actor["escapeArrivals"], "plan or arrival counters disagree")
                old.require(abs(sum(t["distance"] for t in trips) - actor["ambientDistance"]) < 1e-5 and
                            len(track["stalls"]) == actor["recoveredEpisodes"], "foot distance or stall counters differ")
    donors = {REFERENCE}
    if prior.drop_outcome(arms[REFERENCE]["aged"]["drag"]) != prior.drop_outcome(arms["v12"]["aged"]["drag"]):
        donors.add("v12")
    old.require(set(cell["shared"]) == donors, "incomplete donor crossovers")
    for series in cell["shared"].values():
        old.require(set(series["replays"]) == set(ARMS), "incomplete receiving arms")
        for arm,measurement in series["replays"].items():
            row = measurement["row"]
            old.require(measurement["scripts"] == arms[arm]["hashes"] and row["trusted"] and row["inkAtPress"] is not None and
                        not prior.baseline.same_input(row, series["input"]), "different real input, source or native recipient")
            old.require(row["goalClass"] == series["replays"][REFERENCE]["row"]["goalClass"], "different restored geometry")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--region", required=True, choices=old.REGIONS)
    parser.add_argument("--url", required=True)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--counts", nargs="+", type=int, choices=old.COUNTS, default=old.COUNTS)
    parser.add_argument("--widths", nargs="+", type=int, choices=old.WIDTHS, default=old.WIDTHS)
    args = parser.parse_args()
    old.require(urlparse(args.url).hostname in ("localhost","127.0.0.1"), "local native game required")
    tape, subjects = prior.v9.history(), prior.baseline.v8.subjects()
    args.out.mkdir(parents=True, exist_ok=True)
    revision = subprocess.check_output(["git","rev-parse","HEAD"],cwd=HERE,text=True).strip()
    entries = {}
    for arm in ARMS:
        with urlopen(f"{args.url}/game/mobility-{arm}.html",timeout=30) as response:
            entries[arm] = old.digest(response.read())
    extra_sources = {}
    for name in ("home-production-world-mobility.mjs","home-production-world-finish.mjs",
                 "home-production-world-v12-mobility.mjs","home-production-world-v12-finish.mjs","mobility-v12-owner-events.js"):
        with urlopen(f"{args.url}/game/{name}",timeout=30) as response:
            extra_sources[name] = old.digest(response.read())
    with old.sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.getenv("CHROMIUM_PATH","/usr/bin/chromium"),
            args=["--disable-dev-shm-usage","--disable-background-timer-throttling","--disable-renderer-backgrounding",
                  "--disable-backgrounding-occluded-windows"])
        try:
            manifest = dict(base=BASE_SHA,revision=revision,region=args.region,browser=browser.version,entries=entries,extraSources=extra_sources,
                            historicalInputsSHA256=old.digest(old.HISTORY.read_bytes()),
                            agedSubjectsSHA256=old.digest(prior.baseline.v8.SUBJECTS.read_bytes()),cells={},complete=False)
            for count in args.counts:
                for width in args.widths:
                    cell = run_cell(browser,args.url,(args.region,count,width),tape,subjects)
                    name = f"{args.region}-{count}-{width}.json.gz"
                    raw = gzip.compress((old.canonical(cell)+"\n").encode(),mtime=0)
                    (args.out / name).write_bytes(raw)
                    validate(cell,tape)
                    manifest["cells"][name] = old.digest(raw)
                    old.save(args.out / "region.json",manifest)
                    print(name,"verified",flush=True)
            manifest["complete"] = len(manifest["cells"]) == 20
            old.save(args.out / "region.json",manifest)
        finally:
            browser.close()


if __name__ == "__main__":
    main()
