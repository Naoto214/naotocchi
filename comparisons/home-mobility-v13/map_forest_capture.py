"""Use the recorded 10-minute native V12 cast at a common 792 CSS px height."""

import argparse, gzip, json, hashlib, subprocess, sys
from pathlib import Path
from tempfile import TemporaryDirectory

HERE = Path(__file__).resolve().parent


def main(args):
    with TemporaryDirectory() as tmp:
        manifest = Path(tmp) / "frames.json"
        for width in [320, 375, 390, 430]:
            for seats in ("fixed", "reference"):
                paths = sorted(
                    args.traces.glob(f"{width}-*-0-{seats}-1-v12/forest28.json.gz")
                )
                if not paths:
                    manifest.write_text(
                        json.dumps(dict(height=792, source="native-opening", frames=[]))
                    )
                    subprocess.run(
                        [
                            sys.executable,
                            str(HERE / "map_capture.py"),
                            "--base",
                            args.base,
                            "--archives",
                            str(args.archives),
                            "--out",
                            str(args.out),
                            "--regions",
                            "forest",
                            "--widths",
                            str(width),
                            "--counts",
                            "28",
                            "--arm",
                            "v12" if seats == "fixed" else "v12-reference",
                            "--input",
                            str(manifest),
                            "--live",
                            "--suffix=-long-" + seats,
                        ],
                        check=True,
                    )
                    continue
                run = paths[0]
                d = json.loads(gzip.decompress(run.read_bytes()))
                start = d["opening"]["actors"]
                sizes = {r[0]: r[4:6] for r in start}
                frames = [
                    dict(phase="opening", time=0, feet=[[r[0], *r[2:6]] for r in start])
                ]
                for time in [60, 120, 180, 240, 300, 360, 420, 480, 540, 600]:
                    f = min(d["trajectory"], key=lambda f: abs(f["clock"] - time))
                    frames.append(
                        dict(
                            phase=str(time),
                            time=f["clock"],
                            feet=[
                                [r[0], r[1], r[2], *sizes[r[0]]] for r in f["actors"]
                            ],
                        )
                    )
                manifest.write_text(
                    json.dumps(
                        dict(
                            height=d["opening"]["height"],
                            source=hashlib.sha256(run.read_bytes()).hexdigest(),
                            frames=frames,
                        )
                    )
                )
                arm = "v12" if seats == "fixed" else "v12-reference"
                cmd = [
                    sys.executable,
                    str(HERE / "map_capture.py"),
                    "--base",
                    args.base,
                    "--archives",
                    str(args.archives),
                    "--out",
                    str(args.out),
                    "--regions",
                    "forest",
                    "--widths",
                    str(width),
                    "--counts",
                    "28",
                    "--arm",
                    arm,
                    "--input",
                    str(manifest),
                    "--suffix=-long-" + seats,
                ]
                subprocess.run(cmd, check=True)
            manifest.write_text(
                json.dumps(dict(height=792, source="native-opening", frames=[]))
            )
            subprocess.run(
                [
                    sys.executable,
                    str(HERE / "map_capture.py"),
                    "--base",
                    args.base,
                    "--archives",
                    str(args.archives),
                    "--out",
                    str(args.out),
                    "--regions",
                    "forest",
                    "--widths",
                    str(width),
                    "--counts",
                    "1",
                    "4",
                    "10",
                    "20",
                    "--input",
                    str(manifest),
                    "--live",
                    "--suffix=-matched",
                ],
                check=True,
            )


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--archives", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--base", required=True)
    p.add_argument("--traces", type=Path, required=True)
    main(p.parse_args())
