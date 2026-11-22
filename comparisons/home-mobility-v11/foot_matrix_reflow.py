"""Replay the archived ten-body household on the native projected floor and trace each reseat."""

import argparse
import gzip
import hashlib
import json
from pathlib import Path
from unittest.mock import patch
import zipfile
import matrix_worker_v11 as house

WHY = """
          if(window.footReplayWindow || qa.ageActive){
            const prior=previousActors.find(p=>p.key===a.key);
            const world=previousScene.navigation.unproject(prior),wanted=scene.navigation.project(world);
            const sc=scene.navigation.intentScale;
            (qa.footMatrixAudit ||= []).push({phase:window.footReplayWindow?'recorded-foot':'observed-age',clock,key:a.key,old:[prior.x,prior.y],
              wanted:[wanted.x,wanted.y],seed:[a.x,a.y],final:best?[best.x,best.y]:null,
              oldScale:previousScene.navigation.intentScale,newScale:sc,oldWidth:previousScene.width,oldHeight:previousScene.height,newWidth:scene.width,newHeight:scene.height,
              ground:scene.navigation.valid(wanted),visible:visible(a,wanted),bounds:bounds(a,scene),
              touchingSeated:seated.filter(b=>!separated(a,a,b)).map(b=>b.key),
              intersectsReservedExit:a!==lead&&exit.some(q=>!separated(lead,q,a))});
          }
"""
BRIDGE = """
    let savedMatrixRows;
    globalThis.replayArchivedReprojection=feet=>{
      if(!savedMatrixRows || feet.length!==actors.length)throw Error('household mismatch');
      for(const [key,x,y,w,h] of feet){
        const a=actor(key);
        if(!a || Math.abs(a.w-w)+Math.abs(a.h-h)>1e-5)throw Error('body mismatch '+key);
        a.x=x;a.y=y;
      }
      window.footReplayWindow=true;
      sync(savedMatrixRows,{...scene,navigation:{...scene.navigation}});
      window.footReplayWindow=false;
      return actors.map(a=>[a.key,a.x,a.y]);
    };
    function sync(list,next){
      savedMatrixRows=list;"""


def install(name, s):
    output = house.instrument(name, s)
    if "production-model" not in name:
        return output
    output = house.old.legacy.once(output, "    function sync(list,next){", BRIDGE)
    return house.old.legacy.once(
        output,
        "          if(best){Object.assign(a,{x:best.x,y:best.y});a.target=null;a.activity='rest';}",
        WHY
        + "          if(best){Object.assign(a,{x:best.x,y:best.y});a.target=null;a.activity='rest';}",
    )


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("url")
    p.add_argument("archive", type=Path)
    p.add_argument("out", type=Path)
    p.add_argument("--arm", default="v11-foot")
    p.add_argument("--region", default="forest")
    args = p.parse_args()
    coord = (args.region, 10, 320)
    name = f"{args.region}-10-320.json.gz"
    raw = zipfile.ZipFile(args.archive).read(name)
    cell = json.loads(gzip.decompress(raw))
    aged = cell["arms"][args.arm]["aged"]
    shifts = aged["sync"]["shifts"]
    assert shifts and abs(shifts[-1]["clock"] - 300) < 0.001, (
        "Final household only pinpoints a shift captured at the final interval"
    )
    before = [list(r[:5]) for r in aged["opening"]]
    for s in reversed(shifts):
        if abs(s["clock"] - 300) < 0.001:
            row = next(r for r in before if r[0] == s["key"])
            assert max(abs(v - w) for v, w in zip(s["after"], row[1:3])) < 1e-5
            row[1:3] = s["before"]
    with house.old.sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path="/usr/bin/chromium")
        with (
            patch.object(house.v9, "patched", install),
            house.v9.native_page(browser, args.url, *coord, args.arm, True) as (
                page,
                _,
                meta,
            ),
        ):
            final = page.evaluate("feet=>replayArchivedReprojection(feet)", before)
            rows = page.evaluate("touchQA.footMatrixAudit")
            assert len(final) == 10
            errors = {
                a[0]: max(abs(x - y) for x, y in zip(a[1:3], b[1:3]))
                for a, b in zip(final, aged["opening"], strict=True)
            }
            out = dict(
                browser=browser.version,
                region=args.region,
                arm=args.arm,
                width=320,
                height=cell["height"],
                recordedCellSHA256=hashlib.sha256(raw).hexdigest(),
                nativeSource=meta["hashes"],
                recorded=shifts,
                measured=rows,
                finalError=errors,
            )
            args.out.write_text(json.dumps(out, indent=2) + "\n")
            print(
                [
                    (r["key"], r["touchingSeated"], r["intersectsReservedExit"])
                    for r in rows
                ],
                max(errors.values()),
                flush=True,
            )
        browser.close()


if __name__ == "__main__":
    main()
