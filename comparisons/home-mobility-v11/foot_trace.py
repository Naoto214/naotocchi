"""Observe a real notification using V10's recorder against the foot-only native renderer."""

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path
from foot_replacement import HERE, RENDER, patched


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("v10_dist", type=Path)
    parser.add_argument("out", type=Path)
    parser.add_argument("--seconds", default=315, type=int)
    args = parser.parse_args()
    source = args.v10_dist.resolve()
    legacy = HERE.parent / "home-mobility-v10"
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        for p in source.iterdir():
            if p.name != "game":
                (root / p.name).symlink_to(p)
        game = root / "game"
        game.mkdir()
        for entry in (source / "game").iterdir():
            if entry.name != RENDER:
                (game / entry.name).symlink_to(entry)
            else:
                (game / entry.name).write_text(patched(entry.read_text(), "patchFoot"))
        subprocess.run(
            [
                sys.executable,
                "-B",
                str(legacy / "trace-native-sync.py"),
                str(legacy),
                str(root),
                str(args.out.resolve()),
                "--seconds",
                str(args.seconds),
            ],
            check=True,
        )


if __name__ == "__main__":
    main()
