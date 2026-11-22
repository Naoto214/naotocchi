"""Run each guard at the preserved search boundary of an organic river household."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
from unittest.mock import patch

from matrix_capture_river import observer, old, prior

HERE = Path(__file__).resolve().parent
HOOK = """
    qa.evaluateRiverGuard = search => {
      const frame=search.snapshot, who=actor(search.invocation.owner), startClock=clock;
      if(!who||Math.abs(startClock-frame.state.clock)>1e-6)throw Error('wrong state');
      const options=frame.options.map(o=>({p:o.p,blocked:o.blocked.map(actor)}));
      const gen=curvedHandoff(who,search.invocation.goal,options,true);
      let resume=0,result;
      do{ result=gen.next(); if(++resume>400)throw Error('unbounded search'); }while(!result.done);
      const pair=result.value;
      const poses=[];
      if(pair){
        const cast=structuredClone(actors);
        poses.push({at:'opening',rays:qa.riverExits(cast)});
        for(const leg of [...pair.stages,{key:who.key,to:pair.q}]){
          const foot=cast.find(b=>b.key===leg.key);
          for(const [kind,pos] of [['via',leg.via],['to',leg.to]])if(pos){
            Object.assign(foot,pos);poses.push({at:leg.key+'/'+kind,rays:qa.riverExits(cast)});
          }
        }
      }
      return {startClock,resume,options:options.length,pair,poses,events:riverGuardEvents};
    };
"""


def run(args):
    data = json.loads(args.fixture.read_text())["actualSearch"]
    results = []
    with old.sync_playwright() as api:
        browser = api.chromium.launch(executable_path="/usr/bin/chromium")
        for guard in ("8", "short", "all"):
            native = args.model.read_text()
            if guard != "8":
                native = subprocess.run(
                    ["node", "-e", "process.stdout.write(require('./curve-exit-guard.cjs').patchExitGuard(require('fs').readFileSync(0,'utf8'),process.argv[1]))", guard],
                    cwd=HERE, input=native, text=True, capture_output=True, check=True,
                ).stdout

            def load(name, value):
                if "production-model" not in name:
                    return observer(name, value)
                value = observer(name, native)
                anchor = "    let checkpoint;"
                return old.legacy.once(value, anchor, (HERE / "matrix-river-exits.js").read_text() + "\n" + HOOK + anchor)

            with patch.object(prior.v9, "patched", load), prior.v9.native_page(
                browser, args.url, "river_lake", 28, 375, "v12", True
            ) as (page, _, meta):
                page.evaluate(prior.baseline.INK)
                page.evaluate("HomeMobilityDiagnostics.enable(); HomeCastTrial.apply({paused:false});touchQA.manual=true;touchQA.log=null;touchQA.paint()")
                row = page.evaluate("""input=>{
                  const f=structuredClone(input.snapshot);f.relief=null;
                  touchQA.riverRestore(f);
                  globalThis.riverGuardEvents=[];globalThis.HomeV12CurveEvent=(type,e)=>riverGuardEvents.push({type,...e});
                  return touchQA.evaluateRiverGuard(input);
                }""", data)
                results.append({"guard": guard, "nativeSHA256": hashlib.sha256(native.encode()).hexdigest(), **row})
                args.out.write_text(json.dumps(results, separators=(",", ":")) + "\n")
                print(guard, row["resume"], bool(row["pair"]), flush=True)
        browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", type=Path, required=True, help="Generated low-priority model with the 8px guard")
    parser.add_argument("--fixture", type=Path, default=HERE / "evidence/matrix-river-state.json")
    parser.add_argument("--url", default="http://127.0.0.1:8497")
    parser.add_argument("--out", type=Path, required=True)
    run(parser.parse_args())
