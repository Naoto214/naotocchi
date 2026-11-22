"""Replay the V11-foot opening from certified CI and capture the organically occurring V12 resident states."""
import argparse
import gzip
import json
from pathlib import Path
from unittest.mock import patch
import zipfile
from matrix_worker_v12 import old,prior


def observer(name,source):
    source=prior.instrument(name,source)
    if "production-model" not in name:
        return source
    hook="""    qa.riverSnapshot = () => ({
      state:qa.matrixState(), timers:{nextRecovery,reopenedKey,earlyKey,resuming,continuing,retryingKey},
      options:structuredClone(qa.riverOptions||[]),waiting:structuredClone([...waiting]), handled:structuredClone([...helpedAt]),
      relief:relief&&{owner:relief.owner,point:relief.point,expires:relief.expires,stage:relief.stage,
        ready:relief.ready,yieldPeer:relief.yieldPeer,pair:relief.pair?structuredClone(relief.pair):null,searching:!!relief.search},
      crowd:structuredClone([...crowdMisses]), scene:{region:scene.region,width:scene.width,height:scene.height,scale:scene.navigation?.intentScale}
    });"""
    restore = """    qa.riverRestore = frame => {
      if(frame.relief || frame.state.manualGoals.length)throw Error('suspended native job');
      qa.matrixLoad(frame.state); paused=frame.state.paused;
      for(const [map,data] of [[waiting,frame.waiting],[crowdMisses,frame.crowd],[helpedAt,frame.handled]]){
        map.clear();for(const [k,v] of structuredClone(data))map.set(k,v);
      }
      ({nextRecovery,reopenedKey,earlyKey,resuming,continuing,retryingKey}=frame.timers);
      qa.riverOptions=structuredClone(frame.options);
    };"""
    source=old.legacy.once(source,"    let checkpoint;",hook+"\n"+restore+"\n    let checkpoint;")
    marker="  globalThis.HomeV12CurveEvent?.('search',{owner:a.key,goal,clock,source});"
    source=old.legacy.once(source,marker,"  qa.riverOptions=goals.map(o=>({p:o.p||o.q,blocked:o.blocked.map(b=>b.key)}));\n"+marker)
    marker="    function step(dt,flags={}){"
    return old.legacy.once(source,marker,marker+"""
      if(qa.recordRiverOpening && clock>60 && clock<74 && !relief && !manualGoals.size && (Math.round(clock*20)%4===0))
        qa.riverOpening=qa.riverSnapshot();""")


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--url",required=True);p.add_argument("--archive",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True);p.add_argument("--attempts",type=int,default=3)
    p.add_argument("--fixture",type=Path,help="portable actual idle and search checkpoints")
    args=p.parse_args()
    coord=("river_lake",28,375)
    name="river_lake-28-375.json.gz"
    with zipfile.ZipFile(args.archive) as z:
        raw=z.read(name);cell=json.loads(gzip.decompress(raw))
    expected=cell["arms"]["v12"]["aged"]["curve"]
    recorded=[e for e in expected if e["type"] in ("plan","start","owner") and e.get("owner")=="companion:sekizou" and 68<e["clock"]<95]
    signature=lambda e: [e.get(k) for k in ("type","clock","owner","goal","q","helper","stage","stages","found","accepted")]
    assert any(e["type"]=="start" and e["stage"]==0 for e in recorded)
    opening=cell["arms"]["v11-foot"]["naturalOpening"]["state"]
    results={"originalCellSHA256":old.digest(raw),"recorded":recorded,"attempts":[]}
    with old.sync_playwright() as pw:
        browser=pw.chromium.launch(executable_path="/usr/bin/chromium",args=["--disable-dev-shm-usage"])
        for i in range(args.attempts):
            with patch.object(prior.v9,"patched",observer),prior.v9.native_page(browser,args.url,*coord,"v12",True) as (page,_,meta):
                old.require(meta["hashes"]==cell["arms"]["v12"]["hashes"],"different native candidate bytes")
                warm=prior.current_opening(page,meta)
                prior.match_opening(page,meta,warm,opening)
                page.evaluate("""() => {
                  const previous=globalThis.HomeV12CurveEvent;
                  globalThis.riverEvents=[];touchQA.recordRiverOpening=true;
                  globalThis.HomeV12CurveEvent=(type,detail)=>{
                    previous?.(type,detail);
                    if (detail.owner!=='companion:sekizou' || detail.clock<68 || detail.clock>95) return;
                    riverEvents.push({event:{type,...structuredClone(detail)},snapshot:touchQA.riverSnapshot()});
                  };
                }""")
                page.evaluate(prior.baseline.INK)
                page.evaluate(prior.v9.TRACKS)
                page.evaluate(prior.baseline.v8.AGE_PROBE)
                page.evaluate(prior.baseline.v8.PAINT_PROBE)
                page.evaluate("HomeMobilityDiagnostics.enable();HomeCastTrial.apply({paused:false});touchQA.log=null;touchQA.paint()")
                page.evaluate("({...touchQA.footFrame(), presentation:touchQA.presentationFrame()})")
                page.evaluate("touchQA.ageActive=true;touchQA.advance(60,true)")
                page.evaluate("({...touchQA.footFrame(), presentation:touchQA.presentationFrame()})")
                page.evaluate("touchQA.ageActive=true;touchQA.advance(60,true)")
                rows=page.evaluate("riverEvents")
                seen=[r["event"] for r in rows if r["event"]["type"] in ("plan","start","owner")]
                matched=[signature(e) for e in recorded]==[signature(e) for e in seen]
                results["attempts"].append({"browser":browser.version,"scripts":meta["hashes"],"matched":matched,
                    "incomingNativeSeed":warm["seed"],"alignedIncomingSHA256":old.digest(old.canonical(opening).encode()),
                    "events":rows,"quiescent":page.evaluate("touchQA.riverOpening"),"finalClock":page.evaluate("touchQA.matrixState().clock")})
                args.out.write_bytes(gzip.compress((old.canonical(results)+"\n").encode(),mtime=0))
                print("attempt",i+1,"events",len(rows),"exact recorded native event sequence",matched,flush=True)
                if matched:
                    if args.fixture:
                        witness=next(row for row in rows if row["event"]["type"]=="search" and 73.8<row["event"]["clock"]<74.1)
                        q=results["attempts"][-1]["quiescent"]
                        old.require(q and not q["relief"] and not q["state"]["manualGoals"],"no resumable native checkpoint")
                        compact={"originCellSHA256":results["originalCellSHA256"],"opening":q,
                                 "actualSearch":{"snapshot":witness["snapshot"],"invocation":witness["event"]},"nativeSignature":recorded}
                        args.fixture.write_text(json.dumps(compact,separators=(",",":"))+"\n")
                    break
        browser.close()


if __name__=="__main__":
    main()
