"""Replay actual opening and aged touches, then exchange frozen household states across versions."""
import argparse
import gzip
import json
import os
import subprocess
import sys
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlparse
from urllib.request import urlopen

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "home-mobility-v10"))
import matrix_worker_v10 as baseline

old, v9 = baseline.old, baseline.v9
ARMS = ("v10", "v11-foot", "v11")
BASE_SHA = "ed671e26f5599cebf5aa1a8020d50a5f43dbf076"
SYNC_OBSERVER = """
      if (qa.ageActive && previousScene.region === scene.region) {
        qa.matrixSyncCalls = (qa.matrixSyncCalls || 0) + 1;
        for (const a of actors) {
          const prior = previousActors.find(peer => peer.key === a.key);
          if (!prior || Math.hypot(a.x - prior.x, a.y - prior.y) < 1e-4) continue;
          (qa.matrixSyncShifts ||= []).push({
            key: a.key, clock, before: [prior.x, prior.y], after: [a.x, a.y],
            sameBody: a.w === prior.w && a.h === prior.h,
            sameNavigation: scene.navigation === previousScene.navigation,
            scale: scene.navigation?.intentScale, reflow: arrange
          });
        }
      }
"""


def instrument(name, source):
    source = baseline.instrument_source(name, source)
    if "production-model" in name:
        start_hook = """    qa.matrixLoadOpening = state => {
      if (clock !== 0 || state.clock !== 0 || !HomeCastTrial.settings.paused)
        throw Error('opening restore is only valid in a paused time-zero comparison');
      qa.matrixLoad(state);
      paused = state.paused;
    };"""
        source = old.legacy.once(source, "    let checkpoint;", start_hook + "\n    let checkpoint;")
        anchor = "      if(arrange){clearRelief();"
        source = old.legacy.once(source, anchor, SYNC_OBSERVER + anchor)
        proposal = "globalThis.HomeGoalDiagnostics?.proposal(a,raw,p,scene.navigation?.intentScale,clock);"
        if proposal in source:
            source = old.legacy.once(source, proposal, proposal + """
              if (qa.ageActive && (raw.x !== p.x || raw.y !== p.y)) {
                (qa.matrixGoalChanges ||= []).push({clock, key:a.key, from:[a.x,a.y],
                    raw:[raw.x,raw.y], chosen:[p.x,p.y]});
              }
            """)
    return source


@contextmanager
def native_page(browser, url, coord, arm, aged):
    with patch.object(v9, "patched", instrument), v9.native_page(browser, url, *coord, arm, aged) as room:
        yield room


def drop_outcome(row):
    return (row["selectedKey"], row["issued"], row["accepted"], row["stepCount"] > 0,
            row["arrived"] or row["terminalArrived"], row["near4"] or row["terminalNear4"])


def current_opening(page, meta):
    observed = page.evaluate("""async () => {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      touchQA.checkpoint();
      return {state:touchQA.matrixState(), feet:touchQA.opening()};
    }""")
    state = observed["state"]
    old.require(state["clock"] == 0, "initial decisions must be observed before the first model tick")
    meta["earlySeed"] = meta["seed"]
    meta["seed"] = state["seed"]
    meta["opening"] = observed["feet"]
    return state


def match_opening(page, meta, original, donor):
    if original != donor:
        page.evaluate("""s => {
          touchQA.matrixLoadOpening(s);
          touchQA.paint();
          touchQA.checkpoint();
        }""", donor)
    actual = page.evaluate("touchQA.matrixState()")
    differences = [k for k in donor if actual[k] != donor[k]]
    old.require(not differences, f"opening state restoration changed {differences}")
    return {**meta, "seed":actual["seed"], "opening":page.evaluate("touchQA.opening()")}


def observe_age(page, touch, meta, subject, coord):
    aged, snapshot = baseline.natural_aging(page, touch, meta, subject, True)
    aged["sync"] = page.evaluate("({calls: touchQA.matrixSyncCalls || 0, shifts: touchQA.matrixSyncShifts || []})")
    aged["goalChanges"] = page.evaluate("touchQA.matrixGoalChanges || []")
    restore = old.reload_saved_household(page, meta, touch) if coord[1:] == (28, 390) else None
    return aged, snapshot, restore


