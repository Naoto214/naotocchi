"""Compare every same-pose pre/post-guard native bearing, terrain mask, pass and retreat."""

import argparse, base64, collections, gzip, hashlib, json, re
from pathlib import Path


def native(p):
    return json.loads(gzip.decompress(p.read_bytes()))


def bits(s):
    return int.from_bytes(base64.b64decode(s), "little")


def main(a):
    rows = []
    totals = collections.Counter()
    witnesses = []
    lost_exits = []
    sources = {}
    for arm in ("b", "c", "d"):
        world = f"home-production-world-v13-{arm}-finish.mjs"
        old, new = [
            (dist / "game" / world).read_bytes()
            for dist in (a.before_dist, a.after_dist)
        ]
        find_polygons = lambda b: json.loads(
            re.search(rb"const patches=(\[.*?\]);", b).group(1)
        )
        assert find_polygons(old) == find_polygons(new), arm
        sources[arm] = dict(
            oldWorld=hashlib.sha256(old).hexdigest(),
            newWorld=hashlib.sha256(new).hexdigest(),
            polygons=find_polygons(old),
        )

    for path in sorted(a.after.glob("*.json.gz")):
        old = a.before / path.name
        if not old.exists():
            continue
        left = native(old)
        right = native(path)
        assert (
            left["guardSHA"]
            == "ad5799057e9e9cd43f6cb57b22e27c1b635d648d1fe4d8d682fbc8b6278ad538"
        )
        assert (
            right["guardSHA"]
            == "bd2d071bb658caf24f9834d0b5a41445d6199fa67bf648a11557cd76c5eed2bd"
        )
        assert left["poseDigest"] == right["poseDigest"]
        assert len(left["frames"]) == len(right["frames"])
        row = dict(
            case=path.name,
            old_model=left["source"],
            old_guard_sha=left["guardSHA"],
            new_model=right["source"],
            new_guard_sha=right["guardSHA"],
            old_raw=hashlib.sha256(old.read_bytes()).hexdigest(),
            new_raw=hashlib.sha256(path.read_bytes()).hexdigest(),
            sameTerrain=left["ground"] == right["ground"],
            sameInkBounds=left["allowed"] == right["allowed"],
        )
        delta = collections.Counter()
        for f, g in zip(left["frames"], right["frames"]):
            assert f["phase"] == g["phase"] and len(f["actors"]) == len(g["actors"])
            if f["passing"] and g["passing"]:
                delta["passingSitesLost"] += len(
                    set(map(tuple, f["passing"]["positions"]))
                    - set(map(tuple, g["passing"]["positions"]))
                )
                delta["passingSitesGained"] += len(
                    set(map(tuple, g["passing"]["positions"]))
                    - set(map(tuple, f["passing"]["positions"]))
                )
            for l, r in zip(f["actors"], g["actors"]):
                assert l["key"] == r["key"]
                if [l[k] for k in ("x", "y", "rx", "ry")] != [
                    r[k] for k in ("x", "y", "rx", "ry")
                ]:
                    delta["changedFootOrAxis"] += 1
                if l["refuge"] != r["refuge"]:
                    delta["changedRefugeLists"] += 1
                for distance, x, y in zip([3, 8, 16], l["rays"], r["rays"]):
                    for layer in ("terrain", "clear"):
                        orig, now = bits(x[layer]), bits(y[layer])
                        lost = (orig & ~now).bit_count()
                        gained = (now & ~orig).bit_count()
                        delta[f"{layer}BearingsTested"] += 96
                        delta[f"{layer}BearingsLost"] += lost
                        delta[f"{layer}BearingsGained"] += gained
                        if lost or gained:
                            if layer == "clear":
                                if orig > 0 and now == 0:
                                    lost_exits.append(
                                        dict(
                                            case=path.name,
                                            phase=f["phase"],
                                            time=f["time"],
                                            resident=l["key"],
                                            distance=distance,
                                            headingsBefore=orig.bit_count(),
                                        )
                                    )
                                delta["lastExitLost"] += int(orig > 0 and now == 0)
                                delta["firstExitOpened"] += int(now > 0 and orig == 0)
                            if len(witnesses) < 80:
                                witnesses.append(
                                    dict(
                                        case=path.name,
                                        phase=f["phase"],
                                        resident=l["key"],
                                        distance=distance,
                                        layer=layer,
                                        old=orig.bit_count(),
                                        new=now.bit_count(),
                                        lost=lost,
                                        gained=gained,
                                    )
                                )
        totals.update(delta)
        row.update(delta)
        rows.append(row)
    assert len(rows) == a.expected and totals["changedFootOrAxis"] == 0
    result = dict(
        sourceWorldModules=sources,
        lastExitLosses=lost_exits,
        cases=len(rows),
        totals=totals,
        sameTerrain=sum(c["sameTerrain"] for c in rows),
        sameInkBounds=sum(c["sameInkBounds"] for c in rows),
        witnesses=witnesses,
        rows=rows,
    )
    a.out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(result["cases"], totals)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--before", type=Path, required=True)
    p.add_argument("--after", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--before-dist", type=Path, required=True)
    p.add_argument("--after-dist", type=Path, required=True)
    p.add_argument("--expected", type=int, default=84)
    main(p.parse_args())
