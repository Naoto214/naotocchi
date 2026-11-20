"""Compare the final bundle's 312 scenery rasters to the recorded #569/#570 baseline."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

v1 = Path(__file__).resolve().parent.parent / "home-cast-size-v1"
spec = importlib.util.spec_from_file_location("cast_v1_pixels", v1 / "verify_protection_pixels.py")
previous = importlib.util.module_from_spec(spec)
spec.loader.exec_module(previous)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("url")
    p.add_argument("--out", required=True, type=Path)
    args = p.parse_args()
    reference = json.loads((v1 / "evidence/protection-pixels.json").read_text())
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM_PATH","/usr/bin/chromium"))
        current = previous.capture(browser, args.url)
        digest = hashlib.sha256(json.dumps(current, sort_keys=True).encode()).hexdigest()
        assert len(current) == reference["sceneCases"]
        assert digest == reference["aggregateSHA256"], (digest,browser.version,"reference uses Chromium "+reference["chromium"])
        result = {"chromium":browser.version, "reference":reference["reference"],
                  "referenceEvidence":"../home-cast-size-v1/evidence/protection-pixels.json",
                  "geometry":reference["dimensions"], "checkedRasters":len(current),
                  "aggregateSHA256":digest}
        args.out.write_text(json.dumps(result,indent=2)+"\n")
        print(result)
        browser.close()