def observe_arm(browser, url, coord, arm, tape, subject, donor=None):
    """Save the genuine startup and separately align every model decision and RNG for causal comparisons."""
    with native_page(browser, url, coord, arm, False) as (page, touch, meta):
        cold = current_opening(page, meta)
        if donor is None:
            donor = cold
        native_rows = baseline.opening_gestures(page, touch, coord, meta, tape)
        result = dict(meta, rows=native_rows)
        result["naturalOpening"] = dict(state=cold, opening=meta["opening"], seed=meta["seed"], earlySeed=meta["earlySeed"])
    if cold != donor:
        # A separate page prevents selection/reaction produced by the previous
        # gestures from influencing the input arm with aligned deadlines.
        with native_page(browser, url, coord, arm, False) as (page, touch, fresh):
            old.require(fresh["hashes"] == meta["hashes"], "opening native runtime changed")
            aligned = match_opening(page, fresh, current_opening(page, fresh), donor)
            result["naturalOpening"]["rows"] = native_rows
            result.update(aligned)
            result["rows"] = baseline.opening_gestures(page, touch, coord, aligned, tape)
    with native_page(browser, url, coord, arm, True) as (page, touch, start):
        warm = current_opening(page, start)
        old.require(start["viewport"] == meta["viewport"] and start["hashes"] == meta["hashes"],
                    "aged native viewport or runtime changed")
        result["naturalAgedOpening"] = dict(state=warm, opening=start["opening"], seed=start["seed"], earlySeed=start["earlySeed"])
        native_aged, snapshot, restore = observe_age(page, touch, start, subject, coord)
    if warm == donor:
        result["aged"] = native_aged
    else:
        result["naturalAged"] = native_aged
        if restore:
            result["naturalReloaded"] = restore
        with native_page(browser, url, coord, arm, True) as (page, touch, start):
            old.require(start["hashes"] == meta["hashes"], "aligned runtime changed")
            aligned = match_opening(page, start, current_opening(page, start), donor)
            old.require(aligned["opening"] == result["opening"] and aligned["seed"] == result["seed"],
                        "paired warm opening differs from paired cold opening")
            result["aged"], snapshot, restore = observe_age(page, touch, aligned, subject, coord)
    result["alignedOpeningSHA256"] = old.digest(old.canonical(donor).encode())
    if restore:
        result["reloaded"] = restore
    return result, snapshot

def crossover(browser, url, coord, sessions):
    """All versions receive V10's checkpoint. Also cross any candidate with a differing touch outcome."""
    sources = ["v10"]
    reference = sessions["v10"][0]["aged"]
    for arm in ARMS[1:]:
        aged = sessions[arm][0]["aged"]
        if drop_outcome(aged["drag"]) != drop_outcome(reference["drag"]):
            sources.append(arm)
    results = {}
    for receiving in ARMS:
        with native_page(browser, url, coord, receiving, False) as (page, touch, meta):
            for donor in sources:
                data, snapshot = sessions[donor]
                aged = data["aged"]
                raw = aged["drag"]
                request = {k: raw[k] for k in ("start", "goal", "foot", "origin", "modelGoal", "scale", "key")}
                series = results.setdefault(donor, dict(snapshot=snapshot, opening=aged["opening"], input=request, replays={}))
                retries = []
                for _ in range(3):
                    row = baseline.shared_drop(page, touch, aged["index"], snapshot, raw, aged["opening"])
                    differences = baseline.same_input(row, request)
                    if not differences:
                        break
                    retries.append(differences)
                old.require(not differences, f"{coord}/{receiving}/{donor}: unequal replay coordinates {differences}")
                series["replays"][receiving] = dict(row=row, scripts=meta["hashes"], coordinateRetries=retries)
    return results


def run_cell(browser, url, coord, tape, subjects):
    subject = subjects[coord]
    reference = observe_arm(browser, url, coord, "v10", tape, subject)
    donor = reference[0]["naturalOpening"]["state"]
    sessions = {"v10":reference}
    for arm in ARMS[1:]:
        sessions[arm] = observe_arm(browser, url, coord, arm, tape, subject, donor)
    region, count, width = coord
    return dict(schema=6, region=region, count=count, width=width, height=old.legacy.old.HEIGHTS[width] - 52,
                engine="chromium", arms={arm: data for arm, (data, _) in sessions.items()},
                shared=crossover(browser, url, coord, sessions))


