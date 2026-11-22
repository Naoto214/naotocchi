"""Check native bearing masks and the owner comparison at all four requested mobile widths."""

import argparse
import base64
import functools
import hashlib
import http.server
import json
import tempfile
import threading
from pathlib import Path
from shutil import copyfile
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def check_data(data, captures):
    counts = 0
    for cell in data["cases"]:
        arm = "v10-reference" if cell["seats"] == "reference" else "v10"
        raw = json.loads((captures / f"{cell['width']}-{arm}.json").read_text())
        assert data["grids"][str(cell["width"])]["mask"] == raw["geometry"]["terrain"]
        scale = raw["geometry"]["scale"]
        for snapshot, source in zip(cell["phases"], raw["phases"], strict=True):
            assert len(snapshot["rows"]) == 28 and source["label"] == snapshot["label"]
            for row, a in zip(snapshot["rows"], source["rays"], strict=True):
                assert row[0] == a["key"] and row[1:3] == [
                    round(a["x"] * scale["x"], 2),
                    round(a["y"] * scale["y"], 2),
                ]
                for i, encoded in enumerate(row[6]):
                    decoded = base64.b64decode(encoded)
                    angles = [j for j in range(96) if decoded[j // 8] & (1 << (j % 8))]
                    assert angles == a["result"][i]["safe"] and row[3 + i] == len(
                        angles
                    )
                    counts += 1
    return counts


def main(args):
    source = HERE / "evidence/space-map.json"
    data = json.loads(source.read_text())
    bearing_masks = check_data(data, args.captures)
    summary = {
        "observer": "Chromium",
        "observedMasks": bearing_masks,
        "dataSHA256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "browsers": [],
    }
    with tempfile.TemporaryDirectory() as staging:
        dst = Path(staging)
        for f in ("space.html", "space-view.mjs"):
            copyfile(HERE / f, dst / f)
        copyfile(source, dst / source.name)
        server = http.server.ThreadingHTTPServer(
            ("127.0.0.1", 0), functools.partial(Quiet, directory=staging)
        )
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            with sync_playwright() as pw:
                b = pw.chromium.launch(executable_path=args.chromium)
                summary["version"] = b.version
                for width in (320, 375, 390, 430):
                    page = b.new_page(
                        viewport={"width": width, "height": 792},
                        is_mobile=True,
                        device_scale_factor=2,
                        has_touch=True,
                    )
                    errors = []
                    page.on("pageerror", lambda e: errors.append(str(e)))
                    page.goto(f"http://127.0.0.1:{server.server_port}/space.html")
                    page.wait_for_function(
                        "document.querySelectorAll('#resident option').length===28"
                    )
                    page.locator("#width").select_option(str(width))
                    tested = 0
                    for seat in ("original", "reference"):
                        page.locator("#seats").select_option(seat)
                        family = next(
                            x
                            for x in data["cases"]
                            if x["width"] == width and x["seats"] == seat
                        )
                        for label in ("opening", "300", "aged"):
                            page.locator("#phase").select_option(label)
                            frame = next(
                                x for x in family["phases"] if x["label"] == label
                            )
                            for index, distance in enumerate((3, 8, 16)):
                                page.locator("#range").select_option(str(distance))
                                for key in (
                                    "pet:dog",
                                    "companion:tanuki",
                                    "companion:panda",
                                    "companion:box",
                                ):
                                    page.locator("#resident").select_option(key)
                                    r = next(x for x in frame["rows"] if x[0] == key)
                                    assert (
                                        f"96方位中{r[3 + index]}方向"
                                        in page.locator("#reading").inner_text()
                                    )
                                    tested += 1
                    page.locator("#map").scroll_into_view_if_needed()
                    rect = page.locator("#map").bounding_box()
                    g = data["grids"][str(width)]
                    x, y = frame["rows"][0][1:3]
                    page.touchscreen.tap(
                        round(rect["x"] + rect["width"] * x / (g["cols"] * g["step"])),
                        round(rect["y"] + rect["height"] * y / (g["rows"] * g["step"])),
                    )
                    assert page.locator("#resident").input_value() == "pet:dog", (
                        width,
                        rect,
                        x,
                        y,
                        page.locator("#resident").input_value(),
                    )
                    assert (
                        page.evaluate(
                            "document.documentElement.scrollWidth<=innerWidth"
                        )
                        and not errors
                    )
                    assert (
                        abs(rect["width"] / rect["height"] - g["cols"] / g["rows"])
                        < 0.001
                    )
                    summary["browsers"].append(
                        {
                            "width": width,
                            "checkedSelections": tested,
                            "tapSelectedDog": True,
                            "overflow": False,
                            "errors": errors,
                        }
                    )
                    page.close()
                b.close()
        finally:
            server.shutdown()
    args.out.write_text(json.dumps(summary, indent=2) + "\n")
    print(summary)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--captures", type=Path, required=True)
    p.add_argument("--chromium", default="/usr/bin/chromium")
    p.add_argument("--out", type=Path, required=True)
    main(p.parse_args())
