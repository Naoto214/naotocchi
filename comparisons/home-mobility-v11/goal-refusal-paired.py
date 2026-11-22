"""Replay the identical browser household through ordinary, compact-ray and pivot policies."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
from unittest.mock import patch

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("refusals",HERE/"goal-refusal-browser.py")
ref=importlib.util.module_from_spec(spec)
spec.loader.exec_module(ref)
house=ref.house

if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("output",type=Path)
    parser.add_argument("--region",default="river_lake")
    parser.add_argument("--width",type=int,default=390)
    parser.add_argument("--count",type=int,default=28)
    args=parser.parse_args()
    args.output.parent.mkdir(exist_ok=True,parents=True)
    coord=(args.region,args.count,args.width)
    results={}
    with house.old.sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path=os.environ.get("CHROMIUM","/usr/bin/chromium"),args=["--disable-dev-shm-usage"])
        try:
            donor=None
            for policy in ["shadow","active","ray"]:
                with patch.object(house.v9,"patched",ref.instruments(policy)),house.v9.native_page(browser,args.url,*coord,"v11-foot",True) as (page,touch,meta):
                    opening=house.current_opening(page,meta)
                    if donor is None:donor=opening
                    aligned=house.match_opening(page,meta,opening,donor)
                    result,state=house.baseline.natural_aging(page,touch,aligned,house.baseline.v8.subjects()[coord],True)
                    measured=page.evaluate("(()=>{const a=touchQA.postRefusal;return {declines:a?.declines||0,offers:a?.offers||[]}})()")
                    assert abs(state["clock"]-300)<.01
                    summary={k:v for k,v in result["final"].items() if k!="residents"}
                    report=dict(source=meta["hashes"],openingSHA256=hashlib.sha256(house.old.canonical(donor).encode()).hexdigest(),
                                seed=donor["seed"],clock=state["clock"],safety=result["safety"],summary=summary,
                                trips=result["tracks"],**measured)
                    results[policy]=report
                    print(policy,report["declines"],len(report["offers"]),flush=True)
        finally:browser.close()
    args.output.write_text(json.dumps(dict(region=args.region,count=args.count,width=args.width,arms=results),indent=2)+"\n")
