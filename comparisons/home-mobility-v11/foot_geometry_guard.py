"""Measure the safety and benefit of suppressing a redundant native camera reflow, locally only."""

import argparse
import functools
import gzip
import http.server
import json
import threading
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlsplit
import zipfile

import matrix_worker_v11 as house
from foot_matrix_reflow import install
from foot_replacement import Local, replace_once

HERE = Path(__file__).resolve().parent


class WorldProbe(Local):
    def do_GET(self):
        file = Path(urlsplit(self.path).path.lstrip("/"))
        if file.as_posix() not in (
            "game/home-production-world-finish.mjs",
            "game/home-production-world-mobility.mjs",
        ):
            return super().do_GET()
        source = (Path(self.directory) / file).read_text()
        marker = "   revision++;lastPaint='';"
        # The native key includes terrain, cover, visible-ground extension,
        # stage rectangle and affine presentation. Record exact values used to
        # build the object, independently of navigation-object identity.
        record = """   const scopes=win.footNavigationScopes ||= new WeakMap();
   const floorBasis=[{x:0,z:0},{x:1,z:0},{x:0,z:1}].map(q=>nav.project(q));
   const maskBasis=[{x:0,y:0},{x:1,y:0},{x:0,y:1}].map(q=>nav.visibleGround?.point(q)||null);
   const frame=doc.querySelector('.screen-frame')?.getBoundingClientRect();
   const owner=doc.getElementById('castStage')?.getBoundingClientRect();
   const crop=r=>r?[r.left,r.top,r.width,r.height]:null;
   // A location is pinned to stage, not nominal host height. Keep the full
   // original key plus all actual operands of both ground affine mappings,
   // the visibility crop, static artwork rules, presentation and actor scale.
   const effective=JSON.stringify([spec.region,spec.candidate,spec.ground,spec.exclude,spec.foreground,spec.depth,
     stage.width,stage.height,stableGrid,!!addVisible,nav.visibleGround?.rule||null,floorBasis,maskBasis,crop(real),crop(frame),crop(owner),
     p&&[p.x,p.y,p.scaleX,p.scaleY,p.bodyScale,p.safeLeft,p.safeTop,p.safeRight,p.safeBottom],
     win.innerWidth,win.innerHeight,win.devicePixelRatio,win.visualViewport?.scale,
     doc.body.dataset.homeDisplayVersion,doc.body.dataset.homeViewportVersion,doc.body.dataset.homeTinyOverview]);
   scopes.set(nav,{key,effective});
"""
        src = replace_once(source, marker, record + marker).encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/javascript")
        self.send_header("Content-Length", str(len(src)))
        self.end_headers()
        self.wfile.write(src)


