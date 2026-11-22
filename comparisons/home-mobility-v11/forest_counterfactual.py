"""Isolate a persistent post-notice foot displacement using a matched native-model continuation."""

import argparse
import gzip
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
from forest_observe import observe_model, replace_once, forest_url, prior


def record(candidate, resident, url, output, seconds):
    raw = (candidate / "forest28.json.gz").read_bytes()
    live = json.loads(gzip.decompress(raw))
    state = live["checkpoint"]
    assert state["relief"] is None and not state["manualGoals"] and not state["waiting"]
    old = next(s for s in live["log"]["syncs"] if s["key"] == resident)
    authoritative = next(a for a in state["actors"] if a["key"] == resident)
    assert [authoritative["x"], authoritative["y"]] == old["to"]
    assert not any(
        m["key"] == resident and m["lastClock"] >= old["clock"]
        for m in live["log"]["motions"]
    )
    arm = live["arm"]
    name = f"home-production-model-mobility-{arm}.js"
    inject = """
    globalThis.forestContinuation=(snapshot,key,point,seconds)=>{
      if(snapshot.relief||snapshot.manualGoals.length||snapshot.waiting.length)throw Error('The snapshot contains transient work');
      if(actors.length!==snapshot.actors.length||!actors.every((a,i)=>a.key===snapshot.actors[i].key&&a.w===snapshot.actors[i].w&&a.h===snapshot.actors[i].h))throw Error('The household or stage differs');
      actors=structuredClone(snapshot.actors);clock=snapshot.clock;selected=snapshot.selected;idleAt=snapshot.idleAt;
      // Both copies resume the same native post-gate clock on the same first step.
      paused=snapshot.paused;nextRecovery=snapshot.nextRecovery;earlyKey=snapshot.earlyKey;reopenedKey=snapshot.reopenedKey;
      retryingKey=null;relief=null;resuming=false;continuing=null;
      for(const [map,values] of [[cooldown,snapshot.cooldown],[crowdMisses,snapshot.crowdMisses],[helpedAt,snapshot.helpedAt],[manualGoals,snapshot.manualGoals],[waiting,snapshot.waiting]]){
        map.clear();for(const [k,v] of structuredClone(values))map.set(k,v);
      }
      Object.assign(stats,structuredClone(snapshot.stats));globalThis.restoreForestSeed(snapshot.seed);
      const a=actor(key),b=bounds(a,scene);
      const safety=p=>({legal:scene.navigation.valid(p)&&visible(a,p)&&p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom,
        overlaps:actors.filter(other=>other!==a&&!separated(a,p,other)).map(peer=>peer.key)});
      const before=safety(a),after=safety(point),bad=after.overlaps.filter(k=>!before.overlaps.includes(k));
      if(!after.legal||bad.length)return {before,after,bad};
      a.x=point.x;a.y=point.y;
      const opening=actors.map(x=>[x.key,x.x,x.y]);
      for(let n=0;n<seconds*30;n++)step(1/30,{autonomy:true});
      return {before,after,bad,opening,clock,seed:globalThis.forestSeed(),log:forestLog(),
        ending:actors.map(x=>[x.key,x.x,x.y])};
    };
"""
    result = []
    with sync_playwright() as browser_api:
        browser = browser_api.chromium.launch(executable_path="/usr/bin/chromium")
        for strategy, xy in [
            ("as_observed", old["to"]),
            ("keep_prior_foot", old["from"]),
            ("repeat_control", old["to"]),
        ]:
            ctx = browser.new_context(
                viewport={"width": live["width"], "height": 792},
                is_mobile=True,
                has_touch=True,
                device_scale_factor=2,
                timezone_id="Asia/Tokyo",
                locale="ja-JP",
            )
            ctx.add_init_script(
                prior.SEED.replace("let seed=214;", f"let seed={live['seed']};")
            )
            page = ctx.new_page()

            def instrument(route):
                response = route.fetch()
                source = response.text()
                filename = route.request.url.split("/")[-1].split("?")[0]
                if filename == name:
                    assert (
                        hashlib.sha256(source.encode()).hexdigest()
                        == live["sources"][name]["source"]
                    )
                    source = replace_once(
                        observe_model(source),
                        "    return {metrics:",
                        inject + "    return {metrics:",
                    )
                else:
                    source = replace_once(
                        source,
                        "let seed = 214;",
                        f"let seed={live['seed']};globalThis.restoreForestSeed=n=>{{seed=n}};globalThis.forestSeed=()=>seed;",
                    )
                route.fulfill(response=response, body=source)

            ctx.route("**/" + name + "*", instrument)
            ctx.route("**/drag-trial-hooks*.js*", instrument)
            page.goto(forest_url(url, arm), wait_until="domcontentloaded")
            page.wait_for_function(
                "HomeCastTrial?.ready&&HomeDragTrial.opening()&&typeof window.forestContinuation==='function'",
                timeout=120000,
            )
            page.evaluate(
                'Promise.all([...document.querySelectorAll("#castStage img.character-asset")].map(i=>i.decode()))'
            )
            page.evaluate("()=>{HomeMobilityDiagnostics.enable()}")
            run = page.evaluate(
                "([s,k,xy,t])=>forestContinuation(s,k,{x:xy[0],y:xy[1]},t)",
                [state, resident, xy, seconds],
            )
            run["strategy"] = strategy
            result.append(run)
            ctx.close()
        browser.close()
    out = dict(
        recordedSHA256=hashlib.sha256(raw).hexdigest(),
        modelSHA256=live["sources"][name]["source"],
        clock=state["clock"],
        originalSync=old,
        unchangedSinceSync=resident,
        seconds=seconds,
        seed=state["seed"],
        capturedRelief=state["relief"],
        runs=result,
    )
    output.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(output, "wt", compresslevel=4) as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(
        [
            (
                r["strategy"],
                r["before"],
                r["after"],
                len(r.get("log", {}).get("motions", [])),
            )
            for r in result
        ]
    )


