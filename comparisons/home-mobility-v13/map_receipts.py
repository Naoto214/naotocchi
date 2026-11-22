"""Check every archived V12 pose, model size, projection and region against original CI evidence."""

import argparse, base64, collections, csv, gzip, hashlib, json, math, zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent


def sha(b):
    return hashlib.sha256(b).hexdigest()


def verify(raw, archives):
    refs = json.loads(
        (HERE.parent / "home-mobility-v12/evidence/matrix-receipt.json").read_bytes()
    )["regions"]
    records = {}
    maxerr = []
    for region, ref in refs.items():
        archive = next((archives / ref["run"]).glob(f"*-{region}.zip"))
        assert sha(archive.read_bytes()) == ref["sha256"]
        reg = {}
        records[region] = reg
        with zipfile.ZipFile(archive) as z:
            manifest = json.loads(z.read("region.json"))["cells"]
            assert len(manifest) == 20
            for name, hsh in sorted(manifest.items()):
                source = z.read(name)
                d = json.loads(gzip.decompress(source))
                a = d["arms"]["v12"]
                file = raw / f"{region}-{d['width']}-{d['count']}.json.gz"
                out = json.loads(gzip.decompress(file.read_bytes()))
                sx = out["scale"]["x"]
                sy = out["scale"]["y"]
                ox, oy = out["geometry"]["origin"]
                errors = []
                assert sha(source) == hsh == out["poseDigest"]
                assert d["height"] == out["height"]
                assert (
                    a["hashes"]["home-production-model-mobility-v12.js"]
                    == out["source"]
                )
                assert not out["errors"]
                assert len(out["frames"]) == 2
                for frame, poses in zip(
                    out["frames"], (a["opening"], a["aged"]["opening"])
                ):
                    assert len(poses) == len(frame["actors"])
                    assert [r[0] for r in poses] == [r["key"] for r in frame["actors"]]
                    assert len(out["allowed"]) == len(poses)
                    for actor, pose in zip(frame["actors"], poses):
                        key, x, y, w, h, screenX, screenY = pose
                        errors.append(
                            math.hypot(ox + sx * x - screenX, oy + sy * y - screenY)
                        )
                        assert (
                            abs(sx * x - actor["x"]) <= 0.00051
                            and abs(sy * y - actor["y"]) <= 0.00051
                        )
                        assert (
                            abs((w * 0.5 + 5) * sx - actor["rx"]) <= 0.00051
                            and abs((h * 0.38 + 5) * sy - actor["ry"]) <= 0.00051
                        )
                        for ray in actor["rays"]:
                            free, terrain = base64.b64decode(
                                ray["clear"]
                            ), base64.b64decode(ray["terrain"])
                            assert len(free) == len(terrain) == 12 and all(
                                (x & ~y) == 0 for x, y in zip(free, terrain)
                            )
                mx = max(errors)
                reg[name] = dict(
                    poseSHA256=hsh,
                    recordSHA256=sha(file.read_bytes()),
                    model=out["source"],
                    maxCssProjectionError=round(mx, 5),
                    browser=out["engine"],
                )
                maxerr.append([mx, region, d["width"], d["count"]])
    return dict(
        workflow="45008918474",
        cells=sum(len(v) for v in records.values()),
        snapshots=2 * sum(len(v) for v in records.values()),
        maximumScreenProjectionErrorCss=max(maxerr),
        projectionOver0_1px=sorted([r for r in maxerr if r[0] > 0.1], reverse=True),
        records=records,
    )


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--raw", type=Path, required=True)
    p.add_argument("--archives", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    a = p.parse_args()
    d = verify(a.raw, a.archives)
    a.out.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n")
    print(d["cells"], d["maximumScreenProjectionErrorCss"])
