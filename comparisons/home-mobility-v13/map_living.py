"""Survey actual candidate opening, 5- and 10-minute actor positions in the same native arm."""

import argparse, gzip, hashlib, json, subprocess, sys
from pathlib import Path
from tempfile import TemporaryDirectory

HERE = Path(__file__).resolve().parent


def main(a):
    with TemporaryDirectory() as tmp:
        manifest = Path(tmp) / "observed.json"
        for trace in sorted(a.traces.glob("*-v13-*/forest28.json.gz")):
            scene = trace.parent.name.split("-")
            w = int(scene[0])
            seats = scene[3]
            arm = "-".join(scene[5:])
            mode = arm.removeprefix("v13-")
            flag = "-" + seats + "-" + mode
            d = json.loads(gzip.decompress(trace.read_bytes()))
            recorded = d["initial"]["actors"]
            sz = {r["key"]: (r["w"], r["h"]) for r in recorded}
            frames = [
                dict(
                    phase="opening",
                    time=0,
                    feet=[
                        [r[k] for k in ("key", "x", "y", "w", "h")] for r in recorded
                    ],
                )
            ]
            middle = min(d["trajectory"], key=lambda f: abs(f["clock"] - 300))
            frames.append(
                dict(
                    phase="300",
                    time=middle["clock"],
                    feet=[[r[0], r[1], r[2], *sz[r[0]]] for r in middle["actors"]],
                )
            )
            final = d["baseline"]
            frames.append(
                dict(
                    phase="600",
                    time=final["modelSeconds"],
                    feet=[
                        [r[k] for k in ("key", "x", "y", "w", "h")]
                        for r in final["residents"]
                    ],
                )
            )
            manifest.write_text(
                json.dumps(
                    dict(
                        height=d["opening"]["height"],
                        source=hashlib.sha256(trace.read_bytes()).hexdigest(),
                        frames=frames,
                    )
                )
            )
            entry = arm + ("-reference" if seats == "reference" else "")
            subprocess.run(
                [
                    sys.executable,
                    str(HERE / "map_capture.py"),
                    "--base",
                    a.base,
                    "--archives",
                    str(a.archives),
                    "--out",
                    str(a.out),
                    "--regions",
                    "forest",
                    "--widths",
                    str(w),
                    "--counts",
                    "28",
                    "--arm",
                    entry,
                    "--input",
                    str(manifest),
                    "--suffix=-living" + flag,
                ],
                check=True,
            )


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--traces", type=Path, required=True)
    p.add_argument("--archives", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--base", required=True)
    main(p.parse_args())
