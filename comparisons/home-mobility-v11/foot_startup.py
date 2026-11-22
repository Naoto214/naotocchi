"""Trace native RNG state across every synchronisation of the 320px four-resident home fixture."""

import argparse, json
from pathlib import Path
from unittest.mock import patch
from playwright.sync_api import sync_playwright
from foot_replacement import replace_once
import matrix_worker_v11 as matrix


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("url")
    p.add_argument("out", type=Path)
    a = p.parse_args()
    native_instrument = matrix.instrument
    cases = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path="/usr/bin/chromium")
        for mode in ["v10", "v11-foot", "v11-warmup-guard"]:
            arm = "v10" if mode == "v10" else "v11-foot"

            def instrument(name, source):
                s = native_instrument(name, source)
                if "production-model" in name:
                    s = replace_once(
                        s,
                        "    function sync(list,next){",
                        """    function sync(list,next){
      const sourceAudit=(globalThis.footInitRecords ||= []);
      const initEvent={before:globalThis.touchQA?.readSeed?.(),count:list.length,region:next.region,
        changedNav:next.navigation!==scene.navigation,oldCount:actors.length,ready:!!globalThis.HomeCastTrial?.ready,
        size:[next.width,next.height],previousSize:[scene.width,scene.height],
        source:new Error().stack.split('\\n').slice(1,5)};
      sourceAudit.push(initEvent);""",
                    )
                    s = replace_once(
                        s,
                        "      if(arrange){clearRelief();",
                        """      initEvent.after=globalThis.touchQA?.readSeed?.();
      initEvent.arrange=arrange;initEvent.changed=changed;initEvent.nextAt=actors.map(a=>a.nextAt);
      if(arrange){clearRelief();""",
                    )
                if "production-diorama" in name and mode == "v11-warmup-guard":
                    s = replace_once(
                        s,
                        "const refresh=!!row &&",
                        "const refresh=env.HomeCastTrial.ready && !!row &&",
                    )
                    s = replace_once(
                        s,
                        "if (replacing && row.inkShape",
                        "if (env.HomeCastTrial.ready && replacing && row.inkShape",
                    )
                return s

            with patch.object(matrix, "instrument", instrument):
                with matrix.native_page(
                    browser, a.url, ("home", 4, 320), arm, False
                ) as (page, touch, meta):
                    row = dict(
                        mode=mode,
                        seed=meta["seed"],
                        opening=meta["opening"],
                        syncs=page.evaluate("footInitRecords"),
                    )
                    print(mode, row["seed"], len(row["syncs"]), flush=True)
                    cases.append(row)
                    a.out.write_text(
                        json.dumps(
                            dict(browser=browser.version, cases=cases),
                            separators=(",", ":"),
                        )
                        + "\n"
                    )
        browser.close()


if __name__ == "__main__":
    main()
