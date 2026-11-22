"""Export the 375 CSS px household and its physically replayed directions from PR #581."""
import argparse
import json
from pathlib import Path


def make(captures):
    here = Path(__file__).resolve().parent
    archive = here.parent / "home-mobility-v11/evidence"
    raw = json.loads((captures / "375-v10-reference.json").read_text())
    source = json.loads((archive / "space-curved-control.json").read_text())[0]
    straight = next(r for r in json.loads((archive / "space-sequential.json").read_text())
                    if r["width"] == 375 and r["label"] == "opening" and r["key"] == "companion:tanuki")
    assert raw["sourceSHA"] == source["source"] == straight["source"]
    assert raw["phases"][0]["clock"] == 0
    assert len(source["witnesses"]) == len(source["nativeStepper"]) == 23
    audit = json.loads((here / "evidence/space-fairness-375.json").read_text())
    assert audit["sourceSHA"] == raw["sourceSHA"]
    last = {r["degrees"]:r["finalLost8"] for r in audit["routes"]}
    return {"lastExits":last, "source":raw["sourceSHA"],"width":375,"height":792,"seed":raw["seed"],
            "scale":raw["geometry"]["scale"],"feet":raw["phases"][0]["feet"],"key":source["key"],
            "straightExamples":straight["examples"],"routes":source["witnesses"]}


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--captures", type=Path, required=True)
    p.add_argument("--out", type=Path, required=True)
    args = p.parse_args()
    args.out.write_text(json.dumps(make(args.captures), ensure_ascii=False,separators=(",",":"))+"\n")