def instrument(name, source):
    src = install(name, source)
    if "production-model" not in name:
        return src
    base = "    let savedMatrixRows;"
    diag = (HERE / "foot-reprojection-walk.js").read_text()
    marker = "      const previousScene=scene,previousActors=actors;"
    src = replace_once(
        src,
        marker,
        marker
        + "\n      const beforeGeometryState=globalThis.touchQA?.ageActive && changed && scene.navigation ? globalThis.touchQA.matrixState() : null;",
    )
    src = replace_once(
        src,
        base,
        diag + "\n    globalThis.walkAvailableBearing=walkAvailableBearing;\n" + base,
    )
    record = """      if((qa.ageActive || window.footReplayWindow) && previousScene.region===scene.region &&
          previousScene.navigation && previousScene.navigation!==scene.navigation && previousActors.length===actors.length){
        const scopes=window.footNavigationScopes;
        const moved=actors.some(a=>{const q=previousActors.find(b=>b.key===a.key);return q&&Math.hypot(q.x-a.x,q.y-a.y)>1e-5;});
        if(moved || window.footReplayWindow){
          const stamp=compareGeometrySync(previousActors,actors,previousScene,scene,scopes?.get(previousScene.navigation),scopes?.get(scene.navigation),clock);
          if(stamp){if(beforeGeometryState && stamp.exactEffectiveGeometry && stamp.held.strictLongBearings96.length && stamp.nativeReservedExitsGained.length){qa.geometryWalkWitness={...stamp,snapshot:beforeGeometryState};}stamp.phase=window.footReplayWindow?'archived-stationary':'unforced-ordinary';(qa.geometryDecisions ||= []).push(stamp);}
        }
      }
"""
    src = replace_once(
        src, base, (HERE / "foot-geometry-diagnostic.js").read_text() + "\n" + base
    )
    src = replace_once(
        src,
        "      if(arrange){clearRelief();",
        record + "      if(arrange){clearRelief();",
    )
    line = "      sync(savedMatrixRows,{...scene,navigation:{...scene.navigation}});"
    return replace_once(
        src,
        line,
        """      const replacement={...scene.navigation},scopes=window.footNavigationScopes;
      const oldStamp=scopes?.get(scene.navigation);
      if(oldStamp)scopes.set(replacement,oldStamp);
      sync(savedMatrixRows,{...scene,navigation:replacement});""",
    )


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("dist", type=Path)
    p.add_argument("archive", type=Path)
    p.add_argument("out", type=Path)
    p.add_argument("--region", choices=["forest", "mountain"], required=True)
    p.add_argument("--trials", type=int, default=4)
    p.add_argument(
        "--walk",
        action="store_true",
        help="Replay the first verified oblique corridor under complete native movement",
    )
    args = p.parse_args()
    region = args.region
    coord = (region, 10, 320)
    srv = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(WorldProbe, directory=args.dist)
    )
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    dest = "http://127.0.0.1:" + str(srv.server_port)
    archive = json.loads(
        gzip.decompress(zipfile.ZipFile(args.archive).read(region + "-10-320.json.gz"))
    )
    rows = []
    arm = "v11-foot" if region == "forest" else "v11"
    aged = archive["arms"][arm]["aged"]
    try:
        with house.old.sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path="/usr/bin/chromium")
            for i in range(args.trials):
                with (
                    patch.object(house.v9, "patched", instrument),
                    house.v9.native_page(browser, dest, *coord, arm, True) as (
                        page,
                        touch,
                        meta,
                    ),
                ):
                    if i == 0 and region == "forest":
                        before = [r[:5] for r in aged["opening"]]
                        for r in aged["sync"]["shifts"]:
                            assert abs(r["clock"] - 300) < 0.001
                            next(a for a in before if a[0] == r["key"])[1:3] = r[
                                "before"
                            ]
                        final = page.evaluate(
                            "f=>replayArchivedReprojection(f)", before
                        )
                        assert all(
                            a[0] == b[0]
                            and max(abs(u - v) for u, v in zip(a[1:3], b[1:3])) < 1e-6
                            for a, b in zip(final, aged["opening"])
                        )
                    else:
                        house.baseline.natural_aging(
                            page, touch, meta, house.baseline.v8.subjects()[coord], True
                        )
                    decisions = page.evaluate("touchQA.geometryDecisions || []")
                    witness = (
                        page.evaluate(
                            """()=>touchQA.geometryWalkWitness ? walkAvailableBearing(touchQA.geometryWalkWitness) : null"""
                        )
                        if args.walk
                        else None
                    )
                    rows.append(
                        {
                            "trial": i,
                            "results": decisions,
                            "walk": witness,
                            "arm": arm,
                            "region": region,
                            "observerBrowser": browser.version,
                        }
                    )
                    print(
                        region,
                        i,
                        [
                            (
                                round(q["clock"]),
                                q["reason"],
                                q["oldExitsLostByHolding"],
                                q["nativeReservedExitsGained"],
                            )
                            for q in decisions
                        ],
                        flush=True,
                    )
                    args.out.write_text(json.dumps(rows, indent=2) + "\n")
                if witness if args.walk else i and decisions:
                    break
            browser.close()
    finally:
        srv.shutdown()


if __name__ == "__main__":
    main()
