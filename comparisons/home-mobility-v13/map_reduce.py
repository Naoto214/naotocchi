"""Generate individual atlas records and area tables in CSS pixel coordinates."""

import argparse, base64, collections, csv, functools, gzip, hashlib, json, math, sys, zlib
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as nd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "home-mobility-v11"))
from space_metrics import topology, thinning


def unpack(s, rows, cols):
    return (
        np.unpackbits(
            np.frombuffer(base64.b64decode(s), dtype="u1"), bitorder="little"
        )[: rows * cols]
        .reshape(rows, cols)
        .astype(bool)
    )


def compressed(s):
    return base64.b64encode(zlib.compress(base64.b64decode(s), 9)).decode()


def bound(value):
    return round(float(value), 2)


def polygon(x, y, points):
    inside = np.zeros(np.broadcast_shapes(x.shape, y.shape), bool)
    for a, b in zip(points, points[1:] + points[:1]):
        if a[1] != b[1]:
            inside ^= ((a[1] > y) != (b[1] > y)) & (
                x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]
            )
    return inside


@functools.lru_cache(maxsize=130)
def source_ink(path):
    alpha = np.asarray(Image.open(path).convert("RGBA"))[:, :, 3] >= 32
    yy, xx = np.nonzero(alpha)
    x0, x1, y0, y1 = int(xx.min()), int(xx.max() + 1), int(yy.min()), int(yy.max() + 1)
    bottom = int(y1 - math.ceil((y1 - y0) * 0.15))
    y, x = np.nonzero(alpha[bottom:y1])
    return alpha.shape, [x0, y0, x1, y1], [int(x.min()), bottom, int(x.max() + 1), y1]


def art_body(person, game):
    rh, body, band = source_ink(str(game / person["asset"]))
    sw, sh = rh[1], rh[0]
    left, top, width, height = person["rect"]
    # The PNG and the pre-transform CSS image box are square. CSS facing and
    # idle motion transform this box independently on the two screen axes.
    if sw != sh:
        raise ValueError(
            f"Non-square native sprite needs its layout fit: {person['asset']}"
        )
    screen_x, screen_y = width / sw, height / sh

    def extent(box):
        return [
            bound((box[2] - box[0]) * screen_x),
            bound((box[3] - box[1]) * screen_y),
        ]

    mirrored = person.get("flip", "none").split(" ")[0] == "-1"
    # Native opening faces +1; earlier captures record the visual parent instead of the img.
    if person.get("origin") is None:
        mirrored = person["key"].split(":")[-1] in {
            "dog",
            "shiba",
            "cat_friend",
            "squirrel",
            "parrot",
        }

    def projected(box):
        l, t, r, b = box
        if mirrored:
            l, r = sw - r, sw - l
        return [
            bound(left + l * screen_x - person["foot"]["x"]),
            bound(top + t * screen_y - person["foot"]["y"]),
            bound(left + r * screen_x - person["foot"]["x"]),
            bound(top + b * screen_y - person["foot"]["y"]),
        ]

    return {
        "key": person["key"],
        "label": person["label"],
        "asset": person["asset"],
        "rect": [bound(n) for n in person["rect"]],
        "foot": [bound(person["foot"][k]) for k in ("x", "y")],
        "ink": extent(body),
        "band": extent(band),
        "mirrored": mirrored,
        "inkBounds": projected(body),
        "bandBounds": projected(band),
    }


def interior_width(ground, step):
    labels, n = nd.label(ground)
    counts = np.bincount(labels.ravel())
    counts[0] = 0
    main = labels == int(np.argmax(counts))
    sk = thinning(main)
    radius = nd.distance_transform_edt(np.pad(main, 1))[1:-1, 1:-1] * step
    neighbors = (
        nd.convolve(sk.astype("u1"), np.ones((3, 3), dtype="u1"), mode="constant") - sk
    )
    tips = sk & (neighbors <= 1)
    within = (
        (nd.distance_transform_edt(~tips) * step >= 8)
        if tips.any()
        else np.ones_like(sk)
    )
    core = sk & within & (neighbors >= 2)
    ys, xs = np.nonzero(core)
    if not len(xs):
        return dict(minimum=None, thin=[])
    diameter = 2 * radius[ys, xs]
    i = int(np.argmin(diameter))
    cross = [
        bound(diameter[i]),
        bound((xs[i] + 0.5) * step),
        bound((ys[i] + 0.5) * step),
    ]
    return dict(
        minimum=cross,
        thin=[
            [bound((x + 0.5) * step), bound((y + 0.5) * step)]
            for x, y, w in zip(xs, ys, diameter)
            if w < 24
        ],
    )


