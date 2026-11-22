"""Authenticate each native trial against the workflow artifact digest before extraction."""

from argparse import ArgumentParser
from pathlib import Path
import hashlib
import json
import shutil
import zipfile


def archive(download, metadata, destination):
    stored = json.loads(metadata.read_text())
    digest = hashlib.sha256(download.read_bytes()).hexdigest()
    match = next(
        (
            entry
            for entry in stored["artifacts"]
            if entry["digest"] == "sha256:" + digest
        ),
        None,
    )
    if not match or not match["name"].startswith("forest-v11-"):
        raise ValueError("Archive does not match the requested GitHub Actions run")
    case = match["name"].removeprefix("forest-v11-")
    if not all(c.isascii() and (c.isalnum() or c == "-") for c in case):
        raise ValueError("Unexpected case name")
    files = {
        "forest28.json.gz",
        "progress.json",
        "checkpoint.json",
        "initial-checkpoint.json",
        "initial-save.json",
        "aged-save.json",
        "restore.json",
        "directions.json.gz",
        "residents.csv",
        "episodes.csv.gz",
        "legs.csv.gz",
        "touch-initial-checkpoint.json",
        "touch-checkpoint.json",
    }
    path = destination / case
    path.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(download) as bundle:
        names = set(bundle.namelist())
        if (
            not names
            or names - files
            or len(names) != len(bundle.namelist())
            or bundle.testzip()
        ):
            raise ValueError("Invalid or unexpected artifact members")
        for name in sorted(names):
            with bundle.open(name) as source, (path / name).open("wb") as target:
                shutil.copyfileobj(source, target)
    shutil.copyfile(download, path / "runner.zip")
    receipt = {
        "case": case,
        "commit": match["workflow_run"]["head_sha"],
        "run": match["workflow_run"]["id"],
        "artifact": match["id"],
        "bytes": match["size_in_bytes"],
        "sha256": digest,
        "files": sorted(names),
        "complete": names == files,
    }
    (path / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(case, len(names), "of", len(files), "expected files")
    return receipt


if __name__ == "__main__":
    p = ArgumentParser(description=__doc__)
    for item in ("download", "metadata", "destination"):
        p.add_argument(item, type=Path)
    a = p.parse_args()
    archive(a.download, a.metadata, a.destination)