def validate(cell, tape):
    coord = (cell["region"], cell["count"], cell["width"])
    old.require(set(cell["arms"]) == set(ARMS), "missing measured arm")
    for arm in ARMS[1:]:
        pair = dict(cell, schema=1, suite="matrix", paired=True,
                    arms={"v5": cell["arms"]["v10"], "v6": cell["arms"][arm]})
        old.validate_cell(pair, *coord)
    expected_start = old.digest(old.canonical(cell["arms"]["v10"]["naturalOpening"]["state"]).encode())
    for arm, data in cell["arms"].items():
        old.require(data["alignedOpeningSHA256"] == expected_start, "different paired opening states")
        for key in ("naturalOpening", "naturalAgedOpening"):
            start = data[key]
            old.require(start["state"]["clock"] == 0 and start["state"]["seed"] == start["seed"],
                        "native opening state lacks matching clock and RNG")
        if "naturalAged" in data:
            native = data["naturalAged"]
            old.require(native["drag"]["trusted"] and abs(native["final"]["modelSeconds"] - 300) < .001
                        and native["final"]["arm"] == arm, "incomplete independent native living or touch")
        fingerprint = old.digest(old.canonical(data["opening"]).encode())
        for case, row in data["rows"].items():
            ref = tape[*coord, case, "v6"]
            old.require(fingerprint == ref["openingSHA256"] and row["key"] == ref["key"] and
                        (row.get("skip") or "") == ref["skip"], "archived touch fixture mismatch")
            if not row.get("skip"):
                old.require(row["start"] + row["goal"] == [float(ref[k]) for k in ("touchX", "touchY", "goalX", "goalY")],
                            "archived physical coordinates changed")
        aged = data["aged"]
        report = aged["final"]
        old.require(report["arm"] == arm and abs(report["modelSeconds"] - 300) < .001, f"{arm}: wrong native age or entry")
        for resident in report["residents"]:
            track = aged["tracks"][resident["key"]]
            completed = [trip for trip in track["trips"] if trip["end"] is not None]
            old.require(len(track["trips"]) == resident["ambientPlans"] and len(completed) == resident["ambientArrivals"]
                        and sum(t["escape"] for t in completed) == resident["escapeArrivals"], "trip observers disagree")
            old.require(abs(sum(t["distance"] for t in track["trips"]) - resident["ambientDistance"]) < 1e-5
                        and len(track["stalls"]) == resident["recoveredEpisodes"], "observed native motion differs")
    expected = {"v10"} | {arm for arm in ARMS[1:] if drop_outcome(cell["arms"][arm]["aged"]["drag"]) !=
                          drop_outcome(cell["arms"]["v10"]["aged"]["drag"])}
    old.require(set(cell["shared"]) == expected, "incomplete donor crossover")
    for series in cell["shared"].values():
        old.require(set(series["replays"]) == set(ARMS), "incomplete receiving arms")
        for arm, observation in series["replays"].items():
            row = observation["row"]
            old.require(observation["scripts"] == cell["arms"][arm]["hashes"], "different receiving scripts")
            old.require(not baseline.same_input(row, series["input"]), "different restored input")
            old.require(row["trusted"] and row["inkAtPress"] is not None, "missing physical input")
            old.require(row["goalClass"] == series["replays"]["v10"]["row"]["goalClass"], "different restored geometry")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--region", required=True, choices=old.REGIONS)
    parser.add_argument("--url", required=True)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--counts", nargs="+", type=int, choices=old.COUNTS, default=old.COUNTS)
    parser.add_argument("--widths", nargs="+", type=int, choices=old.WIDTHS, default=old.WIDTHS)
    args = parser.parse_args()
    url = args.url.rstrip("/")
    old.require(urlparse(url).hostname in ("localhost", "127.0.0.1"), "expected local game")
    tape, subjects = v9.history(), baseline.v8.subjects()
    args.out.mkdir(parents=True, exist_ok=True)
    revision = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=HERE, text=True).strip()
    entries = {}
    for arm in ARMS:
        with urlopen(f"{url}/game/mobility-{arm}.html", timeout=30) as stream:
            entries[arm] = old.digest(stream.read())
    with old.sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.getenv("CHROMIUM_PATH", "/usr/bin/chromium"),
            args=["--disable-dev-shm-usage", "--disable-background-timer-throttling",
                  "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"])
        try:
            manifest = dict(base=BASE_SHA, revision=revision, region=args.region, browser=browser.version, entries=entries,
                            historicalInputsSHA256=old.digest(old.HISTORY.read_bytes()),
                            agedSubjectsSHA256=old.digest(baseline.v8.SUBJECTS.read_bytes()), cells={}, complete=False)
            for count in args.counts:
                for width in args.widths:
                    cell = run_cell(browser, url, (args.region, count, width), tape, subjects)
                    filename = f"{args.region}-{count}-{width}.json.gz"
                    packed = gzip.compress((old.canonical(cell) + "\n").encode(), mtime=0)
                    (args.out / filename).write_bytes(packed)
                    validate(cell, tape)
                    manifest["cells"][filename] = old.digest(packed)
                    old.save(args.out / "region.json", manifest)
                    print(filename, "verified", flush=True)
            manifest["complete"] = len(manifest["cells"]) == 20
            old.save(args.out / "region.json", manifest)
        finally:
            browser.close()


if __name__ == "__main__":
    main()