def causes(previous, current):
    heads = np.arange(96) * math.tau / 96
    vx = 8 * np.cos(heads)
    vy = 8 * np.sin(heads)
    result = []
    for i, a in enumerate(previous):
        available = np.unpackbits(
            np.frombuffer(base64.b64decode(a["rays"][1]["terrain"]), dtype="u1"),
            bitorder="little",
        ).astype(bool)
        for j, b in enumerate(current):
            if i == j:
                continue
            rx = a["rx"] + b["rx"]
            ry = a["ry"] + b["ry"]
            x = (a["x"] - b["x"]) / rx
            y = (a["y"] - b["y"]) / ry
            dx = vx / rx
            dy = vy / ry
            dot = x * dx + y * dy
            t = np.clip(-dot / (dx * dx + dy * dy), 0, 1)
            distance = x * x + y * y
            if distance < 1:
                # Exact native first-step clearance uses model units. Frame retains its projection.
                scale = causes.scale
                frac = np.minimum(1, 0.35 / np.hypot(vx / scale["x"], vy / scale["y"]))
                next_d = np.hypot(x + frac * dx, y + frac * dy)
                available &= (dot >= 0) & (
                    (next_d >= 1) | (next_d > math.sqrt(distance) + 1e-6)
                )
            else:
                available &= (x + t * dx) ** 2 + (y + t * dy) ** 2 >= 1
        result.append(int(available.sum()))
    return result


