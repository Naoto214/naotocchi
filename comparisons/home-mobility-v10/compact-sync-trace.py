"""Keep the reproducible movement and DOM evidence from a supplemental Sync observation."""

import argparse, gzip, hashlib, json, math
from pathlib import Path

p = argparse.ArgumentParser(description=__doc__)
p.add_argument("observed", type=Path)
p.add_argument("output", type=Path)
a = p.parse_args()
path = a.observed / "forest28.json.gz"
raw = path.read_bytes()
session = json.loads(gzip.decompress(raw))
assert not session["errors"]
shifts = session["log"]["syncShifts"]
for s in shifts:
    v, w = s["before"], s["after"]
    scale = s["scale"]
    s["distanceCSS"] = math.hypot(
        (v[0] - w[0]) * scale["x"], (v[1] - w[1]) * scale["y"]
    )
out = {
    k: session[k]
    for k in (
        "arm",
        "width",
        "seed",
        "order",
        "browser",
        "wallSeconds",
        "sources",
        "errors",
    )
}
out.update(
    modelSeconds=session["baseline"]["modelSeconds"],
    rawSHA256=hashlib.sha256(raw).hexdigest(),
    renderer=json.loads((a.observed / "renderer-sha.json").read_text()),
    syncShifts=shifts,
    gatesAtFiveMinutes=[
        e
        for e in session["events"]["gateTransitions"]
        if 285 <= e["wallSeconds"] <= 310
    ],
)
a.output.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
