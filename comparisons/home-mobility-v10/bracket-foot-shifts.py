"""Bracket every discontinuity by observed peer feet, never adding it to walking distance."""

import argparse, csv, gzip, hashlib, json, math
from pathlib import Path

p = argparse.ArgumentParser(description=__doc__)
p.add_argument("cells", type=Path)
p.add_argument("archive", type=Path)
p.add_argument("out", type=Path)
a = p.parse_args()
with a.cells.open() as f:
    cells = list(csv.DictReader(f))
by_digest = {
    hashlib.sha256(p.read_bytes()).hexdigest(): p
    for p in a.archive.glob("*/*/forest28.json.gz")
}
rows = []
for c in cells:
    raw = by_digest[c["raw_sha256"]]
    d = json.loads(gzip.open(raw, "rb").read())
    open_ = {p[0]: p[2:4] for p in d["opening"]["actors"]}
    traj = d["trajectory"]
    req = d["log"]["requests"]
    ms = d["log"]["motions"]
    end = d["baseline"]["modelSeconds"]
    bykey = {k: [] for k in open_}
    for q in req:
        for p in q["peers"]:
            bykey[p[0]].append((q["clock"], p[1:3]))
    count = 0
    for r in d["baseline"]["residents"]:
        k = r["key"]
        before = open_[k]
        start = 0
        for m in [m for m in ms if m["key"] == k] + [
            dict(
                startClock=end,
                from_=[r["x"], r["y"]],
                scale=req[0]["scale"],
                lastClock=end,
                last=[r["x"], r["y"]],
            )
        ]:
            after = m.get("from", m.get("from_"))
            stop = m["startClock"]
            dist = math.hypot(
                *[(x - y) * s for x, y, s in zip(before, after, m["scale"])]
            )
            if dist > 1e-4:
                count += 1
                last_observed = max(
                    [start]
                    + [t for t, p in bykey[k] if start <= t <= stop and p == before]
                )
                first_observed = min(
                    [stop]
                    + [
                        t
                        for t, p in bykey[k]
                        if last_observed <= t <= stop and p == after
                    ]
                )
                own_obs = [
                    (t["clock"], t["wall"], v[1:3])
                    for t in traj
                    for v in t["actors"]
                    if v[0] == k
                ]
                t0 = max(
                    [
                        (t, w)
                        for t, w, p in own_obs
                        if t <= first_observed and p == before
                    ],
                    default=(start, 0),
                )
                t1 = min(
                    [
                        (t, w)
                        for t, w, p in own_obs
                        if t >= last_observed and p == after
                    ],
                    default=(stop, d["wallSeconds"]),
                )
                lo = max([0] + [t["wall"] for t in traj if t["clock"] <= last_observed])
                hi = min(
                    [d["wallSeconds"]]
                    + [t["wall"] for t in traj if t["clock"] >= first_observed]
                )
                lo = max(lo, t0[1])
                hi = min(hi, t1[1])
                gates = sorted(
                    {
                        n
                        for ev in d["events"]["gateTransitions"]
                        if lo - 1 <= ev["wallSeconds"] <= hi + 1
                        for n in ev["reasons"]
                    }
                )
                rows.append(
                    {
                        **{f: c[f] for f in ("arm", "width", "seed", "order")},
                        "key": k,
                        "distanceCss": dist,
                        "from": before,
                        "to": after,
                        "lastRecordedOldModel": last_observed,
                        "firstRecordedNewModel": first_observed,
                        "bracketWall": [lo, hi],
                        "nearbyGates": gates,
                        "sourceSHA256": c["raw_sha256"],
                    }
                )
            before = m["last"]
            start = m["lastClock"]
    assert count == int(c["between_legs_shifts"]), (count, c)
a.out.write_text(json.dumps(rows, separators=(",", ":")) + "\n")
