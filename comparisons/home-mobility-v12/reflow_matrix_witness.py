"""Replay the recorded checkpoint at 180 seconds and classify a nonwalking native promotion."""

import argparse, gzip, json
from pathlib import Path
from unittest.mock import patch
import zipfile
from matrix_worker_v12 import old, prior


def observer(name, source):
    source = prior.instrument(name, source)
    if "production-model" not in name:
        return source
    marker = "          if(best){Object.assign(a,{x:best.x,y:best.y});a.target=null;a.activity='rest';}"
    extra = """          if(qa.ageActive&&clock>119&&a.key==='companion:rabbit_friend'){
            const old=previousActors.find(b=>b.key===a.key),before=previousScene.navigation,after=scene.navigation;
            const leadOld=previousActors.find(p=>p.kind==='pet'),s=after.intentScale,state=qa.matrixState();
            (qa.lakeRelocations??=[]).push({key:a.key,clock,prior:[old.x,old.y],projected:[a.x,a.y],final:best?[best.x,best.y]:null,
              previousGeometry:before.reflowGeometry,newGeometry:after.reflowGeometry,oldScale:before.intentScale,newScale:s,
              decision:reflowChoice,ground:after.valid(a),visible:visible(a,a),bounds:bounds(a,scene),
              previousStage:[previousScene.width,previousScene.height],stage:[scene.width,scene.height],
              seatedContacts:seated.filter(b=>!separated(a,a,b)).map(b=>b.key),
              reservedExit:a!==lead&&exit.some(q=>!separated(lead,q,a)),
              route:old.target,allBefore:previousActors.map(p=>[p.key,p.x,p.y,p.w,p.h,p.target]),leadFoot:[leadOld.x,leadOld.y]});
          }
"""
    source = old.legacy.once(source, marker, extra + marker)
    marker = "    function sync(list,next){"
    return old.legacy.once(
        source,
        marker,
        marker
        + """
      qa.lakeSnapshot=()=>({people:actors.map(a=>[a.key,a.x,a.y,a.w,a.h,a.target]),clock,
        size:[scene.width,scene.height],scale:scene.navigation?.intentScale,stamp:scene.navigation?.reflowGeometry});
      qa.lakeEquivalent=()=>sync(list,{...scene,navigation:{...scene.navigation}});
""",
    )


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("url")
    p.add_argument("archive", type=Path)
    p.add_argument("out", type=Path)
    p.add_argument("--attempts", default=2, type=int)
    a = p.parse_args()
    member = "memory_lake-10-320.json.gz"
    data = zipfile.ZipFile(a.archive).read(member)
    cell = json.loads(gzip.decompress(data))
    record = cell["arms"]["v12"]["aged"]["sync"]["shifts"][0]
    opening = cell["arms"]["v11-foot"]["naturalOpening"]["state"]
    coord = ("memory_lake", 10, 320)
    evidence = dict(source=old.digest(data), record=record, attempts=[])
    with old.sync_playwright() as pw:
        b = pw.chromium.launch(
            executable_path="/usr/bin/chromium", args=["--disable-dev-shm-usage"]
        )
        for attempt in range(a.attempts):
            with (
                patch.object(prior.v9, "patched", observer),
                prior.v9.native_page(b, a.url, *coord, "v12", True) as (pg, _, meta),
            ):
                assert meta["hashes"] == cell["arms"]["v12"]["hashes"]
                warm = prior.current_opening(pg, meta)
                prior.match_opening(pg, meta, warm, opening)
                for script in [
                    prior.baseline.INK,
                    prior.v9.TRACKS,
                    prior.baseline.v8.AGE_PROBE,
                    prior.baseline.v8.PAINT_PROBE,
                ]:
                    pg.evaluate(script)
                pg.evaluate(
                    "HomeMobilityDiagnostics.enable();HomeCastTrial.apply({paused:false});touchQA.log=null;touchQA.paint()"
                )
                frames = []
                for t in [0, 60, 120, 180]:
                    if t:
                        pg.evaluate("touchQA.ageActive=true;touchQA.advance(60,true)")
                    frames.append(
                        pg.evaluate(
                            "({before:touchQA.lakeSnapshot(),frame:{...touchQA.footFrame(), presentation:touchQA.presentationFrame()},after:touchQA.lakeSnapshot()})"
                        )
                    )
                natural = pg.evaluate("touchQA.lakeRelocations||[]")
                foot = lambda row, attr: max(
                    abs(x - y)
                    for x, y in zip(
                        row[attr], record["before" if attr == "prior" else "after"]
                    )
                )
                match = next(
                    (
                        r
                        for r in natural
                        if abs(r["clock"] - 180) < 1e-6
                        and foot(r, "prior") < 1e-5
                        and foot(r, "final") < 1e-5
                    ),
                    None,
                )
                simulated = []
                # Only request a controlled equal-navigation sync from the exact
                # recorded foot when spontaneous browser timing did not reproduce it.
                before = pg.evaluate("touchQA.lakeSnapshot()")
                rabbit = next(r for r in before["people"] if r[0] == record["key"])
                oldGap = max(abs(x - y) for x, y in zip(rabbit[1:3], record["before"]))
                if not match and oldGap < 1e-5:
                    simulated = pg.evaluate(
                        "()=>{touchQA.lakeEquivalent();return touchQA.lakeRelocations||[]}"
                    )
                evidence["attempts"].append(
                    dict(
                        browser=b.version,
                        hashes=meta["hashes"],
                        originalState=old.digest(old.canonical(opening).encode()),
                        frames=frames,
                        natural=natural,
                        simulated=simulated,
                        exactNatural=bool(match),
                        oldGap=oldGap,
                    )
                )
                a.out.write_text(
                    json.dumps(evidence, ensure_ascii=False, separators=(",", ":"))
                    + "\n"
                )
                print(
                    attempt,
                    "exact",
                    bool(match),
                    "gap",
                    oldGap,
                    [
                        (r["decision"], r["seatedContacts"], r["reservedExit"])
                        for r in natural
                    ],
                    flush=True,
                )
                if match:
                    break
        b.close()


if __name__ == "__main__":
    main()
