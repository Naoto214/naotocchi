"""Survey selected candidate geometry with the locally staged native V13 models."""

import argparse, json, subprocess, sys
from pathlib import Path
from tempfile import TemporaryDirectory

HERE = Path(__file__).resolve().parent


def main(a):
    capture = [
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
        "--live",
    ]
    with TemporaryDirectory() as tmp:
        source = Path(tmp) / "opening.json"
        source.write_text(
            json.dumps(dict(height=792, source="native-opening", frames=[]))
        )
        for arm in ["b", "c", "d"]:
            for seats in ["fixed", "reference"]:
                widths = ["375"] if arm == "d" else ["320", "375", "390", "430"]
                f = "v13-" + arm + ("-reference" if seats == "reference" else "")
                subprocess.run(
                    [
                        *capture,
                        "--widths",
                        *widths,
                        "--counts",
                        "28",
                        "--input",
                        str(source),
                        "--arm",
                        f,
                        "--suffix=-long-" + seats + "-" + arm,
                    ],
                    check=True,
                )
        subprocess.run(
            [
                *capture,
                "--widths",
                "375",
                "--counts",
                "28",
                "--arm",
                "v13-d",
                "--suffix=-d",
            ],
            check=True,
        )


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--base", required=True)
    p.add_argument("--archives", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    main(p.parse_args())
