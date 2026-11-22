"""Preserve the preliminary run receipts and describe which physical and phase tapes matched."""
import argparse
import hashlib
import json
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
REASONS = {
    "45008630395": "Initial terrain, before the complete painted obstacle guard. The short 320px natural input failed its movement-density check. The two 320px stress fixtures had identical feet and different native opening animation phases. The 390px control generation also sampled different absolute CSS touch coordinates across orders; each was retained.",
    "45008878132": "Initial 375px seat cost and trusted input on C and D, before the whole-segment obstacle guard.",
    "45009396848": "320px input correction on the initial terrain. The longer natural source and the pinned stress input were replayed in both orders.",
}


def archive(path):
    receipt = json.loads((path / "receipt.json").read_bytes())
    assert receipt["status"] == "completed" and all(j["status"] == "completed" for j in receipt["jobs"])
    info = {k:receipt[k] for k in ("run", "url", "commit", "conclusion", "jobs")}
    info.update(purpose=REASONS[receipt["run"]], archives=[])
    for item in receipt["archives"]:
        source = path / item["name"]
        assert source.stat().st_size == item["bytes"] and hashlib.sha256(source.read_bytes()).hexdigest() == item["sha256"]
        record = dict(**item, contents={})
        with zipfile.ZipFile(source) as z:
            for name in z.namelist():
                if name.endswith("/"):
                    continue
                data = z.read(name)
                small = dict(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
                if name.endswith(".json") and "/" not in name:
                    result = json.loads(data)
                    small.update(browser=result["browser"], arms=[r["arm"] for r in result["rows"]])
                    small["sourceSHA256"] = {n:h for r in result["rows"] for n,h in r["assets"].items()}
                    if "controls" in result:
                        small["touchControls"]=result["controls"]
                    if "fixtureSHA256" in result:
                        small.update(posesSHA256=result["fixtureSHA256"], phaseSHA256=result["phaseSHA256"])
                record["contents"][name] = small
        info["archives"].append(record)
    return info


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("runs", nargs="+", type=Path)
    p.add_argument("--out", type=Path, default=HERE / "evidence/performance-history.json")
    args = p.parse_args()
    runs = [archive(path) for path in args.runs]
    assert {r["run"] for r in runs} == set(REASONS)
    args.out.write_text(json.dumps(runs, ensure_ascii=False, indent=1) + "\n")
    print("Historical runs",len(runs),"ZIPs",sum(len(r["archives"]) for r in runs))