def study(path, game, art, out):
    d = json.loads(gzip.decompress(path.read_bytes()))
    g = d["geometry"]
    region = d["region"]
    w = d["width"]
    count = d["count"]
    oy, ox = g["origin"][1], g["origin"][0]
    paint = g["paint"]
    cols = d["cols"]
    rows = d["rows"]
    step = d["step"]
    cell = step**2
    y, x = np.ogrid[:rows, :cols]
    x = (x + 0.5) * step
    y = (y + 0.5) * step
    ax = (x + ox - paint["left"]) / paint["width"]
    ay = (y + oy - paint["top"]) / paint["height"]
    spec = art[region]
    shown = (x + ox >= 0) & (x + ox < w) & (y + oy >= 0) & (y + oy < d["height"])
    gnd = unpack(d["ground"], rows, cols)
    painted = polygon(ax, ay, spec["ground"]) & (ay >= spec["minZ"])
    for poly in spec["exclude"]:
        painted &= ~polygon(ax, ay, poly)
    tags = path.name.removesuffix(".json.gz").split("-")[3:]
    candidate = next((k for k in tags if k in ["b", "c", "d"]), "a")
    identifier = path.name.removesuffix(".json.gz")
    projection = []
    base_painted = painted.copy()
    patches = (
        json.loads((out / "patches.json").read_text())[candidate]
        if region == "forest"
        else []
    )
    new_ground = np.zeros_like(painted)
    for shape in patches:
        new_ground |= polygon(ax, ay, shape)
    for shape in [*spec["exclude"], *spec["foreground"]]:
        new_ground &= ~polygon(ax, ay, shape)
    painted |= new_ground & (ay >= spec["minZ"])
    added = int((gnd & shown & new_ground & ~base_painted).sum() * cell)
    added_mask = None
    loss = 0
    gain = 0
    if candidate != "a":
        if "living" in tags:
            src = path.with_name(f"forest-{w}-28-long-{tags[1]}.json.gz")
        else:
            src = path.with_name(identifier.removesuffix("-" + candidate) + ".json.gz")
        if src.exists():
            baseline = json.loads(gzip.decompress(src.read_bytes()))
            assert (cols, rows, step, d["scale"]) == (
                baseline["cols"],
                baseline["rows"],
                baseline["step"],
                baseline["scale"],
            )
            old = unpack(baseline["ground"], rows, cols)
            newly = gnd & ~old
            gain = int(newly.sum() * cell)
            loss = int((old & ~gnd).sum() * cell)
            added_mask = base64.b64encode(
                zlib.compress(
                    np.packbits(newly.ravel(), bitorder="little").tobytes(), 9
                )
            ).decode()
    masks = [unpack(s, rows, cols) for s in d["allowed"]]
    land = topology(gnd, step)
    land.update(interior_width(gnd, step))
    people = [art_body(p, game) for p in g["people"]]
    indices = {p["key"]: i for i, p in enumerate(people)}
    ink_by_key = {p["key"]: p for p in people}
    areas = []
    surveys = []
    prior = None
    outframes = []
    for f in d["frames"]:
        actors = f["actors"]
        coverage = np.zeros_like(gnd, dtype="u1")
        reports = []
        for p in actors:
            coverage += ((x - p["x"]) / p["rx"]) ** 2 + (
                (y - p["y"]) / p["ry"]
            ) ** 2 < 1
        if prior is not None:
            causes.scale = d["scale"]
            counterfactual = causes(prior, actors)
        else:
            counterfactual = None
        for i, p in enumerate(actors):
            forbidden = np.zeros_like(gnd)
            by_key = indices[p["key"]]
            valid = masks[i]
            art_person = ink_by_key[p["key"]]
            for b in actors:
                if p is not b:
                    forbidden |= ((x - b["x"]) / (p["rx"] + b["rx"])) ** 2 + (
                        (y - b["y"]) / (p["ry"] + b["ry"])
                    ) ** 2 < 1
            free = valid & ~forbidden
            free_area = int(free.sum()) * cell
            safe = [
                sum(byte.bit_count() for byte in base64.b64decode(r["clear"]))
                for r in p["rays"]
            ]
            terrain = [
                sum(byte.bit_count() for byte in base64.b64decode(r["terrain"]))
                for r in p["rays"]
            ]
            summary = [
                p["key"],
                p["x"],
                p["y"],
                p["rx"],
                p["ry"],
                safe,
                terrain,
                p["contacts"],
                p["refuge"],
                [[r["clear"], r["terrain"]] for r in p["rays"]],
                p["rays"][1]["blockers"],
                int(valid.sum()) * cell,
                free_area,
                None if counterfactual is None else counterfactual[i],
            ]
            reports.append(summary)
            if f["phase"] == "opening":
                projection.append(
                    math.hypot(
                        p["x"] + ox - art_person["foot"][0],
                        p["y"] + oy - art_person["foot"][1],
                    )
                )
            areas.append(
                dict(
                    id=identifier,
                    region=region,
                    width=w,
                    height=d["height"],
                    count=count,
                    phase=f["phase"],
                    key=p["key"],
                    allowed_px2=summary[11],
                    peerfree_px2=free_area,
                    initial_contacts=len(p["contacts"]),
                    safe3=safe[0],
                    safe8=safe[1],
                    safe16=safe[2],
                    terrain8=terrain[1],
                    foot_ellipse_width=bound(2 * p["rx"]),
                    foot_ellipse_height=bound(2 * p["ry"]),
                    ink_width=art_person["ink"][0] if f["phase"] == "opening" else "",
                    ink_height=art_person["ink"][1] if f["phase"] == "opening" else "",
                    ink_low15_width=(
                        art_person["band"][0] if f["phase"] == "opening" else ""
                    ),
                    oldfoot_with_new_peers8=summary[13],
                )
            )
        footpx = int(((coverage > 0) & gnd).sum() * cell)
        total = int(gnd.sum() * cell)
        pct = bound(100 * footpx / total) if total else None
        surv = dict(
            id=identifier,
            region=region,
            width=w,
            height=d["height"],
            count=count,
            arm=candidate,
            phase=f["phase"],
            time=bound(f["time"]),
            terrain_px2=total,
            screen_terrain_px2=int((gnd & shown).sum() * cell),
            additional_painted_px2=added,
            native_gain_px2=gain,
            native_loss_px2=loss,
            legacy_only_visible_px2=int((gnd & shown & ~painted).sum() * cell),
            terrain_per_resident=bound(total / count),
            foot_union_px2=footpx,
            foot_union_pct=pct,
            median_individual_free_px2=bound(np.median([r[12] for r in reports])),
            mean_individual_free_px2=bound(np.mean([r[12] for r in reports])),
            contact_pairs=sum(len(r[7]) for r in reports) // 2,
            solo3=sum(r[5][0] > 0 for r in reports),
            solo8=sum(r[5][1] > 0 for r in reports),
            solo16=sum(r[5][2] > 0 for r in reports),
            zero_terrain8=sum(r[6][1] == 0 for r in reports),
            passing_static=(f["passing"] or {}).get("staticCount"),
            passing_clear=(f["passing"] or {}).get("clear"),
            retreat_people=sum(bool(r[8]) for r in reports),
            centreline_width_min_px=land["minimum"][0] if land["minimum"] else None,
            neck_min_px=land["neckExamples"][0][0] if land["neckExamples"] else None,
            dead_ends=land["endsAtLeast8px"],
        )
        passing = f["passing"]
        if passing:
            passing = {k: passing[k] for k in ["pair", "examples", "positions"]}
        outframes.append(
            dict(
                phase=f["phase"],
                time=surv["time"],
                rows=reports,
                survey=surv,
                passing=passing,
            )
        )
        surveys.append(surv)
        prior = actors
    result = dict(
        id=identifier,
        region=region,
        width=w,
        height=d["height"],
        count=count,
        model=d["source"],
        poseSHA=d["poseDigest"],
        guardSHA=d.get("guardSHA"),
        traceVersion=d.get("traceVersion"),
        traceName=d.get("traceName"),
        traceSources=d.get("traceSources"),
        engine=d["engine"],
        origin=[round(ox, 3), round(oy, 3)],
        paint=[round(paint[k], 4) for k in ["left", "top", "width", "height"]],
        modelScale=d["scale"],
        cols=cols,
        rows=rows,
        step=step,
        ground=compressed(d["ground"]),
        added=added_mask,
        allowed=[compressed(s) for s in d["allowed"]],
        topology=land,
        people=people,
        frames=outframes,
        openingFootVsLiveMax=bound(max(projection)),
        errors=d["errors"],
    )
    (out / f"{identifier}.json").write_text(
        json.dumps(result, separators=(",", ":"), ensure_ascii=False) + "\n"
    )
    return surveys, areas


def main(args):
    art = json.loads((args.out / "art.json").read_text())
    surveys = []
    areas = []
    for path in sorted(args.raw.glob("*.json.gz")):
        s, a = study(path, args.game, art, args.out)
        surveys += s
        areas += a
    for name, rows in [("map-cases.csv", surveys), ("map-residents.csv", areas)]:
        with (args.evidence / name).open("w") as f:
            wr = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator="\n")
            wr.writeheader()
            wr.writerows(rows)
    living = {}
    for f in args.out.glob("forest-*-28-living-*.json"):
        _, width, _, _, seats, *arm = f.stem.split("-")
        living.setdefault(width, {}).setdefault(seats, []).append("-".join(arm))
    for profiles in living.values():
        for keys in profiles.values():
            keys.sort()
    (args.out / "living.json").write_text(
        json.dumps(living, separators=(",", ":")) + "\n"
    )
    print(len(surveys), "snapshots", len(areas), "resident records")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--raw", type=Path, required=True)
    p.add_argument("--game", type=Path, required=True)
    p.add_argument("--out", type=Path, default=HERE / "map-data")
    p.add_argument("--evidence", type=Path, default=HERE / "evidence")
    main(p.parse_args())