def summarize(raw, output):
    from collections import Counter
    from forest_metrics import refusal_intervals, v9

    data = json.loads(gzip.decompress(raw.read_bytes()))
    first, retained, repeat = data["runs"]
    assert {k: v for k, v in first.items() if k != "strategy"} == {
        k: v for k, v in repeat.items() if k != "strategy"
    }, "fixed control did not reproduce byte-for-byte"
    assert all(
        r.get("opening")
        and len(r["opening"]) == 28
        and r["after"]["legal"]
        and not r["bad"]
        for r in data["runs"]
    )
    differences = [
        k
        for (k, x, y), (k2, x2, y2) in zip(first["opening"], retained["opening"])
        if (x, y) != (x2, y2)
    ]
    assert differences == [data["unchangedSinceSync"]]
    rows = []
    start = data["clock"]
    for run in data["runs"]:
        tape = run["log"]
        end = run["clock"]
        assert all(q["clock"] >= start for q in tape["requests"])
        legs = v9.legs({"arm": "v10", "seed": data["seed"], "log": tape})
        ordinary = [l for l in legs if l["completed_normal"]]
        counts = Counter(l["key"] for l in ordinary)
        people = []
        for k, x, y in run["opening"]:
            refused = [
                (q["clock"], "refusal")
                for q in tape["requests"]
                if q["key"] == k
                and q["source"] == "ambient"
                and q["planned"]
                and not q["accepted"]
            ]
            moved = [
                (l["start_s"], "own_step")
                for l in legs
                if l["key"] == k and l["source"] == "ambient"
            ]
            idle = [
                (t, "idle")
                for t, key, n in tape["choices"]
                if key == k and n in ("rest", "turn", "look", "sit")
            ]
            block = refusal_intervals(refused + moved + idle, end)
            people.append(
                dict(
                    key=k,
                    normal=counts[k],
                    rejections=len(refused),
                    longest_blocked_s=round(
                        max((b - a for a, b, c in block), default=0), 3
                    ),
                )
            )
        rows.append(
            dict(
                strategy=run["strategy"],
                normalWalkers=len(counts),
                repeatedWalkers=sum(n >= 2 for n in counts.values()),
                totalNormal=len(ordinary),
                normalDistanceCSS=round(sum(l["css_distance"] for l in ordinary), 3),
                endingRng=run["seed"],
                residents=people,
            )
        )
    result = dict(
        sourceSHA256=data["recordedSHA256"],
        sourceModel=data["modelSHA256"],
        comparisonSHA256=hashlib.sha256(raw.read_bytes()).hexdigest(),
        nativeSnapshotSeconds=start,
        modelSeconds=data["seconds"],
        resumeSeed=data["seed"],
        sameSourceRerunMatched=True,
        soleChangedActor=differences[0],
        originalSync=data["originalSync"],
        originalNeighbours=first["before"]["overlaps"],
        retainedNeighbours=retained["after"]["overlaps"],
        runs=rows,
    )
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(
        [
            (r["strategy"], r["normalWalkers"], r["repeatedWalkers"], r["totalNormal"])
            for r in rows
        ]
    )


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("case", type=Path)
    p.add_argument("out", type=Path)
    p.add_argument("--url", required=True)
    p.add_argument("--resident", default="companion:panda")
    p.add_argument("--seconds", type=int, default=300)
    p.add_argument(
        "--summary",
        type=Path,
        help="certify an already captured three-arm model continuation",
    )
    a = p.parse_args()
    if a.summary:
        summarize(a.out, a.summary)
    else:
        record(a.case, a.resident, a.url, a.out, a.seconds)
