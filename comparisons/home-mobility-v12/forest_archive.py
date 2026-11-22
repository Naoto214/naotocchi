"""Verify and unpack raw V12 forest observations against their GitHub Actions digest."""

import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
from zipfile import ZipFile

MEMBERS = {
    "forest28.json.gz",
    "directions.json.gz",
    "residents.csv",
    "progress.json",
    "episodes.csv.gz",
    "legs.csv.gz",
    "touch-checkpoint.json",
    "touch-initial-checkpoint.json",
    "initial-checkpoint.json",
    "checkpoint.json",
    "restore.json",
    "initial-save.json",
    "aged-save.json",
}


def archive(archive_path, official_json, output):
    digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
    records = [
        x
        for x in json.loads(official_json.read_text())["artifacts"]
        if x["digest"] == "sha256:" + digest
    ]
    if len(records) != 1:
        raise ValueError(
            "Archive digest does not uniquely match the workflow artifacts"
        )
    record = records[0]
    match = re.fullmatch(
        r"forest-v12-(\d+-\d+-\d+-(?:fixed|reference)-\d+-(?:v11-foot|v12))",
        record["name"],
    )
    if not match or archive_path.stat().st_size != record["size_in_bytes"]:
        raise ValueError("Unexpected archive name or file size")
    case = match[1]
    directory = output / case
    directory.mkdir(parents=True, exist_ok=True)
    with ZipFile(archive_path) as source:
        names = source.namelist()
        if (
            not names
            or len(names) != len(set(names))
            or set(names) - MEMBERS
            or source.testzip()
        ):
            raise ValueError("Unexpected contents or CRC failure")
        for name in names:
            with source.open(name) as data, (directory / name).open("wb") as dest:
                shutil.copyfileobj(data, dest)
    shutil.copy2(archive_path, directory / "runner.zip")
    receipt = dict(
        case=case,
        commit=record["workflow_run"]["head_sha"],
        run=record["workflow_run"]["id"],
        artifact=record["id"],
        bytes=record["size_in_bytes"],
        sha256=digest,
        files=sorted(names),
        complete=set(names) == MEMBERS,
    )
    (directory / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(case, len(names), "of", len(MEMBERS), "expected files")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    for argument in ("zip", "official_json", "output"):
        parser.add_argument(argument, type=Path)
    args = parser.parse_args()
    archive(args.zip, args.official_json, args.output)
