"""Replay a real 180-second household and physically test its recorded oblique native walking corridor."""

import argparse
import functools
import http.server
import json
import threading
from pathlib import Path
from unittest.mock import patch

from foot_geometry_guard import HERE, WorldProbe, instrument
import matrix_worker_v11 as house


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("dist", type=Path)
    p.add_argument("out", type=Path)
    p.add_argument(
        "--receipt", type=Path, default=HERE / "evidence/foot-mountain-corridor.json"
    )
    args = p.parse_args()
    record = json.loads(args.receipt.read_bytes())
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(WorldProbe, directory=args.dist)
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = "http://127.0.0.1:" + str(server.server_port)
    try:
        with house.old.sync_playwright() as playwright:
            browser = playwright.chromium.launch(executable_path="/usr/bin/chromium")
            with (
                patch.object(house.v9, "patched", instrument),
                house.v9.native_page(
                    browser, url, "mountain", 10, 320, "v11", True
                ) as (page, touch, meta),
            ):
                page.evaluate(house.baseline.v8.AGE_PROBE)
                page.evaluate(house.baseline.v8.PAINT_PROBE)
                before = page.evaluate("""()=>{
                  HomeMobilityDiagnostics.enable(); HomeCastTrial.apply({paused:false});touchQA.log=null;touchQA.paint();
                  touchQA.ageActive=true;touchQA.advance(180,true);touchQA.ageActive=false;return touchQA.matrixState();
                }""")
                for resident, sample in zip(
                    before["actors"], record["points"], strict=True
                ):
                    assert resident["key"] == sample["key"]
                    assert (
                        max(
                            abs(v - w)
                            for v, w in zip(
                                [resident["x"], resident["y"]],
                                sample["before"],
                                strict=True,
                            )
                        )
                        < 1e-6
                    )
                result = page.evaluate(
                    "r=>walkAvailableBearing(r)", dict(record, snapshot=before)
                )
                assert result["accepted"] and result["arrived"] and result["steps"] > 1
                assert result["safetyErrors"] == 0 and not any(
                    result["nativeSafetyDelta"].values()
                )
                args.out.write_text(
                    json.dumps(
                        dict(seed=meta["seed"], browser=browser.version, walk=result),
                        indent=2,
                    )
                    + "\n"
                )
            browser.close()
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
