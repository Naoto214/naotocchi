"""Measure sampled walkable area and topology; keep native bearing and contact checks separate."""

import argparse
import base64
import collections
import csv
import json
import math
from pathlib import Path

import numpy as np
from scipy import ndimage as nd

CROSS = nd.generate_binary_structure(2, 1)


def binary_mask(data, key, encoded):
    grid = data[key]
    bits = np.unpackbits(
        np.frombuffer(base64.b64decode(encoded), dtype="u1"), bitorder="little"
    )
    return (
        bits[: grid["cols"] * grid["rows"]]
        .reshape((grid["rows"], grid["cols"]))
        .astype(bool)
    )


def thinning(mask):
    """Zhang–Suen topology-preserving thinning, with an explicit exterior background."""
    active = np.pad(mask, 1)
    while True:
        changes = 0
        for stage in (0, 1):
            center = active[1:-1, 1:-1]
            n = [
                active[:-2, 1:-1],
                active[:-2, 2:],
                active[1:-1, 2:],
                active[2:, 2:],
                active[2:, 1:-1],
                active[2:, :-2],
                active[1:-1, :-2],
                active[:-2, :-2],
            ]
            count = sum(q.astype("u1") for q in n)
            switches = sum((~q & n[(i + 1) % 8]).astype("u1") for i, q in enumerate(n))
            if stage == 0:
                break_ok = ~(n[0] & n[2] & n[4]) & ~(n[2] & n[4] & n[6])
            else:
                break_ok = ~(n[0] & n[2] & n[6]) & ~(n[0] & n[4] & n[6])
            removable = (
                center & (count >= 2) & (count <= 6) & (switches == 1) & break_ok
            )
            changes += np.count_nonzero(removable)
            center[removable] = False
        if not changes:
            return active[1:-1, 1:-1]


def topology(mask, step):
    area = step**2
    labels, n = nd.label(mask, CROSS)
    regions = sorted(
        (int(p) * area for p in np.bincount(labels.ravel())[1:]), reverse=True
    )
    skeleton = thinning(mask)
    points = set(zip(*np.nonzero(skeleton)))

    def neighbors(p):
        y, x = p
        return [
            (y + dy, x + dx)
            for dy in (-1, 0, 1)
            for dx in (-1, 0, 1)
            if (dy or dx)
            and (y + dy, x + dx) in points
            and (
                not dy
                or not dx
                or ((y + dy, x) not in points and (y, x + dx) not in points)
            )
        ]

    links = {p: neighbors(p) for p in points}
    radius = nd.distance_transform_edt(np.pad(mask, 1))[1:-1, 1:-1] * step
    dead_ends, necks = [], []
    seen = set()
    for p in sorted(points):
        if len(links[p]) == 2:
            continue
        for nxt in links[p]:
            if (p, nxt) in seen:
                continue
            chain = [p, nxt]
            seen.add((p, nxt))
            seen.add((nxt, p))
            while len(links[chain[-1]]) == 2:
                curr = chain[-1]
                following = next(q for q in links[curr] if q != chain[-2])
                if (curr, following) in seen:
                    break
                seen.update(((curr, following), (following, curr)))
                chain.append(following)
            length = step * sum(math.dist(a, b) for a, b in zip(chain, chain[1:]))
            ends = [len(links[c]) for c in (chain[0], chain[-1])]
            if length < 8:
                continue
            if 1 in ends and max(ends) >= 3:
                end = chain[ends.index(1) * (len(chain) - 1)]
                dead_ends.append(
                    [
                        round(float(length), 2),
                        (int(end[1]) + 0.5) * step,
                        (int(end[0]) + 0.5) * step,
                    ]
                )
            if min(ends) >= 3 and len(chain) >= 5:
                middle = min(chain[1:-1], key=lambda p: radius[p])
                # A neck must be locally narrower than BOTH junctions by one full grid spacing.
                if radius[middle] + step <= min(radius[chain[0]], radius[chain[-1]]):
                    necks.append(
                        [
                            round(float(2 * radius[middle]), 2),
                            (int(middle[1]) + 0.5) * step,
                            (int(middle[0]) + 0.5) * step,
                        ]
                    )
    local_width = (2 * radius[skeleton]).tolist()
    return {
        "components": n,
        "componentsAtLeast64px2": sum(v >= 64 for v in regions),
        "largestPx2": regions[:5],
        "endsAtLeast8px": len(dead_ends),
        "deadEndExamples": sorted(dead_ends, reverse=True)[:5],
        "necks": len(necks),
        "neckExamples": sorted(necks)[:5],
        "centrelineWidthP10": round(float(np.quantile(local_width, 0.1)), 2)
        if local_width
        else None,
        "centrelineWidthMedian": round(float(np.median(local_width)), 2)
        if local_width
        else None,
    }


