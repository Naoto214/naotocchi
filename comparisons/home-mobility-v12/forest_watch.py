"""Run normal authored life in an attended browser and retain V12 yield events in its tape."""

import argparse
import asyncio
import hashlib
import gzip
import json
from pathlib import Path
import sys
from urllib.parse import urlparse
from urllib.request import urlopen

base = Path(__file__).resolve().parents[1] / "home-mobility-v11"
sys.path.insert(0, str(base))
import forest_observe as baseline

original_observer = baseline.observe_model
original_url = baseline.forest_url


def observe(source):
    observed = original_observer(source)
    anchor = "globalThis.HomeGoalDiagnostics={proposal("
    # The native trial sends diagnostics only when a subscriber exists. This
    # passive copy never invokes planning or mutates an actor, goal or reservation.
    observed = baseline.replace_once(
        observed,
        "globalThis.forestLog=()=>forestRecords;",
        "globalThis.forestLog=()=>({...forestRecords,latestReflow:globalThis.HomeV12Reflow?.read()||null,projectionSources:performance.getEntriesByType('resource').map(e=>e.name).filter(n=>/home-production-world[^/]*[.]mjs/.test(n))});",
    )
    observed = baseline.replace_once(
        observed,
        "sameBody:old.w===settled.w",
        """
        reflow:(()=>{const r=globalThis.HomeV12Reflow?.read(settled.key);
          return r&&r.clock===clock&&r.from[0]===old.x&&r.from[1]===old.y&&
            r.to[0]===settled.x&&r.to[1]===settled.y?r:null;})(),
        sameBody:old.w===settled.w""",
    )
    # Only materialized curved stages additionally retain each native hop. The
    # ordinary ten-minute recorder already captures all other legs.
    observed = baseline.replace_once(
        observed,
        "function observeHop(a,p) {",
        """
    function observeHop(a,p) {
      if(a.source==='yield'){
        const e=forestCurvedActors.get(a.key);
        if(e&&e.owner===a.yieldFor)e.hops.push([clock,a.x,a.y,p.x,p.y]);
      }""",
    )
    observed = baseline.replace_once(
        observed,
        "function observeEnd(a,status){",
        """function observeEnd(a,status){
      if(a.source==='yield')forestCurvedActors.delete(a.key);""",
    )
    return baseline.replace_once(
        observed,
        anchor,
        """
    forestRecords.curvedYields=[];
    const forestCurvedActors=new Map();
    globalThis.HomeV12CurveEvent=(type, details)=>{
      const e={...structuredClone(details),clock,type};
      if(type==='start'){e.hops=[];forestCurvedActors.set(e.helper,e);}
      if(type==='start'||type==='owner')e.feet=actors.map(a=>[a.key,a.x,a.y,a.w,a.h]);
      if(type==='owner'||type==='stop'){
        for(const [k,actorEvent] of forestCurvedActors)if(actorEvent.owner===e.owner)forestCurvedActors.delete(k);
      }
      forestRecords.curvedYields.push(e);
    };
    """
        + anchor,
    )


async def record(args):
    await baseline.run(args)
    tape = args.out / "forest28.json.gz"
    data = json.loads(gzip.decompress(tape.read_bytes()))
    modules = sorted(set(data["log"]["projectionSources"]))
    expected = urlparse(args.url)
    assert modules, "No loaded projection module was captured"
    verified = {}
    for href in modules:
        url = urlparse(href)
        assert (url.scheme, url.netloc) == (expected.scheme, expected.netloc)
        with urlopen(href, timeout=10) as response:
            verified[Path(url.path).name] = hashlib.sha256(response.read()).hexdigest()
    data["projectionSources"] = verified
    baseline.save(tape, data)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ("url", "arm", "chromium"):
        parser.add_argument("--" + name, required=True)
    for name in ("width", "seed", "order"):
        parser.add_argument("--" + name, type=int, required=True)
    parser.add_argument("--seconds", type=int, default=600)
    parser.add_argument("--attended", action="store_true")
    parser.add_argument("--out", type=Path, required=True)
    baseline.prior.SEED += "\nperformance.setResourceTimingBufferSize(4096);\n"
    baseline.observe_model = observe
    baseline.forest_url = lambda base, arm: (
        original_url(base, arm) + ("&footLog=1" if arm.startswith("v12") else "")
    )
    asyncio.run(record(parser.parse_args()))
