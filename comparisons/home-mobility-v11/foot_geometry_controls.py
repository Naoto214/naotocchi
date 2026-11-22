"""Positive stationary and real viewport-change controls for the experimental geometry decision."""

import argparse, functools, http.server, json, threading
from pathlib import Path
from unittest.mock import patch
import matrix_worker_v11 as house
from foot_geometry_guard import WorldProbe, instrument

if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("dist", type=Path)
    p.add_argument("out", type=Path)
    args = p.parse_args()
    srv = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(WorldProbe, directory=args.dist)
    )
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = "http://127.0.0.1:" + str(srv.server_port)
    rows = []
    try:
        with house.old.sync_playwright() as pw:
            b = pw.chromium.launch(executable_path="/usr/bin/chromium")
            for region in ["forest", "mountain"]:
                with (
                    patch.object(house.v9, "patched", instrument),
                    house.v9.native_page(b, url, region, 10, 320, "v11-foot", True) as (
                        page,
                        touch,
                        meta,
                    ),
                ):
                    page.evaluate(
                        "f=>replayArchivedReprojection(f)",
                        [r[:5] for r in meta["opening"]],
                    )
                    pos = page.evaluate("touchQA.geometryDecisions.at(-1)")
                    assert (
                        pos["strictCanKeep"]
                        and pos["exactConstructor"]
                        and pos["exactEffectiveGeometry"]
                    )
                    page.evaluate(
                        "window.footReplayWindow=true;touchQA.geometryDecisions=[]"
                    )
                    page.set_viewport_size({"width": 375, "height": 615})
                    page.wait_for_function(
                        "touchQA.geometryDecisions?.some(r=>!r.exactEffectiveGeometry)"
                    )
                    neg = page.evaluate(
                        "touchQA.geometryDecisions.find(r=>!r.exactEffectiveGeometry)"
                    )
                    assert not neg["strictCanKeep"]
                    rows.append(
                        dict(
                            region=region,
                            originalWidth=320,
                            changedWidth=375,
                            stationary=pos,
                            resize=neg,
                            browser=b.version,
                        )
                    )
                    print(region, pos["reason"], neg["reason"], flush=True)
                    args.out.write_text(json.dumps(rows, indent=2) + "\n")
            b.close()
    finally:
        srv.shutdown()