def csv_file(path, rows):
    with path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=tuple(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def direction_mask(indices, count):
    result = bytearray((count + 7) // 8)
    for i in indices:
        result[i // 8] |= 1 << (i % 8)
    return base64.b64encode(result).decode()


def analyze(path):
    data = json.loads(path.read_text())
    published = (
        Path(__file__).resolve().parent.parent
        / "home-mobility-v10"
        / "evidence"
        / "forest-all"
    )
    with (published / "forest-cells.csv").open() as f:
        cell = next(
            r for r in csv.DictReader(f) if r["raw_sha256"] == data["sourceSHA"]
        )
    with (published / "forest-residents.csv").open() as f:
        actors = {
            r["key"]: r
            for r in csv.DictReader(f)
            if all(
                r[k] == cell[k] for k in ("width", "seed", "order", "arm", "model_s")
            )
        }
    assert len(actors) == 28
    g = data["geometry"]
    axes = g["scale"]
    step = g["step"]
    area = step**2
    terrain = binary_mask(data, "geometry", g["terrain"])
    masks = [binary_mask(data, "geometry", m) for m in g["allowed"]]
    y, x = np.indices(terrain.shape)
    x = (x + 0.5) * step / axes["x"]
    y = (y + 0.5) * step / axes["y"]
    common = {
        "width": data["width"],
        "seats": "reference" if data["arm"].endswith("reference") else "original",
        "seed": data["seed"],
    }
    metrics = {
        **common,
        "sourceRawSHA256": data["sourceSHA"],
        "nativeModelSHA256": data["modelSHA"],
        "probeSHA256": data["probeSHA"],
        "browser": data["browser"],
        "sectors": data["sectors"],
        "stepCss": step,
        "model": g["model"],
        "displayScale": axes,
        "terrainAreaPx2": int(terrain.sum() * area),
        "terrainTopology": topology(terrain, step),
    }
    matrix = []
    residents = []
    blockers = collections.Counter()
    times = {}
    compact = []
    persist = None
    reclosed = collections.Counter()
    neighbor_moves = collections.Counter()
    old = {}
    for frame in data["phases"]:
        rays = frame["rays"]
        contacts = sum(len(a["contacts"]) for a in rays) // 2
        per_distance = [sum(not a["result"][j]["safe"] for a in rays) for j in range(3)]
        no_terrain = [sum(not a["result"][j]["legal"] for a in rays) for j in range(3)]
        unavailable = {a["key"] for a in rays if not a["result"][1]["safe"]}
        persist = unavailable if persist is None else persist & unavailable
        now = {k: np.array([px, py]) for k, px, py, *_ in frame["feet"]}
        rows_compact = []
        for i, a in enumerate(rays):
            k = a["key"]
            b = actors[k]
            nearby = [
                o["key"]
                for o in rays
                if o["key"] != k
                and abs(o["x"] - a["x"]) < (a["w"] + o["w"]) / 2 + 10 + 24 / axes["x"]
                and abs(o["y"] - a["y"])
                < (a["h"] + o["h"]) * 0.38 + 10 + 24 / axes["y"]
            ]
            moved = old and any(
                math.hypot(*((now[q] - old[q]) * [axes["x"], axes["y"]])) >= 3
                for q in nearby
            )
            if moved:
                neighbor_moves[k] += 1
                if k in unavailable:
                    reclosed[k] += 1
            details = {
                **common,
                "phase": frame["label"],
                "modelSeconds": round(frame["clock"], 3),
                "key": k,
                "footX": a["x"],
                "footY": a["y"],
                "bodyW": a["w"],
                "bodyH": a["h"],
                "contacts": len(a["contacts"]),
                "contactPeerKeys": " ".join(p for p, _ in a["contacts"]),
                "nearbyMoved3Css": int(bool(moved)),
                "requested": b["requests"],
                "accepted": b["routed"],
                "normalWalksAt600": b["normal_at_600"],
                "longestUnmetNormalDemand_s": b[
                    "longest_refusal_to_normal_before_idle_s"
                ],
            }
            for distance, result in zip(data["distances"], a["result"]):
                details[f"terrainAndArt{distance}"] = result["legal"]
                details[f"safe{distance}"] = len(result["safe"])
                if distance == 8:
                    for n, cnt in enumerate(result["counts"]):
                        details[f"eightBlockedBy{n}"] = cnt
                    blockers.update(result["blockers"])
            rows_compact.append(
                [
                    k,
                    round(a["x"] * axes["x"], 2),
                    round(a["y"] * axes["y"], 2),
                    *[len(r["safe"]) for r in a["result"]],
                    [direction_mask(r["safe"], data["sectors"]) for r in a["result"]],
                    details["contactPeerKeys"],
                ]
            )
            residents.append(details)
        old = now
        compact.append(
            {
                "label": frame["label"],
                "clock": round(frame["clock"], 1),
                "rows": rows_compact,
            }
        )
        times[frame["label"]] = {
            "zeroSolo3_8_16": per_distance,
            "zeroTerrain3_8_16": no_terrain,
            "contactPairs": contacts,
        }
        if "passing" not in frame:
            continue
        widths = [(a["w"] + 10) * axes["x"] for a in rays]
        heights = [(a["h"] * 0.76 + 10) * axes["y"] for a in rays]
        contact_sum = math.pi / 4 * sum(w * h for w, h in zip(widths, heights))
        coverage_by_foot = np.zeros_like(terrain, dtype=np.uint8)
        for a in rays:
            foot = ((x - a["x"]) / (a["w"] / 2 + 5)) ** 2 + (
                (y - a["y"]) / (a["h"] * 0.38 + 5)
            ) ** 2 < 1
            coverage_by_foot += foot
        times[frame["label"]].update(
            sumOfFullContactEllipseAreasPx2=round(contact_sum, 2),
            medianContactDiameterCss=[
                round(float(np.median(widths)), 2),
                round(float(np.median(heights)), 2),
            ],
            footContactUnionPx2=int(((coverage_by_foot > 0) & terrain).sum() * area),
            footContactUnionPct=round(
                100 * float(((coverage_by_foot > 0) & terrain).sum() / terrain.sum()), 2
            ),
            footOverlapPx2=int(((coverage_by_foot > 1) & terrain).sum() * area),
        )
        covered = []
        statics = []
        allfree = []
        for i, a in enumerate(rays):
            blocked = np.zeros_like(terrain)
            for b in rays:
                if a is b:
                    continue
                rx = (a["w"] + b["w"]) * 0.5 + 10
                ry = (a["h"] + b["h"]) * 0.38 + 10
                blocked |= ((x - b["x"]) / rx) ** 2 + ((y - b["y"]) / ry) ** 2 < 1
            valid = masks[i]
            free = valid & ~blocked
            statics.append(int(valid.sum() * area))
            allfree.append(free)
            coverage = int((valid & blocked).sum() * area)
            covered.append(coverage / statics[-1])
            matrix.append(
                {
                    **common,
                    "phase": frame["label"],
                    "key": a["key"],
                    "withoutPeers_px2": statics[-1],
                    "blockedByPeers_px2": coverage,
                    "free_px2": int(free.sum() * area),
                    "blockedPct": round(100 * covered[-1], 3),
                }
            )
        rep = frame["passing"]["pair"][0]
        slot = g["keys"].index(rep)
        times[frame["label"]].update(
            contactCoverageMedianPct=round(100 * float(np.median(covered)), 2),
            contactCoverageRangePct=[
                round(100 * min(covered), 2),
                round(100 * max(covered), 2),
            ],
            representative=rep,
            representativeArea=statics[slot],
            representativeTopology=topology(masks[slot], step),
            representativeFreeArea=int(allfree[slot].sum() * area),
            representativeFreeTopology=topology(allfree[slot], step),
            passing=frame["passing"],
        )
    metrics.update(
        snapshots=times,
        neverAnySolo8Samples=sorted(persist),
        postNeighborMovementBlocked8=dict(reclosed),
        changedNeighborObservations=dict(neighbor_moves),
        blockerInstances8=blockers.most_common(),
        routineRequests=sum(
            r["source"] == "ambient" and r["planned"] for r in data["requests"]
        ),
        routineAccepted=sum(
            r["source"] == "ambient" and r["planned"] and r["accepted"]
            for r in data["requests"]
        ),
    )
    return (
        metrics,
        residents,
        matrix,
        {
            "width": data["width"],
            "seats": common["seats"],
            "grid": {
                "cols": g["cols"],
                "rows": g["rows"],
                "step": step,
                "mask": g["terrain"],
            },
            "phases": compact,
        },
    )


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("raw", type=Path)
    p.add_argument("out", type=Path)
    args = p.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    info = []
    residents = []
    matrix = []
    browser = []
    for path in sorted(args.raw.glob("*-v10*.json")):
        m, r, a, b = analyze(path)
        info.append(m)
        residents += r
        matrix += a
        browser.append(b)
    assert len(info) == 8
    csv_file(args.out / "space-residents.csv", residents)
    csv_file(args.out / "space-area.csv", matrix)
    (args.out / "space-summary.json").write_text(
        json.dumps(info, ensure_ascii=False, indent=2) + "\n"
    )
    # Share masks across the two seat policies to keep the owner comparison small.
    grids = {}
    cells = []
    for b in browser:
        grids.setdefault(str(b["width"]), b["grid"])
        assert grids[str(b["width"])] == b["grid"]
        cells.append({k: v for k, v in b.items() if k != "grid"})
    (args.out / "space-map.json").write_text(
        json.dumps({"grids": grids, "cases": cells}, separators=(",", ":")) + "\n"
    )
    print(
        f"{len(info)} cases, {len(residents)} resident snapshots and {len(matrix)} area estimates"
    )


if __name__ == "__main__":
    main()
